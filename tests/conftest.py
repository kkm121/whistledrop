"""Isolated test environment: throwaway SQLite file, fixed moderator key."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

os.environ["DATABASE_URL"] = "sqlite:///./test_whistledrop.db"
os.environ["MODERATOR_API_KEY"] = "test-moderator-key"
os.environ["MODEL_PATH"] = "./test_model.joblib"

import pytest
from fastapi.testclient import TestClient

for _f in ("test_whistledrop.db", "test_model.joblib"):
    _p = os.path.join(ROOT, _f)
    if os.path.exists(_p):
        os.remove(_p)

from app.main import app  # noqa: E402

AUTH = {"Authorization": "Bearer test-moderator-key"}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def report(client):
    r = client.post(
        "/reports",
        json={
            "category": "security",
            "description": "An unknown USB drive was found plugged into the lobby computer today",
        },
    )
    assert r.status_code == 201
    return r.json()
