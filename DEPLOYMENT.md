# MCPHub Deployment Guide

This guide walks you through deploying MCPHub to production using:
- **Frontend + Backend**: Vercel (serverless functions)
- **PostgreSQL**: Neon
- **Redis**: Upstash
- **Cron Jobs**: Vercel Cron

---

## Prerequisites

You'll need accounts on:
1. **GitHub** — Repository hosting
2. **Vercel** — Frontend & backend deployment
3. **Neon** — PostgreSQL database
4. **Upstash** — Redis cache

**Estimated time**: 30-45 minutes

---

## Step 1: Create GitHub Repository

### 1.1 Push Code to GitHub

If not already done:

```bash
git remote add origin https://github.com/yourusername/mcphub.git
git branch -M main
git push -u origin main
```

Verify your repo has:
- `/frontend` — Next.js app
- `/backend` — FastAPI app
- `/docker-compose.yml` — For local dev
- `Usage.md` — Documentation

---

## Step 2: Set Up Neon PostgreSQL

### 2.1 Create Neon Account

1. Go to **[neon.tech](https://neon.tech)**
2. Click **Sign Up**
3. Sign in with GitHub (recommended for easy linking)

### 2.2 Create Project

1. Click **New Project** or **+ New** in the sidebar
2. Configure:
   - **Project name**: `mcphub` or similar
   - **Database name**: `mcphub`
   - **Region**: Pick closest to your users (default is fine)
   - **PostgreSQL version**: 16 (or latest)
3. Click **Create Project**

### 2.3 Get Connection String

1. After creation, you'll see the **Connection String**
2. Copy the full string (looks like):
   ```
   postgresql://neon_user:password@ep-xxx.us-east-1.neon.tech/mcphub?sslmode=require
   ```
3. **Save this** — you'll need it for Vercel environment variables

### 2.4 Verify Connection (Optional)

From your local machine:
```bash
psql "postgresql://neon_user:password@ep-xxx.us-east-1.neon.tech/mcphub?sslmode=require" -c "SELECT version();"
```

Should return PostgreSQL version. ✓

---

## Step 3: Set Up Upstash Redis

### 3.1 Create Upstash Account

1. Go to **[upstash.com](https://upstash.com)**
2. Click **Sign Up**
3. Sign in with GitHub (recommended)

### 3.2 Create Redis Database

1. Click **Create Database** (or **+ Database**)
2. Configure:
   - **Database name**: `mcphub`
   - **Region**: Pick closest to Vercel region (usually `us-east-1`)
   - **Type**: Redis
3. Click **Create**

### 3.3 Get Connection Details

1. After creation, go to **Database details**
2. Find the **Redis URL** (looks like):
   ```
   redis://default:password@up-xxx.upstash.io:xxxxx
   ```
3. **Save this** — you'll need it for environment variables

### 3.4 Test Connection (Optional)

Install `redis-cli` locally:
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-tools
```

Test:
```bash
redis-cli -u "redis://default:password@up-xxx.upstash.io:xxxxx" PING
# Should return: PONG
```

---

## Step 4: Prepare Backend for Vercel

### 4.1 Review Vercel-Specific Config

Vercel deploys Python apps using a `vercel.json` in the root or `backend/vercel.json`.

Create `/backend/vercel.json`:

```json
{
  "buildCommand": "pip install -r requirements.txt",
  "outputDirectory": "./",
  "env": {
    "PYTHON_VERSION": "3.12"
  },
  "functions": {
    "app/main.py": {
      "runtime": "python3.12"
    }
  }
}
```

> Note: The current setup uses `uvicorn` directly. Vercel will detect FastAPI and configure automatically.

### 4.2 Update Backend Dockerfile (Optional for Local Dev)

The backend Dockerfile is for local Docker. Vercel will use `requirements.txt` instead. No changes needed.

### 4.3 Verify Dependencies

Ensure `backend/requirements.txt` is up to date:

```bash
cd backend
pip freeze > requirements.txt
```

Check it includes:
- `fastapi`
- `uvicorn`
- `sqlalchemy`
- `asyncpg`
- `redis`
- `alembic`
- `pydantic`
- `pydantic-settings`

---

## Step 5: Prepare Frontend for Vercel

### 5.1 Review Next.js Config

Create `frontend/next.config.js` if it doesn't exist:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow images from API if needed
  images: {
    domains: ['localhost', 'api.example.com'],
  },
}

module.exports = nextConfig
```

### 5.2 Ensure .gitignore Excludes Build Files

Frontend `frontend/.gitignore` should have:
```
node_modules/
.next/
.env.local
.env.*.local
dist/
```

### 5.3 Update environment variable references

In `frontend/src/lib/api.ts`, verify:
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
```

This reads `NEXT_PUBLIC_API_URL` from environment variables (Vercel will set this).

---

## Step 6: Deploy Backend to Vercel

### 6.1 Import Project to Vercel

1. Go to **[vercel.com](https://vercel.com)**
2. Log in with GitHub
3. Click **Add New...** → **Project**
4. Select your **mcphub** repository
5. Click **Import**

### 6.2 Configure Backend Project

1. **Project name**: `mcphub-backend`
2. **Framework Preset**: Other (or Python — Vercel will auto-detect)
3. Under **Root Directory**: Select `./backend`
4. Click **Configure**

### 6.3 Set Environment Variables

Click **Environment Variables** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | Your Neon connection string | From Step 2.3 |
| `REDIS_URL` | Your Upstash Redis URL | From Step 3.3 |
| `APP_ENV` | `production` | |
| `SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` | Keep secret! |
| `ALLOWED_ORIGINS` | `https://mcphub-frontend.vercel.app` (or your domain) | Update with actual frontend URL after deploy |

> **Important**: Do NOT commit `.env` files. Use Vercel's environment variable UI only.

### 6.4 Deploy

1. Click **Deploy**
2. Wait for build (5-10 minutes)
3. You'll see a success message with a URL like: `https://mcphub-backend.vercel.app`
4. **Save this URL** — you need it for the frontend

### 6.5 Verify Backend Deployment

```bash
curl https://mcphub-backend.vercel.app/api/v1/servers
# Should return: [] (empty list, no servers registered yet)
```

If you get JSON response, backend is working! ✓

---

## Step 7: Run Database Migrations

### 7.1 Access Backend Environment

You need to run Alembic migrations on the Neon database.

**Option A: Run locally (recommended)**

```bash
# Set env var temporarily
export DATABASE_URL="postgresql://neon_user:password@ep-xxx.us-east-1.neon.tech/mcphub?sslmode=require"

# From backend directory
cd backend
alembic upgrade head
```

Output should show:
```
INFO  [alembic.runtime.migration] Running upgrade → xxxxxx, ...
...
INFO  [sqlalchemy.engine.Engine] COMMIT
```

**Option B: Run via Vercel function**

Create `backend/api/migrate.py`:

```python
from fastapi import APIRouter
from sqlalchemy import text
from app.database import engine

router = APIRouter()

@router.post("/admin/migrate")
async def run_migrations():
    async with engine.begin() as conn:
        await conn.run_sync(text("SELECT 1"))  # Placeholder
    return {"status": "migrations complete"}
```

Then call:
```bash
curl -X POST https://mcphub-backend.vercel.app/api/v1/admin/migrate
```

> Alembic migrations are recommended (Option A).

### 7.2 Verify Migrations

Check Neon database:

```bash
psql "postgresql://neon_user:password@ep-xxx.us-east-1.neon.tech/mcphub" -c "\dt"
```

Should show tables:
- `mcp_servers`
- `health_checks`
- `tool_calls`
- `alert_rules`
- `alert_events`
- `analytics_snapshots`

---

## Step 8: Deploy Frontend to Vercel

### 8.1 Import Frontend Project

1. Go to **[vercel.com](https://vercel.com)**
2. Click **Add New...** → **Project**
3. Select your **mcphub** repo
4. Click **Import**

### 8.2 Configure Frontend Project

1. **Project name**: `mcphub-frontend` (or `mcphub`)
2. **Framework Preset**: Next.js (auto-detected)
3. **Root Directory**: `./frontend`
4. Click **Configure**

### 8.3 Set Environment Variables

Click **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://mcphub-backend.vercel.app/api/v1` |

> Note: Use `NEXT_PUBLIC_` prefix so it's embedded in client-side code (required for browser API calls).

### 8.4 Deploy

1. Click **Deploy**
2. Wait for build (3-5 minutes)
3. You'll get a URL like: `https://mcphub-frontend.vercel.app`

### 8.5 Verify Frontend Deployment

1. Open `https://mcphub-frontend.vercel.app` in your browser
2. You should see the landing page with animations
3. Click "Open Dashboard" → should load dashboard page
4. If you see data from the backend, you're connected! ✓

---

## Step 9: Update CORS & Environment Variables

### 9.1 Update Backend ALLOWED_ORIGINS

Now that you have the frontend URL, update the backend environment variable:

1. Go to **Vercel Dashboard** → **mcphub-backend** project
2. Click **Settings** → **Environment Variables**
3. Edit `ALLOWED_ORIGINS`:
   ```
   https://mcphub-frontend.vercel.app
   ```
4. Click **Save**
5. Click **Deployments** → **Redeploy latest** to apply changes

### 9.2 Update Frontend API URL (if needed)

If your frontend URL is different, update:

1. Vercel Frontend project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_API_URL` to match your backend URL
3. **Redeploy latest**

---

## Step 10: Configure Cron Jobs (Analytics)

MCPHub runs an analytics aggregator daily at 2 AM UTC.

### 10.1 Add Cron Job to Backend

Create or update `backend/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/v1/admin/analytics-aggregate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs at **02:00 UTC daily**.

### 10.2 Create Cron Endpoint (if not exists)

In `backend/app/routers/admin.py`:

```python
@router.post("/analytics-aggregate")
async def aggregate_analytics(authorization: str = Header(None)):
    # Verify cron secret
    if authorization != f"Bearer {os.getenv('CRON_SECRET', '')}":
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Run aggregation
    await analytics_aggregator()
    return {"status": "aggregation complete"}
```

### 10.3 Deploy

Push changes:
```bash
git add backend/vercel.json
git commit -m "chore: add Vercel cron config for analytics"
git push
```

Vercel will automatically pick up the cron config and schedule it.

---

## Step 11: Test Complete Flow

### 11.1 Register a Test Server

```bash
curl -X POST https://mcphub-backend.vercel.app/api/v1/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-mcp",
    "endpoint": "http://localhost:3001",
    "owner": "admin"
  }'
```

Should return server object with ID.

### 11.2 View in Dashboard

1. Open frontend: `https://mcphub-frontend.vercel.app/servers`
2. You should see "test-mcp" in the server table
3. Click on it → view details page

### 11.3 Run Health Probe

```bash
curl -X POST https://mcphub-backend.vercel.app/api/v1/admin/probe-all \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 11.4 Check Analytics

1. Go to `/analytics` in frontend
2. If you've had tool calls, charts should populate
3. If empty, that's fine (no traffic yet)

---

## Step 12: Set Up Custom Domain (Optional)

### 12.1 Configure Domain in Vercel

1. Go to **Vercel project** (frontend)
2. Click **Settings** → **Domains**
3. Enter your domain (e.g., `mcphub.yourdomain.com`)
4. Vercel will show DNS instructions

### 12.2 Update DNS Records

In your domain registrar (GoDaddy, Namecheap, etc.):

Add CNAME record:
```
Name: mcphub
Target: cname.vercel-dns.com
```

Wait 5-30 minutes for DNS propagation.

### 12.3 Verify Domain

```bash
curl https://mcphub.yourdomain.com
# Should load your frontend
```

---

## Step 13: Set Up Monitoring & Alerts

### 13.1 Enable Vercel Error Tracking

1. Vercel Dashboard → **Settings** → **Integrations**
2. Connect **Sentry** or **Datadog** (optional, for error tracking)

### 13.2 Configure Backend Notifications

In your Slack workspace:
1. Create a **#mcphub-alerts** channel
2. In the backend, set `SLACK_WEBHOOK_URL` in Vercel env vars
3. Now backend alerts will post to Slack

---

## Step 14: Post-Deployment Checklist

- [ ] Backend deployed and responding to API calls
- [ ] Frontend deployed and can load dashboard
- [ ] Database migrations completed (tables exist in Neon)
- [ ] Environment variables set correctly (no `undefined` API URLs)
- [ ] CORS allows frontend domain
- [ ] Test server registered and visible in dashboard
- [ ] Health probe ran successfully
- [ ] Analytics aggregation scheduled (cron job)
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring/alerts configured (optional)

---

## Troubleshooting Deployment Issues

### Backend Won't Deploy

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Fix**:
```bash
cd backend
pip freeze > requirements.txt
git add requirements.txt
git push
```

Then **Redeploy** on Vercel.

---

### Frontend Shows "API Unreachable"

**Error**: Console shows `Failed to fetch from http://localhost:8000`

**Fix**:
1. Check `NEXT_PUBLIC_API_URL` env var is set correctly in Vercel
2. Verify backend URL is correct: `https://mcphub-backend.vercel.app/api/v1`
3. **Redeploy frontend** after changing env vars

---

### Database Connection Fails

**Error**: `psycopg2.OperationalError: connection failed`

**Fix**:
1. Verify `DATABASE_URL` in Vercel is correct (from Neon)
2. Ensure Neon database is running (check Neon dashboard)
3. Try connecting locally: `psql "$DATABASE_URL"`
4. Check IP whitelist in Neon (Settings → Network)

---

### Redis Connection Fails

**Error**: `ConnectionRefusedError: [Errno 111] Connection refused`

**Fix**:
1. Verify `REDIS_URL` in Vercel (from Upstash)
2. Test connection: `redis-cli -u "$REDIS_URL" PING`
3. Ensure Upstash database is active (check Upstash dashboard)

---

### Migrations Won't Run

**Error**: `alembic upgrade head` times out or fails

**Fix**:
```bash
# Increase connection timeout
export DATABASE_URL="postgresql://...?connect_timeout=30"
alembic upgrade head
```

Or run from Vercel function with longer timeout.

---

### Landing Page Content Vanishes

**Error**: Page loads, then all content except navbar disappears

**Fix**:
This is a GSAP animation issue (now fixed in latest version).
- Clear browser cache: `Cmd+Shift+Delete` (Chrome/Firefox)
- Hard reload: `Cmd+Shift+R` (macOS) or `Ctrl+Shift+R` (Windows)
- Check browser console for JavaScript errors

---

## Performance Optimization

### 1. Enable Caching

In `frontend/vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

### 2. Use Redis Cache

Analytics queries are cached in Redis (5-minute TTL by default).
Monitor cache hit rate in Upstash dashboard.

### 3. Optimize Vercel Functions

Backend functions are serverless. Cold starts (~2-3s) happen on first request after deploy.
To improve:
- Keep functions lean
- Use async/await efficiently
- Avoid heavy imports at function root

---

## Production Best Practices

### 1. Secure Environment Variables

- ✓ Use Vercel's built-in environment variable encryption
- ✓ Rotate `SECRET_KEY` every 90 days
- ✗ Never commit `.env` files
- ✗ Never log sensitive values

### 2. Enable HTTPS

- Vercel auto-enables HTTPS on all deployments ✓
- Custom domains use Let's Encrypt (free) ✓

### 3. Set Up Monitoring

- Enable Vercel Analytics for frontend performance
- Monitor backend API response times in Vercel logs
- Set up Slack alerts for critical errors

### 4. Regular Backups

- Neon automatically backs up database (check retention settings)
- Export data weekly:
  ```bash
  pg_dump "$DATABASE_URL" > mcphub_backup.sql
  ```

### 5. Update Dependencies

Monthly:
```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend
npm update
```

Test locally, then push to production.

---

## Rollback Procedure

If something breaks after deploy:

### 1. Revert Code

```bash
git revert HEAD
git push
```

### 2. Redeploy

On Vercel Dashboard → **Deployments** → Click previous deployment → **Redeploy**

### 3. Check Logs

Click deployment → **Function logs** to debug

---

## Success! 🚀

Your MCPHub is now live.

**Next steps:**
1. Register your MCP servers in the dashboard
2. Route MCP clients through `/api/v1/proxy/{server_id}/mcp`
3. Set up alerts via Slack/webhook
4. Monitor analytics and health metrics

**Support resources:**
- [Vercel Docs](https://vercel.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [Upstash Docs](https://upstash.com/docs)
- MCPHub [Usage.md](./Usage.md)

Happy monitoring! 📊
