"""Pydantic request and response contracts."""

import math
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ViewMode(StrEnum):
    """Supported camera viewpoints."""

    SIDE = "side"
    FRONT = "front"


class InterventionStage(StrEnum):
    """Reminder intensity, not a medical severity level."""

    STARTER = "starter"
    ADVANCED = "advanced"
    INTENSIVE = "intensive"


class Landmark(BaseModel):
    """One normalized MediaPipe pose landmark."""

    index: int
    name: str
    x: float
    y: float
    z: float
    visibility: float


class AnalysisResponse(BaseModel):
    """Pose metrics produced from one transient image."""

    view_mode: ViewMode
    valid: bool
    quality: float
    status: Literal["calibrating", "good", "attention", "invalid"]
    posture_score: float
    metrics: dict[str, float]
    deviations: dict[str, float]
    thresholds: dict[str, float]
    reasons: list[str]
    landmarks: list[Landmark]
    selected_side: Literal["left", "right"] | None = None
    message: str


class StrictInputModel(BaseModel):
    """Reject non-finite JSON numbers in public request bodies."""

    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")


class SessionCreate(StrictInputModel):
    """Create a calibrated work session."""

    profile_id: Annotated[str, Field(min_length=8, max_length=64)]
    view_mode: ViewMode
    intervention_stage: InterventionStage = InterventionStage.STARTER
    baseline: dict[str, float]

    @model_validator(mode="after")
    def validate_baseline(self) -> Self:
        expected = {
            ViewMode.SIDE: {"neck_flexion", "trunk_flexion"},
            ViewMode.FRONT: {"head_tilt", "shoulder_tilt", "trunk_lateral"},
        }[self.view_mode]
        if set(self.baseline) != expected:
            raise ValueError("baseline 欄位與所選視角不一致")
        if any(not math.isfinite(value) or abs(value) > 180 for value in self.baseline.values()):
            raise ValueError("baseline 角度必須是 -180 到 180 的有限數字")
        return self


class SessionCreated(BaseModel):
    """New session identifier and server timestamp."""

    id: str
    started_at: datetime


class SampleCreate(StrictInputModel):
    """Persist derived values from one observation interval."""

    duration_seconds: Annotated[float, Field(gt=0, le=5)] = 0.5
    is_valid: bool
    threshold_exceeded: bool = False
    event_active: bool = False
    posture_score: Annotated[float, Field(ge=0, le=100)] = 0
    metrics: dict[str, float] = Field(default_factory=dict)
    deviations: dict[str, float] = Field(default_factory=dict)
    reasons: list[Annotated[str, Field(max_length=64)]] = Field(default_factory=list, max_length=5)

    @field_validator("metrics", "deviations")
    @classmethod
    def validate_metric_map(cls, value: dict[str, float]) -> dict[str, float]:
        if len(value) > 5:
            raise ValueError("姿勢指標欄位過多")
        if any(not math.isfinite(item) or abs(item) > 180 for item in value.values()):
            raise ValueError("姿勢指標必須是 -180 到 180 的有限數字")
        return value


class SampleAccepted(BaseModel):
    """Acknowledgement for a persisted derived sample."""

    accepted: bool = True


class SessionFeedbackCreate(BaseModel):
    """Optional low-risk reminder experience feedback."""

    reminder_fit: Literal["just_right", "too_frequent", "easy_to_miss"]
    feeling: Literal["interrupted", "in_control", "neutral"] | None = None


class FeedbackAccepted(BaseModel):
    """Acknowledgement for an upserted categorical feedback response."""

    accepted: bool = True


class SessionSummary(BaseModel):
    """Completed session summary used by dashboard and history screens."""

    id: str
    view_mode: ViewMode
    intervention_stage: InterventionStage
    started_at: datetime
    ended_at: datetime | None
    valid_seconds: float
    good_seconds: float
    invalid_seconds: float
    posture_event_count: int
    average_score: float
    good_posture_rate: float
    primary_issue: str | None
    insight_text: str | None
    insight_provider: str


class SessionCompleteResponse(BaseModel):
    """Summary plus the next reminder-stage suggestion."""

    summary: SessionSummary
    suggested_stage: InterventionStage
    stage_reason: str


class SessionList(BaseModel):
    """Recent session history for one anonymous local profile."""

    items: list[SessionSummary]


class DeleteResponse(BaseModel):
    """Deletion result for local privacy controls."""

    deleted_sessions: int


class HealthResponse(BaseModel):
    """Dependency health surfaced to the diagnostics UI."""

    status: Literal["ok", "degraded"]
    database: Literal["ok", "error"]
    pose_model: Literal["ready", "missing"]
    insight_provider: Literal["foundry", "fallback"]
    insight_model: str | None
    insight_prompt_version: str
