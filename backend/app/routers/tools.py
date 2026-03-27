"""Tool Playground endpoints — dynamic tool discovery and testing.

GET    /servers/{server_id}/tools          — Fetch tool list from MCP server (cached)
POST   /servers/{server_id}/tools/invoke   — Invoke a tool, log to tool_calls
DELETE /servers/{server_id}/tools/cache    — Invalidate cached tool list

Auth:
  - GET:    any workspace member (L1+)
  - POST/DELETE: admin or owner (L2+)
"""
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Tuple

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_workspace_id, require_role
from app.models.server import MCPServer
from app.models.tool_call import ToolCall
from app.models.user import User
from app.models.workspace import Workspace
from app.redis_client import get_redis
from app.schemas.tools import (
    ToolDefinition,
    ToolInvokeRequest,
    ToolInvokeResponse,
    ToolListResponse,
)
from app.utils.mcp_client import build_auth_headers, send_mcp_request

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tools"])

_CACHE_TTL = 300        # 5 minutes — matches analytics cache
_MAX_RESULT_BYTES = 1_048_576  # 1 MB result truncation cap
_CALLER_AGENT = "mcphub-playground"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cache_key(workspace_id: uuid.UUID, server_id: uuid.UUID) -> str:
    return f"tools:{workspace_id}:{server_id}"


async def _get_server(
    server_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> MCPServer:
    server = await db.get(MCPServer, server_id)
    if server is None or server.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    return server


async def _cache_get(key: str) -> list | None:
    try:
        redis = await get_redis()
        raw = await redis.get(key)
        if raw:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis cache get failed: %s", exc)
    return None


async def _cache_set(key: str, data: list) -> None:
    try:
        redis = await get_redis()
        await redis.setex(key, _CACHE_TTL, json.dumps(data, default=str))
    except Exception as exc:
        logger.warning("Redis cache set failed: %s", exc)


async def _cache_delete(key: str) -> None:
    try:
        redis = await get_redis()
        await redis.delete(key)
    except Exception as exc:
        logger.warning("Redis cache delete failed: %s", exc)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/servers/{server_id}/tools", response_model=ToolListResponse)
async def list_server_tools(
    server_id: uuid.UUID,
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
) -> ToolListResponse:
    """Fetch available tools from the registered MCP server.

    Results are cached in Redis for 5 minutes. The ``cached`` flag in the
    response indicates whether the response was served from cache.
    """
    server = await _get_server(server_id, workspace_id, db)

    # Check Redis cache first
    key = _cache_key(workspace_id, server_id)
    cached_data = await _cache_get(key)
    if cached_data is not None:
        tools = [ToolDefinition(**t) for t in cached_data]
        return ToolListResponse(tools=tools, server_id=server_id, cached=True)

    # Fetch from MCP server
    auth_headers = build_auth_headers(server.auth_type, server.auth_credentials)
    result, _duration_ms, error = await send_mcp_request(
        endpoint=server.endpoint,
        method="tools/list",
        params={},
        auth_headers=auth_headers,
    )

    if error is not None:
        # If the server is reachable but doesn't support tools/list, return empty list
        # rather than a hard error, so the UI can show a helpful message.
        logger.warning("tools/list failed for server %s: %s", server_id, error)
        if "timed out" in error.lower() or "connect" in error.lower():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Server unreachable: {error}",
            )
        # JSON-RPC error (method not found, etc.) → return empty list
        return ToolListResponse(tools=[], server_id=server_id, cached=False)

    # Parse the tools/list result — MCP spec: {"tools": [...]}
    raw_tools: list[dict[str, Any]] = []
    if isinstance(result, dict):
        raw_tools = result.get("tools", [])
    elif isinstance(result, list):
        raw_tools = result

    tools = [
        ToolDefinition(
            name=t.get("name", ""),
            description=t.get("description"),
            inputSchema=t.get("inputSchema"),
        )
        for t in raw_tools
        if isinstance(t, dict) and t.get("name")
    ]

    # Populate cache
    await _cache_set(key, [t.model_dump() for t in tools])

    return ToolListResponse(tools=tools, server_id=server_id, cached=False)


@router.post("/servers/{server_id}/tools/invoke", response_model=ToolInvokeResponse)
async def invoke_server_tool(
    server_id: uuid.UUID,
    body: ToolInvokeRequest,
    ctx: Tuple[User, Workspace, str] = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
) -> ToolInvokeResponse:
    """Invoke a tool on the registered MCP server and log the call.

    The invocation is recorded in the ``tool_calls`` table with
    ``caller_agent='mcphub-playground'`` so it is visible in the audit log.
    Requires admin or owner role.
    """
    _user, workspace, _role = ctx
    workspace_id = workspace.id

    server = await _get_server(server_id, workspace_id, db)
    auth_headers = build_auth_headers(server.auth_type, server.auth_credentials)

    result, duration_ms, error = await send_mcp_request(
        endpoint=server.endpoint,
        method="tools/call",
        params={"name": body.tool_name, "arguments": body.arguments},
        auth_headers=auth_headers,
    )

    call_status = "error" if error else "success"

    # Truncate oversized results
    truncated = False
    if result is not None:
        result_str = json.dumps(result, default=str)
        if len(result_str.encode()) > _MAX_RESULT_BYTES:
            truncated = True
            # Return first 1MB worth of characters
            result = result_str[:_MAX_RESULT_BYTES]

    # Serialize result for output size measurement
    result_bytes = json.dumps(result, default=str).encode() if result is not None else b""
    output_size = len(result_bytes)

    # Log to tool_calls audit table
    tc_id = uuid.uuid4()
    tc = ToolCall(
        id=tc_id,
        workspace_id=workspace_id,
        server_id=server_id,
        tool_name=body.tool_name,
        caller_agent=_CALLER_AGENT,
        input_payload=body.arguments or None,
        output_size_bytes=output_size,
        duration_ms=round(duration_ms, 2),
        status=call_status,
        error=error,
        called_at=datetime.now(timezone.utc),
    )
    db.add(tc)
    await db.flush()

    return ToolInvokeResponse(
        tool_name=body.tool_name,
        status=call_status,
        result=result,
        error=error,
        duration_ms=round(duration_ms, 2),
        tool_call_id=tc_id,
        truncated=truncated,
    )


@router.delete("/servers/{server_id}/tools/cache", status_code=status.HTTP_204_NO_CONTENT)
async def invalidate_tools_cache(
    server_id: uuid.UUID,
    ctx: Tuple[User, Workspace, str] = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Force-invalidate the cached tool list for a server.

    Requires admin or owner role.
    """
    _user, workspace, _role = ctx
    workspace_id = workspace.id

    # Verify server belongs to workspace
    await _get_server(server_id, workspace_id, db)

    key = _cache_key(workspace_id, server_id)
    await _cache_delete(key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
