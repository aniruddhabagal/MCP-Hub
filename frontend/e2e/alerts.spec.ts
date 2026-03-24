import { test, expect } from '@playwright/test'

const ALERT_RULES = [
  {
    id: 'rule-1',
    name: 'High error rate',
    server_id: null,
    metric: 'error_rate',
    operator: 'gt',
    threshold: 0.1,
    window_minutes: 60,
    enabled: true,
    created_at: new Date().toISOString(),
  },
]

const ALERT_EVENTS = [
  {
    id: 'ev-1',
    rule_id: 'rule-1',
    server_id: null,
    state: 'fired',
    value: 0.25,
    message: 'error_rate = 0.25 gt 0.1 (window: 60m)',
    fired_at: new Date().toISOString(),
    resolved_at: null,
  },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/alerts/rules**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ json: ALERT_RULES })
    } else {
      route.fulfill({ status: 201, json: { ...ALERT_RULES[0], id: 'rule-new' } })
    }
  })
  await page.route('**/api/v1/alerts/events**', (route) => {
    route.fulfill({ json: ALERT_EVENTS })
  })
  await page.route('**/api/v1/servers', (route) => {
    route.fulfill({ json: [] })
  })
  await page.routeWebSocket('**/ws/dashboard', (ws) => {
    ws.onMessage(() => {})
  })
})

test('alert rules table renders rules', async ({ page }) => {
  await page.goto('/alerts')
  await expect(page.getByText('High error rate')).toBeVisible()
  await expect(page.getByText('error_rate')).toBeVisible()
})

test('alert history table renders events', async ({ page }) => {
  await page.goto('/alerts')
  await expect(page.getByText('0.2500')).toBeVisible()
})

test('new rule modal opens', async ({ page }) => {
  await page.goto('/alerts')
  await page.getByRole('button', { name: /new rule/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('Create Alert Rule')).toBeVisible()
})

test('new rule modal validates rule name', async ({ page }) => {
  await page.goto('/alerts')
  await page.getByRole('button', { name: /new rule/i }).click()
  await page.getByRole('button', { name: /create rule/i }).click()
  await expect(page.getByText(/rule name is required/i)).toBeVisible()
})
