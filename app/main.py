"""WhistleDrop — Speak Without Being Seen. Anonymous reporting backend + ML Intelligence Studio."""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import init_db
from .ml import service as ml
from .routers import moderator, public, suggest
from .schemas import ErrorBody

log = logging.getLogger("whistledrop")

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    info = ml.ensure_model()
    if get_settings().moderator_api_key == "dev-moderator-key-CHANGE-ME":
        log.warning("Using default dev moderator key. Set MODERATOR_API_KEY in production.")
    log.info("ML multi-task engine ready: %s", info)
    yield


app = FastAPI(
    title="WhistleDrop",
    description="Anonymous reporting & ML intelligence studio. No accounts, no identities, case-code tracking.",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend and API consumers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/health", tags=["meta"])
def health():
    return {"ok": True, "service": "WhistleDrop", "version": "2.0.0"}


# Serve static web studio UI if built
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", tags=["ui"], include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"service": "WhistleDrop", "anonymous": True, "docs": "/docs", "health": "/health"}
else:
    @app.get("/", tags=["meta"])
    def root():
        return {
            "service": "WhistleDrop",
            "anonymous": True,
            "docs": "/docs",
            "health": "/health",
        }
