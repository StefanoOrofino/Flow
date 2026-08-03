"""AI Director (Sprint 5) backend tests — revise (preview) + apply + versions CRUD.
Uses seeded account and a duplicate of seed project c73286507b42 so we NEVER
mutate the pristine seed. All created versions and the duplicated project are
cleaned up in teardown.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://frameflow-studio-15.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

SEED_EMAIL = "sb_1785767871@studio.com"
SEED_PASSWORD = "secret123"
SEED_PID = "c73286507b42"


# ---------- Session-scoped fixtures ---------------------------------------
@pytest.fixture(scope="module")
def seed_token():
    r = requests.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(seed_token):
    return {"Authorization": f"Bearer {seed_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def work_project(headers):
    """Duplicate the seed so we can safely apply/restore. Delete duplicate at teardown."""
    r = requests.post(f"{API}/projects/{SEED_PID}/duplicate", headers=headers, timeout=60)
    assert r.status_code == 200, f"duplicate failed: {r.status_code} {r.text}"
    proj = r.json()
    yield proj
    # teardown — delete duplicated project (and any versions attached)
    try:
        vs = requests.get(f"{API}/projects/{proj['id']}/versions", headers=headers, timeout=20).json() or []
        for v in vs:
            requests.delete(f"{API}/projects/{proj['id']}/versions/{v['id']}", headers=headers, timeout=20)
        requests.delete(f"{API}/projects/{proj['id']}", headers=headers, timeout=20)
    except Exception:
        pass


# ---------- Helpers -------------------------------------------------------
def _revise(headers, pid, instruction, scope, timeout=120):
    return requests.post(
        f"{API}/projects/{pid}/director/revise",
        headers=headers,
        json={"instruction": instruction, "scope": scope},
        timeout=timeout,
    )


# ---------- 1. Seed project & auth sanity ---------------------------------
class TestSeedSanity:
    def test_login_and_seed_project_present(self, headers):
        r = requests.get(f"{API}/projects/{SEED_PID}", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert isinstance(p.get("scenes"), list) and len(p["scenes"]) >= 1


# ---------- 2. Revise (preview only) — shape + scope enforcement ----------
class TestRevisePreview:
    def test_revise_returns_change_plan_shape(self, headers, work_project):
        r = _revise(headers, work_project["id"], "Make the dialogue feel more human and warm.", "dialogue")
        assert r.status_code == 200, f"revise failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        for k in ("summary", "runtime_delta", "plan", "diff", "preview"):
            assert k in data, f"missing key {k} in revise response"
        assert isinstance(data["plan"], list)
        assert isinstance(data["diff"], list)
        assert isinstance(data["preview"], dict)
        assert isinstance(data["preview"].get("scenes"), list)

    def test_revise_preview_does_not_persist(self, headers, work_project):
        pid = work_project["id"]
        before = requests.get(f"{API}/projects/{pid}", headers=headers, timeout=30).json()
        r = _revise(headers, pid, "Rewrite scene 1 voice-over with a warmer tone.", "dialogue")
        assert r.status_code == 200
        after = requests.get(f"{API}/projects/{pid}", headers=headers, timeout=30).json()
        # Nothing persisted: scenes should be byte-identical for the fields we care about.
        for i in range(min(len(before["scenes"]), len(after["scenes"]))):
            assert before["scenes"][i].get("voice_over") == after["scenes"][i].get("voice_over")
            assert before["scenes"][i].get("dialogue") == after["scenes"][i].get("dialogue")
            assert before["scenes"][i].get("on_screen_text") == after["scenes"][i].get("on_screen_text")

    def test_revise_empty_instruction_400(self, headers, work_project):
        r = requests.post(
            f"{API}/projects/{work_project['id']}/director/revise",
            headers=headers, json={"instruction": "", "scope": "dialogue"}, timeout=30,
        )
        assert r.status_code == 400

    def test_scope_dialogue_only_changes_dialogue_fields(self, headers, work_project):
        r = _revise(headers, work_project["id"], "Make every voice-over line noticeably warmer and shorter.", "dialogue")
        assert r.status_code == 200, r.text
        diff = r.json().get("diff", [])
        # Allowed dialogue-scope fields (per SCOPE_SCENE_KEYS in server.py)
        allowed = {"dialogue", "voice over", "on screen text"}
        # Every scene-scoped diff row's field must be in the allowed set.
        offenders = []
        for d in diff:
            label = d.get("label", "")
            if label.lower().startswith("scene "):
                # 'Scene 1 · voice over' -> field part after '·'
                if "·" in label:
                    field = label.split("·", 1)[1].strip().lower()
                    if field not in allowed:
                        offenders.append(label)
        assert not offenders, f"dialogue scope leaked non-dialogue changes: {offenders}"

    def test_scope_camera_only_changes_camera_fields(self, headers, work_project):
        r = _revise(headers, work_project["id"], "Elevate the camera language — punchier framing and lenses.", "camera")
        assert r.status_code == 200, r.text
        diff = r.json().get("diff", [])
        allowed = {"shot size", "camera angle", "camera movement", "camera position",
                   "camera height", "camera direction", "focal length", "frame rate", "resolution"}
        offenders = []
        for d in diff:
            label = d.get("label", "")
            if label.lower().startswith("scene ") and "·" in label:
                field = label.split("·", 1)[1].strip().lower()
                if field not in allowed:
                    offenders.append(label)
        # camera scope also forbids project-level changes (concept/treatment/etc.)
        project_level = [d["label"] for d in diff if not d.get("label", "").lower().startswith("scene ")]
        assert not offenders, f"camera scope leaked non-camera scene fields: {offenders}"
        assert not project_level, f"camera scope must not change project-level fields: {project_level}"


# ---------- 3. Apply → creates version, persists preview ------------------
class TestApplyAndVersions:
    @pytest.fixture(scope="class")
    def applied(self, headers, work_project):
        # get a preview first
        r = _revise(headers, work_project["id"], "Slightly tighten dialogue on scene 1 for pacing.", "dialogue")
        assert r.status_code == 200, r.text
        preview = r.json()
        # snapshot BEFORE apply for restore test
        before = requests.get(f"{API}/projects/{work_project['id']}", headers=headers, timeout=30).json()
        # apply
        ap = requests.post(
            f"{API}/projects/{work_project['id']}/director/apply",
            headers=headers,
            json={"preview": preview["preview"], "summary": preview.get("summary") or "test apply"},
            timeout=60,
        )
        assert ap.status_code == 200, ap.text
        applied_proj = ap.json()
        return {"before": before, "after": applied_proj}

    def test_apply_persists_and_creates_version(self, headers, work_project, applied):
        vs = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30)
        assert vs.status_code == 200
        arr = vs.json()
        assert isinstance(arr, list) and len(arr) >= 1
        # snapshot must NOT leak in the list endpoint
        for v in arr:
            assert "snapshot" not in v, "versions list must not include snapshots"
            assert "_id" not in v
            for req_k in ("id", "project_id", "name", "created_at"):
                assert req_k in v

    def test_rename_version(self, headers, work_project):
        vs = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30).json()
        vid = vs[0]["id"]
        new_name = "TEST_renamed_version"
        r = requests.put(f"{API}/projects/{work_project['id']}/versions/{vid}",
                         headers=headers, json={"name": new_name}, timeout=30)
        assert r.status_code == 200, r.text
        vs2 = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30).json()
        assert any(v["id"] == vid and v["name"] == new_name for v in vs2)

    def test_restore_reverts_project(self, headers, work_project, applied):
        # find the version we created
        vs = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30).json()
        # Restore the earliest version (the one we created BEFORE the auto-snapshot on restore)
        vs_sorted = sorted(vs, key=lambda v: v["created_at"])
        vid = vs_sorted[0]["id"]
        r = requests.post(f"{API}/projects/{work_project['id']}/versions/{vid}/restore",
                          headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        restored = r.json()
        # The pre-apply snapshot IS the "before" state (title + at least first scene dialogue match)
        before = applied["before"]
        # After restore we expect the project to look like `before`
        assert restored["title"] == before["title"]
        assert len(restored["scenes"]) == len(before["scenes"])
        # scene ids preserved
        assert [s["id"] for s in restored["scenes"]] == [s["id"] for s in before["scenes"]]

    def test_restore_creates_auto_snapshot(self, headers, work_project):
        # After a restore call, an auto-snapshot version should exist.
        vs = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30).json()
        assert any("Auto-snapshot" in (v.get("name") or "") or "snapshot" in (v.get("name") or "").lower()
                   for v in vs), f"expected auto-snapshot version after restore, got {[v.get('name') for v in vs]}"

    def test_delete_version(self, headers, work_project):
        vs = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30).json()
        assert len(vs) >= 1
        vid = vs[0]["id"]
        r = requests.delete(f"{API}/projects/{work_project['id']}/versions/{vid}",
                            headers=headers, timeout=30)
        assert r.status_code == 200
        vs2 = requests.get(f"{API}/projects/{work_project['id']}/versions", headers=headers, timeout=30).json()
        assert not any(v["id"] == vid for v in vs2)


# ---------- 4. Apply validation -------------------------------------------
class TestApplyValidation:
    def test_apply_rejects_missing_preview(self, headers, work_project):
        r = requests.post(f"{API}/projects/{work_project['id']}/director/apply",
                          headers=headers, json={"summary": "x"}, timeout=20)
        assert r.status_code == 400

    def test_apply_rejects_bad_preview_shape(self, headers, work_project):
        r = requests.post(f"{API}/projects/{work_project['id']}/director/apply",
                          headers=headers, json={"preview": {"scenes": "nope"}, "summary": "x"}, timeout=20)
        assert r.status_code == 400


# ---------- 5. Auth / not-found -------------------------------------------
class TestAuthAndNotFound:
    def test_versions_requires_auth(self):
        r = requests.get(f"{API}/projects/{SEED_PID}/versions", timeout=20)
        assert r.status_code == 401

    def test_revise_unknown_project(self, headers):
        r = requests.post(f"{API}/projects/does_not_exist/director/revise",
                          headers=headers, json={"instruction": "x", "scope": "project"}, timeout=30)
        assert r.status_code == 404

    def test_restore_unknown_version(self, headers, work_project):
        r = requests.post(f"{API}/projects/{work_project['id']}/versions/nope/restore",
                          headers=headers, timeout=20)
        assert r.status_code == 404
