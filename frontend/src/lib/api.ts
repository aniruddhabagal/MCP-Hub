import type {
  AlertEvent,
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
  ErrorRateStat,
  HealthCheck,
  HealthSummary,
  HeatmapPoint,
  LatencyStat,
  PaginatedResponse,
  ProbeResult,
  Server,
  ServerCreate,
  ServerUpdate,
  ToolCall,
  ToolCallCreate,
  TopTool,
} from './types'
import { getDemoResponse, isDemoMode, setDemoMode } from './demo-mode'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const CRON_SECRET = process.env.NEXT_PUBLIC_CRON_SECRET ?? ''

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
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(rest.headers ?? {}) },
      ...rest,
    })
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

export async function getToolCalls({ status: _status, server_id, page = 1, size = 25 }: ToolCallsParams = {}): Promise<PaginatedResponse<ToolCall>> {
  const offset = (page - 1) * size
  // Fetch one extra to detect if there are more pages
  const raw = await apiFetch<ToolCall[]>('/tool-calls', {
    params: { server_id, offset, limit: size + 1 },
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
