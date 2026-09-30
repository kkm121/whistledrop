"""Moderator endpoints: Bearer auth, filtering, status machine, updates."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Report, StatusUpdate
from ..schemas import (
    ALLOWED_TRANSITIONS,
    Category,
    DuplicateOut,
    ErrorBody,
    ModeratorReportOut,
    Status,
    StatusPatch,
    UpdateCreate,
    UpdateOut,
)
from ..security import require_moderator
from ..ml import service as ml

router = APIRouter(
    prefix="/moderator", tags=["moderator"], dependencies=[Depends(require_moderator)]
)


def _out(r: Report) -> ModeratorReportOut:
    return ModeratorReportOut(
        id=r.id,
        category=r.category,  # type: ignore[arg-type]
        description=r.description,
        evidence_url=r.evidence_url,
        status=r.status,  # type: ignore[arg-type]
        created_at=r.created_at,
        updated_at=r.updated_at,
        priority_score=ml.priority_score(r.status, r.description, len(r.updates)),
    )


def _get_or_404(db: Session, report_id: int) -> Report:
    r = db.query(Report).filter_by(id=report_id).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorBody(
                error=f"No report with id {report_id}.",
                code="unknown_report",
            ).model_dump(),
        )
    return r


@router.get("/reports", response_model=list[ModeratorReportOut])
def list_reports(
    category: Category | None = None,
    status_: Status | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Report).order_by(Report.id.desc())
    if category:
        q = q.filter_by(category=category.value)
    if status_:
        q = q.filter_by(status=status_.value)
    return [_out(r) for r in q.offset(offset).limit(limit).all()]


@router.get("/reports/{report_id}", response_model=ModeratorReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    return _out(_get_or_404(db, report_id))


@router.patch("/reports/{report_id}/status", response_model=ModeratorReportOut)
def update_status(report_id: int, body: StatusPatch, db: Session = Depends(get_db)):
    r = _get_or_404(db, report_id)
    allowed = ALLOWED_TRANSITIONS.get(r.status, set())
    if body.status.value not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorBody(
                error=f"Illegal transition {r.status} -> {body.status.value}.",
                code="illegal_transition",
                hint=f"Allowed from {r.status}: {sorted(allowed) or 'none (terminal)'}.",
            ).model_dump(),
        )
    r.status = body.status.value
    db.commit()
    db.refresh(r)
    return _out(r)


@router.post(
    "/reports/{report_id}/updates",
    response_model=UpdateOut,
    status_code=status.HTTP_201_CREATED,
)
def add_update(report_id: int, body: UpdateCreate, db: Session = Depends(get_db)):
    r = _get_or_404(db, report_id)
    u = StatusUpdate(report_id=r.id, message=body.message.strip(), public=body.public)
    db.add(u)
    db.commit()
    db.refresh(u)
    return UpdateOut(message=u.message, created_at=u.created_at)


@router.get("/reports/{report_id}/duplicates", response_model=list[DuplicateOut])
def find_duplicates(report_id: int, db: Session = Depends(get_db)):
    r = _get_or_404(db, report_id)
    others = db.query(Report).filter(Report.id != r.id).all()
    corpus = [(o.id, o.category, o.description) for o in others]
    hits = ml.find_duplicates(r.description, corpus)
    return [
        DuplicateOut(
            report_id=i, category=c, similarity=round(s, 3), excerpt=d[:160]
        )
        for i, c, s, d in hits
    ]
