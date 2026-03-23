import uuid
from datetime import datetime

from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    server_id: uuid.UUID
    status: str
    latency_ms: float | None
    status_code: int | None
    error: str | None
    checked_at: datetime


class ServerHealthSummary(BaseModel):
    server_id: uuid.UUID
    server_name: str
    current_status: str
    uptime_pct: float
    avg_latency_ms: float | None
    check_count: int
    last_checked_at: datetime | None
