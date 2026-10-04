"""Whistleblower Privacy Guardian: Automated PII detection and redaction engine.
Protects reporter anonymity at the source by detecting and sanitizing accidental PII."""
import re
from typing import Any

# High-precision patterns for PII detection
EMAIL_REGEX = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)
PHONE_REGEX = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    r"|\b(?:\+91[-.\s]?)?[6-9]\d{9}\b"
)
ID_REGEX = re.compile(
    r"\b(?:EMP|ID|STUDENT|STAFF|SRM|REG|ADM)[-_\s#:]?[A-Z0-9]{4,15}\b",
    re.IGNORECASE
)
IP_REGEX = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}"
    r"(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
)
CREDIT_CARD_REGEX = re.compile(
    r"\b(?:\d{4}[-\s]?){3}\d{4}\b"
)

# Contextual Name Patterns (e.g. "my name is Alice Smith", "reported by John Doe", "manager Bob Johnson")
NAME_CONTEXT_REGEX = re.compile(
    r"\b(?:my name is|i am|this is|reported by|contact me at|from employee|whistleblower)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b",
    re.IGNORECASE
)
TITLE_NAME_REGEX = re.compile(
    r"\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
)


class PrivacyGuardian:
    """Scans and sanitizes whistleblower submissions to prevent accidental identity leakage."""

    @classmethod
    def scan(cls, text: str) -> dict[str, Any]:
        entities: list[dict[str, Any]] = []

        # 1. Emails
        for m in EMAIL_REGEX.finditer(text):
            entities.append({
                "type": "EMAIL",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
                "severity": "HIGH",
            })

        # 2. Phones
        for m in PHONE_REGEX.finditer(text):
            entities.append({
                "type": "PHONE",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
                "severity": "HIGH",
            })

        # 3. Employee / Student IDs
        for m in ID_REGEX.finditer(text):
            entities.append({
                "type": "IDENTIFIER",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
                "severity": "HIGH",
            })

        # 4. IP Addresses
        for m in IP_REGEX.finditer(text):
            entities.append({
                "type": "IP_ADDRESS",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
                "severity": "MEDIUM",
            })

        # 5. Financial / Credit Cards
        for m in CREDIT_CARD_REGEX.finditer(text):
            entities.append({
                "type": "FINANCIAL",
                "value": m.group(0),
                "start": m.start(),
                "end": m.end(),
                "severity": "CRITICAL",
            })

        # 6. Contextual Names
        for m in NAME_CONTEXT_REGEX.finditer(text):
            val = m.group(1)
            entities.append({
                "type": "PERSON_NAME",
                "value": val,
                "start": m.start(1),
                "end": m.end(1),
                "severity": "HIGH",
            })

        for m in TITLE_NAME_REGEX.finditer(text):
            val = m.group(0)
            entities.append({
                "type": "PERSON_NAME",
                "value": val,
                "start": m.start(),
                "end": m.end(),
                "severity": "MEDIUM",
            })

        # Deduplicate overlapping spans
        sorted_entities = sorted(entities, key=lambda x: (x["start"], -x["end"]))
        clean_entities: list[dict[str, Any]] = []
        last_end = -1
        for e in sorted_entities:
            if e["start"] >= last_end:
                clean_entities.append(e)
                last_end = e["end"]

        # Compute sanitized text
        sanitized = text
        for e in sorted(clean_entities, key=lambda x: x["start"], reverse=True):
            placeholder = f"[REDACTED_{e['type']}]"
            sanitized = sanitized[: e["start"]] + placeholder + sanitized[e["end"] :]

        has_pii = len(clean_entities) > 0
        risk_level = "CRITICAL" if any(e["severity"] == "CRITICAL" for e in clean_entities) else (
            "HIGH" if any(e["severity"] == "HIGH" for e in clean_entities) else (
                "MEDIUM" if has_pii else "NONE"
            )
        )

        advice = (
            "⚠️ Potential personal identifying information detected. "
            "Consider redacting to protect your anonymity."
            if has_pii
            else "✅ Anonymity check passed: No personal identifiers detected."
        )

        return {
            "has_pii": has_pii,
            "entity_count": len(clean_entities),
            "risk_level": risk_level,
            "entities": clean_entities,
            "sanitized_text": sanitized,
            "advice": advice,
        }
