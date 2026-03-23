"""Alert rules CRUD and alert events API."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import AlertEvent, AlertRule
from app.schemas.alert import AlertEventResponse, AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate

router = APIRouter(prefix="/alerts", tags=["alerts"])


# ── Alert Rules ───────────────────────────────────────────────────────────────

@router.get("/rules", response_model=list[AlertRuleResponse])
async def list_alert_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule).order_by(AlertRule.created_at.desc()))
    return result.scalars().all()


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(payload: AlertRuleCreate, db: AsyncSession = Depends(get_db)):
    rule = AlertRule(id=uuid.uuid4(), **payload.model_dump())
    db.add(rule)
    await db.flush()
    return rule


@router.get("/rules/{rule_id}", response_model=AlertRuleResponse)
async def get_alert_rule(rule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rule = await db.get(AlertRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    return rule


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    rule_id: uuid.UUID,
    payload: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
):
    rule = await db.get(AlertRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.flush()
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(rule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rule = await db.get(AlertRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    await db.delete(rule)
    await db.flush()


# ── Alert Events ──────────────────────────────────────────────────────────────

@router.get("/events", response_model=list[AlertEventResponse])
async def list_alert_events(
    rule_id: uuid.UUID | None = Query(None),
    server_id: uuid.UUID | None = Query(None),
    state: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AlertEvent).order_by(AlertEvent.fired_at.desc()).limit(limit)
    if rule_id is not None:
        stmt = stmt.where(AlertEvent.rule_id == rule_id)
    if server_id is not None:
        stmt = stmt.where(AlertEvent.server_id == server_id)
    if state is not None:
        stmt = stmt.where(AlertEvent.state == state)
    result = await db.execute(stmt)
    return result.scalars().all()
