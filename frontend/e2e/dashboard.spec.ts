import { test, expect } from '@playwright/test'

const SERVERS = [
  {
    id: 'srv-1',
    name: 'test-server',
    endpoint: 'http://localhost:3001',
    status: 'healthy',
    description: null,
    owner: null,
    version: null,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const HEALTH_SUMMARY = [
  {
    server_id: 'srv-1',
    server_name: 'test-server',
    uptime_pct: 98.5,
    avg_latency_ms: 42,
    current_status: 'healthy',
    check_count: 100,
  },
]

test.beforeEach(async ({ page }) => {
  // Mock all API calls
  await page.route('**/api/v1/servers', (route) => {
    route.fulfill({ json: SERVERS })
  })
  await page.route('**/api/v1/health/summary**', (route) => {
    route.fulfill({ json: HEALTH_SUMMARY })
  })
  await page.route('**/api/v1/alerts/events**', (route) => {
    route.fulfill({ json: [] })
  })
  await page.route('**/api/v1/tool-calls**', (route) => {
    route.fulfill({ json: [] })
  })
  await page.route('**/api/v1/analytics/top-tools**', (route) => {
    route.fulfill({ json: [] })
  })
  // Mock WebSocket
  await page.routeWebSocket('**/ws/dashboard', (ws) => {
    ws.onMessage(() => {})
  })
})

test('dashboard loads with stat cards', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('Servers')).toBeVisible()
  await expect(page.getByText('Avg Uptime')).toBeVisible()
  await expect(page.getByText('Tool Calls')).toBeVisible()
  await expect(page.getByText('Active Alerts')).toBeVisible()
})

test('Run Probes button is present and clickable', async ({ page }) => {
  await page.route('**/api/v1/admin/probe-all', (route) => {
    route.fulfill({ json: { probed: 1, results: [] } })
  })
  await page.goto('/dashboard')
  const btn = page.getByRole('button', { name: /run probes/i })
  await expect(btn).toBeVisible()
  await btn.click()
})

test('sidebar navigation links are visible', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /servers/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /tool calls/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /analytics/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /alerts/i })).toBeVisible()
})
