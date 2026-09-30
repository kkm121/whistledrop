"""Pydantic schemas for requests, responses, and the error envelope."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class Category(str, Enum):
    security = "security"
    harassment = "harassment"
    corruption = "corruption"
    technical = "technical"
    other = "other"


class Status(str, Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


# Only SUBMITTED may move to UNDER_REVIEW; terminal states are final.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "SUBMITTED": {"UNDER_REVIEW"},
    "UNDER_REVIEW": {"RESOLVED", "DISMISSED"},
    "RESOLVED": set(),
    "DISMISSED": set(),
}


class ErrorBody(BaseModel):
    error: str
    code: str
    hint: str = ""


class ReportCreate(BaseModel):
    category: Category
    description: str = Field(min_length=10, max_length=5000)
    evidence_url: str | None = Field(default=None, max_length=2048)


class ReportSubmitResponse(BaseModel):
    case_code: str = Field(description="Show once. It cannot be recovered.")
    status: Status
    category: Category
    created_at: datetime


class UpdateOut(BaseModel):
    message: str
    created_at: datetime


class ReportTrackResponse(BaseModel):
    status: Status
    category: Category
    created_at: datetime
    updates: list[UpdateOut]


class ModeratorReportOut(BaseModel):
    id: int
    category: Category
    description: str
    evidence_url: str | None
    status: Status
    created_at: datetime
    updated_at: datetime
    priority_score: float = 0.0


class StatusPatch(BaseModel):
    status: Status


class UpdateCreate(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    public: bool = True


class SuggestIn(BaseModel):
    description: str = Field(min_length=10, max_length=5000)


class SuggestOut(BaseModel):
    label: Category | None
    confidence: float
    abstained: bool
    hint: str = ""


class DuplicateOut(BaseModel):
    report_id: int
    category: Category
    similarity: float
    excerpt: str
