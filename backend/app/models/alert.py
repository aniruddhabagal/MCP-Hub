import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # server_id=None means global rule
    server_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE")
    )
    metric: Mapped[str] = mapped_column(String(100), nullable=False)  # error_rate | latency_p95 | availability
    operator: Mapped[str] = mapped_column(String(10), nullable=False)  # gt | lt | gte | lte
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    window_minutes: Mapped[int] = mapped_column(default=5)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False
    )
    server_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE")
    )
    state: Mapped[str] = mapped_column(String(50), nullable=False)  # fired | resolved
    value: Mapped[float | None] = mapped_column(Float)
    message: Mapped[str | None] = mapped_column(String(1000))
    fired_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
