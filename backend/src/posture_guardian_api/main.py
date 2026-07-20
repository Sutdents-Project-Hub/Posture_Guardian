"""FastAPI application entrypoint for Posture Guardian."""

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from posture_guardian_api.config import get_settings
from posture_guardian_api.database import migrate_database
from posture_guardian_api.router import router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Apply versioned database migrations before serving requests."""
    await migrate_database()
    yield


settings = get_settings()

_SECURITY_RESPONSE_HEADERS = {
    "Cache-Control": "no-store",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",
}

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


@app.middleware("http")
async def add_security_response_headers(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Apply browser-safe defaults without replacing proxy-level access controls."""
    response = await call_next(request)
    for name, value in _SECURITY_RESPONSE_HEADERS.items():
        response.headers[name] = value
    return response


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
