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
| Frontend | Next.js |
| Runtime | Node.js |
| Queue | Redis |
| Database | PostgreSQL |

**Key components:** Node.js, Redis

---

## Agent Breakdown

| Agent | Responsibility |
|---|---|
| **Server registry** | Catalog of all MCP servers with metadata, version, and owner |
| **Health prober** | Periodic pings to each server — latency, error rate, availability |
| **Tool call logger** | Intercepts and logs every tool invocation with duration and output size |
| **Usage analytics** | Which tools get called most, by which agents, at what cost |
| **Alert system** | Notifies when a server goes down or error rate spikes |

---

## Why This Is a Real Gap Right Now

The New Stack flagged MCP management as the #1 unaddressed need for 2026. You'd be building the Grafana for MCP — a gap that's wide open right now. No existing tool covers discovery + health + audit + analytics in a single pane.

---

## What Makes It Impressive

- Perfectly timed: MCP is the protocol of the moment, the tooling layer doesn't exist yet
- Clean ops architecture: registry + prober + logger is textbook platform engineering
- The health probe + alert system shows you think about reliability, not just features
- The usage analytics layer gives teams genuine cost visibility

---

## Recruiter Appeal

**Perfectly timed for 2026.** Being the person who built the management dashboard for the protocol that's now standard is a differentiated story 12 months from now. This signals platform engineering instincts, not just feature development.