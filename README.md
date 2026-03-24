# 🛰️ MCPHub

> **Grafana for your MCP layer.** The central ops dashboard that teams running multiple MCP servers are missing.

MCP went from zero to ubiquitous in under a year. Teams now run 10–20 MCP servers with **zero visibility** into which are slow, which fail silently, or which tools are called most. MCPHub is the missing management layer — a single pane of glass for discovery, health monitoring, auditing, analytics, and alerting across your entire MCP infrastructure.

<br/>

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📋 | **Server Registry** | Catalog all MCP servers with metadata, version, owner, and tags |
| 💓 | **Health Monitoring** | On-demand probes with latency tracking, error rates, and uptime history |
| 🔀 | **Transparent Proxy** | Sits in front of any MCP server and logs every tool call — zero code changes required |
| 📊 | **Usage Analytics** | Top tools by call count, latency histograms, error rates, volume heatmap |
| 🚨 | **Alert System** | Threshold-based rules on error rate, latency, or availability with Slack/webhook delivery |
| ⚡ | **Real-Time Dashboard** | WebSocket push for live server status and alert toasts |

<br/>

## 🖥️ Screenshots

| Landing Page | Dashboard |
|---|---|
| Hero with animated scroll | Server health overview with live stats |

| Server Detail | Analytics |
|---|---|
| Health timeline + uptime calendar | Top tools, latency histogram, heatmap |

<br/>

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│    Next.js 14 · TanStack Query · Recharts · shadcn/ui       │
│    Lenis smooth scroll · GSAP animations                    │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│              FastAPI  (Vercel Serverless Functions)          │
│                                                             │
│  /api/v1/servers      /api/v1/health      /api/v1/proxy     │
│  /api/v1/tool-calls   /api/v1/analytics   /api/v1/alerts    │
│  /api/v1/admin        /ws/dashboard  (WebSocket)            │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
  ┌────────────▼────────┐    ┌────────────▼────────┐
  │  PostgreSQL (Neon)  │    │   Redis (Upstash)   │
  │                     │    │                     │
  │  mcp_servers        │    │  • 5-min cache TTL  │
  │  health_checks      │    │  • Pub/Sub events   │
  │  tool_calls         │    │  • WS fan-out       │
  │  alert_rules        │    └─────────────────────┘
  │  alert_events       │
  │  analytics_snaps    │
  └─────────────────────┘
```

<br/>

## 🛠️ Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Recharts, TanStack Query |
| **Animations** | GSAP + ScrollTrigger, Lenis smooth scroll |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| **Database** | PostgreSQL 16 via [Neon](https://neon.tech) |
| **Cache / Queue** | Redis via [Upstash](https://upstash.com) |
| **Deployment** | [Vercel](https://vercel.com) (frontend + backend), Neon, Upstash |
| **Tests** | Playwright E2E (frontend), pytest (backend) |

<br/>

## 🚀 Quick Start (Local)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/mcphub.git
cd mcphub

# 2. Copy env file and set required secrets
cp .env.example .env
# Edit .env — set SECRET_KEY and CRON_SECRET at minimum

# 3. Start all services (postgres, redis, backend, frontend)
docker-compose up
```

| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8000/api/v1 |
| 📄 API Docs (Swagger) | http://localhost:8000/docs |

> 💡 **Installing new packages?** The frontend container runs `npm install` on startup automatically, so your new dependencies are always picked up without rebuilding the image.

<br/>

## ☁️ Deployment (Vercel + Neon + Upstash)

For a full step-by-step production deployment guide, see **[Deployment.md](./Deployment.md)**.

**Short version:**

1. **[Neon](https://neon.tech)** → Create a project, copy the **pooled** asyncpg connection string
2. **[Upstash](https://upstash.com)** → Create a Redis database with TLS, copy the `rediss://` URL
3. **Vercel Backend** → Import repo, set root directory to `backend`, add env vars, deploy
4. **Vercel Frontend** → Import repo again, set root directory to `frontend`, point to backend URL, deploy

<br/>

## 🔑 Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon asyncpg URL — `postgresql+asyncpg://...?ssl=require` |
| `REDIS_URL` | ✅ | Upstash Redis URL — `rediss://...` |
| `SECRET_KEY` | ✅ | Long random string (`openssl rand -hex 32`) |
| `CRON_SECRET` | ✅ | Bearer token for admin/cron endpoints |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins (your frontend URL) |
| `APP_ENV` | ☐ | `development` or `production` (default: `development`) |
| `SLACK_WEBHOOK_URL` | ☐ | Slack incoming webhook for alert notifications |
| `ALERT_WEBHOOK_URL` | ☐ | Generic HTTP webhook for alert notifications |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL — `https://your-backend.vercel.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | ✅ | WebSocket URL — `wss://your-backend.vercel.app/ws/dashboard` |
| `NEXT_PUBLIC_CRON_SECRET` | ✅ | Same value as backend `CRON_SECRET` — powers the "Run Probes" button |

<br/>

## 📡 API Reference

All REST endpoints are under `/api/v1`:

### Servers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/servers` | List all registered servers |
| `POST` | `/servers` | Register a new server |
| `GET` | `/servers/{id}` | Get server details |
| `PATCH` | `/servers/{id}` | Update server metadata |
| `DELETE` | `/servers/{id}` | Remove a server |
| `POST` | `/servers/{id}/probe` | Probe a single server on-demand |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/checks` | Paginated health check history |
| `GET` | `/health/summary` | Uptime stats per server |

### Tool Calls
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tool-calls` | Paginated audit log with filters |
| `POST` | `/tool-calls` | Direct ingestion (bypass proxy) |
| `POST` | `/proxy/{server_id}/mcp` | Transparent MCP proxy endpoint |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/top-tools` | Top tools by call count |
| `GET` | `/analytics/error-rates` | Error rates by server/tool |
| `GET` | `/analytics/latency` | Avg + p95 latency stats |
| `GET` | `/analytics/volume` | Volume heatmap time buckets |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/alerts/rules` | List alert rules |
| `POST` | `/alerts/rules` | Create an alert rule |
| `PATCH` | `/alerts/rules/{id}` | Update a rule |
| `DELETE` | `/alerts/rules/{id}` | Delete a rule |
| `GET` | `/alerts/events` | Alert event history |

### Admin (Auth Required — `Authorization: Bearer CRON_SECRET`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/admin/probe-all` | Run health probes on all servers |
| `POST` | `/admin/evaluate-alerts` | Evaluate all alert rules |
| `POST` | `/admin/aggregate-analytics` | Run analytics aggregation (also the daily cron) |

### Real-Time
| Protocol | Endpoint | Description |
|---|---|---|
| `WebSocket` | `/ws/dashboard` | Live server status + alert event stream |

<br/>

## 📁 Project Structure

```
mcphub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point + lifespan (runs migrations)
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── redis_client.py      # Redis connection pool
│   │   ├── agents/              # health_prober · alert_evaluator · analytics_aggregator
│   │   ├── routers/             # API route handlers + proxy + websocket
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic layer
│   │   └── utils/               # mcp_client · notifiers
│   ├── alembic/                 # DB migrations
│   ├── tests/                   # pytest test suite
│   ├── vercel.json              # Vercel serverless + cron config
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       │   ├── page.tsx         # Landing page (/)
│       │   ├── dashboard/       # Main dashboard
│       │   ├── servers/         # Server list + detail pages
│       │   ├── tools/           # Tool call audit log
│       │   ├── analytics/       # Analytics charts
│       │   └── alerts/          # Alert rules + history
│       ├── components/          # UI components by domain
│       │   ├── landing/         # LandingPage (GSAP + Lenis)
│       │   ├── layout/          # Sidebar · LayoutShell · WebSocketProvider
│       │   ├── dashboard/       # StatsCards · HealthOverviewChart · etc.
│       │   ├── servers/         # ServerTable · HealthTimeline · etc.
│       │   ├── tools/           # ToolCallTable · ToolCallDetail
│       │   ├── analytics/       # TopToolsChart · LatencyHistogram · etc.
│       │   ├── alerts/          # AlertRuleForm · AlertHistoryTable
│       │   └── ui/              # shadcn/ui primitives
│       └── lib/                 # api.ts · types.ts · hooks.ts · utils.ts
├── docker-compose.yml           # Local dev stack
├── .env.example                 # Environment variable template
├── Deployment.md                # Full production deployment guide
└── Usage.md                     # Feature usage guide
```

<br/>

## 🧪 Tests

```bash
# E2E tests (Playwright) — runs against the live dev server
cd frontend
npx playwright test

# Backend tests (pytest)
cd backend
pytest
```

Playwright tests mock API responses and cover dashboard, server registry, tool calls, analytics, and alerts pages.

<br/>

## 📊 Database Schema

| Table | Purpose |
|---|---|
| `mcp_servers` | Server registry — endpoint, owner, tags, status |
| `health_checks` | Time-series probe results — latency, status, error message |
| `tool_calls` | Full audit log of every proxied tool invocation |
| `alert_rules` | Configurable alert conditions per server (or global) |
| `alert_events` | Fired/resolved alert history |
| `analytics_snapshots` | Hourly pre-aggregated metrics — prevents costly aggregation on raw rows |

<br/>

## 🗺️ Roadmap

- [ ] Multi-tenant / team workspace support
- [ ] MCP server auto-discovery (scan local network / Docker)
- [ ] Token cost estimation per tool call
- [ ] GitHub Actions integration for CI health checks
- [ ] Exportable audit reports (CSV / JSON)

<br/>

## 📖 Documentation

| Doc | Description |
|---|---|
| [Usage.md](./Usage.md) | Full feature guide — landing page, dashboard, servers, analytics, alerts |
| [Deployment.md](./Deployment.md) | Step-by-step Neon + Upstash + Vercel deployment |
| [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger API docs (when running locally) |

<br/>

---

<p align="center">
  Built as the ops layer the MCP ecosystem is missing.<br/>
  <em>Grafana for MCP — discovery · health · audit · analytics in a single pane.</em>
</p>
