"""Deterministic geometry tests for supported camera viewpoints."""

import io
from pathlib import Path

import pytest
from PIL import Image

from posture_guardian_api.posture import (
    PoseAnalyzer,
    PoseInputError,
    calculate_metrics,
    evaluate_metrics,
)
from posture_guardian_api.schemas import Landmark, ViewMode


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


def test_low_visibility_frame_is_invalid_not_bad() -> None:
    points = neutral_landmarks()
    points[11].visibility = 0.5
    result = evaluate_metrics(
        landmarks=points,
        view_mode=ViewMode.FRONT,
        baseline={"head_tilt": 0, "shoulder_tilt": 0, "trunk_lateral": 0},
    )

    assert result.valid is False
    assert result.status == "invalid"
    assert result.reasons == []


def test_oversized_pixel_dimensions_are_rejected_before_inference() -> None:
    image = Image.new("RGB", (4001, 3000))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    analyzer = PoseAnalyzer(Path("missing-model.task"))

    with pytest.raises(PoseInputError, match="1200 萬像素"):
        analyzer.detect(buffer.getvalue())
