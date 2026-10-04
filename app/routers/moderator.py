"""Moderator endpoints: Bearer auth, multi-facet search/filtering,
permanent case closure, ML clustering, and analytics."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Report, StatusUpdate
from ..schemas import (
    ALLOWED_TRANSITIONS,
    Category,
    ClosePatch,
    DuplicateOut,
    ErrorBody,
    MLFeedbackCreate,
    MLFeedbackResponse,
    ModeratorReportOut,
    Severity,
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
        category=Category(r.category),
        description=r.description,
        evidence_url=r.evidence_url,
        evidence_file=r.evidence_file,
        evidence_file_name=r.evidence_file_name,
        status=Status(r.status),
        severity=Severity(r.severity) if hasattr(r, "severity") and r.severity else Severity.MEDIUM,
        department=r.department if hasattr(r, "department") else None,
        closure_reason=r.closure_reason if hasattr(r, "closure_reason") else None,
        created_at=r.created_at,
        updated_at=r.updated_at,
        priority_score=ml.priority_score(r.status, r.description, len(r.updates)),
        updates=[UpdateOut(message=u.message, created_at=u.created_at, public=u.public) for u in r.updates] if hasattr(r, "updates") and r.updates else [],
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
    severity: Severity | None = None,
    department: str | None = None,
    q: str | None = Query(default=None, description="Full-text keyword search"),
    sort_by: str = Query(default="newest", enum=["newest", "oldest", "risk_desc"]),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List and filter reports with multi-facet queries, full-text search, and risk sorting."""
    query = db.query(Report)

    if category:
        query = query.filter_by(category=category.value)
    if status_:
        query = query.filter_by(status=status_.value)
    if severity:
        query = query.filter_by(severity=severity.value)
    if department:
        query = query.filter_by(department=department)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(Report.description.ilike(term))

    if sort_by == "oldest":
        query = query.order_by(Report.id.asc())
    elif sort_by == "newest":
        query = query.order_by(Report.id.desc())

    reports = query.offset(offset).limit(limit).all()
    results = [_out(r) for r in reports]

    if sort_by == "risk_desc":
        results.sort(key=lambda x: x.priority_score, reverse=True)

    return results


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


@router.post("/reports/{report_id}/close", response_model=ModeratorReportOut)
def close_report_permanently(report_id: int, body: ClosePatch, db: Session = Depends(get_db)):
    """Permanently closes a report with an official closure rationale.
    Enforces terminal state (no further updates or transitions)."""
    r = _get_or_404(db, report_id)
    if r.status == Status.CLOSED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorBody(
                error="Case is already permanently closed.",
                code="already_closed",
            ).model_dump(),
        )

    r.status = Status.CLOSED.value
    r.closure_reason = body.reason.strip()

    # Append terminal audit status update
    u = StatusUpdate(
        report_id=r.id,
        message=f"[PERMANENTLY CLOSED] Reason: {body.reason.strip()}",
        public=True,
    )
    db.add(u)
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
    if r.status == Status.CLOSED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorBody(
                error="Cannot add updates to a permanently closed case.",
                code="case_closed",
            ).model_dump(),
        )

    u = StatusUpdate(report_id=r.id, message=body.message.strip(), public=body.public)
    db.add(u)
    db.commit()
    db.refresh(u)
    return UpdateOut(message=u.message, created_at=u.created_at, public=u.public)


@router.get("/reports/{report_id}/duplicates", response_model=list[DuplicateOut])
def find_duplicates(report_id: int, db: Session = Depends(get_db)):
    r = _get_or_404(db, report_id)
    others = db.query(Report).filter(Report.id != r.id).all()
    corpus = [(o.id, o.category, o.description) for o in others]
    hits = ml.find_duplicates(r.description, corpus)
    return [
        DuplicateOut(
            report_id=i, category=Category(c), similarity=round(s, 3), excerpt=d[:160]
        )
        for i, c, s, d in hits
    ]


@router.get("/clusters")
def get_incident_clusters(db: Session = Depends(get_db)):
    """Unsupervised ML incident clustering: groups related whistleblower reports into incidents."""
    reports = db.query(Report).all()
    corpus = [(r.id, r.category, r.description) for r in reports]
    return ml.cluster_reports(corpus)


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Executive Triage Dashboard Metrics: case volumes, status distributions, risk distribution."""
    total = db.query(func.count(Report.id)).scalar() or 0
    pending = db.query(func.count(Report.id)).filter(Report.status.in_(["SUBMITTED", "UNDER_REVIEW"])).scalar() or 0
    resolved = db.query(func.count(Report.id)).filter_by(status="RESOLVED").scalar() or 0
    closed = db.query(func.count(Report.id)).filter_by(status="CLOSED").scalar() or 0
    critical = db.query(func.count(Report.id)).filter_by(severity="CRITICAL").scalar() or 0

    # Group by category
    cats = (
        db.query(Report.category, func.count(Report.id))
        .group_by(Report.category)
        .all()
    )
    by_category = {c: count for c, count in cats}

    # Group by status
    stats = (
        db.query(Report.status, func.count(Report.id))
        .group_by(Report.status)
        .all()
    )
    by_status = {s: count for s, count in stats}

    # Group by severity
    sevs = (
        db.query(Report.severity, func.count(Report.id))
        .group_by(Report.severity)
        .all()
    )
    by_severity = {sev: count for sev, count in sevs}

    return {
        "total_reports": total,
        "pending_review": pending,
        "resolved_reports": resolved,
        "closed_reports": closed,
        "critical_reports": critical,
        "by_category": by_category,
        "by_status": by_status,
        "by_severity": by_severity,
    }


@router.post("/seed-demo")
def seed_demo_reports(db: Session = Depends(get_db)):
    """Seed demonstration incident dossiers for live evaluation and visual inspection."""
    from ..codes import generate_case_code, hash_code

    demos = [
        {
            "category": "security",
            "severity": "CRITICAL",
            "department": "Cyber & InfoSec",
            "status": "UNDER_REVIEW",
            "description": "CRITICAL ZERO-DAY BREACH: An external threat actor gained persistent SSH root access to cluster production servers via hardcoded credentials in deployment scripts. Encrypted customer archives and database schemas were staged for exfiltration, and ransomware footprints were detected on storage volumes.",
            "update": "Cyber Incident Response Team (CIRT) isolated affected subnets and revoked compromised access keys. Forensic analysis underway.",
        },
        {
            "category": "corruption",
            "severity": "HIGH",
            "department": "Audit & Finance",
            "status": "UNDER_REVIEW",
            "description": "PROCUREMENT FRAUD: Campus facilities operations director awarded sole-source vendor HVAC and laboratory equipment maintenance contracts totaling $480,000 to an unregistered entity registered under their immediate sibling, receiving recurring wire kickbacks disguised as advisory consulting invoices.",
            "update": "Internal Audit Committee issued formal subpoena for vendor bank transfer statements and initiated forensic accounting review.",
        },
        {
            "category": "harassment",
            "severity": "HIGH",
            "department": "People & HR",
            "status": "SUBMITTED",
            "description": "RETALIATION & INTIMIDATION: Senior faculty investigator threatened junior doctoral research assistants with academic dismissal, authorship stripping, and visa cancellation after researchers documented safety protocol violations involving hazardous solvent storage.",
            "update": "Confidential Ombudsman notified; protective interim safety protocols enacted for laboratory researchers.",
        },
        {
            "category": "technical",
            "severity": "MEDIUM",
            "department": "Cyber & InfoSec",
            "status": "RESOLVED",
            "description": "UNAUTHENTICATED API EXPOSURE: The student grading portal v2 endpoint at /api/v2/records was left completely exposed without JWT validation, allowing arbitrary queries to retrieve student PII, GPA, and home contact details.",
            "update": "Security hotfix deployed within 45 minutes; gateway authentication rules patched and ingress logs inspected for exposure.",
        },
    ]

    seeded_ids = []
    for d in demos:
        raw_code = generate_case_code()
        rep = Report(
            code_hash=hash_code(raw_code),
            category=d["category"],
            description=d["description"],
            severity=d["severity"],
            department=d["department"],
            status=d["status"],
        )
        db.add(rep)
        db.commit()
        db.refresh(rep)
        
        upd = StatusUpdate(
            report_id=rep.id,
            message=d["update"],
            public=True,
        )
        db.add(upd)
        db.commit()
        seeded_ids.append(rep.id)

    return {"ok": True, "seeded_count": len(seeded_ids), "report_ids": seeded_ids}


@router.post("/reports/{report_id}/ml-feedback", response_model=MLFeedbackResponse)
def submit_ml_feedback(report_id: int, body: MLFeedbackCreate, db: Session = Depends(get_db)):
    """Human-in-the-loop active learning feedback: corrects category and/or severity,
    logging calibration samples for continuous ML model refinement."""
    r = _get_or_404(db, report_id)
    if body.corrected_category:
        r.category = body.corrected_category.value
    if body.corrected_severity:
        r.severity = body.corrected_severity.value
    db.commit()
    db.refresh(r)

    ml.record_active_learning_sample(
        description=r.description,
        category=r.category,
        severity=r.severity,
        feedback_notes=body.feedback_notes,
    )

    return MLFeedbackResponse(
        status="feedback_recorded",
        report_id=r.id,
        category=Category(r.category),
        severity=Severity(r.severity),
        message="Active learning sample successfully recorded. Model calibration updated.",
    )

