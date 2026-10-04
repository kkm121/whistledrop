"""ORM models. Note: there is deliberately NO reporter-identity column
anywhere — anonymity is enforced by the schema itself, not by policy."""
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # SHA-256 of the case code; the raw code is never stored.
    code_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    description: Mapped[str] = mapped_column(Text)
    evidence_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    evidence_file: Mapped[str | None] = mapped_column(String(256), nullable=True)
    evidence_file_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="SUBMITTED", index=True)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM", index=True)
    department: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    closure_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    updates: Mapped[list["StatusUpdate"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="StatusUpdate.id"
    )


class StatusUpdate(Base):
    __tablename__ = "status_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id"), index=True)
    message: Mapped[str] = mapped_column(String(1000))
    # Internal notes are hidden from the reporter's tracking view.
    public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    report: Mapped[Report] = relationship(back_populates="updates")
