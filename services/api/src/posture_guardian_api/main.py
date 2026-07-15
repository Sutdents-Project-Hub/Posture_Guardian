"""FastAPI application entrypoint for Posture Guardian."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from posture_guardian_api.config import get_settings
from posture_guardian_api.database import create_tables
from posture_guardian_api.router import router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Initialize prototype persistence before serving requests."""
    await create_tables()
    yield


settings = get_settings()

app = FastAPI(
    title="Posture Guardian API",
    version="0.1.0",
    description="姿勢守衛隊的骨架偵測、姿勢事件、趨勢與個人化建議 API。",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    """Return service identity and the health endpoint location."""
    return {
        "service": "posture-guardian-api",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
    }
