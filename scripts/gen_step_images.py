import os, re, base64, asyncio, pathlib, uuid

ENV = pathlib.Path("/app/backend/.env").read_text()
m = re.search(r"EMERGENT_LLM_KEY=(.+)", ENV)
API_KEY = m.group(1).strip().strip('"').strip("'") if m else os.environ.get("EMERGENT_LLM_KEY", "")
MODEL = "gemini-3.1-flash-image-preview"
OUT = pathlib.Path("/app/frontend/assets/landing"); OUT.mkdir(parents=True, exist_ok=True)

SUFFIX = " Cinematic, shallow depth of field, warm gold-toned color grade, premium and professional, moody lighting, no text, no watermark, no readable logos, 16:9 widescreen."

PROMPTS = [
    ("step1", "Overhead flat-lay of a film production client brief: printed document pages, reference photos, a pen and a small camera on a dark walnut desk, warm side light." + SUFFIX),
    ("step2", "Close-up of a laptop screen in a dark studio showing a document being analyzed with glowing highlighted lines, warm amber accent light, bokeh." + SUFFIX),
    ("step3", "A filmmaker's hands reviewing storyboard notes on a tablet at a desk, approving with a stylus, warm desk-lamp glow, cinematic." + SUFFIX),
    ("step4", "A production planning wall covered with storyboard sketch frames and index cards, a director studying it, warm cinematic light." + SUFFIX),
    ("step5", "Two creative professionals collaborating over a laptop reviewing footage in a dark editing suite, warm screen glow on their faces." + SUFFIX),
    ("step6", "A beautifully printed production booklet and a stack of presentation pages fanned on a dark desk, premium binding, warm elegant light." + SUFFIX),
]

async def gen(name, prompt):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=API_KEY, session_id="step_"+uuid.uuid4().hex[:8],
        system_message="You are a professional cinematic production photographer. Render a single premium film still.",
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
