"""MediaPipe pose extraction and explainable posture geometry."""

from __future__ import annotations

import io
import json
import logging
import math
import threading
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from posture_guardian_api.schemas import (
    AnalysisResponse,
    CoverageMode,
    DistanceBand,
    FramingStatus,
    Landmark,
    RequestedViewMode,
    ViewMode,
)

MAX_IMAGE_PIXELS = 12_000_000
logger = logging.getLogger(__name__)

POSE_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]

THRESHOLDS: dict[ViewMode, dict[str, float]] = {
    ViewMode.SIDE: {
        "neck_flexion": 15.0,
        "trunk_flexion": 10.0,
        "knee_flexion": 15.0,
    },
    ViewMode.FRONT: {
        "head_tilt": 10.0,
        "shoulder_tilt": 5.0,
        "trunk_lateral": 8.0,
        "hip_tilt": 6.0,
        "knee_tilt": 8.0,
    },
}

REASON_LABELS = {
    "neck_flexion": "頭頸前傾角度偏移",
    "trunk_flexion": "軀幹前傾角度偏移",
    "head_tilt": "頭部側傾角度偏移",
    "shoulder_tilt": "左右肩線傾斜",
    "trunk_lateral": "軀幹側傾角度偏移",
    "hip_tilt": "髖線傾斜",
    "knee_tilt": "膝線傾斜",
    "knee_flexion": "膝部角度偏移",
}

MIN_VISIBILITY = 0.7
MIN_SUBJECT_SCALE = 0.16


def supported_metrics(
    view_mode: ViewMode,
    coverage_mode: CoverageMode,
) -> set[str]:
    """Return the public metric keys allowed for one resolved analysis profile."""
    upper = {
        ViewMode.SIDE: {"neck_flexion", "trunk_flexion"},
        ViewMode.FRONT: {"head_tilt", "shoulder_tilt", "trunk_lateral"},
    }[view_mode]
    lower = {
        ViewMode.SIDE: {"knee_flexion"},
        ViewMode.FRONT: {"hip_tilt", "knee_tilt"},
    }[view_mode]
    return set(upper | lower if coverage_mode is CoverageMode.FULL_BODY else upper)


@dataclass(frozen=True)
class PoseDetection:
    """Transient MediaPipe result with the source-frame geometry."""

    landmarks: list[Landmark]
    world_landmarks: list[Landmark]
    image_width: int
    image_height: int
    pose_count: int


class PoseInputError(ValueError):
    """Raised when image bytes cannot be safely decoded."""


class PoseModelUnavailable(RuntimeError):
    """Raised when the model bundle is absent or failed to initialize."""


def _aspect_x(point: Landmark, image_width: int, image_height: int) -> float:
    """Scale normalized x into normalized-height units before angle calculations."""
    return point.x * image_width / max(image_height, 1)


def _angle_from_vertical(
    top: Landmark,
    bottom: Landmark,
    image_width: int,
    image_height: int,
) -> float:
    """Signed degrees between the bottom-to-top vector and screen vertical."""
    return math.degrees(
        math.atan2(
            _aspect_x(top, image_width, image_height)
            - _aspect_x(bottom, image_width, image_height),
            bottom.y - top.y,
        )
    )


def _angle_from_horizontal(
    left: Landmark,
    right: Landmark,
    image_width: int,
    image_height: int,
) -> float:
    """Signed degrees of a left-to-right line relative to screen horizontal."""
    return math.degrees(
        math.atan2(
            right.y - left.y,
            _aspect_x(right, image_width, image_height)
            - _aspect_x(left, image_width, image_height),
        )
    )


def _joint_angle(
    first: Landmark,
    joint: Landmark,
    third: Landmark,
    image_width: int,
    image_height: int,
) -> float:
    """Return the 0–180 degree 2D angle at a joint using aspect-corrected coordinates."""
    first_vector = (
        _aspect_x(first, image_width, image_height)
        - _aspect_x(joint, image_width, image_height),
        first.y - joint.y,
    )
    third_vector = (
        _aspect_x(third, image_width, image_height)
        - _aspect_x(joint, image_width, image_height),
        third.y - joint.y,
    )
    denominator = math.hypot(*first_vector) * math.hypot(*third_vector)
    if denominator <= 1e-8:
        raise PoseInputError("姿勢節點距離過近，無法穩定計算關節角度。")
    cosine = max(
        -1.0,
        min(
            1.0,
            (first_vector[0] * third_vector[0] + first_vector[1] * third_vector[1])
            / denominator,
        ),
    )
    return math.degrees(math.acos(cosine))


def _midpoint(a: Landmark, b: Landmark, name: str) -> Landmark:
    """Return a synthetic midpoint landmark."""
    return Landmark(
        index=-1,
        name=name,
        x=(a.x + b.x) / 2,
        y=(a.y + b.y) / 2,
        z=(a.z + b.z) / 2,
        visibility=min(a.visibility, b.visibility),
    )


def _visible(points: Sequence[Landmark]) -> bool:
    return all(point.visibility >= MIN_VISIBILITY for point in points)


def _best_side(landmarks: Sequence[Landmark]) -> tuple[str, list[Landmark]]:
    left = [landmarks[index] for index in (7, 11, 23, 25, 27)]
    right = [landmarks[index] for index in (8, 12, 24, 26, 28)]
    left_score = sum(point.visibility for point in left)
    right_score = sum(point.visibility for point in right)
    return ("left", left) if left_score >= right_score else ("right", right)


def resolve_view_mode(
    landmarks: Sequence[Landmark],
    requested: RequestedViewMode,
    world_landmarks: Sequence[Landmark] | None = None,
    image_width: int = 1,
    image_height: int = 1,
) -> ViewMode | None:
    """Resolve a front/side view and reject ambiguous oblique automatic views."""
    if requested is not RequestedViewMode.AUTO:
        return ViewMode(requested.value)
    if len(landmarks) < 25:
        return None

    if world_landmarks and len(world_landmarks) >= 25:
        left = world_landmarks[11]
        right = world_landmarks[12]
        x_span = abs(right.x - left.x)
        depth_span = abs(right.z - left.z)
        total = x_span + depth_span
        if total > 1e-5:
            frontness = x_span / total
            if frontness >= 0.62:
                return ViewMode.FRONT
            if frontness <= 0.38:
                return ViewMode.SIDE

    left_shoulder, right_shoulder = landmarks[11], landmarks[12]
    shoulder_mid = _midpoint(left_shoulder, right_shoulder, "shoulder_mid")
    hip_mid = _midpoint(landmarks[23], landmarks[24], "hip_mid")
    torso_height = math.hypot(
        _aspect_x(shoulder_mid, image_width, image_height)
        - _aspect_x(hip_mid, image_width, image_height),
        shoulder_mid.y - hip_mid.y,
    )
    shoulder_span = math.hypot(
        _aspect_x(left_shoulder, image_width, image_height)
        - _aspect_x(right_shoulder, image_width, image_height),
        left_shoulder.y - right_shoulder.y,
    )
    if torso_height <= 1e-5:
        return None
    ratio = shoulder_span / torso_height
    if ratio >= 0.42:
        return ViewMode.FRONT
    if ratio <= 0.22:
        return ViewMode.SIDE
    return None


def detect_coverage(landmarks: Sequence[Landmark], view_mode: ViewMode) -> CoverageMode:
    """Use full-body rules only when the lower-body chain is confidently visible."""
    if len(landmarks) < 33:
        return CoverageMode.UPPER_BODY
    if view_mode is ViewMode.FRONT:
        lower = [landmarks[index] for index in (23, 24, 25, 26, 27, 28)]
        return CoverageMode.FULL_BODY if _visible(lower) else CoverageMode.UPPER_BODY
    _, side_points = _best_side(landmarks)
    return (
        CoverageMode.FULL_BODY
        if _visible(side_points[2:])
        else CoverageMode.UPPER_BODY
    )


def calculate_metrics(
    landmarks: Sequence[Landmark],
    view_mode: ViewMode,
    *,
    coverage_mode: CoverageMode = CoverageMode.UPPER_BODY,
    image_width: int = 1,
    image_height: int = 1,
) -> tuple[dict[str, float], float, str | None]:
    """Calculate every currently visible viewpoint-specific metric."""
    if len(landmarks) < 33:
        raise PoseInputError("姿勢模型未回傳完整的 33 個骨架節點。")

    if view_mode is ViewMode.SIDE:
        selected_side, side_points = _best_side(landmarks)
        ear, shoulder, hip, knee, ankle = side_points
        metrics: dict[str, float] = {}
        used: list[Landmark] = []
        if _visible([ear, shoulder]):
            metrics["neck_flexion"] = round(
                _angle_from_vertical(ear, shoulder, image_width, image_height),
                2,
            )
            used.extend([ear, shoulder])
        if _visible([shoulder, hip]):
            metrics["trunk_flexion"] = round(
                _angle_from_vertical(shoulder, hip, image_width, image_height),
                2,
            )
            used.extend([shoulder, hip])
        if coverage_mode is CoverageMode.FULL_BODY and _visible([hip, knee, ankle]):
            metrics["knee_flexion"] = round(
                _joint_angle(hip, knee, ankle, image_width, image_height),
                2,
            )
            used.extend([hip, knee, ankle])
        quality = min((point.visibility for point in used), default=0.0)
        return metrics, round(quality, 3), selected_side

    left_ear, right_ear = landmarks[7], landmarks[8]
    left_shoulder, right_shoulder = landmarks[11], landmarks[12]
    left_hip, right_hip = landmarks[23], landmarks[24]
    left_knee, right_knee = landmarks[25], landmarks[26]
    shoulder_mid = _midpoint(left_shoulder, right_shoulder, "shoulder_mid")
    hip_mid = _midpoint(left_hip, right_hip, "hip_mid")
    metrics = {}
    used = []
    if _visible([left_ear, right_ear]):
        metrics["head_tilt"] = round(
            _angle_from_horizontal(left_ear, right_ear, image_width, image_height),
            2,
        )
        used.extend([left_ear, right_ear])
    if _visible([left_shoulder, right_shoulder]):
        metrics["shoulder_tilt"] = round(
            _angle_from_horizontal(
                left_shoulder,
                right_shoulder,
                image_width,
                image_height,
            ),
            2,
        )
        used.extend([left_shoulder, right_shoulder])
    if _visible([left_shoulder, right_shoulder, left_hip, right_hip]):
        metrics["trunk_lateral"] = round(
            _angle_from_vertical(shoulder_mid, hip_mid, image_width, image_height),
            2,
        )
        used.extend([left_shoulder, right_shoulder, left_hip, right_hip])
    if coverage_mode is CoverageMode.FULL_BODY:
        if _visible([left_hip, right_hip]):
            metrics["hip_tilt"] = round(
                _angle_from_horizontal(left_hip, right_hip, image_width, image_height),
                2,
            )
            used.extend([left_hip, right_hip])
        if _visible([left_knee, right_knee]):
            metrics["knee_tilt"] = round(
                _angle_from_horizontal(left_knee, right_knee, image_width, image_height),
                2,
            )
            used.extend([left_knee, right_knee])
    quality = min((point.visibility for point in used), default=0.0)
    return metrics, round(quality, 3), None


def assess_frame(
    landmarks: Sequence[Landmark],
) -> tuple[float, DistanceBand, FramingStatus, list[str]]:
    """Describe subject size and framing without claiming a physical distance."""
    visible = [point for point in landmarks if point.visibility >= 0.5]
    if not visible:
        return 0.0, DistanceBand.UNKNOWN, FramingStatus.OUT_OF_FRAME, ["poor_visibility"]
    left = min(point.x for point in visible)
    right = max(point.x for point in visible)
    top = min(point.y for point in visible)
    bottom = max(point.y for point in visible)
    subject_scale = round(max(0.0, min(1.0, bottom - top)), 3)

    if left < -0.05 or right > 1.05 or top < -0.05 or bottom > 1.05:
        framing = FramingStatus.OUT_OF_FRAME
    elif left < 0.02 or right > 0.98 or top < 0.02 or bottom > 0.98:
        framing = FramingStatus.PARTIAL
    else:
        framing = FramingStatus.COMPLETE

    if subject_scale <= 0:
        distance = DistanceBand.UNKNOWN
    elif subject_scale < 0.28:
        distance = DistanceBand.FAR
    elif subject_scale > 0.92:
        distance = DistanceBand.NEAR
    else:
        distance = DistanceBand.RECOMMENDED

    issues: list[str] = []
    if subject_scale < MIN_SUBJECT_SCALE:
        issues.append("too_far")
    if framing is FramingStatus.PARTIAL:
        issues.append("partial_framing")
    elif framing is FramingStatus.OUT_OF_FRAME:
        issues.append("out_of_frame")
    return subject_scale, distance, framing, issues


def evaluate_metrics(
    *,
    landmarks: Sequence[Landmark],
    view_mode: ViewMode,
    baseline: Mapping[str, float] | None,
    requested_view_mode: RequestedViewMode | None = None,
    coverage_mode: CoverageMode | None = None,
    image_width: int = 1,
    image_height: int = 1,
    pose_count: int = 1,
) -> AnalysisResponse:
    """Evaluate quality and deviations against the user's calibrated baseline."""
    requested = requested_view_mode or RequestedViewMode(view_mode.value)
    coverage = coverage_mode or detect_coverage(landmarks, view_mode)
    metrics, quality, selected_side = calculate_metrics(
        landmarks,
        view_mode,
        coverage_mode=coverage,
        image_width=image_width,
        image_height=image_height,
    )
    thresholds = {
        metric: THRESHOLDS[view_mode][metric]
        for metric in metrics
        if metric in THRESHOLDS[view_mode]
    }
    subject_scale, distance, framing, quality_issues = assess_frame(landmarks)
    if pose_count > 1:
        quality_issues.insert(0, "multiple_people")
    if not metrics:
        quality_issues.append("no_supported_metrics")
    upper_metrics = {
        ViewMode.SIDE: {"neck_flexion", "trunk_flexion"},
        ViewMode.FRONT: {"head_tilt", "shoulder_tilt", "trunk_lateral"},
    }[view_mode]
    has_upper_body_metric = bool(upper_metrics.intersection(metrics))
    if not has_upper_body_metric:
        quality_issues.append("no_upper_body_metrics")

    invalid = (
        pose_count != 1
        or subject_scale < MIN_SUBJECT_SCALE
        or framing is not FramingStatus.COMPLETE
        or quality < MIN_VISIBILITY
        or not metrics
        or not has_upper_body_metric
    )
    if invalid:
        if quality < MIN_VISIBILITY and "poor_visibility" not in quality_issues:
            quality_issues.append("poor_visibility")
        return AnalysisResponse(
            view_mode=view_mode,
            requested_view_mode=requested,
            coverage_mode=coverage,
            valid=False,
            quality=quality,
            status="invalid",
            posture_score=0,
            metrics=metrics,
            deviations={},
            thresholds=thresholds,
            reasons=[],
            landmarks=list(landmarks),
            selected_side=selected_side,
            image_width=image_width,
            image_height=image_height,
            pose_count=pose_count,
            subject_scale=subject_scale,
            distance=distance,
            framing=framing,
            quality_issues=quality_issues,
            message=(
                "畫面中有多位人物，為避免分析到錯誤對象，請一次只讓一人入鏡。"
                if pose_count > 1
                else "骨架距離、取景或節點品質不足，請讓身體清楚進入畫面。"
            ),
        )

    if not baseline:
        return AnalysisResponse(
            view_mode=view_mode,
            requested_view_mode=requested,
            coverage_mode=coverage,
            valid=True,
            quality=quality,
            status="calibrating",
            posture_score=100,
            metrics=metrics,
            deviations={},
            thresholds=thresholds,
            reasons=[],
            landmarks=list(landmarks),
            selected_side=selected_side,
            image_width=image_width,
            image_height=image_height,
            pose_count=pose_count,
            subject_scale=subject_scale,
            distance=distance,
            framing=framing,
            quality_issues=quality_issues,
            message="影格有效，正在建立你的個人姿勢基線。",
        )

    deviations = {
        metric: round(value - float(baseline.get(metric, value)), 2)
        for metric, value in metrics.items()
        if metric in baseline
    }
    thresholds = {metric: THRESHOLDS[view_mode][metric] for metric in deviations}
    if not deviations:
        return AnalysisResponse(
            view_mode=view_mode,
            requested_view_mode=requested,
            coverage_mode=coverage,
            valid=True,
            quality=quality,
            status="calibrating",
            posture_score=100,
            metrics=metrics,
            deviations={},
            thresholds={},
            reasons=[],
            landmarks=list(landmarks),
            selected_side=selected_side,
            image_width=image_width,
            image_height=image_height,
            pose_count=pose_count,
            subject_scale=subject_scale,
            distance=distance,
            framing=framing,
            quality_issues=[*quality_issues, "missing_baseline"],
            message="這個視角尚未建立個人基線，請保持舒服姿勢完成校準。",
        )
    exceeded = [metric for metric, delta in deviations.items() if abs(delta) > thresholds[metric]]
    max_ratio = max(
        (abs(deviations[metric]) / threshold for metric, threshold in thresholds.items()),
        default=0,
    )
    posture_score = round(max(0.0, 100.0 - min(100.0, max_ratio * 50.0)), 1)
    reasons = [REASON_LABELS[metric] for metric in exceeded]

    return AnalysisResponse(
        view_mode=view_mode,
        requested_view_mode=requested,
        coverage_mode=coverage,
        valid=True,
        quality=quality,
        status="attention" if exceeded else "good",
        posture_score=posture_score,
        metrics=metrics,
        deviations=deviations,
        thresholds=thresholds,
        reasons=reasons,
        landmarks=list(landmarks),
        selected_side=selected_side,
        image_width=image_width,
        image_height=image_height,
        pose_count=pose_count,
        subject_scale=subject_scale,
        distance=distance,
        framing=framing,
        quality_issues=quality_issues,
        message=(
            "偵測到角度持續偏離；需維持 8 秒才會觸發提醒。"
            if exceeded
            else "姿勢在個人校準範圍內。"
        ),
    )


def parse_baseline(raw: str | None) -> dict[str, float] | None:
    """Parse an optional multipart JSON baseline."""
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PoseInputError("baseline 必須是有效的 JSON 物件。") from exc
    if not isinstance(parsed, dict):
        raise PoseInputError("baseline 必須是 JSON 物件。")
    try:
        result = {str(key): float(value) for key, value in parsed.items()}
    except (TypeError, ValueError) as exc:
        raise PoseInputError("baseline 的每個值都必須是數字。") from exc
    if any(not math.isfinite(value) or abs(value) > 180 for value in result.values()):
        raise PoseInputError("baseline 角度必須是 -180 到 180 的有限數字。")
    return result


class PoseAnalyzer:
    """Lazily initialized, thread-safe MediaPipe Pose Landmarker wrapper."""

    def __init__(self, model_path: Path) -> None:
        self.model_path = model_path
        self._landmarker: object | None = None
        self._lock = threading.Lock()

    @property
    def ready(self) -> bool:
        """Whether the model bundle exists locally."""
        return self.model_path.is_file()

    def _get_landmarker(self) -> object:
        if not self.ready:
            raise PoseModelUnavailable(
                "姿勢模型尚未下載；請先執行 scripts/download_pose_model.py。"
            )
        if self._landmarker is None:
            try:
                import mediapipe as mp

                options = mp.tasks.vision.PoseLandmarkerOptions(
                    base_options=mp.tasks.BaseOptions(
                        model_asset_path=str(self.model_path),
                        delegate=mp.tasks.BaseOptions.Delegate.CPU,
                    ),
                    running_mode=mp.tasks.vision.RunningMode.IMAGE,
                    num_poses=2,
                    min_pose_detection_confidence=0.5,
                    min_pose_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    output_segmentation_masks=False,
                )
                self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)
            except Exception as exc:  # MediaPipe exposes several native exception types.
                logger.error("pose_model_initialization_failed error_type=%s", type(exc).__name__)
                raise PoseModelUnavailable("姿勢模型初始化失敗，請檢查服務健康狀態。") from exc
        return self._landmarker

    def detect(self, image_bytes: bytes) -> PoseDetection:
        """Decode bytes and return transient landmarks plus source-frame metadata."""
        try:
            with Image.open(io.BytesIO(image_bytes)) as source:
                if source.width * source.height > MAX_IMAGE_PIXELS:
                    raise PoseInputError("影像像素尺寸過大；請使用 1200 萬像素以下影像。")
                rgb_image = ImageOps.exif_transpose(source).convert("RGB")
                image_width, image_height = rgb_image.size
                pixels = np.asarray(rgb_image)
        except PoseInputError:
            raise
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
            raise PoseInputError("無法解碼影像，請上傳 JPEG、PNG 或 WebP。") from exc

        try:
            import mediapipe as mp

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=pixels)
            landmarker = self._get_landmarker()
            with self._lock:
                result = landmarker.detect(mp_image)  # type: ignore[attr-defined]
        except PoseModelUnavailable:
            raise
        except Exception as exc:
            logger.warning("pose_inference_failed error_type=%s", type(exc).__name__)
            raise PoseInputError("姿勢推論暫時失敗，請重新取景後再試一次。") from exc

        pose_count = len(result.pose_landmarks)
        if pose_count == 0:
            return PoseDetection(
                landmarks=[],
                world_landmarks=[],
                image_width=image_width,
                image_height=image_height,
                pose_count=0,
            )

        landmarks = [
            Landmark(
                index=index,
                name=POSE_NAMES[index],
                x=round(float(point.x), 5),
                y=round(float(point.y), 5),
                z=round(float(point.z), 5),
                visibility=round(float(point.visibility or 0), 4),
            )
            for index, point in enumerate(result.pose_landmarks[0])
        ]
        world_landmarks = (
            [
                Landmark(
                    index=index,
                    name=POSE_NAMES[index],
                    x=round(float(point.x), 5),
                    y=round(float(point.y), 5),
                    z=round(float(point.z), 5),
                    visibility=round(float(point.visibility or 0), 4),
                )
                for index, point in enumerate(result.pose_world_landmarks[0])
            ]
            if result.pose_world_landmarks
            else []
        )
        return PoseDetection(
            landmarks=landmarks,
            world_landmarks=world_landmarks,
            image_width=image_width,
            image_height=image_height,
            pose_count=pose_count,
        )
