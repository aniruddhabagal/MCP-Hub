import type {
  AlertEvent,
  AlertRule,
  ErrorRateStat,
  HealthCheck,
  HealthSummary,
  HeatmapPoint,
  LatencyStat,
  ProbeResult,
  Server,
  ToolCall,
  TopTool,
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

const TOOL_NAMES = [
  'read_file', 'search_issues', 'send_message', 'create_ticket',
  'get_page', 'update_status', 'list_channels', 'run_query',
  'search_repos', 'post_comment', 'get_user', 'list_sprints',
]
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
