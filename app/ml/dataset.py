"""Seed-corpus loader. data/seed_reports.csv is the single source of truth."""
import csv


def load_seed_corpus(path: str) -> tuple[list[str], list[str]]:
    texts: list[str] = []
    labels: list[str] = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            text, label = (row.get("text") or "").strip(), (row.get("category") or "").strip()
            if text and label:
                texts.append(text)
                labels.append(label)
    if not texts:
        raise ValueError(f"No training rows found in {path}")
    return texts, labels
