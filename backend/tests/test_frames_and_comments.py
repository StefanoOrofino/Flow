"""
Sprint 2 backend tests:
- Provider-agnostic image frame endpoints (mock provider)
- Persistence of scene.comment_list and scene.frames across autosave PUT and scene regenerate
"""
import uuid
import requests
import pytest


# ---------- helpers ----------
def _make_generated_project(api, headers):
    r = requests.post(f"{api}/projects", headers=headers,
                      json={"title": "TEST_Frames", "goal": "frames + comments test",
                            "num_scenes": 3}, timeout=15)
    assert r.status_code == 200
    pid = r.json()["id"]
    g = requests.post(f"{api}/projects/{pid}/generate", headers=headers, timeout=180)
    assert g.status_code == 200, g.text
    scenes = g.json()["scenes"]
    assert len(scenes) >= 1
    return pid, scenes[0]["id"], scenes


# ---------- provider ----------
class TestImageProvider:
    def test_image_provider_endpoint(self, api, auth_headers_a):
        r = requests.get(f"{api}/image-provider", headers=auth_headers_a, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["provider"] == "mock"
        assert j["configured"] is True

    def test_image_provider_requires_auth(self, api):
        r = requests.get(f"{api}/image-provider", timeout=15)
        assert r.status_code == 401


# ---------- frame CRUD ----------
class TestFrames:
    def test_full_frame_lifecycle(self, api, auth_headers_a):
        pid, sid, _ = _make_generated_project(api, auth_headers_a)
        pytest.f_pid = pid
        pytest.f_sid = sid

        # 1. Generate first frame (v1)
        r1 = requests.post(f"{api}/projects/{pid}/scenes/{sid}/frames/generate",
                           headers=auth_headers_a, json={"prompt": "test prompt v1"}, timeout=30)
        assert r1.status_code == 200, r1.text
        p1 = r1.json()
        scene1 = next(s for s in p1["scenes"] if s["id"] == sid)
        frames1 = scene1.get("frames", [])
        assert len(frames1) == 1
        f1 = frames1[0]
        assert f1["generation_status"] == "Completed"
        assert f1["image_url"].startswith("data:image/svg+xml;base64,")
        assert f1["version"] == 1
        assert scene1["active_frame_id"] == f1["id"]
        pytest.f_v1_id = f1["id"]

        # 2. Regenerate → v2
        r2 = requests.post(f"{api}/projects/{pid}/scenes/{sid}/frames/{f1['id']}/regenerate",
                           headers=auth_headers_a, json={"prompt": "test prompt v2"}, timeout=30)
        assert r2.status_code == 200, r2.text
        scene2 = next(s for s in r2.json()["scenes"] if s["id"] == sid)
        frames2 = scene2["frames"]
        assert len(frames2) == 2
        f2 = frames2[-1]
        assert f2["version"] == 2
        assert f2["id"] != f1["id"]
        assert scene2["active_frame_id"] == f2["id"]
        pytest.f_v2_id = f2["id"]

        # 3. Generate again (fresh) → v3, both coexist
        r3 = requests.post(f"{api}/projects/{pid}/scenes/{sid}/frames/generate",
                           headers=auth_headers_a, json={"prompt": "test prompt v3"}, timeout=30)
        assert r3.status_code == 200
        scene3 = next(s for s in r3.json()["scenes"] if s["id"] == sid)
        frames3 = scene3["frames"]
        assert len(frames3) == 3
        versions = sorted([f["version"] for f in frames3])
        assert versions == [1, 2, 3]
        pytest.f_v3_id = frames3[-1]["id"]

        # 4. Set active back to v1
        r4 = requests.post(f"{api}/projects/{pid}/scenes/{sid}/frames/{pytest.f_v1_id}/active",
                           headers=auth_headers_a, timeout=15)
        assert r4.status_code == 200
        scene4 = next(s for s in r4.json()["scenes"] if s["id"] == sid)
        assert scene4["active_frame_id"] == pytest.f_v1_id
        assert scene4["image_url"] == next(f for f in scene4["frames"] if f["id"] == pytest.f_v1_id)["image_url"]

        # 5. Status endpoint
        rs = requests.get(f"{api}/projects/{pid}/scenes/{sid}/frames/{pytest.f_v1_id}/status",
                          headers=auth_headers_a, timeout=15)
        assert rs.status_code == 200
        assert rs.json()["status"] == "Completed"

        # 6. Delete active frame (v1) → active reassigned
        rd = requests.delete(f"{api}/projects/{pid}/scenes/{sid}/frames/{pytest.f_v1_id}",
                             headers=auth_headers_a, timeout=15)
        assert rd.status_code == 200
        scene5 = next(s for s in rd.json()["scenes"] if s["id"] == sid)
        assert len(scene5["frames"]) == 2
        assert scene5["active_frame_id"] != pytest.f_v1_id
        assert scene5["active_frame_id"] != ""

        # 7. Delete all remaining frames → active clears
        for fid in [pytest.f_v2_id, pytest.f_v3_id]:
            requests.delete(f"{api}/projects/{pid}/scenes/{sid}/frames/{fid}",
                            headers=auth_headers_a, timeout=15)
        final = requests.get(f"{api}/projects/{pid}", headers=auth_headers_a, timeout=15).json()
        scene6 = next(s for s in final["scenes"] if s["id"] == sid)
        assert scene6["frames"] == []
        assert scene6["active_frame_id"] == ""

    def test_generate_frame_unknown_scene_404(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects/{pytest.f_pid}/scenes/deadbeef/frames/generate",
                          headers=auth_headers_a, json={"prompt": "x"}, timeout=15)
        assert r.status_code == 404

    def test_regenerate_unknown_frame_404(self, api, auth_headers_a):
        r = requests.post(f"{api}/projects/{pytest.f_pid}/scenes/{pytest.f_sid}/frames/nope/regenerate",
                          headers=auth_headers_a, json={"prompt": "x"}, timeout=15)
        assert r.status_code == 404

    def test_delete_unknown_frame_removes_nothing(self, api, auth_headers_a):
        # backend delete is idempotent (filters); should still 200
        r = requests.delete(f"{api}/projects/{pytest.f_pid}/scenes/{pytest.f_sid}/frames/nope",
                            headers=auth_headers_a, timeout=15)
        # Either 200 (idempotent) or 404 acceptable; document actual
        assert r.status_code in (200, 404)


# ---------- persistence across autosave + regenerate ----------
class TestPersistence:
    def test_comment_list_and_frames_survive_autosave(self, api, auth_headers_a):
        pid, sid, scenes = _make_generated_project(api, auth_headers_a)

        # Generate a frame
        rg = requests.post(f"{api}/projects/{pid}/scenes/{sid}/frames/generate",
                           headers=auth_headers_a, json={"prompt": "persist test"}, timeout=30)
        assert rg.status_code == 200
        frames_before = next(s for s in rg.json()["scenes"] if s["id"] == sid)["frames"]
        assert len(frames_before) == 1

        # Fetch fresh, mutate scene by adding a comment_list, PUT autosave
        current = requests.get(f"{api}/projects/{pid}", headers=auth_headers_a, timeout=15).json()
        new_scenes = []
        for s in current["scenes"]:
            copy = dict(s)
            if s["id"] == sid:
                copy["comment_list"] = [{
                    "id": "cmt_" + uuid.uuid4().hex[:8],
                    "author": "Tester",
                    "author_id": "test",
                    "text": "TEST_COMMENT_persist",
                    "status": "Open",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                }]
            new_scenes.append(copy)

        r_put = requests.put(f"{api}/projects/{pid}", headers=auth_headers_a,
                             json={"data": {"scenes": new_scenes}}, timeout=15)
        assert r_put.status_code == 200

        # Verify both frames AND comment_list survived
        rget = requests.get(f"{api}/projects/{pid}", headers=auth_headers_a, timeout=15).json()
        scene = next(s for s in rget["scenes"] if s["id"] == sid)
        assert len(scene.get("frames", [])) == 1, "frames were lost on autosave PUT"
        assert scene["active_frame_id"] != ""
        assert len(scene.get("comment_list", [])) == 1
        assert scene["comment_list"][0]["text"] == "TEST_COMMENT_persist"

        # Now regenerate the scene and verify both survive
        r_regen = requests.post(f"{api}/projects/{pid}/scenes/{sid}/regenerate",
                                headers=auth_headers_a, timeout=120)
        assert r_regen.status_code == 200
        scene_after = next(s for s in r_regen.json()["scenes"] if s["id"] == sid)
        assert len(scene_after.get("frames", [])) == 1, "frames were lost on scene regen"
        assert scene_after["active_frame_id"] != ""
        assert len(scene_after.get("comment_list", [])) == 1, "comment_list lost on scene regen"
        assert scene_after["comment_list"][0]["text"] == "TEST_COMMENT_persist"


# ---------- cleanup ----------
def test_zzz_cleanup_frames(api, auth_headers_a):
    r = requests.get(f"{api}/projects", headers=auth_headers_a, timeout=15)
    for p in r.json():
        if p.get("title", "").startswith("TEST_"):
            requests.delete(f"{api}/projects/{p['id']}", headers=auth_headers_a, timeout=15)
