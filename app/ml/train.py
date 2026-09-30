"""Train TF-IDF + LogisticRegression. Seconds on CPU, no GPU, no network."""
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .dataset import load_seed_corpus


def train(seed_csv: str, model_path: str) -> dict:
    texts, labels = load_seed_corpus(seed_csv)
    pipe: Pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 1), min_df=1, sublinear_tf=True)),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000, C=10, class_weight="balanced", random_state=42
                ),
            ),
        ]
    )
    if len(set(labels)) > 1 and len(texts) >= 10:
        tr_x, te_x, tr_y, te_y = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
        pipe.fit(tr_x, tr_y)
        accuracy = float(pipe.score(te_x, te_y))
    else:  # tiny corpus fallback: fit all, report training accuracy
        pipe.fit(texts, labels)
        accuracy = float(pipe.score(texts, labels))
    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    joblib.dump({"pipeline": pipe, "labels": sorted(set(labels))}, model_path)
    return {"accuracy": round(accuracy, 4), "n_samples": len(texts), "path": model_path}
