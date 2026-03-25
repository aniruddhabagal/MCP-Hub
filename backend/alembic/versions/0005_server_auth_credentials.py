"""Add auth_type and auth_credentials to mcp_servers.

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "mcp_servers",
        sa.Column("auth_type", sa.String(50), nullable=True, server_default=None),
    )
    op.add_column(
        "mcp_servers",
        sa.Column("auth_credentials", JSONB, nullable=True, server_default=None),
    )


def downgrade() -> None:
    op.drop_column("mcp_servers", "auth_credentials")
    op.drop_column("mcp_servers", "auth_type")
