# MCPHub

> **Grafana for your MCP layer.** The central ops dashboard that teams running multiple MCP servers are missing.

MCP went from zero to ubiquitous in under a year. Teams now run 10–20 MCP servers with **zero visibility** into which are slow, which fail silently, or which tools are called most. MCPHub is the missing management layer — a single pane of glass for discovery, health monitoring, auditing, analytics, and alerting across your entire MCP infrastructure — with full multi-tenant team workspace support.

<br/>

## Features

| | Feature | Description |
|---|---|---|
| 📋 | **Server Registry** | Catalog all MCP servers with metadata, version, owner, and tags |
| 💓 | **Health Monitoring** | On-demand probes with latency tracking, error rates, and uptime history |
| 🔀 | **Transparent Proxy** | Sits in front of any MCP server and logs every tool call — zero code changes required |
| 📊 | **Usage Analytics** | Top tools by call count, latency histograms, error rates, volume heatmap |
| 🚨 | **Alert System** | Threshold-based rules on error rate, latency, or availability with Slack/webhook delivery |
| ⚡ | **Real-Time Dashboard** | WebSocket push for live server status and alert toasts |
| 🏢 | **Team Workspaces** | Multi-tenant with owner/admin/member roles — invite teammates, manage API keys |
| 🛡️ | **Super Admin** | Platform-wide visibility across all workspaces, users, and servers with impersonation |
| 🔑 | **Custom JWT Auth** | Access + refresh token flow, API key auth, no third-party auth services |
| 🎭 | **Demo Mode** | Full offline demo with realistic mock data — no backend required |

<br/>

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                               │
│   Next.js 14 · TanStack Query · Recharts · shadcn/ui            │
│   AuthProvider · WorkspaceSwitcher · GSAP + Lenis               │
└──────────────────────────┬──────────────────────────────────────┘
                           │  REST + WebSocket (?token=<jwt>)
┌──────────────────────────▼──────────────────────────────────────┐
│             FastAPI  (Vercel Serverless Functions)               │
│                                                                 │
│  /api/v1/auth          /api/v1/workspaces   /api/v1/servers     │
│  /api/v1/tool-calls    /api/v1/analytics    /api/v1/alerts      │
│  /api/v1/health        /api/v1/proxy        /api/v1/admin       │
│  /ws/dashboard  (WebSocket — workspace-scoped pub/sub)          │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
  ┌────────────▼────────┐    ┌────────────▼────────┐
  │  PostgreSQL (Neon)  │    │   Redis (Upstash)   │
  │                     │    │                     │
  │  users              │    │  • 5-min cache TTL  │
  │  workspaces         │    │  • Workspace-scoped │
  │  workspace_members  │    │    pub/sub channels │
  │  workspace_invites  │    │  • WS fan-out       │
  │  api_keys           │    └─────────────────────┘
  │  mcp_servers        │
  │  health_checks      │
  │  tool_calls         │
  │  alert_rules        │
  │  alert_events       │
  │  analytics_snaps    │
  └─────────────────────┘
```

<br/>

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Recharts, TanStack Query |
| **Animations** | GSAP + ScrollTrigger, Lenis smooth scroll |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| **Auth** | `python-jose` (JWT), `passlib[bcrypt]` (passwords), custom refresh token flow |
| **Database** | PostgreSQL 16 via [Neon](https://neon.tech) |
| **Cache / Queue** | Redis via [Upstash](https://upstash.com) |
| **Deployment** | [Vercel](https://vercel.com) (frontend + backend), Neon, Upstash |
| **Tests** | Playwright E2E (frontend), pytest (backend) |

<br/>

## Role & Access Model

Three distinct access levels:

| | Member | Admin | Owner | Super Admin |
|---|---|---|---|---|
| View workspace data | ✅ | ✅ | ✅ | ✅ (any) |
| CRUD servers & alert rules | — | ✅ | ✅ | ✅ (any) |
| Manage members & invites | — | ✅ | ✅ | ✅ (any) |
| Change member roles | — | — | ✅ | ✅ (any) |
| Manage API keys | — | ✅ | ✅ | ✅ (any) |
| Delete workspace | — | — | ✅ | ✅ (any) |
| View/manage ALL workspaces & users | — | — | — | ✅ |
| Impersonate users | — | — | — | ✅ |

<br/>

## Quick Start (Local)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

```bash
# 1. Clone the repo
git clone https://github.com/aniruddhabagal/MCP-Hub.git
cd MCP-Hub

# 2. Copy env file and fill in secrets
cp .env.example .env
# Required: DATABASE_URL, REDIS_URL, SECRET_KEY, JWT_SECRET_KEY, CRON_SECRET

# 3. Start all services (postgres, redis, backend, frontend)
docker-compose up
```

| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8000/api/v1 |
| 📄 API Docs (Swagger) | http://localhost:8000/docs |

> **No backend?** Click **Try demo mode** on the login page — the full UI runs on rich mock data with no network required.

> **First run:** Sign up at `/signup` — a personal workspace is created automatically. Set `SUPERADMIN_EMAILS=you@example.com` in `.env` to grant yourself super admin access.

<br/>

## Pages

| Page | Access | Description |
|---|---|---|
| `/` | Public | Landing page with GSAP scroll animations |
| `/login` | Public | Email/password login + "Try demo mode" button |
| `/signup` | Public | Registration — auto-creates personal workspace |
| `/invite/[token]` | Public | Accept a workspace invitation |
| `/dashboard` | Member+ | Stats, health overview, recent alerts, top tools |
| `/servers` | Member+ | Server registry with health status |
| `/servers/[id]` | Member+ | Health timeline, uptime calendar, tool calls, alerts |
| `/tools` | Member+ | Paginated tool call audit log with filters |
| `/analytics` | Member+ | Top tools, latency histogram, error rates, heatmap |
| `/alerts` | Member+ | Alert rule management + event history |
| `/settings` | Admin+ | General, Members, Invites, API Keys tabs |
| `/admin` | Super Admin | Platform overview — all workspaces, users, global activity |
| `/admin/workspaces/[id]` | Super Admin | Workspace deep dive — members, impersonate, delete |
| `/admin/users/[id]` | Super Admin | User deep dive — toggle active/superadmin, impersonate, delete |

<br/>

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon asyncpg URL — `postgresql+asyncpg://...?ssl=require` |
| `REDIS_URL` | ✅ | Upstash Redis URL — `rediss://...` |
| `SECRET_KEY` | ✅ | Long random string (`openssl rand -hex 32`) |
| `JWT_SECRET_KEY` | ✅ | Separate secret for signing JWTs (`openssl rand -hex 32`) |
| `JWT_ALGORITHM` | ☐ | Default: `HS256` |
| `CRON_SECRET` | ✅ | Bearer token for admin/cron endpoints |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins (your frontend URL) |
| `SUPERADMIN_EMAILS` | ☐ | Comma-separated emails auto-granted super admin on signup |
| `APP_ENV` | ☐ | `development` or `production` (default: `development`) |
| `SLACK_WEBHOOK_URL` | ☐ | Slack incoming webhook for alert notifications |
| `ALERT_WEBHOOK_URL` | ☐ | Generic HTTP webhook for alert notifications |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend base URL — `https://your-backend.vercel.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | ✅ | WebSocket URL — `wss://your-backend.vercel.app/ws/dashboard` |
| `NEXT_PUBLIC_CRON_SECRET` | ✅ | Same as backend `CRON_SECRET` — powers the "Run Probes" button |

<br/>

## API Reference

All REST endpoints are under `/api/v1`. Protected endpoints require `Authorization: Bearer <access_token>` or `X-API-Key: <key>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Create account — auto-creates personal workspace, returns tokens |
| `POST` | `/auth/login` | Email/password login, returns access + refresh tokens |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token |
| `GET` | `/auth/me` | Current user + workspace list |
| `POST` | `/auth/switch-workspace` | Get new access token scoped to a different workspace |
| `POST` | `/auth/accept-invite/{token}` | Accept a workspace invitation |

### Workspaces
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/workspaces` | List or create workspaces |
| `PATCH/DELETE` | `/workspaces/{id}` | Update or delete a workspace |
| `GET` | `/workspaces/{id}/members` | List workspace members |
| `POST` | `/workspaces/{id}/members/invite` | Send email invitation |
| `PATCH/DELETE` | `/workspaces/{id}/members/{user_id}` | Change role or remove member |
| `GET/POST` | `/workspaces/{id}/api-keys` | List or create API keys |
| `DELETE` | `/workspaces/{id}/api-keys/{key_id}` | Revoke an API key |

### Servers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/servers` | List workspace servers |
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

### Admin — Cron / On-demand (`Authorization: Bearer CRON_SECRET`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/admin/probe-all` | Run health probes on all servers |
| `POST` | `/admin/evaluate-alerts` | Evaluate all alert rules |

### Super Admin (`is_superadmin` required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/overview` | Platform stats — users, workspaces, servers, tool calls, alerts |
| `GET` | `/admin/workspaces` | All workspaces with member/server counts |
| `GET/PATCH/DELETE` | `/admin/workspaces/{id}` | Workspace detail, update, or delete |
| `GET` | `/admin/users` | All users with workspace counts |
| `GET/PATCH/DELETE` | `/admin/users/{id}` | User detail, update active/superadmin, or delete |
| `POST` | `/admin/impersonate/{user_id}` | Get an access token scoped to this user |
| `GET` | `/admin/tool-calls` | All tool calls across all workspaces |
| `GET` | `/admin/alerts/events` | All alert events across all workspaces |
| `GET` | `/admin/analytics/global` | Platform-wide call counts, error rate, top tools |

### Real-Time
| Protocol | Endpoint | Description |
|---|---|---|
| `WebSocket` | `/ws/dashboard?token=<jwt>` | Workspace-scoped live status + alert event stream |

<br/>

## Project Structure

```
MCP-Hub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Pydantic settings (JWT, superadmin emails)
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── redis_client.py      # Redis connection pool
│   │   ├── agents/              # health_prober · alert_evaluator · analytics_aggregator
│   │   ├── routers/             # auth · workspaces · superadmin · servers · proxy · websocket …
│   │   ├── models/              # user · workspace · server · health_check · tool_call · alert · analytics
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── dependencies/        # get_current_user · require_role · require_superadmin
│   │   ├── services/            # Business logic layer
│   │   └── utils/               # security (JWT + bcrypt) · mcp_client · notifiers
│   ├── alembic/                 # DB migrations (0001_initial · 0002_multi_tenant)
│   ├── tests/                   # pytest test suite
│   ├── vercel.json              # Vercel serverless + cron config
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       │   ├── page.tsx         # Landing page (/)
│       │   ├── login/           # Sign in
│       │   ├── signup/          # Create account
│       │   ├── invite/[token]/  # Accept workspace invitation
│       │   ├── dashboard/       # Main dashboard
│       │   ├── servers/         # Server list + [id] detail
│       │   ├── tools/           # Tool call audit log
│       │   ├── analytics/       # Charts + heatmap
│       │   ├── alerts/          # Alert rules + history
│       │   ├── settings/        # Workspace settings (admin+)
│       │   └── admin/           # Platform admin (superadmin)
│       │       ├── page.tsx     # Overview
│       │       ├── workspaces/[id]/
│       │       └── users/[id]/
│       ├── components/
│       │   ├── auth/            # LoginForm · SignupForm
│       │   ├── admin/           # PlatformStatsCards · AllWorkspacesTable · AllUsersTable · GlobalActivityFeed
│       │   ├── workspace/       # WorkspaceGeneralSettings · MemberList · InviteForm · PendingInvites · ApiKeyManager
│       │   ├── layout/          # Sidebar · LayoutShell · WorkspaceSwitcher · UserMenu · DemoBanner · WebSocketProvider
│       │   ├── dashboard/       # StatsCards · HealthOverviewChart · RecentAlerts · TopToolsWidget
│       │   ├── servers/         # ServerTable · HealthTimeline · UptimeCalendar · RegisterServerModal
│       │   ├── tools/           # ToolCallTable · ToolCallDetail
│       │   ├── analytics/       # TopToolsChart · LatencyHistogram · ErrorRatesChart · UsageHeatmap
│       │   ├── alerts/          # AlertRuleForm · AlertRulesTable · AlertHistoryTable
│       │   └── ui/              # shadcn/ui primitives
│       └── lib/
│           ├── auth.ts          # AuthProvider + useAuth() hook
│           ├── token-store.ts   # Access token singleton (avoids circular deps)
│           ├── api.ts           # Typed API client with auth injection + 401 refresh
│           ├── types.ts         # All TypeScript interfaces
│           ├── demo-mode.ts     # Demo mode singleton + route matcher
│           ├── demo-data.ts     # Rich mock dataset (servers, users, workspaces, admin)
│           ├── websocket.ts     # WebSocket hook with JWT auth + reconnect
│           └── hooks.ts / utils.ts
├── e2e/                         # Playwright test suites
│   ├── auth.spec.ts             # Login/signup pages, demo mode bypass
│   ├── admin.spec.ts            # Admin overview, workspace/user deep dives, settings
│   ├── dashboard.spec.ts
│   ├── servers.spec.ts
│   ├── tools.spec.ts
│   └── alerts.spec.ts
├── docker-compose.yml
├── .env.example
└── CLAUDE.md                    # Project spec + progress tracker
```

<br/>

## Database Schema

| Table | Purpose |
|---|---|
| `users` | User accounts — email, bcrypt password hash, superadmin flag |
| `workspaces` | Team workspaces — name, slug |
| `workspace_members` | User ↔ workspace join — role (owner/admin/member) |
| `workspace_invites` | Pending email invitations with expiring token |
| `api_keys` | Hashed API keys for programmatic access |
| `mcp_servers` | Server registry — endpoint, owner, tags, status *(workspace-scoped)* |
| `health_checks` | Time-series probe results — latency, status, error *(workspace-scoped)* |
| `tool_calls` | Full audit log of every proxied tool invocation *(workspace-scoped)* |
| `alert_rules` | Configurable threshold conditions per server or global *(workspace-scoped)* |
| `alert_events` | Fired/resolved alert history *(workspace-scoped)* |
| `analytics_snapshots` | Hourly pre-aggregated metrics — avoids costly raw-row aggregation *(workspace-scoped)* |

<br/>

## Tests

```bash
# E2E tests (Playwright) — runs against the live dev server
cd frontend
npx playwright test

# Backend tests (pytest)
cd backend
pytest
```

Playwright tests cover auth pages, demo mode bypass, admin overview, workspace/user deep dives, settings, dashboard, server registry, tool calls, analytics, and alerts.

<br/>

## Deployment (Vercel + Neon + Upstash)

1. **[Neon](https://neon.tech)** → Create a project, copy the pooled asyncpg connection string
2. **[Upstash](https://upstash.com)** → Create a Redis database with TLS, copy the `rediss://` URL
3. **Vercel Backend** → Import repo, root directory `backend`, add all env vars, deploy
4. **Vercel Frontend** → Import repo, root directory `frontend`, set `NEXT_PUBLIC_API_URL`, deploy
5. Set `SUPERADMIN_EMAILS` to your email — you'll get platform admin access on first signup

For full steps see **[Deployment.md](./Deployment.md)**.

<br/>

## Roadmap

- [x] Server registry + health monitoring
- [x] Transparent MCP proxy + tool call audit log
- [x] Analytics (top tools, latency, error rates, heatmap)
- [x] Alert system with Slack/webhook delivery
- [x] Real-time WebSocket dashboard
- [x] Landing page with GSAP/Lenis animations
- [x] Demo mode — offline with full mock data
- [x] Multi-tenant team workspaces (owner / admin / member roles)
- [x] Custom JWT auth with refresh token flow
- [x] Super admin platform dashboard with impersonation
- [ ] MCP server auto-discovery (scan local network / Docker)
- [ ] Token cost estimation per tool call
- [ ] GitHub Actions integration for CI health checks
- [ ] Exportable audit reports (CSV / JSON)

<br/>

---

<p align="center">
  Built as the ops layer the MCP ecosystem is missing.<br/>
  <em>Grafana for MCP — discovery · health · audit · analytics · multi-tenant in a single pane.</em>
</p>
