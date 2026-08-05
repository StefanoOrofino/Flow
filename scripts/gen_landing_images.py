import os
import re
import base64
import asyncio
import pathlib

# Load EMERGENT_LLM_KEY from backend/.env
ENV = pathlib.Path("/app/backend/.env").read_text()
m = re.search(r"EMERGENT_LLM_KEY=(.+)", ENV)
API_KEY = m.group(1).strip().strip('"').strip("'") if m else os.environ.get("EMERGENT_LLM_KEY", "")
MODEL = "gemini-3.1-flash-image-preview"

OUT = pathlib.Path("/app/frontend/assets/landing")
OUT.mkdir(parents=True, exist_ok=True)

SUFFIX = " Widescreen 16:9 cinematic film still, high-end automotive commercial, professional color grading, anamorphic, shallow depth of field, no text, no watermark, no logos."

PROMPTS = [
    ("frame1", "A sleek matte-black luxury sports car on a winding coastal mountain road at golden hour, dramatic warm sunlight, sweeping ocean in the background." + SUFFIX),
    ("frame2", "Interior close-up of a luxury car cockpit, driver's hands on a stitched leather steering wheel, warm ambient dashboard glow, dusk light through the windshield." + SUFFIX),
    ("frame3", "A premium luxury SUV driving through a neon-lit downtown at night, rain-slicked reflective streets, cinematic teal and amber color grade, moody atmosphere." + SUFFIX),
    ("frame4", "Extreme macro detail of a sports car headlight and chrome badge, glossy reflections, studio product lighting on a dark background, ultra premium." + SUFFIX),
    ("frame5", "Lifestyle scene: an elegant well-dressed couple stepping out of a convertible in front of a modern minimalist villa at sunset, warm cinematic tones." + SUFFIX),
    ("frame6", "Epic aerial drone shot of a silver sports car speeding along an empty desert highway, long dramatic shadows, vast landscape, golden hour." + SUFFIX),
]

async def gen_one(name, prompt):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import uuid
    chat = LlmChat(
        api_key=API_KEY, session_id="landing_" + uuid.uuid4().hex[:8],
        system_message="You are a professional cinematic automotive commercial photographer. Render a single premium film still.",
    ).with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        print(f"[{name}] NO IMAGE returned")
        return False
    data = base64.b64decode(images[0]["data"])
    ext = "png" if "png" in images[0].get("mime_type", "png") else "jpg"
    path = OUT / f"{name}.{ext}"
    path.write_bytes(data)
    print(f"[{name}] saved {path} ({len(data)} bytes)")
    return True

async def main():
    print("KEY present:", bool(API_KEY), "MODEL:", MODEL)
    for name, prompt in PROMPTS:
        try:
            await gen_one(name, prompt)
        except Exception as e:
            print(f"[{name}] ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
