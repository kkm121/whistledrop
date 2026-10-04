"""Seed-corpus loader. data/seed_reports.csv is the single source of truth."""
import csv
from typing import Any


def load_seed_corpus(path: str) -> tuple[list[str], list[str]]:
    """Loads texts and categories for backward compatibility."""
    texts: list[str] = []
    labels: list[str] = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            text = (row.get("text") or "").strip()
            label = (row.get("category") or "").strip()
            if text and label:
                texts.append(text)
                labels.append(label)
    if not texts:
        raise ValueError(f"No training rows found in {path}")
    return texts, labels


def load_multitask_corpus(path: str) -> dict[str, list[Any]]:
    """Loads full multi-task dataset: texts, categories, urgencies, departments, risk_scores."""
    records: dict[str, list[Any]] = {
        "texts": [],
        "categories": [],
        "urgencies": [],
        "departments": [],
        "risk_scores": [],
    }
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            text = (row.get("text") or "").strip()
            cat = (row.get("category") or "").strip()
            urg = (row.get("urgency") or "MEDIUM").strip()
            dept = (row.get("department") or "Campus & Operations").strip()
            risk_raw = row.get("risk_score") or "0.5"
            try:
                risk = float(risk_raw)
            except ValueError:
                risk = 0.5

            if text and cat:
                records["texts"].append(text)
                records["categories"].append(cat)
                records["urgencies"].append(urg)
                records["departments"].append(dept)
                records["risk_scores"].append(risk)

    if not records["texts"]:
        raise ValueError(f"No valid records found in {path}")
    return records
