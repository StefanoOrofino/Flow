"""Assistant chat endpoint tests (GPT-5.4 via Emergent key)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://frameflow-studio-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "sb_1785767871@studio.com"
PASSWORD = "secret123"
PROJECT_ID = "c73286507b42"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_assistant_chat_requires_auth():
    """No auth -> 401 or 403"""
    r = requests.post(f"{API}/assistant/chat",
                      json={"messages": [{"role": "user", "content": "hi"}], "language": "en"}, timeout=15)
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"


def test_assistant_chat_english(auth_headers):
    """English reply, non-empty string."""
    payload = {"messages": [{"role": "user", "content": "How do I export a PDF?"}], "language": "en"}
    r = requests.post(f"{API}/assistant/chat", headers=auth_headers, json=payload, timeout=60)
    assert r.status_code == 200, f"{r.status_code}: {r.text}"
    data = r.json()
    assert "reply" in data
    reply = data["reply"]
    assert isinstance(reply, str) and len(reply.strip()) > 0, f"Empty reply: {reply!r}"
    print("EN reply:", reply[:180])


def test_assistant_chat_italian_and_project_context(auth_headers):
    """Italian language + project context in same call to save credits."""
    payload = {
        "messages": [{"role": "user", "content": "Di quante scene si compone questo progetto e come esporto un PDF?"}],
        "language": "it",
        "project_id": PROJECT_ID,
    }
    r = requests.post(f"{API}/assistant/chat", headers=auth_headers, json=payload, timeout=60)
    assert r.status_code == 200, f"{r.status_code}: {r.text}"
    reply = r.json().get("reply", "")
    assert isinstance(reply, str) and reply.strip(), f"Empty reply: {reply!r}"
    # Heuristic language check: presence of common Italian tokens
    lowered = reply.lower()
    italian_hits = sum(1 for w in [" il ", " la ", " del ", " che ", " progetto", " scene", " pdf", " puoi", " esporta"] if w in f" {lowered} ")
    assert italian_hits >= 2, f"Reply doesn't look Italian: {reply!r}"
    print("IT+context reply:", reply[:220])
