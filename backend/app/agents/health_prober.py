"""Health Prober agent.

Fetches registered MCP servers (optionally scoped to a workspace), probes each
one concurrently, writes a health_check row, and updates the server's status.
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
from app.utils.mcp_client import build_auth_headers, probe_server

logger = logging.getLogger(__name__)
_GLOBAL_CHANNEL = "mcphub:dashboard"


async def _probe_one(server: MCPServer, db: AsyncSession) -> dict:
    auth_headers = build_auth_headers(server.auth_type, server.auth_credentials)
    result = await probe_server(server.endpoint, auth_headers=auth_headers)

    check = HealthCheck(
        id=uuid.uuid4(),
        server_id=server.id,
        workspace_id=server.workspace_id,
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
        "workspace_id": str(server.workspace_id),
        "status": result.status,
        "latency_ms": result.latency_ms,
        "error": result.error,
    }


async def run_probe_all(
    db: AsyncSession,
    workspace_id: uuid.UUID | None = None,
) -> list[dict]:
    """Probe servers concurrently and persist results.

    If workspace_id is provided, probes only that workspace's servers and
    publishes to the workspace-scoped channel.  When None (cron), probes all
    servers and publishes to per-workspace channels derived from each server.
    """
    q = select(MCPServer)
    if workspace_id is not None:
        q = q.where(MCPServer.workspace_id == workspace_id)
    result = await db.execute(q)
    servers = result.scalars().all()

    if not servers:
        return []

    tasks = [_probe_one(server, db) for server in servers]
    summaries = await asyncio.gather(*tasks)
    await db.flush()

    # Publish per-workspace channels
    try:
        redis = await get_redis()
        if workspace_id is not None:
            channel = f"mcphub:dashboard:{workspace_id}"
            payload = json.dumps({"type": "probe_complete", "results": list(summaries)})
            await redis.publish(channel, payload)
        else:
            # Group summaries by workspace and publish to each channel
            by_workspace: dict[str, list] = {}
            for s in summaries:
                wid = s["workspace_id"]
                by_workspace.setdefault(wid, []).append(s)
            for wid, ws_summaries in by_workspace.items():
                channel = f"mcphub:dashboard:{wid}"
                payload = json.dumps({"type": "probe_complete", "results": ws_summaries})
                await redis.publish(channel, payload)
    except Exception as exc:
        logger.warning("Failed to publish probe_complete event: %s", exc)

    return list(summaries)
