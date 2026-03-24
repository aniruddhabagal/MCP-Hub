import { test, expect } from '@playwright/test'

const SERVERS = [
  {
    id: 'srv-1',
    name: 'github-mcp',
    endpoint: 'http://localhost:3001',
    status: 'healthy',
    description: 'GitHub integration',
    owner: 'platform-team',
    version: '1.0.0',
    tags: ['prod'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/servers', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ json: SERVERS })
    } else {
      route.fulfill({
        status: 201,
        json: { ...SERVERS[0], id: 'srv-new', name: 'new-server' },
      })
    }
  })
  await page.route('**/api/v1/health/summary**', (route) => {
    route.fulfill({ json: [] })
  })
  await page.routeWebSocket('**/ws/dashboard', (ws) => {
    ws.onMessage(() => {})
  })
})

test('server table renders server rows', async ({ page }) => {
  await page.goto('/servers')
  await expect(page.getByText('github-mcp')).toBeVisible()
  await expect(page.getByText('platform-team')).toBeVisible()
})

test('register server modal opens and closes', async ({ page }) => {
  await page.goto('/servers')
  await page.getByRole('button', { name: /register server/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('Register MCP Server')).toBeVisible()
  await page.getByRole('button', { name: /cancel/i }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('register server modal validates required fields', async ({ page }) => {
  await page.goto('/servers')
  await page.getByRole('button', { name: /register server/i }).click()
  await page.getByRole('button', { name: /^register$/i }).click()
  await expect(page.getByText(/name is required/i)).toBeVisible()
})

test('server row links to detail page', async ({ page }) => {
  await page.goto('/servers')
  await page.getByRole('link', { name: 'github-mcp' }).click()
  await expect(page).toHaveURL(/\/servers\/srv-1/)
})
