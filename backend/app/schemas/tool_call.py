import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ToolCallCreate(BaseModel):
    server_id: uuid.UUID
    tool_name: str
    caller_agent: str | None = None
    input_payload: dict[str, Any] | None = None
    output_size_bytes: int | None = None
    duration_ms: float | None = None
    status: str = "success"  # success | error
    error: str | None = None


class ToolCallResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    server_id: uuid.UUID
    tool_name: str
    caller_agent: str | None
    input_payload: dict[str, Any] | None
    output_size_bytes: int | None
    duration_ms: float | None
    status: str
    error: str | None
    called_at: datetime
