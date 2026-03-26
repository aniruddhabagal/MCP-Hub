'use client'

import { useSyncExternalStore } from 'react'
import {
  DEMO_ADMIN_ALERT_EVENTS,
  DEMO_ADMIN_OVERVIEW,
  DEMO_ADMIN_TOOL_CALLS,
  DEMO_ADMIN_USERS,
  DEMO_ADMIN_WORKSPACES,
  DEMO_ALERT_EVENTS,
  DEMO_ALERT_RULES,
  DEMO_API_KEYS,
  DEMO_ERROR_RATES,
  DEMO_GLOBAL_ANALYTICS,
  DEMO_HEATMAP,
  DEMO_HEALTH_CHECKS,
  DEMO_HEALTH_SUMMARY,
  DEMO_LATENCY_STATS,
  DEMO_PROBE_RESULTS,
  DEMO_SERVER_MAP,
  DEMO_SERVERS,
  DEMO_TOOL_CALLS,
  DEMO_TOP_TOOLS,
  DEMO_USER,
  DEMO_WORKSPACE,
  DEMO_WORKSPACE_INVITES,
  DEMO_WORKSPACE_MEMBERS,
  getDemoToolsForServer,
} from './demo-data'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

// ── Singleton state ───────────────────────────────────────────────────────────

let _isDemoMode = true
let _isManual = true  // on by default = intentional, not a backend failure
const _listeners = new Set<() => void>()

function notify() {
  _listeners.forEach((fn) => fn())
}

export function isDemoMode(): boolean {
  return _isDemoMode
}

export function isManualDemo(): boolean {
  return _isManual
}

export function setDemoMode(value: boolean, manual = false): void {
  if (_isDemoMode === value) return
  _isDemoMode = value
  _isManual = value ? manual : false
  notify()
}

export function toggleDemoMode(): void {
  _isDemoMode = !_isDemoMode
  _isManual = _isDemoMode  // if we're turning it on, it's manual
  notify()
}

// ── useSyncExternalStore bridge ───────────────────────────────────────────────

export function subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

export function getSnapshot(): boolean {
  return _isDemoMode
}

export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useIsManualDemo(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => _isManual,
    () => _isManual
  )
}

// ── DemoModeError ─────────────────────────────────────────────────────────────

export class DemoModeError extends Error {
  constructor() {
    super('Not available in demo mode')
    this.name = 'DemoModeError'
  }
}

// ── Backend health check ──────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/servers`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

// ── Route matcher ─────────────────────────────────────────────────────────────

const serverDetailRe = /^\/servers\/([^/]+)$/
const serverProbeRe = /^\/servers\/([^/]+)\/probe$/
const serverToolsRe = /^\/servers\/([^/]+)\/tools$/
const serverToolsInvokeRe = /^\/servers\/([^/]+)\/tools\/invoke$/
const serverToolsCacheRe = /^\/servers\/([^/]+)\/tools\/cache$/

type Params = Record<string, string | number | undefined>

export function getDemoResponse(path: string, params?: Params, method = 'GET'): unknown {
  const m = method.toUpperCase()

  // ── Super admin — GET endpoints ────────────────────────────────────────────
  if (path === '/admin/overview') return DEMO_ADMIN_OVERVIEW
  if (path === '/admin/workspaces') return DEMO_ADMIN_WORKSPACES
  if (path === '/admin/users') return DEMO_ADMIN_USERS
  if (path === '/admin/tool-calls') return DEMO_ADMIN_TOOL_CALLS
  if (path === '/admin/alerts/events') return DEMO_ADMIN_ALERT_EVENTS
  if (path === '/admin/analytics/global') return DEMO_GLOBAL_ANALYTICS

  const adminWsRe = /^\/admin\/workspaces\/([^/]+)$/.exec(path)
  if (adminWsRe) {
    return DEMO_ADMIN_WORKSPACES.find((w) => w.id === adminWsRe[1]) ?? DEMO_ADMIN_WORKSPACES[0]
  }
  const adminUserRe = /^\/admin\/users\/([^/]+)$/.exec(path)
  if (adminUserRe) {
    const u = DEMO_ADMIN_USERS.find((u) => u.id === adminUserRe[1]) ?? DEMO_ADMIN_USERS[0]
    return {
      ...u,
      workspaces: [{ id: 'demo-ws-001', name: 'Acme Corp', slug: 'acme-corp', role: 'owner' }],
    }
  }
  const adminImpRe = /^\/admin\/impersonate\/([^/]+)$/.exec(path)
  if (adminImpRe) {
    return {
      access_token: 'demo-impersonation-token',
      token_type: 'bearer',
      impersonated_user_id: adminImpRe[1],
      workspace_id: 'demo-ws-001',
    }
  }

  // ── Admin action endpoints (POST — return success-like results) ────────────
  if (path === '/admin/probe-all') {
    return { probed: DEMO_PROBE_RESULTS.length, results: DEMO_PROBE_RESULTS }
  }
  if (path === '/admin/evaluate-alerts') {
    return { evaluated: DEMO_ALERT_RULES.length, results: [] }
  }

  // ── Server probe ─────────────────────────────────────────────────────────
  const probeMatch = serverProbeRe.exec(path)
  if (probeMatch) {
    const id = probeMatch[1]
    const result = DEMO_PROBE_RESULTS.find((r) => r.server_id === id)
    return result ?? DEMO_PROBE_RESULTS[0]
  }

  // ── Tool playground — whitelisted before mutation block ───────────────────
  const toolsMatch = serverToolsRe.exec(path)
  if (toolsMatch) {
    // GET /servers/{id}/tools — return demo tool list (always, any method for cache invalidate)
    if (m === 'GET') {
      return getDemoToolsForServer(toolsMatch[1])
    }
    // DELETE /servers/{id}/tools/cache is caught below
  }

  const toolsCacheMatch = serverToolsCacheRe.exec(path)
  if (toolsCacheMatch) {
    // DELETE — no-op in demo mode, return undefined (204)
    return undefined
  }

  const invokeMatch = serverToolsInvokeRe.exec(path)
  if (invokeMatch && m === 'POST') {
    // Return a mock success invocation result
    return {
      tool_name: 'demo_tool',
      status: 'success',
      result: {
        content: [
          {
            type: 'text',
            text: 'Demo mode — tool invocation simulated.\nIn a live environment this would call the actual MCP server.',
          },
        ],
      },
      error: null,
      duration_ms: 142.5,
      tool_call_id: 'demo-tc-playground-001',
      truncated: false,
    }
  }

  // ── Mutations on real entities — block ────────────────────────────────────
  if (m !== 'GET' && m !== 'HEAD') {
    throw new DemoModeError()
  }

  // ── Servers ──────────────────────────────────────────────────────────────
  if (path === '/servers') {
    return DEMO_SERVERS
  }
  const serverMatch = serverDetailRe.exec(path)
  if (serverMatch) {
    const id = serverMatch[1]
    return DEMO_SERVER_MAP[id] ?? DEMO_SERVERS[0]
  }

  // ── Health ────────────────────────────────────────────────────────────────
  if (path === '/health/summary') {
    return DEMO_HEALTH_SUMMARY
  }
  if (path === '/health/checks') {
    const serverId = params?.server_id as string | undefined
    if (serverId) {
      return DEMO_HEALTH_CHECKS[serverId] ?? DEMO_HEALTH_CHECKS['demo-srv-001']
    }
    return Object.values(DEMO_HEALTH_CHECKS).flat()
  }

  // ── Tool calls ────────────────────────────────────────────────────────────
  if (path === '/tool-calls') {
    const offset = Number(params?.offset ?? 0)
    const limit = Number(params?.limit ?? 26)
    const serverId = params?.server_id as string | undefined
    let calls = DEMO_TOOL_CALLS
    if (serverId) {
      calls = calls.filter((c) => c.server_id === serverId)
    }
    return calls.slice(offset, offset + limit)
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  if (path === '/analytics/top-tools') {
    const limit = Number(params?.limit ?? 10)
    return DEMO_TOP_TOOLS.slice(0, limit)
  }
  if (path === '/analytics/error-rates') {
    return DEMO_ERROR_RATES
  }
  if (path === '/analytics/latency') {
    return DEMO_LATENCY_STATS
  }
  if (path === '/analytics/volume') {
    const hours = Number(params?.hours ?? 24)
    return DEMO_HEATMAP.slice(0, Math.min(hours, DEMO_HEATMAP.length))
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (path === '/alerts/rules') {
    return DEMO_ALERT_RULES
  }
  if (path === '/alerts/events') {
    let events = [...DEMO_ALERT_EVENTS]
    if (params?.state)     events = events.filter((e) => e.state === params.state)
    if (params?.rule_id)   events = events.filter((e) => e.rule_id === params.rule_id)
    if (params?.server_id) events = events.filter((e) => e.server_id === params.server_id)
    if (params?.limit)     events = events.slice(0, Number(params.limit))
    return events
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === '/auth/me') {
    return {
      ...DEMO_USER,
      workspaces: [{ ...DEMO_WORKSPACE, role: 'owner' }],
    }
  }

  // ── Workspace members ─────────────────────────────────────────────────────
  const wsMembers = /^\/workspaces\/([^/]+)\/members$/.exec(path)
  if (wsMembers) return DEMO_WORKSPACE_MEMBERS

  // ── Workspace invites ─────────────────────────────────────────────────────
  const wsInvites = /^\/workspaces\/([^/]+)\/invites$/.exec(path)
  if (wsInvites) return DEMO_WORKSPACE_INVITES

  // ── API keys ──────────────────────────────────────────────────────────────
  const wsApiKeys = /^\/workspaces\/([^/]+)\/api-keys$/.exec(path)
  if (wsApiKeys) return DEMO_API_KEYS

  // ── Workspace detail ──────────────────────────────────────────────────────
  const wsDetail = /^\/workspaces\/([^/]+)$/.exec(path)
  if (wsDetail) return DEMO_WORKSPACE

  // ── Workspaces list ───────────────────────────────────────────────────────
  if (path === '/workspaces') return [DEMO_WORKSPACE]

  // Fallback
  return []
}
