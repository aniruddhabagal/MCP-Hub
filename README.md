# MCPHub

> Central ops dashboard for teams running multiple MCP servers. Grafana for your MCP layer.

MCP went from zero to ubiquitous in under a year. Teams now run 10–20 MCP servers with no visibility into which are slow, which fail silently, or which tools are called most. MCPHub is the missing management layer.

---

## What It Does

- **Server Registry** — catalog all MCP servers with metadata, version, owner, and tags
- **Health Monitoring** — on-demand probes with latency tracking and uptime history
- **Transparent Proxy** — sits in front of any MCP server; logs every tool call without code changes
- **Usage Analytics** — top tools by call count, latency histograms, error rates, volume heatmap
- **Alert System** — threshold-based rules on error rate, latency p95, or availability; Slack/webhook notifications
- **Real-Time Dashboard** — WebSocket push for live status updates and alert toasts

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     Browser / Client                   │
│  Next.js 14 · TanStack Query · Recharts · shadcn/ui    │
└───────────────────────┬────────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼────────────────────────────────┐
│               FastAPI (Vercel serverless)               │
│  /api/v1/servers   /api/v1/health   /api/v1/tool-calls │
│  /api/v1/analytics /api/v1/alerts   /api/v1/proxy      │
│  /api/v1/admin     /ws/dashboard (WebSocket)            │
└──────────┬───────────────────────────┬─────────────────┘
           │                           │
┌──────────▼──────┐         ┌──────────▼──────┐
│  PostgreSQL     │         │  Redis           │
│  (Neon)        │         │  (Upstash)       │
│                 │         │  • Cache (5 min) │
│  mcp_servers    │         │  • Pub/Sub       │
│  health_checks  │         │  • WS events     │
│  tool_calls     │         └─────────────────┘
│  alert_rules    │
│  alert_events   │
│  analytics_snap │
└─────────────────┘
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Recharts |
| Backend | Python, FastAPI (serverless functions) |
| Database | PostgreSQL via Neon |
| Cache / Pub-Sub | Redis via Upstash |
| Deployment | Vercel (frontend + backend), Neon, Upstash |

---

## Quick Start (Local)

**Prerequisites:** Docker, Docker Compose

```bash
git clone https://github.com/your-username/mcphub.git
cd mcphub

# Copy env and set secrets
cp .env.example .env
# Edit .env — set SECRET_KEY and CRON_SECRET at minimum

# Start all services
docker-compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Vercel Deployment

### 1. Deploy the Backend

```bash
cd backend
vercel deploy --prod
# Note the deployment URL, e.g. https://mcphub-api.vercel.app
```

Set these environment variables in the Vercel dashboard:
```
DATABASE_URL       # Neon connection string (postgresql+asyncpg://...)
REDIS_URL          # Upstash Redis URL (rediss://...)
SECRET_KEY         # Random secret string
CRON_SECRET        # Secret for cron/admin endpoints
ALLOWED_ORIGINS    # https://your-frontend.vercel.app
SLACK_WEBHOOK_URL  # Optional: Slack incoming webhook
```

### 2. Deploy the Frontend

```bash
cd frontend
vercel deploy --prod
```

Set these environment variables:
```
NEXT_PUBLIC_API_URL      # https://mcphub-api.vercel.app/api/v1
NEXT_PUBLIC_WS_URL       # wss://mcphub-api.vercel.app/ws/dashboard
NEXT_PUBLIC_CRON_SECRET  # Same value as backend CRON_SECRET
```

### 3. Set up Vercel Cron

Add to `backend/vercel.json` (already included):
```json
{
  "crons": [
    {
      "path": "/api/v1/admin/aggregate-analytics",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Yes | Redis connection string (`redis://...` or `rediss://...`) |
| `SECRET_KEY` | Yes | App secret key |
| `CRON_SECRET` | Yes | Bearer token for admin/cron endpoints |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins |
| `APP_ENV` | No | `development` or `production` (default: `development`) |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook for alert notifications |
| `ALERT_WEBHOOK_URL` | No | Generic webhook for alert notifications |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL (default: `ws://localhost:8000/ws/dashboard`) |
| `NEXT_PUBLIC_CRON_SECRET` | Yes | Frontend copy of CRON_SECRET for "Run Probes" button |

---

## API Endpoints

All REST endpoints under `/api/v1`:

| Endpoint | Description |
|---|---|
| `GET/POST /servers` | List / register servers |
| `GET/PATCH/DELETE /servers/{id}` | Server CRUD |
| `POST /servers/{id}/probe` | Probe a single server |
| `GET /health/checks` | Paginated health check history |
| `GET /health/summary` | Uptime stats per server |
| `GET /tool-calls` | Paginated audit log |
| `POST /tool-calls` | Direct tool call ingestion |
| `GET /analytics/top-tools` | Top tools by call count |
| `GET /analytics/error-rates` | Error rates by server/tool |
| `GET /analytics/latency` | Avg + p95 latency stats |
| `GET /analytics/volume` | Volume heatmap buckets |
| `GET/POST /alerts/rules` | Alert rule CRUD |
| `GET /alerts/events` | Alert event history |
| `POST /proxy/{server_id}/mcp` | Transparent MCP proxy |
| `POST /admin/probe-all` | Probe all servers (auth required) |
| `POST /admin/evaluate-alerts` | Evaluate all alert rules (auth required) |
| `WS /ws/dashboard` | Real-time WebSocket stream |

---

## E2E Tests

```bash
cd frontend
npx playwright test
```

Tests mock API responses and run without a live backend.

---

## Project Structure

```
mcphub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── agents/              # health_prober, alert_evaluator, analytics_aggregator
│   │   ├── routers/             # API route handlers + proxy + websocket
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── utils/               # mcp_client, notifiers
│   └── alembic/                 # DB migrations
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       ├── components/          # UI components by domain
│       └── lib/                 # API client, types, hooks, utils
└── docker-compose.yml
```
