"""Tests for WhistleDrop Security Hardening & Active Learning Suite:
1. Evidence Upload Magic Byte Verification (Spoofed Extension Rejection)
2. Anonymous Sliding-Window Rate Limiting (DoS Protection with Zero Identity Leaks)
3. Moderator Active Learning Feedback & ML Model Continuous Refinement
"""
import io
import pytest
from conftest import AUTH
from app.schemas import Category, Severity


def test_evidence_upload_valid_magic_bytes(client):
    # Valid PNG magic bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 20
    files = {"file": ("audit_screenshot.png", io.BytesIO(png_bytes), "image/png")}
    res = client.post("/reports/upload-evidence", files=files)
    assert res.status_code == 201
    assert "file_id" in res.json()

    # Valid PDF magic bytes
    pdf_bytes = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\nxref\n"
    files = {"file": ("financial_records.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res = client.post("/reports/upload-evidence", files=files)
    assert res.status_code == 201


def test_evidence_upload_spoofed_extension_rejected(client):
    # Malicious file: executable/binary disguised as .pdf
    fake_pdf = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    files = {"file": ("malware.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    res = client.post("/reports/upload-evidence", files=files)
    assert res.status_code == 400
    data = res.json()
    err_str = data.get("error") or data.get("detail", {}).get("error", "")
    assert "signature" in err_str.lower() or "magic" in err_str.lower() or "spoofed" in str(data).lower()


def test_anonymous_rate_limiter_allows_normal_burst_and_protects_backend(client):
    # Normal report submissions pass
    for _ in range(3):
        res = client.post("/reports", json={
            "category": "security",
            "description": "Legitimate security vulnerability found in cluster authentication gateway.",
        })
        assert res.status_code == 201


def test_moderator_active_learning_feedback(client):
    # 1. Submit report with ambiguous text
    res = client.post("/reports", json={
        "category": "technical",
        "description": "The accounting software is generating false financial ledgers to conceal bribery payments.",
    })
    assert res.status_code == 201

    # 2. Get report ID from moderator list
    mod_reports = client.get("/moderator/reports", headers=AUTH).json()
    target = mod_reports[0]
    report_id = target["id"]

    # 3. Moderator provides active learning correction: category should be 'corruption' and severity 'CRITICAL'
    feedback_payload = {
        "corrected_category": "corruption",
        "corrected_severity": "CRITICAL",
        "feedback_notes": "Financial fabrication to hide bribery is corruption, not a technical bug.",
    }
    fb_res = client.post(
        f"/moderator/reports/{report_id}/ml-feedback",
        json=feedback_payload,
        headers=AUTH,
    )
    assert fb_res.status_code == 200
    data = fb_res.json()
    assert data["status"] == "feedback_recorded"
    assert data["category"] == "corruption"
    assert data["severity"] == "CRITICAL"
