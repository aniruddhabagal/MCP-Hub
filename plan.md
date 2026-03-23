# MCPHub — Implementation Plan

## Stack
| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Alembic, APScheduler |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, Recharts |
| Queue | Redis 7 (APScheduler job store + probe queue) |
| Database | PostgreSQL 16 |
| Containers | Docker + Docker Compose |

---

## Directory Structure

```
mcphub/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   │       ├── 001_create_servers_table.py
│   │       ├── 002_create_health_checks_table.py
│   │       ├── 003_create_tool_calls_table.py
│   │       └── 004_create_alerts_table.py
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── dependencies.py
│       ├── models/          (server, health_check, tool_call, alert_rule, alert_event)
│       ├── schemas/         (server, health_check, tool_call, alert, analytics)
│       ├── routers/         (servers, health_checks, tool_calls, analytics, alerts, proxy)
│       ├── services/        (server, health, tool_call, analytics, alert)
│       ├── workers/
│       │   ├── scheduler.py
│       │   ├── health_prober.py
│       │   └── alert_evaluator.py
│       ├── probers/
│       │   ├── base.py
│       │   ├── http_prober.py
│       │   └── stdio_prober.py
│       └── utils/
│           ├── mcp_client.py
│           └── notifications.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/
        │   ├── dashboard/page.tsx
        │   ├── servers/page.tsx + [id]/page.tsx + new/page.tsx
        │   ├── analytics/page.tsx
        │   ├── tool-calls/page.tsx
        │   └── alerts/page.tsx
        ├── components/
        │   ├── layout/    (Sidebar, TopBar, PageShell)
        │   ├── servers/   (ServerCard, ServerTable, ServerForm, StatusBadge)
        │   ├── health/    (LatencySparkline, UptimeBar, HealthHistoryTable)
        │   ├── analytics/ (TopToolsChart, CallVolumeChart, PerAgentTable)
        │   ├── alerts/    (AlertRuleForm, AlertRuleTable, AlertEventFeed)
        │   └── ui/        (StatCard, DataTable, Badge, EmptyState, LoadingSkeleton)
        ├── hooks/         (useServers, useHealthHistory, useToolCalls, useAnalytics, useAlerts)
        └── lib/
            ├── api.ts     (typed fetch wrapper)
            ├── types.ts
            └── utils.ts
```

---

## Database Schema

### `servers`
```sql
id UUID PK, name VARCHAR, url TEXT,
transport_type VARCHAR CHECK (http_sse | http_streamable | stdio),
owner VARCHAR, version VARCHAR, description TEXT, tags TEXT[], metadata JSONB,
status VARCHAR CHECK (healthy | degraded | down | unknown),
probe_interval_seconds INTEGER DEFAULT 60,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

### `health_checks`
```sql
id UUID PK, server_id UUID FK→servers, checked_at TIMESTAMPTZ,
status VARCHAR, latency_ms INTEGER, error_message TEXT,
protocol_version VARCHAR, tools_count INTEGER, raw_response JSONB
```

### `tool_calls`
```sql
id UUID PK, server_id UUID FK→servers, tool_name VARCHAR, agent_id VARCHAR,
called_at TIMESTAMPTZ, duration_ms INTEGER, input_size_bytes INTEGER,
output_size_bytes INTEGER, status VARCHAR CHECK (success | error | timeout),
error_message TEXT, input_hash VARCHAR(64), metadata JSONB
```

### `alert_rules`
```sql
id UUID PK, server_id UUID FK (nullable = all servers), name VARCHAR,
rule_type VARCHAR CHECK (server_down | latency_threshold | error_rate_threshold | tool_call_failure_rate),
threshold_value NUMERIC, window_seconds INTEGER,
channel_type VARCHAR CHECK (email | webhook | slack),
channel_config JSONB, cooldown_seconds INTEGER DEFAULT 900, is_active BOOLEAN
```

### `alert_events`
```sql
id UUID PK, alert_rule_id UUID FK, server_id UUID FK,
fired_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
severity VARCHAR CHECK (info | warning | critical),
message TEXT, context JSONB,
notification_sent BOOLEAN, notification_error TEXT
```

### Materialized View
```sql
-- Refreshed every 5 minutes by scheduler
tool_call_stats_hourly:
  server_id, tool_name, agent_id, hour,
  call_count, avg_duration_ms, total_input_bytes, total_output_bytes, error_count
```

---

## Backend API (`/api/v1`)

### Servers
```
GET    /servers                  list with filters (status, transport, tags, search)
POST   /servers                  register server
GET    /servers/{id}             detail with enriched metrics
PATCH  /servers/{id}             update
DELETE /servers/{id}             remove
POST   /servers/{id}/probe       trigger immediate probe
```

### Health Checks
```
GET    /health-checks            list (server_id required, date range filters)
GET    /health-checks/summary    uptime %, avg/p95/p99 latency
GET    /health-checks/latency-series   time-bucketed latency for charts
```

### Tool Calls
```
GET    /tool-calls               filtered audit log (cursor paginated)
GET    /tool-calls/{id}          detail
POST   /tool-calls               ingest single record
POST   /tool-calls/batch         bulk ingest (up to 100)
```

### Analytics
```
GET    /analytics/top-tools        top N tools by call count
GET    /analytics/call-volume      time-series call volume with error overlay
GET    /analytics/per-agent        per-agent call stats
GET    /analytics/fleet-summary    single endpoint for dashboard overview
```

### Alerts
```
GET/POST        /alerts/rules             list / create rule
PATCH/DELETE    /alerts/rules/{id}        update / delete
POST            /alerts/rules/{id}/test   send test notification
GET             /alerts/events            event log
PATCH           /alerts/events/{id}/resolve
```

### Proxy
```
POST   /proxy/{server_id}/call   forward MCP tool call, log result, return response
```

---

## Background Jobs

### APScheduler (AsyncIOScheduler) + Redis JobStore

**Job 1 — `dispatch_health_probes` (every 30s)**
- Query active servers where `NOW() - last_checked_at >= probe_interval_seconds`
- Push probe payloads onto Redis list `mcphub:probe_queue`

**Job 2 — probe worker (concurrent asyncio tasks)**
- Pop from `mcphub:probe_queue`
- **HttpProber**: MCP `initialize` + `tools/list` via httpx async
  - healthy <1000ms, degraded 1000–3000ms, down on error/timeout/5xx
- **StdioProber**: spawn subprocess, communicate JSON-RPC over stdin/stdout
- Insert `health_checks` row, update `servers.status`

**Job 3 — `evaluate_alert_rules` (every 60s)**
- Fetch metric snapshot per rule, evaluate threshold
- Enforce cooldown via `MAX(fired_at)` DB query
- Insert `alert_events`, dispatch notification (aiosmtplib for email, httpx for webhooks)

**Job 4 — `refresh_analytics_matview` (every 5 min)**
- `REFRESH MATERIALIZED VIEW CONCURRENTLY tool_call_stats_hourly`

### Redis Key Namespace
```
mcphub:probe_queue            — job queue (List)
mcphub:status_change_events   — fast path for alert evaluator (List)
mcphub:probe_lock:{id}        — prevent concurrent probe (String + TTL)
mcphub:last_probe:{id}        — cached last probe timestamp (String)
```

---

## Frontend Pages

| Page | Key Components | Data Source |
|---|---|---|
| `/dashboard` | StatCards, ServerStatusGrid, RecentAlertsFeed, TopToolsChart | `fleet-summary` polled 30s |
| `/servers` | ServerTable (sortable/filterable) | servers list |
| `/servers/new` | ServerForm (react-hook-form + zod) | POST /servers |
| `/servers/[id]` | Tabs: Overview, Health History, Tool Calls, Alerts | enriched server detail |
| `/analytics` | TopToolsChart, CallVolumeChart, PerAgentTable, date picker | analytics endpoints |
| `/tool-calls` | DataTable cursor-paginated, filters, CSV export | tool-calls list |
| `/alerts` | AlertRuleTable + AlertEventFeed tabs | alerts endpoints |

**Libraries:** recharts, @tanstack/react-query v5, @tanstack/react-table, zustand, react-hook-form, zod, date-fns, sonner, lucide-react

---

## Docker Compose

```yaml
services:
  postgres:16-alpine    # port 5432, persistent volume
  redis:7-alpine        # port 6379, appendonly
  backend               # port 8000, alembic upgrade head → uvicorn 2 workers
  frontend              # port 3000, Next.js standalone
```

Key env vars: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `SMTP_*`, `NEXT_PUBLIC_API_URL`

---

## Build Order

| Milestone | Deliverable |
|---|---|
| 0 — Scaffold | docker-compose with postgres + redis running |
| 1 — Backend Foundation | FastAPI app, models, migrations applied, `GET /health` returns 200 |
| 2 — Server Registry API | Full CRUD for servers, health-checks stubs |
| 3 — Health Prober | Background probes firing, health_checks rows inserting |
| 4 — Tool Call Logger + Proxy | Proxy endpoint logging calls, ingest API |
| 5 — Analytics API | Materialized view + all 4 analytics endpoints |
| 6 — Alert System | Rules evaluated, events fired, notifications sent |
| 7 — Frontend Shell + Servers UI | Server list, form, detail page |
| 8 — Dashboard + Analytics UI | Live charts, fleet overview |
| 9 — Audit Log + Alerts UI | Tool calls table, alert rules + events |
| 10 — Polish + Production | Docker hardening, README, end-to-end smoke test |

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Background jobs | APScheduler in-process | No extra worker process for MVP; swappable for Celery later |
| ORM vs raw SQL | SQLAlchemy ORM for CRUD, `text()` for analytics | Window functions and percentiles are cleaner in raw SQL |
| Health probe protocol | Full MCP handshake (initialize + tools/list) | Bare HTTP ping misses MCP-layer failures |
| Tool call capture | Proxy model | Zero agent-side changes required |
| Frontend data fetching | TanStack Query client-side | Live ops dashboard needs polling + cache invalidation |
| Alert cooldown | DB query on `MAX(fired_at)` | Safe for single-threaded evaluator; add Redis key if parallelized |

---

## Critical Files

| File | Role |
|---|---|
| `backend/app/main.py` | Registers all routers + lifespan (scheduler start/stop) |
| `backend/app/workers/scheduler.py` | All background job cadence |
| `backend/app/probers/http_prober.py` | MCP handshake; data quality depends on this |
| `backend/alembic/versions/` | Schema foundation everything builds on |
| `frontend/src/lib/api.ts` | Typed API client; type contract between frontend and backend |

---

## End-to-End Smoke Test

1. `docker compose up` — all 4 services healthy
2. Register a server via UI → appears in server list
3. Wait 60s → `health_checks` row inserted, server status updates
4. POST to proxy endpoint → `tool_calls` row inserted, response returned
5. View analytics → charts populate with real data
6. Create a `server_down` alert rule → stop test server → `alert_events` row fires → notification sent
7. View alerts UI → event appears, resolve it
