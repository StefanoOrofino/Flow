import os, re, base64, asyncio, pathlib, uuid

ENV = pathlib.Path("/app/backend/.env").read_text()
m = re.search(r"EMERGENT_LLM_KEY=(.+)", ENV)
API_KEY = m.group(1).strip().strip('"').strip("'") if m else os.environ.get("EMERGENT_LLM_KEY", "")
MODEL = "gemini-3.1-flash-image-preview"
OUT = pathlib.Path("/app/frontend/assets/landing"); OUT.mkdir(parents=True, exist_ok=True)

SUFFIX = " Cinematic, shallow depth of field, warm gold-toned color grade, premium and professional, moody lighting, no text, no watermark, no readable logos, 16:9 widescreen."

PROMPTS = [
    ("feat1", "A film director in a dark control room with glowing monitors and a director's chair, warm ambient light, cinematic." + SUFFIX),
    ("feat2", "Neatly organized production brief documents and reference photos arranged on a dark desk, tidy and structured, warm light." + SUFFIX),
    ("feat3", "Hand-drawn storyboard sketch frames pinned in a grid on a cork board, a pencil resting nearby, warm cinematic light." + SUFFIX),
    ("feat4", "A film screenplay with printed pages and a fountain pen on a dark walnut desk, warm reading lamp glow." + SUFFIX),
    ("feat5", "A clipboard and tablet showing a film shot list on a movie set, camera blurred in the background, warm light." + SUFFIX),
    ("feat6", "Professional cinema camera, prime lenses and lighting gear laid out on a dark surface, premium product lighting." + SUFFIX),
    ("feat7", "A film crew silhouetted on set around a camera rig, warm backlight and haze, cinematic teamwork." + SUFFIX),
    ("feat8", "A production shooting schedule board with colored time blocks and sticky notes, warm cinematic light." + SUFFIX),
    ("feat9", "A film production budget spreadsheet on a laptop next to a calculator and stacked coins, premium warm light." + SUFFIX),
    ("feat10", "A laptop screen showing a sleek client review and approval interface with green checkmarks, dark room, warm glow." + SUFFIX),
    ("feat11", "A beautifully printed production presentation booklet fanned open on a dark desk, elegant binding, warm light." + SUFFIX),
]

async def gen(name, prompt):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=API_KEY, session_id="feat_"+uuid.uuid4().hex[:8],
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
