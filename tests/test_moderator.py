"""Moderator auth, filtering, state machine, public vs internal updates."""
from conftest import AUTH


def test_moderator_requires_auth(client):
    assert client.get("/moderator/reports").status_code == 401
    bad = {"Authorization": "Bearer wrong-key"}
    assert client.get("/moderator/reports", headers=bad).status_code == 401


def test_list_and_filter(client, report):
    r = client.get("/moderator/reports", headers=AUTH)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    r = client.get("/moderator/reports?category=security", headers=AUTH)
    assert all(x["category"] == "security" for x in r.json())
    r = client.get("/moderator/reports?status=SUBMITTED", headers=AUTH)
    assert all(x["status"] == "SUBMITTED" for x in r.json())
    # moderator view exposes no identities either
    assert "code_hash" not in str(r.json())


def _moderator_id(client):
    items = client.get("/moderator/reports?status=SUBMITTED", headers=AUTH).json()
    assert items, "expected at least one SUBMITTED report"
    return items[0]["id"]


def test_illegal_transition_rejected(client):
    rid = _moderator_id(client)
    r = client.patch(
        f"/moderator/reports/{rid}/status", json={"status": "RESOLVED"}, headers=AUTH
    )
    assert r.status_code == 409
    assert r.json()["code"] == "illegal_transition"


def test_legal_workflow_and_terminal_lock(client):
    rid = _moderator_id(client)
    r = client.patch(
        f"/moderator/reports/{rid}/status",
        json={"status": "UNDER_REVIEW"},
        headers=AUTH,
    )
    assert r.status_code == 200 and r.json()["status"] == "UNDER_REVIEW"
    r = client.patch(
        f"/moderator/reports/{rid}/status", json={"status": "RESOLVED"}, headers=AUTH
    )
    assert r.status_code == 200
    r = client.patch(
        f"/moderator/reports/{rid}/status",
        json={"status": "DISMISSED"},
        headers=AUTH,
    )
    assert r.status_code == 409  # terminal states are final


def test_public_vs_internal_updates(client, report):
    items = client.get("/moderator/reports?status=SUBMITTED", headers=AUTH).json()
    rid = items[0]["id"]
    client.post(
        f"/moderator/reports/{rid}/updates",
        json={"message": "Looking into the lobby computer logs.", "public": True},
        headers=AUTH,
    )
    client.post(
        f"/moderator/reports/{rid}/updates",
        json={"message": "Suspect is the night guard.", "public": False},
        headers=AUTH,
    )
    tracked = client.get(f"/reports/{report['case_code']}").json()
    shown = [u["message"] for u in tracked["updates"]]
    assert "Looking into the lobby computer logs." in shown
    assert "Suspect is the night guard." not in shown


def test_unknown_report_404(client):
    r = client.get("/moderator/reports/999999", headers=AUTH)
    assert r.status_code == 404
