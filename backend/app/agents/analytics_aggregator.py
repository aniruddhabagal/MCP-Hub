"""Analytics Aggregator agent.

Reads tool_calls from the past 24 hours (optionally scoped to a workspace),
groups by workspace + server + tool, and writes AnalyticsSnapshot rows for
each hourly window.

Invoked once per day via Vercel Cron (POST /api/v1/admin/aggregate-analytics).
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsSnapshot
from app.models.tool_call import ToolCall


def _p95(values: list[float]) -> float | None:
    if not values:
        return None
    s = sorted(values)
    idx = min(int(len(s) * 0.95), len(s) - 1)
    return s[idx]


async def run_aggregate_analytics(
    db: AsyncSession,
    workspace_id: uuid.UUID | None = None,
) -> dict:
    """Aggregate the last 24 h of tool_calls into hourly AnalyticsSnapshot rows.

    If workspace_id is provided, aggregates only that workspace's data.
    When None (cron), aggregates all workspaces.
    """
    now = datetime.now(timezone.utc)
    window_end = now.replace(minute=0, second=0, microsecond=0)
    window_start = window_end - timedelta(hours=24)

    stmt = select(ToolCall).where(ToolCall.called_at >= window_start)
    if workspace_id is not None:
        stmt = stmt.where(ToolCall.workspace_id == workspace_id)
    result = await db.execute(stmt)
    calls = result.scalars().all()

    if not calls:
        return {"windows_written": 0, "snapshots": 0}

    # Bucket calls into hourly windows per (workspace_id, server_id, tool_name)
    buckets: dict[tuple, list[ToolCall]] = {}
    for call in calls:
        hour = call.called_at.replace(minute=0, second=0, microsecond=0)
        key = (hour, call.workspace_id, call.server_id, call.tool_name)
        buckets.setdefault(key, []).append(call)

    snapshots_written = 0
    windows_seen: set[datetime] = set()

    for (hour_start, wid, server_id, tool_name), bucket_calls in buckets.items():
        hour_end = hour_start + timedelta(hours=1)
        windows_seen.add(hour_start)

        latencies = [c.duration_ms for c in bucket_calls if c.duration_ms is not None]
        output_bytes = sum(c.output_size_bytes or 0 for c in bucket_calls)
        error_count = sum(1 for c in bucket_calls if c.status == "error")
        avg_lat = sum(latencies) / len(latencies) if latencies else None

        snap = AnalyticsSnapshot(
            id=uuid.uuid4(),
            workspace_id=wid,
            server_id=server_id,
            tool_name=tool_name,
            window_start=hour_start,
            window_end=hour_end,
            call_count=len(bucket_calls),
            error_count=error_count,
            avg_latency_ms=avg_lat,
            p95_latency_ms=_p95(latencies),
            total_output_bytes=output_bytes,
        )
        db.add(snap)
        snapshots_written += 1

    await db.flush()
    return {"windows_written": len(windows_seen), "snapshots": snapshots_written}
