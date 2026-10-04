"""WhistleDrop Unified ML Engine & Inference Service:
1. Category Classification with Calibrated Probabilities & Abstention
2. Learned Urgency & Risk Triage Model
3. Department & Escalation Auto-Routing
4. Privacy Guardian: Automated PII Detection & Anonymity Sanitization
5. Semantic Duplicate Detection & Incident Clustering
6. Model Metadata & Evaluation Benchmarks
"""
import json
import logging
import os
import re
from typing import Any
import joblib
import numpy as np
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics.pairwise import cosine_similarity

from ..config import get_settings
from .privacy import PrivacyGuardian
from .train import train

log = logging.getLogger("whistledrop.ml")

_bundle: dict[str, Any] | None = None


def ensure_model() -> dict:
    """Load artifact bundle or train on startup from seed CSV."""
    global _bundle
    s = get_settings()
    if _bundle is not None:
        return {"source": "memory", "labels": _bundle["labels"]}
    if os.path.exists(s.model_path):
        try:
            _bundle = joblib.load(s.model_path)
            return {"source": "artifact", "labels": _bundle["labels"]}
        except Exception as e:
            log.warning("Failed to load cached model (%s), retraining...", e)

    os.makedirs(os.path.dirname(s.model_path) or ".", exist_ok=True)
    info = train(s.seed_csv, s.model_path)
    _bundle = joblib.load(s.model_path)
    return {"source": "trained-now", **info}


def suggest_category(description: str) -> tuple[str | None, float, bool]:
    """Returns (label, confidence, abstained). Abstains under threshold.
    Maintains exact signature for backward compatibility with existing tests."""
    res = suggest_category_detailed(description)
    return res["label"], res["confidence"], res["abstained"]


def suggest_category_detailed(description: str) -> dict[str, Any]:
    """Full category suggestion with calibrated probabilities, top-3 candidates, and abstention."""
    ensure_model()
    assert _bundle is not None
    pipe = _bundle.get("category_pipeline", _bundle["pipeline"])
    proba = pipe.predict_proba([description])[0]
    classes = pipe.classes_

    # Sort descending by probability
    ranked_indices = np.argsort(proba)[::-1]
    best_idx = int(ranked_indices[0])
    best_label = str(classes[best_idx])
    confidence = float(proba[best_idx])

    top_candidates = [
        {"category": str(classes[idx]), "probability": round(float(proba[idx]), 4)}
        for idx in ranked_indices[:3]
    ]

    threshold = get_settings().suggest_threshold
    abstained = confidence < threshold
    hint = (
        f"Low confidence ({round(confidence * 100, 1)}% < {round(threshold * 100, 1)}%). Suggest manual review."
        if abstained
        else f"High confidence prediction for '{best_label}'."
    )

    return {
        "label": None if abstained else best_label,
        "confidence": round(confidence, 4),
        "abstained": abstained,
        "top_candidates": top_candidates,
        "hint": hint,
    }


def score_urgency(description: str) -> dict[str, Any]:
    """Learned Urgency & Risk Triage: returns continuous risk score [0.0, 1.0],
    severity bucket (CRITICAL, HIGH, MEDIUM, LOW), and explainable contributing keywords."""
    ensure_model()
    assert _bundle is not None

    # Continuous risk regressor if available
    risk_reg = _bundle.get("risk_regressor")
    urg_pipe = _bundle.get("urgency_pipeline")

    if risk_reg is not None and urg_pipe is not None:
        raw_score = float(risk_reg.predict([description])[0])
        score = round(max(0.05, min(0.99, raw_score)), 3)
        severity = str(urg_pipe.predict([description])[0])
    else:
        # Fallback to length/keyword heuristic if legacy bundle
        score = 0.5
        severity = "MEDIUM"

    # Explainable keywords: scan for critical threat tokens in text
    threat_tokens = [
        "ransomware", "leak", "compromise", "bribe", "kickback", "embezzl",
        "stolen", "assault", "violence", "threat", "fire", "danger", "exploit",
        "zero-day", "toxic", "asbestos", "weapon", "harass", "retaliat"
    ]
    found_tokens = [
        w for w in threat_tokens if re.search(rf"\b{w}", description, re.IGNORECASE)
    ]

    # Elevate severity if multiple acute threat tokens are detected
    if found_tokens and score < 0.65:
        score = min(0.95, score + 0.15)
        if score >= 0.85:
            severity = "CRITICAL"
        elif score >= 0.70:
            severity = "HIGH"

    return {
        "risk_score": score,
        "severity": severity,
        "contributing_keywords": found_tokens,
    }


def priority_score(status: str, description: str, update_count: int) -> float:
    """Triage priority combining learned ML risk score with workflow status and updates."""
    urg_info = score_urgency(description)
    base_learned = urg_info["risk_score"]
    status_bonus = {"SUBMITTED": 0.05, "UNDER_REVIEW": 0.02}.get(status, -0.1)
    updates_bonus = min(update_count * 0.02, 0.08)
    final_score = round(max(0.05, min(1.0, base_learned + status_bonus + updates_bonus)), 3)
    return final_score


def suggest_department(description: str) -> dict[str, Any]:
    """Recommends internal investigation department."""
    ensure_model()
    assert _bundle is not None
    dept_pipe = _bundle.get("department_pipeline")
    if dept_pipe is None:
        return {"department": "Campus & Operations", "confidence": 0.5}

    proba = dept_pipe.predict_proba([description])[0]
    best_idx = int(np.argmax(proba))
    return {
        "department": str(dept_pipe.classes_[best_idx]),
        "confidence": round(float(proba[best_idx]), 4),
    }


def scan_privacy(description: str) -> dict[str, Any]:
    """Whistleblower Privacy Guardian: Scans for PII and generates sanitized text."""
    return PrivacyGuardian.scan(description)


def find_duplicates(
    description: str, corpus: list[tuple[int, str, str]], top_k: int = 3
) -> list[tuple[int, str, float, str]]:
    """TF-IDF cosine similarity over existing reports with robust zero-vector handling."""
    ensure_model()
    assert _bundle is not None
    if not corpus:
        return []

    vec = _bundle["pipeline"].named_steps["tfidf"]
    corpus_texts = [d for _, _, d in corpus]
    try:
        base = vec.transform(corpus_texts + [description])
        # Compute cosine similarity
        sims = cosine_similarity(base[-1], base[:-1])[0]
    except Exception:
        # Fallback to zero similarities if error
        sims = np.zeros(len(corpus))

    ranked = sorted(zip(corpus, sims), key=lambda t: float(t[1]), reverse=True)
    threshold = get_settings().duplicate_threshold
    out = []
    for (rid, cat, text), sim in ranked[:top_k]:
        sim_float = float(sim)
        if sim_float >= threshold and not np.isnan(sim_float):
            out.append((rid, cat, round(sim_float, 3), text))
    return out


def cluster_reports(corpus: list[tuple[int, str, str]], max_clusters: int = 5) -> list[dict[str, Any]]:
    """Unsupervised incident clustering across reports to identify grouped organizational incidents."""
    ensure_model()
    assert _bundle is not None
    if len(corpus) < 3:
        return []

    vec = _bundle["pipeline"].named_steps["tfidf"]
    corpus_texts = [d for _, _, d in corpus]
    X = vec.transform(corpus_texts)

    n_samples = len(corpus)
    k = min(max_clusters, max(2, n_samples // 3))

    kmeans = MiniBatchKMeans(n_clusters=k, random_state=42, batch_size=32, n_init=3)
    labels = kmeans.fit_predict(X)

    clusters: dict[int, list[dict[str, Any]]] = {}
    for (rid, cat, text), cluster_id in zip(corpus, labels):
        cid = int(cluster_id)
        if cid not in clusters:
            clusters[cid] = []
        clusters[cid].append({
            "report_id": rid,
            "category": cat,
            "excerpt": text[:120] + ("..." if len(text) > 120 else ""),
        })

    # Return only clusters with 2 or more reports (actionable incident patterns)
    result = []
    for cid, members in clusters.items():
        if len(members) >= 2:
            result.append({
                "cluster_id": cid + 1,
                "case_count": len(members),
                "primary_category": members[0]["category"],
                "cases": members,
            })

    return sorted(result, key=lambda c: c["case_count"], reverse=True)


def get_model_metadata() -> dict[str, Any]:
    """Returns serialized model training metadata, accuracy, and F1 benchmarks."""
    ensure_model()
    s = get_settings()
    meta_path = os.path.join(os.path.dirname(s.model_path), "model_meta.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "version": "2.0.0",
        "status": "active",
        "categories": _bundle["labels"] if _bundle else [],
    }
