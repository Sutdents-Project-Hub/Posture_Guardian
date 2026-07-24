"""Deterministic geometry tests for supported camera viewpoints."""

import io
from pathlib import Path

import pytest
from PIL import Image

from posture_guardian_api.posture import (
    PoseAnalyzer,
    PoseInputError,
    assess_frame,
    calculate_metrics,
    detect_coverage,
    evaluate_metrics,
    resolve_view_mode,
)
from posture_guardian_api.schemas import CoverageMode, Landmark, RequestedViewMode, ViewMode


def landmark(index: int, x: float, y: float, visibility: float = 0.98) -> Landmark:
    return Landmark(
        index=index,
        name=f"point_{index}",
        x=x,
        y=y,
        z=0,
        visibility=visibility,
    )


def neutral_landmarks() -> list[Landmark]:
    points = [landmark(index, 0.5, 0.5, 0.2) for index in range(33)]
    points[7] = landmark(7, 0.42, 0.2)
    points[8] = landmark(8, 0.58, 0.2)
    points[11] = landmark(11, 0.42, 0.4)
    points[12] = landmark(12, 0.58, 0.4)
    points[23] = landmark(23, 0.42, 0.7)
    points[24] = landmark(24, 0.58, 0.7)
    return points


def full_landmarks() -> list[Landmark]:
    points = neutral_landmarks()
    points[25] = landmark(25, 0.44, 0.82)
    points[26] = landmark(26, 0.56, 0.82)
    points[27] = landmark(27, 0.44, 0.96)
    points[28] = landmark(28, 0.56, 0.96)
    return points


def test_side_metrics_use_best_visible_side_and_personal_baseline() -> None:
    points = neutral_landmarks()
    points[8].visibility = 0.6
    points[12].visibility = 0.6
    points[24].visibility = 0.6
    metrics, quality, side = calculate_metrics(points, ViewMode.SIDE)

    assert side == "left"
    assert quality == 0.98
    assert metrics == {"neck_flexion": 0.0, "trunk_flexion": 0.0}

    points[7] = landmark(7, 0.54, 0.2)
    result = evaluate_metrics(
        landmarks=points,
        view_mode=ViewMode.SIDE,
        baseline={"neck_flexion": 0, "trunk_flexion": 0},
    )

    assert result.valid is True
    assert result.status == "attention"
    assert result.deviations["neck_flexion"] > 15
    assert "頭頸前傾角度偏移" in result.reasons


def test_front_metrics_do_not_claim_forward_flexion() -> None:
    result = evaluate_metrics(
        landmarks=neutral_landmarks(),
        view_mode=ViewMode.FRONT,
        baseline={"head_tilt": 0, "shoulder_tilt": 0, "trunk_lateral": 0},
    )

    assert result.status == "good"
    assert set(result.metrics) == {"head_tilt", "shoulder_tilt", "trunk_lateral"}
    assert "neck_flexion" not in result.metrics


def test_low_visibility_only_removes_metrics_that_need_the_hidden_landmark() -> None:
    points = neutral_landmarks()
    points[11].visibility = 0.5
    result = evaluate_metrics(
        landmarks=points,
        view_mode=ViewMode.FRONT,
        baseline={"head_tilt": 0, "shoulder_tilt": 0, "trunk_lateral": 0},
    )

    assert result.valid is True
    assert result.status == "good"
    assert set(result.metrics) == {"head_tilt"}
    assert result.reasons == []


def test_full_body_adds_view_specific_lower_body_metrics() -> None:
    points = full_landmarks()

    assert detect_coverage(points, ViewMode.FRONT) is CoverageMode.FULL_BODY
    front, _, _ = calculate_metrics(
        points,
        ViewMode.FRONT,
        coverage_mode=CoverageMode.FULL_BODY,
    )
    side, _, _ = calculate_metrics(
        points,
        ViewMode.SIDE,
        coverage_mode=CoverageMode.FULL_BODY,
    )

    assert set(front) == {
        "head_tilt",
        "shoulder_tilt",
        "trunk_lateral",
        "hip_tilt",
        "knee_tilt",
    }
    assert set(side) == {"neck_flexion", "trunk_flexion", "knee_flexion"}


def test_auto_view_resolves_front_side_and_rejects_oblique() -> None:
    front = neutral_landmarks()
    assert resolve_view_mode(front, RequestedViewMode.AUTO) is ViewMode.FRONT

    side = neutral_landmarks()
    side[11] = landmark(11, 0.49, 0.4)
    side[12] = landmark(12, 0.51, 0.4)
    assert resolve_view_mode(side, RequestedViewMode.AUTO) is ViewMode.SIDE

    oblique = neutral_landmarks()
    oblique[11] = landmark(11, 0.46, 0.4)
    oblique[12] = landmark(12, 0.54, 0.4)
    assert resolve_view_mode(oblique, RequestedViewMode.AUTO) is None


def test_auto_view_fallback_is_aspect_corrected() -> None:
    wide = neutral_landmarks()
    aspect = 16 / 9
    for index in (7, 8, 11, 12, 23, 24):
        wide[index].x /= aspect

    assert (
        resolve_view_mode(
            wide,
            RequestedViewMode.AUTO,
            image_width=1600,
            image_height=900,
        )
        is ViewMode.FRONT
    )


def test_angles_are_invariant_to_image_aspect_ratio() -> None:
    def points_for(width: int, height: int) -> list[Landmark]:
        points = neutral_landmarks()
        aspect = width / height
        points[7] = landmark(7, 0.62 / aspect, 0.2)
        points[11] = landmark(11, 0.50 / aspect, 0.4)
        points[23] = landmark(23, 0.50 / aspect, 0.7)
        return points

    wide, _, _ = calculate_metrics(
        points_for(1600, 900),
        ViewMode.SIDE,
        image_width=1600,
        image_height=900,
    )
    square, _, _ = calculate_metrics(
        points_for(900, 900),
        ViewMode.SIDE,
        image_width=900,
        image_height=900,
    )

    assert wide["neck_flexion"] == pytest.approx(square["neck_flexion"])


def test_too_far_partial_and_multiple_people_are_rejected() -> None:
    far = neutral_landmarks()
    for point in far:
        if point.visibility >= 0.5:
            point.y = 0.48 + (point.y - 0.45) * 0.2
    scale, _, _, issues = assess_frame(far)
    assert scale < 0.16
    assert "too_far" in issues
    result = evaluate_metrics(
        landmarks=far,
        view_mode=ViewMode.FRONT,
        baseline={"head_tilt": 0},
    )
    assert result.valid is False
    assert "too_far" in result.quality_issues

    partial = neutral_landmarks()
    partial[7].y = 0.01
    result = evaluate_metrics(
        landmarks=partial,
        view_mode=ViewMode.FRONT,
        baseline={"head_tilt": 0},
    )
    assert result.valid is False
    assert "partial_framing" in result.quality_issues

    result = evaluate_metrics(
        landmarks=neutral_landmarks(),
        view_mode=ViewMode.FRONT,
        baseline={"head_tilt": 0},
        pose_count=2,
    )
    assert result.valid is False
    assert "multiple_people" in result.quality_issues


def test_lower_body_only_does_not_count_as_valid_posture() -> None:
    points = full_landmarks()
    for index in (7, 8, 11, 12):
        points[index].visibility = 0.2

    result = evaluate_metrics(
        landmarks=points,
        view_mode=ViewMode.FRONT,
        coverage_mode=CoverageMode.FULL_BODY,
        baseline={"hip_tilt": 0, "knee_tilt": 0},
    )

    assert result.valid is False
    assert "no_upper_body_metrics" in result.quality_issues


def test_oversized_pixel_dimensions_are_rejected_before_inference() -> None:
    image = Image.new("RGB", (4001, 3000))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    analyzer = PoseAnalyzer(Path("missing-model.task"))

    with pytest.raises(PoseInputError, match="1200 萬像素"):
        analyzer.detect(buffer.getvalue())
