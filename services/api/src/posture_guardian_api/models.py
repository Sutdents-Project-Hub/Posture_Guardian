"""Database tables for derived posture metrics and anonymous session summaries."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from posture_guardian_api.database import Base


def utc_now() -> datetime:
    """Return an aware UTC timestamp suitable for SQLAlchemy defaults."""
    return datetime.now().astimezone()


class PostureSession(Base):
    """One calibrated posture-observation work session."""

    __tablename__ = "posture_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    profile_id: Mapped[str] = mapped_column(String(64), index=True)
    view_mode: Mapped[str] = mapped_column(String(16))
    intervention_stage: Mapped[str] = mapped_column(String(16), default="starter")
    baseline: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_seconds: Mapped[float] = mapped_column(Float, default=0)
    good_seconds: Mapped[float] = mapped_column(Float, default=0)
    invalid_seconds: Mapped[float] = mapped_column(Float, default=0)
    posture_event_count: Mapped[int] = mapped_column(Integer, default=0)
    average_score: Mapped[float] = mapped_column(Float, default=0)
    good_posture_rate: Mapped[float] = mapped_column(Float, default=0)
    primary_issue: Mapped[str | None] = mapped_column(String(64), nullable=True)
    insight_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    insight_provider: Mapped[str] = mapped_column(String(16), default="fallback")

    samples: Mapped[list["PostureSample"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class PostureSample(Base):
    """A derived sample; raw image bytes are deliberately never persisted."""

    __tablename__ = "posture_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("posture_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.5)
    is_valid: Mapped[bool] = mapped_column(default=True)
    threshold_exceeded: Mapped[bool] = mapped_column(default=False)
    event_active: Mapped[bool] = mapped_column(default=False)
    posture_score: Mapped[float] = mapped_column(Float, default=0)
    metrics: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    deviations: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list)

    session: Mapped[PostureSession] = relationship(back_populates="samples")


class SessionFeedback(Base):
    """Optional categorical UX feedback without free text or personal data."""

    __tablename__ = "session_feedback"

    session_id: Mapped[str] = mapped_column(
        ForeignKey("posture_sessions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    reminder_fit: Mapped[str] = mapped_column(String(24))
    feeling: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
