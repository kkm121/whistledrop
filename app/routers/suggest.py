"""ML Suggestion & Privacy Guardian endpoints. Publicly accessible for live feedback."""
from fastapi import APIRouter

from ..schemas import (
    Category,
    ComprehensiveAnalysisOut,
    PrivacyScanIn,
    PrivacyScanOut,
    SuggestIn,
    SuggestOut,
    StylometryIn,
    StylometryAnalysisOut,
    StylometryObfuscateOut,
    ZKProofIn,
    ZKProofVerifyOut,
)
from ..ml import service as ml
from ..ml.stylometry import StylometricObfuscator
from ..ml.zk_credential import ZKCredentialVerifier


router = APIRouter(tags=["ml"])


@router.post("/suggest/category", response_model=SuggestOut)
def suggest_category(body: SuggestIn):
    """Predicts report category with calibrated probabilities and abstention logic."""
    detailed = ml.suggest_category_detailed(body.description)
    return SuggestOut(
        label=Category(detailed["label"]) if detailed["label"] else None,
        confidence=detailed["confidence"],
        abstained=detailed["abstained"],
        hint=detailed["hint"],
        top_candidates=detailed.get("top_candidates", []),
    )


@router.post("/suggest/privacy", response_model=PrivacyScanOut)
def scan_privacy(body: PrivacyScanIn):
    """Whistleblower Privacy Guardian: Scans report text for accidental PII and outputs sanitized text."""
    res = ml.scan_privacy(body.description)
    return PrivacyScanOut(
        has_pii=res["has_pii"],
        risk_level=res["risk_level"],
        entity_count=res["entity_count"],
        entities=res["entities"],
        sanitized_text=res["sanitized_text"],
        advice=res["advice"],
    )


@router.post("/suggest/analyze", response_model=ComprehensiveAnalysisOut)
def analyze_report(body: SuggestIn):
    """Unified fast ML inference endpoint: category, urgency/risk scoring,
    department routing, and privacy scan in a single round-trip."""
    cat_res = ml.suggest_category_detailed(body.description)
    urg_res = ml.score_urgency(body.description)
    dept_res = ml.suggest_department(body.description)
    priv_res = ml.scan_privacy(body.description)

    return ComprehensiveAnalysisOut(
        category=SuggestOut(
            label=Category(cat_res["label"]) if cat_res["label"] else None,
            confidence=cat_res["confidence"],
            abstained=cat_res["abstained"],
            hint=cat_res["hint"],
            top_candidates=cat_res.get("top_candidates", []),
        ),
        urgency=urg_res,
        department=dept_res,
        privacy=PrivacyScanOut(
            has_pii=priv_res["has_pii"],
            risk_level=priv_res["risk_level"],
            entity_count=priv_res["entity_count"],
            entities=priv_res["entities"],
            sanitized_text=priv_res["sanitized_text"],
            advice=priv_res["advice"],
        ),
    )


@router.get("/ml/metrics")
def get_model_metrics():
    """Returns model training benchmarks, accuracy, and F1 scores."""
    return ml.get_model_metadata()


@router.post("/suggest/stylometry/analyze", response_model=StylometryAnalysisOut)
def analyze_stylometry(body: StylometryIn):
    """Analyzes text for authorship attribution fingerprints and idiosyncratic markers."""
    res = StylometricObfuscator.analyze(body.text)
    return StylometryAnalysisOut(**res)


@router.post("/suggest/stylometry/obfuscate", response_model=StylometryObfuscateOut)
def obfuscate_stylometry(body: StylometryIn):
    """Neutralizes idiosyncratic stylometry to protect whistleblower from linguistic fingerprinting."""
    res = StylometricObfuscator.obfuscate(body.text)
    return StylometryObfuscateOut(**res)


@router.post("/suggest/zk/verify", response_model=ZKProofVerifyOut)
def verify_zk_proof(body: ZKProofIn):
    """Verifies zero-knowledge domain membership proof (ZK-Email / Semaphore)."""
    res = ZKCredentialVerifier.verify_proof(body.model_dump())
    return ZKProofVerifyOut(**res)

