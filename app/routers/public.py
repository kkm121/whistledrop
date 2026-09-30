"""Public endpoints: anonymous submit + case-code tracking. No auth."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..codes import generate_case_code, hash_code
from ..db import get_db
from ..models import Report
from ..schemas import (
    ErrorBody,
    ReportCreate,
    ReportSubmitResponse,
    ReportTrackResponse,
    UpdateOut,
)

router = APIRouter(tags=["public"])


def _unknown_code() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=ErrorBody(
            error="No report matches this case code.",
            code="unknown_case_code",
            hint="Check the code for typos. Codes look like WD-XXXXXXXXXX.",
        ).model_dump(),
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
    report = Report(
        code_hash=hash_code(code),
        category=body.category.value,
        description=body.description.strip(),
        evidence_url=str(body.evidence_url).strip() if body.evidence_url else None,
        status="SUBMITTED",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportSubmitResponse(
        case_code=code,
        status=report.status,  # type: ignore[arg-type]
        category=report.category,  # type: ignore[arg-type]
        created_at=report.created_at,
    )


@router.get("/reports/{case_code}", response_model=ReportTrackResponse)
def track_report(case_code: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter_by(code_hash=hash_code(case_code)).first()
    if not report:
        raise _unknown_code()
    return ReportTrackResponse(
        status=report.status,
        category=report.category,
        created_at=report.created_at,
        updates=[
            UpdateOut(message=u.message, created_at=u.created_at)
            for u in report.updates
            if u.public
        ],
    )
