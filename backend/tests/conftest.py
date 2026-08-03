import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://frameflow-studio-15.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api():
    return API


@pytest.fixture(scope="session")
def user_a():
    """Create a fresh user A for the session."""
    email = f"test_a_{uuid.uuid4().hex[:8]}@storyboard.ai"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test A"}, timeout=30)
    assert r.status_code == 200, f"register A failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": "pass1234", "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def user_b():
    email = f"test_b_{uuid.uuid4().hex[:8]}@storyboard.ai"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test B"}, timeout=30)
    assert r.status_code == 200
    return {"email": email, "password": "pass1234", "token": r.json()["token"], "user": r.json()["user"]}


@pytest.fixture
def auth_headers_a(user_a):
    return {"Authorization": f"Bearer {user_a['token']}", "Content-Type": "application/json"}


@pytest.fixture
def auth_headers_b(user_b):
    return {"Authorization": f"Bearer {user_b['token']}", "Content-Type": "application/json"}
