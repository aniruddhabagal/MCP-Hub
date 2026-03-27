import type {
  AdminAlertEvent,
  AdminGlobalAnalytics,
  AdminOverview,
  AdminToolCall,
  AdminUserDetail,
  AdminUserSummary,
  AdminWorkspaceSummary,
  AlertEvent,
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
  ApiKey,
  ApiKeyCreate,
  ApiKeyCreateResponse,
  ErrorRateStat,
  HealthCheck,
  HealthSummary,
  HeatmapPoint,
  ImpersonateResponse,
  InviteCreate,
  LatencyStat,
  MeResponse,
  PaginatedResponse,
  ProbeResult,
  Server,
  ServerCreate,
  ServerUpdate,
  TokenResponse,
  ToolCall,
  ToolCallCreate,
  ToolInvokeRequest,
  ToolInvokeResponse,
  ToolListResponse,
  TopTool,
  WorkspaceCreate,
  WorkspaceInvite,
  WorkspaceMember,
} from './types'
import { getDemoResponse, isDemoMode, setDemoMode } from './demo-mode'
import { callRefreshFn, getAccessToken, setAccessToken } from './token-store'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const CRON_SECRET = process.env.NEXT_PUBLIC_CRON_SECRET ?? ''

// Prevent concurrent refresh attempts
let _refreshing: Promise<string | null> | null = null

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  const { params, ...rest } = init ?? {}

  // Demo mode fast path — skip all network calls
  if (isDemoMode()) {
    return getDemoResponse(path, params, rest.method) as T
  }

  let url = `${BASE}${path}`
  if (params) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v))
    }
    const str = qs.toString()
    if (str) url += `?${str}`
  }

  const buildHeaders = (token?: string | null): Record<string, string> => {
    const h: Record<string, string> = { ...(rest.headers as Record<string, string> ?? {}) }
    const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData
    if (!isFormData && !Object.keys(h).some((k) => k.toLowerCase() === 'content-type')) {
      h['Content-Type'] = 'application/json'
    }
    const t = token ?? getAccessToken()
    if (t) h['Authorization'] = `Bearer ${t}`
    return h
  }

  try {
    const res = await fetch(url, { ...rest, headers: buildHeaders() })

    // 401 — attempt token refresh and retry once
    if (res.status === 401) {
      if (!_refreshing) {
        _refreshing = callRefreshFn().finally(() => { _refreshing = null })
      }
      const newToken = await _refreshing
      if (newToken) {
        const retryRes = await fetch(url, { ...rest, headers: buildHeaders(newToken) })
        if (!retryRes.ok) {
          const text = await retryRes.text().catch(() => '')
          throw new Error(`${retryRes.status} ${retryRes.statusText}: ${text}`)
        }
        if (retryRes.status === 204) return undefined as T
        return retryRes.json()
      } else {
        // Refresh failed — clear token and redirect to login
        setAccessToken(null)
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('Session expired')
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status} ${res.statusText}: ${text}`)
    }
    if (res.status === 204) return undefined as T
    return res.json()
  } catch (err) {
    // Network failure (TypeError) or abort — backend is unreachable, enter demo mode
    if (err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError')) {
      setDemoMode(true)
      return getDemoResponse(path, params, rest.method) as T
    }
    throw err
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const apiLogin = (email: string, password: string) =>
  apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const apiSignup = (email: string, display_name: string, password: string, invite_token?: string) =>
  apiFetch<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, display_name, password, ...(invite_token ? { invite_token } : {}) }),
  })

export const apiRefresh = (refresh_token: string) =>
  apiFetch<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  })

export const apiGetMe = () => apiFetch<MeResponse>('/auth/me')

export const apiSwitchWorkspace = (workspace_id: string) =>
  apiFetch<TokenResponse>('/auth/switch-workspace', {
    method: 'POST',
    body: JSON.stringify({ workspace_id }),
  })

export const apiAcceptInvite = (token: string) =>
  apiFetch<TokenResponse>(`/auth/accept-invite/${token}`, { method: 'POST' })

// ── Workspaces ────────────────────────────────────────────────────────────────

export const createWorkspace = (body: WorkspaceCreate) =>
  apiFetch<{ id: string; name: string; slug: string; created_at: string }>('/workspaces', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const getWorkspaceMembers = (workspaceId: string) =>
  apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)

export const inviteMember = (workspaceId: string, body: InviteCreate) =>
  apiFetch<WorkspaceInvite>(`/workspaces/${workspaceId}/members/invite`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateMemberRole = (workspaceId: string, userId: string, role: string) =>
  apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const removeMember = (workspaceId: string, userId: string) =>
  apiFetch<void>(`/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' })

export const getWorkspaceInvites = (workspaceId: string) =>
  apiFetch<WorkspaceInvite[]>(`/workspaces/${workspaceId}/invites`)

export const revokeInvite = (workspaceId: string, inviteId: string) =>
  apiFetch<void>(`/workspaces/${workspaceId}/invites/${inviteId}`, { method: 'DELETE' })

export const getApiKeys = (workspaceId: string) =>
  apiFetch<ApiKey[]>(`/workspaces/${workspaceId}/api-keys`)

export const createApiKey = (workspaceId: string, body: ApiKeyCreate) =>
  apiFetch<ApiKeyCreateResponse>(`/workspaces/${workspaceId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const revokeApiKey = (workspaceId: string, keyId: string) =>
  apiFetch<void>(`/workspaces/${workspaceId}/api-keys/${keyId}`, { method: 'DELETE' })

export const updateWorkspace = (workspaceId: string, body: { name?: string; slug?: string }) =>
  apiFetch<{ id: string; name: string; slug: string }>(`/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteWorkspace = (workspaceId: string) =>
  apiFetch<void>(`/workspaces/${workspaceId}`, { method: 'DELETE' })

// ── Servers ──────────────────────────────────────────────────────────────────

export const getServers = () => apiFetch<Server[]>('/servers')

export const getServer = (id: string) => apiFetch<Server>(`/servers/${id}`)

export const createServer = (body: ServerCreate) =>
  apiFetch<Server>('/servers', { method: 'POST', body: JSON.stringify(body) })

export const updateServer = (id: string, body: ServerUpdate) =>
  apiFetch<Server>(`/servers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteServer = (id: string) =>
  apiFetch<void>(`/servers/${id}`, { method: 'DELETE' })

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealthSummary = (hours = 24) =>
  apiFetch<HealthSummary[]>('/health/summary', { params: { hours } })

export const getHealthChecks = (serverId?: string, limit = 100) =>
  apiFetch<HealthCheck[]>('/health/checks', {
    params: { server_id: serverId, limit },
  })

// ── Tool calls ────────────────────────────────────────────────────────────────

export interface ToolCallsParams {
  status?: string
  server_id?: string
  page?: number
  size?: number
}

export async function getToolCalls({ status, server_id, page = 1, size = 25 }: ToolCallsParams = {}): Promise<PaginatedResponse<ToolCall>> {
  const offset = (page - 1) * size
  // Fetch one extra to detect if there are more pages
  const raw = await apiFetch<ToolCall[]>('/tool-calls', {
    params: { server_id, status, offset, limit: size + 1 },
  })
  const hasMore = raw.length > size
  const items = raw.slice(0, size)
  return { items, total: offset + items.length + (hasMore ? size : 0), page, size }
}

export const createToolCall = (body: ToolCallCreate) =>
  apiFetch<ToolCall>('/tool-calls', { method: 'POST', body: JSON.stringify(body) })

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getTopTools(limit = 10): Promise<TopTool[]> {
  const raw = await apiFetch<TopTool[]>('/analytics/top-tools', { params: { limit } })
  // Backend returns error_rate as percentage (0–100); components expect decimal (0–1)
  return raw.map((t) => ({ ...t, error_rate: t.error_rate / 100 }))
}

export async function getErrorRates(): Promise<ErrorRateStat[]> {
  const raw = await apiFetch<ErrorRateStat[]>('/analytics/error-rates')
  return raw.map((r) => ({ ...r, error_rate: r.error_rate / 100 }))
}

export const getLatencyStats = () => apiFetch<LatencyStat[]>('/analytics/latency')

export const getUsageHeatmap = (hours = 24) =>
  apiFetch<HeatmapPoint[]>('/analytics/volume', { params: { hours } })

// ── Alerts ────────────────────────────────────────────────────────────────────

export const getAlertRules = () => apiFetch<AlertRule[]>('/alerts/rules')

export const createAlertRule = (body: AlertRuleCreate) =>
  apiFetch<AlertRule>('/alerts/rules', { method: 'POST', body: JSON.stringify(body) })

export const updateAlertRule = (id: string, body: AlertRuleUpdate) =>
  apiFetch<AlertRule>(`/alerts/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteAlertRule = (id: string) =>
  apiFetch<void>(`/alerts/rules/${id}`, { method: 'DELETE' })

export interface AlertEventsParams {
  [key: string]: string | number | undefined
  rule_id?: string
  server_id?: string
  state?: string
  limit?: number
}

export const getAlertEvents = (params: AlertEventsParams = {}) =>
  apiFetch<AlertEvent[]>('/alerts/events', { params })

// ── Admin ─────────────────────────────────────────────────────────────────────

export const probeAll = () =>
  apiFetch<{ probed: number; results: ProbeResult[] }>('/admin/probe-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })

export const probeServer = (serverId: string) =>
  apiFetch<ProbeResult>(`/servers/${serverId}/probe`, { method: 'POST' })

export const evaluateAlerts = () =>
  apiFetch<{ evaluated: number; results: unknown[] }>('/admin/evaluate-alerts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })

// ── Super Admin ───────────────────────────────────────────────────────────────

export const getAdminOverview = () =>
  apiFetch<AdminOverview>('/admin/overview')

export const getAdminWorkspaces = () =>
  apiFetch<AdminWorkspaceSummary[]>('/admin/workspaces')

export const getAdminWorkspace = (id: string) =>
  apiFetch<AdminWorkspaceSummary>(`/admin/workspaces/${id}`)

export const updateAdminWorkspace = (id: string, body: { name?: string; slug?: string }) =>
  apiFetch<AdminWorkspaceSummary>(`/admin/workspaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteAdminWorkspace = (id: string) =>
  apiFetch<void>(`/admin/workspaces/${id}`, { method: 'DELETE' })

export const getAdminUsers = () =>
  apiFetch<AdminUserSummary[]>('/admin/users')

export const getAdminUser = (id: string) =>
  apiFetch<AdminUserDetail>(`/admin/users/${id}`)

export const updateAdminUser = (
  id: string,
  body: { is_active?: boolean; is_superadmin?: boolean; display_name?: string }
) =>
  apiFetch<AdminUserDetail>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteAdminUser = (id: string) =>
  apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' })

export const impersonateUser = (userId: string) =>
  apiFetch<ImpersonateResponse>(`/admin/impersonate/${userId}`, { method: 'POST' })

export const getAdminToolCalls = () =>
  apiFetch<AdminToolCall[]>('/admin/tool-calls')

export const getAdminAlertEvents = () =>
  apiFetch<AdminAlertEvent[]>('/admin/alerts/events')

export const getGlobalAnalytics = () =>
  apiFetch<AdminGlobalAnalytics>('/admin/analytics/global')

// ── Tool Playground ───────────────────────────────────────────────────────────

export const getServerTools = (serverId: string) =>
  apiFetch<ToolListResponse>(`/servers/${serverId}/tools`)

export const invokeServerTool = (serverId: string, body: ToolInvokeRequest) =>
  apiFetch<ToolInvokeResponse>(`/servers/${serverId}/tools/invoke`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const invalidateToolsCache = (serverId: string) =>
  apiFetch<void>(`/servers/${serverId}/tools/cache`, { method: 'DELETE' })
