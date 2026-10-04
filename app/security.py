"""Moderator authentication & Anonymous Rate Limiting:
- Bearer API key constant-time compare
- Cryptographically anonymized sliding-window rate limiter (zero identity exposure)
"""
from collections import defaultdict
import hashlib
import secrets
import time
from fastapi import Depends, HTTPException, Request, status
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


class AnonymizedRateLimiter:
    """Sliding-window rate limiter that hashes client IP with an ephemeral cryptographic salt.
    Prevents storage or leakage of real IP addresses while preventing DoS flooding."""

    def __init__(self, max_requests: int = 40, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._salt = secrets.token_hex(16)
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, request: Request) -> bool:
        client_ip = request.client.host if request.client else "127.0.0.1"
        anon_key = hashlib.sha256(f"{self._salt}:{client_ip}".encode()).hexdigest()[:16]
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = [t for t in self._buckets[anon_key] if t > cutoff]
        self._buckets[anon_key] = timestamps

        if len(timestamps) >= self.max_requests:
            return False

        self._buckets[anon_key].append(now)
        return True


_rate_limiter = AnonymizedRateLimiter()


def check_anonymous_rate_limit(request: Request) -> None:
    if not _rate_limiter.is_allowed(request):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=ErrorBody(
                error="Submission rate limit exceeded. Please wait a moment before submitting again.",
                code="rate_limited",
                hint="Anonymous rate limit is 40 submissions per minute.",
            ).model_dump(),
        )
