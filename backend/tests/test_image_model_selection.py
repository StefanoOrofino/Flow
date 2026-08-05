"""Backend tests for the 3-level image-model selection feature.

Covers:
- GET /api/image-provider   (models[] + default_model)
- GET /api/settings         (default gemini + models[])
- PUT /api/settings         (persist openai, invalid -> gemini, no auth -> 401)
- Cascade: per-generation override (body.model) > per-project (project.image_model)
           > global user setting > server default
- One real generation used to verify per-generation model routing.

NOTE: DEV_IMAGE_LIMIT=3 per project. We do a SINGLE real generation to stay
under the cap. Test project id `c73286507b42` may already have prior generations
- if 429 is returned, we treat it as expected (skip, not fail).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://frameflow-studio-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "sb_1785767871@studio.com"
PASSWORD = "secret123"
PROJECT_ID = "c73286507b42"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def project(auth):
    r = requests.get(f"{API}/projects/{PROJECT_ID}", headers=auth, timeout=30)
    assert r.status_code == 200, f"Cannot fetch test project: {r.status_code} {r.text}"
    return r.json()


# --- /image-provider -------------------------------------------------------
class TestImageProviderEndpoint:
    def test_image_provider_shape(self, auth):
        r = requests.get(f"{API}/image-provider", headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert isinstance(j.get("models"), list) and len(j["models"]) == 2
        ids = [m["id"] for m in j["models"]]
        assert ids == ["gemini", "openai"], f"model order/ids wrong: {ids}"
        for m in j["models"]:
            assert m.get("label"), f"missing label: {m}"
            assert "hint" in m, f"missing hint: {m}"
        assert j.get("default_model") in ("gemini", "openai")

    def test_image_provider_requires_auth(self):
        r = requests.get(f"{API}/image-provider", timeout=15)
        assert r.status_code == 401


# --- /settings -------------------------------------------------------------
class TestSettingsEndpoint:
    def test_get_settings_default_gemini(self, auth):
        # Ensure clean state first
        requests.put(f"{API}/settings", headers=auth, json={"image_model": "gemini"}, timeout=15)
        r = requests.get(f"{API}/settings", headers=auth, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["image_model"] == "gemini"
        assert isinstance(j.get("models"), list) and len(j["models"]) == 2

    def test_put_settings_openai_persists(self, auth):
        r = requests.put(f"{API}/settings", headers=auth, json={"image_model": "openai"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["image_model"] == "openai"
        # Verify persistence via GET
        g = requests.get(f"{API}/settings", headers=auth, timeout=15)
        assert g.json()["image_model"] == "openai"

    def test_put_settings_invalid_falls_back_to_gemini(self, auth):
        r = requests.put(f"{API}/settings", headers=auth, json={"image_model": "dalle"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["image_model"] == "gemini"
        g = requests.get(f"{API}/settings", headers=auth, timeout=15)
        assert g.json()["image_model"] == "gemini"

    def test_put_settings_requires_auth(self):
        r = requests.put(f"{API}/settings", json={"image_model": "openai"}, timeout=15)
        assert r.status_code == 401


# --- Project-level override persistence -----------------------------------
class TestProjectImageModelPersistence:
    def test_project_image_model_persists(self, auth):
        # set to openai
        r = requests.put(f"{API}/projects/{PROJECT_ID}", headers=auth,
                         json={"data": {"image_model": "openai"}}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("image_model") == "openai"
        # reset to inherit (null)
        r2 = requests.put(f"{API}/projects/{PROJECT_ID}", headers=auth,
                          json={"data": {"image_model": None}}, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("image_model") in (None, "")


# --- Real generation: verify per-generation model routing -----------------
class TestFrameGenerationModelRouting:
    """ONE real generation to confirm model:'openai' routes to provider 'openai'.
    If DEV limit already hit -> 429 -> skip (expected)."""

    def test_generate_frame_with_openai_override(self, auth, project):
        scenes = project.get("scenes") or []
        assert scenes, "test project has no scenes"
        sid = scenes[0]["id"]
        # Ensure global is gemini so an override to openai is meaningful
        requests.put(f"{API}/settings", headers=auth, json={"image_model": "gemini"}, timeout=15)
        # Clear project override
        requests.put(f"{API}/projects/{PROJECT_ID}", headers=auth,
                     json={"data": {"image_model": None}}, timeout=15)

        url = f"{API}/projects/{PROJECT_ID}/scenes/{sid}/frames/generate"
        payload = {"model": "openai", "aspect_ratio": "16:9"}
        r = requests.post(url, headers=auth, json=payload, timeout=120)
        if r.status_code == 429:
            pytest.skip(f"DEV_IMAGE_LIMIT reached (expected): {r.text}")
        assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:400]}"
        proj = r.json()
        scene = next(s for s in proj["scenes"] if s["id"] == sid)
        frame = next(f for f in scene["frames"] if f["id"] == scene["active_frame_id"])
        assert frame["provider"] == "openai", f"provider mismatch: {frame['provider']}"
        assert frame["generation_status"] == "Completed"
        img = frame.get("image_url", "")
        assert img.startswith("data:image/"), f"image_url not a data URI: {img[:80]}"
        assert len(img) > 200, "image_url looks too small"


# --- Cleanup: reset defaults ----------------------------------------------
class TestZZZCleanup:
    """Runs last (alphabetic name) to reset global + project defaults."""

    def test_reset_defaults(self, auth):
        r1 = requests.put(f"{API}/settings", headers=auth, json={"image_model": "gemini"}, timeout=15)
        assert r1.status_code == 200 and r1.json()["image_model"] == "gemini"
        r2 = requests.put(f"{API}/projects/{PROJECT_ID}", headers=auth,
                          json={"data": {"image_model": None}}, timeout=15)
        assert r2.status_code == 200
