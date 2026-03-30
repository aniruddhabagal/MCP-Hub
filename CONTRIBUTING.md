# Contributing to MCPHub

Thank you for your interest in contributing. This document covers everything you need to get MCPHub running locally, understand its architecture, and submit changes.

---

## Table of Contents

- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Role & Access Model](#role--access-model)
- [Testing](#testing)
- [Commit & PR Guidelines](#commit--pr-guidelines)

---

## Local Development

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

```bash
git clone https://github.com/aniruddhabagal/MCP-Hub.git
cd MCP-Hub
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET_KEY at minimum
docker-compose up
```

Services started:

| Service          | Port |
| ---------------- | ---- |
| PostgreSQL       | 5432 |
| Redis            | 6379 |
| FastAPI backend  | 8000 |
| Next.js frontend | 3000 |

### Pre-commit checks

Run these from `frontend/` before every commit — both must pass with no errors:

```bash
npx tsc --noEmit
npm run lint
```

---

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
│   │   └── utils/               # security (JWT + bcrypt) · mcp_client · notifiers · email
│   ├── alembic/                 # DB migrations
│   ├── tests/                   # pytest test suite
│   ├── vercel.json              # Vercel serverless + cron config
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       │   ├── page.tsx         # Landing page (/)
│       │   ├── login/
│       │   ├── signup/
│       │   ├── invite/[token]/
│       │   ├── dashboard/
│       │   ├── servers/         # List + [id] detail + Tool Playground
│       │   ├── tools/           # Tool call audit log
│       │   ├── analytics/
│       │   ├── alerts/
│       │   ├── settings/        # Workspace settings (admin+)
│       │   ├── docs/            # Fumadocs documentation site
│       │   └── admin/           # Platform admin (superadmin)
│       ├── components/
│       │   ├── auth/            # LoginForm · SignupForm
│       │   ├── admin/           # PlatformStatsCards · AllWorkspacesTable · AllUsersTable · GlobalActivityFeed
│       │   ├── workspace/       # WorkspaceGeneralSettings · MemberList · InviteForm · PendingInvites · ApiKeyManager
│       │   ├── layout/          # Sidebar · LayoutShell · WorkspaceSwitcher · UserMenu · DemoBanner · WebSocketProvider
│       │   ├── dashboard/       # StatsCards · HealthOverviewChart · RecentAlerts · TopToolsWidget
│       │   ├── servers/         # ServerTable · HealthTimeline · UptimeCalendar · RegisterServerModal
│       │   │                    # ToolsTab · ToolCard · ToolPlayground · SchemaForm
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
├── content/docs/                # Fumadocs MDX source for the /docs site
├── e2e/                         # Playwright test suites
│   ├── auth.spec.ts
│   ├── admin.spec.ts
│   ├── dashboard.spec.ts
│   ├── servers.spec.ts
│   ├── tools.spec.ts
│   └── alerts.spec.ts
├── docker-compose.yml
└── .env.example
```

---

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

### Key decisions

**Proxy-based interception** — MCPHub sits as a transparent reverse proxy (`POST /api/v1/proxy/{server_id}/mcp`). Zero changes required to existing MCP servers. A direct ingestion endpoint (`POST /api/v1/tool-calls`) is available as an escape hatch.

**Serverless-compatible agents** — No asyncio background loops. Agents are stateless functions called over HTTP. Health prober and alert evaluator are triggered on demand; analytics aggregator runs via Vercel Cron daily at 02:00 UTC.

**Pre-aggregated analytics** — Hourly `analytics_snapshots` rows prevent expensive aggregation over raw `tool_calls` at query time.

**Redis roles:**

- Pub/Sub — real-time events fanned out to WebSocket clients
- Streams — durable job queue between prober and alert evaluator
- Cache — pre-computed analytics with 5-minute TTL, keys prefixed by `workspace_id`

**Per-server auth** — Auth type and credentials are stored server-side in a JSONB column. The API never returns raw credentials — only a `has_credentials: bool` flag. The proxy and health prober inject the correct headers automatically.

**Demo mode** — A module singleton intercepts `apiFetch` calls and returns static mock data when the backend is unreachable. Activated automatically on network failure or manually via the sidebar toggle.

---

## Database Schema

| Table                 | Purpose                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `users`               | User accounts — email, bcrypt hash, `is_superadmin` flag                                                      |
| `workspaces`          | Team workspaces — name, slug, `is_personal` flag                                                              |
| `workspace_members`   | User ↔ workspace join — role (owner / admin / member)                                                         |
| `workspace_invites`   | Pending email invitations with expiring token                                                                 |
| `api_keys`            | Hashed API keys for programmatic access                                                                       |
| `mcp_servers`         | Server registry — endpoint, owner, tags, status, `auth_type`, `auth_credentials` (JSONB) _(workspace-scoped)_ |
| `health_checks`       | Time-series probe results — latency, status, error _(workspace-scoped)_                                       |
| `tool_calls`          | Full audit log of every proxied tool invocation _(workspace-scoped)_                                          |
| `alert_rules`         | Configurable threshold conditions per server or global _(workspace-scoped)_                                   |
| `alert_events`        | Fired/resolved alert history _(workspace-scoped)_                                                             |
| `analytics_snapshots` | Hourly pre-aggregated metrics _(workspace-scoped)_                                                            |

All six data tables carry a `workspace_id UUID FK → workspaces.id ON DELETE CASCADE NOT NULL`. Every query is filtered by the `workspace_id` embedded in the JWT — no cross-tenant data leakage.

Migrations live in `backend/alembic/`. Run them with:

```bash
cd backend
alembic upgrade head
```

---

## API Reference

All endpoints are under `/api/v1`. Protected endpoints require `Authorization: Bearer <access_token>` or `X-API-Key: <key>`.

### Auth

| Method | Endpoint                      | Description                                                      |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| `POST` | `/auth/signup`                | Create account — auto-creates personal workspace, returns tokens |
| `POST` | `/auth/login`                 | Email/password login, returns access + refresh tokens            |
| `POST` | `/auth/refresh`               | Exchange refresh token for new access token                      |
| `GET`  | `/auth/me`                    | Current user + workspace list + pending invites                  |
| `POST` | `/auth/switch-workspace`      | Get a new access token scoped to a different workspace           |
| `POST` | `/auth/accept-invite/{token}` | Accept a workspace invitation                                    |

### Workspaces

| Method           | Endpoint                             | Description                      |
| ---------------- | ------------------------------------ | -------------------------------- |
| `GET / POST`     | `/workspaces`                        | List or create workspaces        |
| `PATCH / DELETE` | `/workspaces/{id}`                   | Update or delete a workspace     |
| `GET`            | `/workspaces/{id}/members`           | List workspace members           |
| `POST`           | `/workspaces/{id}/members/invite`    | Send email invitation via Resend |
| `PATCH / DELETE` | `/workspaces/{id}/members/{user_id}` | Change role or remove member     |
| `GET / POST`     | `/workspaces/{id}/api-keys`          | List or create API keys          |
| `DELETE`         | `/workspaces/{id}/api-keys/{key_id}` | Revoke an API key                |

### Servers

| Method   | Endpoint              | Description                                                             |
| -------- | --------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/servers`            | List workspace servers                                                  |
| `POST`   | `/servers`            | Register a server — optionally include `auth_type` + `auth_credentials` |
| `GET`    | `/servers/{id}`       | Server detail — `has_credentials` flag, never raw credentials           |
| `PATCH`  | `/servers/{id}`       | Update metadata or auth config                                          |
| `DELETE` | `/servers/{id}`       | Remove server                                                           |
| `POST`   | `/servers/{id}/probe` | On-demand health probe (uses configured auth)                           |

### Tool Playground

| Method   | Endpoint                     | Auth    | Description                                                                     |
| -------- | ---------------------------- | ------- | ------------------------------------------------------------------------------- |
| `GET`    | `/servers/{id}/tools`        | Member+ | Fetch tool list via `tools/list` JSON-RPC — cached in Redis for 5 min           |
| `POST`   | `/servers/{id}/tools/invoke` | Admin+  | Invoke a tool via `tools/call` — logged with `caller_agent="mcphub-playground"` |
| `DELETE` | `/servers/{id}/tools/cache`  | Admin+  | Force-invalidate cached tool list                                               |

### Health

| Method | Endpoint          | Description             |
| ------ | ----------------- | ----------------------- |
| `GET`  | `/health/checks`  | Paginated probe history |
| `GET`  | `/health/summary` | Uptime stats per server |

### Tool Calls

| Method | Endpoint                 | Description                      |
| ------ | ------------------------ | -------------------------------- |
| `GET`  | `/tool-calls`            | Paginated audit log with filters |
| `POST` | `/tool-calls`            | Direct ingestion (bypass proxy)  |
| `POST` | `/proxy/{server_id}/mcp` | Transparent MCP proxy endpoint   |

### Analytics

| Method | Endpoint                 | Description                  |
| ------ | ------------------------ | ---------------------------- |
| `GET`  | `/analytics/top-tools`   | Top tools by call count      |
| `GET`  | `/analytics/error-rates` | Error rates by server / tool |
| `GET`  | `/analytics/latency`     | Avg + p95 latency stats      |
| `GET`  | `/analytics/volume`      | Volume heatmap time buckets  |

### Alerts

| Method   | Endpoint             | Description         |
| -------- | -------------------- | ------------------- |
| `GET`    | `/alerts/rules`      | List alert rules    |
| `POST`   | `/alerts/rules`      | Create alert rule   |
| `PATCH`  | `/alerts/rules/{id}` | Update rule         |
| `DELETE` | `/alerts/rules/{id}` | Delete rule         |
| `GET`    | `/alerts/events`     | Alert event history |

### Admin — On-demand triggers (`Authorization: Bearer CRON_SECRET`)

| Method | Endpoint                 | Description                                            |
| ------ | ------------------------ | ------------------------------------------------------ |
| `POST` | `/admin/probe-all`       | Run health probes on all servers across all workspaces |
| `POST` | `/admin/evaluate-alerts` | Evaluate all alert rules                               |

### Super Admin (`is_superadmin` required)

| Method                 | Endpoint                       | Description                                                |
| ---------------------- | ------------------------------ | ---------------------------------------------------------- |
| `GET`                  | `/admin/overview`              | Platform stats — users, workspaces, servers, calls, alerts |
| `GET`                  | `/admin/workspaces`            | All workspaces with member/server counts                   |
| `GET / PATCH / DELETE` | `/admin/workspaces/{id}`       | Workspace detail, update, or delete                        |
| `GET`                  | `/admin/users`                 | All users                                                  |
| `GET / PATCH / DELETE` | `/admin/users/{id}`            | User detail, toggle active/superadmin, delete              |
| `POST`                 | `/admin/impersonate/{user_id}` | Get access token scoped to this user                       |
| `GET`                  | `/admin/tool-calls`            | All tool calls across all workspaces                       |
| `GET`                  | `/admin/alerts/events`         | All alert events across all workspaces                     |
| `GET`                  | `/admin/analytics/global`      | Platform-wide metrics                                      |

### Real-Time

| Protocol  | Endpoint                    | Description                                       |
| --------- | --------------------------- | ------------------------------------------------- |
| WebSocket | `/ws/dashboard?token=<jwt>` | Workspace-scoped live status + alert event stream |

---

## Environment Variables

### Backend

| Variable            | Required | Description                                               |
| ------------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`      | ✅       | Neon asyncpg URL — `postgresql+asyncpg://...?ssl=require` |
| `REDIS_URL`         | ✅       | Upstash Redis URL — `rediss://...`                        |
| `SECRET_KEY`        | ✅       | Long random string (`openssl rand -hex 32`)               |
| `JWT_SECRET_KEY`    | ✅       | Separate secret for signing JWTs (`openssl rand -hex 32`) |
| `JWT_ALGORITHM`     |          | Default: `HS256`                                          |
| `CRON_SECRET`       | ✅       | Bearer token for admin/cron endpoints                     |
| `ALLOWED_ORIGINS`   | ✅       | Comma-separated CORS origins                              |
| `SUPERADMIN_EMAILS` |          | Comma-separated emails auto-granted super admin on signup |
| `RESEND_API_KEY`    |          | Resend API key for invite emails                          |
| `FRONTEND_URL`      |          | Used in invite email links                                |
| `SLACK_WEBHOOK_URL` |          | Slack incoming webhook for alert delivery                 |
| `ALERT_WEBHOOK_URL` |          | Generic HTTP webhook for alert delivery                   |

### Frontend

| Variable                  | Required | Description                                                    |
| ------------------------- | -------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | ✅       | Backend base URL — `https://your-backend.vercel.app/api/v1`    |
| `NEXT_PUBLIC_WS_URL`      | ✅       | WebSocket URL — `wss://your-backend.vercel.app/ws/dashboard`   |
| `NEXT_PUBLIC_CRON_SECRET` | ✅       | Same as backend `CRON_SECRET` — powers the "Run Probes" button |

---

## Role & Access Model

Three distinct access levels, each with its own scope and UI:

| Action                             | Member | Admin | Owner | Super Admin |
| ---------------------------------- | ------ | ----- | ----- | ----------- |
| View workspace data                | ✅     | ✅    | ✅    | ✅ (any)    |
| CRUD servers & alert rules         | —      | ✅    | ✅    | ✅ (any)    |
| Trigger health probes              | —      | ✅    | ✅    | ✅ (any)    |
| Manage members & invites           | —      | ✅    | ✅    | ✅ (any)    |
| Change member roles                | —      | —     | ✅    | ✅ (any)    |
| Manage API keys                    | —      | ✅    | ✅    | ✅ (any)    |
| Edit workspace name/slug           | —      | ✅    | ✅    | ✅ (any)    |
| Delete workspace                   | —      | —     | ✅    | ✅ (any)    |
| View/manage ALL workspaces & users | —      | —     | —     | ✅          |
| Impersonate users                  | —      | —     | —     | ✅          |

**JWT structure:**

- Access token (15 min) carries `sub` (user_id), `wid` (workspace_id), `role`, `sa` (superadmin flag)
- Refresh token (7 days) carries `sub` only
- API key auth via `X-API-Key` header

FastAPI dependencies: `get_current_user`, `get_current_workspace`, `require_role(*roles)`, `require_superadmin`, `get_workspace_from_any_auth`.

Super admins are set via `SUPERADMIN_EMAILS` env var or toggled by another super admin in the `/admin` dashboard.

---

## Testing

```bash
# Backend (pytest)
cd backend
pytest

# Frontend E2E (Playwright) — requires dev server running
cd frontend
npx playwright test
```

Playwright suites cover: auth flow, demo mode bypass, admin overview, workspace/user deep dives, settings, dashboard, server registry, tool calls, analytics, and alerts.

---

## Commit & PR Guidelines

- One logical unit of work per commit
- Prefix: `feat:`, `fix:`, or `chore:`
- Open a PR against `main` — include a short description of what changed and why
- All TypeScript and lint checks must pass before merging
