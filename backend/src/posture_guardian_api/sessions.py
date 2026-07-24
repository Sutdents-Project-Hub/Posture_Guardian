"""Session aggregation, reminder-stage evaluation, and persistence helpers."""

from collections import Counter
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from posture_guardian_api.config import Settings
from posture_guardian_api.insights import InsightInput, generate_insight
from posture_guardian_api.models import PostureSample, PostureSession, SessionFeedback, utc_now
from posture_guardian_api.schemas import (
    InterventionStage,
    SessionCompleteResponse,
    SessionSummary,
    WeeklyReport,
    WeeklyStatusDistribution,
    WeeklyTimePeriod,
)


def to_summary(session: PostureSession) -> SessionSummary:
    """Map a database row to the public response schema."""
    return SessionSummary(
        id=session.id,
        view_mode=session.view_mode,
        coverage_mode=session.coverage_mode,
        room_mode=session.room_mode,
        intervention_stage=session.intervention_stage,
        started_at=session.started_at,
        ended_at=session.ended_at,
        valid_seconds=round(session.valid_seconds, 1),
        good_seconds=round(session.good_seconds, 1),
        attention_seconds=round(session.attention_seconds, 1),
        poor_seconds=round(session.poor_seconds, 1),
        invalid_seconds=round(session.invalid_seconds, 1),
        posture_event_count=session.posture_event_count,
        reminder_count=session.reminder_count,
        average_score=round(session.average_score, 1),
        good_posture_rate=round(session.good_posture_rate, 1),
        primary_issue=session.primary_issue,
        insight_text=session.insight_text,
        insight_provider=session.insight_provider,
    )


def _next_stage(current: InterventionStage, step: int) -> InterventionStage:
    stages = [
        InterventionStage.STARTER,
        InterventionStage.ADVANCED,
        InterventionStage.INTENSIVE,
    ]
    position = max(0, min(len(stages) - 1, stages.index(current) + step))
    return stages[position]


def evaluate_stage(
    summaries_newest_first: list[SessionSummary], current: InterventionStage
) -> tuple[InterventionStage, str]:
    """Apply the documented six-session reminder-stage rule."""
    qualified = [item for item in summaries_newest_first if item.valid_seconds >= 600]
    if len(qualified) < 6:
        remaining = 6 - len(qualified)
        return current, f"還需要 {remaining} 次至少 10 分鐘的有效階段，才會自動調整提醒強度。"

    consecutive_current_stage = 0
    for item in qualified:
        if item.intervention_stage != current:
            break
        consecutive_current_stage += 1
    completed_in_batch = consecutive_current_stage % 3
    if completed_in_batch:
        return (
            current,
            f"目前提醒階段已完成 {completed_in_batch}/3 次合格觀察；每三次最多調整一階。",
        )

    recent = qualified[:3]
    previous = qualified[3:6]
    recent_good = sum(item.good_posture_rate for item in recent) / 3
    previous_good = sum(item.good_posture_rate for item in previous) / 3
    improvement = recent_good - previous_good
    recent_bad_rate = 100 - recent_good

    if improvement >= 10:
        suggested = _next_stage(current, -1)
        return suggested, f"最近三次改善 {improvement:.0f} 個百分點，可降低一階提醒。"
    if recent_bad_rate >= 30 and improvement < 5:
        suggested = _next_stage(current, 1)
        return suggested, "最近三次偏離比例仍高且改善未達 5 個百分點，建議加強一階提醒。"
    return current, "最近趨勢穩定，維持目前提醒強度。"


async def complete_session(
    db: AsyncSession,
    session: PostureSession,
    settings: Settings,
) -> SessionCompleteResponse:
    """Aggregate samples, generate guidance, and calculate next stage."""
    if session.ended_at is None:
        samples = list(
            (
                await db.scalars(
                    select(PostureSample)
                    .where(PostureSample.session_id == session.id)
                    .order_by(PostureSample.captured_at, PostureSample.id)
                )
            ).all()
        )
        session.ended_at = utc_now()
        session.valid_seconds = sum(item.duration_seconds for item in samples if item.is_valid)
        session.invalid_seconds = sum(
            item.duration_seconds for item in samples if not item.is_valid
        )
        session.good_seconds = sum(
            item.duration_seconds
            for item in samples
            if item.is_valid and not item.threshold_exceeded and not item.event_active
        )
        session.attention_seconds = sum(
            item.duration_seconds
            for item in samples
            if item.is_valid and item.threshold_exceeded and not item.event_active
        )
        session.poor_seconds = sum(
            item.duration_seconds for item in samples if item.is_valid and item.event_active
        )
        valid_samples = [item for item in samples if item.is_valid]
        session.average_score = (
            sum(item.posture_score for item in valid_samples) / len(valid_samples)
            if valid_samples
            else 0
        )
        session.good_posture_rate = (
            session.good_seconds / session.valid_seconds * 100 if session.valid_seconds else 0
        )

        event_count = 0
        was_active = False
        issues: Counter[str] = Counter()
        for sample in samples:
            if sample.event_active and not was_active:
                event_count += 1
            was_active = sample.event_active
            if sample.threshold_exceeded:
                issues.update(sample.reasons)
        session.posture_event_count = event_count
        session.reminder_count = sum(1 for item in samples if item.reminder_triggered)
        session.primary_issue = issues.most_common(1)[0][0] if issues else None

        previous_rows = list(
            (
                await db.scalars(
                    select(PostureSession)
                    .where(
                        PostureSession.user_id == session.user_id,
                        PostureSession.id != session.id,
                        PostureSession.ended_at.is_not(None),
                    )
                    .order_by(PostureSession.started_at.desc())
                    .limit(12)
                )
            ).all()
        )
        trend_rows = [session, *previous_rows]
        qualified = [item for item in trend_rows if item.valid_seconds >= 600][:6]
        recent_average: float | None = None
        previous_average: float | None = None
        improvement: float | None = None
        if len(qualified) == 6:
            recent_average = sum(item.good_posture_rate for item in qualified[:3]) / 3
            previous_average = sum(item.good_posture_rate for item in qualified[3:6]) / 3
            improvement = recent_average - previous_average

        insight, provider = await generate_insight(
            InsightInput(
                view_mode=session.view_mode,
                valid_minutes=session.valid_seconds / 60,
                good_posture_rate=session.good_posture_rate,
                event_count=session.posture_event_count,
                average_score=session.average_score,
                primary_issue=session.primary_issue,
                intervention_stage=session.intervention_stage,
                qualified_session_count=len(qualified),
                previous_three_average=previous_average,
                recent_three_average=recent_average,
                improvement_points=improvement,
            ),
            settings,
        )
        session.insight_text = insight
        session.insight_provider = provider
        await db.commit()
        await db.refresh(session)

    history_rows = list(
        (
            await db.scalars(
                select(PostureSession)
                .where(
                    PostureSession.user_id == session.user_id,
                    PostureSession.ended_at.is_not(None),
                )
                .order_by(PostureSession.started_at.desc())
                .limit(12)
            )
        ).all()
    )
    summaries = [to_summary(row) for row in history_rows]
    current_stage = InterventionStage(session.intervention_stage)
    suggested_stage, reason = evaluate_stage(summaries, current_stage)
    return SessionCompleteResponse(
        summary=to_summary(session),
        suggested_stage=suggested_stage,
        stage_reason=reason,
    )


_PERIODS = (
    ("overnight", "凌晨 00:00–06:00"),
    ("morning", "上午 06:00–12:00"),
    ("afternoon", "下午 12:00–18:00"),
    ("evening", "晚上 18:00–24:00"),
)


def _period_name(hour: int) -> str:
    if hour < 6:
        return "overnight"
    if hour < 12:
        return "morning"
    if hour < 18:
        return "afternoon"
    return "evening"


def _aware_utc(value: datetime) -> datetime:
    """Normalize SQLite-naive and PostgreSQL-aware values to aware UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


async def build_weekly_report(
    db: AsyncSession,
    *,
    user_id: str,
    timezone_name: str,
    now: datetime | None = None,
) -> WeeklyReport:
    """Aggregate the signed-in user's current local week from derived samples only."""
    timezone = ZoneInfo(timezone_name)
    local_now = (now or utc_now()).astimezone(timezone)
    local_start = (local_now - timedelta(days=local_now.weekday())).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    local_end = local_start + timedelta(days=7)
    start_utc = local_start.astimezone(UTC)
    end_utc = local_end.astimezone(UTC)

    sessions = list(
        (
            await db.scalars(
                select(PostureSession)
                .where(
                    PostureSession.user_id == user_id,
                    PostureSession.started_at < end_utc,
                    (PostureSession.ended_at.is_(None) | (PostureSession.ended_at >= start_utc)),
                )
                .order_by(PostureSession.started_at)
            )
        ).all()
    )
    session_ids = [session.id for session in sessions]
    samples: list[PostureSample] = []
    if session_ids:
        samples = list(
            (
                await db.scalars(
                    select(PostureSample)
                    .where(
                        PostureSample.session_id.in_(session_ids),
                        PostureSample.captured_at >= start_utc,
                        PostureSample.captured_at < end_utc,
                    )
                    .order_by(PostureSample.captured_at, PostureSample.id)
                )
            ).all()
        )

    totals = {
        name: {
            "valid": 0.0,
            "good": 0.0,
            "attention": 0.0,
            "poor": 0.0,
            "invalid": 0.0,
            "reminders": 0,
        }
        for name, _ in _PERIODS
    }
    issues: dict[str, float] = {}
    weighted_score = 0.0
    valid_seconds = 0.0
    good_seconds = 0.0
    attention_seconds = 0.0
    poor_seconds = 0.0
    invalid_seconds = 0.0
    reminder_count = 0

    for sample in samples:
        local_captured = _aware_utc(sample.captured_at).astimezone(timezone)
        bucket = totals[_period_name(local_captured.hour)]
        duration = sample.duration_seconds
        if not sample.is_valid:
            invalid_seconds += duration
            bucket["invalid"] += duration
            continue

        valid_seconds += duration
        bucket["valid"] += duration
        weighted_score += sample.posture_score * duration
        if sample.event_active:
            poor_seconds += duration
            bucket["poor"] += duration
        elif sample.threshold_exceeded:
            attention_seconds += duration
            bucket["attention"] += duration
        else:
            good_seconds += duration
            bucket["good"] += duration
        if sample.reminder_triggered:
            reminder_count += 1
            bucket["reminders"] += 1
        if sample.threshold_exceeded:
            for reason in sample.reasons:
                issues[reason] = issues.get(reason, 0.0) + duration

    time_periods = [
        WeeklyTimePeriod(
            period=name,
            label=label,
            valid_seconds=round(float(totals[name]["valid"]), 1),
            good_seconds=round(float(totals[name]["good"]), 1),
            attention_seconds=round(float(totals[name]["attention"]), 1),
            poor_seconds=round(float(totals[name]["poor"]), 1),
            good_posture_rate=round(
                float(totals[name]["good"]) / float(totals[name]["valid"]) * 100,
                1,
            )
            if totals[name]["valid"]
            else 0,
            reminder_count=int(totals[name]["reminders"]),
        )
        for name, label in _PERIODS
    ]
    primary_issue = max(issues, key=issues.__getitem__) if issues else None
    latest = sessions[-1] if sessions else None
    qualified_count = sum(session.valid_seconds >= 600 for session in sessions)
    weekly_input = InsightInput(
        view_mode=latest.view_mode if latest else "auto",
        valid_minutes=valid_seconds / 60,
        good_posture_rate=good_seconds / valid_seconds * 100 if valid_seconds else 0,
        event_count=reminder_count,
        average_score=weighted_score / valid_seconds if valid_seconds else 0,
        primary_issue=primary_issue,
        intervention_stage=latest.intervention_stage if latest else "starter",
        qualified_session_count=qualified_count,
    )
    # A GET report must not repeatedly spend external-model quota. Reuse an already
    # persisted provider result when available, otherwise produce the deterministic fallback.
    if (
        latest is not None
        and latest.insight_text
        and latest.insight_provider in {"liangjie", "fallback"}
    ):
        insight_text = latest.insight_text
        insight_provider = latest.insight_provider
    else:
        from posture_guardian_api.insights import fallback_insight

        insight_text = fallback_insight(weekly_input)
        insight_provider = "fallback"

    return WeeklyReport(
        period_start=local_start,
        period_end=local_end,
        timezone=timezone_name,
        session_count=len(sessions),
        valid_seconds=round(valid_seconds, 1),
        good_seconds=round(good_seconds, 1),
        attention_seconds=round(attention_seconds, 1),
        poor_seconds=round(poor_seconds, 1),
        invalid_seconds=round(invalid_seconds, 1),
        good_posture_rate=round(good_seconds / valid_seconds * 100, 1)
        if valid_seconds
        else 0,
        reminder_count=reminder_count,
        status_distribution=WeeklyStatusDistribution(
            good_seconds=round(good_seconds, 1),
            attention_seconds=round(attention_seconds, 1),
            poor_seconds=round(poor_seconds, 1),
            invalid_seconds=round(invalid_seconds, 1),
        ),
        time_periods=time_periods,
        primary_issue=primary_issue,
        insight_text=insight_text,
        insight_provider=insight_provider,
    )


async def delete_user_data(db: AsyncSession, user_id: str) -> int:
    """Delete all sessions and cascading samples belonging to one authenticated account."""
    statement = select(PostureSession.id).where(PostureSession.user_id == user_id)
    ids = list((await db.scalars(statement)).all())
    if ids:
        await db.execute(delete(SessionFeedback).where(SessionFeedback.session_id.in_(ids)))
        await db.execute(delete(PostureSample).where(PostureSample.session_id.in_(ids)))
    result = await db.execute(delete(PostureSession).where(PostureSession.user_id == user_id))
    await db.commit()
    return int(result.rowcount or 0)  # type: ignore[attr-defined]
