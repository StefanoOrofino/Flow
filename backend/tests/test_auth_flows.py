"""Auth flow tests for Emergent-managed Google sign-in."""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://frameflow-ai-6.preview.emergentagent.com').rstrip('/')
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    # cleanup TEST users/sessions
    db.users.delete_many({"email": {"$regex": r"test\.user\."}})
    db.user_sessions.delete_many({"session_token": {"$regex": r"^test_session"}})
    client.close()


@pytest.fixture
def seeded_session(mongo):
    ts = int(time.time() * 1000)
    user_id = f"test-user-{ts}-{uuid.uuid4().hex[:6]}"
    session_token = f"test_session_{ts}_{uuid.uuid4().hex[:8]}"
    email = f"test.user.{ts}@example.com"
    mongo.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"user_id": user_id, "session_token": session_token, "email": email}
    mongo.users.delete_one({"user_id": user_id})
    mongo.user_sessions.delete_one({"session_token": session_token})


@pytest.fixture
def expired_session(mongo):
    ts = int(time.time() * 1000)
    user_id = f"test-user-exp-{ts}"
    session_token = f"test_session_expired_{ts}"
    email = f"test.user.exp.{ts}@example.com"
    mongo.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Test User Expired",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"user_id": user_id, "session_token": session_token, "email": email}
    mongo.users.delete_one({"user_id": user_id})
    mongo.user_sessions.delete_one({"session_token": session_token})


# --- Tests ---
class TestAuthMe:
    def test_auth_me_no_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_with_bearer(self, seeded_session):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {seeded_session['session_token']}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] == seeded_session["user_id"]
        assert data["email"] == seeded_session["email"]
        assert data["name"] == "Test User"
        assert data["picture"] == "https://via.placeholder.com/150"

    def test_auth_me_with_cookie(self, seeded_session):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": seeded_session["session_token"]},
        )
        assert r.status_code == 200
        assert r.json()["email"] == seeded_session["email"]

    def test_auth_me_expired(self, expired_session):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {expired_session['session_token']}"},
        )
        assert r.status_code == 401


class TestAuthSession:
    def test_session_no_header(self):
        r = requests.post(f"{BASE_URL}/api/auth/session")
        assert r.status_code == 400


class TestLogout:
    def test_logout_with_cookie_deletes_session(self, seeded_session, mongo):
        # logout using cookie (the backend reads cookie only)
        r = requests.post(
            f"{BASE_URL}/api/auth/logout",
            cookies={"session_token": seeded_session["session_token"]},
        )
        assert r.status_code == 200
        # verify session removed
        assert mongo.user_sessions.find_one({"session_token": seeded_session["session_token"]}) is None
        # subsequent /me should be 401
        r2 = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {seeded_session['session_token']}"},
        )
        assert r2.status_code == 401

    def test_logout_with_bearer_only(self, seeded_session, mongo):
        """Review request expects Bearer-based logout to delete session.
        NOTE: current backend reads only cookie in logout endpoint."""
        r = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {seeded_session['session_token']}"},
        )
        assert r.status_code == 200
        session_still_present = mongo.user_sessions.find_one({"session_token": seeded_session["session_token"]}) is not None
        # Assert session deleted per review request
        assert not session_still_present, "Logout with Bearer did not delete session (backend only reads cookie)"
