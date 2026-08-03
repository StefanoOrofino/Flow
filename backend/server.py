import os
import re
import json
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
import jwt
import bcrypt
import httpx

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("storyboard")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
AI_PROVIDER = os.environ.get('AI_PROVIDER', 'openai')
AI_MODEL = os.environ.get('AI_MODEL', 'gpt-5.4')
MOCK_MODE = not bool(EMERGENT_LLM_KEY)

app = FastAPI()
api_router = APIRouter(prefix="/api")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class ResetRequestIn(BaseModel):
    email: EmailStr


class ResetConfirmIn(BaseModel):
    token: str
    new_password: str


class ProjectIn(BaseModel):
    # Step 1 — Project
    title: str = "Untitled Project"
    client: str = ""
    campaign: str = ""
    goal: str = ""
    target_audience: str = ""
    brand: str = ""
    language: str = "English"
    # Step 2 — Video
    video_type: str = "Commercial"
    platform: str = "YouTube"
    duration: str = "30 seconds"
    aspect_ratio: str = "16:9"
    crew_size: str = "Small professional crew"
    budget: str = ""
    location_type: str = ""
    num_actors: str = ""
    num_scenes: int = 5
    # Step 3 — Creative Direction
    mood: str = "Premium"
    visual_style: str = "Cinematic"
    camera_style: str = "Steady & composed"
    lighting_style: str = "Natural"
    editing_style: str = "Rhythmic"
    music_style: str = "Ambient score"
    director_references: str = ""
    film_references: str = ""
    # Step 4 — Advanced
    deliverables: str = ""
    special_requests: str = ""
    restrictions: str = ""
    extra_notes: str = ""


class ProjectUpdate(BaseModel):
    data: dict


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    user = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    except Exception:
        user = None
    if user is None:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def public_user(u: dict) -> dict:
    return {"user_id": u["user_id"], "email": u.get("email"), "name": u.get("name", ""), "picture": u.get("picture")}


@api_router.post("/auth/register")
async def register(body: RegisterIn):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": body.email.lower(),
        "name": body.name or body.email.split("@")[0],
        "password_hash": hash_pw(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    return {"token": make_token(user["user_id"]), "user": public_user(user)}


@api_router.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("password_hash") or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": make_token(user["user_id"]), "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": public_user(user)}


@api_router.post("/auth/password-reset/request")
async def reset_request(body: ResetRequestIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        return {"ok": True}
    token = uuid.uuid4().hex
    await db.password_resets.insert_one({
        "token": token, "user_id": user["user_id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
    })
    logger.info(f"[DEV] Password reset token for {body.email}: {token}")
    return {"ok": True, "dev_token": token}


@api_router.post("/auth/password-reset/confirm")
async def reset_confirm(body: ResetConfirmIn):
    rec = await db.password_resets.find_one({"token": body.token})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    exp = datetime.fromisoformat(rec["expires_at"])
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_pw(body.new_password)}})
    await db.password_resets.delete_many({"user_id": rec["user_id"]})
    return {"ok": True}


@api_router.post("/auth/session")
async def google_session(body: SessionIn):
    async with httpx.AsyncClient() as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data.get("email", "").lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data.get("name", ""),
            "picture": data.get("picture"), "created_at": now_iso(),
        })
    session_token = data.get("session_token")
    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso(),
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "token": session_token, "user": public_user(user)}


SHOT_SIZES = ["Extreme wide shot", "Wide shot", "Full shot", "Medium shot", "Medium close-up",
              "Close-up", "Extreme close-up", "Insert shot", "Detail shot", "Over-the-shoulder shot"]
CAMERA_MOVES = ["Static", "Pan", "Tilt", "Dolly in", "Dolly out", "Tracking", "Handheld",
                "Gimbal", "Crane", "Drone", "FPV drone", "Orbit", "Zoom"]

SCENE_FIELDS = ["title", "duration", "location", "time_of_day", "characters", "visual_description",
                "narrative", "subject_action", "dialogue", "voice_over", "on_screen_text", "shot_size",
                "camera_angle", "camera_movement", "focal_length", "camera_position", "lighting", "color_palette",
                "sound_notes", "transition", "frame_rate", "resolution", "equipment", "estimated_time",
                "crew_notes", "director_notes", "production_notes", "image_prompt"]


def build_prompt(p: dict) -> str:
    n = min(12, max(6, int(p.get('num_scenes') or 6)))
    return f"""You are an award-winning film director and line producer building a complete professional pre-production package for a real production. Think like software used by production companies — precise, structured, production-ready.

CREATIVE BRIEF:
- Project: {p.get('title')} | Client: {p.get('client')} | Campaign: {p.get('campaign')} | Brand: {p.get('brand')}
- Goal: {p.get('goal')} | Audience: {p.get('target_audience')} | Language: {p.get('language')}
- Video type: {p.get('video_type')} | Platform: {p.get('platform')} | Duration: {p.get('duration')} | Aspect: {p.get('aspect_ratio')}
- Crew size: {p.get('crew_size')} | Budget: {p.get('budget')} | Location: {p.get('location_type')} | Actors: {p.get('num_actors')}
- Mood: {p.get('mood')} | Visual style: {p.get('visual_style')} | Camera: {p.get('camera_style')} | Lighting: {p.get('lighting_style')} | Editing: {p.get('editing_style')} | Music: {p.get('music_style')}
- Director references: {p.get('director_references')} | Film references: {p.get('film_references')}
- Deliverables: {p.get('deliverables')} | Special requests: {p.get('special_requests')} | Restrictions: {p.get('restrictions')} | Notes: {p.get('extra_notes')}

Respond with ONLY valid JSON (no markdown) matching EXACTLY this schema:
{{
 "concept": {{
   "elevator_pitch": "", "campaign_goal": "", "audience": "", "emotional_tone": "", "core_message": "", "call_to_action": ""
 }},
 "treatment": {{
   "visual_language": "", "narrative_style": "", "camera_philosophy": "", "lighting_philosophy": "",
   "color_palette": "", "editing_rhythm": "", "sound_design": ""
 }},
 "scenes": [{{
   "scene_number": 1, "title": "", "duration": "5s", "location": "", "time_of_day": "", "characters": "",
   "visual_description": "", "narrative": "the beat/story of this scene in prose", "subject_action": "",
   "dialogue": "", "voice_over": "", "on_screen_text": "", "shot_size": "one of {SHOT_SIZES}",
   "camera_angle": "e.g. Eye level/Low angle", "camera_movement": "one of {CAMERA_MOVES}",
   "camera_position": "physical camera placement", "focal_length": "e.g. 35mm", "lighting": "lighting setup",
   "color_palette": "color mood", "sound_notes": "audio notes", "transition": "e.g. Cut/Fade",
   "frame_rate": "e.g. 24fps", "resolution": "e.g. 4K", "equipment": "camera + support + key gear for this shot",
   "estimated_time": "setup+shoot estimate e.g. 45 min", "crew_notes": "", "director_notes": "creative intent",
   "production_notes": "logistics/risks", "image_prompt": "rich AI image prompt with style, lens, lighting, mood, composition"
 }}],
 "equipment": {{ "camera": "", "lens": "", "drone": "", "gimbal": "", "tripod": "", "lighting": "", "audio": "", "accessories": "" }},
 "crew": {{ "crew_size": "recommended total", "director": "", "producer": "", "dp": "", "camera_operator": "", "focus_puller": "", "gaffer": "", "sound": "", "drone_pilot": "", "production_assistant": "" }},
 "schedule": {{ "recommendation": "Half Day | One Day | Two Days", "estimated_hours": "e.g. 8-10 hours", "breakdown": "prep/shoot/wrap notes" }},
 "budget": {{ "low": "$X - $Y range", "medium": "$X - $Y range", "commercial": "$X - $Y range", "premium": "$X - $Y range", "notes": "what drives the cost" }}
}}

Create EXACTLY {n} scenes (between 6 and 12). Tailor equipment/crew/schedule/budget to the '{p.get('crew_size')}' production level and '{p.get('duration')}' duration. Fill every field with concrete, professional content. No placeholders."""


def mock_output(p: dict) -> dict:
    n = min(12, max(6, int(p.get("num_scenes") or 6)))
    scenes = []
    for i in range(1, n + 1):
        scenes.append({
            "scene_number": i, "title": f"[MOCK] Scene {i}", "duration": "5s",
            "location": p.get("location_type") or "Studio", "time_of_day": "Day",
            "characters": p.get("num_actors") or "Lead talent",
            "visual_description": f"[MOCK DATA] Visual description for scene {i} of {p.get('title')}.",
            "narrative": "The story beat for this scene.", "subject_action": "Subject performs the key action.",
            "dialogue": "", "voice_over": "Voice-over line placeholder.", "on_screen_text": p.get("goal", ""),
            "shot_size": SHOT_SIZES[i % len(SHOT_SIZES)], "camera_angle": "Eye level",
            "camera_movement": CAMERA_MOVES[i % len(CAMERA_MOVES)], "camera_position": "3/4 front, waist height",
            "focal_length": "35mm", "lighting": "Soft key light with rim.",
            "color_palette": p.get("visual_style", "Neutral"), "sound_notes": "Ambient score.", "transition": "Cut",
            "frame_rate": "24fps", "resolution": "4K", "equipment": "Cinema camera, gimbal, key light",
            "estimated_time": "45 min", "crew_notes": "1 DP, 1 gaffer", "director_notes": "Keep it intimate.",
            "production_notes": "Confirm location permit.",
            "image_prompt": f"[MOCK] Cinematic {p.get('visual_style')} frame, {p.get('mood')} mood, scene {i}.",
        })
    return {
        "concept": {"elevator_pitch": f"[MOCK] Elevator pitch for {p.get('title')}.",
                    "campaign_goal": p.get("goal", ""), "audience": p.get("target_audience", ""),
                    "emotional_tone": p.get("mood", ""), "core_message": "[MOCK] Core message.",
                    "call_to_action": "[MOCK] Call to action."},
        "treatment": {"visual_language": "[MOCK] Visual language.", "narrative_style": "[MOCK] Narrative style.",
                      "camera_philosophy": "[MOCK] Camera philosophy.", "lighting_philosophy": "[MOCK] Lighting philosophy.",
                      "color_palette": "[MOCK] Color palette.", "editing_rhythm": "[MOCK] Editing rhythm.",
                      "sound_design": "[MOCK] Sound design direction."},
        "scenes": scenes,
        "equipment": {"camera": "Sony FX6", "lens": "24-70mm f/2.8, 85mm prime", "drone": "DJI Mavic 3 Cine",
                      "gimbal": "DJI RS 3 Pro", "tripod": "Sachtler fluid head", "lighting": "2x Aputure 600d, softboxes",
                      "audio": "Sennheiser MKH 416 + lav", "accessories": "V-mount batteries, matte box, ND filters"},
        "crew": {"crew_size": "6-8", "director": "1", "producer": "1", "dp": "1", "camera_operator": "1",
                 "focus_puller": "1", "gaffer": "1", "sound": "1", "drone_pilot": "0-1", "production_assistant": "1-2"},
        "schedule": {"recommendation": "One Day", "estimated_hours": "8-10 hours",
                     "breakdown": "2h prep/lighting, 6h shoot, 1h wrap."},
        "budget": {"low": "$1,500 - $4,000", "medium": "$5,000 - $15,000", "commercial": "$20,000 - $60,000",
                   "premium": "$75,000 - $250,000+", "notes": "Driven by crew size, locations and post."},
    }


def parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in AI response")
    return json.loads(text[start:end + 1])


async def ai_generate(p: dict) -> dict:
    if MOCK_MODE:
        logger.warning("MOCK MODE active — no EMERGENT_LLM_KEY configured")
        return mock_output(p)
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"gen_{uuid.uuid4().hex[:8]}",
                   system_message="You are a professional film director. Always respond with valid JSON only."
                   ).with_model(AI_PROVIDER, AI_MODEL)
    resp = await chat.send_message(UserMessage(text=build_prompt(p)))
    data = parse_json(resp if isinstance(resp, str) else str(resp))
    if not isinstance(data.get("scenes"), list) or len(data["scenes"]) == 0:
        raise ValueError("AI response missing scenes")
    return data


def normalize_scene(s: dict, idx: int) -> dict:
    out = {"id": s.get("id") or uuid.uuid4().hex[:10], "scene_number": s.get("scene_number", idx + 1)}
    for f in SCENE_FIELDS:
        out[f] = str(s.get(f, "") or "")
    return out


@api_router.get("/projects")
async def list_projects(user=Depends(get_current_user)):
    return await db.projects.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)


@api_router.post("/projects")
async def create_project(body: ProjectIn, user=Depends(get_current_user)):
    doc = body.dict()
    doc.update({"id": uuid.uuid4().hex[:12], "user_id": user["user_id"], "status": "draft",
                "concept": {}, "treatment": {}, "equipment": {}, "crew": {}, "schedule": {}, "budget": {},
                "scenes": [], "favorite": False, "archived": False, "export_count": 0,
                "created_at": now_iso(), "updated_at": now_iso()})
    await db.projects.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


async def _get_owned(pid: str, user: dict) -> dict:
    doc = await db.projects.find_one({"id": pid, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc


@api_router.get("/projects/{pid}")
async def get_project(pid: str, user=Depends(get_current_user)):
    return await _get_owned(pid, user)


@api_router.put("/projects/{pid}")
async def update_project(pid: str, body: ProjectUpdate, user=Depends(get_current_user)):
    await _get_owned(pid, user)
    data = dict(body.data)
    for k in ("id", "user_id", "_id"):
        data.pop(k, None)
    data["updated_at"] = now_iso()
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]}, {"$set": data})
    return await _get_owned(pid, user)


@api_router.delete("/projects/{pid}")
async def delete_project(pid: str, user=Depends(get_current_user)):
    await _get_owned(pid, user)
    await db.projects.delete_one({"id": pid, "user_id": user["user_id"]})
    return {"ok": True}


@api_router.post("/projects/{pid}/duplicate")
async def duplicate_project(pid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    doc["id"] = uuid.uuid4().hex[:12]
    doc["title"] = doc.get("title", "Project") + " (Copy)"
    doc["favorite"] = False
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.projects.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.post("/projects/{pid}/exported")
async def mark_exported(pid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]},
                                 {"$set": {"export_count": (doc.get("export_count") or 0) + 1}})
    return {"ok": True}


@api_router.post("/projects/{pid}/generate")
async def generate(pid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    used_mock = MOCK_MODE
    try:
        data = await ai_generate(doc)
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning(f"AI schema error, using mock fallback: {e}")
        data = mock_output(doc)
        used_mock = True
    except Exception as e:
        logger.warning(f"AI generation failed, using mock fallback: {e}")
        data = mock_output(doc)
        used_mock = True
    scenes = [normalize_scene(s, i) for i, s in enumerate(data.get("scenes", []))]
    update = {"concept": data.get("concept", {}), "treatment": data.get("treatment", {}),
              "equipment": data.get("equipment", {}), "crew": data.get("crew", {}),
              "schedule": data.get("schedule", {}), "budget": data.get("budget", {}),
              "scenes": scenes, "status": "generated", "mock_mode": used_mock, "updated_at": now_iso()}
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]}, {"$set": update})
    return await _get_owned(pid, user)


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate")
async def regenerate_scene(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    if MOCK_MODE:
        new_scene = mock_output(doc)["scenes"][0]
        new_scene["id"] = sid
        new_scene["scene_number"] = scene.get("scene_number")
    else:
        prompt = build_prompt(doc) + f"\n\nOnly regenerate scene number {scene.get('scene_number')}. Return JSON with a single-element 'scenes' array for just that scene."
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"re_{uuid.uuid4().hex[:8]}",
                       system_message="Respond with valid JSON only.").with_model(AI_PROVIDER, AI_MODEL)
        try:
            resp = await chat.send_message(UserMessage(text=prompt))
            data = parse_json(resp if isinstance(resp, str) else str(resp))
            new_scene = normalize_scene(data["scenes"][0], scene.get("scene_number", 1) - 1)
            new_scene["id"] = sid
            new_scene["scene_number"] = scene.get("scene_number")
        except Exception as e:
            logger.warning(f"Scene regen failed, mock fallback: {e}")
            new_scene = mock_output(doc)["scenes"][0]
            new_scene["id"] = sid
            new_scene["scene_number"] = scene.get("scene_number")
    scenes = [new_scene if s.get("id") == sid else s for s in doc["scenes"]]
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]},
                                 {"$set": {"scenes": scenes, "updated_at": now_iso()}})
    return await _get_owned(pid, user)


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate-image-prompt")
async def regenerate_image_prompt(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    if MOCK_MODE:
        prompt_text = f"[MOCK] Regenerated cinematic prompt for scene {scene.get('scene_number')}."
    else:
        q = (f"Write ONE vivid, detailed AI image-generation prompt (plain text, no JSON) for this film frame. "
             f"Style: {doc.get('visual_style')}, mood: {doc.get('mood')}. Scene: {scene.get('visual_description')}. "
             f"Shot: {scene.get('shot_size')}, {scene.get('camera_angle')}, {scene.get('focal_length')}, lighting: {scene.get('lighting')}.")
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"ip_{uuid.uuid4().hex[:8]}",
                       system_message="You write cinematic image prompts.").with_model(AI_PROVIDER, AI_MODEL)
        try:
            resp = await chat.send_message(UserMessage(text=q))
            prompt_text = (resp if isinstance(resp, str) else str(resp)).strip()
        except Exception as e:
            logger.warning(f"Image prompt regen failed, mock fallback: {e}")
            prompt_text = f"[MOCK] Regenerated cinematic prompt for scene {scene.get('scene_number')}."
    scenes = [{**s, "image_prompt": prompt_text} if s.get("id") == sid else s for s in doc["scenes"]]
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]},
                                 {"$set": {"scenes": scenes, "updated_at": now_iso()}})
    return await _get_owned(pid, user)


async def _regen_partial(pid: str, sid: str, user: dict, ask: str, keys: list, mockmap: dict):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    patch = {}
    if MOCK_MODE:
        patch = mockmap
    else:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"rp_{uuid.uuid4().hex[:8]}",
                       system_message="Respond with valid JSON only.").with_model(AI_PROVIDER, AI_MODEL)
        try:
            resp = await chat.send_message(UserMessage(text=ask))
            data = parse_json(resp if isinstance(resp, str) else str(resp))
            patch = {k: str(data.get(k, scene.get(k, "")) or "") for k in keys}
        except Exception as e:
            logger.warning(f"Partial regen failed, mock fallback: {e}")
            patch = mockmap
    scenes = [{**s, **patch} if s.get("id") == sid else s for s in doc["scenes"]]
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]},
                                 {"$set": {"scenes": scenes, "updated_at": now_iso()}})
    return await _get_owned(pid, user)


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate-dialogue")
async def regenerate_dialogue(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    ask = (f"For this film scene, write fresh dialogue, voice-over and on-screen text. Tone: {doc.get('mood')}, "
           f"language: {doc.get('language')}. Scene: {scene.get('visual_description')}. Characters: {scene.get('characters')}. "
           f'Respond ONLY as JSON: {{"dialogue":"","voice_over":"","on_screen_text":""}}')
    mockmap = {"dialogue": "[MOCK] New dialogue line.", "voice_over": "[MOCK] New voice-over.", "on_screen_text": "[MOCK] New overlay."}
    return await _regen_partial(pid, sid, user, ask, ["dialogue", "voice_over", "on_screen_text"], mockmap)


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate-camera")
async def regenerate_camera(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    ask = (f"Design a fresh camera setup for this film scene. Camera style: {doc.get('camera_style')}. "
           f"Scene: {scene.get('visual_description')}. Action: {scene.get('subject_action')}. "
           f"shot_size must be one of {SHOT_SIZES}. camera_movement one of {CAMERA_MOVES}. "
           f'Respond ONLY as JSON: {{"shot_size":"","camera_angle":"","camera_movement":"","camera_position":"","focal_length":""}}')
    mockmap = {"shot_size": "Medium shot", "camera_angle": "Low angle", "camera_movement": "Dolly in",
               "camera_position": "[MOCK] front, chest height", "focal_length": "50mm"}
    return await _regen_partial(pid, sid, user, ask, ["shot_size", "camera_angle", "camera_movement", "camera_position", "focal_length"], mockmap)


TEMPLATES = [
    {"id": "t_commercial30", "name": "30-Second Commercial", "category": "Commercial", "video_type": "Commercial",
     "platform": "Television", "duration": "30 seconds", "aspect_ratio": "16:9", "num_scenes": 6,
     "crew_size": "Commercial production", "visual_style": "Commercial", "mood": "Premium",
     "description": "A punchy, high-impact 30-second brand commercial."},
    {"id": "t_reel", "name": "Instagram Reel", "category": "Instagram Reel", "video_type": "Social media advertisement",
     "platform": "Instagram", "duration": "30 seconds", "aspect_ratio": "9:16", "num_scenes": 5,
     "crew_size": "Simple social production", "visual_style": "Energetic", "mood": "Dynamic",
     "description": "Vertical, scroll-stopping Instagram Reel."},
    {"id": "t_tiktok", "name": "TikTok Advertisement", "category": "TikTok", "video_type": "Social media advertisement",
     "platform": "TikTok", "duration": "15 seconds", "aspect_ratio": "9:16", "num_scenes": 4,
     "crew_size": "Simple social production", "visual_style": "Energetic", "mood": "Humorous",
     "description": "Native-feeling, fast-paced TikTok ad."},
    {"id": "t_youtube", "name": "YouTube Feature", "category": "YouTube", "video_type": "Product video",
     "platform": "YouTube", "duration": "2 minutes", "aspect_ratio": "16:9", "num_scenes": 8,
     "crew_size": "Small professional crew", "visual_style": "Cinematic", "mood": "Informative",
     "description": "Long-form YouTube hero feature."},
    {"id": "t_interview", "name": "Corporate Interview", "category": "Interview", "video_type": "Interview",
     "platform": "Internal corporate use", "duration": "2 minutes", "aspect_ratio": "16:9", "num_scenes": 6,
     "crew_size": "Small professional crew", "visual_style": "Corporate", "mood": "Authentic",
     "description": "Talking-head corporate interview with b-roll."},
    {"id": "t_corporate", "name": "Corporate Brand Film", "category": "Corporate", "video_type": "Corporate video",
     "platform": "Website", "duration": "90 seconds", "aspect_ratio": "16:9", "num_scenes": 7,
     "crew_size": "Small professional crew", "visual_style": "Corporate", "mood": "Inspirational",
     "description": "Polished corporate brand story film."},
    {"id": "t_launch", "name": "Product Launch Video", "category": "Product", "video_type": "Product video",
     "platform": "YouTube", "duration": "60 seconds", "aspect_ratio": "16:9", "num_scenes": 8,
     "crew_size": "High-end cinematic production", "visual_style": "Luxury", "mood": "Premium",
     "description": "Hero product launch film."},
    {"id": "t_music", "name": "Music Video", "category": "Music Video", "video_type": "Music video",
     "platform": "YouTube", "duration": "3 minutes", "aspect_ratio": "16:9", "num_scenes": 10,
     "crew_size": "High-end cinematic production", "visual_style": "Cinematic", "mood": "Dramatic",
     "description": "Performance + narrative music video."},
    {"id": "t_doc", "name": "Documentary Short", "category": "Documentary", "video_type": "Documentary",
     "platform": "Cinema", "duration": "5 minutes", "aspect_ratio": "2.39:1", "num_scenes": 9,
     "crew_size": "Small professional crew", "visual_style": "Documentary", "mood": "Emotional",
     "description": "Observational documentary short film."},
    {"id": "t_aftermovie", "name": "Event Aftermovie", "category": "Event", "video_type": "Event video",
     "platform": "Website", "duration": "90 seconds", "aspect_ratio": "16:9", "num_scenes": 8,
     "crew_size": "Small professional crew", "visual_style": "Energetic", "mood": "Inspirational",
     "description": "Dynamic recap of a live event."},
    {"id": "t_wedding", "name": "Wedding Film", "category": "Wedding", "video_type": "Event video",
     "platform": "Website", "duration": "3 minutes", "aspect_ratio": "16:9", "num_scenes": 9,
     "crew_size": "Small professional crew", "visual_style": "Natural", "mood": "Emotional",
     "description": "Cinematic wedding highlight film."},
    {"id": "t_fashion", "name": "Fashion Film", "category": "Fashion", "video_type": "Commercial",
     "platform": "Instagram", "duration": "60 seconds", "aspect_ratio": "4:5", "num_scenes": 7,
     "crew_size": "High-end cinematic production", "visual_style": "Fashion", "mood": "Premium",
     "description": "Editorial fashion film."},
]


@api_router.get("/templates")
async def get_templates(user=Depends(get_current_user)):
    return TEMPLATES


@api_router.get("/")
async def root():
    return {"message": "Storyboard AI API", "mock_mode": MOCK_MODE}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.projects.create_index("user_id")
    logger.info(f"Storyboard AI started. MOCK_MODE={MOCK_MODE} provider={AI_PROVIDER} model={AI_MODEL}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
