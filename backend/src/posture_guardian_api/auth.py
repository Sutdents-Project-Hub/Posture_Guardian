"""Password authentication and opaque server-side session helpers."""

from dataclasses import dataclass
from datetime import timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, Header, HTTPException, status
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from posture_guardian_api.config import get_settings
from posture_guardian_api.database import get_db
from posture_guardian_api.models import AuthSession, User, utc_now

password_hash = PasswordHash.recommended()
_DUMMY_PASSWORD_HASH = password_hash.hash("Posture-Guardian-invalid-password")
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]


@dataclass(frozen=True)
class AuthenticatedSession:
    """The verified account and the opaque session that authenticated it."""

    user: User
    session: AuthSession


def normalize_email(email: str) -> str:
    """Use a stable, case-insensitive account key without altering the local part otherwise."""
    return email.strip().casefold()


def hash_password(password: str) -> str:
    """Hash a password with pwdlib's recommended Argon2 configuration."""
    return password_hash.hash(password)


def password_matches(password: str, stored_hash: str) -> bool:
    """Verify a password without ever returning or logging its hash."""
    return password_hash.verify(password, stored_hash)


def verify_unknown_password(password: str) -> None:
    """Perform equivalent work for unknown emails to reduce timing differences."""
    password_hash.verify(password, _DUMMY_PASSWORD_HASH)


def _token_hash(token: str) -> str:
    """Store only a one-way digest of random bearer credentials."""
    return sha256(token.encode("utf-8")).hexdigest()


def issue_session(user: User) -> tuple[str, AuthSession]:
    """Create a revocable opaque bearer token and its server-side record."""
    raw_token = token_urlsafe(32)
    now = utc_now()
    session = AuthSession(
        id=str(uuid4()),
        user_id=user.id,
        token_hash=_token_hash(raw_token),
        created_at=now,
        expires_at=now + timedelta(days=get_settings().auth_session_days),
    )
    return raw_token, session


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="請先登入後再繼續。",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_authenticated_session(
    db: DatabaseDep,
    authorization: Annotated[str | None, Header()] = None,
) -> AuthenticatedSession:
    """Resolve a non-expired bearer token to an account and session record."""
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized()
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise _unauthorized()
    statement = (
        select(AuthSession, User)
        .join(User, AuthSession.user_id == User.id)
        .where(
            AuthSession.token_hash == _token_hash(token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utc_now(),
        )
    )
    row = (await db.execute(statement)).one_or_none()
    if row is None:
        raise _unauthorized()
    session, user = row
    return AuthenticatedSession(user=user, session=session)


async def get_current_user(
    authenticated: Annotated[AuthenticatedSession, Depends(get_authenticated_session)],
) -> User:
    """Expose only the account to routes that do not need session revocation."""
    return authenticated.user
