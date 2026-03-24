# MCPHub Deployment Guide

Deploy MCPHub using three free-tier services: **Neon** (PostgreSQL), **Upstash** (Redis), and **Vercel** (backend + frontend). The backend and frontend are deployed as two separate Vercel projects from the same GitHub repository.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────────────┐ │
│  │  Frontend        │ ───► │  Backend (FastAPI)        │ │
│  │  Next.js 14      │      │  /api/v1/*               │ │
│  │  /frontend       │      │  /backend                │ │
│  └──────────────────┘      └──────────┬───────────────┘ │
│                                       │                  │
└───────────────────────────────────────┼──────────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
               ┌──────────────────┐       ┌──────────────────┐
               │  Neon            │       │  Upstash         │
               │  PostgreSQL      │       │  Redis           │
               │  (audit log, DB) │       │  (cache, pub/sub)│
               └──────────────────┘       └──────────────────┘
```

| Component | Service | Free Tier Limits |
|---|---|---|
| Frontend (Next.js) | Vercel Hobby | 100 GB bandwidth/month |
| Backend (FastAPI) | Vercel Hobby | 100 GB bandwidth, 10s function timeout |
| PostgreSQL | Neon Free | 0.5 GB storage, auto-pause after 5 min |
| Redis | Upstash Free | 10,000 requests/day, 256 MB |

> ⚠️ **WebSocket limitation**: Vercel serverless functions do not support persistent connections. The sidebar live-status dot will show "Offline" — all REST features (health probes, alerts, analytics, server registry) work fully. See the [Alternatives](#alternatives-if-you-need-websocket) section if you need live updates.

---

## Prerequisites

Before starting, you need:

- A **GitHub account** with this repository pushed to it
- A **Vercel account** — [vercel.com](https://vercel.com) (sign up with GitHub)
- A **Neon account** — [neon.tech](https://neon.tech) (sign up with GitHub)
- An **Upstash account** — [upstash.com](https://upstash.com) (sign up with GitHub)
- `openssl` available in your terminal (to generate secrets) — comes with macOS/Linux; Windows: use Git Bash

---

## Step 1 — Push the Repository to GitHub

If the repo is not on GitHub yet:

```bash
# From the repo root
git remote add origin https://github.com/YOUR_USERNAME/mcphub.git
git branch -M main
git push -u origin main
```

Confirm it's visible at `https://github.com/YOUR_USERNAME/mcphub` before continuing.

---

## Step 2 — Set Up Neon (PostgreSQL)

### 2.1 Create a Project

1. Go to [console.neon.tech](https://console.neon.tech) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `mcphub`
   - **PostgreSQL version**: `16`
   - **Region**: Choose the region closest to your users
4. Click **Create Project**

### 2.2 Get the Connection String

1. In your project dashboard, click **"Connection Details"** (top of the page)
2. In the **Connection string** dropdown:
   - Set **Connection type** to **Pooled connection** — this is required for serverless deployments. Without pooling, each serverless function invocation opens a new DB connection, quickly exhausting the limit.
   - Set the format to **psql** or **Connection string**
3. Copy the string. It looks like:
   ```
   postgresql://user:password@ep-xxxx-yyyy.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 2.3 Convert to asyncpg Format

MCPHub's backend uses SQLAlchemy with asyncpg. The connection string needs a small adjustment:

```bash
# Original Neon string:
postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require

# Change to (add +asyncpg, change sslmode= to ssl=):
postgresql+asyncpg://user:pass@ep-xxxx.neon.tech/neondb?ssl=require
```

**Save this string** — it's your `DATABASE_URL`.

> ℹ️ Neon auto-pauses the database after 5 minutes of inactivity on the free tier. The first request after a pause takes 1–2 seconds to wake up. This is normal.

---

## Step 3 — Set Up Upstash (Redis)

### 3.1 Create a Database

1. Go to [console.upstash.com](https://console.upstash.com) and sign in
2. Click **"Create Database"**
3. Fill in:
   - **Name**: `mcphub`
   - **Type**: **Redis**
   - **Region**: Match the same region as your Neon database
   - **Enable TLS**: **ON** (required for production)
4. Click **Create**

### 3.2 Get the Redis URL

1. In the database dashboard, scroll to **"Connect to your database"**
2. Click the **"Redis"** tab (not REST API)
3. Copy the **Endpoint** URL. It starts with `rediss://` (double-s means TLS):
   ```
   rediss://default:your-password@global-xxxx.upstash.io:6379
   ```

**Save this string** — it's your `REDIS_URL`.

---

## Step 4 — Generate Secrets

Run these in your terminal to generate secure random values:

```bash
# SECRET_KEY — used to sign internal tokens
openssl rand -hex 32

# CRON_SECRET — used to authorize the analytics cron job
openssl rand -hex 16
```

Save both outputs. You'll need them when setting environment variables.

---

## Step 5 — Deploy the Backend to Vercel

### 5.1 Create a New Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** and select your `mcphub` repo
3. **Before clicking Deploy**, configure the following:

### 5.2 Configure the Project

**Root Directory:**
- Click **"Edit"** next to Root Directory
- Type: `backend`
- Click **✓ Done**

**Framework Preset:** Select **Other** (not Next.js)

**Build & Output Settings:** Leave all fields blank — they're handled by `backend/vercel.json`.

### 5.3 Add Environment Variables

Click **"Environment Variables"** and add each of these:

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Your asyncpg URL from Step 2 | `postgresql+asyncpg://...` |
| `REDIS_URL` | Your Upstash URL from Step 3 | `rediss://...` |
| `SECRET_KEY` | Output of first `openssl` command | 64-char hex string |
| `APP_ENV` | `production` | |
| `ALLOWED_ORIGINS` | `*` | Temporary — you'll restrict this in Step 8 |
| `CRON_SECRET` | Output of second `openssl` command | 32-char hex string |
| `SLACK_WEBHOOK_URL` | *(optional)* Your Slack webhook URL | Leave blank if not using Slack alerts |

### 5.4 Deploy

Click **"Deploy"**. The first deployment takes ~2 minutes as Vercel installs Python dependencies and runs the build.

### 5.5 Verify the Backend

Once deployed, Vercel gives you a URL like `mcphub-backend-xxxx.vercel.app`. Test it:

```bash
# Should return {"status": "ok"}
curl https://mcphub-backend-xxxx.vercel.app/health

# Should return an empty server list (migrations ran automatically)
curl https://mcphub-backend-xxxx.vercel.app/api/v1/servers
```

If `/api/v1/servers` returns `{"servers": [], "total": 0}` (or similar), the database is connected and Alembic migrations ran successfully on startup.

**Save the backend URL** — you need it for the frontend.

---

## Step 6 — Deploy the Frontend to Vercel

### 6.1 Create Another New Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the **same GitHub repo** again (you're deploying it as a second project)

### 6.2 Configure the Project

**Root Directory:**
- Click **"Edit"** → type `frontend` → **✓ Done**

**Framework Preset:** **Next.js** (should be auto-detected)

**Build & Output Settings:** Leave as default.

### 6.3 Add Environment Variables

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://mcphub-backend-xxxx.vercel.app/api/v1` | Replace with your actual backend URL |
| `NEXT_PUBLIC_WS_URL` | `wss://mcphub-backend-xxxx.vercel.app/ws/dashboard` | WebSocket won't work on Vercel Hobby — sidebar shows "Offline", all else works |
| `NEXT_PUBLIC_CRON_SECRET` | Same value as `CRON_SECRET` in Step 5 | Used by the "Run Probes" button |

### 6.4 Deploy

Click **"Deploy"**. First build takes ~3 minutes (Next.js compilation + dependency install).

### 6.5 Verify the Frontend

Visit the URL Vercel gives you (e.g., `mcphub-frontend-xxxx.vercel.app`):
- The landing page should load and animate in
- Click **"Open Dashboard"** — the dashboard should load
- The sidebar status dot will be grey ("Offline") — expected on Vercel

**Save the frontend URL** — you need it for the next step.

---

## Step 7 — Lock Down CORS on the Backend

You temporarily set `ALLOWED_ORIGINS=*` in Step 5. Now that you have the real frontend URL, restrict it:

1. Go to your **backend Vercel project** → **Settings** → **Environment Variables**
2. Click the `ALLOWED_ORIGINS` variable → **Edit**
3. Change the value to your frontend URL:
   ```
   https://mcphub-frontend-xxxx.vercel.app
   ```
   If you plan to add a custom domain later, add both now (comma-separated):
   ```
   https://mcphub-frontend-xxxx.vercel.app,https://mcphub.yourdomain.com
   ```
4. Click **Save**
5. Go to **Deployments** → click the **⋯** menu on the latest deployment → **Redeploy** → **Redeploy** (confirm)

Wait for the redeployment to finish before proceeding.

---

## Step 8 — Verify the Full Stack End-to-End

Work through this checklist top-to-bottom:

### Backend Health
```bash
curl https://your-backend.vercel.app/health
# Expected: {"status":"ok"}
```

### Database Connected
```bash
curl https://your-backend.vercel.app/api/v1/servers
# Expected: [] or {"servers":[],"total":0}
```

### Register a Test Server
1. In the dashboard, go to **Servers** → **"+ Register Server"**
2. Fill in:
   - **Name**: `test-server`
   - **Endpoint**: `https://httpbin.org` (a real HTTP server, good for testing)
   - **Owner**: your name
3. Click **Register** — it should appear in the table

### Run Health Probes
1. Click **"Run Probes"** on the Dashboard page
2. Wait ~5 seconds, then refresh
3. The `test-server` status should update to `healthy` or `error`

### Create an Alert Rule
1. Go to **Alerts** → **"+ New Rule"**
2. Configure a rule for `test-server` with a high latency threshold
3. Click **Create** — it should appear in the rules table

### Evaluate Alerts
1. Back on the Dashboard, click **"Evaluate Alerts"** (if the button exists) or call:
   ```bash
   curl -X POST https://your-backend.vercel.app/api/v1/admin/evaluate-alerts \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
2. Check the **Alerts** page — fired alerts appear in the history table

### Analytics
Go to `/analytics` — charts may be empty until the cron runs (or you trigger it manually):
```bash
curl -X POST https://your-backend.vercel.app/api/v1/admin/aggregate-analytics \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
Refresh `/analytics` — charts should populate.

---

## Step 9 — Set Up Custom Domains (Optional)

Vercel's generated URLs are functional but ugly. To use `mcphub.yourdomain.com`:

### Frontend Custom Domain

1. Frontend Vercel project → **Settings** → **Domains**
2. Click **"Add Domain"** → type `mcphub.yourdomain.com`
3. Vercel shows the required DNS record. At your domain registrar, add:
   - **Type**: `CNAME`
   - **Name**: `mcphub` (or `@` if using the apex domain)
   - **Value**: `cname.vercel-dns.com`
4. DNS propagation takes a few minutes. Vercel auto-provisions an SSL certificate.

### Backend Custom Domain

1. Backend Vercel project → **Settings** → **Domains**
2. Add `api.mcphub.yourdomain.com`
3. Add the DNS CNAME record the same way

### Update Environment Variables After Custom Domains

Once custom domains are live:

**In the backend project**, update `ALLOWED_ORIGINS`:
```
https://mcphub.yourdomain.com
```

**In the frontend project**, update:
```
NEXT_PUBLIC_API_URL=https://api.mcphub.yourdomain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.mcphub.yourdomain.com/ws/dashboard
```

Redeploy both projects after any env var change.

---

## Step 10 — Verify the Analytics Cron

The analytics aggregation cron runs daily at **2:00 AM UTC**. Verify it's configured:

1. Go to your **backend Vercel project** → **Settings** → **Crons**
2. You should see:
   ```
   /api/v1/admin/aggregate-analytics    0 2 * * *
   ```
3. Click **"Run"** to trigger it manually — the response should be `200 OK`

The cron is authenticated via the `Authorization: Bearer CRON_SECRET` header, which Vercel sends automatically.

> ℹ️ Vercel Hobby allows only **one cron job** that runs **at most once per day**. This is sufficient for daily analytics aggregation.

---

## Environment Variables Reference

### Backend Project (set in Vercel)

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host/db?ssl=require` | Neon pooled connection string |
| `REDIS_URL` | ✅ | `rediss://default:pass@host:6379` | Upstash Redis URL with TLS |
| `SECRET_KEY` | ✅ | `a1b2c3...` (64 hex chars) | Internal signing key |
| `APP_ENV` | ✅ | `production` | Enables production settings |
| `ALLOWED_ORIGINS` | ✅ | `https://mcphub.yourdomain.com` | Frontend URL(s), comma-separated |
| `CRON_SECRET` | ✅ | `d4e5f6...` (32 hex chars) | Authorizes cron + admin endpoints |
| `SLACK_WEBHOOK_URL` | ☐ | `https://hooks.slack.com/...` | Slack alert notifications |
| `ALERT_WEBHOOK_URL` | ☐ | `https://your-api.com/webhook` | Generic HTTP alert notifications |

### Frontend Project (set in Vercel)

| Variable | Required | Example | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://your-backend.vercel.app/api/v1` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | ✅ | `wss://your-backend.vercel.app/ws/dashboard` | WebSocket URL (non-functional on Vercel Hobby) |
| `NEXT_PUBLIC_CRON_SECRET` | ✅ | same as `CRON_SECRET` | Sent as Bearer token by "Run Probes" button |

---

## Feature Availability on Vercel Hobby

| Feature | Works? | Notes |
|---|---|---|
| Landing page | ✅ | Full animations, Lenis + GSAP |
| Dashboard | ✅ | All stats cards, charts, tables |
| Server Registry CRUD | ✅ | Register, edit, delete servers |
| Health Probes (on-demand) | ✅ | "Run Probes" button triggers all |
| Tool Call Audit Log | ✅ | Full pagination, filters, drawer |
| Analytics Charts | ✅ | Populated after cron or manual trigger |
| Alerts — Create Rules | ✅ | Full CRUD |
| Alerts — Evaluate | ✅ | On-demand via button |
| Slack / Webhook Notifications | ✅ | Fires during alert evaluation |
| Database Migrations | ✅ | Auto-runs on cold start via Alembic |
| Daily Analytics Cron | ✅ | Runs at 2 AM UTC |
| WebSocket Live Updates | ❌ | Serverless functions don't support persistent connections |
| Sidebar "Live" indicator | ❌ | Shows "Offline" — cosmetic only |

---

## Alternatives If You Need WebSocket

If the live WebSocket updates are important to you, deploy the **backend** on one of these platforms instead of Vercel:

### Railway (Recommended)
Railway runs a persistent server process, which supports WebSocket out of the box.

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `mcphub` repo
3. Set **Root Directory** to `backend`
4. Set **Start Command** to:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add the same environment variables as listed above
6. Railway gives you a URL like `mcphub-backend.up.railway.app`

Then update `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in your Vercel frontend project to point to the Railway URL.

### Render
Similar to Railway — supports persistent processes and WebSocket.

1. [render.com](https://render.com) → New Web Service → Connect repo
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables → Deploy

### Fly.io
More control, good for production workloads.

```bash
# Install flyctl, then from /backend directory:
fly launch
fly secrets set DATABASE_URL="..." REDIS_URL="..." SECRET_KEY="..." ...
fly deploy
```

---

## Troubleshooting

### Backend returns 500 on first load

**Cause**: Alembic migrations are running (takes ~2 seconds on cold start from a paused Neon database).

**Fix**: Refresh the page. If it persists, check Vercel function logs:
- Vercel dashboard → Backend project → **Logs** → filter by `Error`

---

### `/api/v1/servers` returns a 500 or DB error

**Cause**: `DATABASE_URL` is incorrect, or you used the direct (non-pooled) connection string.

**Fix**:
1. Go to Neon dashboard → Connection Details → select **Pooled connection**
2. Ensure the URL scheme is `postgresql+asyncpg://` not `postgresql://`
3. Ensure `?ssl=require` is at the end (not `?sslmode=require`)
4. Update the env var in Vercel → Redeploy

---

### Frontend shows "Failed to fetch" or CORS error

**Cause**: `ALLOWED_ORIGINS` on the backend doesn't include the frontend URL.

**Fix**:
1. Check the exact URL in your browser's address bar (no trailing slash)
2. Update `ALLOWED_ORIGINS` in backend env vars to match exactly
3. Redeploy the backend

---

### "Run Probes" button does nothing

**Cause**: `NEXT_PUBLIC_CRON_SECRET` in the frontend doesn't match `CRON_SECRET` in the backend.

**Fix**:
1. In backend Vercel project → Settings → Environment Variables → copy the `CRON_SECRET` value exactly
2. In frontend Vercel project → Settings → Environment Variables → set `NEXT_PUBLIC_CRON_SECRET` to that exact value
3. Redeploy the frontend

---

### Analytics charts are empty

**Cause**: The analytics aggregation cron hasn't run yet (runs at 2 AM UTC).

**Fix**: Trigger manually:
```bash
curl -X POST https://your-backend.vercel.app/api/v1/admin/aggregate-analytics \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
Then refresh `/analytics`.

---

### Neon database is paused / slow first request

**Cause**: Neon free tier auto-pauses after 5 minutes of inactivity.

**Fix**: This is expected behaviour on the free tier. The first request after inactivity takes 1–2 seconds to resume. Consider upgrading to Neon Launch ($19/month) to disable auto-pause.

---

## Deployment Checklist

Use this as a final go-live checklist:

- [ ] Repository pushed to GitHub
- [ ] Neon project created, pooled asyncpg connection string saved
- [ ] Upstash Redis created with TLS enabled, `rediss://` URL saved
- [ ] `SECRET_KEY` generated (`openssl rand -hex 32`)
- [ ] `CRON_SECRET` generated (`openssl rand -hex 16`)
- [ ] Backend deployed to Vercel with all env vars set
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `GET /api/v1/servers` returns `[]` (confirms DB migration ran)
- [ ] Frontend deployed to Vercel with `NEXT_PUBLIC_API_URL` pointing to backend
- [ ] Landing page loads and animates correctly
- [ ] Dashboard page loads after clicking "Open Dashboard"
- [ ] `ALLOWED_ORIGINS` updated to frontend URL, backend redeployed
- [ ] No CORS errors in browser DevTools console
- [ ] Test server registered successfully
- [ ] "Run Probes" button works (status updates after ~5 seconds)
- [ ] Alert rule created successfully
- [ ] Analytics cron triggered manually — charts populate
- [ ] (Optional) Custom domains configured and SSL active
