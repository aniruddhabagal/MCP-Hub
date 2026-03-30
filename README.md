# MCPHub

> The ops layer your MCP infrastructure is missing.

MCPHub is a central control plane for teams running multiple MCP servers — think Grafana for your MCP layer. Register servers, monitor health, audit every tool call, visualize usage analytics, set threshold-based alerts, and test tools interactively — all in one place, with full multi-tenant team support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB)](https://python.org)

---

## Why MCPHub?

MCP went from zero to ubiquitous in under a year. Teams now run 10–20 MCP servers with no visibility into which are slow, which fail silently, or which tools are called most. There's no central control plane — no equivalent of Grafana, no alerting, no audit trail. Management is entirely ad hoc.

MCPHub solves this with a single pane of glass across your entire MCP fleet.

---

## Features

- **Server Registry** — Catalog MCP servers with metadata, version, owner tags, and optional per-server auth (bearer token, API key, or HTTP basic)
- **Health Monitoring** — On-demand probes with latency tracking, error rate history, and uptime calendars
- **Transparent Proxy** — Route MCP clients through MCPHub's proxy endpoint. Every tool call is intercepted and logged — zero changes to existing servers
- **Tool Playground** — Dynamically fetch a server's tool list, browse schemas, and invoke any tool interactively. Results are logged to the audit trail
- **Usage Analytics** — Top tools by call count, latency histograms, error rates, volume heatmap
- **Alert System** — Threshold-based rules on latency, error rate, or availability with Slack and webhook delivery
- **Real-Time Dashboard** — WebSocket push for live server status dots and alert toasts
- **Multi-Tenant Workspaces** — Owner / admin / member roles, email invitations, API keys, workspace switcher
- **Demo Mode** — Full offline experience on rich mock data — no backend required

---

## Quick Start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

```bash
git clone https://github.com/aniruddhabagal/MCP-Hub.git
cd MCP-Hub
cp .env.example .env        # fill in DATABASE_URL, REDIS_URL, JWT_SECRET_KEY
docker-compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1 |
| Swagger docs | http://localhost:8000/docs |

Sign up at `/signup` — a personal workspace is created automatically.

> **No backend?** Click **Try demo mode** on the login page — the full UI runs offline on rich mock data.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Recharts, TanStack Query |
| Animations | GSAP + ScrollTrigger, Lenis smooth scroll |
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| Auth | Custom JWT (access + refresh), API key auth — no third-party auth services |
| Database | PostgreSQL 16 via [Neon](https://neon.tech) |
| Cache / Queue | Redis via [Upstash](https://upstash.com) |
| Deployment | [Vercel](https://vercel.com) (frontend + backend), Neon, Upstash |
| Tests | Playwright E2E, pytest |

---

## Documentation

Full documentation is available at `/docs` in the running app.

For local development setup, deployment instructions, architecture deep-dives, and contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Deployment

1. **[Neon](https://neon.tech)** — Create a project, copy the pooled asyncpg connection string
2. **[Upstash](https://upstash.com)** — Create a Redis database, copy the `rediss://` URL
3. **Vercel (Backend)** — Import repo, set root to `backend/`, add env vars, deploy
4. **Vercel (Frontend)** — Import repo, set root to `frontend/`, set `NEXT_PUBLIC_API_URL`, deploy

---

## Roadmap

- [x] Server registry + health monitoring
- [x] Transparent MCP proxy + full audit log
- [x] Analytics — top tools, latency, error rates, heatmap
- [x] Alert system with Slack/webhook delivery
- [x] Real-time WebSocket dashboard
- [x] Demo mode — offline with full mock data
- [x] Multi-tenant workspaces with role-based access control
- [x] Custom JWT auth with refresh token flow
- [x] Per-server auth configuration
- [x] Tool Playground — interactive tool discovery and invocation
- [x] Documentation site (Fumadocs)
- [ ] MCP server auto-discovery (local network / Docker)
- [ ] Token cost estimation per tool call
- [ ] Exportable audit reports (CSV / JSON)
- [ ] GitHub Actions integration for CI health checks

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture notes, and the pull request process.

---

## License

[MIT](LICENSE)

---

<p align="center"><em>Grafana for MCP — discovery · health · audit · analytics · multi-tenant in a single pane.</em></p>
