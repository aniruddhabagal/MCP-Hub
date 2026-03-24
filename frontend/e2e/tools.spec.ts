import { test, expect } from '@playwright/test'

const TOOL_CALLS = [
  {
    id: 'tc-1',
    server_id: 'srv-1',
    tool_name: 'read_file',
    caller_agent: 'claude-agent',
    input_payload: { path: '/tmp/test.txt' },
    output_size_bytes: 1024,
    duration_ms: 45,
    status: 'success',
    error: null,
    called_at: new Date().toISOString(),
  },
  {
    id: 'tc-2',
    server_id: 'srv-1',
    tool_name: 'write_file',
    caller_agent: null,
    input_payload: null,
    output_size_bytes: null,
    duration_ms: 120,
    status: 'error',
    error: 'Permission denied',
    called_at: new Date().toISOString(),
  },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/tool-calls**', (route) => {
    route.fulfill({
      json: TOOL_CALLS,
    })
  })
  await page.route('**/api/v1/servers', (route) => {
    route.fulfill({ json: [] })
  })
  await page.routeWebSocket('**/ws/dashboard', (ws) => {
    ws.onMessage(() => {})
  })
})

test('tool calls table renders rows', async ({ page }) => {
  await page.goto('/tools')
  await expect(page.getByText('read_file')).toBeVisible()
  await expect(page.getByText('write_file')).toBeVisible()
})

test('clicking a row opens detail drawer', async ({ page }) => {
  await page.goto('/tools')
  await page.getByText('read_file').click()
  await expect(page.getByText('Completed successfully')).toBeVisible()
  await expect(page.getByText('Tool Name')).toBeVisible()
})

test('detail drawer closes on X button', async ({ page }) => {
  await page.goto('/tools')
  await page.getByText('read_file').click()
  await expect(page.getByText('Completed successfully')).toBeVisible()
  await page.getByRole('button', { name: '' }).first().click()
  await expect(page.getByText('Completed successfully')).not.toBeVisible()
})
