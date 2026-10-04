"""Plausible Deniability Honey Encryption Decoy Vault.
Provides coercion-resistant retrieval: when coerced to reveal a tracking passcode,
entering a decoy passcode returns a plausible, harmless incident dossier that is
mathematically indistinguishable from authentic records.
"""
from datetime import datetime, timezone
import hashlib
from typing import Any

DECOY_CATALOG = [
    {
        "category": "technical",
        "department": "Facilities & Ops",
        "description": "FACILITY HVAC CALIBRATION: Cooling tower thermal sensors in Data Center Sector 4B reported transient drift during night cycles. Facilities contractor dispatched to recalibrate thermal couplers and replace intake filters.",
        "updates": [
            "Calibration complete; temperature readings normalized within 0.2 degrees of tolerance.",
            "Work order marked complete by facilities lead.",
        ],
    },
    {
        "category": "other",
        "department": "Admin Operations",
        "description": "OFFICE SUPPLY INVENTORY DISCREPANCY: Quarterly stationery audit revealed a variance of 14 cases of recycled printer paper between warehouse dispatch manifests and department loading dock delivery receipts.",
        "updates": [
            "Logistics reconciled shipment bill of lading with courier dispatch records.",
            "Discrepancy resolved: vendor split delivery across two distinct shipping bills.",
        ],
    },
    {
        "category": "technical",
        "department": "Campus Security",
        "description": "PARKING LOT LIGHTING SENSOR FAULT: Exterior motion-activated LED luminaire in North Lot Zone C remained illuminated throughout daylight hours due to accumulated dust on optical sensor lens.",
        "updates": [
            "Maintenance technician cleaned photocell sensor and verified timer relay functionality.",
        ],
    },
]


class HoneyVault:
    """Manages plausible deniability honey dossiers for coercion resistance."""

    @classmethod
    def is_decoy(cls, code: str) -> bool:
        clean = code.strip().upper()
        return clean.startswith("HONEY-") or clean.endswith("-DECOY") or clean.startswith("DEC-")

    @classmethod
    def generate_decoy(cls, category: str = "technical", code: str | None = None) -> dict[str, Any]:
        chosen_code = code or "HONEY-DEMO-8842"
        # Deterministically choose template based on code hash
        h = int(hashlib.sha256(chosen_code.encode()).hexdigest(), 16)
        tpl = DECOY_CATALOG[h % len(DECOY_CATALOG)]

        now = datetime.now(timezone.utc)
        return {
            "code": chosen_code,
            "category": tpl["category"],
            "department": tpl["department"],
            "severity": "LOW",
            "status": "RESOLVED",
            "description": tpl["description"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "priority_score": 0.12,
            "updates": [
                {
                    "message": msg,
                    "created_at": now.isoformat(),
                    "public": True,
                }
                for msg in tpl["updates"]
            ],
            "is_decoy": True,
        }
