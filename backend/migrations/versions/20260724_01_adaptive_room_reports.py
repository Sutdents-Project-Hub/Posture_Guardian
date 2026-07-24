"""Add adaptive coverage, room mode, reminder, and report aggregates.

Revision ID: 20260724_01
Revises: 20260722_01
Create Date: 2026-07-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260724_01"
down_revision: str | None = "20260722_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("posture_sessions") as batch:
        batch.add_column(
            sa.Column(
                "coverage_mode",
                sa.String(length=16),
                nullable=False,
                server_default="upper_body",
            )
        )
        batch.add_column(
            sa.Column("room_mode", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch.add_column(
            sa.Column("attention_seconds", sa.Float(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("poor_seconds", sa.Float(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("reminder_count", sa.Integer(), nullable=False, server_default="0")
        )

    with op.batch_alter_table("posture_samples") as batch:
        batch.add_column(
            sa.Column(
                "reminder_triggered",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.create_index(
            "ix_posture_samples_session_captured_at",
            ["session_id", "captured_at"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("posture_samples") as batch:
        batch.drop_index("ix_posture_samples_session_captured_at")
        batch.drop_column("reminder_triggered")

    with op.batch_alter_table("posture_sessions") as batch:
        batch.drop_column("reminder_count")
        batch.drop_column("poor_seconds")
        batch.drop_column("attention_seconds")
        batch.drop_column("room_mode")
        batch.drop_column("coverage_mode")
