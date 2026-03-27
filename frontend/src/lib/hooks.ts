import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { AlertRuleUpdate, ServerCreate, ServerUpdate, ToolCallCreate, ToolInvokeRequest } from './types'

// ── Query keys ────────────────────────────────────────────────────────────────

export const QK = {
  servers: ['servers'] as const,
  server: (id: string) => ['servers', id] as const,
  serverTools: (id: string) => ['servers', id, 'tools'] as const,
  healthSummary: (hours?: number) => ['health', 'summary', hours ?? 24] as const,
  healthChecks: (serverId?: string, limit?: number) =>
    ['health', 'checks', serverId, limit] as const,
  toolCalls: (params: api.ToolCallsParams) => ['tool-calls', params] as const,
  topTools: (limit?: number) => ['analytics', 'top-tools', limit ?? 10] as const,
  errorRates: ['analytics', 'error-rates'] as const,
  latency: ['analytics', 'latency'] as const,
  volume: (hours?: number) => ['analytics', 'volume', hours ?? 24] as const,
  alertRules: ['alerts', 'rules'] as const,
  alertEvents: (params: api.AlertEventsParams) => ['alerts', 'events', params] as const,
}

// ── Servers ───────────────────────────────────────────────────────────────────

export function useServers() {
  return useQuery({ queryKey: QK.servers, queryFn: api.getServers })
}

export function useServer(id: string) {
  return useQuery({
    queryKey: QK.server(id),
    queryFn: () => api.getServer(id),
    enabled: !!id,
  })
}

export function useCreateServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ServerCreate) => api.createServer(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.servers }),
  })
}

export function useUpdateServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServerUpdate }) =>
      api.updateServer(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.servers })
      qc.invalidateQueries({ queryKey: QK.server(id) })
    },
  })
}

export function useDeleteServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteServer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.servers })
      qc.invalidateQueries({ queryKey: ['health'] })
    },
  })
}

export function useProbeServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.probeServer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.servers })
      qc.invalidateQueries({ queryKey: ['health'] })
    },
  })
}

export function useProbeAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.probeAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.servers })
      qc.invalidateQueries({ queryKey: ['health'] })
    },
  })
}

// ── Health ─────────────────────────────────────────────────────────────────────

export function useHealthSummary(hours?: number) {
  return useQuery({
    queryKey: QK.healthSummary(hours),
    queryFn: () => api.getHealthSummary(hours),
  })
}

export function useHealthChecks(params: { server_id?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: QK.healthChecks(params.server_id, params.limit),
    queryFn: () => api.getHealthChecks(params.server_id, params.limit),
    enabled: !!params.server_id,
  })
}

// ── Tool calls ────────────────────────────────────────────────────────────────

export function useToolCalls(params: api.ToolCallsParams = {}) {
  return useQuery({
    queryKey: QK.toolCalls(params),
    queryFn: () => api.getToolCalls(params),
  })
}

export function useCreateToolCall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ToolCallCreate) => api.createToolCall(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tool-calls'] }),
  })
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function useTopTools(limit?: number) {
  return useQuery({
    queryKey: QK.topTools(limit),
    queryFn: () => api.getTopTools(limit),
  })
}

export function useErrorRates() {
  return useQuery({
    queryKey: QK.errorRates,
    queryFn: api.getErrorRates,
  })
}

export function useLatency() {
  return useQuery({
    queryKey: QK.latency,
    queryFn: api.getLatencyStats,
  })
}

export function useVolume(hours?: number) {
  return useQuery({
    queryKey: QK.volume(hours),
    queryFn: () => api.getUsageHeatmap(hours),
  })
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export function useAlertRules() {
  return useQuery({ queryKey: QK.alertRules, queryFn: api.getAlertRules })
}

export function useCreateAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAlertRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.alertRules }),
  })
}

export function useUpdateAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AlertRuleUpdate }) =>
      api.updateAlertRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.alertRules }),
  })
}

export function useDeleteAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteAlertRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.alertRules }),
  })
}

export function useAlertEvents(params: api.AlertEventsParams = {}) {
  return useQuery({
    queryKey: QK.alertEvents(params),
    queryFn: () => api.getAlertEvents(params),
  })
}

export function useEvaluateAlerts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.evaluateAlerts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

// ── Tool Playground ────────────────────────────────────────────────────────────

export function useServerTools(serverId: string) {
  return useQuery({
    queryKey: QK.serverTools(serverId),
    queryFn: () => api.getServerTools(serverId),
    enabled: !!serverId,
    staleTime: 5 * 60 * 1000, // match Redis TTL
  })
}

export function useInvokeTool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serverId, body }: { serverId: string; body: ToolInvokeRequest }) =>
      api.invokeServerTool(serverId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tool-calls'] }),
  })
}

export function useInvalidateToolsCache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (serverId: string) => api.invalidateToolsCache(serverId),
    onSuccess: (_data, serverId) =>
      qc.invalidateQueries({ queryKey: QK.serverTools(serverId) }),
  })
}
