"""HTTP routes for analysis, sessions, history, and privacy controls."""

from datetime import datetime
from typing import Annotated
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from posture_guardian_api.auth import (
    AuthenticatedSession,
    get_authenticated_session,
    get_current_user,
    hash_password,
    issue_session,
    normalize_email,
    password_matches,
    verify_unknown_password,
)
from posture_guardian_api.config import get_settings
from posture_guardian_api.database import get_db
from posture_guardian_api.insights import PROMPT_VERSION
from posture_guardian_api.models import PostureSample, PostureSession, SessionFeedback, User
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
    AuthCredentials,
    AuthSessionResponse,
    AuthUser,
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
from posture_guardian_api.sessions import complete_session, delete_user_data, to_summary

router = APIRouter()
settings = get_settings()
pose_analyzer = PoseAnalyzer(settings.pose_model_path)

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAuth = Annotated[AuthenticatedSession, Depends(get_authenticated_session)]


def auth_response(token: str, session_expires_at: datetime, user: User) -> AuthSessionResponse:
    """Build the only client-visible representation of a successful login."""
    return AuthSessionResponse(
        access_token=token,
        expires_at=session_expires_at,
        user=AuthUser(id=user.id, email=user.email),
    )


async def owned_session(db: AsyncSession, session_id: str, user: User) -> PostureSession:
    """Return a session only when it belongs to the authenticated account."""
    session = await db.get(PostureSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="找不到工作階段。")
    return session


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
        insight_provider=settings.ai_provider,
        insight_configured=settings.insight_configured,
        insight_api_mode=settings.ai_api_mode if settings.insight_configured else None,
        insight_model=settings.ai_model if settings.insight_configured else None,
        insight_prompt_version=PROMPT_VERSION,
    )


@router.post(
    "/api/v1/auth/register",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
)
async def register_account(payload: AuthCredentials, db: DatabaseDep) -> AuthSessionResponse:
    """Register an account, storing only an Argon2 password hash."""
    email = normalize_email(str(payload.email))
    existing = await db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="這個 Email 已註冊，請直接登入。")
    user = User(id=str(uuid4()), email=email, password_hash=hash_password(payload.password))
    token, session = issue_session(user)
    db.add_all([user, session])
    await db.commit()
    return auth_response(token, session.expires_at, user)


@router.post("/api/v1/auth/login", response_model=AuthSessionResponse, tags=["auth"])
async def login_account(payload: AuthCredentials, db: DatabaseDep) -> AuthSessionResponse:
    """Authenticate an account and issue a new revocable bearer session."""
    email = normalize_email(str(payload.email))
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        verify_unknown_password(payload.password)
        raise HTTPException(status_code=401, detail="Email 或密碼不正確。")
    if not password_matches(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email 或密碼不正確。")
    token, session = issue_session(user)
    db.add(session)
    await db.commit()
    return auth_response(token, session.expires_at, user)


@router.get("/api/v1/auth/me", response_model=AuthUser, tags=["auth"])
async def current_account(user: CurrentUser) -> AuthUser:
    """Return the authenticated account without exposing password or session records."""
    return AuthUser(id=user.id, email=user.email)


@router.post("/api/v1/auth/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def logout_account(current: CurrentAuth, db: DatabaseDep) -> Response:
    """Revoke the current bearer session immediately."""
    await db.delete(current.session)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
async def create_session(
    payload: SessionCreate,
    db: DatabaseDep,
    user: CurrentUser,
) -> SessionCreated:
    """Start storage after calibration has produced a valid baseline."""
    session = PostureSession(
        id=str(uuid4()),
        profile_id=user.id,
        user_id=user.id,
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
    user: CurrentUser,
) -> SampleAccepted:
    """Store derived metrics only; no image or landmark arrays enter the database."""
    session = await owned_session(db, session_id, user)
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
async def finish_session(
    session_id: str,
    db: DatabaseDep,
    user: CurrentUser,
) -> SessionCompleteResponse:
    """Finish idempotently and produce summary, insight, and stage suggestion."""
    session = await owned_session(db, session_id, user)
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
    user: CurrentUser,
) -> FeedbackAccepted:
    """Save optional categorical UX feedback for a completed session."""
    session = await owned_session(db, session_id, user)
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
    user: CurrentUser,
    limit: int = 20,
) -> SessionList:
    """Return the most recent completed and active sessions for the signed-in account."""
    if not 1 <= limit <= 50:
        raise HTTPException(status_code=422, detail="limit 必須介於 1 到 50。")
    rows = list(
        (
            await db.scalars(
                select(PostureSession)
                .where(PostureSession.user_id == user.id)
                .order_by(PostureSession.started_at.desc())
                .limit(limit)
            )
        ).all()
    )
    return SessionList(items=[to_summary(row) for row in rows])


@router.delete(
    "/api/v1/account/data",
    response_model=DeleteResponse,
    tags=["privacy"],
)
async def delete_data(db: DatabaseDep, user: CurrentUser) -> DeleteResponse:
    """Let a signed-in account remove all of its derived posture records."""
    deleted = await delete_user_data(db, user.id)
    return DeleteResponse(deleted_sessions=deleted)
