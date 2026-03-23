"""Tests for analytics aggregator and analytics API endpoints."""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.analytics_aggregator import run_aggregate_analytics
from app.models.server import MCPServer
from app.models.tool_call import ToolCall

pytestmark = pytest.mark.asyncio


async def _make_server(db, name="Analytics Server"):
    server = MCPServer(id=uuid.uuid4(), name=name, endpoint="http://mock.internal/mcp")
    db.add(server)
    await db.flush()
    return server


async def _make_call(db, server_id, tool_name="search", status="success", duration_ms=50.0, output_size_bytes=100):
    tc = ToolCall(
        id=uuid.uuid4(),
        server_id=server_id,
        tool_name=tool_name,
        status=status,
        duration_ms=duration_ms,
        output_size_bytes=output_size_bytes,
        called_at=datetime.now(timezone.utc),
    )
    db.add(tc)
    await db.flush()
    return tc


async def _create_server_via_api(client, name="API Server"):
    resp = await client.post("/api/v1/servers", json={"name": name, "endpoint": "http://mock.internal/mcp"})
    assert resp.status_code == 201
    return resp.json()


# ── Aggregator unit tests ─────────────────────────────────────────────────────

async def test_aggregate_no_calls(db_session):
    result = await run_aggregate_analytics(db_session)
    assert result["snapshots"] == 0


async def test_aggregate_creates_snapshots(db_session):
    server = await _make_server(db_session)
    await _make_call(db_session, server.id, tool_name="search", duration_ms=100.0)
    await _make_call(db_session, server.id, tool_name="search", duration_ms=200.0)
    await _make_call(db_session, server.id, tool_name="fetch", duration_ms=50.0, status="error")

    result = await run_aggregate_analytics(db_session)
    # 2 distinct (server, tool) combinations → 2 snapshots
    assert result["snapshots"] == 2
    assert result["windows_written"] >= 1


async def test_aggregate_error_count(db_session):
    from sqlalchemy import select
    from app.models.analytics import AnalyticsSnapshot

    server = await _make_server(db_session)
    await _make_call(db_session, server.id, tool_name="run", status="success")
    await _make_call(db_session, server.id, tool_name="run", status="error")
    await _make_call(db_session, server.id, tool_name="run", status="error")

    await run_aggregate_analytics(db_session)

    snaps = (await db_session.execute(
        select(AnalyticsSnapshot).where(AnalyticsSnapshot.server_id == server.id)
    )).scalars().all()

    snap = next(s for s in snaps if s.tool_name == "run")
    assert snap.call_count == 3
    assert snap.error_count == 2


# ── Analytics API endpoint tests ──────────────────────────────────────────────

async def _no_redis(monkeypatch):
    """Patch Redis cache to always miss so tests hit the DB."""
    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        yield


async def test_top_tools_empty(client):
    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        resp = await client.get("/api/v1/analytics/top-tools")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_top_tools_returns_data(client):
    server = await _create_server_via_api(client)
    sid = server["id"]

    for _ in range(3):
        await client.post("/api/v1/tool-calls", json={
            "server_id": sid, "tool_name": "search", "status": "success", "duration_ms": 100.0
        })
    await client.post("/api/v1/tool-calls", json={
        "server_id": sid, "tool_name": "fetch", "status": "error", "duration_ms": 50.0
    })

    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        resp = await client.get("/api/v1/analytics/top-tools?limit=10&hours=24")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    # "search" has 3 calls, should be first
    assert data[0]["tool_name"] == "search"
    assert data[0]["call_count"] == 3
    assert data[0]["error_rate"] == 0.0
    # "fetch" has 1 error
    fetch = next(d for d in data if d["tool_name"] == "fetch")
    assert fetch["error_rate"] == 100.0


async def test_error_rates_empty(client):
    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        resp = await client.get("/api/v1/analytics/error-rates")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_latency_stats(client):
    server = await _create_server_via_api(client)
    sid = server["id"]

    await client.post("/api/v1/tool-calls", json={
        "server_id": sid, "tool_name": "slow_tool", "status": "success", "duration_ms": 500.0
    })
    await client.post("/api/v1/tool-calls", json={
        "server_id": sid, "tool_name": "slow_tool", "status": "success", "duration_ms": 300.0
    })

    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        resp = await client.get("/api/v1/analytics/latency")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["tool_name"] == "slow_tool"
    assert data[0]["avg_latency_ms"] == pytest.approx(400.0)


async def test_volume_heatmap_empty(client):
    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        resp = await client.get("/api/v1/analytics/volume")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_volume_heatmap_buckets(client):
    server = await _create_server_via_api(client)
    sid = server["id"]

    for _ in range(4):
        await client.post("/api/v1/tool-calls", json={
            "server_id": sid, "tool_name": "tool", "status": "success"
        })

    with patch("app.routers.analytics._cache_get", new=AsyncMock(return_value=None)), \
         patch("app.routers.analytics._cache_set", new=AsyncMock()):
        resp = await client.get("/api/v1/analytics/volume?hours=1&bucket_minutes=60")

    assert resp.status_code == 200
    data = resp.json()
    total_calls = sum(b["call_count"] for b in data)
    assert total_calls == 4


async def test_aggregate_analytics_endpoint_authorized(client):
    from app.config import settings

    resp = await client.post(
        "/api/v1/admin/aggregate-analytics",
        headers={"Authorization": f"Bearer {settings.cron_secret}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "snapshots" in data
