"""Alert rules CRUD and alert events API."""
import uuid
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_workspace_id, require_role
from app.models.alert import AlertEvent, AlertRule
from app.schemas.alert import AlertEventResponse, AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate

router = APIRouter(prefix="/alerts", tags=["alerts"])


async def _get_rule_in_workspace(
    rule_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> AlertRule:
    rule = await db.get(AlertRule, rule_id)
    if not rule or rule.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    return rule


# ── Alert Rules ───────────────────────────────────────────────────────────────

@router.get("/rules", response_model=list[AlertRuleResponse])
async def list_alert_rules(
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertRule)
        .where(AlertRule.workspace_id == workspace_id)
        .order_by(AlertRule.created_at.desc())
    )
    return result.scalars().all()


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    payload: AlertRuleCreate,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    rule = AlertRule(id=uuid.uuid4(), workspace_id=workspace.id, **payload.model_dump())
    db.add(rule)
    await db.flush()
    return rule


@router.get("/rules/{rule_id}", response_model=AlertRuleResponse)
async def get_alert_rule(
    rule_id: uuid.UUID,
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    return await _get_rule_in_workspace(rule_id, workspace_id, db)


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    rule_id: uuid.UUID,
    payload: AlertRuleUpdate,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    rule = await _get_rule_in_workspace(rule_id, workspace.id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.flush()
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: uuid.UUID,
    ctx: Tuple = Depends(require_role("admin", "owner")),
    db: AsyncSession = Depends(get_db),
):
    _, workspace, _ = ctx
    rule = await _get_rule_in_workspace(rule_id, workspace.id, db)
    await db.delete(rule)
    await db.flush()


# ── Alert Events ──────────────────────────────────────────────────────────────

@router.get("/events", response_model=list[AlertEventResponse])
async def list_alert_events(
    rule_id: uuid.UUID | None = Query(None),
    server_id: uuid.UUID | None = Query(None),
    state: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    workspace_id: uuid.UUID = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AlertEvent)
        .where(AlertEvent.workspace_id == workspace_id)
        .order_by(AlertEvent.fired_at.desc())
        .limit(limit)
    )
    if rule_id is not None:
        stmt = stmt.where(AlertEvent.rule_id == rule_id)
    if server_id is not None:
        stmt = stmt.where(AlertEvent.server_id == server_id)
    if state is not None:
        stmt = stmt.where(AlertEvent.state == state)
    result = await db.execute(stmt)
    return result.scalars().all()
