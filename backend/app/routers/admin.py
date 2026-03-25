"""Admin endpoints for on-demand agent triggers.

Dual auth:
- Authorization: Bearer <cron_secret>  → runs for ALL workspaces (workspace_id=None)
- Authorization: Bearer <jwt>          → must have admin+ role; runs for caller's workspace
"""
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.alert_evaluator import run_evaluate_alerts
from app.agents.analytics_aggregator import run_aggregate_analytics
from app.agents.health_prober import run_probe_all
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token

router = APIRouter(prefix="/admin", tags=["admin"])

_bearer = HTTPBearer(auto_error=False)


async def _admin_auth(
    authorization: str | None = Header(None),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID | None:
    """Returns workspace_id for JWT callers (admin+), None for cron secret (all workspaces)."""
    # Cron secret path — runs all workspaces
    if authorization == f"Bearer {settings.cron_secret}":
        return None

    # JWT path — workspace-scoped
    if credentials:
        try:
            payload = decode_token(credentials.credentials)
            if payload.get("type") == "refresh":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

            user_id_str = payload.get("sub")
            wid = payload.get("wid")
            role = payload.get("role", "member")
            is_sa = payload.get("sa", False)

            if not user_id_str:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

            result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

            if user.is_superadmin or is_sa or role in ("admin", "owner"):
                return uuid.UUID(wid) if wid and wid != "*" else None

            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        except JWTError:
            pass

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@router.post("/probe-all")
async def probe_all(
    workspace_id: uuid.UUID | None = Depends(_admin_auth),
    db: AsyncSession = Depends(get_db),
):
    results = await run_probe_all(db, workspace_id=workspace_id)
    return {"probed": len(results), "results": results}


@router.post("/evaluate-alerts")
async def evaluate_alerts(
    workspace_id: uuid.UUID | None = Depends(_admin_auth),
    db: AsyncSession = Depends(get_db),
):
    results = await run_evaluate_alerts(db, workspace_id=workspace_id)
    return {"evaluated": len(results), "results": results}


@router.post("/aggregate-analytics")
async def aggregate_analytics(
    workspace_id: uuid.UUID | None = Depends(_admin_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await run_aggregate_analytics(db, workspace_id=workspace_id)
    return result
