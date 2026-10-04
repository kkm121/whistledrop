"""Tests for advanced features:
1. Confidential evidence file upload & secure download
2. Permanent case closure (terminal state transition)
3. Moderator multi-facet search & keyword filtering
4. Moderator analytics & incident clusters
"""
import io
from fastapi.testclient import TestClient
from tests.conftest import AUTH


def test_evidence_file_upload_and_download(client: TestClient):
    # Upload evidence file
    fake_file = io.BytesIO(b"CONFIDENTIAL AUDIT EVIDENCE LOG - UNENCRYPTED CREDENTIALS FOUND")
    res_upload = client.post(
        "/reports/upload-evidence",
        files={"file": ("audit_log.txt", fake_file, "text/plain")},
    )
    assert res_upload.status_code == 201
    upload_data = res_upload.json()
    assert "file_id" in upload_data
    file_id = upload_data["file_id"]

    # Submit report referencing this evidence file
    res_submit = client.post(
        "/reports",
        json={
            "category": "security",
            "description": "Found unencrypted credentials in root folder. Attached full audit evidence log.",
            "evidence_file_id": file_id,
        },
    )
    assert res_submit.status_code == 201
    case_code = res_submit.json()["case_code"]

    # Track report and check evidence attachment
    res_track = client.get(f"/reports/{case_code}")
    assert res_track.status_code == 200
    track_data = res_track.json()
    assert track_data["evidence_file_name"] == file_id

    # Download evidence using case code
    res_dl = client.get(f"/reports/{case_code}/evidence")
    assert res_dl.status_code == 200
    assert b"CONFIDENTIAL AUDIT EVIDENCE LOG" in res_dl.content


def test_evidence_upload_unsupported_extension(client: TestClient):
    bad_file = io.BytesIO(b"malicious payload")
    res = client.post(
        "/reports/upload-evidence",
        files={"file": ("exploit.exe", bad_file, "application/x-msdownload")},
    )
    assert res.status_code == 400
    assert res.json()["code"] == "unsupported_file_type"


def test_permanent_case_closure(client: TestClient):
    # Submit report
    res_submit = client.post(
        "/reports",
        json={
            "category": "corruption",
            "description": "Kickbacks received by vendor coordinator during Q3 equipment procurement.",
        },
    )
    assert res_submit.status_code == 201
    case_code = res_submit.json()["case_code"]

    # Moderator gets report list to find id
    res_list = client.get("/moderator/reports", headers=AUTH)
    assert res_list.status_code == 200
    report_id = res_list.json()[0]["id"]

    # Transition to UNDER_REVIEW
    res_patch = client.patch(
        f"/moderator/reports/{report_id}/status",
        headers=AUTH,
        json={"status": "UNDER_REVIEW"},
    )
    assert res_patch.status_code == 200

    # Permanently close case with official rationale
    res_close = client.post(
        f"/moderator/reports/{report_id}/close",
        headers=AUTH,
        json={"reason": "Investigation completed. Vendor contract terminated and legal charges filed."},
    )
    assert res_close.status_code == 200
    closed_data = res_close.json()
    assert closed_data["status"] == "CLOSED"
    assert "contract terminated" in closed_data["closure_reason"]

    # Verify report is strictly terminal: illegal to transition from CLOSED
    res_illegal = client.patch(
        f"/moderator/reports/{report_id}/status",
        headers=AUTH,
        json={"status": "UNDER_REVIEW"},
    )
    assert res_illegal.status_code == 409
    assert res_illegal.json()["code"] == "illegal_transition"

    # Verify report rejects further updates
    res_no_update = client.post(
        f"/moderator/reports/{report_id}/updates",
        headers=AUTH,
        json={"message": "New note on closed case", "public": True},
    )
    assert res_no_update.status_code == 409
    assert res_no_update.json()["code"] == "case_closed"

    # Verify reporter sees closure reason in tracking
    res_track = client.get(f"/reports/{case_code}")
    assert res_track.status_code == 200
    assert res_track.json()["status"] == "CLOSED"
    assert "contract terminated" in res_track.json()["closure_reason"]


def test_moderator_search_and_filter(client: TestClient):
    client.post(
        "/reports",
        json={
            "category": "technical",
            "description": "Quantum encryption engine buffer overflow detected in production auth cluster.",
        },
    )

    # Search by keyword 'Quantum'
    res_search = client.get("/moderator/reports?q=Quantum", headers=AUTH)
    assert res_search.status_code == 200
    reports = res_search.json()
    assert len(reports) >= 1
    assert any("Quantum" in r["description"] for r in reports)

    # Sort by risk descending
    res_sort = client.get("/moderator/reports?sort_by=risk_desc", headers=AUTH)
    assert res_sort.status_code == 200
    scores = [r["priority_score"] for r in res_sort.json()]
    assert scores == sorted(scores, reverse=True)


def test_moderator_analytics_and_clusters(client: TestClient):
    # Analytics
    res_analytics = client.get("/moderator/analytics", headers=AUTH)
    assert res_analytics.status_code == 200
    data = res_analytics.json()
    assert "total_reports" in data
    assert "by_category" in data
    assert "by_status" in data
    assert data["total_reports"] > 0

    # Incident Clusters
    res_clusters = client.get("/moderator/clusters", headers=AUTH)
    assert res_clusters.status_code == 200
    assert isinstance(res_clusters.json(), list)
