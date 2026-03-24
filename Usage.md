# MCPHub Usage Guide

MCPHub is a centralized control plane for monitoring, auditing, and managing MCP (Model Context Protocol) servers across your organization. Think of it as **Grafana for your MCP layer**.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Landing Page](#landing-page)
3. [Dashboard](#dashboard)
4. [Server Registry](#server-registry)
5. [Health Monitoring](#health-monitoring)
6. [Tool Call Audit Log](#tool-call-audit-log)
7. [Analytics](#analytics)
8. [Alerts & Rules](#alerts--rules)

---

## Getting Started

### Accessing MCPHub

**Local Development:**
```bash
docker-compose up
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/v1
```

**Production:**
Visit your deployed MCPHub instance (e.g., `https://mcphub.yourdomain.com`)

### Initial Setup

1. **Open the landing page** at `/` to understand MCPHub's purpose and architecture
2. **Navigate to the Dashboard** via the navbar "Open Dashboard" button or by visiting `/dashboard`
3. **Register your first MCP server** in the Servers section

---

## Landing Page

The landing page (`/`) provides an overview of MCPHub and its core capabilities.

### What You'll See

**Hero Section**
- **Headline**: "The ops layer MCP was missing"
- **Description**: Why MCPHub exists (teams running 10–20 MCP servers with zero visibility)
- **Dashboard Preview**: A live mockup showing real-time server metrics
- **Call-to-Action**: "Open Dashboard" button to jump into monitoring

**Key Sections**
1. **The Problem** — Why MCP management is broken (zero visibility, silent failures, ad hoc management)
2. **The Agents** — Five core components that power MCPHub:
   - **Server Registry**: Catalog of all MCP servers with metadata
   - **Health Prober**: On-demand health checks (latency, error rate, availability)
   - **Tool Call Logger**: Audit log of every tool invocation
   - **Usage Analytics**: Which tools are called most, by whom, at what cost
   - **Alert System**: Notifies when servers degrade or go offline

3. **Architecture** — How MCPHub works:
   - Step 1: Register your servers
   - Step 2: Route through the proxy
   - Step 3: Monitor in real-time
   - Step 4: Get alerted on failures

### Smooth Scroll & Animations

The landing page uses **Lenis** (smooth scroll) and **GSAP** (scroll-triggered animations) for a polished experience:
- Hero content slides in with stagger timing
- Section titles wipe in from left as you scroll
- Cards fade and translate as they enter the viewport
- Ambient orb parallax effect in the hero

To use the landing page effectively:
1. **Start at the top** — Read the problem statement
2. **Scroll down** — Discover MCPHub's agents and architecture
3. **Click "Open Dashboard"** — Transition to the app after understanding the context

---

## Dashboard

The Dashboard is your command center for MCP infrastructure health.

### Dashboard Overview

**Top Navigation Bar**
- **MCPHub Logo** (left): Click to return to landing page
- **"Open Dashboard" Button** (right): Quickly jump to dashboard from any page

**Left Sidebar** (persistent across all pages)
- **Logo & Version**: MCPHub v0.1
- **Navigation Links**:
  - Dashboard
  - Servers
  - Tool Calls (audit log)
  - Analytics
  - Alerts
- **Live Status Indicator** (bottom):
  - 🟢 **Live** — Connected to real-time WebSocket
  - 🟡 **Connecting…** — Attempting connection
  - ⚫ **Offline** — No WebSocket connection

### Dashboard Metrics

**Top Stats Cards** (4 columns)
- **Total Servers**: Count of registered MCP servers
- **Healthy**: Servers with no errors
- **Tool Calls (24h)**: Total invocations in the last 24 hours
- **Avg Latency**: Mean response time across all servers

**Health Overview Chart**
- Visual timeline of server health over the last 24 hours
- Color-coded: 🟢 healthy, 🟡 warning, 🔴 error

**Recent Alerts** (last 10 fired alerts)
- Alert name, server, time fired, current status
- Click to jump to the Alerts page for details

**Top Tools Widget** (most called tools in 24h)
- Bar chart ranking tools by call count
- Hover for exact numbers

---

## Server Registry

### What It Is

The Server Registry is your catalog of all MCP servers connected to MCPHub.

### Accessing the Servers Page

1. Click **Servers** in the left sidebar
2. Or go directly to `/servers`

### The Server Table

Displays all registered servers with columns:
- **Server Name**: Unique identifier (e.g., `filesystem-mcp`)
- **Status**: 🟢 healthy, 🟡 warning, 🔴 error
- **Latency**: Last recorded response time (ms)
- **Tool Calls (24h)**: Invocations in the last 24 hours
- **Owner**: Registered owner/team
- **Last Probe**: Timestamp of last health check

### Registering a Server

1. Click **"+ Register Server"** button (top right)
2. Fill in the modal:
   - **Name**: Unique server identifier (e.g., `github-mcp`)
   - **Endpoint**: MCP server URL (e.g., `http://localhost:3001`)
   - **Owner**: Team or person responsible (optional)
   - **Tags**: CSV tags for organization (optional, e.g., `github,api,tools`)
3. Click **Register**

The server is now added to the registry and ready for monitoring.

### Viewing Server Details

1. Click on a server name in the table
2. You'll be taken to the **Server Detail page** (`/servers/[id]`)

#### Server Detail Page

**Health Timeline**
- Graph of health checks over the last 7 days
- Shows latency, error rate, and availability
- Hover for exact metrics at each timestamp

**Uptime Calendar**
- Visual calendar showing each day's uptime percentage
- Green = healthy, Red = errors

**Tabs**

**Tool Calls Tab**
- List of all tool invocations on this server
- Columns: Tool name, agent caller, status, latency, timestamp
- Filter by tool or date range

**Alerts Tab**
- All fired alerts for this server
- Columns: Rule name, severity, status, fired time, resolved time

---

## Health Monitoring

### Running Health Probes

MCPHub pings each server to measure health: latency, error rate, availability.

**Manual Probe**
1. Go to the **Servers** page
2. Click **"Run Probes"** button (dashboard top right)
3. MCPHub will immediately ping all registered servers
4. Results appear in the **Health Summary** after ~5 seconds

**Automatic Probes**
- In production, probes run daily at 2 AM UTC (configurable via `VERCEL_CRON_SCHEDULE`)
- In development, probes are on-demand only

### Viewing Health Checks

1. Go to **Servers** → Click a server
2. View the **Health Timeline** chart
3. Hover over data points for exact metrics:
   - **Latency (ms)**: Response time
   - **Status**: healthy, warning, error
   - **Error Rate**: % of failed calls in that period

---

## Tool Call Audit Log

### What It Is

The Tool Call log is a complete audit trail of every tool invocation routed through MCPHub's proxy.

### Accessing Tool Calls

1. Click **Tool Calls** in the left sidebar
2. Or go directly to `/tools`

### The Tool Call Table

Columns:
- **Tool Name**: Which tool was called (e.g., `read_file`)
- **Server**: Which MCP server executed it
- **Agent**: Who called it (e.g., Claude, external service)
- **Status**: ✓ success, ✗ error
- **Latency**: Execution time (ms)
- **Output Size**: Bytes returned
- **Timestamp**: When it happened

### Filtering & Pagination

- **Server Filter**: Show calls for a specific server only
- **Tool Filter**: Show calls to a specific tool only
- **Status Filter**: Show only successful or failed calls
- **Pagination**: Navigate through large result sets (50 per page)

### Viewing Tool Call Details

1. Click on a row in the table
2. A drawer opens with full details:
   - **Request**: The parameters passed to the tool
   - **Response**: The full output
   - **Error** (if failed): The error message
   - **Metadata**: Server, agent, latency, timestamp

---

## Analytics

### Accessing Analytics

1. Click **Analytics** in the left sidebar
2. Or go directly to `/analytics`

### Widgets & Charts

**Top Tools Chart** (bar chart)
- Shows which tools are called most frequently
- X-axis: call count, Y-axis: tool names
- Useful for understanding usage patterns

**Latency Histogram** (horizontal bar chart)
- Top 15 slowest server/tool combinations
- Ranked by average latency (ms)
- Hover to see p95 latency and call count

**Error Rates Chart** (line chart)
- Percentage of failed calls per server over the last 24 hours
- Spike = increased error rate on that server

**Usage Heatmap** (calendar grid)
- Shows call volume for each hour over the last 24 hours
- Darker = more calls
- Useful for identifying peak usage times

### Interpreting Analytics

**High Latency?**
- Check server health (may be overloaded)
- Consider scaling that MCP server
- Review recent tool call logs for errors

**Spike in Errors?**
- Check server status (may be down)
- Review recent alerts
- Check server logs for application errors

**Uneven Usage?**
- Use heatmap to identify peak hours
- Schedule batch operations during off-peak times

---

## Alerts & Rules

### What Are Alerts?

Alerts are automated notifications when your MCP infrastructure degrades:
- Server goes down (latency spike, high error rate)
- Specific error threshold is exceeded
- Tool call volume unexpectedly increases

### Accessing Alerts

1. Click **Alerts** in the left sidebar
2. Or go directly to `/alerts`

### Creating an Alert Rule

1. Click **"+ New Rule"** button
2. Fill in the form:
   - **Rule Name**: Human-readable name (e.g., `High Latency on GitHub MCP`)
   - **Server**: Which server to monitor (or "All")
   - **Condition Type**:
     - `error_rate_exceeds`: % of failed calls
     - `latency_exceeds_ms`: Response time
     - `is_down`: Server unreachable
   - **Threshold**: Value that triggers the alert
   - **Window**: Time period to evaluate (e.g., 5 minutes)
   - **Severity**: `critical`, `warning`, `info`
   - **Notification**: Where to send alerts:
     - Slack webhook (e.g., `https://hooks.slack.com/...`)
     - Generic HTTP webhook (POST JSON)
3. Click **Create Rule**

### Viewing Active Alerts

**Alert History Table**
- Shows all fired alerts (past and current)
- Columns: Rule name, server, severity, fired time, status, resolved time

**Alert Status**
- 🔴 **Firing**: Alert condition is currently true
- 🟢 **Resolved**: Condition cleared, alert is no longer active

### Managing Rules

**Edit a Rule**
1. Go to **Alerts** page
2. Click **"Edit"** on a rule
3. Modify conditions, threshold, notifications
4. Click **Save**

**Delete a Rule**
1. Click **"Delete"** on a rule
2. Confirm deletion

---

## Best Practices

### Server Organization

- **Use descriptive names**: `github-mcp`, not `server1`
- **Assign owners**: Clarify who is responsible for each server
- **Tag by function**: `api`, `data`, `tools` help with filtering

### Health Monitoring

- **Run probes regularly**: At least daily in production
- **Watch latency trends**: Sudden increases indicate load issues
- **Set error rate alerts**: Catch degradation before it impacts users

### Tool Call Auditing

- **Review regularly**: Spot unusual usage patterns
- **Filter by agent**: Understand which tools each agent uses most
- **Check error logs**: Failed calls should be investigated

### Alert Configuration

- **Start conservative**: Use loose thresholds, tighten over time
- **Route to right team**: Slack/webhook should go to the owner
- **Document rules**: Include context in rule names (e.g., `High Latency on GitHub MCP (>1000ms)`)

### Analytics Interpretation

- **Weekly review**: Check top tools, error trends, usage heatmap
- **Capacity planning**: Use latency and volume data to forecast resource needs
- **Baseline establishment**: Track metrics for 2+ weeks to establish normal ranges

---

## Troubleshooting

### Content Vanishes on Page Load

**Symptom**: Page loads, then content becomes invisible except for the navbar.

**Cause**: GSAP animations fail due to dynamic import issues.

**Fix**:
- Clear browser cache and reload
- Check browser console for errors
- Ensure JavaScript is enabled

### WebSocket Connection Fails

**Symptom**: Navbar shows "Offline" status indicator.

**Cause**: Backend WebSocket endpoint unreachable.

**Fix**:
- Check backend is running: `docker-compose logs backend`
- Verify `ALLOWED_ORIGINS` includes your frontend domain
- Check browser network tab for failed WebSocket upgrade

### Probes Not Running

**Symptom**: "Run Probes" button does nothing, health checks don't update.

**Cause**: Backend endpoint unreachable or database error.

**Fix**:
- Check backend logs: `docker-compose logs backend | grep probe`
- Verify database is running: `docker-compose logs postgres`
- Restart containers: `docker-compose down && docker-compose up`

### Missing Tool Calls in Audit Log

**Symptom**: Invoke a tool through an MCP server, but it doesn't appear in the audit log.

**Cause**: Tool calls are routed directly to the MCP server, not through MCPHub's proxy.

**Fix**:
- Ensure your MCP client is pointed at the proxy endpoint: `/api/v1/proxy/{server_id}/mcp`
- Or use direct ingestion: POST to `/api/v1/tool-calls` with the tool call details

---

## API Endpoints Reference

All endpoints are under `/api/v1`:

### Servers
- `GET /servers` — List all servers
- `POST /servers` — Register new server
- `GET /servers/{id}` — Get server details
- `PATCH /servers/{id}` — Update server
- `DELETE /servers/{id}` — Remove server

### Health
- `GET /health/checks` — Query health check history
- `GET /health/summary` — Uptime stats

### Tool Calls
- `GET /tool-calls` — Query audit log (paginated)
- `POST /tool-calls` — Ingest a tool call directly
- `POST /api/v1/proxy/{server_id}/mcp` — Proxy endpoint for MCP servers

### Analytics
- `GET /analytics/top-tools` — Top tools by call count
- `GET /analytics/error-rates` — Error rate trends
- `GET /analytics/latency` — Latency stats
- `GET /analytics/volume` — Call volume heatmap

### Alerts
- `GET /alerts/rules` — List alert rules
- `POST /alerts/rules` — Create new rule
- `PATCH /alerts/rules/{id}` — Update rule
- `DELETE /alerts/rules/{id}` — Delete rule
- `GET /alerts/events` — Query fired alerts (history)

### Admin (On-Demand Triggers)
- `POST /admin/probe-all` — Run health probes on all servers
- `POST /admin/evaluate-alerts` — Evaluate all alert rules

### Real-Time
- `WS /ws/dashboard` — WebSocket for live updates

---

## Architecture Overview

```
┌─────────────────────────────┐
│   MCP Client (Claude, etc)  │
└──────────────┬──────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  MCPHub Proxy Layer  │
    │ /api/v1/proxy/{id}   │
    └──────────┬───────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌──────────┐        ┌──────────┐
│ MCP Srv  │        │ MCP Srv  │
│ (GitHub) │        │ (FS)     │
└──────────┘        └──────────┘

    ┌──────────────────────────────┐
    │    MCPHub Backend            │
    │ ┌────────────────────────┐  │
    │ │ Health Prober          │  │
    │ │ Tool Call Logger       │  │
    │ │ Alert Evaluator        │  │
    │ │ Analytics Aggregator   │  │
    │ └────────────────────────┘  │
    └──────────────┬───────────────┘
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
┌──────────────┐          ┌──────────────┐
│ PostgreSQL   │          │    Redis     │
│ (Audit Log)  │          │ (Cache/Pub)  │
└──────────────┘          └──────────────┘
    ▲                             ▲
    │                             │
    └──────────────┬──────────────┘
                   │
            ┌──────▼────────┐
            │  Next.js      │
            │  Frontend     │
            │  (Dashboard)  │
            └───────────────┘
```

---

## What's Next?

- **Deploy to production**: Use Vercel, Neon, and Upstash (see README)
- **Integrate with your infrastructure**: Point MCP clients at MCPHub's proxy
- **Set up alerts**: Configure Slack webhooks for critical servers
- **Monitor regularly**: Check analytics and alerts weekly

Happy monitoring! 🚀
