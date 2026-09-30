"""Moderator authentication: single Bearer API key, constant-time compare."""
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .schemas import ErrorBody

_bearer = HTTPBearer(auto_error=False)


def require_moderator(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    expected = get_settings().moderator_api_key
    provided = creds.credentials if creds else ""
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorBody(
                error="Moderator authentication required.",
                code="unauthorized",
                hint="Send 'Authorization: Bearer <MODERATOR_API_KEY>'.",
            ).model_dump(),
        )
