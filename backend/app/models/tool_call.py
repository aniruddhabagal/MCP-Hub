import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ToolCall(Base):
    __tablename__ = "tool_calls"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    server_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False
    )
    tool_name: Mapped[str] = mapped_column(String(255), nullable=False)
    caller_agent: Mapped[str | None] = mapped_column(String(255))
    input_payload: Mapped[dict | None] = mapped_column(JSONB)
    output_size_bytes: Mapped[int | None] = mapped_column(Integer)
    duration_ms: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="success")  # success | error
    error: Mapped[str | None] = mapped_column(Text)
    called_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
