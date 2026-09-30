"""Load-once ML service: category suggestion, duplicates, priority heuristic."""
import logging
import os
import joblib
from sklearn.metrics.pairwise import cosine_similarity

from ..config import get_settings
from .train import train

log = logging.getLogger("whistledrop.ml")

_bundle = None  # {"pipeline", "labels"}


def ensure_model() -> dict:
    """Load artifact or train from seed CSV. Returns status info for logs."""
    global _bundle
    s = get_settings()
    if _bundle is not None:
        return {"source": "memory", "labels": _bundle["labels"]}
    if os.path.exists(s.model_path):
        _bundle = joblib.load(s.model_path)
        return {"source": "artifact", "labels": _bundle["labels"]}
    os.makedirs(os.path.dirname(s.model_path) or ".", exist_ok=True)
    info = train(s.seed_csv, s.model_path)
    _bundle = joblib.load(s.model_path)
    return {"source": "trained-now", **info}


def suggest_category(description: str) -> tuple[str | None, float, bool]:
    """Returns (label, confidence, abstained). Abstains under threshold."""
    info = ensure_model()
    pipe = _bundle["pipeline"]
    proba = pipe.predict_proba([description])[0]
    best = int(proba.argmax())
    confidence = float(proba[best])
    threshold = get_settings().suggest_threshold
    if confidence < threshold:
        return None, confidence, True
    return str(pipe.classes_[best]), confidence, False


def find_duplicates(
    description: str, corpus: list[tuple[int, str, str]], top_k: int = 3
) -> list[tuple[int, str, float, str]]:
    """TF-IDF cosine similarity over existing reports. Empty when thin."""
    ensure_model()
    if not corpus:
        return []
    vec = _bundle["pipeline"].named_steps["tfidf"]
    base = vec.transform([d for _, _, d in corpus] + [description])
    sims = cosine_similarity(base[-1], base[:-1])[0]
    ranked = sorted(zip(corpus, sims), key=lambda t: float(t[1]), reverse=True)
    out = []
    for (rid, cat, text), sim in ranked[:top_k]:
        if float(sim) >= get_settings().duplicate_threshold:
            out.append((rid, cat, float(sim), text))
    return out


def priority_score(status: str, description: str, update_count: int) -> float:
    """Transparent triage heuristic (documented, not learned)."""
    base = {"SUBMITTED": 0.4, "UNDER_REVIEW": 0.5}.get(status, 0.1)
    score = base + min(len(description) / 2000, 0.3) + min(update_count * 0.05, 0.2)
    return round(min(score, 1.0), 3)
