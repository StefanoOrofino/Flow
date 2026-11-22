"""Realistic "view from your seat" images.

Two sources, looked up per sector and row band (rows 1-5 = band 1, 6-10 = 2, 11-14 = 3):

1. Files you put in web/views/: real photos taken from the seats (the right choice for a live site)
   or images generated in advance. Names: "<sector>-<band>.jpg" (e.g. 104-2.jpg) or "<sector>.jpg"
   for the whole sector. jpg, png and webp are accepted.
2. On-demand generation: the store sends a capture of the 3D view from the seat and an image model
   turns it into a realistic picture with the same framing. The result is saved as
   "<sector>-<band>.ai.jpg", so each sector/band is generated once (at most ~200 images in total).

Generated images are labelled in the store as indicative, because a model can show a view that is
better than the real one (pillars, roof edges, nets).

Provider is chosen with VIEW_PROVIDER = gemini | openai | mock (mock returns the capture unchanged,
for tests). Without VIEW_PROVIDER it uses Gemini if GEMINI_API_KEY is set, else OpenAI if
OPENAI_API_KEY is set, else generation is off.
"""
from __future__ import annotations

import base64
import json
import os
import re
import threading
import urllib.error
import urllib.request
import uuid
from pathlib import Path

VIEWS_DIR = Path(os.environ.get("TICKETING_VIEWS_DIR", Path(__file__).resolve().parent.parent / "web" / "views"))
EXTS = (".jpg", ".jpeg", ".png", ".webp")
NAME = re.compile(r"(?P<key>\d{3}(?:-[1-3])?)(?P<ai>\.ai)?")
MAX_UPLOAD = 6 * 1024 * 1024
_lock = threading.Lock()


class ViewError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def band(row: int) -> int:
    return min(3, max(1, (row + 4) // 5))


def images() -> dict[str, dict]:
    """Available images by key ('104-2' or '104'). Real photos win over generated ones."""
    out: dict[str, dict] = {}
    if not VIEWS_DIR.is_dir():
        return out
    for f in sorted(VIEWS_DIR.iterdir()):
        if f.suffix.lower() not in EXTS:
            continue
        m = NAME.fullmatch(f.stem)
        if not m:
            continue
        key, ai = m["key"], bool(m["ai"])
        if key in out and not out[key]["ai"]:
            continue
        out[key] = {"url": f"views/{f.name}?v={int(f.stat().st_mtime)}", "ai": ai}
    return out


def provider_name() -> str | None:
    p = os.environ.get("VIEW_PROVIDER", "").strip().lower()
    if p:
        return p if p in ("gemini", "openai", "mock") else None
    if os.environ.get("GEMINI_API_KEY"):
        return "gemini"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    return None


def prompt(stand: str, area: str, ring: int, night: bool) -> str:
    when = ("at night under bright floodlights" if night else "on a sunny afternoon")
    return (
        "Turn this 3D render into a photorealistic photograph taken by a spectator sitting in this exact seat "
        f"at San Siro stadium in Milan, {when}, during a sold-out football match. "
        "Keep exactly the same camera position, viewpoint, perspective, framing and field of view. "
        "Keep the pitch lines, goals, stands, tiers, roof structure and the red roof trusses where they are. "
        f"The seat is in the {['first', 'second', 'third'][ring]} tier of the {stand} ({area} seats). "
        "Fill the stands with fans, add players on the pitch, realistic grass, lighting and atmosphere. "
        "No logos, no club crests, no sponsor names, no text, no watermark."
    )


def _decode_data_url(data_url: str) -> tuple[bytes, str]:
    m = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,(.+)", data_url.strip(), re.S)
    if not m:
        raise ViewError(422, "Immagine non valida: serve una data URL png, jpeg o webp")
    raw = base64.b64decode(m[2])
    if len(raw) > MAX_UPLOAD:
        raise ViewError(413, "Immagine troppo grande (massimo 6 MB)")
    return raw, m[1]


def _post(url: str, body: bytes, headers: dict, timeout: int = 120) -> dict:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        raise ViewError(502, f"Il servizio di immagini ha risposto {e.code}: {detail}")
    except (urllib.error.URLError, TimeoutError) as e:
        raise ViewError(502, f"Servizio di immagini non raggiungibile: {e}")


def _gemini(raw: bytes, mime: str, text: str) -> tuple[bytes, str]:
    key = os.environ.get("GEMINI_API_KEY") or ""
    model = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    body = {
        "contents": [{"parts": [{"text": text}, {"inline_data": {"mime_type": mime, "data": base64.b64encode(raw).decode()}}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    data = _post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                 json.dumps(body).encode(), {"Content-Type": "application/json", "x-goog-api-key": key})
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                out_mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                return base64.b64decode(inline["data"]), ".png" if "png" in out_mime else ".jpg"
    raise ViewError(502, "Il servizio di immagini non ha restituito un'immagine")


def _openai(raw: bytes, mime: str, text: str) -> tuple[bytes, str]:
    key = os.environ.get("OPENAI_API_KEY") or ""
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
    boundary = uuid.uuid4().hex
    ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
    parts = []
    for name, value in (("model", model), ("prompt", text), ("size", "1024x1536")):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="view.{ext}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
                 + raw + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    data = _post("https://api.openai.com/v1/images/edits", b"".join(parts),
                 {"Content-Type": f"multipart/form-data; boundary={boundary}", "Authorization": f"Bearer {key}"})
    try:
        return base64.b64decode(data["data"][0]["b64_json"]), ".png"
    except (KeyError, IndexError):
        raise ViewError(502, "Il servizio di immagini non ha restituito un'immagine")


def _mock(raw: bytes, mime: str, text: str) -> tuple[bytes, str]:
    return raw, ".png" if mime == "image/png" else ".jpg"


PROVIDERS = {"gemini": _gemini, "openai": _openai, "mock": _mock}


def generate(sector, row: int, data_url: str, night: bool) -> dict:
    """Return the image for this sector/band, generating it if it does not exist yet."""
    key = f"{sector.number}-{band(row)}"
    with _lock:  # one generation at a time: avoids paying twice for the same view
        have = images()
        if key in have:
            return {"key": key, **have[key], "cached": True}
        name = provider_name()
        if not name:
            raise ViewError(503, "Generazione delle viste non configurata: imposta GEMINI_API_KEY o OPENAI_API_KEY sul server")
        raw, mime = _decode_data_url(data_url)
        area = {"arancio": "orange", "rosso": "red", "blu": "blue", "verde": "green"}[sector.area]
        out, ext = PROVIDERS[name](raw, mime, prompt(sector.stand, area, sector.ring, night))
        VIEWS_DIR.mkdir(parents=True, exist_ok=True)
        (VIEWS_DIR / f"{key}.ai{ext}").write_bytes(out)
        return {"key": key, **images()[key], "cached": False}
