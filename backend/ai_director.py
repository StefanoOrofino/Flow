"""AI Director — a provider-agnostic creative-director revision service.

It does NOT chat. Given the full project context + a natural-language instruction,
it returns strict JSON describing precise, consistent modifications (a Change Plan +
project/scene patches). The UI never depends on a specific provider — swap AI_PROVIDER /
AI_MODEL (openai | gemini | anthropic) without touching callers.
"""
import os
import re
import json
import uuid
import logging

logger = logging.getLogger("ai_director")

AI_PROVIDER = os.environ.get("AI_PROVIDER", "openai")
AI_MODEL = os.environ.get("AI_MODEL", "gpt-5.4")

SCOPES = {
    "project": "the entire project (concept, treatment, script and all scenes)",
    "storyboard": "the storyboard scenes (visuals, action and staging)",
    "script": "the script — scene narration, action, dialogue and voice-over",
    "dialogue": "ONLY dialogue, voice-over and on-screen text",
    "shotlist": "the shot list and camera setups",
    "camera": "ONLY camera setup fields (shot size, angle, movement, lens)",
    "lighting": "ONLY lighting, color palette and mood",
    "prompts": "ONLY the AI image prompts for each scene",
}

CONTEXT_SCENE_KEYS = [
    "id", "scene_number", "title", "duration", "location", "time_of_day", "characters",
    "visual_description", "narrative", "subject_action", "dialogue", "voice_over", "on_screen_text",
    "shot_size", "camera_angle", "camera_movement", "focal_length", "lighting", "color_palette",
    "mood", "props", "transition", "image_prompt", "director_notes", "production_notes", "status",
]


def parse_json(text: str) -> dict:
    text = (text or "").strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in AI response")
    return json.loads(text[start:end + 1])


def build_context(project: dict) -> dict:
    scenes = []
    for s in project.get("scenes", []):
        scenes.append({k: s.get(k) for k in CONTEXT_SCENE_KEYS})
        # include scene comments (creative notes the director should honour)
        cl = s.get("comment_list") or []
        if cl:
            scenes[-1]["comments"] = [c.get("text") for c in cl if c.get("text")]
    return {
        "title": project.get("title"), "client": project.get("client"), "campaign": project.get("campaign"),
        "brand": project.get("brand"), "video_type": project.get("video_type"), "platform": project.get("platform"),
        "duration": project.get("duration"), "aspect_ratio": project.get("aspect_ratio"),
        "language": project.get("language"), "target_audience": project.get("target_audience"),
        "goal": project.get("goal"), "notes": project.get("notes"),
        "concept": project.get("concept"), "treatment": project.get("treatment"),
        "script": project.get("script"), "scenes": scenes,
    }


SYSTEM = (
    "You are an experienced Creative Director revising an EXISTING video production for a client. "
    "You never chat or explain conversationally. You return ONLY strict JSON describing precise edits. "
    "You keep the whole production internally consistent: characters, locations, visual style, tone, "
    "narrative, camera language, lighting and color palette must stay coherent with decisions already made. "
    "Preserve every scene id exactly. Never add or remove scenes unless explicitly told."
)


def _prompt(ctx: dict, instruction: str, scope: str) -> str:
    scope_desc = SCOPES.get(scope, SCOPES["project"])
    return (
        f"CURRENT PROJECT (JSON):\n{json.dumps(ctx, ensure_ascii=False)}\n\n"
        f'DIRECTOR INSTRUCTION: "{instruction}"\n'
        f"SCOPE: {scope_desc}\n\n"
        "Return ONLY JSON of exactly this shape:\n"
        "{\n"
        '  "summary": "one short sentence describing the revision",\n'
        '  "runtime_delta": "e.g. -12s, +0s",\n'
        '  "plan": [{"section":"Creative Concept","status":"Updated","detail":"short reason"}],\n'
        '  "project_patch": {"script":"...", "target_audience":"...", "concept":{...}, "treatment":{...}},\n'
        '  "scene_patches": [{"id":"<existing scene id>","changes":{"visual_description":"...","dialogue":"..."}}]\n'
        "}\n\n"
        "RULES: Only include fields you actually change. Respect the SCOPE strictly — if scope limits to dialogue, "
        "camera, lighting or prompts, only change those fields and leave project_patch empty. Keep edits "
        "production-ready and consistent. Use the existing scene ids from the context. Output JSON only."
    )


def _mock_revision(project: dict, instruction: str, scope: str) -> dict:
    scenes = project.get("scenes", [])
    patches = []
    if scenes:
        patches.append({"id": scenes[0]["id"], "changes": {
            "director_notes": f"[MOCK] Applied director note for: {instruction[:60]}"}})
    return {
        "summary": f"[MOCK] {instruction[:60]}",
        "runtime_delta": "+0s",
        "plan": [{"section": "Storyboard", "status": "Updated", "detail": "Mock revision (no AI key configured)."}],
        "project_patch": {},
        "scene_patches": patches,
    }


async def revise(project: dict, instruction: str, scope: str = "project") -> dict:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.warning("AI Director MOCK MODE — no EMERGENT_LLM_KEY")
        return _mock_revision(project, instruction, scope)
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=api_key, session_id="dir_" + uuid.uuid4().hex[:10], system_message=SYSTEM) \
        .with_model(AI_PROVIDER, AI_MODEL)
    ctx = build_context(project)
    resp = await chat.send_message(UserMessage(text=_prompt(ctx, instruction, scope)))
    data = parse_json(resp if isinstance(resp, str) else str(resp))
    data.setdefault("summary", instruction[:60])
    data.setdefault("runtime_delta", "+0s")
    data.setdefault("plan", [])
    data.setdefault("project_patch", {})
    data.setdefault("scene_patches", [])
    return data
