import uuid
from datetime import datetime

from pydantic import BaseModel


class TopTool(BaseModel):
    tool_name: str
    server_id: uuid.UUID
    server_name: str
    call_count: int
    error_count: int
    error_rate: float
    avg_latency_ms: float | None


class ServerErrorRate(BaseModel):
    server_id: uuid.UUID
    server_name: str
    tool_name: str | None
    call_count: int
    error_count: int
    error_rate: float


class LatencyStat(BaseModel):
    server_id: uuid.UUID
    server_name: str
    tool_name: str | None
    avg_latency_ms: float | None
    p95_latency_ms: float | None
    call_count: int


class VolumeBucket(BaseModel):
    window_start: datetime
    window_end: datetime
    call_count: int
    error_count: int
