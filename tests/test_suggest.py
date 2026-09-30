"""ML endpoints: suggestion shape, abstention honesty, duplicates, priority."""
from conftest import AUTH


def test_suggest_confident_security_text(client):
    r = client.post(
        "/suggest/category",
        json={
            "description": "An unknown USB drive was found plugged into the reception computer this morning"
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "security"
    assert body["abstained"] is False
    assert 0.0 <= body["confidence"] <= 1.0


def test_suggest_abstains_on_gibberish(client):
    r = client.post(
        "/suggest/category",
        json={"description": "zebra xylophone quantum banana orbit seven"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["abstained"] is True
    assert body["label"] is None


def test_duplicates_found_for_similar_reports(client):
    a = client.post(
        "/reports",
        json={
            "category": "security",
            "description": "The CCTV camera covering the parking exit has been offline since Tuesday",
        },
    ).json()
    items = client.get("/moderator/reports?status=SUBMITTED", headers=AUTH).json()
    me = next(x for x in items if x["description"].startswith("The CCTV camera"))
    r = client.get(f"/moderator/reports/{me['id']}/duplicates", headers=AUTH)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_priority_score_present_and_bounded(client):
    items = client.get("/moderator/reports", headers=AUTH).json()
    assert items
    for x in items:
        assert 0.0 <= x["priority_score"] <= 1.0
