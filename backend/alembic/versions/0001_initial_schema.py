"""Initial schema — all 6 tables

Revision ID: 0001
Revises:
Create Date: 2026-03-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mcp_servers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("endpoint", sa.String(2048), nullable=False),
        sa.Column("owner", sa.String(255)),
        sa.Column("version", sa.String(50)),
        sa.Column("tags", postgresql.ARRAY(sa.String())),
        sa.Column("status", sa.String(50), nullable=False, server_default="unknown"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "health_checks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("latency_ms", sa.Float()),
        sa.Column("status_code", sa.Integer()),
        sa.Column("error", sa.String(1000)),
        sa.Column("checked_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_health_checks_server_id", "health_checks", ["server_id"])
    op.create_index("ix_health_checks_checked_at", "health_checks", ["checked_at"])

    op.create_table(
        "tool_calls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tool_name", sa.String(255), nullable=False),
        sa.Column("caller_agent", sa.String(255)),
        sa.Column("input_payload", postgresql.JSONB()),
        sa.Column("output_size_bytes", sa.Integer()),
        sa.Column("duration_ms", sa.Float()),
        sa.Column("status", sa.String(50), nullable=False, server_default="success"),
        sa.Column("error", sa.Text()),
        sa.Column("called_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tool_calls_server_id", "tool_calls", ["server_id"])
    op.create_index("ix_tool_calls_tool_name", "tool_calls", ["tool_name"])
    op.create_index("ix_tool_calls_called_at", "tool_calls", ["called_at"])

    op.create_table(
        "alert_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mcp_servers.id", ondelete="CASCADE")),
        sa.Column("metric", sa.String(100), nullable=False),
        sa.Column("operator", sa.String(10), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("window_minutes", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "alert_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mcp_servers.id", ondelete="CASCADE")),
        sa.Column("state", sa.String(50), nullable=False),
        sa.Column("value", sa.Float()),
        sa.Column("message", sa.String(1000)),
        sa.Column("fired_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_alert_events_rule_id", "alert_events", ["rule_id"])
    op.create_index("ix_alert_events_fired_at", "alert_events", ["fired_at"])

    op.create_table(
        "analytics_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tool_name", sa.String(255)),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("call_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_latency_ms", sa.Float()),
        sa.Column("p95_latency_ms", sa.Float()),
        sa.Column("total_output_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_analytics_snapshots_server_id", "analytics_snapshots", ["server_id"])
    op.create_index("ix_analytics_snapshots_window_start", "analytics_snapshots", ["window_start"])


def downgrade() -> None:
    op.drop_table("analytics_snapshots")
    op.drop_table("alert_events")
    op.drop_table("alert_rules")
    op.drop_table("tool_calls")
    op.drop_table("health_checks")
    op.drop_table("mcp_servers")
