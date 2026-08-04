"""Client Brief extraction + AI analysis (Run 1: upload -> extract -> analyze).

Extracts text from PDF/DOCX/PPTX/TXT/RTF, then asks the LLM to produce a
structured, provider-agnostic brief model with per-field confidence + source.
No project is generated here — this only returns the analysis contract.
"""
import io
import re
import json
import logging
import unicodedata

logger = logging.getLogger("brief")

MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file
MAX_TEXT = 60_000            # cap extracted text length fed to the model

# extension -> (parser key, accepted magic signatures)
SUPPORTED = {
    "pdf": "pdf", "docx": "docx", "pptx": "pptx", "txt": "txt", "rtf": "rtf",
}

# Ordered field contract consumed directly by the frontend + Run 2.
BRIEF_FIELDS = [
    ("project_name", "Project Name"),
    ("client", "Client"), ("brand", "Brand"), ("campaign", "Campaign"),
    ("objective", "Objective"), ("problem", "Problem"), ("target_audience", "Target Audience"),
    ("key_message", "Key Messages"), ("call_to_action", "Call to Action"), ("tone_of_voice", "Tone of Voice"),
    ("deliverables", "Deliverables"), ("assets_required", "Assets Required"),
    ("platforms", "Platforms"), ("duration", "Duration"), ("aspect_ratio", "Aspect Ratio"),
    ("budget", "Budget"), ("deadline", "Deadlines"),
    ("technical_requirements", "Technical Requirements"), ("constraints", "Constraints"),
    ("locations", "Locations"), ("products", "Products"),
    ("mandatory_requirements", "Mandatory Requirements"), ("legal_notes", "Legal Notes"),
    ("brand_guidelines", "Brand Guidelines"), ("references", "References"),
    ("competitors", "Competitors"), ("success_metrics", "Success Metrics"), ("risks", "Risks"),
]

# Image-derived visual analysis contract (Visual Analysis review section).
VISUAL_FIELDS = [
    ("mood", "Mood"), ("style", "Visual Style"), ("colors", "Color Palette"),
    ("composition", "Composition"), ("lighting", "Lighting"), ("camera", "Camera Style"),
    ("editing", "Editing Style"), ("framing", "Framing"), ("brand_identity", "Brand Identity"),
    ("typography", "Typography"), ("aesthetic", "Overall Aesthetic"),
    ("references_detected", "Visual References Detected"),
]

FIELD_CATEGORY = {
    "project_name": "Project", "client": "Client & Brand", "brand": "Client & Brand", "campaign": "Client & Brand",
    "objective": "Strategy", "problem": "Strategy", "target_audience": "Strategy",
    "key_message": "Strategy", "call_to_action": "Strategy", "tone_of_voice": "Strategy",
    "deliverables": "Production", "assets_required": "Production", "platforms": "Production",
    "duration": "Production", "aspect_ratio": "Production", "budget": "Production",
    "deadline": "Production", "technical_requirements": "Production",
    "locations": "Production", "products": "Production",
    "mandatory_requirements": "Requirements", "legal_notes": "Requirements",
    "brand_guidelines": "Requirements", "constraints": "Requirements",
    "references": "Creative",
    "competitors": "Insights", "success_metrics": "Insights", "risks": "Insights",
}


def _normalize(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # collapse 3+ blank lines but keep intentional paragraph breaks
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()[:MAX_TEXT]


class ExtractError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _detect_ext(filename: str) -> str:
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    if ext not in SUPPORTED:
        raise ExtractError("unsupported_file_type", f"Unsupported file type: .{ext or '?'}")
    return ext


def _check_signature(ext: str, data: bytes):
    sig = data[:8]
    if ext == "pdf" and not data[:5].startswith(b"%PDF"):
        raise ExtractError("corrupted_file", "Not a valid PDF file.")
    if ext in ("docx", "pptx") and not sig.startswith(b"PK\x03\x04"):
        raise ExtractError("corrupted_file", f"Not a valid {ext.upper()} (zip) file.")


def _extract_pdf(data: bytes):
    from pypdf import PdfReader
    warnings = []
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as e:
        if "password" in str(e).lower() or getattr(reader, "is_encrypted", False):
            raise ExtractError("password_protected", "This PDF is password-protected.")
        raise ExtractError("corrupted_file", "Could not open the PDF file.")
    if getattr(reader, "is_encrypted", False):
        try:
            reader.decrypt("")
        except Exception:
            raise ExtractError("password_protected", "This PDF is password-protected.")
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            parts.append("")
    text = "\n\n".join(parts)
    if len(text.strip()) < 15:
        warnings.append("no_selectable_text")
    return text, warnings, len(reader.pages)


def _extract_docx(data: bytes):
    from docx import Document
    try:
        doc = Document(io.BytesIO(data))
    except Exception:
        raise ExtractError("corrupted_file", "Could not open the DOCX file.")
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts), [], None


def _extract_pptx(data: bytes):
    from pptx import Presentation
    try:
        prs = Presentation(io.BytesIO(data))
    except Exception:
        raise ExtractError("corrupted_file", "Could not open the PPTX file.")
    parts = []
    for i, slide in enumerate(prs.slides, 1):
        parts.append(f"--- Slide {i} ---")
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    line = "".join(run.text for run in para.runs)
                    if line.strip():
                        parts.append(line)
    return "\n".join(parts), [], len(prs.slides)


def _extract_rtf(data: bytes):
    from striprtf.striprtf import rtf_to_text
    try:
        raw = data.decode("utf-8", errors="ignore")
        return rtf_to_text(raw), [], None
    except Exception:
        raise ExtractError("corrupted_file", "Could not read the RTF file.")


def _extract_txt(data: bytes):
    if data.startswith(b"\xef\xbb\xbf"):
        data = data[3:]
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc), [], None
        except Exception:
            continue
    raise ExtractError("extraction_failed", "Could not decode the text file.")


def extract_document(filename: str, data: bytes) -> dict:
    """Returns metadata + normalized text. Raises ExtractError with a code."""
    if len(data) > MAX_BYTES:
        raise ExtractError("file_too_large", "File exceeds the 5 MB limit.")
    ext = _detect_ext(filename)
    _check_signature(ext, data)
    fn = {"pdf": _extract_pdf, "docx": _extract_docx, "pptx": _extract_pptx,
          "rtf": _extract_rtf, "txt": _extract_txt}[ext]
    text, warnings, pages = fn(data)
    text = _normalize(text)
    if not text and "no_selectable_text" not in warnings:
        warnings.append("no_extractable_text")
    words = len(text.split())
    return {
        "fileName": filename, "fileType": ext.upper(), "fileSize": len(data),
        "parserUsed": ext, "pageCount": pages, "charCount": len(text),
        "wordCount": words, "warnings": warnings, "text": text,
    }


def build_analysis_prompt(docs: list, images: list) -> str:
    fields_desc = "\n".join(f'  - {k} ({label})' for k, label in BRIEF_FIELDS)
    visual_desc = "\n".join(f'  - {k} ({label})' for k, label in VISUAL_FIELDS)
    corpus = "\n\n".join(
        f"=== DOCUMENT: {d['fileName']} ({d['fileType']}) ===\n{d['text'] or '[no extractable text]'}"
        for d in docs
    )[:MAX_TEXT] or "[No documents were provided — rely on the attached images.]"
    img_list = "\n".join(f"  - IMAGE {i+1}: {im['fileName']}" for i, im in enumerate(images)) or "  [none]"
    keys = ", ".join(f'"{k}"' for k, _ in BRIEF_FIELDS)
    vkeys = ", ".join(f'"{k}"' for k, _ in VISUAL_FIELDS)
    multi = len(docs) > 1
    conflict_rule = (
        'CONFLICT DETECTION: Multiple documents were provided. If two or more documents state DIFFERENT '
        'values for the same field, set "conflict" to {"hasConflict": true, "values": '
        '[{"document":"<fileName>","value":"<value>"}]}. Otherwise "conflict" is null.\n'
        if multi else 'Set "conflict" to null.\n'
    )
    return f"""You are a senior advertising producer + art director analyzing a client brief.
You are given DOCUMENT TEXT and, when present, VISUAL REFERENCE IMAGES (attached to this message, in the listed order).
Analyze BOTH together. Extract ONLY information actually present. NEVER invent values. If a field is absent set value to null, confidence "low", confidenceScore 0.

PART A — TEXTUAL FIELDS (from documents; images may reinforce):
{fields_desc}

PART B — VISUAL ANALYSIS (primarily from the attached images):
{visual_desc}
For visual fields, describe what you actually SEE across the images (people only as visual subjects, never identity). "colors" = a short palette description (e.g. "warm amber, deep charcoal, cream").

ATTACHED IMAGES (in order):
{img_list}

For EACH field (Part A and Part B) return an object:
- "value": concise string (or null)
- "confidence": "high" | "medium" | "low"
- "confidenceScore": integer 0-100 (85-100 high, 60-84 medium, 0-59 low)
- "sourceDocument": fileName it came from (or null)
- "sourceImage": image fileName it came from (or null)
- "sourceLocation": SHORT verbatim snippet or brief visual note (<=140 chars) (or null)
- "extractionNotes": short note if ambiguous (or "")
- "lowConfidenceReason": short reason if confidence is not high (or "")
- "suggestedCorrection": a likely value if inferable (or null)
- "conflict": null OR {{"hasConflict": true, "values": [{{"document":"<fileName>","value":"<value>"}}]}}

{conflict_rule}
DOCUMENTS:
{corpus}

Respond with ONLY valid JSON, no markdown, shaped exactly:
{{ "fields": {{ {keys}: {{...}} }}, "visual": {{ {vkeys}: {{...}} }} }}
Include EVERY listed key in BOTH objects."""


def _band_from_score(score: int) -> str:
    if score >= 85:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def _norm_field(k: str, label: str, category: str, f: dict) -> tuple:
    f = f or {}
    val = f.get("value")
    if isinstance(val, (list, dict)):
        val = json.dumps(val, ensure_ascii=False) if isinstance(val, dict) else ", ".join(str(x) for x in val)
    val = (str(val).strip() if val not in (None, "", "null") else "")
    try:
        score = int(round(float(f.get("confidenceScore"))))
    except (TypeError, ValueError):
        lbl = str(f.get("confidence", "low")).lower()
        score = {"high": 92, "medium": 72, "low": 30}.get(lbl, 30)
    score = max(0, min(100, score))
    if not val:
        score = 0
    band = _band_from_score(score) if val else "low"

    conflict = f.get("conflict")
    conflict_values = []
    if isinstance(conflict, dict) and conflict.get("hasConflict"):
        for v in (conflict.get("values") or []):
            if isinstance(v, dict) and str(v.get("value", "")).strip():
                conflict_values.append({"document": str(v.get("document") or ""),
                                        "value": str(v.get("value")).strip()})
    has_conflict = len(conflict_values) >= 2

    status = "conflict" if (val and has_conflict) else ("found" if val else "missing")
    obj = {
        "key": k, "label": label, "category": category,
        "value": val, "confidence": band, "confidenceScore": score,
        "aiConfidence": band, "aiConfidenceScore": score,
        "sourceDocument": f.get("sourceDocument") or "",
        "sourceImage": f.get("sourceImage") or "",
        "sourceLocation": f.get("sourceLocation") or "",
        "extractionNotes": f.get("extractionNotes") or "",
        "lowConfidenceReason": f.get("lowConfidenceReason") or "",
        "suggestedCorrection": (str(f.get("suggestedCorrection")).strip()
                                if f.get("suggestedCorrection") not in (None, "", "null") else ""),
        "conflict": {"hasConflict": True, "values": conflict_values} if has_conflict else None,
        "status": status, "isUserEdited": False, "confirmed": False,
    }
    return obj, score, band, status


def normalize_analysis(raw: dict, docs: list) -> dict:
    raw = raw or {}
    fields_in = raw.get("fields", {}) if isinstance(raw, dict) else {}
    visual_in = raw.get("visual", {}) if isinstance(raw, dict) else {}

    out_fields, out_visual = {}, {}
    present = conflicts = score_sum = 0
    conf_counts = {"high": 0, "medium": 0, "low": 0}

    for k, label in BRIEF_FIELDS:
        obj, score, band, status = _norm_field(k, label, FIELD_CATEGORY.get(k, "Other"), fields_in.get(k))
        out_fields[k] = obj
        if obj["value"]:
            present += 1
            conf_counts[band] += 1
            score_sum += score
        if status == "conflict":
            conflicts += 1

    visual_present = 0
    for k, label in VISUAL_FIELDS:
        obj, score, band, status = _norm_field(k, label, "Visual", visual_in.get(k))
        out_visual[k] = obj
        if obj["value"]:
            visual_present += 1
            present += 1
            conf_counts[band] += 1
            score_sum += score

    overall = round(score_sum / present) if present else 0
    total = len(BRIEF_FIELDS) + len(VISUAL_FIELDS)
    return {
        "fields": out_fields,
        "visual": out_visual,
        "summary": {
            "totalFields": total, "fieldsFound": present,
            "fieldsMissing": total - present, "conflicts": conflicts,
            "visualFound": visual_present,
            "confidence": conf_counts, "overallConfidence": overall,
        },
    }


def mock_analysis(docs: list) -> dict:
    """Heuristic fallback when no LLM key is configured or the AI call fails."""
    note = "MOCK — add LLM balance for real analysis"
    raw = {"fields": {}, "visual": {}}
    for k, _ in BRIEF_FIELDS:
        raw["fields"][k] = {"value": None, "confidence": "low", "confidenceScore": 0, "extractionNotes": note}
    for k, _ in VISUAL_FIELDS:
        raw["visual"][k] = {"value": None, "confidence": "low", "confidenceScore": 0, "extractionNotes": note}
    return normalize_analysis(raw, docs)


SYSTEM = (
    "You are a meticulous senior advertising producer and art director. You extract structured brief data "
    "from client documents AND visual reference images. You NEVER invent information and return ONLY strict JSON."
)

MAX_IMAGES = 6


async def analyze_brief(docs: list, images: list | None = None) -> tuple:
    """Run multimodal LLM brief analysis (documents + images).

    Returns (normalized_analysis, mock_mode).
    """
    import os
    import uuid
    from ai_config import get_ai_config
    images = images or []
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.warning("Brief analysis MOCK MODE — no EMERGENT_LLM_KEY")
        return mock_analysis(docs), True
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        provider, model = get_ai_config("brief")
        chat = LlmChat(api_key=api_key, session_id="brief_" + uuid.uuid4().hex[:10],
                       system_message=SYSTEM).with_model(provider, model)
        file_contents = [ImageContent(image_base64=im["base64"]) for im in images[:MAX_IMAGES]]
        msg = UserMessage(text=build_analysis_prompt(docs, images[:MAX_IMAGES]),
                          file_contents=file_contents or None)
        resp = await chat.send_message(msg)
        text = (resp if isinstance(resp, str) else str(resp)).strip()
        text = re.sub(r"^```(json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("No JSON object in AI response")
        raw = json.loads(text[start:end + 1])
        return normalize_analysis(raw, docs), False
    except Exception as e:
        logger.warning(f"Brief analysis failed, using mock fallback: {e}")
        return mock_analysis(docs), True


# brief field key -> project field (ProjectIn) for generation.
_BRIEF_TO_PROJECT = {
    "client": "client", "brand": "brand", "campaign": "campaign",
    "objective": "goal", "target_audience": "target_audience",
    "key_message": "key_message", "call_to_action": "call_to_action",
    "deliverables": "deliverables", "duration": "duration", "aspect_ratio": "aspect_ratio",
    "budget": "budget", "locations": "location_type", "references": "references",
}


def _pick(fields: dict, k: str) -> str:
    f = fields.get(k) if isinstance(fields, dict) else None
    if isinstance(f, dict):
        return str(f.get("value") or "").strip()
    return str(f or "").strip()


def map_brief_to_project(fields: dict, visual: dict | None = None) -> dict:
    """Map reviewed brief + visual analysis -> ProjectIn-compatible payload."""
    fields = fields or {}
    visual = visual or {}
    payload = {}
    for bkey, pkey in _BRIEF_TO_PROJECT.items():
        v = _pick(fields, bkey)
        if v and not payload.get(pkey):
            payload[pkey] = v

    platforms = _pick(fields, "platforms")
    if platforms:
        payload["platform"] = re.split(r"[,\n/]", platforms)[0].strip()

    title = _pick(fields, "project_name") or _pick(fields, "campaign") or _pick(fields, "client") or _pick(fields, "objective")
    payload["title"] = (title[:80] if title else "Untitled Brief Project")

    if not payload.get("goal"):
        desc = _pick(fields, "description")
        if desc:
            payload["goal"] = desc

    # visual analysis -> creative direction
    mood = _pick(visual, "mood")
    if mood:
        payload["mood"] = mood[:60]
    style = _pick(visual, "style")
    if style:
        payload["visual_style"] = style[:60]

    restr = " ".join(x for x in [_pick(fields, "legal_notes"), _pick(fields, "constraints"),
                                 _pick(fields, "mandatory_requirements")] if x).strip()
    if restr:
        payload["restrictions"] = restr[:500]

    extra_bits = []
    for k, lbl in [("problem", "Problem"), ("success_metrics", "Success Metrics"),
                   ("competitors", "Competitors"), ("risks", "Risks"), ("deadline", "Deadline"),
                   ("products", "Products"), ("technical_requirements", "Tech"),
                   ("assets_required", "Assets"), ("tone_of_voice", "Tone"),
                   ("project_type", "Type"), ("creative_direction", "Creative Direction"),
                   ("shoot_date", "Shoot Date"), ("assets_available", "Assets Available"),
                   ("internal_notes", "Notes")]:
        v = _pick(fields, k)
        if v:
            extra_bits.append(f"{lbl}: {v}")
    for k, lbl in [("colors", "Palette"), ("lighting", "Lighting"), ("camera", "Camera"),
                   ("editing", "Editing"), ("aesthetic", "Aesthetic")]:
        v = _pick(visual, k)
        if v:
            extra_bits.append(f"{lbl}: {v}")
    if extra_bits:
        payload["extra_notes"] = " • ".join(extra_bits)[:1000]
    return payload
