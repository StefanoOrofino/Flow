"""Backend tests for Stripe billing checkout flow (Emergent-managed test key).

Covers:
- POST /api/billing/checkout (pro / studio / invalid / unauth)
- GET  /api/billing/checkout/status/{session_id} (open/unpaid; unknown -> 404)
- POST /api/billing/webhook   (returns {received: true} on empty body path)
- POST /api/billing/cancel    (downgrades to plan 'free')
- GET  /api/billing/summary   (stripeEnabled, plans[], usage[])
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL",
                          "https://frameflow-studio-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "sb_1785767871@studio.com"
SEED_PASSWORD = "secret123"
ORIGIN = BASE_URL   # used as origin_url when creating checkout sessions


# ---------------------------------------------------------------------------
# Session / auth helpers
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def seed_token():
    """Login as the seeded working account (sb_1785767871@studio.com)."""
    r = requests.post(f"{API}/auth/login",
                      json={"email": SEED_EMAIL, "password": SEED_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"seed login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def seed_headers(seed_token):
    return {"Authorization": f"Bearer {seed_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def fresh_user():
    """Register a brand-new user (guaranteed to start on free)."""
    email = f"bill_{uuid.uuid4().hex[:10]}@test.io"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "pass1234", "name": "Bill Test"}, timeout=30)
    assert r.status_code == 200
    tok = r.json()["token"]
    return {"email": email, "token": tok,
            "headers": {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}}


# ---------------------------------------------------------------------------
# /api/billing/checkout — happy paths
# ---------------------------------------------------------------------------
class TestCheckoutCreate:

    def test_checkout_pro_returns_stripe_url(self, seed_headers):
        r = requests.post(f"{API}/billing/checkout",
                          json={"plan": "pro", "origin_url": ORIGIN},
                          headers=seed_headers, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and "session_id" in body
        assert body["url"].startswith("https://checkout.stripe.com"), body["url"]
        assert isinstance(body["session_id"], str) and len(body["session_id"]) > 5

    def test_checkout_studio_returns_stripe_url(self, seed_headers):
        r = requests.post(f"{API}/billing/checkout",
                          json={"plan": "studio", "origin_url": ORIGIN},
                          headers=seed_headers, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["url"].startswith("https://checkout.stripe.com")
        assert body["session_id"]

    def test_checkout_invalid_plan_returns_400(self, seed_headers):
        r = requests.post(f"{API}/billing/checkout",
                          json={"plan": "enterprise", "origin_url": ORIGIN},
                          headers=seed_headers, timeout=30)
        assert r.status_code == 400, r.text
        assert "invalid" in r.text.lower() or "plan" in r.text.lower()

    def test_checkout_unauthenticated_returns_401(self):
        r = requests.post(f"{API}/billing/checkout",
                          json={"plan": "pro", "origin_url": ORIGIN},
                          headers={"Content-Type": "application/json"}, timeout=30)
        # FastAPI dependency raises 401 (or 403 depending on scheme); accept either
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# /api/billing/checkout/status/{session_id}
# ---------------------------------------------------------------------------
class TestCheckoutStatus:

    def test_status_open_unpaid_on_fresh_session(self, seed_headers):
        # create a fresh session
        r = requests.post(f"{API}/billing/checkout",
                          json={"plan": "pro", "origin_url": ORIGIN},
                          headers=seed_headers, timeout=60)
        assert r.status_code == 200
        sid = r.json()["session_id"]

        s = requests.get(f"{API}/billing/checkout/status/{sid}",
                         headers=seed_headers, timeout=30)
        assert s.status_code == 200, s.text
        body = s.json()
        # a freshly created session that hasn't been paid must be open + unpaid
        assert body.get("status") == "open", body
        assert body.get("payment_status") == "unpaid", body
        assert body.get("paid") is False
        assert body.get("plan") == "pro"

    def test_status_unknown_session_returns_404(self, seed_headers):
        fake = f"cs_test_{uuid.uuid4().hex}"
        r = requests.get(f"{API}/billing/checkout/status/{fake}",
                         headers=seed_headers, timeout=30)
        assert r.status_code == 404, r.text

    def test_status_other_user_session_returns_404(self, seed_headers, fresh_user):
        # session owned by seed user
        r = requests.post(f"{API}/billing/checkout",
                          json={"plan": "pro", "origin_url": ORIGIN},
                          headers=seed_headers, timeout=60)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        # different user tries to read it
        other = requests.get(f"{API}/billing/checkout/status/{sid}",
                             headers=fresh_user["headers"], timeout=30)
        assert other.status_code == 404


# ---------------------------------------------------------------------------
# /api/billing/webhook
# ---------------------------------------------------------------------------
class TestWebhook:

    def test_webhook_accepts_signatureless_json_and_returns_received(self):
        """The Emergent proxy path allows unsigned webhooks (test key sk_test_emergent).
        A checkout.session.completed with an unknown session must still return
        {received: true} (no side effect because tx not found)."""
        payload = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": f"cs_test_{uuid.uuid4().hex}",
                    "payment_status": "paid",
                    "metadata": {"user_id": "unknown", "plan": "pro", "kind": "subscription"},
                }
            },
        }
        r = requests.post(f"{API}/billing/webhook", json=payload, timeout=30)
        # Tolerant assertion: contract says {received:true}. Some Stripe wrappers
        # reject a payload without a valid signature — we surface that clearly.
        if r.status_code == 200:
            assert r.json().get("received") is True
        else:
            pytest.fail(
                f"/api/billing/webhook returned {r.status_code} for signature-less "
                f"payload — spec expects 200 {{received:true}} via Emergent proxy. "
                f"Body: {r.text[:400]}"
            )


# ---------------------------------------------------------------------------
# /api/billing/summary + /api/billing/cancel
# ---------------------------------------------------------------------------
class TestSummaryAndCancel:

    def test_summary_shape_free_user(self, fresh_user):
        r = requests.get(f"{API}/billing/summary",
                         headers=fresh_user["headers"], timeout=30)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s.get("stripeEnabled") is True
        plans = s.get("plans")
        assert isinstance(plans, list) and len(plans) >= 3
        plan_ids = {p.get("id") for p in plans}
        assert {"free", "pro", "studio"}.issubset(plan_ids)
        usage = s.get("usage")
        assert isinstance(usage, list) and len(usage) > 0
        # Sanity: each usage row has label/used/limit-ish keys
        for row in usage:
            assert "label" in row or "key" in row
        # Fresh user is on free
        assert s["plan"]["id"] == "free"

    def test_cancel_downgrades_to_free(self, seed_headers):
        r = requests.post(f"{API}/billing/cancel",
                          headers=seed_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("plan") == "free"
        # Verify via summary
        s = requests.get(f"{API}/billing/summary",
                         headers=seed_headers, timeout=30)
        assert s.status_code == 200
        summary = s.json()
        assert summary["plan"]["id"] == "free"
        assert summary["plan"].get("currentPeriodEnd") in (None, "", "null")

    def test_summary_projects_usage_computed_live(self, seed_headers):
        r = requests.get(f"{API}/billing/summary",
                         headers=seed_headers, timeout=30)
        assert r.status_code == 200
        s = r.json()
        # find projects usage row
        proj_rows = [u for u in s["usage"] if u.get("key") == "projects" or u.get("label", "").lower().startswith("project")]
        assert proj_rows, f"no projects usage row: {s['usage']}"
        # value should be numeric >= 0
        row = proj_rows[0]
        used = row.get("used")
        assert isinstance(used, (int, float)) and used >= 0


# ---------------------------------------------------------------------------
# Cleanup: reset seed account back to FREE
# ---------------------------------------------------------------------------
def test_zzz_reset_seed_to_free(seed_headers):
    r = requests.post(f"{API}/billing/cancel", headers=seed_headers, timeout=30)
    assert r.status_code == 200
    assert r.json().get("plan") == "free"
