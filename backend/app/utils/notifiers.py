"""Notification dispatchers for alert events.

Supports Slack incoming webhooks and a generic HTTP webhook.
Both are fire-and-forget — failures are logged but never raise.
"""
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def _post(url: str, payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("Notification delivery failed (url=%s): %s", url, exc)


async def send_slack(message: str) -> None:
    if not settings.slack_webhook_url:
        return
    await _post(settings.slack_webhook_url, {"text": message})


async def send_webhook(payload: dict) -> None:
    if not settings.alert_webhook_url:
        return
    await _post(settings.alert_webhook_url, payload)


async def notify_alert_fired(rule_name: str, server_name: str | None, metric: str, value: float, threshold: float) -> None:
    target = f" on **{server_name}**" if server_name else " (global)"
    message = (
        f":rotating_light: *Alert fired*{target}\n"
        f"Rule: *{rule_name}* | Metric: `{metric}` | Value: `{value:.2f}` | Threshold: `{threshold}`"
    )
    payload = {
        "event": "alert.fired",
        "rule_name": rule_name,
        "server_name": server_name,
        "metric": metric,
        "value": value,
        "threshold": threshold,
    }
    await send_slack(message)
    await send_webhook(payload)


async def notify_alert_resolved(rule_name: str, server_name: str | None, metric: str) -> None:
    target = f" on **{server_name}**" if server_name else " (global)"
    message = (
        f":white_check_mark: *Alert resolved*{target}\n"
        f"Rule: *{rule_name}* | Metric: `{metric}`"
    )
    payload = {
        "event": "alert.resolved",
        "rule_name": rule_name,
        "server_name": server_name,
        "metric": metric,
    }
    await send_slack(message)
    await send_webhook(payload)
