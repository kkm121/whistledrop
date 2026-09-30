"""WhistleDrop — Speak Without Being Seen. Anonymous reporting backend."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import init_db
from .ml import service as ml
from .routers import moderator, public, suggest
from .schemas import ErrorBody

log = logging.getLogger("whistledrop")

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    info = ml.ensure_model()
    if get_settings().moderator_api_key == "dev-moderator-key-CHANGE-ME":
        log.warning("Using default dev moderator key. Set MODERATOR_API_KEY in production.")
    log.info("ML model ready: %s", info)
    yield


app = FastAPI(
    title="WhistleDrop",
    description="Anonymous reporting backend. No accounts, no identities, case-code tracking.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(HTTPException)
async def http_handler(_: Request, exc: HTTPException):
    content = (
        exc.detail
        if isinstance(exc.detail, dict)
        else {"error": str(exc.detail), "code": "http_error", "hint": ""}
    )
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=ErrorBody(
            error="Request failed validation.",
            code="validation_error",
            hint=f"{'.'.join(str(x) for x in first.get('loc', []))}: {first.get('msg', '')}",
        ).model_dump(),
    )


app.include_router(public.router)
app.include_router(moderator.router)
app.include_router(suggest.router)


@app.get("/", tags=["meta"])
def root():
    return {
        "service": "WhistleDrop",
        "anonymous": True,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["meta"])
def health():
    return {"ok": True}
