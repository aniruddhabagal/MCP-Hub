# Tool Playground — Dynamic Tool Discovery & Testing

## Feature Overview

Add a **Tool Playground** to MCPHub: dynamically fetch tools from any registered MCP server via JSON-RPC `tools/list`, browse them with their JSON Schema inputs, and let admin/owner users invoke them with custom arguments — all logged to the existing `tool_calls` audit trail.

## Architecture

```
┌─────────────┐   GET /servers/{id}/tools     ┌──────────────┐   JSON-RPC tools/list   ┌────────────┐
│  Frontend    │ ─────────────────────────────▶│  Backend     │ ───────────────────────▶│ MCP Server │
│  ToolsTab    │                               │  tools.py    │ ◀───────────────────────│            │
│              │ ◀─────────────────────────────│  (cached)    │                         └────────────┘
│              │   { tools: [...], cached }    │              │
│  Playground  │   POST /servers/{id}/tools/invoke            │   JSON-RPC tools/call
│  SchemaForm  │ ─────────────────────────────▶│  logs to     │ ───────────────────────▶
│              │ ◀─────────────────────────────│  tool_calls  │ ◀───────────────────────
│              │   { result, duration, id }    └──────────────┘
└─────────────┘
```

## Phase 1: Backend

### 1.1 Refactor `mcp_client.py` (MODIFY)

Extract shared MCP protocol utilities from `proxy.py` into `mcp_client.py`:
- `parse_sse(raw: bytes) -> bytes` — extract JSON from SSE event stream
- `get_session_id(endpoint, extra_headers) -> str | None` — initialize handshake to get session ID
- `send_mcp_request(endpoint, method, params, auth_headers, timeout) -> tuple[result, duration_ms, error]` — generic JSON-RPC request handler; used by both proxy and the new tools router

### 1.2 Update `proxy.py` (MODIFY)

- Import `parse_sse`, `get_session_id` from `app.utils.mcp_client`
- Remove their local definitions
- No behavioral changes

### 1.3 Create `schemas/tools.py` (CREATE)

```python
class ToolDefinition(BaseModel):
    name: str
    description: str | None = None
    inputSchema: dict[str, Any] | None = None   # JSON Schema

class ToolListResponse(BaseModel):
    tools: list[ToolDefinition]
    server_id: uuid.UUID
    cached: bool = False

class ToolInvokeRequest(BaseModel):
    tool_name: str
    arguments: dict[str, Any] = {}

class ToolInvokeResponse(BaseModel):
    tool_name: str
    status: str            # "success" | "error"
    result: Any | None     # content array from MCP response
    error: str | None
    duration_ms: float
    tool_call_id: uuid.UUID
    truncated: bool = False
```

### 1.4 Create `routers/tools.py` (CREATE)

Three endpoints under `/servers/{server_id}/tools`:

| Endpoint | Auth | Description |
|---|---|---|
| `GET /servers/{id}/tools` | L1+ (any member) | Fetch tools via `tools/list`, Redis-cached 5min |
| `POST /servers/{id}/tools/invoke` | L2+ (admin/owner) | Invoke tool, log to `tool_calls` with `caller_agent="mcphub-playground"` |
| `DELETE /servers/{id}/tools/cache` | L2+ (admin/owner) | Invalidate cached tool list |

**Caching:** Redis key `tools:{workspace_id}:{server_id}`, TTL 300s

**Error handling:**
- Server unreachable → 502 with message
- `tools/list` not supported → empty list + warning
- Response > 1MB → truncate, set `truncated: true`

### 1.5 Register router in `main.py` (MODIFY)

Add tools router with `API_PREFIX`.

### 1.6 Create `tests/test_tools.py` (CREATE)

- `test_list_tools_success` — mock upstream, verify response shape
- `test_list_tools_cached` — second request returns `cached: True`
- `test_list_tools_server_down` — 502 on unreachable server
- `test_invoke_tool_creates_audit_row` — ToolCall row with `caller_agent="mcphub-playground"`
- `test_invoke_tool_member_forbidden` — member role gets 403
- `test_invoke_tool_admin_allowed` — admin succeeds
- `test_workspace_isolation` — cross-workspace server returns 404
- `test_invalidate_cache` — cache deleted, next list fetches fresh

---

## Phase 2: Frontend — Types, API, Hooks

### `types.ts` (MODIFY)

```typescript
interface MCPToolDefinition {
  name: string
  description: string | null
  inputSchema: Record<string, any> | null
}
interface ToolListResponse { tools: MCPToolDefinition[]; server_id: string; cached: boolean }
interface ToolInvokeRequest { tool_name: string; arguments: Record<string, any> }
interface ToolInvokeResponse {
  tool_name: string; status: 'success' | 'error'; result: any | null
  error: string | null; duration_ms: number; tool_call_id: string; truncated: boolean
}
```

### `api.ts` (MODIFY)

```typescript
getServerTools(serverId)          // GET /servers/{id}/tools
invokeServerTool(serverId, body)  // POST /servers/{id}/tools/invoke
invalidateToolsCache(serverId)    // DELETE /servers/{id}/tools/cache
```

### `hooks.ts` (MODIFY)

- `QK.serverTools(serverId)` → `['servers', serverId, 'tools']`
- `useServerTools(serverId)` — staleTime 5min
- `useInvokeTool()` — invalidates `['tool-calls']` on success
- `useInvalidateToolsCache()` — invalidates serverTools query key on success

---

## Phase 3: Frontend Components

### `ToolsTab.tsx` (CREATE)

Tab content for server detail page:
- Uses `useServerTools(serverId)`
- Search input to filter tools by name/description
- "Refresh" button + "Cached" badge if `cached: true`
- Grid of `ToolCard` components
- States: loading skeleton, empty state, error state

### `ToolCard.tsx` (CREATE)

Single tool display card:
- Tool name (monospace), description, param count summary ("3 params, 2 required")
- "Test" button — only shown for admin/owner (checks `role` from `useAuth()`)
- Opens `ToolPlayground` dialog

### `ToolPlayground.tsx` (CREATE)

Test dialog:
- **Form mode** (default): renders `SchemaForm` from inputSchema
- **Raw JSON mode**: textarea for manual JSON input
- Toggle between modes
- "Run" button → `useInvokeTool()` → shows result panel
- Result panel: status badge, duration, formatted JSON output, error display
- "View in audit log" link via returned `tool_call_id`
- Loading state + AbortController cancel support

### `SchemaForm.tsx` (CREATE)

Dynamic JSON Schema → form renderer (flat schemas only in v1):

| JSON Schema type | Form element |
|---|---|
| `string` | `<Input type="text">` |
| `number` / `integer` | `<Input type="number">` |
| `boolean` | `<Switch>` |
| `string` + `enum` | `<Select>` |
| `object` / `array` / complex | Fall back to JSON textarea |

- Required fields marked with asterisk, validated before submit
- Default values from schema `default`
- Descriptions as helper text
- No inputSchema → "No arguments needed" + Run button enabled

---

## Phase 4: Integrate in Server Detail Page

**`frontend/src/app/servers/[id]/page.tsx`** (MODIFY)

- Add "Tools" tab as the **first** tab (default selected)
- Tab trigger shows count badge: `Tools (N)`
- Tab order: **Tools** | Tool Calls | Alert Events
- Import and mount `<ToolsTab serverId={id} />`

---

## Phase 5: Demo Mode

### `demo-data.ts` (MODIFY)

Add `DEMO_SERVER_TOOLS: Record<string, MCPToolDefinition[]>` — 3–5 realistic tools per demo server with full JSON Schema `inputSchema`:
- `github-mcp`: search_repositories, get_pull_request, create_issue
- `slack-mcp`: send_message, list_channels, search_messages
- `jira-mcp`: search_issues, create_ticket, get_board
- etc.

### `demo-mode.ts` (MODIFY)

Add route matchers:
- `GET /servers/{id}/tools` → `{ tools: DEMO_SERVER_TOOLS[id], cached: true }`
- `POST /servers/{id}/tools/invoke` → mock success response (whitelisted before DemoModeError block, like probe)
- `DELETE /servers/{id}/tools/cache` → whitelisted no-op

---

## Edge Cases

| Edge Case | Handling |
|---|---|
| Server unreachable | 502; UI shows error state with retry button |
| `tools/list` not supported | Return empty list with explanatory banner |
| Tool invocation timeout | 120s timeout; frontend shows cancel button |
| Response > 1MB | Truncate, `truncated: true` flag; UI notice |
| Complex nested schemas | Fall back to Raw JSON textarea in v1 |
| No input parameters | "No arguments needed" + Run immediately |
| Expired/invalid auth | Forward upstream error to result panel |
| SSE response format | Reuses existing `parse_sse()` |
| Concurrent invocations | Disable Run button while pending |

---

## File Change Summary

| File | Action |
|---|---|
| `backend/app/utils/mcp_client.py` | MODIFY — add `parse_sse`, `get_session_id`, `send_mcp_request` |
| `backend/app/routers/proxy.py` | MODIFY — import shared functions, remove local defs |
| `backend/app/schemas/tools.py` | CREATE |
| `backend/app/routers/tools.py` | CREATE |
| `backend/app/main.py` | MODIFY — register tools router |
| `backend/tests/test_tools.py` | CREATE |
| `frontend/src/lib/types.ts` | MODIFY — add tool playground types |
| `frontend/src/lib/api.ts` | MODIFY — add 3 API functions |
| `frontend/src/lib/hooks.ts` | MODIFY — add QK + 3 hooks |
| `frontend/src/components/servers/ToolsTab.tsx` | CREATE |
| `frontend/src/components/servers/ToolCard.tsx` | CREATE |
| `frontend/src/components/servers/ToolPlayground.tsx` | CREATE |
| `frontend/src/components/servers/SchemaForm.tsx` | CREATE |
| `frontend/src/app/servers/[id]/page.tsx` | MODIFY — add "Tools" tab |
| `frontend/src/lib/demo-data.ts` | MODIFY — add mock tool definitions |
| `frontend/src/lib/demo-mode.ts` | MODIFY — add route matchers |

## Implementation Order

1. `backend/app/utils/mcp_client.py` — shared utilities
2. `backend/app/routers/proxy.py` — update imports
3. `backend/app/schemas/tools.py`
4. `backend/app/routers/tools.py`
5. `backend/app/main.py`
6. `backend/tests/test_tools.py`
7. `frontend/src/lib/types.ts`
8. `frontend/src/lib/api.ts`
9. `frontend/src/lib/hooks.ts`
10. `frontend/src/components/servers/SchemaForm.tsx`
11. `frontend/src/components/servers/ToolCard.tsx`
12. `frontend/src/components/servers/ToolPlayground.tsx`
13. `frontend/src/components/servers/ToolsTab.tsx`
14. `frontend/src/app/servers/[id]/page.tsx`
15. `frontend/src/lib/demo-data.ts`
16. `frontend/src/lib/demo-mode.ts`
