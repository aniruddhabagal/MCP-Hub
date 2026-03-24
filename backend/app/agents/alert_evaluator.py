"""Alert Evaluator agent.

For each enabled alert rule (optionally scoped to a workspace), computes the
metric over the rule's time window, compares against the threshold, and fires
or resolves AlertEvent rows accordingly.

Invoked on-demand via POST /api/v1/admin/evaluate-alerts.
"""
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import AlertEvent, AlertRule
from app.models.health_check import HealthCheck
from app.models.server import MCPServer
from app.redis_client import get_redis
from app.utils.notifiers import notify_alert_fired, notify_alert_resolved

logger = logging.getLogger(__name__)


async def _publish_alert_event(
    workspace_id: uuid.UUID,
    state: str,
    rule_name: str,
    message: str,
    rule_id: str,
    server_id: str | None,
) -> None:
    try:
        redis = await get_redis()
        channel = f"mcphub:dashboard:{workspace_id}"
        payload = json.dumps({
            "type": "alert_event",
            "state": state,
            "rule_name": rule_name,
            "message": message,
            "rule_id": rule_id,
            "server_id": server_id,
        })
        await redis.publish(channel, payload)
    except Exception as exc:
        logger.warning("Failed to publish alert_event: %s", exc)


# ── Metric computation ────────────────────────────────────────────────────────

async def _compute_metric(rule: AlertRule, db: AsyncSession) -> float | None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=rule.window_minutes)
    stmt = select(HealthCheck).where(
        HealthCheck.workspace_id == rule.workspace_id,
        HealthCheck.checked_at >= cutoff,
    )
    if rule.server_id:
        stmt = stmt.where(HealthCheck.server_id == rule.server_id)
    result = await db.execute(stmt)
    checks = result.scalars().all()

    if not checks:
        return None

    if rule.metric == "availability":
        up = sum(1 for c in checks if c.status in ("healthy", "degraded"))
        return (up / len(checks)) * 100.0

    if rule.metric == "error_rate":
        errors = sum(1 for c in checks if c.status == "down")
        return (errors / len(checks)) * 100.0

    if rule.metric == "latency_p95":
        latencies = sorted(c.latency_ms for c in checks if c.latency_ms is not None)
        if not latencies:
            return None
        idx = min(int(len(latencies) * 0.95), len(latencies) - 1)
        return latencies[idx]

    return None


def _condition_met(value: float, operator: str, threshold: float) -> bool:
    return {
        "gt": value > threshold,
        "gte": value >= threshold,
        "lt": value < threshold,
        "lte": value <= threshold,
    }.get(operator, False)


# ── Last event lookup ─────────────────────────────────────────────────────────

async def _last_event(
    rule_id: uuid.UUID,
    server_id: uuid.UUID | None,
    db: AsyncSession,
) -> AlertEvent | None:
    stmt = (
        select(AlertEvent)
        .where(AlertEvent.rule_id == rule_id)
        .order_by(AlertEvent.fired_at.desc())
        .limit(1)
    )
    if server_id is not None:
        stmt = stmt.where(AlertEvent.server_id == server_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ── Server name helper ────────────────────────────────────────────────────────

async def _server_name(server_id: uuid.UUID | None, db: AsyncSession) -> str | None:
    if server_id is None:
        return None
    server = await db.get(MCPServer, server_id)
    return server.name if server else None


# ── Per-rule evaluation ───────────────────────────────────────────────────────

async def _evaluate_rule(rule: AlertRule, db: AsyncSession) -> dict:
    value = await _compute_metric(rule, db)
    sname = await _server_name(rule.server_id, db)

    if value is None:
        return {
            "rule_id": str(rule.id),
            "rule_name": rule.name,
            "skipped": True,
            "reason": "no data",
        }

    firing = _condition_met(value, rule.operator, rule.threshold)
    last = await _last_event(rule.id, rule.server_id, db)
    last_state = last.state if last else None
    now = datetime.now(timezone.utc)

    if firing and last_state != "fired":
        msg = (
            f"{rule.metric} = {value:.2f} {rule.operator} {rule.threshold} "
            f"(window: {rule.window_minutes}m)"
        )
        event = AlertEvent(
            id=uuid.uuid4(),
            workspace_id=rule.workspace_id,
            rule_id=rule.id,
            server_id=rule.server_id,
            state="fired",
            value=value,
            message=msg,
            fired_at=now,
        )
        db.add(event)
        await notify_alert_fired(rule.name, sname, rule.metric, value, rule.threshold)
        await _publish_alert_event(
            rule.workspace_id, "fired", rule.name, msg,
            str(rule.id), str(rule.server_id) if rule.server_id else None,
        )
        return {"rule_id": str(rule.id), "rule_name": rule.name, "state": "fired", "value": value}

    if not firing and last_state == "fired":
        resolved_msg = f"{rule.metric} back within threshold ({value:.2f})"
        event = AlertEvent(
            id=uuid.uuid4(),
            workspace_id=rule.workspace_id,
            rule_id=rule.id,
            server_id=rule.server_id,
            state="resolved",
            value=value,
            message=resolved_msg,
            fired_at=now,
            resolved_at=now,
        )
        db.add(event)
        await notify_alert_resolved(rule.name, sname, rule.metric)
        await _publish_alert_event(
            rule.workspace_id, "resolved", rule.name, resolved_msg,
            str(rule.id), str(rule.server_id) if rule.server_id else None,
        )
        return {"rule_id": str(rule.id), "rule_name": rule.name, "state": "resolved", "value": value}

    return {
        "rule_id": str(rule.id),
        "rule_name": rule.name,
        "state": last_state or "ok",
        "value": value,
    }


# ── Main entry point ──────────────────────────────────────────────────────────

async def run_evaluate_alerts(
    db: AsyncSession,
    workspace_id: uuid.UUID | None = None,
) -> list[dict]:
    """Evaluate enabled alert rules and return a summary list.

    If workspace_id is provided, evaluates only rules for that workspace.
    When None (cron), evaluates all workspaces.
    """
    q = select(AlertRule).where(AlertRule.enabled.is_(True))
    if workspace_id is not None:
        q = q.where(AlertRule.workspace_id == workspace_id)
    result = await db.execute(q)
    rules = result.scalars().all()

    if not rules:
        return []

    summaries = []
    for rule in rules:
        summary = await _evaluate_rule(rule, db)
        summaries.append(summary)

    await db.flush()
    return summaries
