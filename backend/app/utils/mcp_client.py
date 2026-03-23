"""Async utility to probe an MCP server endpoint.

Sends a JSON-RPC 2.0 `initialize` request and measures round-trip latency.
Returns a ProbeResult regardless of outcome — never raises.
"""
import time
from dataclasses import dataclass

import httpx

PROBE_TIMEOUT = 10.0  # seconds

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


async def probe_server(endpoint: str) -> ProbeResult:
    """Send a JSON-RPC initialize probe to *endpoint* and return a ProbeResult."""
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=PROBE_TIMEOUT) as client:
            resp = await client.post(endpoint, json=INIT_PAYLOAD)
        latency_ms = (time.perf_counter() - start) * 1000

        if resp.status_code == 200:
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
