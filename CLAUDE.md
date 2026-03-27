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

## Multi-Tenant / Team Workspace Architecture

### Role & Access Model (Three Distinct Levels)

There are **three distinct levels** of access in the system. Each has its own scope, permissions, backend endpoints, and frontend pages.

**Level 1: Workspace Member** — Read-only viewer within a single workspace.
- Can view dashboard, servers, tool calls, analytics, alerts — all scoped to their workspace
- Can switch between workspaces they belong to
- Cannot create/edit/delete any data or manage workspace settings
- **Sidebar**: Dashboard, Servers, Tool Calls, Analytics, Alerts

**Level 2: Workspace Admin/Owner** — Full management of their own workspace.
- `admin`: Everything except deleting workspace or changing the owner
- `owner`: Full control including workspace deletion and role changes
- CRUD servers, alert rules, trigger probes, manage members/invites/API keys, edit workspace settings
- **Sidebar**: Dashboard, Servers, Tool Calls, Analytics, Alerts, **Settings**
- **`/settings` page** with tabs: General, Members, Invites, API Keys

**Level 3: Super Admin** — Platform-wide management across ALL workspaces.
- `is_superadmin` flag on User model (set via `SUPERADMIN_EMAILS` env var or toggled by another super admin)
- Can view/manage ALL workspaces, ALL users, ALL data across the platform
- Can impersonate users, toggle active/superadmin status, delete any workspace or user
- Bypasses workspace membership checks — can switch into any workspace
- **Sidebar**: Dashboard, Servers, Tool Calls, Analytics, Alerts, **Settings**, **Admin**
- **`/admin` pages**: Platform overview, workspace deep dive, user deep dive

#### Permission Matrix

| Action | Member | Admin | Owner | Super Admin |
|---|---|---|---|---|
| View workspace data | yes | yes | yes | yes (any) |
| CRUD servers & alert rules | — | yes | yes | yes (any) |
| Trigger health probes | — | yes | yes | yes (any) |
| Manage members & invites | — | yes | yes | yes (any) |
| Change member roles | — | — | yes | yes (any) |
| Manage API keys | — | yes | yes | yes (any) |
| Edit workspace name/slug | — | yes | yes | yes (any) |
| Delete workspace | — | — | yes | yes (any) |
| View/manage ALL workspaces & users | — | — | — | yes |
| Cross-workspace analytics & audit | — | — | — | yes |
| Impersonate users | — | — | — | yes |

### Authentication & Authorization

**Custom JWT auth** (no third-party services):
- `passlib[bcrypt]` for password hashing, `python-jose[cryptography]` for JWT
- Access token (15 min) carries `sub` (user_id), `wid` (workspace_id), `role`, `sa` (super admin flag)
- Refresh token (7 days) carries `sub` only
- API key auth via `X-API-Key` header (for proxy/programmatic access)
- Auth dependencies: `get_current_user`, `get_current_workspace`, `require_role(*roles)`, `require_superadmin`, `get_workspace_from_any_auth`

### Multi-Tenant Data Model

**New tables**: `users`, `workspaces`, `workspace_members`, `workspace_invites`, `api_keys`

**All 6 existing tables** get `workspace_id UUID FK → workspaces.id ON DELETE CASCADE NOT NULL`:
- `mcp_servers`, `health_checks`, `tool_calls`, `alert_rules`, `alert_events`, `analytics_snapshots`
- Denormalized on child tables to avoid JOINs on every query
- Every query filtered by `workspace_id` from JWT

**Redis**: Cache keys prefixed with `workspace_id`, pub/sub channels scoped to `mcphub:dashboard:{workspace_id}`

**WebSocket**: Authenticated via `?token=<jwt>` query param, subscribed to workspace-scoped channel

**Agents**: Accept optional `workspace_id` param — when called from UI, scope to workspace; when called from cron, loop over all workspaces

### New API Endpoints

Auth (`/api/v1/auth`):
- `POST /signup`, `/login`, `/refresh`, `/switch-workspace`, `/accept-invite/{token}`
- `GET /me`

Workspaces (`/api/v1/workspaces`):
- CRUD + `/members`, `/members/invite`, `/members/{user_id}`, `/api-keys`

Super Admin (`/api/v1/admin`):
- `GET /overview`, `/workspaces`, `/users`, `/servers`, `/tool-calls`, `/alerts/events`, `/analytics/global`
- `PATCH /workspaces/{id}`, `/users/{id}`
- `DELETE /workspaces/{id}`, `/users/{id}`
- `POST /impersonate/{user_id}`

### New Frontend Pages

| Page | Level | Purpose |
|---|---|---|
| `/login` | Public | Email/password login + "Try Demo" button |
| `/signup` | Public | Registration → auto-creates personal workspace |
| `/invite/[token]` | Public | Accept workspace invitation |
| `/settings` | L2 (Admin/Owner) | Workspace management: general, members, invites, API keys |
| `/admin` | L3 (Super Admin) | Platform overview: stats, all workspaces, all users, global feed |
| `/admin/workspaces/[id]` | L3 (Super Admin) | Workspace deep dive with impersonate/delete |
| `/admin/users/[id]` | L3 (Super Admin) | User deep dive with toggle active/superadmin, impersonate/delete |

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
│   │   ├── config.py               # pydantic-settings (JWT, superadmin emails)
│   │   ├── database.py             # SQLAlchemy async engine
│   │   ├── redis_client.py         # Redis connection pool
│   │   ├── models/                 # ORM models (user, workspace, server, health_check, tool_call, alert, analytics)
│   │   ├── schemas/                # Pydantic schemas (auth, workspace, superadmin, server, etc.)
│   │   ├── routers/                # API route handlers (auth, workspaces, superadmin, servers, proxy, etc.)
│   │   ├── dependencies/           # FastAPI auth dependencies (get_current_user, require_role, etc.)
│   │   ├── agents/                 # health_prober, alert_evaluator, analytics_aggregator
│   │   ├── services/               # Business logic layer
│   │   └── utils/                  # mcp_client.py, notifiers.py, security.py (JWT + bcrypt)
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/                    # Next.js App Router pages (login, signup, settings, admin, etc.)
│       ├── components/             # UI components by page (auth, workspace, admin, layout, etc.)
│       └── lib/                    # API client, types, hooks, auth context, demo-mode
├── docker-compose.yml              # Local dev environment
└── .env.example
```

---

## Database Schema (summary)

| Table | Purpose |
|---|---|
| `users` | User accounts with email, password hash, super admin flag |
| `workspaces` | Team workspaces with name and slug |
| `workspace_members` | Join table: user ↔ workspace with role (owner/admin/member) |
| `workspace_invites` | Pending email invitations with token and expiry |
| `api_keys` | Workspace API keys for programmatic access (hashed) |
| `mcp_servers` | Server registry with status, endpoint, owner, tags — **workspace-scoped** |
| `health_checks` | Time-series probe results — latency, status, error — **workspace-scoped** |
| `tool_calls` | Audit log of every tool invocation through the proxy — **workspace-scoped** |
| `alert_rules` | Configurable alert conditions per server or global — **workspace-scoped** |
| `alert_events` | Fired/resolved alert history — **workspace-scoped** |
| `analytics_snapshots` | Hourly pre-aggregated call counts, latency, error rates — **workspace-scoped** |

---

## API Endpoints (summary)

All under `/api/v1`. All workspace-scoped endpoints require JWT auth; workspace_id extracted from token.

- `/auth/*` — signup, login, refresh, switch-workspace, accept-invite, me
- `/workspaces/*` — workspace CRUD, member management, invites, API keys
- `/servers` — CRUD + manual probe trigger (workspace-scoped, admin+ for mutations)
- `/health/checks`, `/health/summary` — health history and uptime stats (workspace-scoped)
- `/tool-calls` — paginated audit log + direct ingestion (workspace-scoped)
- `/analytics/*` — top tools, error rates, latency, volume heatmap (workspace-scoped)
- `/alerts/rules`, `/alerts/events` — alert rule management + history (workspace-scoped)
- `/proxy/{server_id}/mcp` — transparent MCP proxy (JWT or API key auth)
- `/admin/probe-all`, `/admin/evaluate-alerts` — on-demand agent triggers (JWT or cron secret)
- `/admin/overview`, `/admin/workspaces`, `/admin/users`, etc. — super admin platform management
- `WS /ws/dashboard?token=<jwt>` — real-time push via WebSocket (workspace-scoped channel)

---

## Frontend Pages

| Page | Access | Key components |
|---|---|---|
| `/` | Public | Landing page — hero, problem, agents, architecture, CTA (Lenis + GSAP scroll) |
| `/login` | Public | LoginForm, "Try Demo" button |
| `/signup` | Public | SignupForm → auto-creates personal workspace |
| `/invite/[token]` | Public | Accept workspace invitation |
| `/dashboard` | L1+ | StatsCards, HealthOverviewChart, RecentAlerts, TopToolsWidget |
| `/servers` | L1+ | ServerTable, RegisterServerModal |
| `/servers/[id]` | L1+ | HealthTimeline, UptimeCalendar, tool calls tab, alerts tab |
| `/tools` | L1+ | ToolCallTable (paginated), ToolCallDetail drawer |
| `/analytics` | L1+ | TopToolsChart, LatencyHistogram, UsageHeatmap, CostEstimator |
| `/alerts` | L1+ | AlertRuleForm, AlertHistoryTable |
| `/settings` | L2 (Admin/Owner) | WorkspaceGeneralSettings, MemberList, InviteForm, PendingInvites, ApiKeyManager |
| `/admin` | L3 (Super Admin) | PlatformStatsCards, AllWorkspacesTable, AllUsersTable, GlobalActivityFeed |
| `/admin/workspaces/[id]` | L3 (Super Admin) | WorkspaceDetail — members, servers, alerts, impersonate/delete |
| `/admin/users/[id]` | L3 (Super Admin) | UserDetail — memberships, toggle active/superadmin, impersonate/delete |

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
- [x] MCP transparent proxy (`app/routers/proxy.py`)
- [x] Tool Call Logger (writes `tool_calls` rows via proxy)
- [x] `POST /tool-calls` direct ingestion endpoint
- [x] Alert Rules CRUD (`/alerts/rules`)
- [x] Alert Evaluator agent (`app/agents/alert_evaluator.py`)
- [x] `POST /admin/evaluate-alerts` endpoint
- [x] `notifiers.py` (Slack webhook + generic webhook)
- [x] Backend tests for proxy and alert evaluator

### Week 4 — Analytics
- [x] Analytics Aggregator agent (`app/agents/analytics_aggregator.py`)
- [x] Vercel Cron config for daily aggregation
- [x] Analytics API endpoints (`/analytics/*`)
- [x] Redis caching layer for analytics responses
- [x] Alert events API (`/alerts/events`)

### Week 5 — Frontend Foundation
- [x] Next.js 14 scaffold with Tailwind + shadcn/ui
- [x] Sidebar + layout shell
- [x] Typed API client (`lib/api.ts`) + shared types (`lib/types.ts`)
- [x] Dashboard page (StatsCards, HealthOverviewChart, RecentAlerts)
- [x] Server Registry page (ServerTable, RegisterServerModal)

### Week 6 — Frontend Pages
- [x] Server Detail page (HealthTimeline, UptimeCalendar, tabs)
- [x] Tool Call audit log page (ToolCallTable, filters, ToolCallDetail drawer)
- [x] Analytics page (TopToolsChart, LatencyHistogram, UsageHeatmap)
- [x] Alerts page (AlertRuleForm, AlertHistoryTable)

### Week 7 — Real-Time + Polish
- [x] WebSocket backend handler (`/ws/dashboard`)
- [x] WebSocket frontend integration (live status dots, alert toasts)
- [x] "Run Probes" button wired to `POST /admin/probe-all`
- [x] E2E tests (Playwright)
- [x] Deploy to Vercel + Neon + Upstash
- [x] README
- [x] Landing page at `/` with Lenis + GSAP scroll animations

### Week 8 — Demo Mode
- [x] `lib/demo-data.ts` — static mock dataset (6 servers, 50 tool calls, analytics, alerts)
- [x] `lib/demo-mode.ts` — module singleton, route matcher, `useSyncExternalStore` bridge
- [x] Auto-detection: network failure in `apiFetch` triggers demo mode automatically
- [x] Manual toggle: "Demo mode" switch in Sidebar footer
- [x] `DemoBanner` component — context-aware banner with Retry / Exit demo button
- [x] Mutations blocked in demo mode with global toast via `MutationCache`
- [x] Auto switch-back: 60s health-check interval restores live data when backend recovers

### Week 9 — Multi-Tenant: Database + Auth Foundation
- [x] `passlib[bcrypt]` + `python-jose[cryptography]` dependencies
- [x] `User` ORM model (`app/models/user.py`) with `is_superadmin` flag
- [x] `Workspace`, `WorkspaceMember`, `WorkspaceInvite`, `ApiKey` models (`app/models/workspace.py`)
- [x] Add `workspace_id` FK to all 6 existing models
- [x] Alembic migration `0002_multi_tenant.py` with default workspace backfill
- [x] `security.py` — password hashing + JWT creation/decode
- [x] `dependencies/auth.py` — `get_current_user`, `get_current_workspace`, `require_role`, `require_superadmin`
- [x] Config: `jwt_access_token_expire_minutes`, `jwt_refresh_token_expire_days`, `superadmin_emails`

### Week 10 — Multi-Tenant: Auth + Workspace Routers
- [x] Auth schemas (`schemas/auth.py`) + workspace schemas (`schemas/workspace.py`)
- [x] Auth router: signup, login, refresh, me, switch-workspace, accept-invite
- [x] Workspaces router: CRUD, members, invites, API keys
- [x] Super admin router: platform overview, all workspaces/users, impersonate
- [x] Register new routers in `main.py`

### Week 11 — Multi-Tenant: Tenant-Scope Existing Endpoints
- [x] Add auth deps + workspace filter to all 7 existing routers
- [x] Update agents for per-workspace operation (optional `workspace_id` param)
- [x] Workspace-scoped Redis cache keys and pub/sub channels
- [x] WebSocket auth via `?token=<jwt>` + workspace-scoped subscription
- [x] Update backend tests for workspace context

### Week 12 — Multi-Tenant: Frontend Auth + Workspace UI
- [x] `AuthProvider` context + `useAuth()` hook (`lib/auth.ts`)
- [x] Auth header injection in `apiFetch` + 401 refresh logic
- [x] Login, signup, invite acceptance pages
- [x] Auth gate in `LayoutShell` + demo mode compatibility
- [x] `WorkspaceSwitcher` + `UserMenu` in Sidebar
- [x] `/settings` page: General, Members, Invites, API Keys tabs

### Week 13 — Multi-Tenant: Super Admin Dashboard + Polish
- [x] `/admin` page: PlatformStatsCards, AllWorkspacesTable, AllUsersTable, GlobalActivityFeed
- [x] `/admin/workspaces/[id]`: workspace deep dive with impersonate/delete
- [x] `/admin/users/[id]`: user deep dive with toggle active/superadmin, impersonate/delete
- [x] Admin nav item (shield icon) conditional on `is_superadmin`
- [x] E2E tests for auth flow, tenant isolation, super admin
- [x] Update demo data with mock user/workspace objects

### Week 14 — Invite Flow + Workspace UX Fixes
- [x] Add `resend` to `requirements.txt` + `resend_api_key` / `frontend_url` to `config.py` + `.env.example`
- [x] `app/utils/email.py` — `send_invite_email()` via Resend SDK (`MCPHub <contact@mail.aniruddha.fyi>`), fire-and-forget
- [x] Alembic migration `0003_user_last_workspace.py` — add `last_workspace_id` FK column to `users`
- [x] `schemas/auth.py` — add `PendingInviteResponse`, `invite_token` to `SignupRequest`, `pending_invites` to `MeResponse`
- [x] `routers/auth.py` — signup auto-accepts invite token; login/refresh prefer last_workspace_id → org workspace → owned; switch-workspace updates last_workspace_id; accept-invite handles role upgrade; `/me` returns pending invites
- [x] `routers/workspaces.py` — send invite email on creation; revoke duplicate pending invite before re-inviting
- [x] `lib/types.ts` — add `PendingInvite` interface; update `MeResponse` with `pending_invites`
- [x] `lib/api.ts` — fix `apiAcceptInvite` return type to `TokenResponse`
- [x] `lib/auth.ts` — add `pendingInvites` state, `acceptInvite()` method, `inviteToken` param to `signup()`
- [x] `LoginForm.tsx` — read `?next=` param, redirect after login, pass `next` through to signup link; wrap in `<Suspense>`
- [x] `SignupForm.tsx` — read `?next=` param, extract invite token, pass to `signup()`; wrap in `<Suspense>`
- [x] `invite/[token]/page.tsx` — use `auth.acceptInvite()` instead of raw API call to store returned tokens
- [x] `PendingInviteBanner.tsx` — persistent per-invite banner on dashboard with Accept / Dismiss
- [x] `PendingInviteModal.tsx` — one-time modal on first login with pending invites (sessionStorage flag); uses shadcn Dialog
- [x] `dashboard/page.tsx` — mount `PendingInviteModal` + `PendingInviteBanner`

### Week 15 — Workspace UX & Edge Case Fixes
- [x] `Workspace` model — add `is_personal` boolean column
- [x] Alembic migration `0004_workspace_is_personal.py` — add column + backfill existing personal workspaces
- [x] `schemas/auth.py` — add `is_personal` to `WorkspaceSummary`
- [x] `routers/auth.py` — personal workspace named "Personal Workspace" (not user-derived); propagate `is_personal` in workspace summaries
- [x] `routers/workspaces.py` — creation constraint (block if user already in org workspace); guard delete/rename/leave on personal workspace
- [x] `lib/types.ts` — add `is_personal` to `Workspace` and `WorkspaceSummary`
- [x] `lib/auth.ts` — fix `switchWorkspace` to call `loadMe()` (fixes 422 cascade); add `canCreateWorkspace` derived state; propagate `is_personal`
- [x] `WorkspaceSwitcher.tsx` — wire "New workspace" button; disable with tooltip when in org workspace
- [x] `CreateWorkspaceModal.tsx` — new modal (name + auto-slug + validation); switches into new workspace on create
- [x] `PendingInviteModal.tsx` — fix session key to re-show modal for new invite sets
- [x] `WorkspaceGeneralSettings.tsx` — hide edit/delete for personal workspaces

### Week 16 — Per-Server Auth Configuration
- [x] Alembic migration `0005_server_auth_credentials.py` — add `auth_type` (String) and `auth_credentials` (JSONB) columns to `mcp_servers`
- [x] `models/server.py` — add `auth_type` and `auth_credentials` fields to `MCPServer` ORM model
- [x] `schemas/server.py` — `ServerCreate`/`ServerUpdate` accept `auth_type` + `auth_credentials`; `ServerResponse` masks raw credentials (exposes `has_credentials: bool` flag only); `model_validator` enforces credentials required when auth_type is set
- [x] `utils/mcp_client.py` — `build_auth_headers()` helper supporting bearer token, API key header, and HTTP basic auth; `probe_server()` accepts optional `auth_headers` param; fix probe `Accept` header and broaden healthy status check to all 2xx
- [x] `agents/health_prober.py` — pass server auth headers to `probe_server()`
- [x] `routers/proxy.py` — pass server auth headers when forwarding requests to upstream MCP server
- [x] `lib/types.ts` — add `auth_type` and `has_credentials` to `Server` interface
- [x] `RegisterServerModal.tsx` — auth config section with auth type selector and conditional credential inputs (token field for bearer, header name + value for API key, username + password for basic)
- [x] `ServerTable.tsx` — lock icon indicator for servers with auth configured
- [x] `servers/[id]/page.tsx` — auth type shown in server metadata row
- [x] `lib/demo-data.ts` — update mock servers with auth fields

### Week 17 — Tool Playground
- [x] `utils/mcp_client.py` — extract `parse_sse`, `get_session_id` from proxy; add `send_mcp_request` generic JSON-RPC helper
- [x] `routers/proxy.py` — import shared functions from mcp_client, remove local defs
- [x] `schemas/tools.py` — `ToolDefinition`, `ToolListResponse`, `ToolInvokeRequest`, `ToolInvokeResponse`
- [x] `routers/tools.py` — `GET /servers/{id}/tools` (Redis-cached 5min, L1+), `POST /servers/{id}/tools/invoke` (logged as `caller_agent="mcphub-playground"`, L2+), `DELETE /servers/{id}/tools/cache`
- [x] `main.py` — register tools router
- [x] `lib/types.ts` — `MCPToolDefinition`, `ToolListResponse`, `ToolInvokeRequest`, `ToolInvokeResponse`
- [x] `lib/api.ts` — `getServerTools`, `invokeServerTool`, `invalidateToolsCache`
- [x] `lib/hooks.ts` — `QK.serverTools`, `useServerTools`, `useInvokeTool`, `useInvalidateToolsCache`
- [x] `SchemaForm.tsx` — dynamic JSON Schema → form (string/number/boolean/enum; complex nested types fall back to JSON textarea)
- [x] `ToolCard.tsx` — tool display card with "Test" button (admin/owner only, gated via `useAuth()`)
- [x] `ToolPlayground.tsx` — test dialog: Form/Raw JSON toggle, Run button, result viewer with status/duration/error, audit log link via `tool_call_id`
- [x] `ToolsTab.tsx` — tab content: tool grid, search filter, cached badge, refresh button, loading/empty/error states
- [x] `servers/[id]/page.tsx` — "Tools (N)" tab added as default first tab with count badge
- [x] `lib/demo-data.ts` — `DEMO_SERVER_TOOLS` with 3–5 realistic tools per demo server, each with full JSON Schema `inputSchema`
- [x] `lib/demo-mode.ts` — route matchers for tools list (GET), invoke (POST mock response), cache invalidation (no-op DELETE)

---

## Why This Is a Real Gap Right Now

The New Stack flagged MCP management as the #1 unaddressed need for 2026. You'd be building the Grafana for MCP — a gap that's wide open right now. No existing tool covers discovery + health + audit + analytics in a single pane.

**Recruiter appeal:** Being the person who built the management dashboard for the protocol that's now standard is a differentiated story 12 months from now. This signals platform engineering instincts, not just feature development.
