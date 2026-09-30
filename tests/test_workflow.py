"""Public flow: anonymous submit, case-code tracking, input validation."""


def test_submit_returns_unguessable_code(client):
    r = client.post(
        "/reports",
        json={
            "category": "harassment",
            "description": "A coworker keeps sending unwanted personal messages after hours",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["case_code"].startswith("WD-")
    assert len(body["case_code"]) == 13
    assert body["status"] == "SUBMITTED"
    # raw code is shown; the stored hash must never leak
    assert "code_hash" not in body


def test_two_reports_get_different_codes(client):
    payload = {
        "category": "other",
        "description": "The office internet slows to a crawl every afternoon",
    }
    a = client.post("/reports", json=payload).json()["case_code"]
    b = client.post("/reports", json=payload).json()["case_code"]
    assert a != b


def test_track_with_code(client, report):
    r = client.get(f"/reports/{report['case_code']}")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "SUBMITTED"
    assert body["category"] == "security"
    assert body["updates"] == []


def test_track_unknown_code_is_404_envelope(client):
    r = client.get("/reports/WD-AAAAAAAAAA")
    assert r.status_code == 404
    assert r.json()["code"] == "unknown_case_code"


def test_invalid_category_rejected(client):
    r = client.post(
        "/reports", json={"category": "gossip", "description": "Long enough description here"}
    )
    assert r.status_code == 422
    assert r.json()["code"] == "validation_error"


def test_short_description_rejected(client):
    r = client.post("/reports", json={"category": "other", "description": "too short"})
    assert r.status_code == 422


def test_no_identity_fields_accepted_or_returned(client):
    r = client.post(
        "/reports",
        json={
            "category": "technical",
            "description": "The production database crashes during the backup window nightly",
            "name": "sneaky",
            "email": "sneaky@example.com",
        },
    )
    assert r.status_code == 201
    assert "name" not in r.json() and "email" not in r.json()
