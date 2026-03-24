"""Tests for the alert evaluator agent and alert API endpoints."""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.alert_evaluator import run_evaluate_alerts
from app.models.alert import AlertEvent, AlertRule
from app.models.health_check import HealthCheck
from app.models.server import MCPServer
from tests.conftest import TEST_WORKSPACE_ID

pytestmark = pytest.mark.asyncio


async def _make_server(db, name="Alert Test Server", workspace_id=TEST_WORKSPACE_ID):
    server = MCPServer(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        name=name,
        endpoint="http://mock.internal/mcp",
    )
    db.add(server)
    await db.flush()
    return server


async def _make_rule(
    db,
    server_id=None,
    metric="error_rate",
    operator="gt",
    threshold=50.0,
    window_minutes=60,
    workspace_id=TEST_WORKSPACE_ID,
):
    rule = AlertRule(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        name=f"Test {metric} rule",
        server_id=server_id,
        metric=metric,
        operator=operator,
        threshold=threshold,
        window_minutes=window_minutes,
        enabled=True,
    )
    db.add(rule)
    await db.flush()
    return rule


async def _make_check(db, server_id, status="healthy", latency_ms=50.0, workspace_id=TEST_WORKSPACE_ID):
    check = HealthCheck(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        server_id=server_id,
        status=status,
        latency_ms=latency_ms,
        checked_at=datetime.now(timezone.utc),
    )
    db.add(check)
    await db.flush()
    return check


# ── Alert evaluator unit tests ────────────────────────────────────────────────

async def test_evaluate_no_rules(db_session):
    results = await run_evaluate_alerts(db_session)
    assert results == []


async def test_evaluate_no_data_skipped(db_session):
    await _make_rule(db_session)
    results = await run_evaluate_alerts(db_session)
    assert len(results) == 1
    assert results[0]["skipped"] is True


async def test_evaluate_error_rate_fires(db_session):
    server = await _make_server(db_session)
    rule = await _make_rule(db_session, server_id=server.id, metric="error_rate", operator="gt", threshold=50.0)

    for _ in range(3):
        await _make_check(db_session, server.id, status="down", latency_ms=None)
    await _make_check(db_session, server.id, status="healthy")

    with patch("app.agents.alert_evaluator.notify_alert_fired", new=AsyncMock()):
        results = await run_evaluate_alerts(db_session)

    assert results[0]["state"] == "fired"
    assert results[0]["value"] == pytest.approx(75.0)

    from sqlalchemy import select
    evts = (await db_session.execute(select(AlertEvent).where(AlertEvent.rule_id == rule.id))).scalars().all()
    assert len(evts) == 1
    assert evts[0].state == "fired"
    assert evts[0].workspace_id == TEST_WORKSPACE_ID


async def test_evaluate_error_rate_not_exceeded(db_session):
    server = await _make_server(db_session)
    await _make_rule(db_session, server_id=server.id, metric="error_rate", operator="gt", threshold=50.0)

    await _make_check(db_session, server.id, status="down", latency_ms=None)
    for _ in range(3):
        await _make_check(db_session, server.id, status="healthy")

    results = await run_evaluate_alerts(db_session)
    assert results[0]["state"] == "ok"


async def test_evaluate_availability_fires(db_session):
    server = await _make_server(db_session)
    await _make_rule(db_session, server_id=server.id, metric="availability", operator="lt", threshold=80.0)

    await _make_check(db_session, server.id, status="healthy")
    for _ in range(4):
        await _make_check(db_session, server.id, status="down", latency_ms=None)

    with patch("app.agents.alert_evaluator.notify_alert_fired", new=AsyncMock()):
        results = await run_evaluate_alerts(db_session)

    assert results[0]["state"] == "fired"
    assert results[0]["value"] == pytest.approx(20.0)


async def test_evaluate_latency_p95_fires(db_session):
    server = await _make_server(db_session)
    await _make_rule(db_session, server_id=server.id, metric="latency_p95", operator="gt", threshold=200.0)

    for _ in range(19):
        await _make_check(db_session, server.id, latency_ms=50.0)
    await _make_check(db_session, server.id, latency_ms=500.0)

    with patch("app.agents.alert_evaluator.notify_alert_fired", new=AsyncMock()):
        results = await run_evaluate_alerts(db_session)

    assert results[0]["state"] == "fired"


async def test_evaluate_resolves_open_alert(db_session):
    server = await _make_server(db_session)
    rule = await _make_rule(db_session, server_id=server.id, metric="error_rate", operator="gt", threshold=50.0)

    fired_event = AlertEvent(
        id=uuid.uuid4(),
        workspace_id=TEST_WORKSPACE_ID,
        rule_id=rule.id,
        server_id=server.id,
        state="fired",
        value=75.0,
        fired_at=datetime.now(timezone.utc),
    )
    db_session.add(fired_event)
    await db_session.flush()

    for _ in range(4):
        await _make_check(db_session, server.id, status="healthy")

    with patch("app.agents.alert_evaluator.notify_alert_resolved", new=AsyncMock()):
        results = await run_evaluate_alerts(db_session)

    assert results[0]["state"] == "resolved"

    from sqlalchemy import select
    evts = (await db_session.execute(select(AlertEvent).where(AlertEvent.rule_id == rule.id))).scalars().all()
    states = {e.state for e in evts}
    assert "fired" in states
    assert "resolved" in states


async def test_evaluate_disabled_rule_skipped(db_session):
    server = await _make_server(db_session)
    rule = AlertRule(
        id=uuid.uuid4(),
        workspace_id=TEST_WORKSPACE_ID,
        name="Disabled rule",
        server_id=server.id,
        metric="error_rate",
        operator="gt",
        threshold=0.0,
        enabled=False,
    )
    db_session.add(rule)
    await db_session.flush()
    await _make_check(db_session, server.id, status="down", latency_ms=None)

    results = await run_evaluate_alerts(db_session)
    assert results == []


async def test_evaluate_workspace_scoped(db_session):
    """run_evaluate_alerts(workspace_id=X) should not evaluate rules from other workspaces."""
    other_ws = uuid.uuid4()
    server_mine = await _make_server(db_session, workspace_id=TEST_WORKSPACE_ID)
    server_other = await _make_server(db_session, name="Other", workspace_id=other_ws)

    await _make_rule(db_session, server_id=server_mine.id, workspace_id=TEST_WORKSPACE_ID)
    await _make_rule(db_session, server_id=server_other.id, workspace_id=other_ws)

    results = await run_evaluate_alerts(db_session, workspace_id=TEST_WORKSPACE_ID)
    # Only the rule scoped to TEST_WORKSPACE_ID should be evaluated
    assert len(results) == 1


# ── Alert Rules API tests ─────────────────────────────────────────────────────

async def test_alert_rules_empty(client):
    resp = await client.get("/api/v1/alerts/rules")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_alert_rule(client):
    payload = {
        "name": "High error rate",
        "metric": "error_rate",
        "operator": "gt",
        "threshold": 25.0,
        "window_minutes": 10,
    }
    resp = await client.post("/api/v1/alerts/rules", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "High error rate"
    assert data["metric"] == "error_rate"
    assert data["threshold"] == 25.0
    assert data["server_id"] is None


async def test_get_alert_rule(client):
    create = await client.post("/api/v1/alerts/rules", json={
        "name": "r1", "metric": "availability", "operator": "lt", "threshold": 90.0
    })
    rule_id = create.json()["id"]
    resp = await client.get(f"/api/v1/alerts/rules/{rule_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == rule_id


async def test_get_alert_rule_not_found(client):
    resp = await client.get(f"/api/v1/alerts/rules/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_update_alert_rule(client):
    create = await client.post("/api/v1/alerts/rules", json={
        "name": "r2", "metric": "error_rate", "operator": "gt", "threshold": 50.0
    })
    rule_id = create.json()["id"]

    resp = await client.patch(f"/api/v1/alerts/rules/{rule_id}", json={"threshold": 75.0, "enabled": False})
    assert resp.status_code == 200
    data = resp.json()
    assert data["threshold"] == 75.0
    assert data["enabled"] is False


async def test_delete_alert_rule(client):
    create = await client.post("/api/v1/alerts/rules", json={
        "name": "r3", "metric": "error_rate", "operator": "gt", "threshold": 10.0
    })
    rule_id = create.json()["id"]

    resp = await client.delete(f"/api/v1/alerts/rules/{rule_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/alerts/rules/{rule_id}")
    assert resp.status_code == 404


async def test_alert_events_empty(client):
    resp = await client.get("/api/v1/alerts/events")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_evaluate_alerts_endpoint_unauthorized(client):
    resp = await client.post("/api/v1/admin/evaluate-alerts")
    assert resp.status_code == 401


async def test_evaluate_alerts_endpoint_authorized(client):
    from app.config import settings

    resp = await client.post(
        "/api/v1/admin/evaluate-alerts",
        headers={"Authorization": f"Bearer {settings.cron_secret}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["evaluated"] == 0
    assert data["results"] == []
