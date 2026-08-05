import os, re, base64, asyncio, pathlib, uuid

ENV = pathlib.Path("/app/backend/.env").read_text()
m = re.search(r"EMERGENT_LLM_KEY=(.+)", ENV)
API_KEY = m.group(1).strip().strip('"').strip("'") if m else os.environ.get("EMERGENT_LLM_KEY", "")
MODEL = "gemini-3.1-flash-image-preview"
OUT = pathlib.Path("/app/frontend/assets/landing"); OUT.mkdir(parents=True, exist_ok=True)

SUFFIX = " Cinematic film still, shallow depth of field, dramatic professional color grade, premium advertising commercial look, no text, no watermark, no readable logos, 16:9 widescreen."

# Varied premium commercial subjects: cars, motorcycles, product/beauty, fashion, lifestyle, food
PROMPTS = [
    ("feat1", "A luxury black sports car drifting on a wet race track, smoke and motion blur, dramatic side light." + SUFFIX),
    ("feat2", "A sport motorcycle leaning hard into a mountain-road corner at speed, motion blur, golden hour." + SUFFIX),
    ("feat3", "An elegant perfume bottle with a splash of liquid, luxury beauty commercial, studio lighting, dark backdrop." + SUFFIX),
    ("feat4", "Macro shot of a premium luxury wristwatch on a dark reflective surface, dramatic product lighting." + SUFFIX),
    ("feat5", "A stylish fashion model in cinematic streetwear at dusk in a modern city, editorial fashion shot." + SUFFIX),
    ("feat6", "A classic vintage convertible car parked on a cobblestone European street at golden hour, warm tones." + SUFFIX),
    ("feat7", "A high-end sneaker floating with dynamic splash, dramatic studio product lighting, dark background." + SUFFIX),
    ("feat8", "A sleek electric SUV charging outside a minimalist modern villa at night, cool cinematic tones." + SUFFIX),
    ("feat9", "A motorcycle rider silhouette against a neon-lit city street at night, reflections, moody cinematic." + SUFFIX),
    ("feat10", "A gourmet coffee pour into a cup with swirling cream, warm cozy commercial close-up, bokeh." + SUFFIX),
    ("feat11", "Aerial cinematic shot of a red convertible driving along a dramatic coastal cliff highway at sunset." + SUFFIX),
]

async def gen(name, prompt):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=API_KEY, session_id="featv_"+uuid.uuid4().hex[:8],
        system_message="You are a world-class advertising and automotive commercial photographer. Render a single premium cinematic film still.",
    ).with_model("gemini", MODEL).with_params(modalities=["image","text"])
    _t, imgs = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not imgs:
        print(f"[{name}] NO IMAGE"); return
    (OUT / f"{name}.jpg").write_bytes(base64.b64decode(imgs[0]["data"]))
    print(f"[{name}] saved")

async def main():
    print("KEY:", bool(API_KEY))
    for n, p in PROMPTS:
        try: await gen(n, p)
        except Exception as e: print(f"[{n}] ERR {e}")

asyncio.run(main())
