import uuid
from datetime import datetime

from pydantic import BaseModel


class AlertRuleCreate(BaseModel):
    name: str
    server_id: uuid.UUID | None = None
    metric: str  # error_rate | latency_p95 | availability
    operator: str  # gt | lt | gte | lte
    threshold: float
    window_minutes: int = 5
    enabled: bool = True


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    server_id: uuid.UUID | None = None
    metric: str | None = None
    operator: str | None = None
    threshold: float | None = None
    window_minutes: int | None = None
    enabled: bool | None = None


class AlertRuleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    server_id: uuid.UUID | None
    metric: str
    operator: str
    threshold: float
    window_minutes: int
    enabled: bool
    created_at: datetime


class AlertEventResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    rule_id: uuid.UUID
    server_id: uuid.UUID | None
    state: str
    value: float | None
    message: str | None
    fired_at: datetime
    resolved_at: datetime | None
