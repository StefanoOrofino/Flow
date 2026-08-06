import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_root(client):
    r = client.get(f"{BASE_URL}/api/")
    assert r.status_code == 200


def test_create_lead_valid(client):
    payload = {"email": "TEST_lead@example.com", "source": "waitlist", "plan": None}
    r = client.post(f"{BASE_URL}/api/leads", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == payload["email"]
    assert data["source"] == "waitlist"
    assert "lead_id" in data

    # Verify persistence
    r2 = client.get(f"{BASE_URL}/api/leads")
    assert r2.status_code == 200
    emails = [x["email"] for x in r2.json()]
    assert payload["email"] in emails


def test_create_lead_invalid_email(client):
    r = client.post(f"{BASE_URL}/api/leads", json={"email": "notanemail"})
    assert r.status_code == 422


def test_create_contact_valid(client):
    payload = {"name": "TEST User", "email": "TEST_contact@example.com", "message": "hello"}
    r = client.post(f"{BASE_URL}/api/contact", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == payload["name"]
    assert data["email"] == payload["email"]
    assert data["message"] == payload["message"]


def test_create_contact_invalid_email(client):
    r = client.post(f"{BASE_URL}/api/contact", json={"name": "x", "email": "bad", "message": "m"})
    assert r.status_code == 422
