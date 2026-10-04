"""Pydantic schemas for requests, responses, state transitions, and ML payloads."""
from datetime import datetime
from enum import Enum
from typing import Any
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
    CLOSED = "CLOSED"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# State machine rules:
# SUBMITTED -> UNDER_REVIEW or terminal (DISMISSED/CLOSED)
# UNDER_REVIEW -> RESOLVED, DISMISSED, or CLOSED
# RESOLVED / DISMISSED -> CLOSED (permanent archive)
# CLOSED is completely terminal.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "SUBMITTED": {"UNDER_REVIEW", "DISMISSED", "CLOSED"},
    "UNDER_REVIEW": {"RESOLVED", "DISMISSED", "CLOSED"},
    "RESOLVED": {"CLOSED"},
    "DISMISSED": {"CLOSED"},
    "CLOSED": set(),
}


class ErrorBody(BaseModel):
    error: str
    code: str
    hint: str = ""


class ReportCreate(BaseModel):
    category: Category
    description: str = Field(min_length=10, max_length=5000)
    evidence_url: str | None = Field(default=None, max_length=2048)
    evidence_file_id: str | None = Field(default=None, max_length=256)


class ReportSubmitResponse(BaseModel):
    case_code: str = Field(description="Show once. It cannot be recovered.")
    status: Status
    category: Category
    severity: Severity = Severity.MEDIUM
    department: str | None = None
    created_at: datetime


class UpdateOut(BaseModel):
    message: str
    created_at: datetime
    public: bool = True


class ReportTrackResponse(BaseModel):
    status: Status
    category: Category
    severity: Severity = Severity.MEDIUM
    department: str | None = None
    created_at: datetime
    evidence_url: str | None = None
    evidence_file_name: str | None = None
    closure_reason: str | None = None
    description: str | None = None
    updates: list[UpdateOut] = []
    is_decoy: bool = False



class ModeratorReportOut(BaseModel):
    id: int
    category: Category
    description: str
    evidence_url: str | None = None
    evidence_file: str | None = None
    evidence_file_name: str | None = None
    status: Status
    severity: Severity = Severity.MEDIUM
    department: str | None = None
    closure_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    priority_score: float = 0.0
    updates: list[UpdateOut] = []


class StatusPatch(BaseModel):
    status: Status


class ClosePatch(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


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
    top_candidates: list[dict[str, Any]] = []


class DuplicateOut(BaseModel):
    report_id: int
    category: Category
    similarity: float
    excerpt: str


class PrivacyScanIn(BaseModel):
    description: str = Field(min_length=1, max_length=5000)


class PrivacyScanOut(BaseModel):
    has_pii: bool
    risk_level: str
    entity_count: int
    entities: list[dict[str, Any]]
    sanitized_text: str
    advice: str


class ComprehensiveAnalysisOut(BaseModel):
    category: SuggestOut
    urgency: dict[str, Any]
    department: dict[str, Any]
    privacy: PrivacyScanOut


class FileUploadResponse(BaseModel):
    file_id: str
    original_name: str
    size_bytes: int
    content_type: str
    message: str


class StylometryIn(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


class StylometryAnalysisOut(BaseModel):
    risk_score: float
    risk_level: str
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    lexical_diversity: float
    readability_grade: float
    idiosyncratic_features: list[str]


class StylometryObfuscateOut(BaseModel):
    original_text: str
    obfuscated_text: str
    original_risk_score: float
    obfuscated_risk_score: float
    features_neutralized: list[str]
    advice: str


class ZKProofIn(BaseModel):
    domain: str
    commitment: str
    nullifier_hash: str
    proof_hash: str
    protocol: str = "Groth16-ZK-Email"


class ZKProofVerifyOut(BaseModel):
    is_valid: bool
    domain: str | None = None
    nullifier_hash: str | None = None
    badge: str | None = None
    guarantee: str | None = None
    error: str | None = None

