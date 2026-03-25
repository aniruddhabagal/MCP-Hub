import { test, expect } from '@playwright/test'

// Admin pages rely on demo mode (on by default) which provides
// DEMO_USER with is_superadmin: true — all admin pages are accessible.

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('**/ws/dashboard', (ws) => {
    ws.onMessage(() => {})
  })
})

// ── Admin overview page ───────────────────────────────────────────────────────

test('admin page renders with header and shield badge', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible()
  // Super Admin badge
  await expect(page.getByText(/super admin/i)).toBeVisible()
})

test('admin page shows platform stat cards', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByText(/users/i)).toBeVisible()
  await expect(page.getByText(/workspaces/i)).toBeVisible()
  await expect(page.getByText(/servers/i)).toBeVisible()
  await expect(page.getByText(/tool calls/i)).toBeVisible()
})

test('admin workspaces table shows demo workspaces', async ({ page }) => {
  await page.goto('/admin')
  // Demo workspaces from DEMO_ADMIN_WORKSPACES
  await expect(page.getByText('Acme Corp')).toBeVisible()
  await expect(page.getByText('Nexus Labs')).toBeVisible()
})

test('admin users table shows demo users', async ({ page }) => {
  await page.goto('/admin')
  // Demo users from DEMO_ADMIN_USERS
  await expect(page.getByText('demo@mcphub.dev')).toBeVisible()
  await expect(page.getByText('alice@acme.dev')).toBeVisible()
})

test('admin sidebar nav item is visible for superadmin', async ({ page }) => {
  await page.goto('/admin')
  // Sidebar should show the Admin nav item (shield icon link)
  await expect(page.getByRole('link', { name: /admin/i })).toBeVisible()
})

// ── Workspace deep dive ───────────────────────────────────────────────────────

test('admin workspace detail page loads', async ({ page }) => {
  await page.goto('/admin/workspaces/demo-ws-001')
  await expect(page.getByText('Acme Corp')).toBeVisible()
  await expect(page.getByText(/members/i)).toBeVisible()
  await expect(page.getByText(/servers/i)).toBeVisible()
})

test('admin workspace detail shows member list', async ({ page }) => {
  await page.goto('/admin/workspaces/demo-ws-001')
  // DEMO_WORKSPACE_MEMBERS includes demo@mcphub.dev
  await expect(page.getByText('demo@mcphub.dev')).toBeVisible()
})

test('admin workspace detail has delete section', async ({ page }) => {
  await page.goto('/admin/workspaces/demo-ws-001')
  await expect(page.getByText(/delete workspace/i)).toBeVisible()
})

test('workspace deep dive back link returns to admin', async ({ page }) => {
  await page.goto('/admin/workspaces/demo-ws-001')
  await page.getByRole('link', { name: /admin/i }).first().click()
  await expect(page).toHaveURL('/admin')
})

// ── User deep dive ────────────────────────────────────────────────────────────

test('admin user detail page loads', async ({ page }) => {
  await page.goto('/admin/users/demo-user-002')
  // Demo user alice@acme.dev
  await expect(page.getByText('alice@acme.dev')).toBeVisible()
})

test('admin user detail shows account settings toggles', async ({ page }) => {
  await page.goto('/admin/users/demo-user-002')
  await expect(page.getByText(/active/i)).toBeVisible()
  await expect(page.getByText(/super admin/i)).toBeVisible()
})

test('admin user detail shows workspace memberships', async ({ page }) => {
  await page.goto('/admin/users/demo-user-001')
  await expect(page.getByText(/workspaces/i)).toBeVisible()
})

test('admin user detail has delete section for non-self users', async ({ page }) => {
  // demo-user-002 is not the current user (demo-user-001)
  await page.goto('/admin/users/demo-user-002')
  await expect(page.getByText(/delete user/i)).toBeVisible()
})

test('user deep dive back link returns to admin', async ({ page }) => {
  await page.goto('/admin/users/demo-user-001')
  await page.getByRole('link', { name: /admin/i }).first().click()
  await expect(page).toHaveURL('/admin')
})

// ── Settings page ─────────────────────────────────────────────────────────────

test('settings page renders workspace name', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  await expect(page.getByText('Acme Corp')).toBeVisible()
})

test('settings page tabs are visible', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('tab', { name: /general/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /members/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /invites/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /api keys/i })).toBeVisible()
})

test('settings members tab shows demo workspace members', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('tab', { name: /members/i }).click()
  await expect(page.getByText('alice@acme.dev')).toBeVisible()
})
