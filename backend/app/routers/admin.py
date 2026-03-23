from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.alert_evaluator import run_evaluate_alerts
from app.agents.analytics_aggregator import run_aggregate_analytics
from app.agents.health_prober import run_probe_all
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


def _verify_cron(authorization: str | None = Header(None)):
    expected = f"Bearer {settings.cron_secret}"
    if authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@router.post("/probe-all")
async def probe_all(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_cron),
):
    results = await run_probe_all(db)
    return {"probed": len(results), "results": results}


@router.post("/evaluate-alerts")
async def evaluate_alerts(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_cron),
):
    results = await run_evaluate_alerts(db)
    return {"evaluated": len(results), "results": results}


@router.post("/aggregate-analytics")
async def aggregate_analytics(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_cron),
):
    result = await run_aggregate_analytics(db)
    return result
