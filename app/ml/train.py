"""Train Multi-Task WhistleDrop ML Suite:
1. Category Classifier (with calibrated probabilities & abstention)
2. Urgency & Risk Triage Model
3. Department & Escalation Router
Fast CPU execution, scikit-learn standard pipelines, cross-validation metrics.
"""
import json
import os
import joblib
from datetime import datetime, timezone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .dataset import load_multitask_corpus


def train(seed_csv: str, model_path: str) -> dict:
    corpus = load_multitask_corpus(seed_csv)
    texts = corpus["texts"]
    categories = corpus["categories"]
    urgencies = corpus["urgencies"]
    departments = corpus["departments"]
    risk_scores = corpus["risk_scores"]

    # 1. Category Classifier Pipeline
    cat_pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "clf",
                CalibratedClassifierCV(
                    estimator=LogisticRegression(
                        max_iter=2000, C=5.0, class_weight="balanced", random_state=42
                    ),
                    method="sigmoid",
                    cv=3,
                ),
            ),
        ]
    )

    # 2. Urgency Classifier & Risk Regressor Pipeline
    urgency_pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                CalibratedClassifierCV(
                    estimator=LogisticRegression(
                        max_iter=2000, C=3.0, class_weight="balanced", random_state=42
                    ),
                    method="sigmoid",
                    cv=3,
                ),
            ),
        ]
    )

    # Continuous Risk Score Regressor
    risk_regressor = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
            ("reg", Ridge(alpha=1.0, random_state=42)),
        ]
    )

    # 3. Department Router Pipeline
    dept_pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000, C=4.0, class_weight="balanced", random_state=42
                ),
            ),
        ]
    )

    # Stratified Split for Evaluation
    tr_x, te_x, tr_cat, te_cat, tr_urg, te_urg, tr_dept, te_dept, tr_risk, te_risk = (
        train_test_split(
            texts,
            categories,
            urgencies,
            departments,
            risk_scores,
            test_size=0.2,
            random_state=42,
            stratify=categories,
        )
    )

    # Train Models
    cat_pipe.fit(tr_x, tr_cat)
    cat_preds = cat_pipe.predict(te_x)
    cat_acc = float(accuracy_score(te_cat, cat_preds))
    cat_f1 = float(f1_score(te_cat, cat_preds, average="macro"))

    urgency_pipe.fit(tr_x, tr_urg)
    urg_preds = urgency_pipe.predict(te_x)
    urg_acc = float(accuracy_score(te_urg, urg_preds))
    urg_f1 = float(f1_score(te_urg, urg_preds, average="macro"))

    risk_regressor.fit(tr_x, tr_risk)

    dept_pipe.fit(tr_x, tr_dept)
    dept_preds = dept_pipe.predict(te_x)
    dept_acc = float(accuracy_score(te_dept, dept_preds))
    dept_f1 = float(f1_score(te_dept, dept_preds, average="macro"))

    # Fit final pipelines on entire corpus for production inference
    cat_pipe.fit(texts, categories)
    urgency_pipe.fit(texts, urgencies)
    risk_regressor.fit(texts, risk_scores)
    dept_pipe.fit(texts, departments)

    bundle = {
        "pipeline": cat_pipe,  # keeps backward compatibility with _bundle["pipeline"]
        "category_pipeline": cat_pipe,
        "urgency_pipeline": urgency_pipe,
        "risk_regressor": risk_regressor,
        "department_pipeline": dept_pipe,
        "labels": sorted(set(categories)),
        "urgency_labels": sorted(set(urgencies)),
        "department_labels": sorted(set(departments)),
    }

    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    joblib.dump(bundle, model_path)

    metadata = {
        "version": "2.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_samples": len(texts),
        "metrics": {
            "category": {"accuracy": round(cat_acc, 4), "macro_f1": round(cat_f1, 4)},
            "urgency": {"accuracy": round(urg_acc, 4), "macro_f1": round(urg_f1, 4)},
            "department": {"accuracy": round(dept_acc, 4), "macro_f1": round(dept_f1, 4)},
        },
        "classes": {
            "categories": bundle["labels"],
            "urgencies": bundle["urgency_labels"],
            "departments": bundle["department_labels"],
        },
    }

    meta_path = os.path.join(os.path.dirname(model_path), "model_meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return {
        "accuracy": round(cat_acc, 4),
        "macro_f1": round(cat_f1, 4),
        "urgency_acc": round(urg_acc, 4),
        "dept_acc": round(dept_acc, 4),
        "n_samples": len(texts),
        "path": model_path,
        "meta_path": meta_path,
    }
