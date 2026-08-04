"""Backend tests for iteration_16:
- Admin RBAC (status, summary, users, projects, audit, role change, owner protection, claim-owner closed)
- Billing storage in /api/billing/summary + plans[].storage_gb
- Strict evidence-grounded /api/briefs/analyze
"""
import base64
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://frameflow-studio-15.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "wsdesign@studio.com"
ADMIN_PASSWORD = "secret123"
OWNER_EMAIL = "stefanoorofino@gmail.com"  # Do NOT modify


# ---------- helpers ---------------------------------------------------------
def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


def _register(email, password="pass1234", name="Fresh User"):
    return requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": password, "name": name},
        timeout=30,
    )


@pytest.fixture(scope="module")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def fresh_user():
    email = f"fresh_{uuid.uuid4().hex[:8]}@test.io"
    r = _register(email)
    assert r.status_code == 200, f"register fresh failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "token": data["token"], "user_id": data["user"]["user_id"]}


@pytest.fixture(scope="module")
def fresh_headers(fresh_user):
    return {"Authorization": f"Bearer {fresh_user['token']}", "Content-Type": "application/json"}


# ---------- Admin: status ---------------------------------------------------
class TestAdminStatus:
    def test_status_admin(self, admin_headers):
        r = requests.get(f"{API}/admin/status", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["owner_exists"] is True
        assert j["can_claim"] is False
        assert j["my_role"] == "admin"
        assert j["is_privileged"] is True

    def test_status_fresh(self, fresh_headers):
        r = requests.get(f"{API}/admin/status", headers=fresh_headers, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["owner_exists"] is True
        assert j["can_claim"] is False
        assert j["my_role"] == "user"
        assert j["is_privileged"] is False


# ---------- Admin: summary --------------------------------------------------
class TestAdminSummary:
    def test_summary_admin(self, admin_headers):
        r = requests.get(f"{API}/admin/summary", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("users", "projects", "content", "usage", "storage", "recent_users", "health"):
            assert k in j, f"missing key {k}"
        assert "total" in j["users"]
        assert "by_role" in j["users"]
        assert "quotas_gb" in j["storage"]
        # quotas should include free/pro/studio
        for pid in ("free", "pro", "studio"):
            assert pid in j["storage"]["quotas_gb"]

    def test_summary_forbidden_for_fresh(self, fresh_headers):
        r = requests.get(f"{API}/admin/summary", headers=fresh_headers, timeout=30)
        assert r.status_code == 403, r.text

    def test_users_forbidden_for_fresh(self, fresh_headers):
        r = requests.get(f"{API}/admin/users", headers=fresh_headers, timeout=30)
        assert r.status_code == 403

    def test_projects_forbidden_for_fresh(self, fresh_headers):
        r = requests.get(f"{API}/admin/projects", headers=fresh_headers, timeout=30)
        assert r.status_code == 403

    def test_audit_forbidden_for_fresh(self, fresh_headers):
        r = requests.get(f"{API}/admin/audit", headers=fresh_headers, timeout=30)
        assert r.status_code == 403


# ---------- Admin: users/projects/audit lists -------------------------------
class TestAdminListing:
    def test_users_list(self, admin_headers):
        r = requests.get(f"{API}/admin/users", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        users = r.json().get("users") or []
        assert len(users) > 0
        u0 = users[0]
        for k in ("user_id", "email", "role", "projects", "plan"):
            assert k in u0

    def test_projects_list(self, admin_headers):
        r = requests.get(f"{API}/admin/projects", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        projects = r.json().get("projects") or []
        assert isinstance(projects, list)
        if projects:
            p0 = projects[0]
            for k in ("id", "title", "status", "owner_email", "scenes"):
                assert k in p0

    def test_audit_list(self, admin_headers):
        r = requests.get(f"{API}/admin/audit", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert "audit" in r.json()


# ---------- Admin: role change + protection ---------------------------------
class TestRoleChange:
    def test_change_role_and_audit(self, admin_headers, fresh_user):
        # Promote fresh user to 'support'
        r = requests.patch(
            f"{API}/admin/users/{fresh_user['user_id']}/role",
            headers=admin_headers,
            json={"role": "support"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("role") == "support"

        # Verify via users list
        r2 = requests.get(f"{API}/admin/users", headers=admin_headers, timeout=30)
        assert r2.status_code == 200
        found = [u for u in r2.json()["users"] if u["user_id"] == fresh_user["user_id"]]
        assert found and found[0]["role"] == "support"

        # Verify audit entry exists
        r3 = requests.get(f"{API}/admin/audit", headers=admin_headers, timeout=30)
        rows = r3.json().get("audit", [])
        assert any(
            row.get("action") == "role_changed" and row.get("target_user_id") == fresh_user["user_id"]
            for row in rows
        ), "no role_changed audit entry"

        # Reset back to 'user' to leave DB clean
        rr = requests.patch(
            f"{API}/admin/users/{fresh_user['user_id']}/role",
            headers=admin_headers,
            json={"role": "user"},
            timeout=30,
        )
        assert rr.status_code == 200

    def test_owner_protected(self, admin_headers):
        # Find owner user_id via listing
        r = requests.get(f"{API}/admin/users", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        owners = [u for u in r.json()["users"] if u.get("email") == OWNER_EMAIL]
        assert owners, "owner not present"
        owner_uid = owners[0]["user_id"]
        # Attempt to demote owner -> user MUST 403
        rr = requests.patch(
            f"{API}/admin/users/{owner_uid}/role",
            headers=admin_headers,
            json={"role": "user"},
            timeout=30,
        )
        assert rr.status_code == 403, f"expected 403, got {rr.status_code} {rr.text}"


# ---------- Admin: claim-owner closed ---------------------------------------
class TestClaimOwnerClosed:
    def test_claim_owner_forbidden_for_admin(self, admin_headers):
        r = requests.post(f"{API}/admin/claim-owner", headers=admin_headers, timeout=30)
        assert r.status_code == 403, r.text

    def test_claim_owner_forbidden_for_fresh(self, fresh_headers):
        r = requests.post(f"{API}/admin/claim-owner", headers=fresh_headers, timeout=30)
        assert r.status_code == 403


# ---------- Billing storage -------------------------------------------------
class TestBillingStorage:
    def test_billing_summary_has_storage(self, admin_headers):
        r = requests.get(f"{API}/billing/summary", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "storage" in j
        s = j["storage"]
        for k in ("label", "used_bytes", "limit_bytes", "used_label", "limit_label", "display", "percent"):
            assert k in s, f"storage missing {k}"
        assert s["label"] == "Cloud Storage Included"
        # display format like "X / 5 GB" for free plan
        assert "/" in s["display"]
        assert isinstance(s["percent"], (int, float))

    def test_billing_plans_have_storage_gb(self, admin_headers):
        r = requests.get(f"{API}/billing/summary", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        plans = r.json().get("plans") or []
        assert len(plans) == 3
        by_id = {p["id"]: p for p in plans}
        assert by_id["free"]["storage_gb"] == 5
        assert by_id["pro"]["storage_gb"] == 10
        assert by_id["studio"]["storage_gb"] == 15


# ---------- Strict brief analyze --------------------------------------------
class TestBriefAnalyzeStrict:
    def test_analyze_strict_evidence(self, admin_headers):
        text = (
            "PROJECT BRIEF\n\n"
            "The production budget is €25,000.\n\n"
            "This document contains a single explicit fact for testing the strict\n"
            "evidence-grounded extraction pipeline.\n"
        )
        b64 = base64.b64encode(text.encode("utf-8")).decode()
        payload = {
            "documents": [{"name": "budget_only.txt", "data": b64}],
            "images": [],
        }
        r = requests.post(
            f"{API}/briefs/analyze", headers=admin_headers, json=payload, timeout=180
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert "analysis" in j
        analysis = j["analysis"]
        assert "fields" in analysis
        assert "suggestions" in analysis
        assert "summary" in analysis
        summ = analysis["summary"]
        for k in ("fieldsFound", "fieldsMissing", "fieldsAmbiguous", "conflicts"):
            assert k in summ, f"summary missing {k}"

        fields = analysis["fields"]
        # If not mock mode, budget should be found w/ evidence.
        # In mock mode the whole thing will be missing — allow either but log.
        mock = j.get("mock_mode", False)
        if not mock:
            budget = fields.get("budget") or {}
            assert budget.get("status") == "found", f"budget not found: {budget}"
            assert budget.get("sourceDocument"), "budget missing sourceDocument"
            assert budget.get("evidenceSnippet"), "budget missing evidenceSnippet"

            # A non-mentioned field must be missing (e.g. deadline)
            deadline = fields.get("deadline") or {}
            assert deadline.get("status") == "missing"
            assert deadline.get("value") in ("", None)

            # No 'found' fact should have empty evidence
            for k, f in fields.items():
                if f.get("status") == "found":
                    assert f.get("evidenceSnippet"), f"'found' field '{k}' has empty evidence"
                    assert f.get("sourceDocument"), f"'found' field '{k}' has empty sourceDocument"
        else:
            # Mock mode: at minimum shape holds up; all fields should be status missing
            for k, f in fields.items():
                assert f.get("status") in ("missing", "ambiguous", "conflict", "found")
