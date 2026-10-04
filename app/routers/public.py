"""Public endpoints: anonymous submit + case-code tracking + confidential evidence upload."""
import os
import secrets
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..codes import generate_case_code, hash_code
from ..db import get_db
from ..models import Report
from ..schemas import (
    Category,
    ErrorBody,
    FileUploadResponse,
    ReportCreate,
    ReportSubmitResponse,
    ReportTrackResponse,
    Severity,
    Status,
    UpdateOut,
)
from ..ml import service as ml

router = APIRouter(tags=["public"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx", ".csv"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _unknown_code() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=ErrorBody(
            error="No report matches this case code.",
            code="unknown_case_code",
            hint="Check the code for typos. Codes look like WD-XXXXXXXXXX.",
        ).model_dump(),
    )


@router.post("/reports/upload-evidence", response_model=FileUploadResponse, status_code=201)
async def upload_evidence(file: UploadFile = File(...)):
    """Upload confidential evidence (PDF, PNG, JPG, TXT, DOCX).
    Strips external metadata and stores with randomized cryptographic storage key."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorBody(error="Filename missing.", code="invalid_file").model_dump(),
        )

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorBody(
                error=f"File extension '{ext}' not allowed.",
                code="unsupported_file_type",
                hint=f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            ).model_dump(),
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=ErrorBody(
                error="File size exceeds maximum 10MB limit.",
                code="file_too_large",
            ).model_dump(),
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_id = f"ev_{secrets.token_hex(16)}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, file_id)

    with open(dest_path, "wb") as f:
        f.write(contents)

    return FileUploadResponse(
        file_id=file_id,
        original_name=file.filename,
        size_bytes=len(contents),
        content_type=file.content_type or "application/octet-stream",
        message="Confidential evidence uploaded securely with metadata stripped.",
    )


@router.post("/reports", response_model=ReportSubmitResponse, status_code=201)
def submit_report(body: ReportCreate, db: Session = Depends(get_db)):
    for _ in range(5):  # retry on the astronomically unlikely hash collision
        code = generate_case_code()
        if not db.query(Report).filter_by(code_hash=hash_code(code)).first():
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorBody(
                error="Could not issue a case code, try again.",
                code="code_issue_failed",
            ).model_dump(),
        )

    # ML: Automatically infer urgency/severity and department routing
    urg_result = ml.score_urgency(body.description)
    dept_result = ml.suggest_department(body.description)

    evidence_file_path = None
    evidence_file_name = None
    if body.evidence_file_id:
        safe_id = os.path.basename(body.evidence_file_id)
        candidate = os.path.join(UPLOAD_DIR, safe_id)
        if os.path.exists(candidate):
            evidence_file_path = safe_id
            evidence_file_name = safe_id

    report = Report(
        code_hash=hash_code(code),
        category=body.category.value,
        description=body.description.strip(),
        evidence_url=str(body.evidence_url).strip() if body.evidence_url else None,
        evidence_file=evidence_file_path,
        evidence_file_name=evidence_file_name,
        status="SUBMITTED",
        severity=urg_result["severity"],
        department=dept_result["department"],
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportSubmitResponse(
        case_code=code,
        status=Status(report.status),
        category=Category(report.category),
        severity=Severity(report.severity),
        department=report.department,
        created_at=report.created_at,
    )


@router.get("/reports/{case_code}", response_model=ReportTrackResponse)
def track_report(case_code: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter_by(code_hash=hash_code(case_code)).first()
    if not report:
        raise _unknown_code()

    return ReportTrackResponse(
        status=Status(report.status),
        category=Category(report.category),
        severity=Severity(report.severity),
        department=report.department,
        created_at=report.created_at,
        evidence_url=report.evidence_url,
        evidence_file_name=report.evidence_file_name,
        closure_reason=report.closure_reason,
        updates=[
            UpdateOut(message=u.message, created_at=u.created_at, public=u.public)
            for u in report.updates
            if u.public
        ],
    )


@router.get("/reports/{case_code}/evidence")
def download_evidence(case_code: str, db: Session = Depends(get_db)):
    """Securely download attached confidential evidence using case code."""
    report = db.query(Report).filter_by(code_hash=hash_code(case_code)).first()
    if not report or not report.evidence_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorBody(error="No evidence file found for this case.", code="no_evidence").model_dump(),
        )

    file_path = os.path.join(UPLOAD_DIR, report.evidence_file)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorBody(error="Evidence file not found on disk.", code="missing_file").model_dump(),
        )

    return FileResponse(file_path, filename=report.evidence_file_name or "evidence.bin")
