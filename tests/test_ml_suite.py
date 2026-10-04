"""Tests for WhistleDrop Multi-Task ML Suite:
1. Category Classification & Probability Calibration
2. Learned Urgency & Risk Scoring
3. Department & Escalation Auto-Routing
4. Privacy Guardian: Automated PII Detection & Redaction
5. ML Incident Clustering
6. ML Model Metadata Endpoint
"""
from fastapi.testclient import TestClient
from app.ml import service as ml


def test_category_suggestion_and_abstention(client: TestClient):
    # Security classification
    res = client.post(
        "/suggest/category",
        json={"description": "Active ransomware encrypted all production database files with ransom notes."},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "security"
    assert data["confidence"] > 0.4
    assert not data["abstained"]
    assert len(data["top_candidates"]) > 0

    # Abstention on ambiguous / out-of-domain text
    res_abstain = client.post(
        "/suggest/category",
        json={"description": "hello test 1 2 3 random words without meaning."},
    )
    assert res_abstain.status_code == 200
    data_abstain = res_abstain.json()
    assert data_abstain["abstained"] is True
    assert data_abstain["label"] is None


def test_learned_urgency_and_risk_scoring():
    critical_text = "The VP of Procurement is taking millions in cash bribes and actively destroying audit evidence."
    urg_crit = ml.score_urgency(critical_text)
    assert urg_crit["risk_score"] >= 0.7
    assert urg_crit["severity"] in ["CRITICAL", "HIGH"]
    assert len(urg_crit["contributing_keywords"]) > 0

    minor_text = "The cafeteria vending machine is dispensing lukewarm water instead of chilled drinks."
    urg_minor = ml.score_urgency(minor_text)
    assert urg_minor["risk_score"] < 0.6
    assert urg_minor["severity"] in ["LOW", "MEDIUM"]


def test_department_auto_routing():
    hr_text = "My manager makes demeaning sexual advances towards junior interns in private meetings."
    dept_hr = ml.suggest_department(hr_text)
    assert dept_hr["department"] == "People & HR"
    assert dept_hr["confidence"] > 0.3

    it_text = "A zero-day SQL injection vulnerability in our public payment API exposes customer passwords."
    dept_it = ml.suggest_department(it_text)
    assert dept_it["department"] == "Cyber & InfoSec"

    audit_text = "The accounting team is running two sets of books to embezzle government research grants."
    dept_audit = ml.suggest_department(audit_text)
    assert dept_audit["department"] in ["Audit & Finance", "Legal & Compliance"]


def test_privacy_guardian_pii_detection(client: TestClient):
    text_with_pii = (
        "My name is John Doe (email: whistleblower@company.com, phone: 555-019-2834, ID: EMP-9821). "
        "Our supervisor is stealing laptops from the second-floor warehouse."
    )
    res = client.post("/suggest/privacy", json={"description": text_with_pii})
    assert res.status_code == 200
    data = res.json()
    assert data["has_pii"] is True
    assert data["entity_count"] >= 3
    assert "[REDACTED_EMAIL]" in data["sanitized_text"]
    assert "[REDACTED_PHONE]" in data["sanitized_text"]
    assert "John Doe" not in data["sanitized_text"] or "[REDACTED_PERSON_NAME]" in data["sanitized_text"]
    assert "EMP-9821" not in data["sanitized_text"]


def test_comprehensive_ml_analysis_endpoint(client: TestClient):
    text = "Critical security alert: Ransomware infection breached our production database and encrypted customer records."
    res = client.post("/suggest/analyze", json={"description": text})
    assert res.status_code == 200
    data = res.json()
    assert "category" in data
    assert "urgency" in data
    assert "department" in data
    assert "privacy" in data
    assert data["category"]["label"] == "security"
    assert data["urgency"]["severity"] in ["CRITICAL", "HIGH"]
    assert data["department"]["department"] == "Cyber & InfoSec"


def test_ml_metadata_benchmarks(client: TestClient):
    res = client.get("/ml/metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["version"] == "2.0.0"
    assert "metrics" in data
    assert "category" in data["metrics"]
    assert data["metrics"]["category"]["accuracy"] >= 0.85
