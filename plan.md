# Plan: Add `/docs` Section to MCPHub Frontend

## Context

MCPHub has no user-facing documentation. The primary audience is teams already running MCP servers across multiple products who need a central ops layer. The docs should answer: **"I have MCP servers — how do I integrate MCPHub into my workflow?"**

**Library: [Fumadocs](https://fumadocs.dev)** — Next.js 14 App Router native, MDX content, shadcn/ui theming, built-in search/sidebar/syntax highlighting. `cssPrefix: 'fd-'` avoids CSS variable collisions.

No super admin docs — that's internal only.

---

## Phase 1: Infrastructure (Steps 1–4)

### Step 1 — Install packages

```bash
cd frontend && npm install fumadocs-core fumadocs-mdx fumadocs-ui
```

### Step 2 — Create `frontend/source.config.ts` (NEW)

Root-level Fumadocs MDX config pointing at `content/docs`.

### Step 3 — Modify `frontend/next.config.js`

Wrap with `createMDX()` from `fumadocs-mdx/next`. Preserve `output: 'standalone'`.

### Step 4 — Modify `frontend/tailwind.config.ts`

- Add `'./content/**/*.mdx'` and `'./node_modules/fumadocs-ui/dist/**/*.js'` to `content`
- Add Fumadocs preset with `cssPrefix: 'fd-'`

---

## Phase 2: Routing & Layout (Steps 5–9)

### Step 5 — Create `frontend/src/lib/docs-source.ts` (NEW)

Docs source loader using `fumadocs-core/source` + `fumadocs-mdx`.

### Step 6 — Create `frontend/src/app/docs/docs-theme.css` (NEW)

Map MCPHub's dark theme HSL values into `fd-`-prefixed CSS variables.

### Step 7 — Create `frontend/src/app/docs/layout.tsx` (NEW)

Fumadocs `DocsLayout` with sidebar tree. Imports `fumadocs-ui/style.css` + theme CSS.

### Step 8 — Create `frontend/src/app/docs/[[...slug]]/page.tsx` (NEW)

Catch-all MDX renderer with `generateStaticParams` and `generateMetadata`.

### Step 9 — Create `frontend/src/app/api/search/route.ts` (NEW)

Fumadocs built-in full-text search endpoint.

---

## Phase 3: Integration (Steps 10–12)

### Step 10 — Modify `frontend/src/components/layout/LayoutShell.tsx`

Add `'/docs'` to `PUBLIC_ROUTES` (line 12).

### Step 11 — Modify `frontend/src/components/landing/LandingPage.tsx`

Add "Docs" link in navbar.

### Step 12 — Modify `frontend/src/components/layout/Sidebar.tsx`

Add "Docs" link with `BookOpen` icon.

---

## Phase 4: Content (Step 13)

### Docs content structure

The hierarchy is **integration-first** — leading with "how do I use this with my existing MCP servers" before diving into individual features.

```
content/docs/
├── index.mdx                              # Welcome — what MCPHub is, who it's for
├── meta.json                              # Root sidebar order
│
├── getting-started/                       ── "I have MCP servers, now what?"
│   ├── meta.json
│   ├── index.mdx                          # Quick start overview (5-min setup)
│   ├── sign-up-and-workspace.mdx          # Sign up → personal workspace created
│   └── registering-servers.mdx            # Add your existing MCP server endpoints
│
├── integration/                           ── THE CORE SECTION
│   ├── meta.json
│   ├── index.mdx                          # Integration overview — why proxy, what changes
│   ├── proxy-setup.mdx                    # Point MCP clients to /proxy/{id}/mcp
│   │                                      #   - Before/after diagram
│   │                                      #   - Example: Claude Desktop config change
│   │                                      #   - Example: custom agent HTTP client change
│   │                                      #   - Zero changes on server side
│   ├── per-server-auth.mdx                # Configure auth if your MCP servers require it
│   │                                      #   - Bearer token, API key header, HTTP basic
│   │                                      #   - Credentials masked in UI, forwarded by proxy
│   ├── multiple-products.mdx              # Managing servers across products/teams
│   │                                      #   - Workspace per product/team
│   │                                      #   - Invite team members with roles
│   │                                      #   - Workspace isolation (data never leaks)
│   ├── api-key-access.mdx                 # Programmatic access via X-API-Key header
│   │                                      #   - Create API keys in settings
│   │                                      #   - Use in CI/CD, scripts, external agents
│   │                                      #   - Proxy auth: JWT vs API key
│   └── direct-ingestion.mdx               # POST /tool-calls for agents not using proxy
│                                           #   - When to use direct ingestion
│                                           #   - Request schema + example
│                                           #   - Still gets full audit trail
│
├── workspaces/                            ── Team management
│   ├── meta.json
│   ├── index.mdx                          # Workspaces overview
│   ├── personal-vs-org.mdx                # Personal workspace vs org workspaces
│   ├── roles-and-permissions.mdx          # Member (read-only) / Admin / Owner
│   ├── inviting-members.mdx              # Email invites, accept flow
│   └── api-keys.mdx                       # Create, revoke, expiration, usage
│
├── monitoring/                            ── Health & visibility
│   ├── meta.json
│   ├── index.mdx                          # Monitoring overview
│   ├── health-probes.mdx                  # On-demand probes, probe all, how status is determined
│   ├── health-timeline.mdx                # Timeline + uptime calendar visualizations
│   └── real-time-dashboard.mdx            # WebSocket live updates, status dots, system panel
│
├── tool-playground/                       ── Interactive testing
│   ├── meta.json
│   ├── index.mdx                          # Playground overview — discover & test tools
│   ├── discovering-tools.mdx              # tools/list, caching, refresh
│   └── invoking-tools.mdx                 # Form mode, raw JSON, results, audit link
│
├── analytics/                             ── Usage insights
│   ├── meta.json
│   ├── index.mdx                          # Analytics overview
│   ├── top-tools-and-volume.mdx           # Top tools chart, usage heatmap
│   ├── errors-and-latency.mdx             # Error rates, p95 latency histogram
│   └── how-aggregation-works.mdx          # Hourly snapshots, daily cron
│
├── alerts/                                ── Alerting
│   ├── meta.json
│   ├── index.mdx                          # Alerts overview
│   ├── creating-rules.mdx                 # Metrics, operators, thresholds, windows
│   ├── alert-events.mdx                   # Fired/resolved history
│   └── notifications.mdx                  # Slack webhook + generic HTTP webhook setup
│
├── audit-log/                             ── Tool call history
│   ├── meta.json
│   ├── index.mdx                          # Audit log overview — what's captured, why
│   ├── browsing-and-filtering.mdx         # Filters, pagination, detail drawer
│   └── log-schema.mdx                     # Fields: tool_name, caller_agent, duration, etc.
│
└── api-reference/                         ── REST API
    ├── meta.json
    ├── index.mdx                          # API overview, base URL, auth methods (JWT + API key)
    ├── auth-endpoints.mdx                 # /auth/* (signup, login, refresh, me, switch-workspace)
    ├── workspace-endpoints.mdx            # /workspaces/* (CRUD, members, invites, API keys)
    ├── server-endpoints.mdx               # /servers/* (CRUD, probe)
    ├── health-endpoints.mdx               # /health/* (checks, summary)
    ├── proxy-endpoint.mdx                 # POST /proxy/{server_id}/mcp
    ├── tool-call-endpoints.mdx            # /tool-calls (list, direct ingestion)
    ├── playground-endpoints.mdx           # /servers/{id}/tools/* (list, invoke, cache)
    ├── analytics-endpoints.mdx            # /analytics/* (top-tools, error-rates, latency, volume)
    └── alert-endpoints.mdx                # /alerts/* (rules CRUD, events list)
```

**~40 MDX pages** across 10 sidebar sections. The `integration/` section is the centerpiece.

### Root `meta.json` sidebar order

```json
{
  "title": "Documentation",
  "pages": [
    "---Getting Started---",
    "getting-started",
    "integration",
    "---Platform---",
    "workspaces",
    "monitoring",
    "tool-playground",
    "analytics",
    "alerts",
    "audit-log",
    "---Reference---",
    "api-reference"
  ]
}
```

---

## Files Summary

### New files (8 infra + ~54 content)

| File | Purpose |
|------|---------|
| `frontend/source.config.ts` | Fumadocs MDX config |
| `frontend/src/lib/docs-source.ts` | Docs source loader |
| `frontend/src/app/docs/layout.tsx` | Docs layout with sidebar |
| `frontend/src/app/docs/docs-theme.css` | CSS variable overrides |
| `frontend/src/app/docs/[[...slug]]/page.tsx` | MDX page renderer |
| `frontend/src/app/api/search/route.ts` | Search API |
| `frontend/content/docs/**/*.mdx` | ~40 content pages |
| `frontend/content/docs/**/meta.json` | ~11 sidebar configs |

### Modified files (5)

| File | Change |
|------|--------|
| `frontend/next.config.js` | Wrap with `createMDX()` |
| `frontend/tailwind.config.ts` | Content paths + Fumadocs preset |
| `frontend/src/components/layout/LayoutShell.tsx` | Add `/docs` to PUBLIC_ROUTES |
| `frontend/src/components/landing/LandingPage.tsx` | Add "Docs" nav link |
| `frontend/src/components/layout/Sidebar.tsx` | Add "Docs" link |

---

## Verification

1. `npx tsc --noEmit` + `npm run lint` — pass
2. `npm run build` — MDX pages generated
3. `/docs` — overview page with sidebar
4. Click through all sections — pages load
5. Search — type keyword, results appear
6. Mobile — sidebar collapses
7. Landing page + app sidebar — "Docs" links work
8. `/docs` accessible without login
