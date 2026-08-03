import uuid
import requests
import pytest


# ==== Health ====
def test_root(api):
    r = requests.get(f"{api}/", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["message"] == "Storyboard AI API"
    assert j["mock_mode"] is False


# ==== Auth ====
class TestAuth:
    def test_register_duplicate_email_rejected(self, api, user_a):
        r = requests.post(f"{api}/auth/register", json={"email": user_a["email"], "password": "x1234567"}, timeout=15)
        assert r.status_code == 400

    def test_login_success(self, api, user_a):
        r = requests.post(f"{api}/auth/login", json={"email": user_a["email"], "password": user_a["password"]}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "token" in j and "user" in j
        assert j["user"]["email"] == user_a["email"]

    def test_login_wrong_password(self, api, user_a):
        r = requests.post(f"{api}/auth/login", json={"email": user_a["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_valid_token(self, api, auth_headers_a, user_a):
        r = requests.get(f"{api}/auth/me", headers=auth_headers_a, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == user_a["email"]

    def test_me_without_token(self, api):
        r = requests.get(f"{api}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_bad_token(self, api):
        r = requests.get(f"{api}/auth/me", headers={"Authorization": "Bearer badtoken"}, timeout=15)
        assert r.status_code == 401

    def test_password_reset_flow(self, api):
        # register a throwaway user
        email = f"reset_{uuid.uuid4().hex[:8]}@storyboard.ai"
        requests.post(f"{api}/auth/register", json={"email": email, "password": "orig1234"}, timeout=15)

        r = requests.post(f"{api}/auth/password-reset/request", json={"email": email}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True
        token = j.get("dev_token")
        assert token, "dev_token missing in response"

        r2 = requests.post(f"{api}/auth/password-reset/confirm",
                           json={"token": token, "new_password": "newpass1234"}, timeout=15)
        assert r2.status_code == 200

        # Old password must fail
        r3 = requests.post(f"{api}/auth/login", json={"email": email, "password": "orig1234"}, timeout=15)
        assert r3.status_code == 401
        # New password works
        r4 = requests.post(f"{api}/auth/login", json={"email": email, "password": "newpass1234"}, timeout=15)
        assert r4.status_code == 200

    def test_reset_request_unknown_email_returns_ok(self, api):
        # Should not leak existence
        r = requests.post(f"{api}/auth/password-reset/request",
                          json={"email": f"noone_{uuid.uuid4().hex[:6]}@x.com"}, timeout=15)
        assert r.status_code == 200


# ==== Templates ====
class TestTemplates:
    def test_templates_require_auth(self, api):
        r = requests.get(f"{api}/templates", timeout=15)
        assert r.status_code == 401

    def test_templates_returns_twelve_categorized(self, api, auth_headers_a):
        r = requests.get(f"{api}/templates", headers=auth_headers_a, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) == 12
        for t in arr:
            for k in ("id", "name", "category", "video_type", "duration", "num_scenes"):
                assert k in t, f"template missing {k}: {t}"
        # ensure diverse categories
        cats = {t["category"] for t in arr}
        assert len(cats) >= 8, f"too few categories: {cats}"


# ==== Projects CRUD + Ownership ====
class TestProjectsCRUD:
    def test_create_project_defaults(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects", headers=auth_headers_a, json={"title": "TEST_Proj_1"}, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["title"] == "TEST_Proj_1"
        assert p["status"] == "draft"
        assert p["scenes"] == []
        assert "id" in p
        assert "_id" not in p
        pytest.proj_a_id = p["id"]

    def test_list_projects_only_own(self, api, auth_headers_a, auth_headers_b, user_a, user_b):
        # user B creates its own project
        rb = requests.post(f"{api}/projects", headers=auth_headers_b, json={"title": "TEST_Proj_B"}, timeout=15)
        assert rb.status_code == 200
        pb_id = rb.json()["id"]

        ra = requests.get(f"{api}/projects", headers=auth_headers_a, timeout=15)
        assert ra.status_code == 200
        ids_a = [p["id"] for p in ra.json()]
        assert pb_id not in ids_a, "Ownership isolation broken — user A sees user B's projects"
        assert pytest.proj_a_id in ids_a

    def test_get_project_forbidden_for_other_user(self, api, auth_headers_b):
        r = requests.get(f"{api}/projects/{pytest.proj_a_id}", headers=auth_headers_b, timeout=15)
        assert r.status_code == 404

    def test_autosave_update(self, api, auth_headers_a):
        payload = {"data": {"description": "updated desc", "num_scenes": 3, "notes": "TEST_note"}}
        r = requests.put(f"{api}/projects/{pytest.proj_a_id}", headers=auth_headers_a, json=payload, timeout=15)
        assert r.status_code == 200
        # verify via GET
        rg = requests.get(f"{api}/projects/{pytest.proj_a_id}", headers=auth_headers_a, timeout=15)
        assert rg.status_code == 200
        got = rg.json()
        assert got["description"] == "updated desc"
        assert got["num_scenes"] == 3
        assert got["notes"] == "TEST_note"

    def test_update_ignores_user_id_and_id(self, api, auth_headers_a):
        r = requests.put(f"{api}/projects/{pytest.proj_a_id}", headers=auth_headers_a,
                         json={"data": {"user_id": "hacker", "id": "newid", "title": "TEST_Renamed"}}, timeout=15)
        assert r.status_code == 200
        got = r.json()
        assert got["id"] == pytest.proj_a_id
        assert got["title"] == "TEST_Renamed"

    def test_duplicate_project(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects/{pytest.proj_a_id}/duplicate", headers=auth_headers_a, timeout=15)
        assert r.status_code == 200
        dup = r.json()
        assert dup["id"] != pytest.proj_a_id
        assert dup["title"].endswith("(Copy)")
        pytest.dup_id = dup["id"]

    def test_delete_project_and_verify_404(self, api, auth_headers_a):
        r = requests.delete(f"{api}/projects/{pytest.dup_id}", headers=auth_headers_a, timeout=15)
        assert r.status_code == 200
        rg = requests.get(f"{api}/projects/{pytest.dup_id}", headers=auth_headers_a, timeout=15)
        assert rg.status_code == 404


# ==== Generation (real AI) ====
class TestGeneration:
    def test_generate_returns_full_package(self, api, auth_headers_a):
        # Create fresh project for generation
        r = requests.post(f"{api}/projects", headers=auth_headers_a,
                          json={"title": "TEST_Gen", "description": "A dramatic short about a lighthouse keeper.",
                                "num_scenes": 3, "visual_style": "Cinematic", "tone": "Dramatic"}, timeout=15)
        assert r.status_code == 200
        pid = r.json()["id"]
        pytest.gen_pid = pid

        r2 = requests.post(f"{api}/projects/{pid}/generate", headers=auth_headers_a, timeout=180)
        assert r2.status_code == 200, r2.text
        p = r2.json()
        assert p["status"] == "generated"
        for k in ("concept", "treatment", "visual_direction", "script"):
            assert p.get(k), f"missing {k}"
        scenes = p.get("scenes", [])
        assert len(scenes) == 3, f"expected 3 scenes got {len(scenes)}"
        for s in scenes:
            for f in ("id", "scene_number", "title", "shot_size", "camera_angle",
                      "camera_movement", "focal_length", "image_prompt", "visual_description"):
                assert f in s and s[f] != "" or f in ("dialogue", "voice_over"), f"scene missing {f}: {s}"
        pytest.gen_scene_id = scenes[0]["id"]
        # log mock mode for context
        pytest.gen_mock = p.get("mock_mode", None)

    def test_regenerate_scene(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects/{pytest.gen_pid}/scenes/{pytest.gen_scene_id}/regenerate",
                          headers=auth_headers_a, timeout=120)
        assert r.status_code == 200, r.text
        p = r.json()
        scene = next(s for s in p["scenes"] if s["id"] == pytest.gen_scene_id)
        assert scene["visual_description"]
        assert scene["image_prompt"]

    def test_regenerate_image_prompt(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects/{pytest.gen_pid}/scenes/{pytest.gen_scene_id}/regenerate-image-prompt",
                          headers=auth_headers_a, timeout=120)
        assert r.status_code == 200, r.text
        p = r.json()
        scene = next(s for s in p["scenes"] if s["id"] == pytest.gen_scene_id)
        assert scene["image_prompt"]

    def test_regenerate_unknown_scene_404(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects/{pytest.gen_pid}/scenes/deadbeef/regenerate",
                          headers=auth_headers_a, timeout=30)
        assert r.status_code == 404


# ==== Cleanup ====
def test_zzz_cleanup(api, auth_headers_a):
    # delete all TEST_ projects for user A
    r = requests.get(f"{api}/projects", headers=auth_headers_a, timeout=15)
    for p in r.json():
        if p.get("title", "").startswith("TEST_"):
            requests.delete(f"{api}/projects/{p['id']}", headers=auth_headers_a, timeout=15)
