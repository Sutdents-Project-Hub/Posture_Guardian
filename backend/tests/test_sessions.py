"""Tests for the six-session reminder-stage rule."""

from datetime import datetime, timedelta

from posture_guardian_api.insights import InsightInput, fallback_insight, validate_model_insight
from posture_guardian_api.schemas import InterventionStage, SessionSummary, ViewMode
from posture_guardian_api.sessions import evaluate_stage


def summary(
    index: int,
    good_rate: float,
    stage: InterventionStage = InterventionStage.STARTER,
) -> SessionSummary:
    started = datetime.now().astimezone() - timedelta(days=index)
    return SessionSummary(
        id=str(index),
        view_mode=ViewMode.SIDE,
        intervention_stage=stage,
        started_at=started,
        ended_at=started + timedelta(minutes=10),
        valid_seconds=600,
        good_seconds=600 * good_rate / 100,
        invalid_seconds=0,
        posture_event_count=1,
        average_score=70,
        good_posture_rate=good_rate,
        primary_issue="頭頸前傾角度偏移",
        insight_text=None,
        insight_provider="fallback",
    )


def test_stage_waits_for_six_qualified_sessions() -> None:
    stage, reason = evaluate_stage(
        [summary(index, 60) for index in range(5)],
        InterventionStage.STARTER,
    )

    assert stage is InterventionStage.STARTER
    assert "還需要 1 次" in reason


def test_stage_increases_when_recent_bad_rate_stays_high() -> None:
    newest_first = [
        summary(0, 62),
        summary(1, 60),
        summary(2, 61),
        summary(3, 60),
        summary(4, 60),
        summary(5, 60),
    ]

    stage, _ = evaluate_stage(newest_first, InterventionStage.STARTER)

    assert stage is InterventionStage.ADVANCED


def test_stage_decreases_after_ten_point_improvement() -> None:
    newest_first = [
        summary(0, 82),
        summary(1, 80),
        summary(2, 81),
        summary(3, 65),
        summary(4, 66),
        summary(5, 64),
    ]

    stage, _ = evaluate_stage(newest_first, InterventionStage.ADVANCED)

    assert stage is InterventionStage.STARTER


def test_stage_waits_until_three_sessions_after_a_stage_change() -> None:
    newest_first = [
        summary(0, 55, InterventionStage.ADVANCED),
        summary(1, 56, InterventionStage.ADVANCED),
        summary(2, 62),
        summary(3, 60),
        summary(4, 61),
        summary(5, 60),
        summary(6, 60),
        summary(7, 60),
    ]

    stage, reason = evaluate_stage(newest_first, InterventionStage.ADVANCED)

    assert stage is InterventionStage.ADVANCED
    assert "2/3 次" in reason


def test_stage_can_change_again_only_on_the_ninth_qualified_session() -> None:
    initial = [summary(index, 60) for index in range(6)]
    stage, _ = evaluate_stage(initial, InterventionStage.STARTER)
    assert stage is InterventionStage.ADVANCED

    after_seven = [summary(0, 55, InterventionStage.ADVANCED), *initial]
    stage, _ = evaluate_stage(after_seven, InterventionStage.ADVANCED)
    assert stage is InterventionStage.ADVANCED

    after_eight = [
        summary(0, 55, InterventionStage.ADVANCED),
        summary(1, 56, InterventionStage.ADVANCED),
        *initial,
    ]
    stage, _ = evaluate_stage(after_eight, InterventionStage.ADVANCED)
    assert stage is InterventionStage.ADVANCED

    after_nine = [
        summary(0, 55, InterventionStage.ADVANCED),
        summary(1, 56, InterventionStage.ADVANCED),
        summary(2, 54, InterventionStage.ADVANCED),
        *initial,
    ]
    stage, _ = evaluate_stage(after_nine, InterventionStage.ADVANCED)
    assert stage is InterventionStage.INTENSIVE


def test_model_insight_rejects_medical_or_malformed_output() -> None:
    assert validate_model_insight("診斷：你已罹患脊椎疾病，請接受治療。") is None
    assert validate_model_insight("只有一段沒有固定結構的建議") is None
    assert (
        validate_model_insight("趨勢：資料仍不足｜下一步：調高螢幕｜下次目標：觀察 10 分鐘")
        is not None
    )


def test_fallback_insight_explains_long_term_trend() -> None:
    text = fallback_insight(
        InsightInput(
            view_mode="side",
            valid_minutes=12,
            good_posture_rate=72,
            event_count=2,
            average_score=76,
            primary_issue="頭頸前傾角度偏移",
            intervention_stage="starter",
            qualified_session_count=6,
            previous_three_average=60,
            recent_three_average=72,
            improvement_points=12,
        )
    )

    assert "提升 12 個百分點" in text
    assert "下一步：" in text
    assert "下次目標：" in text
