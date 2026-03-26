"""Async utility for MCP server communication.

Provides:
- probe_server()       — JSON-RPC initialize probe (health check)
- build_auth_headers() — Convert server auth config to HTTP headers
- parse_sse()          — Extract JSON from SSE stream bytes
- get_session_id()     — Initialize handshake to obtain mcp-session-id
- send_mcp_request()   — General-purpose JSON-RPC 2.0 request
"""
import base64
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any

import httpx

PROBE_TIMEOUT = 10.0   # seconds — used for health probes
_INIT_TIMEOUT = 15.0   # seconds — used for session ID fetch
MCP_TIMEOUT   = 120.0  # seconds — default for tool list / invoke

# MCP Streamable HTTP transport (2025-03-26 spec) requires both content types in Accept.
_MCP_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}

INIT_PAYLOAD = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "mcphub-prober", "version": "0.1.0"},
    },
}

# Shared initialize payload used for session-ID acquisition
_SESSION_INIT_PAYLOAD = {
    "jsonrpc": "2.0",
    "id": 0,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "mcphub-proxy", "version": "1.0.0"},
    },
}


@dataclass
class ProbeResult:
    status: str          # "healthy" | "degraded" | "down"
    latency_ms: float | None
    status_code: int | None
    error: str | None


def build_auth_headers(
    auth_type: str | None,
    auth_credentials: dict[str, Any] | None,
) -> dict[str, str]:
    """Build HTTP headers from a server's auth configuration."""
    if not auth_type or auth_type == "none" or not auth_credentials:
        return {}

    if auth_type == "bearer":
        token = auth_credentials.get("token", "")
        if token:
            return {"Authorization": f"Bearer {token}"}

    elif auth_type == "api_key_header":
        header_name = auth_credentials.get("header_name", "")
        header_value = auth_credentials.get("header_value", "")
        if header_name and header_value:
            return {header_name: header_value}

    elif auth_type == "basic":
        username = auth_credentials.get("username", "")
        password = auth_credentials.get("password", "")
        if username:
            encoded = base64.b64encode(f"{username}:{password}".encode()).decode()
            return {"Authorization": f"Basic {encoded}"}

    return {}


def parse_sse(raw: bytes) -> bytes:
    """Extract JSON payload from an SSE (text/event-stream) response body.

    Scans for ``data: <json>`` lines, concatenates them, and validates JSON.
    Falls back to returning *raw* unchanged if parsing fails.
    """
    try:
        text = raw.decode("utf-8", errors="replace")
        parts: list[str] = []
        for line in text.splitlines():
            if line.startswith("data:"):
                parts.append(line[5:].strip())
        if parts:
            combined = "".join(parts)
            json.loads(combined)  # validate
            return combined.encode("utf-8")
    except Exception:
        pass
    return raw


async def get_session_id(
    endpoint: str,
    extra_headers: dict[str, str] | None = None,
) -> str | None:
    """Send an initialize handshake and return the ``mcp-session-id`` header value.

    Returns ``None`` if the server doesn't issue a session ID or the request fails.
    """
    try:
        headers = {**_MCP_HEADERS, **(extra_headers or {})}
        async with httpx.AsyncClient(timeout=_INIT_TIMEOUT) as client:
            resp = await client.post(
                endpoint,
                json=_SESSION_INIT_PAYLOAD,
                headers=headers,
            )
        return resp.headers.get("mcp-session-id")
    except Exception:
        return None


async def send_mcp_request(
    endpoint: str,
    method: str,
    params: dict[str, Any] | None = None,
    auth_headers: dict[str, str] | None = None,
    timeout: float = MCP_TIMEOUT,
) -> tuple[Any, float, str | None]:
    """Send a JSON-RPC 2.0 request to an MCP server.

    Handles session-ID acquisition, SSE response parsing, timeouts, and errors.

    Returns:
        (result, duration_ms, error_or_none)
        - ``result``: Parsed JSON value from the ``result`` key of the JSON-RPC
          response, or ``None`` on error.
        - ``duration_ms``: Round-trip time in milliseconds.
        - ``error_or_none``: Human-readable error string, or ``None`` on success.
    """
    server_auth = auth_headers or {}
    upstream_headers: dict[str, str] = {**_MCP_HEADERS, **server_auth}

    # Acquire session ID for non-initialize methods
    if method != "initialize":
        session_id = await get_session_id(endpoint, extra_headers=server_auth)
        if session_id:
            upstream_headers["mcp-session-id"] = session_id

    payload: dict[str, Any] = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": method,
    }
    if params is not None:
        payload["params"] = params

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(endpoint, json=payload, headers=upstream_headers)
        duration_ms = (time.monotonic() - start) * 1000

        body = resp.content
        content_type = resp.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            body = parse_sse(body)

        if resp.status_code >= 500:
            return None, duration_ms, f"Upstream HTTP {resp.status_code}"

        try:
            data = json.loads(body)
        except Exception:
            return None, duration_ms, f"Invalid JSON response: {body[:200]!r}"

        # JSON-RPC error object
        if "error" in data:
            err = data["error"]
            msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
            return None, duration_ms, msg

        return data.get("result"), duration_ms, None

    except httpx.TimeoutException:
        duration_ms = (time.monotonic() - start) * 1000
        return None, duration_ms, "Request timed out"
    except httpx.RequestError as exc:
        duration_ms = (time.monotonic() - start) * 1000
        return None, duration_ms, str(exc)


async def probe_server(
    endpoint: str,
    auth_headers: dict[str, str] | None = None,
) -> ProbeResult:
    """Send a JSON-RPC initialize probe to *endpoint* and return a ProbeResult."""
    headers = {**_MCP_HEADERS, **(auth_headers or {})}
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=PROBE_TIMEOUT) as client:
            resp = await client.post(endpoint, json=INIT_PAYLOAD, headers=headers)
        latency_ms = (time.perf_counter() - start) * 1000

        # Any 2xx is healthy — servers may return 200 (JSON body) or 202 (SSE stream)
        if 200 <= resp.status_code < 300:
            status = "healthy"
        elif resp.status_code < 500:
            status = "degraded"
        else:
            status = "down"

        return ProbeResult(
            status=status,
            latency_ms=round(latency_ms, 2),
            status_code=resp.status_code,
            error=None,
        )
    except httpx.TimeoutException:
        latency_ms = (time.perf_counter() - start) * 1000
        return ProbeResult(
            status="down",
            latency_ms=round(latency_ms, 2),
            status_code=None,
            error="Probe timed out",
        )
    except Exception as exc:
        latency_ms = (time.perf_counter() - start) * 1000
        return ProbeResult(
            status="down",
            latency_ms=round(latency_ms, 2),
            status_code=None,
            error=str(exc)[:500],
        )
