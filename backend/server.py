import os
import re
import json
import uuid
import base64
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, UploadFile, File, Request
from typing import List
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
import jwt
import bcrypt
import httpx

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

import image_service
import ai_director
import brief_service
import billing
import admin as admin_module

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
    camera_styles: list[str] = []
    custom_camera_style: str = ""
    lighting_styles: list[str] = []
    custom_lighting_style: str = ""
    editing_style: str = "Rhythmic"
    music_style: str = "Ambient score"
    director_references: str = ""
    film_references: str = ""
    key_message: str = ""
    call_to_action: str = ""
    references: str = ""
    notes: str = ""
    # Step 4 — Advanced
    deliverables: str = ""
    special_requests: str = ""
    restrictions: str = ""
    extra_notes: str = ""


class ProjectUpdate(BaseModel):
    data: dict


class FrameIn(BaseModel):
    prompt: Optional[str] = None
    style_preset: Optional[str] = ""
    aspect_ratio: Optional[str] = "16:9"
    negative_prompt: Optional[str] = ""
    model: Optional[str] = None  # per-generation override: "gemini" | "openai" | None(inherit)


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
    return {"user_id": u["user_id"], "email": u.get("email"), "name": u.get("name", ""),
            "picture": u.get("picture"), "role": (u.get("role") or "user")}


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
                "camera_angle", "camera_movement", "focal_length", "camera_position", "camera_height",
                "camera_direction", "lighting", "color_palette", "mood", "props", "wardrobe", "sound_notes",
                "transition", "frame_rate", "resolution", "equipment", "estimated_time", "crew_notes",
                "director_notes", "production_notes", "comments", "ai_notes", "image_prompt", "image_url", "status"]


def _style_list(p: dict, arr_key: str, custom_key: str, legacy_key: str) -> list:
    vals = [str(x).strip() for x in (p.get(arr_key) or []) if str(x).strip()]
    custom = str(p.get(custom_key) or "").strip()
    if custom and custom not in vals:
        vals.append(custom)
    if not vals and p.get(legacy_key):
        vals = [str(p.get(legacy_key)).strip()]
    return vals


def build_prompt(p: dict) -> str:
    n = min(12, max(8, int(p.get('num_scenes') or 8)))
    cam = _style_list(p, "camera_styles", "custom_camera_style", "camera_style")
    lgt = _style_list(p, "lighting_styles", "custom_lighting_style", "lighting_style")
    cam_str = ", ".join(cam) if cam else (p.get('camera_style') or "")
    lgt_str = ", ".join(lgt) if lgt else (p.get('lighting_style') or "")
    distribute = ""
    if len(cam) > 1 or len(lgt) > 1:
        distribute = (
            f"\nCREATIVE CONSTRAINTS — STYLE PALETTE:\n"
            f"- Camera styles available (a palette, NOT a checklist): {cam_str}\n"
            f"- Lighting styles available (a palette, NOT a checklist): {lgt_str}\n"
            f"- Distribute these styles intelligently ACROSS scenes based on narrative needs. "
            f"Do NOT force every style into every scene. Choose the most fitting camera style and lighting style per scene "
            f"so the overall project uses the full palette cohesively.\n"
        )
    return f"""You are an award-winning film director and line producer building a complete professional pre-production package for a real production. Think like software used by production companies — precise, structured, production-ready.

CREATIVE BRIEF:
- Project: {p.get('title')} | Client: {p.get('client')} | Campaign: {p.get('campaign')} | Brand: {p.get('brand')}
- Goal: {p.get('goal')} | Audience: {p.get('target_audience')} | Language: {p.get('language')}
- Key message: {p.get('key_message')} | Call to action: {p.get('call_to_action')}
- Video type: {p.get('video_type')} | Platform: {p.get('platform')} | Duration: {p.get('duration')} | Aspect: {p.get('aspect_ratio')}
- Crew size: {p.get('crew_size')} | Budget: {p.get('budget')} | Location: {p.get('location_type')} | Actors: {p.get('num_actors')}
- Mood: {p.get('mood')} | Visual style: {p.get('visual_style')} | Camera: {cam_str} | Lighting: {lgt_str} | Editing: {p.get('editing_style')} | Music: {p.get('music_style')}
- Director references: {p.get('director_references')} | Film references: {p.get('film_references')} | References: {p.get('references')}
- Deliverables: {p.get('deliverables')} | Special requests: {p.get('special_requests')} | Restrictions: {p.get('restrictions')} | Notes: {p.get('extra_notes') or p.get('notes')}
{distribute}
Respond with ONLY valid JSON (no markdown) matching EXACTLY this schema:
{{
 "concept": {{
   "title": "a punchy creative title", "elevator_pitch": "", "main_message": "", "emotional_goal": "", "audience": "", "communication_objective": ""
 }},
 "treatment": {{
   "visual_style": "", "narrative_style": "", "camera_language": "", "editing_style": "",
   "lighting_style": "", "color_palette": "", "sound_design": "", "overall_mood": ""
 }},
 "scenes": [{{
   "scene_number": 1, "title": "", "duration": "5s", "location": "", "time_of_day": "", "characters": "",
   "visual_description": "", "narrative": "the beat/story of this scene in prose", "subject_action": "",
   "dialogue": "", "voice_over": "", "on_screen_text": "", "shot_size": "one of {SHOT_SIZES}",
   "camera_angle": "e.g. Eye level/Low angle", "camera_movement": "one of {CAMERA_MOVES}",
   "camera_position": "physical camera placement", "camera_height": "e.g. eye level/low/high",
   "camera_direction": "e.g. facing subject / 3-4 left", "focal_length": "e.g. 35mm", "lighting": "lighting setup",
   "color_palette": "color mood", "mood": "scene mood", "props": "key props", "wardrobe": "wardrobe notes",
   "sound_notes": "audio notes", "transition": "e.g. Cut/Fade",
   "frame_rate": "e.g. 24fps", "resolution": "e.g. 4K", "equipment": "camera + support + key gear for this shot",
   "estimated_time": "setup+shoot estimate in minutes e.g. 45 min", "crew_notes": "", "director_notes": "creative intent",
   "production_notes": "logistics/risks", "ai_notes": "notes for AI/image direction", "status": "Draft",
   "image_prompt": "rich AI image prompt with style, lens, lighting, mood, composition"
 }}],
 "equipment": {{ "camera": "", "lens": "", "drone": "", "gimbal": "", "tripod": "", "lighting": "", "audio": "", "accessories": "" }},
 "crew": {{ "crew_size": "recommended total", "director": "", "producer": "", "dp": "", "camera_operator": "", "focus_puller": "", "gaffer": "", "sound": "", "drone_pilot": "", "production_assistant": "" }},
 "schedule": {{ "recommendation": "Half Day | One Day | Two Days", "estimated_hours": "e.g. 8-10 hours", "breakdown": "prep/shoot/wrap notes" }},
 "budget": {{ "low": "$X - $Y range", "medium": "$X - $Y range", "commercial": "$X - $Y range", "premium": "$X - $Y range", "notes": "what drives the cost" }}
}}

Create EXACTLY {n} scenes (between 8 and 12). Tailor equipment/crew/schedule/budget to the '{p.get('crew_size')}' production level and '{p.get('duration')}' duration. Fill every field with concrete, professional, realistic filmmaking content. Absolutely NO placeholder text or lorem ipsum."""


def mock_output(p: dict) -> dict:
    n = min(12, max(8, int(p.get("num_scenes") or 8)))
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
            "focal_length": "35mm", "camera_height": "Eye level", "camera_direction": "Facing subject",
            "lighting": "Soft key light with rim.",
            "color_palette": p.get("visual_style", "Neutral"), "mood": p.get("mood", "Premium"),
            "props": "Hero product", "wardrobe": "Tailored, neutral tones",
            "sound_notes": "Ambient score.", "transition": "Cut",
            "frame_rate": "24fps", "resolution": "4K", "equipment": "Cinema camera, gimbal, key light",
            "estimated_time": "45 min", "crew_notes": "1 DP, 1 gaffer", "director_notes": "Keep it intimate.",
            "production_notes": "Confirm location permit.", "ai_notes": "Emphasize warm rim light.", "status": "Draft",
            "image_prompt": f"[MOCK] Cinematic {p.get('visual_style')} frame, {p.get('mood')} mood, scene {i}.",
        })
    return {
        "concept": {"title": f"[MOCK] {p.get('title')}", "elevator_pitch": f"[MOCK] Elevator pitch for {p.get('title')}.",
                    "main_message": "[MOCK] Main message.", "emotional_goal": p.get("mood", ""),
                    "audience": p.get("target_audience", ""), "communication_objective": p.get("goal", "")},
        "treatment": {"visual_style": "[MOCK] Visual style.", "narrative_style": "[MOCK] Narrative style.",
                      "camera_language": "[MOCK] Camera language.", "editing_style": "[MOCK] Editing style.",
                      "lighting_style": "[MOCK] Lighting style.", "color_palette": "[MOCK] Color palette.",
                      "sound_design": "[MOCK] Sound design.", "overall_mood": p.get("mood", "")},
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
    if not out.get("status"):
        out["status"] = "Draft"
    # Preserve non-string structured fields (comments + image frames + shots) across (re)generation.
    out["comment_list"] = s.get("comment_list") or []
    out["frames"] = s.get("frames") or []
    out["active_frame_id"] = s.get("active_frame_id") or ""
    out["shots"] = s.get("shots") or []
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
    await bump_usage(user["user_id"], "exports")
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
    await bump_usage(user["user_id"], "ai_generations")
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
    # Preserve user-owned data (comments + image frames) across a full AI scene regen.
    for x in scenes:
        if x.get("id") == sid:
            x["comment_list"] = scene.get("comment_list") or []
            x["frames"] = scene.get("frames") or []
            x["active_frame_id"] = scene.get("active_frame_id") or ""
            x["shots"] = scene.get("shots") or []
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


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate-description")
async def regenerate_description(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    ask = (f"Rewrite this film scene's visual description, narrative and on-camera action. Visual style: {doc.get('visual_style')}, "
           f"mood: {doc.get('mood')}. Current: {scene.get('visual_description')}. "
           f'Respond ONLY as JSON: {{"visual_description":"","narrative":"","subject_action":""}}')
    mockmap = {"visual_description": "[MOCK] New visual description.", "narrative": "[MOCK] New narrative beat.", "subject_action": "[MOCK] New action."}
    return await _regen_partial(pid, sid, user, ask, ["visual_description", "narrative", "subject_action"], mockmap)


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate-voiceover")
async def regenerate_voiceover(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    ask = (f"Write a fresh voice-over line for this scene. Tone: {doc.get('mood')}, language: {doc.get('language')}. "
           f"Scene: {scene.get('visual_description')}. "
           f'Respond ONLY as JSON: {{"voice_over":""}}')
    return await _regen_partial(pid, sid, user, ask, ["voice_over"], {"voice_over": "[MOCK] New voice-over line."})


@api_router.post("/projects/{pid}/scenes/{sid}/regenerate-lighting")
async def regenerate_lighting(pid: str, sid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    ask = (f"Design a fresh lighting setup, color palette and mood for this scene. Lighting style: {doc.get('lighting_style')}, "
           f"time of day: {scene.get('time_of_day')}. Scene: {scene.get('visual_description')}. "
           f'Respond ONLY as JSON: {{"lighting":"","color_palette":"","mood":""}}')
    mockmap = {"lighting": "[MOCK] New lighting setup.", "color_palette": "[MOCK] New palette.", "mood": "[MOCK] New mood."}
    return await _regen_partial(pid, sid, user, ask, ["lighting", "color_palette", "mood"], mockmap)


# ---------------------------------------------------------------------------
# Storyboard image frames (provider-agnostic; mock/none until a real provider is wired)
# ---------------------------------------------------------------------------
def _find_scene(doc: dict, sid: str) -> dict:
    scene = next((s for s in doc.get("scenes", []) if s.get("id") == sid), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


async def _save_scene(pid: str, user: dict, doc: dict, sid: str, updated_scene: dict, inc_gen: bool = False):
    scenes = [updated_scene if s.get("id") == sid else s for s in doc["scenes"]]
    upd: dict = {"$set": {"scenes": scenes, "updated_at": now_iso()}}
    if inc_gen:
        upd["$inc"] = {"image_gen_count": 1}
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]}, upd)
    return await _get_owned(pid, user)


# Cost + safety controls for REAL image generation
DEV_IMAGE_LIMIT = int(os.environ.get("IMAGE_DEV_LIMIT", "3"))
_active_generations: set = set()


def _build_frame_prompt(project: dict, scene: dict, base_desc: str, aspect: str) -> str:
    t = project.get("treatment") or {}
    tech = {
        "Shot type": scene.get("shot_size"), "Camera angle": scene.get("camera_angle"),
        "Lens": scene.get("focal_length"), "Camera movement": scene.get("camera_movement"),
        "Lighting": scene.get("lighting"), "Color palette": scene.get("color_palette") or t.get("color_palette"),
        "Time of day": scene.get("time_of_day"), "Location": scene.get("location"),
        "Characters": scene.get("characters"),
    }
    directive = ", ".join(f"{k}: {v}" for k, v in tech.items() if str(v or "").strip())
    style = ", ".join(str(x) for x in [t.get("visual_style"), t.get("narrative_style"), t.get("lighting_style")] if str(x or "").strip())
    prompt = f"Cinematic storyboard frame. {base_desc}".strip().rstrip(".") + "."
    if directive:
        prompt += f" Technical direction — {directive}."
    if style:
        prompt += f" Visual style — {style}."
    prompt += f" Aspect ratio {aspect}. A single storyboard still, no text, captions, borders or watermarks."
    return prompt


async def _run_generation(pid: str, sid: str, user: dict, base_desc: str, aspect: str, style_preset: str, model: Optional[str] = None):
    doc = await _get_owned(pid, user)
    scene = _find_scene(doc, sid)
    # Effective model: per-generation override > per-project setting > global user setting > server default.
    effective = model or doc.get("image_model") or ((user.get("settings") or {}).get("image_model"))
    provider = image_service.resolve_provider(effective).name
    is_real = provider in ("gemini", "openai")

    # 1 active generation per project at a time (prevents duplicate/concurrent spend)
    if pid in _active_generations:
        raise HTTPException(status_code=409, detail="A generation is already in progress for this project.")
    # Development cap on REAL generations
    if is_real and doc.get("image_gen_count", 0) >= DEV_IMAGE_LIMIT:
        raise HTTPException(status_code=429, detail=f"Development limit reached: {DEV_IMAGE_LIMIT} real image generations per project.")

    prompt = _build_frame_prompt(doc, scene, base_desc, aspect)
    opts = {"style_preset": style_preset or "", "aspect_ratio": aspect, "label": f"SCENE {scene.get('scene_number')}"}

    _active_generations.add(pid)
    try:
        result = await image_service.generate_image(prompt, opts, model=effective)
    finally:
        _active_generations.discard(pid)

    # Never persist a broken version — surface the error and keep the prompt.
    if result.get("status") != image_service.STATUS_COMPLETED:
        raise HTTPException(status_code=502, detail=result.get("error_message") or "Image generation failed.")

    frames = list(scene.get("frames") or [])
    version = (max([f.get("version", 0) for f in frames], default=0)) + 1
    frame = image_service.make_frame(scene, pid, result, version, base_desc, opts)
    frames.append(frame)
    updated = {**scene, "frames": frames, "image_prompt": base_desc or scene.get("image_prompt", ""),
               "active_frame_id": frame["id"], "image_url": frame["image_url"]}
    await bump_usage(user["user_id"], "image_generations")
    return await _save_scene(pid, user, doc, sid, updated, inc_gen=is_real)


@api_router.post("/projects/{pid}/scenes/{sid}/frames/generate")
async def generate_frame(pid: str, sid: str, body: FrameIn, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = _find_scene(doc, sid)
    base_desc = (body.prompt or scene.get("image_prompt") or scene.get("visual_description") or "").strip()
    return await _run_generation(pid, sid, user, base_desc, body.aspect_ratio or "16:9", body.style_preset or "", model=body.model)


@api_router.post("/projects/{pid}/scenes/{sid}/frames/{fid}/regenerate")
async def regenerate_frame(pid: str, sid: str, fid: str, body: FrameIn, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = _find_scene(doc, sid)
    old = next((f for f in (scene.get("frames") or []) if f.get("id") == fid), None)
    if not old:
        raise HTTPException(status_code=404, detail="Frame not found")
    base_desc = (body.prompt or old.get("prompt") or scene.get("image_prompt") or scene.get("visual_description") or "").strip()
    return await _run_generation(pid, sid, user, base_desc, body.aspect_ratio or old.get("aspect_ratio", "16:9"), body.style_preset or old.get("style_preset", ""), model=body.model)


@api_router.post("/projects/{pid}/scenes/{sid}/frames/{fid}/active")
async def set_active_frame(pid: str, sid: str, fid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = _find_scene(doc, sid)
    frames = scene.get("frames") or []
    frame = next((f for f in frames if f.get("id") == fid), None)
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")
    updated = {**scene, "active_frame_id": fid, "image_url": frame.get("image_url", "")}
    return await _save_scene(pid, user, doc, sid, updated)


@api_router.delete("/projects/{pid}/scenes/{sid}/frames/{fid}")
async def delete_frame(pid: str, sid: str, fid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = _find_scene(doc, sid)
    frames = [f for f in (scene.get("frames") or []) if f.get("id") != fid]
    active = scene.get("active_frame_id") or ""
    image_url = scene.get("image_url", "")
    if active == fid:
        active = frames[-1]["id"] if frames else ""
        image_url = frames[-1]["image_url"] if frames else ""
    updated = {**scene, "frames": frames, "active_frame_id": active, "image_url": image_url}
    return await _save_scene(pid, user, doc, sid, updated)


@api_router.get("/projects/{pid}/scenes/{sid}/frames/{fid}/status")
async def frame_status(pid: str, sid: str, fid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    scene = _find_scene(doc, sid)
    frame = next((f for f in (scene.get("frames") or []) if f.get("id") == fid), None)
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")
    return {"status": image_service.get_generation_status(frame),
            "error_message": frame.get("error_message", ""), "frame": frame}


@api_router.get("/image-provider")
async def image_provider(user=Depends(get_current_user)):
    return {"provider": image_service.get_provider().name,
            "configured": image_service.provider_configured(),
            "dev_limit": DEV_IMAGE_LIMIT,
            "models": [image_service.MODEL_META[m] for m in image_service.REAL_MODELS],
            "default_model": (user.get("settings") or {}).get("image_model") or "gemini"}


class SettingsIn(BaseModel):
    image_model: Optional[str] = None


@api_router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    s = user.get("settings") or {}
    return {"image_model": s.get("image_model") or "gemini",
            "models": [image_service.MODEL_META[m] for m in image_service.REAL_MODELS]}


@api_router.put("/settings")
async def put_settings(body: SettingsIn, user=Depends(get_current_user)):
    model = body.image_model if body.image_model in image_service.REAL_MODELS else "gemini"
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {"settings.image_model": model, "updated_at": now_iso()}})
    return {"image_model": model}


# ---------------------------------------------------------------------------
# AI Director — iterative, provider-agnostic project revision (preview → apply)
# ---------------------------------------------------------------------------
class DirectorIn(BaseModel):
    instruction: str
    scope: Optional[str] = "project"


class VersionRename(BaseModel):
    name: str


SCOPE_SCENE_KEYS = {
    "dialogue": ["dialogue", "voice_over", "on_screen_text"],
    "camera": ["shot_size", "camera_angle", "camera_movement", "camera_position", "camera_height", "camera_direction", "focal_length", "frame_rate", "resolution"],
    "shotlist": ["shot_size", "camera_angle", "camera_movement", "camera_position", "camera_height", "camera_direction", "focal_length", "frame_rate", "resolution"],
    "lighting": ["lighting", "color_palette", "mood"],
    "prompts": ["image_prompt"],
    "script": ["visual_description", "narrative", "subject_action", "dialogue", "voice_over", "on_screen_text"],
}
WIDE_SCOPES = {"project", "storyboard", "scene"}


def _apply_patches(project: dict, revision: dict, scope: str) -> dict:
    import copy
    preview = copy.deepcopy(project)
    allowed = set(SCENE_FIELDS if scope in WIDE_SCOPES else SCOPE_SCENE_KEYS.get(scope, SCENE_FIELDS))
    if scope in WIDE_SCOPES or scope == "script":
        pp = revision.get("project_patch") or {}
        for k, v in pp.items():
            if k in ("concept", "treatment", "equipment", "crew", "schedule", "budget") and isinstance(v, dict) and isinstance(preview.get(k), dict):
                preview[k] = {**preview[k], **v}
            elif k in ("title", "video_type", "platform", "target_audience", "goal", "script", "notes", "aspect_ratio", "duration", "language"):
                preview[k] = v
    patches = {p.get("id"): (p.get("changes") or {}) for p in (revision.get("scene_patches") or []) if p.get("id")}
    for s in preview.get("scenes", []):
        ch = patches.get(s.get("id"))
        if not ch:
            continue
        for k, val in ch.items():
            if k in allowed:
                s[k] = str(val)
    return preview


def _diff(old: dict, new: dict) -> list:
    diffs = []
    for k in ["title", "video_type", "platform", "target_audience", "goal", "script", "notes", "aspect_ratio", "duration"]:
        if str(old.get(k, "") or "") != str(new.get(k, "") or ""):
            diffs.append({"label": k.replace("_", " ").title(), "old": str(old.get(k, "") or ""), "new": str(new.get(k, "") or "")})
    for grp in ["concept", "treatment"]:
        o, n = old.get(grp) or {}, new.get(grp) or {}
        for kk in sorted(set(list(o.keys()) + list(n.keys()))):
            if str(o.get(kk, "") or "") != str(n.get(kk, "") or ""):
                diffs.append({"label": f"{grp.title()} · {kk.replace('_', ' ')}", "old": str(o.get(kk, "") or ""), "new": str(n.get(kk, "") or "")})
    omap = {s.get("id"): s for s in old.get("scenes", [])}
    for s in new.get("scenes", []):
        os_ = omap.get(s.get("id"))
        if not os_:
            continue
        for k in SCENE_FIELDS:
            if str(os_.get(k, "") or "") != str(s.get(k, "") or ""):
                diffs.append({"label": f"Scene {s.get('scene_number')} · {k.replace('_', ' ')}",
                              "old": str(os_.get(k, "") or ""), "new": str(s.get(k, "") or "")})
    return diffs


@api_router.post("/projects/{pid}/director/revise")
async def director_revise(pid: str, body: DirectorIn, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    if not (body.instruction or "").strip():
        raise HTTPException(status_code=400, detail="Please describe what to improve.")
    try:
        revision = await ai_director.revise(doc, body.instruction.strip(), body.scope or "project")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI Director could not complete the revision: {str(e)[:180]}")
    preview = _apply_patches(doc, revision, body.scope or "project")
    diff = _diff(doc, preview)
    return {"summary": revision.get("summary"), "runtime_delta": revision.get("runtime_delta"),
            "plan": revision.get("plan", []), "diff": diff, "preview": preview}


@api_router.post("/projects/{pid}/director/apply")
async def director_apply(pid: str, body: dict, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    preview = body.get("preview")
    summary = (body.get("summary") or "AI Director revision")[:80]
    if not preview or not isinstance(preview.get("scenes"), list):
        raise HTTPException(status_code=400, detail="Invalid preview payload.")
    version = {"id": uuid.uuid4().hex[:10], "project_id": pid, "user_id": user["user_id"],
               "name": summary, "summary": summary, "created_at": now_iso(),
               "snapshot": {k: v for k, v in doc.items() if k != "_id"}}
    await db.versions.insert_one(dict(version))
    setdata = {k: v for k, v in preview.items() if k not in ("id", "user_id", "_id")}
    setdata["updated_at"] = now_iso()
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]}, {"$set": setdata})
    return await _get_owned(pid, user)


@api_router.get("/projects/{pid}/versions")
async def list_versions(pid: str, user=Depends(get_current_user)):
    await _get_owned(pid, user)
    return await db.versions.find({"project_id": pid, "user_id": user["user_id"]},
                                  {"_id": 0, "snapshot": 0}).sort("created_at", -1).to_list(200)


@api_router.post("/projects/{pid}/versions/{vid}/restore")
async def restore_version(pid: str, vid: str, user=Depends(get_current_user)):
    doc = await _get_owned(pid, user)
    ver = await db.versions.find_one({"id": vid, "project_id": pid, "user_id": user["user_id"]}, {"_id": 0})
    if not ver:
        raise HTTPException(status_code=404, detail="Version not found")
    snap_cur = {"id": uuid.uuid4().hex[:10], "project_id": pid, "user_id": user["user_id"],
                "name": f"Auto-snapshot before restore", "summary": "Snapshot before restore",
                "created_at": now_iso(), "snapshot": {k: v for k, v in doc.items() if k != "_id"}}
    await db.versions.insert_one(dict(snap_cur))
    snap = ver.get("snapshot") or {}
    setdata = {k: v for k, v in snap.items() if k not in ("id", "user_id", "_id")}
    setdata["updated_at"] = now_iso()
    await db.projects.update_one({"id": pid, "user_id": user["user_id"]}, {"$set": setdata})
    return await _get_owned(pid, user)


@api_router.put("/projects/{pid}/versions/{vid}")
async def rename_version(pid: str, vid: str, body: VersionRename, user=Depends(get_current_user)):
    await _get_owned(pid, user)
    r = await db.versions.update_one({"id": vid, "project_id": pid, "user_id": user["user_id"]}, {"$set": {"name": body.name[:80]}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"ok": True}


@api_router.delete("/projects/{pid}/versions/{vid}")
async def delete_version(pid: str, vid: str, user=Depends(get_current_user)):
    await _get_owned(pid, user)
    await db.versions.delete_one({"id": vid, "project_id": pid, "user_id": user["user_id"]})
    return {"ok": True}


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


# ---------------------------------------------------------------------------
# Subscriptions & entitlements (Run 1 — read-only, no Stripe)
# ---------------------------------------------------------------------------
async def get_or_create_subscription(user_id: str) -> dict:
    sub = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    if not sub:
        sub = {"user_id": user_id, "plan_id": billing.DEFAULT_PLAN, "status": "active",
               "current_period_end": None, "cancel_at_period_end": False,
               "created_at": now_iso(), "updated_at": now_iso()}
        await db.subscriptions.insert_one(dict(sub))
        return sub
    # Auto-expire paid plans whose 30-day period has ended -> revert to Free.
    end = sub.get("current_period_end")
    if sub.get("plan_id") != billing.DEFAULT_PLAN and end:
        try:
            dt = datetime.fromisoformat(str(end))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if dt < datetime.now(timezone.utc):
                await db.subscriptions.update_one({"user_id": user_id},
                    {"$set": {"plan_id": billing.DEFAULT_PLAN, "status": "active",
                              "current_period_end": None, "provider": None, "updated_at": now_iso()}})
                sub = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        except Exception:
            pass
    return sub


async def bump_usage(user_id: str, field: str, n: int = 1):
    """Increment a monthly usage counter for the current user."""
    try:
        await db.usage.update_one({"user_id": user_id}, {"$inc": {field: n},
                                  "$set": {"updated_at": now_iso()}}, upsert=True)
    except Exception as e:
        logger.warning(f"usage bump failed ({field}): {e}")


@api_router.get("/billing/summary")
async def billing_summary(user=Depends(get_current_user)):
    uid = user["user_id"]
    sub = await get_or_create_subscription(uid)
    usage = await db.usage.find_one({"user_id": uid}, {"_id": 0}) or {}
    # projects usage is always computed live (source of truth)
    usage["projects"] = await db.projects.count_documents({"user_id": uid})
    storage_bytes = await compute_storage_bytes(uid)
    return billing.build_summary(sub, usage, storage_bytes)


# ---------------------------------------------------------------------------
# Stripe payments (Emergent-managed test key via proxy). The wrapper supports
# one-time payment Checkout only, so a successful payment activates the chosen
# plan for a 30-day period. Amounts are SERVER-controlled (never from client).
# ---------------------------------------------------------------------------
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
PLAN_PRICES = {"pro": 19.0, "studio": 49.0}   # EUR — source of truth
PLAN_PERIOD_DAYS = 30


class CheckoutIn(BaseModel):
    plan: str
    origin_url: str


def _stripe_client(webhook_url: Optional[str] = None) -> StripeCheckout:
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


async def _activate_plan(user_id: str, plan: str):
    end = (datetime.now(timezone.utc) + timedelta(days=PLAN_PERIOD_DAYS)).isoformat()
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {"plan_id": plan, "status": "active", "current_period_end": end,
                  "cancel_at_period_end": False, "provider": "stripe", "updated_at": now_iso()}},
        upsert=True,
    )


@api_router.post("/billing/checkout")
async def billing_checkout(body: CheckoutIn, user=Depends(get_current_user)):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments not configured")
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"
    webhook_url = f"{origin}/api/billing/webhook"
    sc = _stripe_client(webhook_url=webhook_url)
    req = CheckoutSessionRequest(
        amount=float(PLAN_PRICES[body.plan]), currency="eur",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["user_id"], "plan": body.plan, "kind": "subscription"},
    )
    try:
        session = await sc.create_checkout_session(req)
    except Exception as e:
        logger.error(f"stripe checkout failed: {e}")
        raise HTTPException(status_code=502, detail="Unable to start checkout")
    await db.payment_transactions.insert_one({
        "session_id": session.session_id, "user_id": user["user_id"],
        "plan": body.plan, "amount": float(PLAN_PRICES[body.plan]), "currency": "eur",
        "payment_status": "initiated", "processed": False,
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/billing/checkout/status/{session_id}")
async def billing_checkout_status(session_id: str, user=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("user_id") != user["user_id"]:
        raise HTTPException(status_code=404, detail="Session not found")
    sc = _stripe_client()
    try:
        status = await sc.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"stripe status failed: {e}")
        raise HTTPException(status_code=502, detail="Unable to fetch payment status")
    if status.payment_status == "paid" and not tx.get("processed"):
        await db.payment_transactions.update_one({"session_id": session_id},
            {"$set": {"payment_status": "paid", "processed": True, "updated_at": now_iso()}})
        await _activate_plan(user["user_id"], tx["plan"])
    return {"status": status.status, "payment_status": status.payment_status,
            "plan": tx["plan"], "paid": (status.payment_status == "paid")}


@api_router.post("/billing/webhook")
async def billing_webhook(request: Request):
    """Tolerant webhook: the Emergent Stripe proxy forwards events without a
    Stripe-Signature header, so we fall back to raw JSON parsing. Always returns
    200 so the proxy/Stripe does not retry indefinitely. Activation is idempotent
    (guarded by payment_transactions.processed)."""
    payload = await request.body()
    sig = request.headers.get("Stripe-Signature")
    event_type = session_id = payment_status = None
    metadata: dict = {}
    sc = _stripe_client()
    try:
        event = await sc.handle_webhook(payload, sig)
        event_type, session_id = event.event_type, event.session_id
        payment_status, metadata = event.payment_status, (event.metadata or {})
    except Exception:
        # Fallback: parse the raw JSON body ourselves.
        try:
            data = json.loads(payload.decode("utf-8"))
            event_type = data.get("type")
            obj = (data.get("data", {}) or {}).get("object", {}) or {}
            session_id = obj.get("id")
            payment_status = obj.get("payment_status")
            metadata = obj.get("metadata", {}) or {}
        except Exception as e:
            logger.warning(f"stripe webhook unparseable: {e}")
            return {"received": True}

    if event_type == "checkout.session.completed" and payment_status == "paid":
        tx = None
        if session_id:
            tx = await db.payment_transactions.find_one({"session_id": session_id})
        if tx and not tx.get("processed"):
            await db.payment_transactions.update_one({"session_id": session_id},
                {"$set": {"payment_status": "paid", "processed": True, "updated_at": now_iso()}})
            await _activate_plan(tx["user_id"], tx["plan"])
        elif not tx and metadata.get("user_id") and metadata.get("plan") in PLAN_PRICES:
            # No local tx (edge case) — activate from trusted event metadata.
            await _activate_plan(metadata["user_id"], metadata["plan"])
    return {"received": True}


@api_router.post("/billing/cancel")
async def billing_cancel(user=Depends(get_current_user)):
    await db.subscriptions.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"plan_id": "free", "status": "active", "current_period_end": None,
                  "cancel_at_period_end": False, "provider": None, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "plan": "free"}


async def compute_storage_bytes(user_id: str = None) -> int:
    """Live storage usage = total BSON size of the user's project documents
    (briefs, storyboards, base64 frames, exports metadata, reference materials).
    Passing user_id=None returns platform-wide usage."""
    match = {"user_id": user_id} if user_id else {}
    pipeline = [{"$match": match}] if match else []
    pipeline += [{"$group": {"_id": None, "bytes": {"$sum": {"$bsonSize": "$$ROOT"}}}}]
    agg = await db.projects.aggregate(pipeline).to_list(1)
    return int(agg[0]["bytes"]) if agg else 0


@api_router.get("/")
async def root():
    return {"message": "Storyboard AI API", "mock_mode": MOCK_MODE}


# ---------------------------------------------------------------------------
# Create Project from Client Brief (Run 1) — upload -> analyze (text + vision)
# ---------------------------------------------------------------------------
class BriefFile(BaseModel):
    name: str
    data: str  # base64 (may include a data-URI prefix)


class AnalyzeBriefIn(BaseModel):
    documents: list[BriefFile] = []
    images: list[BriefFile] = []


class CreateFromBriefIn(BaseModel):
    fields: dict = {}
    visual: dict = {}
    title: Optional[str] = None
    generate: bool = True


def _decode_b64(s: str) -> bytes:
    if not s:
        return b""
    if "," in s[:64] and s[:5] in ("data:", "DATA:"):
        s = s.split(",", 1)[1]
    return base64.b64decode(s)


IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}
MAX_IMAGE_BYTES = 6 * 1024 * 1024


@api_router.post("/briefs/analyze")
async def analyze_brief_endpoint(body: AnalyzeBriefIn, user=Depends(get_current_user)):
    if not body.documents and not body.images:
        raise HTTPException(status_code=400, detail="Upload at least one document or reference image.")

    docs, doc_errors = [], []
    for f in body.documents:
        try:
            docs.append(brief_service.extract_document(f.name, _decode_b64(f.data)))
        except brief_service.ExtractError as e:
            doc_errors.append({"fileName": f.name, "code": e.code, "message": e.message})
        except Exception as e:
            logger.warning(f"extract failed {f.name}: {e}")
            doc_errors.append({"fileName": f.name, "code": "extraction_failed", "message": "Could not read this file."})

    images, image_errors = [], []
    for f in body.images:
        ext = (f.name.rsplit(".", 1)[-1] if "." in f.name else "").lower()
        if ext not in IMAGE_EXTS:
            image_errors.append({"fileName": f.name, "code": "unsupported_image", "message": f"Unsupported image: .{ext or '?'}"})
            continue
        try:
            raw = _decode_b64(f.data)
            if len(raw) > MAX_IMAGE_BYTES:
                image_errors.append({"fileName": f.name, "code": "file_too_large", "message": "Image exceeds 6 MB."})
                continue
            images.append({"fileName": f.name, "fileType": ext.upper(),
                           "fileSize": len(raw), "base64": base64.b64encode(raw).decode()})
        except Exception:
            image_errors.append({"fileName": f.name, "code": "corrupted_file", "message": "Could not read this image."})

    analysis, mock = await brief_service.analyze_brief(docs, images)
    return {
        "documents": [{k: v for k, v in d.items() if k != "text"} for d in docs],
        "documentErrors": doc_errors,
        "images": [{"fileName": im["fileName"], "fileType": im["fileType"], "fileSize": im["fileSize"]} for im in images],
        "imageErrors": image_errors,
        "analysis": analysis,
        "mock_mode": mock,
    }


@api_router.post("/briefs/create-project")
async def create_project_from_brief(body: CreateFromBriefIn, user=Depends(get_current_user)):
    payload = brief_service.map_brief_to_project(body.fields, body.visual)
    if body.title:
        payload["title"] = body.title[:80]
    valid = set(ProjectIn.model_fields)
    proj = ProjectIn(**{k: v for k, v in payload.items() if k in valid})
    doc = proj.dict()
    generating = bool(body.generate)
    doc.update({"id": uuid.uuid4().hex[:12], "user_id": user["user_id"],
                "status": "generating" if generating else "draft",
                "concept": {}, "treatment": {}, "equipment": {}, "crew": {}, "schedule": {}, "budget": {},
                "scenes": [], "favorite": False, "archived": False, "export_count": 0,
                "created_from": "brief", "created_at": now_iso(), "updated_at": now_iso()})
    await db.projects.insert_one(dict(doc))
    doc.pop("_id", None)
    # Generate in the BACKGROUND to stay under the ingress request timeout.
    # The client polls GET /projects/{id} until status != 'generating'.
    if generating:
        asyncio.create_task(_generate_project_bg(doc["id"], user["user_id"]))
    return doc


async def _generate_project_bg(pid: str, user_id: str):
    try:
        doc = await db.projects.find_one({"id": pid, "user_id": user_id}, {"_id": 0})
        if not doc:
            return
        used_mock = MOCK_MODE
        try:
            data = await ai_generate(doc)
        except Exception as e:
            logger.warning(f"Brief bg generation failed, using mock fallback: {e}")
            data = mock_output(doc)
            used_mock = True
        scenes = [normalize_scene(s, i) for i, s in enumerate(data.get("scenes", []))]
        update = {"concept": data.get("concept", {}), "treatment": data.get("treatment", {}),
                  "equipment": data.get("equipment", {}), "crew": data.get("crew", {}),
                  "schedule": data.get("schedule", {}), "budget": data.get("budget", {}),
                  "scenes": scenes, "status": "generated", "mock_mode": used_mock, "updated_at": now_iso()}
        await db.projects.update_one({"id": pid, "user_id": user_id}, {"$set": update})
        await bump_usage(user_id, "ai_generations")
    except Exception as e:
        logger.error(f"bg generation fatal for {pid}: {e}")
        await db.projects.update_one({"id": pid, "user_id": user_id},
                                     {"$set": {"status": "generation_failed", "updated_at": now_iso()}})


api_router.include_router(admin_module.build_admin_router(db, get_current_user))
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.projects.create_index("user_id")
    await db.users.create_index("role")
    # Backfill role on legacy users, then run optional configurable Owner seed.
    await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user"}})
    try:
        await admin_module.seed_owner_from_env(db)
    except Exception as e:
        logger.warning(f"owner seed skipped: {e}")
    logger.info(f"Storyboard AI started. MOCK_MODE={MOCK_MODE} provider={AI_PROVIDER} model={AI_MODEL}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
