"""Analytics API endpoints — workspace-scoped with Redis cache.

Cache keys are prefixed with workspace_id to prevent cross-tenant data leaks.
Falls back to direct DB query if Redis is unavailable.
"""
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_workspace_id
from app.models.server import MCPServer
from app.models.tool_call import ToolCall
from app.redis_client import get_redis
from app.schemas.analytics import LatencyStat, ServerErrorRate, TopTool, VolumeBucket

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])

CACHE_TTL = 300  # 5 minutes


# ── Redis cache helpers ───────────────────────────────────────────────────────

async def _cache_get(key: str) -> list | None:
    try:
        redis = await get_redis()
        raw = await redis.get(key)
        if raw:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis cache get failed: %s", exc)
    return None


async def _cache_set(key: str, data: list) -> None:
    try:
        redis = await get_redis()
        await redis.setex(key, CACHE_TTL, json.dumps(data, default=str))
    except Exception as exc:
        logger.warning("Redis cache set failed: %s", exc)


# ── Server name lookup ────────────────────────────────────────────────────────

async def _server_names(workspace_id: uuid.UUID, db: AsyncSession) -> dict[str, str]:
    result = await db.execute(
        select(MCPServer.id, MCPServer.name).where(MCPServer.workspace_id == workspace_id)
    )
    return {str(row.id): row.name for row in result}


def _p95(values: list[float]) -> float | None:
    if not values:
        return None
    s = sorted(values)
    idx = min(int(len(s) * 0.95), len(s) - 1)
    return s[idx]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/top-tools", response_model=list[TopTool])
async def top_tools(
    limit: int = Query(10, ge=1, le=100),
    hours: int = Query(24, ge=1, le=168),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"analytics:{workspace_id}:top_tools:{limit}:{hours}"
    cached = await _cache_get(cache_key)
    if cached is not None:
        return cached

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(ToolCall).where(
            ToolCall.workspace_id == workspace_id,
            ToolCall.called_at >= cutoff,
        )
    )
    calls = result.scalars().all()
    names = await _server_names(workspace_id, db)

    agg: dict[tuple, dict] = {}
    for c in calls:
        key = (str(c.server_id), c.tool_name)
        if key not in agg:
            agg[key] = {"latencies": [], "call_count": 0, "error_count": 0}
        agg[key]["call_count"] += 1
        if c.status == "error":
            agg[key]["error_count"] += 1
        if c.duration_ms is not None:
            agg[key]["latencies"].append(c.duration_ms)

    rows = []
    for (sid, tname), stats in agg.items():
        lats = stats["latencies"]
        cc = stats["call_count"]
        ec = stats["error_count"]
        rows.append({
            "tool_name": tname,
            "server_id": sid,
            "server_name": names.get(sid, sid),
            "call_count": cc,
            "error_count": ec,
            "error_rate": (ec / cc * 100) if cc else 0.0,
            "avg_latency_ms": (sum(lats) / len(lats)) if lats else None,
        })

    rows.sort(key=lambda r: r["call_count"], reverse=True)
    rows = rows[:limit]
    await _cache_set(cache_key, rows)
    return rows


@router.get("/error-rates", response_model=list[ServerErrorRate])
async def error_rates(
    hours: int = Query(24, ge=1, le=168),
    server_id: uuid.UUID | None = Query(None),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"analytics:{workspace_id}:error_rates:{hours}:{server_id}"
    cached = await _cache_get(cache_key)
    if cached is not None:
        return cached

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = select(ToolCall).where(
        ToolCall.workspace_id == workspace_id,
        ToolCall.called_at >= cutoff,
    )
    if server_id:
        stmt = stmt.where(ToolCall.server_id == server_id)
    result = await db.execute(stmt)
    calls = result.scalars().all()
    names = await _server_names(workspace_id, db)

    agg: dict[tuple, dict] = {}
    for c in calls:
        key = (str(c.server_id), c.tool_name)
        if key not in agg:
            agg[key] = {"call_count": 0, "error_count": 0}
        agg[key]["call_count"] += 1
        if c.status == "error":
            agg[key]["error_count"] += 1

    rows = []
    for (sid, tname), stats in agg.items():
        cc = stats["call_count"]
        ec = stats["error_count"]
        rows.append({
            "server_id": sid,
            "server_name": names.get(sid, sid),
            "tool_name": tname,
            "call_count": cc,
            "error_count": ec,
            "error_rate": (ec / cc * 100) if cc else 0.0,
        })

    rows.sort(key=lambda r: r["error_rate"], reverse=True)
    await _cache_set(cache_key, rows)
    return rows


@router.get("/latency", response_model=list[LatencyStat])
async def latency_stats(
    hours: int = Query(24, ge=1, le=168),
    server_id: uuid.UUID | None = Query(None),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"analytics:{workspace_id}:latency:{hours}:{server_id}"
    cached = await _cache_get(cache_key)
    if cached is not None:
        return cached

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = select(ToolCall).where(
        ToolCall.workspace_id == workspace_id,
        ToolCall.called_at >= cutoff,
    )
    if server_id:
        stmt = stmt.where(ToolCall.server_id == server_id)
    result = await db.execute(stmt)
    calls = result.scalars().all()
    names = await _server_names(workspace_id, db)

    agg: dict[tuple, list[float]] = {}
    counts: dict[tuple, int] = {}
    for c in calls:
        key = (str(c.server_id), c.tool_name)
        counts[key] = counts.get(key, 0) + 1
        if c.duration_ms is not None:
            agg.setdefault(key, []).append(c.duration_ms)

    rows = []
    for key, lats in agg.items():
        sid, tname = key
        rows.append({
            "server_id": sid,
            "server_name": names.get(sid, sid),
            "tool_name": tname,
            "avg_latency_ms": sum(lats) / len(lats) if lats else None,
            "p95_latency_ms": _p95(lats),
            "call_count": counts[key],
        })

    rows.sort(key=lambda r: (r["avg_latency_ms"] or 0), reverse=True)
    await _cache_set(cache_key, rows)
    return rows


@router.get("/volume", response_model=list[VolumeBucket])
async def volume_heatmap(
    hours: int = Query(24, ge=1, le=168),
    bucket_minutes: int = Query(60, ge=15, le=1440),
    server_id: uuid.UUID | None = Query(None),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"analytics:{workspace_id}:volume:{hours}:{bucket_minutes}:{server_id}"
    cached = await _cache_get(cache_key)
    if cached is not None:
        return cached

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=hours)
    stmt = select(ToolCall).where(
        ToolCall.workspace_id == workspace_id,
        ToolCall.called_at >= cutoff,
    )
    if server_id:
        stmt = stmt.where(ToolCall.server_id == server_id)
    result = await db.execute(stmt)
    calls = result.scalars().all()

    bucket_td = timedelta(minutes=bucket_minutes)
    buckets: dict[datetime, dict] = {}

    for c in calls:
        called_at = c.called_at if c.called_at.tzinfo else c.called_at.replace(tzinfo=timezone.utc)
        elapsed = (called_at - cutoff).total_seconds()
        bucket_idx = int(elapsed // bucket_td.total_seconds())
        bucket_start = cutoff + bucket_td * bucket_idx
        if bucket_start not in buckets:
            buckets[bucket_start] = {"call_count": 0, "error_count": 0}
        buckets[bucket_start]["call_count"] += 1
        if c.status == "error":
            buckets[bucket_start]["error_count"] += 1

    rows = [
        {
            "window_start": start.isoformat(),
            "window_end": (start + bucket_td).isoformat(),
            "call_count": stats["call_count"],
            "error_count": stats["error_count"],
        }
        for start, stats in sorted(buckets.items())
    ]

    await _cache_set(cache_key, rows)
    return rows
