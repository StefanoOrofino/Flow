"""Tests for FrameFlow Client Brief flow: /api/briefs/analyze + /api/briefs/create-project"""
import base64
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://frameflow-studio-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "sb_1785767871@studio.com"
PASSWORD = "secret123"

SAMPLE_BRIEF = (
    "CLIENT: Aurora Skincare\n"
    "CAMPAIGN: Night Serum Launch\n"
    "OBJECTIVE: Drive pre-orders\n"
    "BUDGET: EUR 25000\n"
    "PLATFORMS: Instagram, TikTok\n"
    "TARGET AUDIENCE: Women 25-45 interested in premium skincare.\n"
    "TONE OF VOICE: Elegant, calming, aspirational.\n"
    "DELIVERABLES: 30s hero film + 15s cutdowns.\n"
    "ASPECT RATIO: 9:16 vertical.\n"
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def analysis(auth_headers):
    b64 = base64.b64encode(SAMPLE_BRIEF.encode()).decode()
    payload = {"documents": [{"name": "brief.txt", "data": b64}], "images": []}
    r = requests.post(f"{API}/briefs/analyze", json=payload, headers=auth_headers, timeout=120)
    assert r.status_code == 200, f"analyze failed: {r.status_code} {r.text[:400]}"
    return r.json()


class TestAnalyzeBrief:
    def test_returns_analysis_structure(self, analysis):
        assert "analysis" in analysis
        a = analysis["analysis"]
        assert "fields" in a and isinstance(a["fields"], dict)
        assert "visual" in a and isinstance(a["visual"], dict)
        assert "summary" in a
        s = a["summary"]
        assert "overallConfidence" in s
        assert "confidence" in s
        assert set(["high", "medium", "low"]).issubset(s["confidence"].keys())
        assert "fieldsFound" in s
        assert "fieldsMissing" in s

    def test_expected_keys_present(self, analysis):
        f = analysis["analysis"]["fields"]
        for key in ["client", "campaign", "objective", "budget", "platforms", "target_audience"]:
            assert key in f, f"missing key {key}"

    def test_confidence_range(self, analysis):
        overall = analysis["analysis"]["summary"]["overallConfidence"]
        assert 0 <= overall <= 100

    def test_documents_metadata(self, analysis):
        docs = analysis.get("documents", [])
        assert len(docs) == 1
        assert docs[0]["fileName"] == "brief.txt"
        assert docs[0]["fileType"] == "TXT"

    def test_empty_upload_400(self, auth_headers):
        r = requests.post(f"{API}/briefs/analyze", json={"documents": [], "images": []}, headers=auth_headers, timeout=30)
        assert r.status_code == 400

    def test_requires_auth(self):
        r = requests.post(f"{API}/briefs/analyze", json={"documents": [], "images": []}, timeout=10)
        assert r.status_code == 401


class TestCreateProjectFromBrief:
    def test_create_and_delete(self, auth_headers, analysis):
        # Build simple fields dict (extract values from analysis)
        fields_full = analysis["analysis"]["fields"]
        visual_full = analysis["analysis"]["visual"]
        fields = {k: {"value": v.get("value") or ""} for k, v in fields_full.items()}
        visual = {k: {"value": v.get("value") or ""} for k, v in visual_full.items()}

        payload = {"fields": fields, "visual": visual, "generate": True}
        r = requests.post(f"{API}/briefs/create-project", json=payload, headers=auth_headers, timeout=180)
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text[:400]}"
        proj = r.json()

        assert proj.get("id"), "project missing id"
        assert proj.get("created_from") == "brief"
        assert proj.get("status") == "generated"
        assert isinstance(proj.get("scenes"), list) and len(proj["scenes"]) >= 8, f"scenes: {len(proj.get('scenes') or [])}"
        pid = proj["id"]

        # Verify via GET
        g = requests.get(f"{API}/projects/{pid}", headers=auth_headers, timeout=30)
        assert g.status_code == 200
        assert g.json()["id"] == pid

        # Cleanup
        d = requests.delete(f"{API}/projects/{pid}", headers=auth_headers, timeout=30)
        assert d.status_code == 200

        # Verify deleted
        g2 = requests.get(f"{API}/projects/{pid}", headers=auth_headers, timeout=30)
        assert g2.status_code == 404
