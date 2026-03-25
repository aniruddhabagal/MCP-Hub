"""Transparent MCP reverse proxy — workspace-scoped.

POST /proxy/{server_id}/mcp — forwards the raw JSON-RPC 2.0 request to the
registered server's endpoint, logs every tools/call invocation as a ToolCall
row, and streams the upstream response back unchanged.

Auth: JWT Bearer or X-API-Key header (get_workspace_from_any_auth).
The server must belong to the caller's workspace.
"""
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_workspace_from_any_auth
from app.models.server import MCPServer
from app.models.tool_call import ToolCall

router = APIRouter(prefix="/proxy", tags=["proxy"])

_INIT_TIMEOUT = 15.0
_PROXY_TIMEOUT = 120.0

_INIT_PAYLOAD = {
    "jsonrpc": "2.0",
    "id": 0,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "mcphub-proxy", "version": "1.0.0"},
    },
}


def _parse_sse(raw: bytes) -> bytes:
    try:
        text = raw.decode("utf-8", errors="replace")
        parts: list[str] = []
        for line in text.splitlines():
            if line.startswith("data:"):
                parts.append(line[5:].strip())
        if parts:
            combined = "".join(parts)
            json.loads(combined)
            return combined.encode("utf-8")
    except Exception:
        pass
    return raw


async def _get_session_id(endpoint: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=_INIT_TIMEOUT) as client:
            resp = await client.post(
                endpoint,
                json=_INIT_PAYLOAD,
                headers={"Content-Type": "application/json"},
            )
        return resp.headers.get("mcp-session-id")
    except Exception:
        return None


async def _get_server_in_workspace(
    server_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> MCPServer:
    server = await db.get(MCPServer, server_id)
    if server is None or server.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    return server


async def _log_tool_call(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    server_id: uuid.UUID,
    tool_name: str,
    caller_agent: str | None,
    input_payload: dict[str, Any] | None,
    duration_ms: float,
    response_body: bytes,
    call_status: str,
    error: str | None,
) -> None:
    tc = ToolCall(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        server_id=server_id,
        tool_name=tool_name,
        caller_agent=caller_agent,
        input_payload=input_payload,
        output_size_bytes=len(response_body),
        duration_ms=duration_ms,
        status=call_status,
        error=error,
        called_at=datetime.now(timezone.utc),
    )
    db.add(tc)
    await db.flush()


@router.post("/{server_id}/mcp")
async def proxy_mcp(
    server_id: uuid.UUID,
    request: Request,
    workspace_id: uuid.UUID = Depends(get_workspace_from_any_auth),
    db: AsyncSession = Depends(get_db),
):
    server = await _get_server_in_workspace(server_id, workspace_id, db)

    body_bytes = await request.body()
    try:
        body_json: dict[str, Any] = await request.json()
    except Exception:
        body_json = {}

    method: str = body_json.get("method", "")
    params: dict = body_json.get("params", {}) or {}
    tool_name: str = params.get("name", method) if method == "tools/call" else method
    caller_agent: str | None = request.headers.get("X-Caller-Agent")

    start = time.monotonic()
    call_status = "success"
    error_msg: str | None = None
    response_body = b""

    try:
        upstream_headers: dict[str, str] = {"Content-Type": "application/json"}
        if method != "initialize":
            session_id = await _get_session_id(server.endpoint)
            if session_id:
                upstream_headers["mcp-session-id"] = session_id

        async with httpx.AsyncClient(timeout=_PROXY_TIMEOUT) as client:
            upstream = await client.post(
                server.endpoint,
                content=body_bytes,
                headers=upstream_headers,
            )

        response_body = upstream.content
        content_type = upstream.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            response_body = _parse_sse(response_body)

        if upstream.status_code >= 500:
            call_status = "error"
            error_msg = f"Upstream HTTP {upstream.status_code}"
    except httpx.TimeoutException:
        call_status = "error"
        error_msg = "Upstream request timed out"
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=error_msg)
    except httpx.RequestError as exc:
        call_status = "error"
        error_msg = str(exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=error_msg)
    finally:
        duration_ms = (time.monotonic() - start) * 1000
        if method == "tools/call" or method.startswith("tools/"):
            await _log_tool_call(
                db=db,
                workspace_id=workspace_id,
                server_id=server_id,
                tool_name=tool_name,
                caller_agent=caller_agent,
                input_payload=params.get("arguments") if method == "tools/call" else None,
                duration_ms=duration_ms,
                response_body=response_body,
                call_status=call_status,
                error=error_msg,
            )

    response_content_type = upstream.headers.get("content-type", "application/json")
    if "text/event-stream" in response_content_type:
        response_content_type = "application/json"

    return Response(
        content=response_body,
        status_code=upstream.status_code,
        media_type=response_content_type,
    )
