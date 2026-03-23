# MCPHub — Implementation Plan

## Context

MCPHub is a central ops dashboard for teams running multiple MCP (Model Context Protocol) servers. The problem: teams now run 10–20 MCP servers with no visibility into health, performance, or usage. There is no Grafana equivalent for the MCP layer. This plan builds that: a registry + health prober + tool call logger + analytics + alert system in a single pane of glass.

---

## Directory Structure

```
MCP-Hub/
├── backend/
│   ├── alembic/                    # DB migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point + lifespan
│   │   ├── config.py               # pydantic-settings Settings class
│   │   ├── database.py             # SQLAlchemy async engine + session
│   │   ├── redis_client.py         # Redis connection pool
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── server.py
│   │   │   ├── health_check.py
│   │   │   ├── tool_call.py
│   │   │   └── alert.py
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   ├── server.py
│   │   │   ├── health_check.py
│   │   │   ├── tool_call.py
│   │   │   ├── alert.py
│   │   │   └── analytics.py
│   │   ├── routers/                # FastAPI route handlers
│   │   │   ├── servers.py
│   │   │   ├── health.py
│   │   │   ├── tool_calls.py
│   │   │   ├── analytics.py
│   │   │   ├── alerts.py
│   │   │   └── proxy.py            # MCP transparent proxy + logger
│   │   ├── agents/                 # Background asyncio tasks
│   │   │   ├── health_prober.py
│   │   │   ├── alert_evaluator.py
│   │   │   └── analytics_aggregator.py
│   │   ├── services/               # Business logic layer
│   │   │   ├── server_service.py
│   │   │   ├── health_service.py
│   │   │   ├── tool_call_service.py
│   │   │   ├── analytics_service.py
│   │   │   └── alert_service.py
│   │   └── utils/
│   │       ├── mcp_client.py       # Async MCP protocol HTTP client
│   │       └── notifiers.py        # Slack/webhook/email alert dispatch
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_routers/
│   │   ├── test_services/
│   │   └── test_agents/
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js 14 App Router
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── servers/page.tsx
│   │   │   ├── servers/[id]/page.tsx
│   │   │   ├── tools/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── alerts/page.tsx
│   │   ├── components/
│   │   │   ├── layout/             # Sidebar, TopNav, PageHeader
│   │   │   ├── dashboard/          # StatsCards, HealthOverviewChart, RecentAlerts
│   │   │   ├── servers/            # ServerTable, RegisterServerModal, HealthTimeline
│   │   │   ├── tools/              # ToolCallTable, ToolCallDetail
│   │   │   ├── analytics/          # TopToolsChart, LatencyHistogram, UsageHeatmap
│   │   │   └── alerts/             # AlertRuleForm, AlertHistoryTable
│   │   └── lib/
│   │       ├── api.ts              # Typed fetch wrappers
│   │       ├── types.ts            # Shared TypeScript types
│   │       └── hooks/              # useServers, useHealth, useToolCalls, useAlerts
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Phase 1 — Foundation

### Docker Compose Services

| Service | Image | Port |
|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |
| `backend` | Local Dockerfile | 8000 |
| `frontend` | Local Dockerfile | 3000 |
| `worker` | Same as backend | — |

Key env vars (`.env.example`):
```
DATABASE_URL=postgresql+asyncpg://mcphub:mcphub@postgres:5432/mcphub
REDIS_URL=redis://redis:6379/0
SECRET_KEY=changeme
PROBE_INTERVAL_SECONDS=60
```

### Database Schema

**`mcp_servers`**
```sql
id UUID PK, name VARCHAR UNIQUE, display_name, description, endpoint_url,
transport VARCHAR (http|stdio|ws), owner_team, owner_email, version,
tags TEXT[], auth_token TEXT, status VARCHAR DEFAULT 'unknown',
created_at, updated_at, last_seen_at TIMESTAMPTZ
```

**`health_checks`**
```sql
id UUID PK, server_id UUID FK, checked_at TIMESTAMPTZ,
status VARCHAR (healthy|degraded|down|timeout),
latency_ms INT, error_message TEXT, http_status INT
```
Index: `(server_id, checked_at DESC)`

**`tool_calls`**
```sql
id UUID PK, server_id UUID FK, tool_name VARCHAR, caller_agent VARCHAR,
called_at TIMESTAMPTZ, duration_ms INT, input_size_bytes INT,
output_size_bytes INT, status VARCHAR (success|error|timeout),
error_message TEXT, request_id VARCHAR
```
Index: `(server_id, called_at DESC)`, `(tool_name, called_at DESC)`

**`alert_rules`**
```sql
id UUID PK, name VARCHAR, server_id UUID FK (nullable = applies to all),
condition_type VARCHAR (server_down|error_rate|latency_p95|no_data),
threshold NUMERIC, window_minutes INT DEFAULT 5,
severity VARCHAR (info|warning|critical), enabled BOOLEAN,
notify_channels JSONB, created_at TIMESTAMPTZ
```

**`alert_events`**
```sql
id UUID PK, rule_id UUID FK, server_id UUID FK,
fired_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
status VARCHAR (firing|resolved), message TEXT
```

**`analytics_snapshots`** (hourly pre-aggregates)
```sql
id UUID PK, server_id UUID FK, tool_name VARCHAR (NULL = server-level),
snapshot_hour TIMESTAMPTZ, call_count INT, error_count INT,
avg_latency_ms NUMERIC, p95_latency_ms NUMERIC,
total_input_bytes BIGINT, total_output_bytes BIGINT
```
Unique index: `(server_id, tool_name, snapshot_hour)`

---

## Phase 2 — Core Backend Agents

### Health Prober (`app/agents/health_prober.py`)

- `asyncio` task started in FastAPI lifespan, runs every `PROBE_INTERVAL_SECONDS`
- Fetches all servers from DB, probes each concurrently (semaphore=20)
- Sends `{"jsonrpc":"2.0","method":"tools/list"}` via `app/utils/mcp_client.py`
- Classifies: healthy (<500ms, 2xx) / degraded (500–2000ms or 4xx) / down (5xx/timeout)
- Writes `health_checks` row, updates `mcp_servers.status`
- Publishes to Redis pub/sub `health:updates`; pushes status-change events to Redis stream `alerts:queue`

### MCP Proxy + Tool Call Logger (`app/routers/proxy.py`)

Zero-change observability: agents route through `POST /api/v1/proxy/{server_id}/mcp`.

```
Client → MCPHub Proxy → Upstream MCP Server → MCPHub Proxy → Client
                 ↓                                      ↓
         log tool_name, caller,               log duration_ms,
         input_size_bytes                     output_size_bytes, status
```

- Parse JSON-RPC `method` — only log `tools/call` invocations
- Forward via `httpx` to `mcp_servers.endpoint_url` with auth header
- Write `tool_calls` row via `asyncio.create_task` (fire-and-forget, zero added latency)
- Push to Redis stream `tool_calls:stream` for real-time dashboard

Fallback: `POST /api/v1/tool-calls` for direct ingestion (teams who can't change routing).

### Alert Evaluator (`app/agents/alert_evaluator.py`)

- Consumes Redis stream `alerts:queue` via `XREADGROUP` (at-least-once delivery)
- Also runs periodic sweep every 5 minutes across all enabled rules

| Condition | Query |
|---|---|
| `server_down` | `mcp_servers.status = 'down'` |
| `error_rate` | `COUNT(status='error') / COUNT(*)` over last `window_minutes` |
| `latency_p95` | `PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)` |
| `no_data` | No `health_checks` in last `window_minutes * 2` |

- Breach → INSERT `alert_events`, dispatch via `notifiers.py` (Slack webhook, generic webhook, SMTP)
- Clear → UPDATE `resolved_at`, dispatch resolved notification

### Analytics Aggregator (`app/agents/analytics_aggregator.py`)

- Runs hourly; aggregates previous hour from `tool_calls` grouped by `(server_id, tool_name)`
- Upserts into `analytics_snapshots`
- Writes pre-computed cache keys to Redis (TTL 5 min)

---

## Phase 3 — API Endpoints

All under `/api/v1`.

**Servers**
- `GET/POST /servers` — list / register
- `GET/PATCH/DELETE /servers/{id}` — detail / update / remove
- `POST /servers/{id}/probe` — manual probe trigger

**Health**
- `GET /health/checks` — history with filters
- `GET /health/checks/{server_id}/timeline` — time-series for chart
- `GET /health/summary` — per-server uptime %, avg latency, last status

**Tool Calls**
- `GET /tool-calls` — paginated audit log (filters: server, tool, status, time range)
- `GET /tool-calls/{id}` — detail
- `POST /tool-calls` — direct ingestion

**Analytics**
- `GET /analytics/top-tools` — top N by call count (24h/7d/30d)
- `GET /analytics/error-rates` — per-server over time
- `GET /analytics/latency` — P50/P95/P99 per server or tool
- `GET /analytics/volume` — heatmap data
- `GET /analytics/servers/{id}` — full breakdown

**Alerts**
- `GET/POST /alerts/rules` — list / create
- `PATCH/DELETE /alerts/rules/{id}` — update / delete
- `GET /alerts/events` — event history

**Proxy**
- `POST /proxy/{server_id}/mcp` — transparent proxy
- `GET /proxy/{server_id}/mcp` — SSE stream proxy

**WebSocket**
- `WS /ws/dashboard` — real-time push (health changes, alerts, call counts)

WebSocket subscribes to Redis pub/sub `health:updates` and `alerts:fired`, forwards to all connected clients:
```json
{ "type": "health_update", "server_id": "...", "status": "down", "latency_ms": 0 }
{ "type": "alert_fired",   "alert_id": "...", "server_id": "...", "severity": "critical" }
{ "type": "tool_call",     "server_id": "...", "tool_name": "...", "duration_ms": 42 }
```

---

## Phase 4 — Frontend

**Tech stack:**
- Next.js 14 App Router, Tailwind CSS, shadcn/ui
- Recharts for charts (line, bar, area, histogram, heatmap)
- TanStack Query for data fetching + cache management
- WebSocket connection on mount → updates React Query cache directly for live status dots

**Pages:**

| Page | Key components |
|---|---|
| `/dashboard` | StatsCards, HealthOverviewChart (7-day), RecentAlerts, TopToolsWidget |
| `/servers` | ServerTable (sortable), RegisterServerModal |
| `/servers/[id]` | HealthTimeline (24h latency chart), UptimeCalendar (30-day grid), tool calls tab, alerts tab |
| `/tools` | ToolCallTable (paginated), filter bar, ToolCallDetail drawer |
| `/analytics` | TopToolsChart, LatencyHistogram, UsageHeatmap, CostEstimator |
| `/alerts` | AlertRuleForm (condition builder), AlertHistoryTable |

---

## Phase 5 — Redis Usage

| Role | Key / Channel / Stream | Producer | Consumer |
|---|---|---|---|
| Pub/Sub | `health:updates` | Health prober | WebSocket handler |
| Pub/Sub | `alerts:fired` | Alert evaluator | WebSocket handler |
| Stream | `alerts:queue` | Health prober | Alert evaluator |
| Stream | `tool_calls:stream` | Proxy router | WebSocket handler |
| Cache | `cache:top_tools:24h` (TTL 5m) | Analytics aggregator | Analytics router |
| Cache | `cache:server_summary` (TTL 30s) | Analytics aggregator | Dashboard router |

Redis Streams used (not plain pub/sub) for the queue role because they support consumer groups, ACKs, and replay — ensuring the alert evaluator never misses an event on restart.

---

## Phase 6 — Testing

**Backend:** `pytest` + `pytest-asyncio` + `httpx.AsyncClient` + `fakeredis` + `respx`
- `conftest.py`: transaction-per-test rollback (fast isolation), `FakeRedis`, FastAPI test transport
- Test alert fire/resolve cycle end-to-end: seed `tool_calls` errors → run evaluator → assert `alert_events` + notification dispatched
- Test proxy: assert `tool_calls` row written with `duration_ms` within 10% of mock response time

**Frontend:** Vitest + React Testing Library + MSW
- Unit test hooks with MSW handlers
- Component tests for `RegisterServerModal` and `AlertRuleForm`
- E2E with Playwright: register server → trigger probe → see status change

---

## Execution Sequence

| Week | Deliverable |
|---|---|
| 1 | Docker Compose, DB schema, Alembic migrations, FastAPI skeleton with config/DB/Redis wiring |
| 2 | Server Registry CRUD API + tests, Health Prober agent, `mcp_client.py` |
| 3 | Proxy router + Tool Call Logger, Alert Evaluator agent, Alert Rules CRUD |
| 4 | Analytics Aggregator, Analytics API endpoints, Redis caching layer |
| 5 | Next.js scaffold, layout/sidebar, Dashboard page, Server Registry page |
| 6 | Server Detail page, Tool Call audit log, Analytics page, Alerts page |
| 7 | WebSocket real-time layer (backend + frontend), E2E tests, README |

---

## Critical Files

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app + lifespan; wires all background agents |
| `backend/app/agents/health_prober.py` | Core reliability agent; drives server status and alert pipeline |
| `backend/app/routers/proxy.py` | MCP transparent proxy; zero-change tool call logging |
| `backend/app/agents/alert_evaluator.py` | Redis Stream consumer; manages alert fire/resolve lifecycle |
| `docker-compose.yml` | Local dev environment; prerequisite for everything else |

---

## Deployment (Free Tier)

| Component | Service |
|---|---|
| Frontend + Backend | Vercel |
| PostgreSQL | Neon (Vercel native integration) |
| Redis | Upstash (Vercel native integration) |
| Analytics cron | Vercel Cron (once/day, Hobby limit) |

**Agent execution on Vercel free tier:**
Vercel Hobby cron runs at most once per day — too slow for health probing and alert evaluation. Instead, expose these as manual trigger endpoints:
- `POST /api/v1/admin/probe-all` — runs all health probes on demand
- `POST /api/v1/admin/evaluate-alerts` — runs alert rule evaluation on demand

A "Run Probes" button in the dashboard UI calls these endpoints directly. The architecture is identical; the trigger is a button click instead of a scheduler. This is sufficient for a portfolio/resume demo.

The analytics aggregator runs via Vercel Cron (`0 2 * * *`) — once daily is appropriate for analytics snapshots.

**Note:** Because Vercel deploys FastAPI as serverless functions, the `asyncio` lifespan-based background tasks are removed. The agents become stateless functions called via HTTP.

---

## Key Architectural Decisions

**Proxy-based interception (not SDK instrumentation)** — Zero changes required to existing MCP servers. Any team can route through `mcphub.internal/proxy/{server_id}/mcp`. SDK ingestion endpoint is an escape hatch.

**Serverless-compatible agents (no asyncio background loops)** — Deployed on Vercel serverless functions, agents are invoked via HTTP endpoints rather than long-running tasks. Health prober and alert evaluator are triggered on demand via dashboard UI buttons; analytics aggregator runs via Vercel Cron daily.

**Pre-aggregated analytics snapshots** — Raw `tool_calls` grows to millions of rows. Hourly snapshots reduce analytics queries to ≤720 rows per server per month, keeping the dashboard fast without a columnar DB.

---

## Verification

After each phase:
1. `docker-compose up` — all services healthy
2. `curl http://localhost:8000/api/v1/servers` — returns `[]`
3. Register a real or mock MCP server via API
4. Wait one probe interval — verify `health_checks` row and `mcp_servers.status` updated
5. Route a tool call through the proxy — verify `tool_calls` row written
6. Create an alert rule, force a `server_down` condition — verify `alert_events` row and notification dispatched
7. Open dashboard at `http://localhost:3000` — verify status dot updates live via WebSocket
