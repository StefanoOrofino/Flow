import os, re, asyncio, pathlib

ENV = pathlib.Path("/app/backend/.env").read_text()
m = re.search(r"EMERGENT_LLM_KEY=(.+)", ENV)
API_KEY = m.group(1).strip().strip('"').strip("'") if m else os.environ.get("EMERGENT_LLM_KEY", "")

OUT = pathlib.Path("/app/frontend/assets/landing/audio"); OUT.mkdir(parents=True, exist_ok=True)
VOICE = "nova"  # bright, energetic

INSTRUCTIONS = (
    "Voice: bright, cheerful and friendly. "
    "Delivery: fluid and energetic, smooth and natural, never robotic. "
    "Emphasis: crisp and incisive on the key words. "
    "Tone: confident, warm and inviting, like a polished, exciting product-launch narrator. "
    "Pace: lively but clear."
)

CLIPS = {
    "en_1": "It all starts with your brief. Just drop in your PDFs, documents, and reference images.",
    "en_2": "FrameFlow's AI reads every single page and pulls out the key facts, each one backed by a source.",
    "en_3": "You review and confirm. Nothing is invented, and every detail is cited.",
    "en_4": "And in just minutes, you get a complete production package: concept, script, storyboard, and shot list!",
    "it_1": "Tutto parte dal tuo brief. Trascina semplicemente i tuoi PDF, i documenti e le immagini di riferimento.",
    "it_2": "L'intelligenza artificiale di FrameFlow legge ogni singola pagina ed estrae i dati chiave, ciascuno con la sua fonte.",
    "it_3": "Tu revisioni e confermi. Niente è inventato, e ogni dettaglio è citato.",
    "it_4": "E in pochi minuti ottieni un pacchetto di produzione completo: concept, sceneggiatura, storyboard e shot list!",
}

async def main():
    from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
    from litellm import speech
    helper = OpenAITextToSpeech(api_key=API_KEY)
    use_emergent = helper._is_emergent_key(API_KEY)
    print("KEY:", bool(API_KEY), "emergent:", use_emergent, "proxy:", getattr(helper, "emergent_proxy_url", None))

    def gen_advanced(text):
        params = {
            "model": "openai/gpt-4o-mini-tts",
            "input": text,
            "voice": VOICE,
            "api_key": API_KEY,
            "instructions": INSTRUCTIONS,
        }
        if use_emergent:
            params["api_base"] = helper.emergent_proxy_url
            params["custom_llm_provider"] = "openai"
            if getattr(helper, "custom_headers", None):
                params["extra_headers"] = helper.custom_headers
        resp = speech(**params)
        return resp.content if hasattr(resp, "content") else (resp.read() if hasattr(resp, "read") else bytes(resp))

    # Test advanced model once
    advanced_ok = True
    try:
        _ = gen_advanced("Test.")
        print("gpt-4o-mini-tts OK")
    except Exception as e:
        advanced_ok = False
        print("gpt-4o-mini-tts FAILED -> fallback tts-1-hd/nova speed 1.08:", str(e)[:200])

    for name, text in CLIPS.items():
        try:
            if advanced_ok:
                audio = gen_advanced(text)
            else:
                audio = await helper.generate_speech(text=text, model="tts-1-hd", voice=VOICE, speed=1.08, response_format="mp3")
            (OUT / f"{name}.mp3").write_bytes(audio)
            print(f"[{name}] saved {len(audio)} bytes")
        except Exception as e:
            print(f"[{name}] ERR {e}")

asyncio.run(main())
