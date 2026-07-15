"""MediaPipe pose extraction and explainable posture geometry."""

from __future__ import annotations

import io
import json
import math
import threading
from collections.abc import Mapping, Sequence
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from posture_guardian_api.schemas import AnalysisResponse, Landmark, ViewMode

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
    ViewMode.SIDE: {"neck_flexion": 15.0, "trunk_flexion": 10.0},
    ViewMode.FRONT: {
        "head_tilt": 10.0,
        "shoulder_tilt": 5.0,
        "trunk_lateral": 8.0,
    },
}

REASON_LABELS = {
    "neck_flexion": "頭頸前傾角度偏移",
    "trunk_flexion": "軀幹前傾角度偏移",
    "head_tilt": "頭部側傾角度偏移",
    "shoulder_tilt": "左右肩線傾斜",
    "trunk_lateral": "軀幹側傾角度偏移",
}


class PoseInputError(ValueError):
    """Raised when image bytes cannot be safely decoded."""


class PoseModelUnavailable(RuntimeError):
    """Raised when the model bundle is absent or failed to initialize."""


def _angle_from_vertical(top: Landmark, bottom: Landmark) -> float:
    """Signed degrees between the bottom-to-top vector and screen vertical."""
    return math.degrees(math.atan2(top.x - bottom.x, bottom.y - top.y))


def _angle_from_horizontal(left: Landmark, right: Landmark) -> float:
    """Signed degrees of a left-to-right line relative to screen horizontal."""
    return math.degrees(math.atan2(right.y - left.y, right.x - left.x))


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


def _required_landmarks(
    landmarks: Sequence[Landmark], view_mode: ViewMode
) -> tuple[list[Landmark], str | None]:
    """Select required landmarks and the best visible side when applicable."""
    if view_mode is ViewMode.FRONT:
        required = [
            landmarks[7],
            landmarks[8],
            landmarks[11],
            landmarks[12],
            landmarks[23],
            landmarks[24],
        ]
        return required, None

    left = [landmarks[7], landmarks[11], landmarks[23]]
    right = [landmarks[8], landmarks[12], landmarks[24]]
    left_score = sum(point.visibility for point in left) / len(left)
    right_score = sum(point.visibility for point in right) / len(right)
    return (left, "left") if left_score >= right_score else (right, "right")


def calculate_metrics(
    landmarks: Sequence[Landmark], view_mode: ViewMode
) -> tuple[dict[str, float], float, str | None]:
    """Calculate viewpoint-specific metrics from 33 normalized landmarks."""
    if len(landmarks) < 33:
        raise PoseInputError("姿勢模型未回傳完整的 33 個骨架節點。")

    required, selected_side = _required_landmarks(landmarks, view_mode)
    quality = min(point.visibility for point in required)

    if view_mode is ViewMode.SIDE:
        ear, shoulder, hip = required
        metrics = {
            "neck_flexion": round(_angle_from_vertical(ear, shoulder), 2),
            "trunk_flexion": round(_angle_from_vertical(shoulder, hip), 2),
        }
        return metrics, round(quality, 3), selected_side

    left_ear, right_ear, left_shoulder, right_shoulder, left_hip, right_hip = required
    shoulder_mid = _midpoint(left_shoulder, right_shoulder, "shoulder_mid")
    hip_mid = _midpoint(left_hip, right_hip, "hip_mid")
    metrics = {
        "head_tilt": round(_angle_from_horizontal(left_ear, right_ear), 2),
        "shoulder_tilt": round(_angle_from_horizontal(left_shoulder, right_shoulder), 2),
        "trunk_lateral": round(_angle_from_vertical(shoulder_mid, hip_mid), 2),
    }
    return metrics, round(quality, 3), None


def evaluate_metrics(
    *,
    landmarks: Sequence[Landmark],
    view_mode: ViewMode,
    baseline: Mapping[str, float] | None,
) -> AnalysisResponse:
    """Evaluate quality and deviations against the user's calibrated baseline."""
    metrics, quality, selected_side = calculate_metrics(landmarks, view_mode)
    thresholds = THRESHOLDS[view_mode]

    if quality < 0.7:
        return AnalysisResponse(
            view_mode=view_mode,
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
            message="骨架節點信心不足，請讓耳朵、肩膀與髖部完整入鏡。",
        )

    if not baseline:
        return AnalysisResponse(
            view_mode=view_mode,
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
            message="影格有效，正在建立你的個人姿勢基線。",
        )

    deviations = {
        metric: round(value - float(baseline.get(metric, value)), 2)
        for metric, value in metrics.items()
    }
    exceeded = [metric for metric, delta in deviations.items() if abs(delta) > thresholds[metric]]
    max_ratio = max(
        (abs(deviations[metric]) / threshold for metric, threshold in thresholds.items()),
        default=0,
    )
    posture_score = round(max(0.0, 100.0 - min(100.0, max_ratio * 50.0)), 1)
    reasons = [REASON_LABELS[metric] for metric in exceeded]

    return AnalysisResponse(
        view_mode=view_mode,
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
        return {str(key): float(value) for key, value in parsed.items()}
    except (TypeError, ValueError) as exc:
        raise PoseInputError("baseline 的每個值都必須是數字。") from exc


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
                    base_options=mp.tasks.BaseOptions(model_asset_path=str(self.model_path)),
                    running_mode=mp.tasks.vision.RunningMode.IMAGE,
                    num_poses=1,
                    min_pose_detection_confidence=0.5,
                    min_pose_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    output_segmentation_masks=False,
                )
                self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)
            except Exception as exc:  # MediaPipe exposes several native exception types.
                raise PoseModelUnavailable(f"姿勢模型初始化失敗：{exc}") from exc
        return self._landmarker

    def detect(self, image_bytes: bytes) -> list[Landmark]:
        """Decode bytes, infer a single pose, and return normalized landmarks."""
        try:
            with Image.open(io.BytesIO(image_bytes)) as source:
                rgb_image = ImageOps.exif_transpose(source).convert("RGB")
                pixels = np.asarray(rgb_image)
        except (UnidentifiedImageError, OSError, ValueError) as exc:
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
            raise PoseInputError(f"姿勢推論失敗：{exc}") from exc

        if not result.pose_landmarks:
            return []

        return [
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
