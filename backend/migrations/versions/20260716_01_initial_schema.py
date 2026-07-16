"""建立姿勢工作階段、衍生樣本與體驗回饋基線。

Revision ID: 20260716_01
Revises:
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260716_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "posture_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=64), nullable=False),
        sa.Column("view_mode", sa.String(length=16), nullable=False),
        sa.Column("intervention_stage", sa.String(length=16), nullable=False),
        sa.Column("baseline", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_seconds", sa.Float(), nullable=False),
        sa.Column("good_seconds", sa.Float(), nullable=False),
        sa.Column("invalid_seconds", sa.Float(), nullable=False),
        sa.Column("posture_event_count", sa.Integer(), nullable=False),
        sa.Column("average_score", sa.Float(), nullable=False),
        sa.Column("good_posture_rate", sa.Float(), nullable=False),
        sa.Column("primary_issue", sa.String(length=64), nullable=True),
        sa.Column("insight_text", sa.Text(), nullable=True),
        sa.Column("insight_provider", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_posture_sessions_profile_id"),
        "posture_sessions",
        ["profile_id"],
        unique=False,
    )
    op.create_table(
        "posture_samples",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("is_valid", sa.Boolean(), nullable=False),
        sa.Column("threshold_exceeded", sa.Boolean(), nullable=False),
        sa.Column("event_active", sa.Boolean(), nullable=False),
        sa.Column("posture_score", sa.Float(), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("deviations", sa.JSON(), nullable=False),
        sa.Column("reasons", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["posture_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_posture_samples_session_id"),
        "posture_samples",
        ["session_id"],
        unique=False,
    )
    op.create_table(
        "session_feedback",
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("reminder_fit", sa.String(length=24), nullable=False),
        sa.Column("feeling", sa.String(length=24), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["posture_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("session_id"),
    )


def downgrade() -> None:
    op.drop_table("session_feedback")
    op.drop_index(op.f("ix_posture_samples_session_id"), table_name="posture_samples")
    op.drop_table("posture_samples")
    op.drop_index(op.f("ix_posture_sessions_profile_id"), table_name="posture_sessions")
    op.drop_table("posture_sessions")
