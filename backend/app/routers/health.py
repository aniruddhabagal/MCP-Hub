import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_workspace_id
from app.models.health_check import HealthCheck
from app.models.server import MCPServer
from app.schemas.health import HealthCheckResponse, ServerHealthSummary

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/checks", response_model=list[HealthCheckResponse])
async def list_health_checks(
    server_id: uuid.UUID | None = None,
    limit: int = Query(100, le=500),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(HealthCheck)
        .where(HealthCheck.workspace_id == workspace_id)
        .order_by(HealthCheck.checked_at.desc())
        .limit(limit)
    )
    if server_id:
        q = q.where(HealthCheck.server_id == server_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/summary", response_model=list[ServerHealthSummary])
async def health_summary(
    hours: int = Query(24, ge=1, le=168),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    servers_result = await db.execute(
        select(MCPServer).where(MCPServer.workspace_id == workspace_id)
    )
    servers = {s.id: s for s in servers_result.scalars().all()}

    summaries = []
    for server_id, server in servers.items():
        checks_result = await db.execute(
            select(HealthCheck)
            .where(
                HealthCheck.workspace_id == workspace_id,
                HealthCheck.server_id == server_id,
                HealthCheck.checked_at >= since,
            )
            .order_by(HealthCheck.checked_at.desc())
        )
        checks = checks_result.scalars().all()

        if not checks:
            summaries.append(
                ServerHealthSummary(
                    server_id=server_id,
                    server_name=server.name,
                    current_status=server.status,
                    uptime_pct=0.0,
                    avg_latency_ms=None,
                    check_count=0,
                    last_checked_at=None,
                )
            )
            continue

        healthy_count = sum(1 for c in checks if c.status == "healthy")
        latencies = [c.latency_ms for c in checks if c.latency_ms is not None]

        summaries.append(
            ServerHealthSummary(
                server_id=server_id,
                server_name=server.name,
                current_status=server.status,
                uptime_pct=round(healthy_count / len(checks) * 100, 2),
                avg_latency_ms=round(sum(latencies) / len(latencies), 2) if latencies else None,
                check_count=len(checks),
                last_checked_at=checks[0].checked_at,
            )
        )

    return summaries
