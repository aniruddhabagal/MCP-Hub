# MCPHub — MCP Server Registry, Health Monitor & Dashboard

> MCP is now everywhere but management is completely ad hoc. MCPHub is the ops layer that teams running multiple MCP servers are missing.

---

## The Problem

MCP went from zero to ubiquitous in 8 months. Teams now run 10–20 MCP servers with no visibility into which are slow, which fail silently, or which tools are being called most. There's no central control plane — no equivalent of Grafana, no alerting, no audit trail. Management is entirely ad hoc.

---

## What It Does

A central dashboard to discover, deploy, monitor health, track token usage, and audit tool calls across all MCP servers in an organisation. Think Grafana for your MCP layer.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | Next.js 14 (App Router) |
| Database | PostgreSQL (Neon) |
| Queue / Cache | Redis (Upstash) |
| Deployment | Vercel (frontend + backend), Neon (DB), Upstash (Redis) |

---

## Agent Breakdown

| Agent | Responsibility |
|---|---|
| **Server registry** | Catalog of all MCP servers with metadata, version, and owner |
| **Health prober** | On-demand pings to each server — latency, error rate, availability |
| **Tool call logger** | Intercepts and logs every tool invocation with duration and output size |
| **Usage analytics** | Which tools get called most, by which agents, at what cost |
| **Alert system** | Notifies when a server goes down or error rate spikes |

---

## Architecture Approach

### Deployment Strategy (Vercel Free Tier)

| Component | Service |
|---|---|
| Frontend + Backend API | Vercel (serverless functions) |
| PostgreSQL | Neon (Vercel native integration) |
| Redis | Upstash (Vercel native integration) |
| Analytics cron | Vercel Cron — once/day (`0 2 * * *`) |

FastAPI is deployed as Vercel serverless functions. Because Vercel Hobby cron is limited to once per day, the health prober and alert evaluator are exposed as **on-demand HTTP endpoints** triggered by a dashboard UI button rather than a scheduler. This is sufficient for a portfolio/resume demo.

- `POST /api/v1/admin/probe-all` — runs all health probes on demand
- `POST /api/v1/admin/evaluate-alerts` — runs alert rule evaluation on demand

### Key Architectural Decisions

**Proxy-based interception** — MCPHub sits as a transparent reverse proxy in front of each MCP server (`POST /api/v1/proxy/{server_id}/mcp`). Zero changes required to existing MCP servers. Direct ingestion endpoint (`POST /api/v1/tool-calls`) is the escape hatch.

**Serverless-compatible agents** — No asyncio background loops. Agents are stateless functions invoked via HTTP. Health prober and alert evaluator triggered on demand; analytics aggregator via Vercel Cron daily.

**Pre-aggregated analytics** — Hourly `analytics_snapshots` table prevents expensive aggregation queries over millions of raw `tool_calls` rows.

**Redis roles:**
- Pub/Sub: real-time events to WebSocket dashboard clients
- Streams: durable job queue between prober → alert evaluator
- Cache: pre-computed analytics with TTL (5 min)

---

## Directory Structure

```
MCP-Hub/
├── backend/
│   ├── alembic/                    # DB migrations
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # pydantic-settings
│   │   ├── database.py             # SQLAlchemy async engine
│   │   ├── redis_client.py         # Redis connection pool
│   │   ├── models/                 # ORM models (server, health_check, tool_call, alert)
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── routers/                # API route handlers + proxy.py
│   │   ├── agents/                 # health_prober, alert_evaluator, analytics_aggregator
│   │   ├── services/               # Business logic layer
│   │   └── utils/                  # mcp_client.py, notifiers.py
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/                    # Next.js App Router pages
│       ├── components/             # UI components by page
│       └── lib/                    # API client, types, hooks
├── docker-compose.yml              # Local dev environment
└── .env.example
```

---

## Database Schema (summary)

| Table | Purpose |
|---|---|
| `mcp_servers` | Server registry with status, endpoint, owner, tags |
| `health_checks` | Time-series probe results — latency, status, error |
| `tool_calls` | Audit log of every tool invocation through the proxy |
| `alert_rules` | Configurable alert conditions per server or global |
| `alert_events` | Fired/resolved alert history |
| `analytics_snapshots` | Hourly pre-aggregated call counts, latency, error rates |

---

## API Endpoints (summary)

All under `/api/v1`:

- `/servers` — CRUD + manual probe trigger
- `/health/checks`, `/health/summary` — health history and uptime stats
- `/tool-calls` — paginated audit log + direct ingestion
- `/analytics/*` — top tools, error rates, latency, volume heatmap
- `/alerts/rules`, `/alerts/events` — alert rule management + history
- `/proxy/{server_id}/mcp` — transparent MCP proxy
- `/admin/probe-all`, `/admin/evaluate-alerts` — on-demand agent triggers
- `WS /ws/dashboard` — real-time push via WebSocket

---

## Frontend Pages

| Page | Key components |
|---|---|
| `/dashboard` | StatsCards, HealthOverviewChart, RecentAlerts, TopToolsWidget |
| `/servers` | ServerTable, RegisterServerModal |
| `/servers/[id]` | HealthTimeline, UptimeCalendar, tool calls tab, alerts tab |
| `/tools` | ToolCallTable (paginated), ToolCallDetail drawer |
| `/analytics` | TopToolsChart, LatencyHistogram, UsageHeatmap, CostEstimator |
| `/alerts` | AlertRuleForm, AlertHistoryTable |

**Frontend stack:** Next.js 14, Tailwind CSS, shadcn/ui, Recharts, TanStack Query, WebSocket for live updates.

---

## Development Workflow

### Local Dev
Use Docker Compose for local development:
```
docker-compose up
```
Services: `postgres:5432`, `redis:6379`, `backend:8000`, `frontend:3000`.

### Commit Rules
**Make a git commit after every completed feature.** Each commit should be scoped to a single feature or logical unit of work. Commit message format:
```
feat: <short description>
fix: <short description>
chore: <short description>
```

### Model Selection

Choose the model based on task complexity:

| Task type | Model |
|---|---|
| Simple edits, refactors, small bug fixes | Haiku |
| Normal coding tasks (new features, API endpoints, components) | Sonnet |
| Very heavy or comprehensive tasks (full system design, complex multi-file refactors, architecture changes) | Opus |

### Frontend Development

When implementing a major frontend feature (new page, significant UI component, or visual overhaul), invoke the `frontend-design` skill to ensure production-grade, polished output:
```
/frontend-design
```

### Progress Tracking
The **Progress** section below must be updated as each feature is completed. Mark items with:
- `[ ]` — not started
- `[~]` — in progress
- `[x]` — complete

---

## Progress

### Week 1 — Foundation
- [x] Docker Compose stack (postgres, redis, backend, frontend)
- [x] `.env.example` and config wiring
- [x] FastAPI app skeleton (`main.py`, `config.py`, `database.py`, `redis_client.py`)
- [x] Alembic setup + initial migration (all 6 tables)

### Week 2 — Server Registry + Health Prober
- [x] `mcp_servers` ORM model + Pydantic schemas
- [x] Server Registry CRUD API (`GET/POST/PATCH/DELETE /servers`)
- [x] `mcp_client.py` — async HTTP MCP probe utility
- [x] Health Prober agent (`app/agents/health_prober.py`)
- [x] `POST /admin/probe-all` endpoint
- [x] Health API (`/health/checks`, `/health/summary`)
- [x] Backend tests for server CRUD and health prober

### Week 3 — Proxy + Alerts
- [ ] MCP transparent proxy (`app/routers/proxy.py`)
- [ ] Tool Call Logger (writes `tool_calls` rows via proxy)
- [ ] `POST /tool-calls` direct ingestion endpoint
- [ ] Alert Rules CRUD (`/alerts/rules`)
- [ ] Alert Evaluator agent (`app/agents/alert_evaluator.py`)
- [ ] `POST /admin/evaluate-alerts` endpoint
- [ ] `notifiers.py` (Slack webhook + generic webhook)
- [ ] Backend tests for proxy and alert evaluator

### Week 4 — Analytics
- [ ] Analytics Aggregator agent (`app/agents/analytics_aggregator.py`)
- [ ] Vercel Cron config for daily aggregation
- [ ] Analytics API endpoints (`/analytics/*`)
- [ ] Redis caching layer for analytics responses
- [ ] Alert events API (`/alerts/events`)

### Week 5 — Frontend Foundation
- [ ] Next.js 14 scaffold with Tailwind + shadcn/ui
- [ ] Sidebar + layout shell
- [ ] Typed API client (`lib/api.ts`) + shared types (`lib/types.ts`)
- [ ] Dashboard page (StatsCards, HealthOverviewChart, RecentAlerts)
- [ ] Server Registry page (ServerTable, RegisterServerModal)

### Week 6 — Frontend Pages
- [ ] Server Detail page (HealthTimeline, UptimeCalendar, tabs)
- [ ] Tool Call audit log page (ToolCallTable, filters, ToolCallDetail drawer)
- [ ] Analytics page (TopToolsChart, LatencyHistogram, UsageHeatmap)
- [ ] Alerts page (AlertRuleForm, AlertHistoryTable)

### Week 7 — Real-Time + Polish
- [ ] WebSocket backend handler (`/ws/dashboard`)
- [ ] WebSocket frontend integration (live status dots, alert toasts)
- [ ] "Run Probes" button wired to `POST /admin/probe-all`
- [ ] E2E tests (Playwright)
- [ ] Deploy to Vercel + Neon + Upstash
- [ ] README

---

## Why This Is a Real Gap Right Now

The New Stack flagged MCP management as the #1 unaddressed need for 2026. You'd be building the Grafana for MCP — a gap that's wide open right now. No existing tool covers discovery + health + audit + analytics in a single pane.

**Recruiter appeal:** Being the person who built the management dashboard for the protocol that's now standard is a differentiated story 12 months from now. This signals platform engineering instincts, not just feature development.
