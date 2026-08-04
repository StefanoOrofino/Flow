"""Model-agnostic AI configuration.

Every AI module (brief analysis, director, generation, script, image prompts)
resolves its provider+model here. Defaults come from AI_PROVIDER / AI_MODEL, but
each module can be overridden independently via env — so switching a model is a
configuration change, never a code change.
"""
import os

DEFAULT_PROVIDER = os.environ.get("AI_PROVIDER", "openai")
DEFAULT_MODEL = os.environ.get("AI_MODEL", "gpt-5.4")

# module -> (provider_env_var, model_env_var)
_MODULE_ENV = {
    "brief": ("BRIEF_AI_PROVIDER", "BRIEF_AI_MODEL"),
    "director": ("DIRECTOR_AI_PROVIDER", "DIRECTOR_AI_MODEL"),
    "generation": ("GEN_AI_PROVIDER", "GEN_AI_MODEL"),
    "script": ("SCRIPT_AI_PROVIDER", "SCRIPT_AI_MODEL"),
    "image_prompt": ("IMGP_AI_PROVIDER", "IMGP_AI_MODEL"),
}


def get_ai_config(module: str = "") -> tuple[str, str]:
    """Return (provider, model) for a module, falling back to global defaults."""
    prov_env, model_env = _MODULE_ENV.get(module, (None, None))
    provider = (os.environ.get(prov_env) if prov_env else None) or DEFAULT_PROVIDER
    model = (os.environ.get(model_env) if model_env else None) or DEFAULT_MODEL
    return provider, model
