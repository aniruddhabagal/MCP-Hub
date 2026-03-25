"""Async utility to probe an MCP server endpoint.

Sends a JSON-RPC 2.0 `initialize` request and measures round-trip latency.
Returns a ProbeResult regardless of outcome — never raises.
"""
import base64
import time
from dataclasses import dataclass
from typing import Any

import httpx

PROBE_TIMEOUT = 10.0  # seconds

# MCP Streamable HTTP transport (2025-03-26 spec) requires both content types in Accept.
PROBE_HEADERS = {
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


async def probe_server(
    endpoint: str,
    auth_headers: dict[str, str] | None = None,
) -> ProbeResult:
    """Send a JSON-RPC initialize probe to *endpoint* and return a ProbeResult."""
    headers = {**PROBE_HEADERS, **(auth_headers or {})}
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
