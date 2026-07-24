"""Pydantic request and response contracts."""

import math
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class ViewMode(StrEnum):
    """Resolved camera viewpoints supported by posture rules."""

    SIDE = "side"
    FRONT = "front"


class RequestedViewMode(StrEnum):
    """Viewpoint requested by the client before automatic resolution."""

    AUTO = "auto"
    SIDE = "side"
    FRONT = "front"


class CoverageMode(StrEnum):
    """Body coverage that can be evaluated from the current frame."""

    UPPER_BODY = "upper_body"
    FULL_BODY = "full_body"


class DistanceBand(StrEnum):
    """Coarse, non-metric camera-distance guidance derived from body scale."""

    NEAR = "near"
    RECOMMENDED = "recommended"
    FAR = "far"
    UNKNOWN = "unknown"


class FramingStatus(StrEnum):
    """Whether the detected subject is safely inside the image."""

    COMPLETE = "complete"
    PARTIAL = "partial"
    OUT_OF_FRAME = "out_of_frame"


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

    view_mode: ViewMode | None
    requested_view_mode: RequestedViewMode
    coverage_mode: CoverageMode
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
    image_width: int
    image_height: int
    pose_count: int
    subject_scale: float
    distance: DistanceBand
    framing: FramingStatus
    quality_issues: list[str] = Field(default_factory=list)
    message: str


class StrictInputModel(BaseModel):
    """Reject non-finite JSON numbers in public request bodies."""

    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")


class AuthCredentials(StrictInputModel):
    """Email and password accepted for account registration and login."""

    email: EmailStr
    password: Annotated[str, Field(min_length=12, max_length=128)]


class AuthUser(BaseModel):
    """The non-sensitive account fields returned to the client."""

    id: str
    email: EmailStr


class AuthSessionResponse(BaseModel):
    """A newly issued bearer credential and account identity."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: AuthUser


class SessionCreate(StrictInputModel):
    """Create a calibrated work session."""

    view_mode: RequestedViewMode
    coverage_mode: CoverageMode = CoverageMode.UPPER_BODY
    room_mode: bool = False
    intervention_stage: InterventionStage = InterventionStage.STARTER
    baseline: dict[str, float] = Field(min_length=1, max_length=8)

    @model_validator(mode="after")
    def validate_baseline(self) -> Self:
        upper_metrics = {
            ViewMode.SIDE: {"neck_flexion", "trunk_flexion"},
            ViewMode.FRONT: {"head_tilt", "shoulder_tilt", "trunk_lateral"},
        }
        full_metrics = {
            ViewMode.SIDE: {"knee_flexion"},
            ViewMode.FRONT: {"hip_tilt", "knee_tilt"},
        }
        if self.view_mode is RequestedViewMode.AUTO:
            allowed = set().union(*upper_metrics.values())
            if self.coverage_mode is CoverageMode.FULL_BODY:
                allowed.update(*full_metrics.values())
        else:
            resolved = ViewMode(self.view_mode.value)
            allowed = set(upper_metrics[resolved])
            if self.coverage_mode is CoverageMode.FULL_BODY:
                allowed.update(full_metrics[resolved])
        if not set(self.baseline).issubset(allowed):
            raise ValueError("baseline 欄位與所選視角或身體範圍不一致")
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
    reminder_triggered: bool = False
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
    view_mode: RequestedViewMode
    coverage_mode: CoverageMode = CoverageMode.UPPER_BODY
    room_mode: bool = False
    intervention_stage: InterventionStage
    started_at: datetime
    ended_at: datetime | None
    valid_seconds: float
    good_seconds: float
    attention_seconds: float = 0
    poor_seconds: float = 0
    invalid_seconds: float
    posture_event_count: int
    reminder_count: int = 0
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


class WeeklyStatusDistribution(BaseModel):
    """Duration-weighted states for one weekly report."""

    good_seconds: float
    attention_seconds: float
    poor_seconds: float
    invalid_seconds: float


class WeeklyTimePeriod(BaseModel):
    """One local-time bucket in a weekly posture report."""

    period: Literal["overnight", "morning", "afternoon", "evening"]
    label: str
    valid_seconds: float
    good_seconds: float
    attention_seconds: float
    poor_seconds: float
    good_posture_rate: float
    reminder_count: int


class WeeklyReport(BaseModel):
    """An authenticated, duration-weighted weekly posture summary."""

    period_start: datetime
    period_end: datetime
    timezone: str
    session_count: int
    valid_seconds: float
    good_seconds: float
    attention_seconds: float
    poor_seconds: float
    invalid_seconds: float
    good_posture_rate: float
    reminder_count: int
    status_distribution: WeeklyStatusDistribution
    time_periods: list[WeeklyTimePeriod]
    primary_issue: str | None
    insight_text: str
    insight_provider: Literal["liangjie", "fallback"]


class DeleteResponse(BaseModel):
    """Deletion result for local privacy controls."""

    deleted_sessions: int


class HealthResponse(BaseModel):
    """Dependency health surfaced to the diagnostics UI."""

    status: Literal["ok", "degraded"]
    database: Literal["ok", "error"]
    pose_model: Literal["ready", "missing"]
    insight_provider: Literal["liangjie", "fallback"]
    insight_configured: bool
    insight_api_mode: Literal["chat_completions", "responses"] | None
    insight_model: str | None
    insight_prompt_version: str
