import type {
  AdminAlertEvent,
  AdminGlobalAnalytics,
  AdminOverview,
  AdminToolCall,
  AdminUserSummary,
  AdminWorkspaceSummary,
  AlertEvent,
  AlertRule,
  ApiKey,
  ErrorRateStat,
  HealthCheck,
  HealthSummary,
  HeatmapPoint,
  LatencyStat,
  MCPToolDefinition,
  ProbeResult,
  Server,
  ToolCall,
  ToolListResponse,
  TopTool,
  User,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
} from './types'

const NOW = Date.now()
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString()
const agoMin = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString()

// ── Servers ───────────────────────────────────────────────────────────────────

export const DEMO_SERVERS: Server[] = [
  {
    id: 'demo-srv-001',
    name: 'github-mcp',
    description: 'GitHub API integration — repos, PRs, issues, code search',
    endpoint: 'https://github-mcp.internal.acme.dev/mcp',
    status: 'healthy',
    owner: 'platform-team',
    version: '1.4.2',
    tags: ['git', 'ci', 'code'],
    auth_type: 'bearer',
    has_credentials: true,
    created_at: ago(720),
    updated_at: agoMin(12),
  },
  {
    id: 'demo-srv-002',
    name: 'slack-mcp',
    description: 'Slack messaging — channels, threads, user lookup',
    endpoint: 'https://slack-mcp.internal.acme.dev/mcp',
    status: 'healthy',
    owner: 'platform-team',
    version: '2.1.0',
    tags: ['messaging', 'notifications'],
    auth_type: 'bearer',
    has_credentials: true,
    created_at: ago(600),
    updated_at: agoMin(8),
  },
  {
    id: 'demo-srv-003',
    name: 'jira-mcp',
    description: 'Jira project management — tickets, sprints, boards',
    endpoint: 'https://jira-mcp.internal.acme.dev/mcp',
    status: 'healthy',
    owner: 'eng-ops',
    version: '1.2.1',
    tags: ['project-mgmt', 'tickets'],
    auth_type: 'api_key_header',
    has_credentials: true,
    created_at: ago(480),
    updated_at: agoMin(25),
  },
  {
    id: 'demo-srv-004',
    name: 'confluence-mcp',
    description: 'Confluence wiki — page search, content retrieval',
    endpoint: 'https://confluence-mcp.internal.acme.dev/mcp',
    status: 'degraded',
    owner: 'eng-ops',
    version: '1.0.8',
    tags: ['docs', 'wiki'],
    auth_type: null,
    has_credentials: false,
    created_at: ago(360),
    updated_at: agoMin(3),
  },
  {
    id: 'demo-srv-005',
    name: 'notion-mcp',
    description: 'Notion workspace — pages, databases, blocks',
    endpoint: 'https://notion-mcp.internal.acme.dev/mcp',
    status: 'unhealthy',
    owner: 'product-team',
    version: '0.9.3',
    tags: ['docs', 'productivity'],
    auth_type: null,
    has_credentials: false,
    created_at: ago(240),
    updated_at: agoMin(1),
  },
  {
    id: 'demo-srv-006',
    name: 'linear-mcp',
    description: 'Linear issue tracking — issues, cycles, projects',
    endpoint: 'https://linear-mcp.internal.acme.dev/mcp',
    status: 'down',
    owner: 'product-team',
    version: '1.1.0',
    tags: ['project-mgmt', 'issues'],
    auth_type: 'basic',
    has_credentials: true,
    created_at: ago(168),
    updated_at: ago(2),
  },
]

export const DEMO_SERVER_MAP: Record<string, Server> = Object.fromEntries(
  DEMO_SERVERS.map((s) => [s.id, s])
)

// ── Health Summaries ──────────────────────────────────────────────────────────

export const DEMO_HEALTH_SUMMARY: HealthSummary[] = [
  { server_id: 'demo-srv-001', server_name: 'github-mcp',      uptime_pct: 99.8, avg_latency_ms: 45,   current_status: 'healthy',   check_count: 480 },
  { server_id: 'demo-srv-002', server_name: 'slack-mcp',       uptime_pct: 99.2, avg_latency_ms: 82,   current_status: 'healthy',   check_count: 480 },
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',        uptime_pct: 98.5, avg_latency_ms: 120,  current_status: 'healthy',   check_count: 480 },
  { server_id: 'demo-srv-004', server_name: 'confluence-mcp',  uptime_pct: 91.3, avg_latency_ms: 340,  current_status: 'degraded',  check_count: 480 },
  { server_id: 'demo-srv-005', server_name: 'notion-mcp',      uptime_pct: 72.1, avg_latency_ms: null, current_status: 'unhealthy', check_count: 480 },
  { server_id: 'demo-srv-006', server_name: 'linear-mcp',      uptime_pct: 0,    avg_latency_ms: null, current_status: 'down',      check_count: 480 },
]

// ── Health Checks (per server, ~20 each) ─────────────────────────────────────

function makeHealthChecks(
  serverId: string,
  baseLatency: number | null,
  errorRate: number
): HealthCheck[] {
  return Array.from({ length: 20 }, (_, i) => {
    const isError = baseLatency === null || Math.random() < errorRate
    const jitter = baseLatency ? Math.round((Math.random() - 0.5) * baseLatency * 0.4) : 0
    return {
      id: `demo-hc-${serverId.slice(-3)}-${String(i).padStart(2, '0')}`,
      server_id: serverId,
      status: isError ? (baseLatency === null ? 'down' : 'error') : 'healthy',
      latency_ms: isError ? null : baseLatency! + jitter,
      status_code: isError ? (baseLatency === null ? null : 500) : 200,
      error: isError ? (baseLatency === null ? 'Connection refused' : 'Upstream timeout') : null,
      checked_at: agoMin(i * 15),
    }
  })
}

export const DEMO_HEALTH_CHECKS: Record<string, HealthCheck[]> = {
  'demo-srv-001': makeHealthChecks('demo-srv-001', 45, 0.01),
  'demo-srv-002': makeHealthChecks('demo-srv-002', 82, 0.02),
  'demo-srv-003': makeHealthChecks('demo-srv-003', 120, 0.03),
  'demo-srv-004': makeHealthChecks('demo-srv-004', 340, 0.12),
  'demo-srv-005': makeHealthChecks('demo-srv-005', null, 0.85),
  'demo-srv-006': makeHealthChecks('demo-srv-006', null, 1.0),
}

// ── Tool Calls (50 total) ─────────────────────────────────────────────────────

const CALLERS = ['claude-3-5-sonnet', 'claude-3-haiku', 'gpt-4o', 'agent-pipeline-v2']
const SERVER_TOOL_MAP: Record<string, string[]> = {
  'demo-srv-001': ['read_file', 'search_repos', 'post_comment'],
  'demo-srv-002': ['send_message', 'list_channels', 'get_user'],
  'demo-srv-003': ['search_issues', 'create_ticket', 'update_status', 'list_sprints'],
  'demo-srv-004': ['get_page', 'run_query'],
  'demo-srv-005': ['get_page', 'update_status'],
  'demo-srv-006': ['search_issues', 'create_ticket'],
}

export const DEMO_TOOL_CALLS: ToolCall[] = Array.from({ length: 50 }, (_, i) => {
  const serverIdx = i % 6
  const serverId = `demo-srv-00${serverIdx + 1}`
  const tools = SERVER_TOOL_MAP[serverId]
  const tool = tools[i % tools.length]
  const isError = i % 13 === 0  // ~8% error rate
  const durations = [18, 34, 55, 78, 95, 130, 180, 245, 320, 410, 520, 680]
  const duration = isError ? null : durations[i % durations.length]

  return {
    id: `demo-tc-${String(i + 1).padStart(3, '0')}`,
    server_id: serverId,
    tool_name: tool,
    caller_agent: CALLERS[i % CALLERS.length],
    input_payload: { query: `demo input for ${tool}`, limit: 10, page: (i % 3) + 1 },
    output_size_bytes: isError ? null : 512 + i * 128,
    duration_ms: duration,
    status: isError ? 'error' : 'success',
    error: isError ? `${tool}: upstream returned 503 Service Unavailable` : null,
    called_at: ago((50 - i) * 0.8),
  }
})

// ── Top Tools (raw backend format — error_rate as 0-100) ─────────────────────

export const DEMO_TOP_TOOLS: TopTool[] = [
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',       tool_name: 'search_issues',  call_count: 842, avg_latency_ms: 118,  error_rate: 2.4  },
  { server_id: 'demo-srv-001', server_name: 'github-mcp',     tool_name: 'read_file',       call_count: 761, avg_latency_ms: 43,   error_rate: 0.8  },
  { server_id: 'demo-srv-002', server_name: 'slack-mcp',      tool_name: 'send_message',    call_count: 634, avg_latency_ms: 79,   error_rate: 1.2  },
  { server_id: 'demo-srv-001', server_name: 'github-mcp',     tool_name: 'search_repos',    call_count: 521, avg_latency_ms: 52,   error_rate: 0.6  },
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',       tool_name: 'create_ticket',   call_count: 398, avg_latency_ms: 135,  error_rate: 3.1  },
  { server_id: 'demo-srv-004', server_name: 'confluence-mcp', tool_name: 'get_page',        call_count: 287, avg_latency_ms: 338,  error_rate: 11.5 },
  { server_id: 'demo-srv-002', server_name: 'slack-mcp',      tool_name: 'list_channels',   call_count: 214, avg_latency_ms: 68,   error_rate: 0.5  },
  { server_id: 'demo-srv-005', server_name: 'notion-mcp',     tool_name: 'get_page',        call_count: 156, avg_latency_ms: null, error_rate: 34.6 },
]

// ── Error Rates (raw backend format — error_rate as 0-100) ───────────────────

export const DEMO_ERROR_RATES: ErrorRateStat[] = [
  { server_id: 'demo-srv-006', server_name: 'linear-mcp',      tool_name: null,        error_rate: 100,  call_count: 89,  error_count: 89  },
  { server_id: 'demo-srv-005', server_name: 'notion-mcp',       tool_name: null,        error_rate: 34.6, call_count: 156, error_count: 54  },
  { server_id: 'demo-srv-004', server_name: 'confluence-mcp',   tool_name: 'get_page',  error_rate: 11.5, call_count: 287, error_count: 33  },
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',         tool_name: null,        error_rate: 3.1,  call_count: 398, error_count: 12  },
  { server_id: 'demo-srv-002', server_name: 'slack-mcp',        tool_name: null,        error_rate: 1.2,  call_count: 634, error_count: 8   },
  { server_id: 'demo-srv-001', server_name: 'github-mcp',       tool_name: null,        error_rate: 0.8,  call_count: 761, error_count: 6   },
]

// ── Latency Stats ─────────────────────────────────────────────────────────────

export const DEMO_LATENCY_STATS: LatencyStat[] = [
  { server_id: 'demo-srv-004', server_name: 'confluence-mcp', tool_name: 'get_page',       avg_latency_ms: 338, p95_latency_ms: 892,  call_count: 287 },
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',       tool_name: 'create_ticket',  avg_latency_ms: 135, p95_latency_ms: 420,  call_count: 398 },
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',       tool_name: 'search_issues',  avg_latency_ms: 118, p95_latency_ms: 380,  call_count: 842 },
  { server_id: 'demo-srv-002', server_name: 'slack-mcp',      tool_name: 'send_message',   avg_latency_ms: 79,  p95_latency_ms: 190,  call_count: 634 },
  { server_id: 'demo-srv-001', server_name: 'github-mcp',     tool_name: 'search_repos',   avg_latency_ms: 52,  p95_latency_ms: 145,  call_count: 521 },
  { server_id: 'demo-srv-001', server_name: 'github-mcp',     tool_name: 'read_file',      avg_latency_ms: 43,  p95_latency_ms: 112,  call_count: 761 },
]

// ── Usage Heatmap (24 hourly buckets) ─────────────────────────────────────────

export const DEMO_HEATMAP: HeatmapPoint[] = Array.from({ length: 24 }, (_, i) => {
  const hour = 23 - i
  const isBusinessHour = hour >= 9 && hour <= 18
  const base = isBusinessHour ? 120 : 15
  const count = Math.round(base + (Math.random() * base * 0.6))
  const errors = Math.round(count * (isBusinessHour ? 0.02 : 0.04))
  return {
    window_start: ago(hour + 1),
    window_end: ago(hour),
    call_count: count,
    error_count: errors,
  }
})

// ── Alert Rules ───────────────────────────────────────────────────────────────

export const DEMO_ALERT_RULES: AlertRule[] = [
  {
    id: 'demo-ar-001',
    name: 'High error rate (global)',
    server_id: null,
    metric: 'error_rate',
    operator: 'gt',
    threshold: 10,
    window_minutes: 60,
    enabled: true,
    created_at: ago(168),
  },
  {
    id: 'demo-ar-002',
    name: 'Confluence latency spike',
    server_id: 'demo-srv-004',
    metric: 'latency_p95',
    operator: 'gt',
    threshold: 500,
    window_minutes: 30,
    enabled: true,
    created_at: ago(72),
  },
  {
    id: 'demo-ar-003',
    name: 'Notion availability',
    server_id: 'demo-srv-005',
    metric: 'availability',
    operator: 'lt',
    threshold: 90,
    window_minutes: 60,
    enabled: true,
    created_at: ago(48),
  },
]

// ── Alert Events ──────────────────────────────────────────────────────────────

export const DEMO_ALERT_EVENTS: AlertEvent[] = [
  {
    id: 'demo-ae-001',
    rule_id: 'demo-ar-003',
    server_id: 'demo-srv-005',
    state: 'fired',
    value: 72.1,
    message: 'notion-mcp availability dropped to 72.1% (threshold: 90%)',
    fired_at: ago(3),
    resolved_at: null,
  },
  {
    id: 'demo-ae-002',
    rule_id: 'demo-ar-002',
    server_id: 'demo-srv-004',
    state: 'fired',
    value: 892,
    message: 'confluence-mcp p95 latency is 892ms (threshold: 500ms)',
    fired_at: ago(5),
    resolved_at: null,
  },
  {
    id: 'demo-ae-003',
    rule_id: 'demo-ar-001',
    server_id: 'demo-srv-006',
    state: 'fired',
    value: 100,
    message: 'linear-mcp error rate is 100% (threshold: 10%)',
    fired_at: ago(8),
    resolved_at: null,
  },
  {
    id: 'demo-ae-004',
    rule_id: 'demo-ar-002',
    server_id: 'demo-srv-004',
    state: 'resolved',
    value: 340,
    message: 'confluence-mcp p95 latency recovered to 340ms',
    fired_at: ago(24),
    resolved_at: ago(20),
  },
  {
    id: 'demo-ae-005',
    rule_id: 'demo-ar-003',
    server_id: 'demo-srv-005',
    state: 'resolved',
    value: 94.5,
    message: 'notion-mcp availability recovered to 94.5%',
    fired_at: ago(36),
    resolved_at: ago(30),
  },
]

// ── Probe Results ─────────────────────────────────────────────────────────────

export const DEMO_PROBE_RESULTS: ProbeResult[] = [
  { server_id: 'demo-srv-001', server_name: 'github-mcp',     status: 'healthy',   latency_ms: 47,   error: null },
  { server_id: 'demo-srv-002', server_name: 'slack-mcp',      status: 'healthy',   latency_ms: 85,   error: null },
  { server_id: 'demo-srv-003', server_name: 'jira-mcp',       status: 'healthy',   latency_ms: 124,  error: null },
  { server_id: 'demo-srv-004', server_name: 'confluence-mcp', status: 'degraded',  latency_ms: 352,  error: null },
  { server_id: 'demo-srv-005', server_name: 'notion-mcp',     status: 'unhealthy', latency_ms: null, error: 'Connection timeout after 5000ms' },
  { server_id: 'demo-srv-006', server_name: 'linear-mcp',     status: 'down',      latency_ms: null, error: 'Connection refused: ECONNREFUSED' },
]

// ── Auth / Multi-Tenant Demo Data ─────────────────────────────────────────────

export const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@mcphub.dev',
  display_name: 'Demo User',
  is_superadmin: true,   // superadmin in demo so all pages are explorable
  is_active: true,
  created_at: ago(720),
}

export const DEMO_WORKSPACE: Workspace = {
  id: 'demo-ws-001',
  name: 'Acme Corp',
  slug: 'acme-corp',
  created_at: ago(720),
}

export const DEMO_WORKSPACE_MEMBERS: WorkspaceMember[] = [
  {
    id: 'demo-member-001',
    user_id: 'demo-user-001',
    workspace_id: 'demo-ws-001',
    role: 'owner',
    user_email: 'demo@mcphub.dev',
    user_display_name: 'Demo User',
    joined_at: ago(720),
  },
  {
    id: 'demo-member-002',
    user_id: 'demo-user-002',
    workspace_id: 'demo-ws-001',
    role: 'admin',
    user_email: 'alice@acme.dev',
    user_display_name: 'Alice Chen',
    joined_at: ago(600),
  },
  {
    id: 'demo-member-003',
    user_id: 'demo-user-003',
    workspace_id: 'demo-ws-001',
    role: 'member',
    user_email: 'bob@acme.dev',
    user_display_name: 'Bob Patel',
    joined_at: ago(480),
  },
  {
    id: 'demo-member-004',
    user_id: 'demo-user-004',
    workspace_id: 'demo-ws-001',
    role: 'member',
    user_email: 'carol@acme.dev',
    user_display_name: 'Carol Kim',
    joined_at: ago(240),
  },
]

export const DEMO_WORKSPACE_INVITES: WorkspaceInvite[] = [
  {
    id: 'demo-invite-001',
    workspace_id: 'demo-ws-001',
    email: 'dave@acme.dev',
    role: 'member',
    token: 'demo-invite-token-001',
    invited_by: 'demo-user-001',
    invited_by_email: 'demo@mcphub.dev',
    expires_at: new Date(Date.now() + 7 * 24 * 3_600_000).toISOString(),
    accepted_at: null,
    created_at: agoMin(120),
  },
]

export const DEMO_API_KEYS: ApiKey[] = [
  {
    id: 'demo-key-001',
    workspace_id: 'demo-ws-001',
    name: 'CI/CD Pipeline',
    key_prefix: 'mhk_ci_c',
    created_by: 'demo-user-001',
    last_used_at: agoMin(45),
    expires_at: null,
    created_at: ago(168),
  },
  {
    id: 'demo-key-002',
    workspace_id: 'demo-ws-001',
    name: 'Staging Monitor',
    key_prefix: 'mhk_st_9',
    created_by: 'demo-user-002',
    last_used_at: ago(24),
    expires_at: new Date(Date.now() + 90 * 24 * 3_600_000).toISOString(),
    created_at: ago(336),
  },
]

// ── Super Admin Demo Data ─────────────────────────────────────────────────────

export const DEMO_ADMIN_OVERVIEW: AdminOverview = {
  total_users: 14,
  total_workspaces: 4,
  total_servers: 24,
  total_tool_calls: 18_342,
  active_alerts: 2,
}

export const DEMO_ADMIN_WORKSPACES: AdminWorkspaceSummary[] = [
  {
    id: 'demo-ws-001',
    name: 'Acme Corp',
    slug: 'acme-corp',
    member_count: 4,
    server_count: 6,
    created_at: ago(720),
  },
  {
    id: 'demo-ws-002',
    name: 'Nexus Labs',
    slug: 'nexus-labs',
    member_count: 3,
    server_count: 9,
    created_at: ago(480),
  },
  {
    id: 'demo-ws-003',
    name: 'Orbit Studio',
    slug: 'orbit-studio',
    member_count: 5,
    server_count: 7,
    created_at: ago(240),
  },
  {
    id: 'demo-ws-004',
    name: 'Sandbox',
    slug: 'sandbox',
    member_count: 2,
    server_count: 2,
    created_at: ago(48),
  },
]

export const DEMO_ADMIN_USERS: AdminUserSummary[] = [
  {
    id: 'demo-user-001',
    email: 'demo@mcphub.dev',
    display_name: 'Demo User',
    is_superadmin: true,
    is_active: true,
    workspace_count: 2,
    created_at: ago(720),
  },
  {
    id: 'demo-user-002',
    email: 'alice@acme.dev',
    display_name: 'Alice Chen',
    is_superadmin: false,
    is_active: true,
    workspace_count: 1,
    created_at: ago(600),
  },
  {
    id: 'demo-user-003',
    email: 'bob@acme.dev',
    display_name: 'Bob Patel',
    is_superadmin: false,
    is_active: true,
    workspace_count: 2,
    created_at: ago(480),
  },
  {
    id: 'demo-user-004',
    email: 'carol@nexus.io',
    display_name: 'Carol Kim',
    is_superadmin: false,
    is_active: true,
    workspace_count: 1,
    created_at: ago(360),
  },
  {
    id: 'demo-user-005',
    email: 'dave@nexus.io',
    display_name: 'Dave Ruiz',
    is_superadmin: false,
    is_active: false,
    workspace_count: 1,
    created_at: ago(240),
  },
]

export const DEMO_GLOBAL_ANALYTICS: AdminGlobalAnalytics = {
  total_calls: 18_342,
  total_errors: 1_284,
  error_rate: 0.0699,
  avg_latency_ms: 142.8,
  top_tools: [
    { tool_name: 'search_code', call_count: 4_210 },
    { tool_name: 'send_message', call_count: 3_891 },
    { tool_name: 'create_issue', call_count: 2_140 },
    { tool_name: 'get_user', call_count: 1_987 },
    { tool_name: 'list_repos', call_count: 1_544 },
  ],
}

export const DEMO_ADMIN_TOOL_CALLS: AdminToolCall[] = DEMO_TOOL_CALLS.slice(0, 20).map((c, i) => ({
  id: c.id,
  tool_name: c.tool_name,
  status: c.status,
  duration_ms: c.duration_ms,
  workspace_id: ['demo-ws-001', 'demo-ws-002', 'demo-ws-003'][i % 3],
  server_id: c.server_id,
  called_at: c.called_at,
}))

export const DEMO_ADMIN_ALERT_EVENTS: AdminAlertEvent[] = DEMO_ALERT_EVENTS.map((e, i) => ({
  id: e.id,
  state: e.state,
  message: e.message,
  value: e.value,
  workspace_id: ['demo-ws-001', 'demo-ws-002'][i % 2],
  rule_id: e.rule_id,
  fired_at: e.fired_at,
  resolved_at: e.resolved_at,
}))

// ── Tool Playground Demo Data ──────────────────────────────────────────────────

export const DEMO_SERVER_TOOLS: Record<string, MCPToolDefinition[]> = {
  'demo-srv-001': [
    {
      name: 'search_repositories',
      description: 'Search GitHub repositories by query string, with optional sort and language filters.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g. "language:python stars:>1000")' },
          sort: { type: 'string', enum: ['stars', 'forks', 'updated', 'help-wanted-issues'], description: 'Sort field' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order', default: 'desc' },
          limit: { type: 'integer', description: 'Maximum number of results', default: 10 },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_pull_request',
      description: 'Fetch details of a pull request including title, description, labels, and review status.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner (org or user)' },
          repo: { type: 'string', description: 'Repository name' },
          pr_number: { type: 'integer', description: 'Pull request number' },
        },
        required: ['owner', 'repo', 'pr_number'],
      },
    },
    {
      name: 'create_issue',
      description: 'Create a new GitHub issue on a repository.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue body (markdown supported)' },
          labels: { type: 'array', description: 'Label names to apply' },
        },
        required: ['owner', 'repo', 'title'],
      },
    },
    {
      name: 'list_commits',
      description: 'List recent commits on a branch.',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          branch: { type: 'string', description: 'Branch name', default: 'main' },
          limit: { type: 'integer', description: 'Max commits to return', default: 20 },
        },
        required: ['owner', 'repo'],
      },
    },
  ],
  'demo-srv-002': [
    {
      name: 'send_message',
      description: 'Send a message to a Slack channel or direct message thread.',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Channel ID or name (e.g. "#general" or "C01ABC123")' },
          text: { type: 'string', description: 'Message text (markdown supported)' },
          thread_ts: { type: 'string', description: 'Thread timestamp to reply in thread' },
        },
        required: ['channel', 'text'],
      },
    },
    {
      name: 'list_channels',
      description: 'List all public channels in the workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max channels to return', default: 50 },
          exclude_archived: { type: 'boolean', description: 'Skip archived channels', default: true },
        },
        required: [],
      },
    },
    {
      name: 'search_messages',
      description: 'Search messages across all accessible Slack channels.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Full-text search query' },
          limit: { type: 'integer', description: 'Max results', default: 20 },
        },
        required: ['query'],
      },
    },
  ],
  'demo-srv-003': [
    {
      name: 'search_issues',
      description: 'Search Jira issues using JQL (Jira Query Language).',
      inputSchema: {
        type: 'object',
        properties: {
          jql: { type: 'string', description: 'JQL query string (e.g. "project = ACME AND status = Open")' },
          fields: { type: 'string', description: 'Comma-separated list of fields to return', default: 'summary,status,assignee,priority' },
          max_results: { type: 'integer', description: 'Max issues to return', default: 25 },
        },
        required: ['jql'],
      },
    },
    {
      name: 'create_ticket',
      description: 'Create a new Jira ticket in a project.',
      inputSchema: {
        type: 'object',
        properties: {
          project_key: { type: 'string', description: 'Jira project key (e.g. "ACME")' },
          summary: { type: 'string', description: 'Ticket summary / title' },
          description: { type: 'string', description: 'Ticket description' },
          issue_type: { type: 'string', enum: ['Bug', 'Story', 'Task', 'Epic'], description: 'Issue type', default: 'Task' },
          priority: { type: 'string', enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'], description: 'Priority level' },
        },
        required: ['project_key', 'summary'],
      },
    },
    {
      name: 'get_board',
      description: 'Get all columns and issues on a Jira board.',
      inputSchema: {
        type: 'object',
        properties: {
          board_id: { type: 'integer', description: 'Board numeric ID' },
          sprint: { type: 'string', enum: ['active', 'backlog', 'all'], description: 'Sprint filter', default: 'active' },
        },
        required: ['board_id'],
      },
    },
  ],
  'demo-srv-004': [
    {
      name: 'search_pages',
      description: 'Search Confluence pages across spaces.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Full-text search query' },
          space_key: { type: 'string', description: 'Limit search to this space key' },
          limit: { type: 'integer', description: 'Max results', default: 10 },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_page_content',
      description: 'Retrieve the content of a Confluence page by ID.',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Confluence page ID' },
          format: { type: 'string', enum: ['storage', 'view', 'export_view'], description: 'Content format', default: 'view' },
        },
        required: ['page_id'],
      },
    },
  ],
  'demo-srv-005': [
    {
      name: 'get_page',
      description: 'Fetch a Notion page including its properties and content blocks.',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Notion page ID (UUID or URL)' },
        },
        required: ['page_id'],
      },
    },
    {
      name: 'create_page',
      description: 'Create a new Notion page inside a parent page or database.',
      inputSchema: {
        type: 'object',
        properties: {
          parent_id: { type: 'string', description: 'Parent page or database ID' },
          title: { type: 'string', description: 'Page title' },
          content: { type: 'string', description: 'Initial page content (plain text)' },
        },
        required: ['parent_id', 'title'],
      },
    },
    {
      name: 'search',
      description: 'Search across all Notion pages and databases accessible to the integration.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          filter: { type: 'string', enum: ['page', 'database'], description: 'Filter by object type' },
          limit: { type: 'integer', description: 'Max results', default: 10 },
        },
        required: ['query'],
      },
    },
  ],
  'demo-srv-006': [
    {
      name: 'search_issues',
      description: 'Search Linear issues using filter criteria.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text search query' },
          team: { type: 'string', description: 'Team identifier to scope search' },
          state: { type: 'string', enum: ['triage', 'backlog', 'todo', 'in_progress', 'done', 'cancelled'], description: 'Issue state filter' },
          limit: { type: 'integer', description: 'Max results', default: 20 },
        },
        required: [],
      },
    },
    {
      name: 'create_issue',
      description: 'Create a new issue on a Linear team.',
      inputSchema: {
        type: 'object',
        properties: {
          team_id: { type: 'string', description: 'Linear team ID' },
          title: { type: 'string', description: 'Issue title' },
          description: { type: 'string', description: 'Issue description (markdown)' },
          priority: { type: 'integer', description: 'Priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)', default: 0 },
        },
        required: ['team_id', 'title'],
      },
    },
  ],
}

export function getDemoToolsForServer(serverId: string): ToolListResponse {
  return {
    tools: DEMO_SERVER_TOOLS[serverId] ?? [],
    server_id: serverId,
    cached: true,
  }
}
