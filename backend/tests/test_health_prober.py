"""Tests for the health prober agent and health API endpoints."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.health_prober import run_probe_all
from app.models.server import MCPServer
from app.utils.mcp_client import ProbeResult
from tests.conftest import TEST_WORKSPACE_ID

pytestmark = pytest.mark.asyncio

HEALTHY_RESULT = ProbeResult(status="healthy", latency_ms=42.0, status_code=200, error=None)
DOWN_RESULT = ProbeResult(status="down", latency_ms=None, status_code=None, error="Connection refused")


async def _create_server(client, name="Test Server", endpoint="http://localhost:9000/mcp"):
    resp = await client.post("/api/v1/servers", json={"name": name, "endpoint": endpoint})
    assert resp.status_code == 201
    return resp.json()


# ── Health prober unit tests ──────────────────────────────────────────────────

async def test_run_probe_all_no_servers(db_session):
    results = await run_probe_all(db_session)
    assert results == []


async def test_run_probe_all_healthy(db_session):
    server = MCPServer(
        id=uuid.uuid4(),
        workspace_id=TEST_WORKSPACE_ID,
        name="Mock Server",
        endpoint="http://mock.internal/mcp",
    )
    db_session.add(server)
    await db_session.flush()

    with patch("app.agents.health_prober.probe_server", new=AsyncMock(return_value=HEALTHY_RESULT)):
        results = await run_probe_all(db_session)

    assert len(results) == 1
    assert results[0]["status"] == "healthy"
    assert results[0]["latency_ms"] == 42.0
    assert server.status == "healthy"


async def test_run_probe_all_down(db_session):
    server = MCPServer(
        id=uuid.uuid4(),
        workspace_id=TEST_WORKSPACE_ID,
        name="Down Server",
        endpoint="http://down.internal/mcp",
    )
    db_session.add(server)
    await db_session.flush()

    with patch("app.agents.health_prober.probe_server", new=AsyncMock(return_value=DOWN_RESULT)):
        results = await run_probe_all(db_session)

    assert results[0]["status"] == "down"
    assert server.status == "down"


async def test_run_probe_all_workspace_scoped(db_session):
    """Probing with a workspace_id should only probe servers in that workspace."""
    other_ws_id = uuid.uuid4()
    server_mine = MCPServer(
        id=uuid.uuid4(),
        workspace_id=TEST_WORKSPACE_ID,
        name="Mine",
        endpoint="http://mine.internal/mcp",
    )
    server_other = MCPServer(
        id=uuid.uuid4(),
        workspace_id=other_ws_id,
        name="Other",
        endpoint="http://other.internal/mcp",
    )
    db_session.add(server_mine)
    db_session.add(server_other)
    await db_session.flush()

    with patch("app.agents.health_prober.probe_server", new=AsyncMock(return_value=HEALTHY_RESULT)):
        results = await run_probe_all(db_session, workspace_id=TEST_WORKSPACE_ID)

    assert len(results) == 1
    assert results[0]["server_id"] == str(server_mine.id)


# ── Health API endpoint tests ─────────────────────────────────────────────────

async def test_health_checks_empty(client):
    resp = await client.get("/api/v1/health/checks")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_health_summary_empty(client):
    resp = await client.get("/api/v1/health/summary")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_probe_all_endpoint_unauthorized(client):
    resp = await client.post("/api/v1/admin/probe-all")
    assert resp.status_code == 401


async def test_probe_all_endpoint_authorized(client):
    from app.config import settings

    await _create_server(client)

    with patch("app.agents.health_prober.probe_server", new=AsyncMock(return_value=HEALTHY_RESULT)):
        resp = await client.post(
            "/api/v1/admin/probe-all",
            headers={"Authorization": f"Bearer {settings.cron_secret}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["probed"] == 1
    assert data["results"][0]["status"] == "healthy"


async def test_health_checks_after_probe(client):
    from app.config import settings

    await _create_server(client)

    with patch("app.agents.health_prober.probe_server", new=AsyncMock(return_value=HEALTHY_RESULT)):
        await client.post(
            "/api/v1/admin/probe-all",
            headers={"Authorization": f"Bearer {settings.cron_secret}"},
        )

    resp = await client.get("/api/v1/health/checks")
    assert resp.status_code == 200
    checks = resp.json()
    assert len(checks) == 1
    assert checks[0]["status"] == "healthy"
    assert checks[0]["latency_ms"] == 42.0
