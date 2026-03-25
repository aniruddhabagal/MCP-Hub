// Server registry
export interface Server {
  id: string
  name: string
  description: string | null
  endpoint: string
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' | 'down'
  owner: string | null
  version: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ServerCreate {
  name: string
  endpoint: string
  description?: string
  owner?: string
  version?: string
  tags?: string[]
}

export interface ServerUpdate {
  name?: string
  endpoint?: string
  description?: string
  owner?: string
  version?: string
  tags?: string[]
  status?: Server['status']
}

// Health
export interface HealthCheck {
  id: string
  server_id: string
  status: string
  latency_ms: number | null
  status_code: number | null
  error: string | null
  checked_at: string
}

export interface HealthSummary {
  server_id: string
  server_name: string
  uptime_pct: number
  avg_latency_ms: number | null
  current_status: string
  check_count: number
}

// Tool calls
export interface ToolCall {
  id: string
  server_id: string
  tool_name: string
  caller_agent: string | null
  input_payload: Record<string, unknown> | null
  output_size_bytes: number | null
  duration_ms: number | null
  status: 'success' | 'error'
  error: string | null
  called_at: string
}

export interface ToolCallCreate {
  server_id: string
  tool_name: string
  caller_agent?: string
  input_payload?: Record<string, unknown>
  output_size_bytes?: number
  duration_ms?: number
  status: 'success' | 'error'
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

// Analytics
export interface TopTool {
  server_id: string
  server_name: string
  tool_name: string
  call_count: number
  avg_latency_ms: number | null
  error_rate: number
}

export interface ErrorRateStat {
  server_id: string
  server_name: string
  tool_name: string | null
  error_rate: number
  call_count: number
  error_count: number
}

export interface LatencyStat {
  server_id: string
  server_name: string
  tool_name: string | null
  avg_latency_ms: number | null
  p95_latency_ms: number | null
  call_count: number
}

export interface HeatmapPoint {
  window_start: string
  window_end: string
  call_count: number
  error_count: number
}

// Alert rules
export interface AlertRule {
  id: string
  name: string
  server_id: string | null
  metric: 'error_rate' | 'latency_p95' | 'availability'
  operator: 'gt' | 'gte' | 'lt' | 'lte'
  threshold: number
  window_minutes: number
  enabled: boolean
  created_at: string
}

export interface AlertRuleCreate {
  name: string
  server_id?: string
  metric: AlertRule['metric']
  operator: AlertRule['operator']
  threshold: number
  window_minutes?: number
  enabled?: boolean
}

export interface AlertRuleUpdate {
  name?: string
  enabled?: boolean
  threshold?: number
  window_minutes?: number
}

// Alert events
export interface AlertEvent {
  id: string
  rule_id: string
  server_id: string | null
  state: 'fired' | 'resolved'
  value: number | null
  message: string | null
  fired_at: string
  resolved_at: string | null
}

// Probe result
export interface ProbeResult {
  server_id: string
  server_name: string
  status: string
  latency_ms: number | null
  error: string | null
}

// WebSocket message
export interface WsMessage {
  type: 'probe_complete' | 'alert_event' | 'ping'
  results?: ProbeResult[]
  state?: 'fired' | 'resolved'
  message?: string
  rule_id?: string
  server_id?: string
}

// ── Auth & Multi-Tenant ───────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  display_name: string | null
  is_superadmin: boolean
  is_active: boolean
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceMember {
  id: string
  user_id: string
  workspace_id: string
  role: WorkspaceRole
  user_email: string
  user_display_name: string | null
  joined_at: string
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  role: 'admin' | 'member'
  token: string
  invited_by: string
  invited_by_email?: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface ApiKey {
  id: string
  workspace_id: string
  name: string
  key_prefix: string
  created_by: string
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Workspace summary as returned by /auth/me (no created_at)
export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
}

export interface PendingInvite {
  token: string
  workspace_name: string
  workspace_id: string
  role: 'admin' | 'member'
  expires_at: string
}

export interface MeResponse {
  user: User
  workspaces: WorkspaceSummary[]
  current_workspace: WorkspaceSummary
  pending_invites?: PendingInvite[]
}

export interface WorkspaceCreate {
  name: string
  slug?: string
}

export interface InviteCreate {
  email: string
  role: 'admin' | 'member'
}

export interface ApiKeyCreate {
  name: string
  expires_at?: string
}

export interface ApiKeyCreateResponse extends ApiKey {
  raw_key: string
}

// ── Super Admin ───────────────────────────────────────────────────────────────

export interface AdminOverview {
  total_users: number
  total_workspaces: number
  total_servers: number
  total_tool_calls: number
  active_alerts: number
}

export interface AdminWorkspaceSummary {
  id: string
  name: string
  slug: string
  member_count: number
  server_count: number
  created_at: string
}

export interface AdminUserSummary {
  id: string
  email: string
  display_name: string | null
  is_superadmin: boolean
  is_active: boolean
  workspace_count: number
  created_at: string
}

export interface AdminUserDetail {
  id: string
  email: string
  display_name: string | null
  is_superadmin: boolean
  is_active: boolean
  created_at: string
  workspaces: Array<{ id: string; name: string; slug: string; role: WorkspaceRole }>
}

export interface AdminGlobalAnalytics {
  total_calls: number
  total_errors: number
  error_rate: number
  avg_latency_ms: number | null
  top_tools: Array<{ tool_name: string; call_count: number }>
}

export interface AdminToolCall {
  id: string
  tool_name: string
  status: 'success' | 'error'
  duration_ms: number | null
  workspace_id: string
  server_id: string
  called_at: string
}

export interface AdminAlertEvent {
  id: string
  state: 'fired' | 'resolved'
  message: string | null
  value: number | null
  workspace_id: string
  rule_id: string
  fired_at: string
  resolved_at: string | null
}

export interface ImpersonateResponse {
  access_token: string
  token_type: string
  impersonated_user_id: string
  workspace_id: string
}
