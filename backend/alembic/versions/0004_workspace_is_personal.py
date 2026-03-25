"""Add is_personal to workspaces + rename existing personal workspaces

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_personal column, default false for all existing rows
    op.add_column(
        "workspaces",
        sa.Column("is_personal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # Backfill: mark workspaces that have exactly one member with role=owner as personal
    # and rename them to "Personal Workspace"
    op.execute(
        """
        UPDATE workspaces
        SET is_personal = true,
            name = 'Personal Workspace'
        WHERE id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE role = 'owner'
            GROUP BY workspace_id
            HAVING COUNT(*) = 1
        )
        AND (
            name LIKE '%''s Workspace'
            OR name = 'Personal Workspace'
        )
        """
    )


def downgrade() -> None:
    op.drop_column("workspaces", "is_personal")
