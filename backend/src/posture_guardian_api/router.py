"""HTTP routes for analysis, sessions, history, and privacy controls."""

from typing import Annotated
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from posture_guardian_api.config import get_settings
from posture_guardian_api.database import get_db
from posture_guardian_api.insights import PROMPT_VERSION
from posture_guardian_api.models import PostureSample, PostureSession, SessionFeedback
from posture_guardian_api.posture import (
    REASON_LABELS,
    THRESHOLDS,
    PoseAnalyzer,
    PoseInputError,
    PoseModelUnavailable,
    evaluate_metrics,
    parse_baseline,
)
from posture_guardian_api.schemas import (
    AnalysisResponse,
    DeleteResponse,
    FeedbackAccepted,
    HealthResponse,
    SampleAccepted,
    SampleCreate,
    SessionCompleteResponse,
    SessionCreate,
    SessionCreated,
    SessionFeedbackCreate,
    SessionList,
    ViewMode,
)
from posture_guardian_api.sessions import complete_session, delete_profile_data, to_summary

router = APIRouter()
settings = get_settings()
pose_analyzer = PoseAnalyzer(settings.pose_model_path)

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/live", tags=["meta"])
async def live() -> dict[str, str]:
    """Return process liveness without checking downstream dependencies."""
    return {"status": "ok"}


@router.get("/health", response_model=HealthResponse, tags=["meta"])
async def health(response: Response, db: DatabaseDep) -> HealthResponse:
    """Check the database, local model bundle, and configured insight provider."""
    database_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        database_status = "error"
    model_status = "ready" if pose_analyzer.ready else "missing"
    overall = "ok" if database_status == "ok" and model_status == "ready" else "degraded"
    if overall == "degraded":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(
        status=overall,
        database=database_status,
        pose_model=model_status,
        insight_provider="foundry" if settings.foundry_configured else "fallback",
        insight_model=settings.azure_foundry_model if settings.foundry_configured else None,
        insight_prompt_version=PROMPT_VERSION,
    )


@router.post(
    "/api/v1/posture/analyze",
    response_model=AnalysisResponse,
    tags=["posture"],
)
async def analyze_posture(
    image: Annotated[UploadFile, File(description="Transient camera frame")],
    view_mode: Annotated[ViewMode, Form()],
    baseline: Annotated[str | None, Form()] = None,
) -> AnalysisResponse:
    """Analyze one camera frame without persisting its bytes."""
    content_type = image.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="只接受影像檔案。")
    image_bytes = await image.read(settings.max_image_bytes + 1)
    await image.close()
    if len(image_bytes) > settings.max_image_bytes:
        raise HTTPException(status_code=413, detail="影像超過 5 MB 上限。")

    try:
        parsed_baseline = parse_baseline(baseline)
        if parsed_baseline is not None and set(parsed_baseline) != set(THRESHOLDS[view_mode]):
            raise PoseInputError("baseline 欄位與所選視角不一致。")
        landmarks = await run_in_threadpool(pose_analyzer.detect, image_bytes)
        if not landmarks:
            return AnalysisResponse(
                view_mode=view_mode,
                valid=False,
                quality=0,
                status="invalid",
                posture_score=0,
                metrics={},
                deviations={},
                thresholds=THRESHOLDS[view_mode],
                reasons=[],
                landmarks=[],
                message="畫面中找不到完整坐姿，請調整距離與光線。",
            )
        return evaluate_metrics(
            landmarks=landmarks,
            view_mode=view_mode,
            baseline=parsed_baseline,
        )
    except PoseModelUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PoseInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/api/v1/sessions",
    response_model=SessionCreated,
    status_code=status.HTTP_201_CREATED,
    tags=["sessions"],
)
async def create_session(payload: SessionCreate, db: DatabaseDep) -> SessionCreated:
    """Start storage after calibration has produced a valid baseline."""
    session = PostureSession(
        id=str(uuid4()),
        profile_id=payload.profile_id,
        view_mode=payload.view_mode.value,
        intervention_stage=payload.intervention_stage.value,
        baseline=payload.baseline,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionCreated(id=session.id, started_at=session.started_at)


@router.post(
    "/api/v1/sessions/{session_id}/samples",
    response_model=SampleAccepted,
    tags=["sessions"],
)
async def add_sample(
    session_id: str,
    payload: SampleCreate,
    db: DatabaseDep,
) -> SampleAccepted:
    """Store derived metrics only; no image or landmark arrays enter the database."""
    session = await db.get(PostureSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="找不到工作階段。")
    if session.ended_at is not None:
        raise HTTPException(status_code=409, detail="工作階段已結束。")
    expected_metrics = set(THRESHOLDS[ViewMode(session.view_mode)])
    if not set(payload.metrics).issubset(expected_metrics):
        raise HTTPException(status_code=422, detail="metrics 欄位與工作階段視角不一致。")
    if not set(payload.deviations).issubset(expected_metrics):
        raise HTTPException(status_code=422, detail="deviations 欄位與工作階段視角不一致。")
    if not set(payload.reasons).issubset(REASON_LABELS.values()):
        raise HTTPException(status_code=422, detail="reasons 包含不支援的姿勢事件。")
    db.add(
        PostureSample(
            session_id=session_id,
            duration_seconds=payload.duration_seconds,
            is_valid=payload.is_valid,
            threshold_exceeded=payload.threshold_exceeded,
            event_active=payload.event_active,
            posture_score=payload.posture_score,
            metrics=payload.metrics,
            deviations=payload.deviations,
            reasons=payload.reasons,
        )
    )
    await db.commit()
    return SampleAccepted()


@router.post(
    "/api/v1/sessions/{session_id}/complete",
    response_model=SessionCompleteResponse,
    tags=["sessions"],
)
async def finish_session(session_id: str, db: DatabaseDep) -> SessionCompleteResponse:
    """Finish idempotently and produce summary, insight, and stage suggestion."""
    session = await db.get(PostureSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="找不到工作階段。")
    return await complete_session(db, session, get_settings())


@router.post(
    "/api/v1/sessions/{session_id}/feedback",
    response_model=FeedbackAccepted,
    tags=["sessions"],
)
async def save_feedback(
    session_id: str,
    payload: SessionFeedbackCreate,
    db: DatabaseDep,
) -> FeedbackAccepted:
    """Save optional categorical UX feedback for a completed session."""
    session = await db.get(PostureSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="找不到工作階段。")
    if session.ended_at is None:
        raise HTTPException(status_code=409, detail="工作階段尚未結束。")
    feedback = await db.get(SessionFeedback, session_id)
    if feedback is None:
        feedback = SessionFeedback(session_id=session_id, reminder_fit=payload.reminder_fit)
        db.add(feedback)
    feedback.reminder_fit = payload.reminder_fit
    feedback.feeling = payload.feeling
    await db.commit()
    return FeedbackAccepted()


@router.get("/api/v1/sessions", response_model=SessionList, tags=["sessions"])
async def list_sessions(
    db: DatabaseDep,
    profile_id: Annotated[str, Query(min_length=8, max_length=64)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SessionList:
    """Return the most recent completed and active sessions for a local profile."""
    rows = list(
        (
            await db.scalars(
                select(PostureSession)
                .where(PostureSession.profile_id == profile_id)
                .order_by(PostureSession.started_at.desc())
                .limit(limit)
            )
        ).all()
    )
    return SessionList(items=[to_summary(row) for row in rows])


@router.delete(
    "/api/v1/profiles/{profile_id}/data",
    response_model=DeleteResponse,
    tags=["privacy"],
)
async def delete_data(profile_id: str, db: DatabaseDep) -> DeleteResponse:
    """Let a user remove all of their anonymously keyed session data."""
    if not 8 <= len(profile_id) <= 64:
        raise HTTPException(status_code=422, detail="profile_id 格式錯誤。")
    deleted = await delete_profile_data(db, profile_id)
    return DeleteResponse(deleted_sessions=deleted)
