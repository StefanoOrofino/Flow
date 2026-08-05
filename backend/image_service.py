"""Provider-agnostic storyboard image-generation service.

Sprint 2: architecture-only. No external/paid providers are wired.
- IMAGE_PROVIDER=mock  -> returns a clearly-labelled SIMULATED frame (default, for testing the full flow)
- IMAGE_PROVIDER=none  -> returns a "Provider not configured" failed state

A real provider (e.g. Gemini Nano Banana, GPT Image 1) can be added later by
implementing ImageProvider.generate() and registering it in PROVIDERS, WITHOUT
touching the Storyboard editor or the API endpoints.
"""
import os
import uuid
import base64
from datetime import datetime, timezone

IMAGE_PROVIDER = os.environ.get("IMAGE_PROVIDER", "mock").lower()

# Generation status enum
STATUS_NOT_GENERATED = "Not Generated"
STATUS_QUEUED = "Queued"
STATUS_GENERATING = "Generating"
STATUS_COMPLETED = "Completed"
STATUS_FAILED = "Failed"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def _ratio_dims(aspect: str):
    m = {"16:9": (1600, 900), "9:16": (900, 1600), "1:1": (1200, 1200),
         "4:5": (960, 1200), "2.39:1": (1912, 800), "4:3": (1200, 900)}
    return m.get(aspect, (1600, 900))


def _placeholder_data_uri(label: str, aspect: str = "16:9", style: str = "") -> str:
    w, h = _ratio_dims(aspect)
    sub = (style or "Cinematic").strip()[:42]
    svg = f"""<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='#1c1810'/><stop offset='1' stop-color='#0a0a0a'/></linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<rect x='2%' y='4%' width='96%' height='92%' fill='none' stroke='#C5A059' stroke-opacity='0.35' stroke-width='3' stroke-dasharray='14 10'/>
<text x='50%' y='44%' fill='#C5A059' font-family='Georgia, serif' font-size='{int(h*0.075)}' text-anchor='middle'>{label}</text>
<text x='50%' y='56%' fill='#8a8578' font-family='Arial' font-size='{int(h*0.036)}' text-anchor='middle'>SIMULATED · {aspect} · {sub}</text>
</svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


class ImageProvider:
    name = "base"

    async def generate(self, prompt: str, opts: dict) -> dict:
        raise NotImplementedError


class NoneProvider(ImageProvider):
    """No provider configured — never calls out, returns a failed state."""
    name = "none"

    async def generate(self, prompt: str, opts: dict) -> dict:
        return {
            "status": STATUS_FAILED,
            "error_message": "Image provider not configured. Add server-side credentials to enable AI frame generation.",
            "image_url": "", "thumbnail_url": "",
            "provider": "none", "provider_job_id": "",
        }


class MockProvider(ImageProvider):
    """Development-only simulated provider. No external API calls, no credits."""
    name = "mock"

    async def generate(self, prompt: str, opts: dict) -> dict:
        uri = _placeholder_data_uri(
            opts.get("label", "STORYBOARD FRAME"),
            opts.get("aspect_ratio", "16:9"),
            opts.get("style_preset", ""),
        )
        return {
            "status": STATUS_COMPLETED,
            "error_message": "",
            "image_url": uri, "thumbnail_url": uri,
            "provider": "mock", "provider_job_id": "mock_" + uuid.uuid4().hex[:8],
        }


class GeminiProvider(ImageProvider):
    """Real Gemini Nano Banana image generation via the Emergent Universal Key (server-side only)."""
    name = "gemini"
    model = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview")

    async def generate(self, prompt: str, opts: dict) -> dict:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return {"status": STATUS_FAILED, "error_message": "EMERGENT_LLM_KEY not configured on the server.",
                    "image_url": "", "thumbnail_url": "", "provider": "gemini", "provider_job_id": ""}
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=api_key, session_id="img_" + uuid.uuid4().hex[:10],
                system_message="You are a professional cinematic storyboard concept artist. Render a single frame that matches the exact production specifications provided.",
            ).with_model("gemini", self.model).with_params(modalities=["image", "text"])
            _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
            if not images:
                return {"status": STATUS_FAILED, "error_message": "The model did not return an image. Please adjust the prompt and retry.",
                        "image_url": "", "thumbnail_url": "", "provider": "gemini", "provider_job_id": ""}
            img = images[0]
            data_uri = f"data:{img.get('mime_type', 'image/png')};base64,{img['data']}"
            return {"status": STATUS_COMPLETED, "error_message": "", "image_url": data_uri, "thumbnail_url": data_uri,
                    "provider": "gemini", "provider_job_id": "gem_" + uuid.uuid4().hex[:8]}
        except Exception as e:  # never create a broken version — surface the error, keep the prompt
            return {"status": STATUS_FAILED, "error_message": f"Image generation failed: {str(e)[:180]}",
                    "image_url": "", "thumbnail_url": "", "provider": "gemini", "provider_job_id": ""}


PROVIDERS = {"none": NoneProvider(), "mock": MockProvider(), "gemini": GeminiProvider()}


class OpenAIImageProvider(ImageProvider):
    """Real OpenAI GPT Image 1 generation via the Emergent Universal Key (server-side only)."""
    name = "openai"
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")

    async def generate(self, prompt: str, opts: dict) -> dict:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return {"status": STATUS_FAILED, "error_message": "EMERGENT_LLM_KEY not configured on the server.",
                    "image_url": "", "thumbnail_url": "", "provider": "openai", "provider_job_id": ""}
        try:
            from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
            gen = OpenAIImageGeneration(api_key=api_key)
            images = await gen.generate_images(prompt=prompt, model=self.model, number_of_images=1)
            if not images:
                return {"status": STATUS_FAILED, "error_message": "The model did not return an image. Please adjust the prompt and retry.",
                        "image_url": "", "thumbnail_url": "", "provider": "openai", "provider_job_id": ""}
            b64 = base64.b64encode(images[0]).decode("utf-8")
            data_uri = f"data:image/png;base64,{b64}"
            return {"status": STATUS_COMPLETED, "error_message": "", "image_url": data_uri, "thumbnail_url": data_uri,
                    "provider": "openai", "provider_job_id": "oai_" + uuid.uuid4().hex[:8]}
        except Exception as e:  # never create a broken version — surface the error, keep the prompt
            return {"status": STATUS_FAILED, "error_message": f"Image generation failed: {str(e)[:180]}",
                    "image_url": "", "thumbnail_url": "", "provider": "openai", "provider_job_id": ""}


PROVIDERS["openai"] = OpenAIImageProvider()

# User-selectable real models (surfaced in the UI). Order = display order.
REAL_MODELS = ["gemini", "openai"]
MODEL_META = {
    "gemini": {"id": "gemini", "label": "Gemini Nano Banana", "hint": "Fast, cinematic, painterly"},
    "openai": {"id": "openai", "label": "OpenAI GPT Image 1", "hint": "Photoreal, great for product & stills"},
}


def resolve_provider(model: str | None = None) -> ImageProvider:
    """Pick a concrete provider by user-chosen model, else fall back to the
    server default (IMAGE_PROVIDER). Only the real models can be user-selected."""
    if model in REAL_MODELS:
        return PROVIDERS[model]
    return get_provider()


def get_provider() -> ImageProvider:
    name = os.environ.get("IMAGE_PROVIDER", "mock").lower()
    return PROVIDERS.get(name, PROVIDERS["mock"])


def provider_configured() -> bool:
    return get_provider().name not in ("none",)


async def generate_image(prompt: str, opts: dict, model: str | None = None) -> dict:
    return await resolve_provider(model).generate(prompt, opts)


async def regenerate_image(prompt: str, opts: dict, model: str | None = None) -> dict:
    return await resolve_provider(model).generate(prompt, opts)


def get_generation_status(frame: dict) -> str:
    return (frame or {}).get("generation_status", STATUS_NOT_GENERATED)


def make_frame(scene: dict, project_id: str, result: dict, version: int, prompt: str, opts: dict) -> dict:
    return {
        "id": uuid.uuid4().hex[:10],
        "scene_id": scene.get("id"),
        "project_id": project_id,
        "image_url": result.get("image_url", ""),
        "thumbnail_url": result.get("thumbnail_url", ""),
        "prompt": prompt,
        "negative_prompt": opts.get("negative_prompt", ""),
        "style_preset": opts.get("style_preset", ""),
        "aspect_ratio": opts.get("aspect_ratio", "16:9"),
        "provider": result.get("provider", ""),
        "provider_job_id": result.get("provider_job_id", ""),
        "generation_status": result.get("status", STATUS_FAILED),
        "version": version,
        "error_message": result.get("error_message", ""),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
