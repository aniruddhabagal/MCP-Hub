# Multi-Tenant / Team Workspace Support

## Context

MCP-Hub currently has **zero authentication** — all API endpoints are open, all data is globally visible, and there's no concept of users, teams, or workspaces. The only protected endpoints are `/admin/*` (cron secret). This plan adds a full multi-tenant workspace system: user accounts, JWT auth, workspace-scoped data isolation, roles, invites, API keys, and a **super admin** role with full platform-wide access.

---

## Role & Access Model (Three Distinct Levels)

There are **three distinct levels** of access in the system. Each has its own scope, permissions, backend endpoints, and frontend pages.

### Level 1: Workspace Member (regular user)
- **Scope**: Single workspace — can only see data belonging to their current workspace
- **Roles**: `member` (read-only viewer within the workspace)
- **What they can do**:
  - View dashboard, servers, tool calls, analytics, alerts — all scoped to their workspace
  - Switch between workspaces they belong to
  - View their own profile
- **What they cannot do**:
  - Create/edit/delete servers, alert rules, or any data
  - Manage workspace members, invites, or API keys
  - Access any other workspace's data
- **Backend**: All existing endpoints (`/servers`, `/health`, `/tool-calls`, `/analytics`, `/alerts`) filtered by `workspace_id` from JWT. Read-only access enforced by `require_role("member", "admin", "owner")`.
- **Frontend**: `/dashboard`, `/servers`, `/servers/[id]`, `/tools`, `/analytics`, `/alerts` — all workspace-scoped. No settings/admin nav items visible.

### Level 2: Workspace Owner/Admin (workspace-level management)
- **Scope**: Single workspace — full management of their own workspace
- **Roles**: `owner` (full control) and `admin` (everything except deleting the workspace or changing the owner)
- **What they can do** (in addition to Level 1):
  - **CRUD servers**: Create, edit, delete MCP servers in their workspace
  - **Manage alert rules**: Create, edit, delete, enable/disable alert rules
  - **Trigger probes**: Run health probes for their workspace's servers
  - **Manage members**: Invite users, change roles (owner only for role changes), remove members
  - **Manage invites**: Send/revoke workspace invitations
  - **Manage API keys**: Create/revoke API keys for programmatic access to their workspace
  - **Workspace settings**: Edit workspace name/slug (owner can delete the workspace)
- **Backend**: Same workspace-scoped endpoints, but mutations allowed via `require_role("admin", "owner")`. Workspace management via `/workspaces/{id}/members`, `/workspaces/{id}/api-keys`, etc.
- **Frontend**: Same pages as Level 1, plus a **`/settings`** page (accessible via "Settings" nav item in sidebar). The `/settings` page has tabs:
  - **General**: Workspace name, slug, danger zone (delete workspace — owner only)
  - **Members**: Table of members with role badges, invite button, role change dropdown (owner only), remove button
  - **Invites**: Pending invitations, resend/revoke
  - **API Keys**: List keys (prefix only), create new, revoke

### Level 3: Super Admin (platform-wide management)
- **Scope**: Entire platform — can see and manage ALL workspaces, ALL users, ALL data
- **How it's granted**: `is_superadmin` flag on User model. Set via `SUPERADMIN_EMAILS` env var (auto-promoted on login) or toggled by another super admin.
- **What they can do** (in addition to Levels 1 & 2 in any workspace):
  - **View platform overview**: Total users, workspaces, servers, tool calls, active alerts across all workspaces
  - **Manage any workspace**: View/edit/delete any workspace, see its members and data
  - **Manage any user**: View/edit/disable/delete any user, promote/demote super admin status
  - **Cross-workspace data**: Browse all servers, tool calls, alert events, analytics globally
  - **Impersonate**: Generate tokens as any user for debugging, or switch into any workspace without being a member
- **Backend**: Dedicated `/admin/*` endpoints (require `is_superadmin`). Also, super admins bypass membership checks on all workspace-scoped endpoints — they can set any `wid` in their JWT via `/auth/switch-workspace`.
- **Frontend**: All Level 1 & 2 pages, plus a dedicated **`/admin`** section (accessible via "Admin" nav item with shield icon, only visible to super admins):
  - **`/admin`**: Platform overview — stats cards, all-workspaces table, all-users table, global activity feed
  - **`/admin/workspaces/[id]`**: Workspace deep dive — details, members, servers, tool calls, alerts, impersonate/delete buttons
  - **`/admin/users/[id]`**: User deep dive — details, workspace memberships, toggle active/superadmin, impersonate/delete buttons

### Permission Matrix

| Action | Member | Admin | Owner | Super Admin |
|---|---|---|---|---|
| View workspace data (dashboard, servers, tools, analytics, alerts) | yes | yes | yes | yes (any workspace) |
| Create/edit/delete servers | — | yes | yes | yes (any workspace) |
| Create/edit/delete alert rules | — | yes | yes | yes (any workspace) |
| Trigger health probes | — | yes | yes | yes (any workspace) |
| Invite members | — | yes | yes | yes (any workspace) |
| Change member roles | — | — | yes | yes (any workspace) |
| Remove members | — | yes | yes | yes (any workspace) |
| Manage API keys | — | yes | yes | yes (any workspace) |
| Edit workspace name/slug | — | yes | yes | yes (any workspace) |
| Delete workspace | — | — | yes | yes (any workspace) |
| View/manage ALL workspaces | — | — | — | yes |
| View/manage ALL users | — | — | — | yes |
| Cross-workspace analytics | — | — | — | yes |
| Impersonate users | — | — | — | yes |
| Promote/demote super admins | — | — | — | yes |

### Frontend Navigation by Role

**Member sees in sidebar:**
- Dashboard, Servers, Tool Calls, Analytics, Alerts

**Admin/Owner sees in sidebar:**
- Dashboard, Servers, Tool Calls, Analytics, Alerts, **Settings**

**Super Admin sees in sidebar:**
- Dashboard, Servers, Tool Calls, Analytics, Alerts, **Settings**, **Admin**

---

## Phase 1: Database + Auth Foundation (Backend)

### New Dependencies
Add to `requirements.txt`:
- `passlib[bcrypt]` — password hashing
- `python-jose[cryptography]` — JWT encoding/decoding

### New ORM Models

**`backend/app/models/user.py`** — `User` model:
- `id` (UUID PK), `email` (unique), `password_hash`, `display_name`, `is_active`, **`is_superadmin`** (boolean, default false), `created_at`, `updated_at`

**`backend/app/models/workspace.py`** — 4 models:
- **`Workspace`**: `id`, `name`, `slug` (unique), `created_at`, `updated_at`
- **`WorkspaceMember`**: `id`, `workspace_id` (FK), `user_id` (FK), `role` (owner|admin|member), `joined_at` — unique on (workspace_id, user_id)
- **`WorkspaceInvite`**: `id`, `workspace_id` (FK), `email`, `role`, `token` (unique), `invited_by` (FK), `expires_at`, `accepted_at`, `created_at`
- **`ApiKey`**: `id`, `workspace_id` (FK), `name`, `key_hash`, `key_prefix` (first 8 chars), `created_by` (FK), `last_used_at`, `expires_at`, `created_at`

### Add `workspace_id` to All 6 Existing Models
Each gets `workspace_id: UUID FK → workspaces.id ON DELETE CASCADE NOT NULL` + index.
- `backend/app/models/server.py` — `MCPServer`
- `backend/app/models/health_check.py` — `HealthCheck`
- `backend/app/models/tool_call.py` — `ToolCall`
- `backend/app/models/alert.py` — `AlertRule`, `AlertEvent`
- `backend/app/models/analytics.py` — `AnalyticsSnapshot`

Denormalizing `workspace_id` on child tables (health_checks, tool_calls, etc.) avoids JOINs on every query.

### Alembic Migration: `0002_multi_tenant.py`
1. Create `users`, `workspaces`, `workspace_members`, `workspace_invites`, `api_keys` tables
2. Insert a "Default" workspace with a known UUID
3. Add `workspace_id` as NULLABLE to all 6 existing tables
4. Backfill all existing rows → default workspace UUID
5. ALTER to NOT NULL + add FK constraints + indexes

### New Utility: `backend/app/utils/security.py`
- `hash_password(plain) → str` (bcrypt)
- `verify_password(plain, hashed) → bool`
- `create_access_token(user_id, workspace_id, role) → str` — JWT with `sub`, `wid`, `role`, `exp` (15 min)
- `create_refresh_token(user_id) → str` — JWT with `sub`, `exp` (7 days)
- `decode_token(token) → dict` — validate + decode

Uses existing `settings.secret_key` with HS256.

### New Auth Dependencies: `backend/app/dependencies/auth.py`
- `get_current_user(token)` — extract JWT from `Authorization: Bearer`, return User
- `get_current_workspace(user, db)` — extract `wid` from JWT, verify membership, return `(user, workspace, role)`. **Super admins bypass membership check** — they can access any workspace by passing any `wid`.
- `require_role(*roles)` — factory returning a dependency that checks role. **Super admin implicitly satisfies any role check.**
- `require_superadmin()` — dependency that checks `user.is_superadmin`, returns 403 if not
- `get_workspace_id(ctx)` — convenience, returns just the UUID
- `authenticate_api_key(header)` — hash lookup in `api_keys`, return `(workspace_id, key_id)`
- `get_workspace_from_any_auth(...)` — tries JWT first, falls back to API key (for proxy/ingestion)

### Config Changes: `backend/app/config.py`
Add `jwt_access_token_expire_minutes: int = 15`, `jwt_refresh_token_expire_days: int = 7`, and `superadmin_emails: str = ""` (comma-separated emails that are auto-promoted to super admin on signup/login).

### Super Admin JWT Claims
When a super admin logs in, their JWT includes `"sa": true`. The `get_current_workspace` dependency checks this claim:
- If `sa=true` and `wid` is set → access that workspace without membership check
- If `sa=true` and `wid` is `"*"` or absent → super admin context (used for cross-workspace endpoints)
- `require_role()` always passes for super admins
- Super admin status is set via env var `SUPERADMIN_EMAILS` (comma-separated) in config, checked on login. Alternatively, set directly in DB.

---

## Phase 2: Auth + Workspace Routers (Backend)

### New Schemas
**`backend/app/schemas/auth.py`**: `SignupRequest`, `LoginRequest`, `TokenResponse`, `RefreshRequest`
**`backend/app/schemas/workspace.py`**: `WorkspaceCreate`, `WorkspaceResponse`, `MemberResponse`, `InviteCreate`, `InviteResponse`, `ApiKeyCreate`, `ApiKeyResponse`

### New Router: `backend/app/routers/auth.py`
```
POST /auth/signup                — create user + personal workspace, return tokens
POST /auth/login                 — email/password → access + refresh tokens
POST /auth/refresh               — refresh token → new access token
GET  /auth/me                    — current user profile + list of workspaces
POST /auth/switch-workspace      — workspace_id → new access token with updated wid
POST /auth/accept-invite/{token} — accept invite (must be logged in)
```

### New Router: `backend/app/routers/workspaces.py`
```
POST   /workspaces                          — create workspace (user = owner)
GET    /workspaces                          — list user's workspaces
GET    /workspaces/{id}                     — workspace details
PATCH  /workspaces/{id}                     — update name (owner/admin)
DELETE /workspaces/{id}                     — delete workspace (owner only)
GET    /workspaces/{id}/members             — list members
POST   /workspaces/{id}/members/invite      — invite by email (owner/admin)
PATCH  /workspaces/{id}/members/{user_id}   — change role (owner only)
DELETE /workspaces/{id}/members/{user_id}   — remove member (owner/admin, or self-leave)
POST   /workspaces/{id}/api-keys            — create API key, return raw key once
GET    /workspaces/{id}/api-keys            — list keys (prefix only)
DELETE /workspaces/{id}/api-keys/{key_id}   — revoke key
```

### New Router: `backend/app/routers/superadmin.py`
All endpoints require `Depends(require_superadmin)`.
```
GET    /admin/overview               — platform stats: total users, workspaces, servers, tool calls, active alerts
GET    /admin/workspaces             — list ALL workspaces with member counts, server counts, last activity
GET    /admin/workspaces/{id}        — full workspace detail (members, servers, alerts, usage)
PATCH  /admin/workspaces/{id}        — update any workspace (name, slug)
DELETE /admin/workspaces/{id}        — delete any workspace + cascade
GET    /admin/users                  — list ALL users with workspace memberships, last login
GET    /admin/users/{id}             — full user detail (workspaces, role in each, activity)
PATCH  /admin/users/{id}             — toggle is_active, toggle is_superadmin, update fields
DELETE /admin/users/{id}             — delete user + cascade memberships
GET    /admin/servers                — list ALL servers across all workspaces (with workspace name)
GET    /admin/tool-calls             — list ALL tool calls across all workspaces (global audit log)
GET    /admin/alerts/events          — list ALL alert events across all workspaces
GET    /admin/analytics/global       — platform-wide analytics (total calls, top tools, error rates)
POST   /admin/impersonate/{user_id}  — generate a token as if logged in as that user (for debugging)
```

The super admin can also use **any regular workspace-scoped endpoint** by setting `wid` in their JWT to the target workspace (via `/auth/switch-workspace` which skips membership check for super admins). This lets them browse any workspace's dashboard as if they were a member.

Register all three new routers in `backend/app/main.py`.

---

## Phase 3: Tenant-Scope Existing Endpoints (Backend)

### Router Modifications (all 7 existing routers)

Every endpoint gets:
1. **Auth dependency** — inject `workspace_id = Depends(get_workspace_id)` (read endpoints need `member`+, mutations need `admin`+)
2. **Workspace filter** — every `select()` gets `.where(Model.workspace_id == workspace_id)`, every INSERT sets `workspace_id`

Specific changes:
- **`servers.py`**: Filter list, verify ownership on get/update/delete, set workspace_id on create
- **`health.py`**: Filter checks and summary by workspace_id
- **`tool_calls.py`**: Filter list, verify server belongs to workspace on ingestion
- **`alerts.py`**: Filter rules and events by workspace_id
- **`analytics.py`**: Filter all 4 endpoints by workspace_id
- **`proxy.py`**: Use `get_workspace_from_any_auth` (JWT or API key), verify server belongs to workspace, set workspace_id on ToolCall
- **`admin.py`**: Dual auth — JWT passes workspace_id to agent (UI trigger), cron_secret runs all workspaces

### Agent Changes

All 3 agents get an optional `workspace_id: UUID | None` parameter:
- **`health_prober.py`**: `run_probe_all(db, workspace_id=None)` — filter servers by workspace, set workspace_id on HealthCheck, include workspace_id in Redis publish payload
- **`alert_evaluator.py`**: `run_evaluate_alerts(db, workspace_id=None)` — filter rules by workspace, set workspace_id on AlertEvent
- **`analytics_aggregator.py`**: `run_aggregate_analytics(db, workspace_id=None)` — filter tool_calls by workspace, set workspace_id on snapshots

When `workspace_id=None` (cron), query distinct workspace_ids from `mcp_servers` and loop.

### Redis Changes
- **Cache keys**: `analytics:{workspace_id}:top_tools:{limit}:{hours}` (prefix with workspace_id)
- **Pub/Sub channels**: `mcphub:dashboard:{workspace_id}` (workspace-scoped)

### WebSocket Changes (`websocket.py`)
- Parse `token` query param on connect: `ws://host/ws/dashboard?token=<jwt>`
- Decode JWT, extract `wid`, subscribe to `mcphub:dashboard:{wid}`
- Reject unauthenticated connections (close code 4001)

---

## Phase 4: Frontend Auth

### New Types (`frontend/src/lib/types.ts`)
```ts
User { id, email, display_name, created_at }
Workspace { id, name, slug, created_at }
WorkspaceMember { id, user_id, workspace_id, role, user_email, user_display_name, joined_at }
WorkspaceInvite { id, email, role, expires_at, accepted_at, created_at }
ApiKey { id, name, key_prefix, created_at, last_used_at, expires_at }
TokenResponse { access_token, refresh_token, token_type }
```

### Auth State: `frontend/src/lib/auth.ts`
- `AuthProvider` React context wrapping the app
- `useAuth()` hook → `{ user, workspace, workspaces, isSuperAdmin, login, signup, logout, switchWorkspace, isAuthenticated }`
- Tokens stored in memory (access) + localStorage (refresh)
- Auto-refresh on 401 responses
- `switchWorkspace(id)` → calls `/auth/switch-workspace`, clears TanStack Query cache, reconnects WebSocket

### API Client Changes (`frontend/src/lib/api.ts`)
- `apiFetch` injects `Authorization: Bearer <accessToken>` on every request
- On 401: attempt refresh → retry; if refresh fails → redirect to `/login`
- Skip auth injection when `isDemoMode()`

### New Pages
- **`/login`** — email/password form, "Try Demo" button, link to signup
- **`/signup`** — email, display name, password form → auto-redirects to dashboard
- **`/invite/[token]`** — accept invite (redirects to login if unauthenticated)

### New Components
- **`LoginForm.tsx`**, **`SignupForm.tsx`** — auth forms with validation
- **`WorkspaceSwitcher.tsx`** — dropdown in sidebar header, lists workspaces, switch action
- **`UserMenu.tsx`** — dropdown in sidebar footer, user info + logout

### Layout Changes
- **`providers.tsx`**: Wrap with `AuthProvider`
- **`LayoutShell.tsx`**: Auth gate — unauthenticated users redirected to `/login` (except `/`, `/login`, `/signup`, `/invite/*`)
- **`Sidebar.tsx`**: Add `WorkspaceSwitcher` in header area, `UserMenu` in footer, conditional "Settings" and "Admin" nav items

### WebSocket Changes (`websocket.ts`)
- Pass token as query param: `new WebSocket(\`${WS_URL}?token=${accessToken}\`)`
- Reconnect on workspace switch

### Demo Mode Compatibility
- `apiFetch`: Skip auth headers when `isDemoMode()`
- `AuthProvider`: Provide mock demo user/workspace when demo mode active
- `LayoutShell`: Skip auth redirect in demo mode
- Login/signup pages: "Try Demo" button activates demo mode
- `demo-data.ts`: Add `DEMO_USER` and `DEMO_WORKSPACE` objects

---

## Phase 5: Frontend Workspace UI (Level 2 — Workspace Admin/Owner)

This phase builds the **workspace-level management** page (`/settings`), visible only to users with `admin` or `owner` role in the current workspace. This is **distinct** from the super admin `/admin` section (Phase 5b).

### `/settings` page — Workspace Management
Accessible via "Settings" nav item in sidebar (hidden for `member` role). Tabs:

- **General tab**: Workspace name, slug editor. Danger zone: delete workspace (owner only, with confirmation modal).
- **Members tab**: Table of workspace members (email, display name, role badge, joined date). Actions:
  - Invite button → opens `InviteForm` (email + role selector)
  - Role dropdown (owner only) → change member to admin/member
  - Remove button (admin+ can remove members, owner can remove anyone)
- **Invites tab**: Pending invitations table (email, role, invited by, expires at). Revoke button.
- **API Keys tab**: Table of API keys (name, prefix, created by, last used, expires). Create button → modal (name, optional expiry) → shows raw key once. Revoke button.

### Sidebar Changes
- `WorkspaceSwitcher` in sidebar header — dropdown listing all workspaces the user belongs to, click to switch
- `UserMenu` in sidebar footer — user avatar/initial, display name, logout button
- "Settings" nav item — visible only when user's role in current workspace is `admin` or `owner`

### New Components
- **`src/components/workspace/WorkspaceGeneralSettings.tsx`** — name/slug form + danger zone
- **`src/components/workspace/MemberList.tsx`** — members table with role management
- **`src/components/workspace/InviteForm.tsx`** — email + role invite form
- **`src/components/workspace/PendingInvites.tsx`** — invites table with revoke
- **`src/components/workspace/ApiKeyManager.tsx`** — API key table + create/revoke

---

## Phase 5b: Super Admin Dashboard (Level 3 — Platform-Wide Management)

### New Page: `/admin`
A completely **separate** admin area for **platform super admins only**. Not to be confused with the workspace-level `/settings` page (Phase 5). The Sidebar conditionally shows an "Admin" nav item (shield icon) only when `user.is_superadmin` is true.

**`/admin` page** — Platform Overview:
- **Stats row**: Total users, total workspaces, total servers, total tool calls (all-time), active alerts
- **Workspaces table**: All workspaces — name, slug, member count, server count, last activity, created date. Click → `/admin/workspaces/{id}`
- **Users table**: All users — email, display name, workspace count, is_superadmin badge, is_active toggle, created date. Click → `/admin/users/{id}`
- **Global activity feed**: Recent tool calls and alert events across all workspaces

**`/admin/workspaces/[id]` page** — Workspace Deep Dive:
- Workspace details (name, slug, created)
- Members list with roles
- Servers list with health status
- Recent tool calls and alerts for this workspace
- "Impersonate" button → switches into that workspace context to see exactly what members see
- Delete workspace button (with confirmation)

**`/admin/users/[id]` page** — User Deep Dive:
- User details (email, display name, created, last login)
- List of workspace memberships with role in each
- Toggle `is_active` (disable/enable account)
- Toggle `is_superadmin` (promote/demote)
- "Impersonate" button → generates a token as that user for debugging
- Delete user button (with confirmation)

### New Components
- **`src/components/admin/PlatformStatsCards.tsx`** — platform-wide metrics
- **`src/components/admin/AllWorkspacesTable.tsx`** — sortable/filterable table of all workspaces
- **`src/components/admin/AllUsersTable.tsx`** — sortable/filterable table of all users
- **`src/components/admin/GlobalActivityFeed.tsx`** — cross-workspace event stream
- **`src/components/admin/WorkspaceDetail.tsx`** — full workspace view for admin
- **`src/components/admin/UserDetail.tsx`** — full user view for admin

### Auth Guard
- The `/admin/*` routes check `user.is_superadmin` — non-superadmins get a 403 page or redirect
- `useAuth()` exposes `isSuperAdmin` boolean
- Sidebar conditionally renders the Admin nav item

---

## Phase 6: Testing + Polish

### Backend Tests
- Auth flow: signup, login, refresh, invalid credentials, expired tokens
- RBAC: member can't delete servers, admin can, owner can delete workspace
- Tenant isolation: server in workspace A invisible from workspace B
- API keys: create, authenticate, revoke
- Invites: create, accept, expired rejection
- Agents: probing workspace A only produces workspace A health checks
- Super admin: can list all workspaces, access any workspace's data, impersonate users
- Super admin: non-superadmin gets 403 on `/admin/*` endpoints
- Super admin: can toggle is_active and is_superadmin on users

### Frontend E2E (Playwright)
- Login/signup flow
- Workspace creation and switching
- Invite acceptance
- Tenant isolation (two workspaces, verify data separation)
- Demo mode still works without auth
- Super admin: `/admin` page loads with platform stats, workspaces table, users table
- Super admin: can navigate to workspace detail and user detail pages

---

## Key Files to Modify

| File | Change |
|---|---|
| `backend/requirements.txt` | Add passlib, python-jose |
| `backend/app/config.py` | Add JWT settings + superadmin_emails |
| `backend/app/main.py` | Register auth, workspaces, superadmin routers |
| `backend/app/models/server.py` | Add workspace_id FK |
| `backend/app/models/health_check.py` | Add workspace_id FK |
| `backend/app/models/tool_call.py` | Add workspace_id FK |
| `backend/app/models/alert.py` | Add workspace_id FK to AlertRule + AlertEvent |
| `backend/app/models/analytics.py` | Add workspace_id FK |
| `backend/app/routers/servers.py` | Add auth deps + workspace filter |
| `backend/app/routers/health.py` | Add auth deps + workspace filter |
| `backend/app/routers/tool_calls.py` | Add auth deps + workspace filter |
| `backend/app/routers/alerts.py` | Add auth deps + workspace filter |
| `backend/app/routers/analytics.py` | Add auth deps + workspace filter + cache key prefix |
| `backend/app/routers/proxy.py` | Add JWT/API key auth + workspace filter |
| `backend/app/routers/admin.py` | Dual auth (JWT or cron) + workspace param |
| `backend/app/routers/websocket.py` | Token auth + workspace-scoped channel |
| `backend/app/agents/health_prober.py` | Optional workspace_id param + scoped publish |
| `backend/app/agents/alert_evaluator.py` | Optional workspace_id param |
| `backend/app/agents/analytics_aggregator.py` | Optional workspace_id param |
| `frontend/src/lib/types.ts` | Add User, Workspace, member/invite/api-key types |
| `frontend/src/lib/api.ts` | Auth header injection + 401 refresh |
| `frontend/src/lib/hooks.ts` | Workspace-scoped hooks |
| `frontend/src/lib/demo-mode.ts` | Demo user/workspace mock |
| `frontend/src/lib/demo-data.ts` | Add DEMO_USER, DEMO_WORKSPACE |
| `frontend/src/app/providers.tsx` | Wrap with AuthProvider |
| `frontend/src/components/layout/Sidebar.tsx` | WorkspaceSwitcher + UserMenu + conditional nav |
| `frontend/src/components/layout/LayoutShell.tsx` | Auth gate |

## New Files to Create

| File | Purpose |
|---|---|
| `backend/app/models/user.py` | User ORM model |
| `backend/app/models/workspace.py` | Workspace, Member, Invite, ApiKey models |
| `backend/app/schemas/auth.py` | Auth request/response schemas |
| `backend/app/schemas/workspace.py` | Workspace management schemas |
| `backend/app/schemas/superadmin.py` | Super admin response schemas |
| `backend/app/utils/security.py` | Password hashing + JWT utilities |
| `backend/app/dependencies/auth.py` | FastAPI auth dependencies |
| `backend/app/routers/auth.py` | Auth endpoints |
| `backend/app/routers/workspaces.py` | Workspace management endpoints |
| `backend/app/routers/superadmin.py` | Super admin cross-workspace endpoints |
| `backend/alembic/versions/0002_multi_tenant.py` | Migration with default workspace backfill |
| `frontend/src/lib/auth.ts` | AuthProvider + useAuth hook |
| `frontend/src/app/login/page.tsx` | Login page |
| `frontend/src/app/signup/page.tsx` | Signup page |
| `frontend/src/app/invite/[token]/page.tsx` | Invite acceptance page |
| `frontend/src/app/settings/page.tsx` | Workspace settings page (L2) |
| `frontend/src/app/admin/page.tsx` | Super admin overview page (L3) |
| `frontend/src/app/admin/workspaces/[id]/page.tsx` | Admin workspace deep dive |
| `frontend/src/app/admin/users/[id]/page.tsx` | Admin user deep dive |
| `frontend/src/components/auth/LoginForm.tsx` | Login form |
| `frontend/src/components/auth/SignupForm.tsx` | Signup form |
| `frontend/src/components/layout/WorkspaceSwitcher.tsx` | Workspace dropdown |
| `frontend/src/components/layout/UserMenu.tsx` | User dropdown + logout |
| `frontend/src/components/workspace/WorkspaceGeneralSettings.tsx` | Name/slug form + danger zone |
| `frontend/src/components/workspace/MemberList.tsx` | Members table with role management |
| `frontend/src/components/workspace/InviteForm.tsx` | Email + role invite form |
| `frontend/src/components/workspace/PendingInvites.tsx` | Pending invites table with revoke |
| `frontend/src/components/workspace/ApiKeyManager.tsx` | API key table + create/revoke |
| `frontend/src/components/admin/PlatformStatsCards.tsx` | Platform-wide metrics |
| `frontend/src/components/admin/AllWorkspacesTable.tsx` | All workspaces table |
| `frontend/src/components/admin/AllUsersTable.tsx` | All users table |
| `frontend/src/components/admin/GlobalActivityFeed.tsx` | Cross-workspace events |
| `frontend/src/components/admin/WorkspaceDetail.tsx` | Admin workspace view |
| `frontend/src/components/admin/UserDetail.tsx` | Admin user view |

---

## Verification

1. **Backend**: `docker-compose up` → run migration → test auth endpoints with curl (signup, login, create workspace, CRUD servers scoped to workspace)
2. **Tenant isolation**: Create 2 users in 2 workspaces → verify user A cannot see user B's servers via API
3. **API keys**: Generate key → use in `X-API-Key` header to proxy a tool call → verify logged with correct workspace
4. **Frontend**: Login → verify dashboard only shows workspace data → switch workspace → verify data changes → demo mode still works
5. **WebSocket**: Open 2 browser tabs with different workspaces → probe in workspace A → only tab A gets the event
6. **Existing tests**: Update and verify all pass with workspace context
7. **Super admin**: Login as super admin → `/admin` shows all workspaces/users → switch into any workspace → see their data → impersonate a user
