"""Health Prober agent.

Fetches all registered MCP servers, probes each one concurrently,
writes a health_check row, and updates the server's status field.
Invoked on-demand via POST /api/v1/admin/probe-all.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.health_check import HealthCheck
from app.models.server import MCPServer
from app.redis_client import get_redis
from app.utils.mcp_client import probe_server

logger = logging.getLogger(__name__)
CHANNEL = "mcphub:dashboard"


async def _probe_one(server: MCPServer, db: AsyncSession) -> dict:
    result = await probe_server(server.endpoint)

    check = HealthCheck(
        id=uuid.uuid4(),
        server_id=server.id,
        status=result.status,
        latency_ms=result.latency_ms,
        status_code=result.status_code,
        error=result.error,
        checked_at=datetime.now(timezone.utc),
    )
    db.add(check)
    server.status = result.status

    return {
        "server_id": str(server.id),
        "server_name": server.name,
        "status": result.status,
        "latency_ms": result.latency_ms,
        "error": result.error,
    }


async def run_probe_all(db: AsyncSession) -> list[dict]:
    """Probe every server concurrently and persist results. Returns a summary list."""
    result = await db.execute(select(MCPServer))
    servers = result.scalars().all()

    if not servers:
        return []

    tasks = [_probe_one(server, db) for server in servers]
    summaries = await asyncio.gather(*tasks)
    await db.flush()

    # Publish event to dashboard WebSocket clients
    try:
        redis = await get_redis()
        payload = json.dumps({"type": "probe_complete", "results": list(summaries)})
        await redis.publish(CHANNEL, payload)
    except Exception as exc:
        logger.warning("Failed to publish probe_complete event: %s", exc)

    return list(summaries)
