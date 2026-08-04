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
        'values for the SAME field, set "status":"conflict" and "conflict":{"hasConflict": true, "values": '
        '[{"document":"<fileName>","value":"<value>","evidenceSnippet":"<verbatim quote>"}]}. Do NOT pick one.\n'
        if multi else 'There is only one document, so "conflict" is always null.\n'
    )
    return f"""You are a STRICT DOCUMENT ANALYST performing fact extraction from a client brief.
You are given DOCUMENT TEXT and, when present, VISUAL REFERENCE IMAGES (attached in the listed order).

═══════════════ ABSOLUTE RULES (READ CAREFULLY) ═══════════════
1. Extract ONLY information EXPLICITLY stated in the documents. Quote the exact supporting passage.
2. Do NOT invent. Do NOT assume. Do NOT complete missing fields. Do NOT reinterpret vague text as fact.
3. Do NOT use general advertising/filmmaking knowledge to fill gaps.
4. Do NOT put creative recommendations (suggested mood, camera, lighting, crew, equipment, estimated budget,
   assumed deadline, inferred audience) into the extracted FIELDS. Those belong ONLY in "suggestions".
5. A field may be "found" ONLY if you can cite BOTH a sourceDocument AND a verbatim evidenceSnippet.
   If you cannot quote a supporting passage, the field is NOT found.

═══════════════ STATUS FOR EACH FIELD ═══════════════
- "found": explicitly stated. REQUIRES sourceDocument + evidenceSnippet (verbatim quote from the text).
- "missing": not present in any document → value MUST be null.
- "ambiguous": mentioned but unclear / multiple plausible readings → value null, fill "possibleValues": [..],
  and "extractionReason" explaining the ambiguity.
- "conflict": two documents disagree (see below).

PART A — TEXTUAL FIELDS (extract from DOCUMENTS only; do not infer from images):
{fields_desc}

PART B — VISUAL OBSERVATIONS (only what you literally SEE in the attached images; describe, never identify people):
{visual_desc}
These are observations/inferences from imagery, NOT document facts. Mark each with "status":"suggestion".

ATTACHED IMAGES (in order):
{img_list}

For EACH Part A field return an object:
{{
  "value": <verbatim or tightly-paraphrased string, or null>,
  "status": "found" | "missing" | "ambiguous" | "conflict",
  "confidence": "high" | "medium" | "low",
  "confidenceScore": 0-100,
  "sourceDocument": "<fileName>" or null,
  "sourceLocation": "<short location hint e.g. 'page 3' / 'Budget section'>" or null,
  "evidenceSnippet": "<EXACT quote from the document that supports the value>" or null,
  "extractionReason": "<why found/missing/ambiguous>",
  "possibleValues": [ ... ]  (only for ambiguous, else []),
  "conflict": null | {{"hasConflict": true, "values": [{{"document":"..","value":"..","evidenceSnippet":".."}}]}}
}}
For each Part B (visual) field return: {{ "value": <what you see, or null>, "status":"suggestion",
  "confidence": "...", "confidenceScore": 0-100, "sourceImage": "<image fileName>" or null,
  "evidenceSnippet": "<short visual note>", "extractionReason": "" }}

Separately, return "suggestions": creative recommendations you (the analyst) would propose — these are NOT facts.
Each suggestion: {{ "field": "<e.g. mood/camera_style/lighting/budget_estimate>", "value": "..", "rationale": ".." }}.
Only include suggestions that are genuinely helpful; do not duplicate extracted facts.

{conflict_rule}
DOCUMENTS:
{corpus}

Respond with ONLY valid JSON (no markdown), shaped EXACTLY:
{{ "fields": {{ {keys}: {{...}} }}, "visual": {{ {vkeys}: {{...}} }}, "suggestions": [ ... ] }}
Include EVERY listed key in BOTH "fields" and "visual"."""


def _band_from_score(score: int) -> str:
    if score >= 85:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def _norm_field(k: str, label: str, category: str, f: dict, kind: str = "fact") -> tuple:
    """Normalize one model field with STRICT evidence enforcement.

    kind="fact"  -> Part A document fields. A value is only accepted as "found" when the
                    model supplied a sourceDocument AND a verbatim evidenceSnippet. Otherwise it
                    is downgraded to "ambiguous" (value moved to possibleValues) so nothing
                    unsupported is ever presented as an extracted fact.
    kind="visual"-> Part B image observations, surfaced as AI suggestions (never document facts).
    """
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

    src_doc = f.get("sourceDocument") or ""
    src_img = f.get("sourceImage") or ""
    evidence = (f.get("evidenceSnippet") or f.get("sourceLocation") or "").strip()
    reason = (f.get("extractionReason") or f.get("extractionNotes") or "").strip()
    model_status = str(f.get("status") or "").lower()

    possible = []
    for pv in (f.get("possibleValues") or []):
        s = str(pv).strip()
        if s:
            possible.append(s)

    # conflict parsing
    conflict = f.get("conflict")
    conflict_values = []
    if isinstance(conflict, dict) and conflict.get("hasConflict"):
        for v in (conflict.get("values") or []):
            if isinstance(v, dict) and str(v.get("value", "")).strip():
                conflict_values.append({
                    "document": str(v.get("document") or ""),
                    "value": str(v.get("value")).strip(),
                    "evidenceSnippet": str(v.get("evidenceSnippet") or "").strip(),
                })
    has_conflict = len(conflict_values) >= 2

    if kind == "visual":
        # Image observations are AI suggestions — never "found" facts.
        status = "suggestion" if val else "missing"
        band = _band_from_score(score) if val else "low"
        obj = {
            "key": k, "label": label, "category": "Visual",
            "value": val if status == "suggestion" else "",
            "confidence": band, "confidenceScore": score if val else 0,
            "aiConfidence": band, "aiConfidenceScore": score if val else 0,
            "sourceDocument": "", "sourceImage": src_img,
            "sourceLocation": evidence, "evidenceSnippet": evidence,
            "extractionReason": reason, "extractionNotes": reason,
            "lowConfidenceReason": "", "suggestedCorrection": "", "possibleValues": [],
            "conflict": None, "status": status, "isSuggestion": True,
            "isUserEdited": False, "confirmed": False,
        }
        return obj, (score if val else 0), band, status

    # ---- fact fields: strict evidence gate --------------------------------
    if has_conflict:
        status = "conflict"
    elif not val:
        status = "missing"
    elif model_status == "ambiguous":
        status = "ambiguous"
    elif not (src_doc and evidence):
        # Value given but NOT backed by a cited passage → cannot be a fact.
        status = "ambiguous"
        if val and val not in possible:
            possible.insert(0, val)
        if not reason:
            reason = "No supporting passage was cited, so this value could not be verified against the documents."
    else:
        status = "found"

    if status in ("missing", "ambiguous", "conflict"):
        display_val = ""      # never present an unverified value as a fact
    else:
        display_val = val

    if status == "missing":
        score = 0
    band = _band_from_score(score) if display_val else "low"

    obj = {
        "key": k, "label": label, "category": category,
        "value": display_val,
        "confidence": band, "confidenceScore": score if display_val else (score if status in ("ambiguous", "conflict") else 0),
        "aiConfidence": band, "aiConfidenceScore": score,
        "sourceDocument": src_doc,
        "sourceImage": "",
        "sourceLocation": f.get("sourceLocation") or "",
        "evidenceSnippet": evidence,
        "extractionReason": reason,
        "extractionNotes": reason,
        "lowConfidenceReason": reason if band == "low" else "",
        "suggestedCorrection": "",
        "possibleValues": possible if status == "ambiguous" else [],
        "conflict": {"hasConflict": True, "values": conflict_values} if has_conflict else None,
        "status": status, "isSuggestion": False,
        "isUserEdited": False, "confirmed": False,
    }
    return obj, score, band, status


def normalize_analysis(raw: dict, docs: list) -> dict:
    raw = raw or {}
    fields_in = raw.get("fields", {}) if isinstance(raw, dict) else {}
    visual_in = raw.get("visual", {}) if isinstance(raw, dict) else {}
    suggestions_in = raw.get("suggestions", []) if isinstance(raw, dict) else []

    out_fields, out_visual = {}, {}
    found = ambiguous = conflicts = missing = score_sum = 0
    conf_counts = {"high": 0, "medium": 0, "low": 0}

    for k, label in BRIEF_FIELDS:
        obj, score, band, status = _norm_field(k, label, FIELD_CATEGORY.get(k, "Other"), fields_in.get(k), "fact")
        out_fields[k] = obj
        if status == "found":
            found += 1
            conf_counts[band] += 1
            score_sum += score
        elif status == "ambiguous":
            ambiguous += 1
        elif status == "conflict":
            conflicts += 1
        else:
            missing += 1

    suggestions_count = 0
    for k, label in VISUAL_FIELDS:
        obj, score, band, status = _norm_field(k, label, "Visual", visual_in.get(k), "visual")
        out_visual[k] = obj
        if status == "suggestion":
            suggestions_count += 1

    # Explicit creative suggestions (kept entirely separate from extracted facts).
    suggestions = []
    for s in (suggestions_in or []):
        if not isinstance(s, dict):
            continue
        v = str(s.get("value") or "").strip()
        if not v:
            continue
        suggestions.append({
            "field": str(s.get("field") or "").strip() or "suggestion",
            "value": v,
            "rationale": str(s.get("rationale") or "").strip(),
        })

    overall = round(score_sum / found) if found else 0
    total = len(BRIEF_FIELDS)
    return {
        "fields": out_fields,
        "visual": out_visual,
        "suggestions": suggestions,
        "summary": {
            "totalFields": total, "fieldsFound": found,
            "fieldsMissing": missing, "fieldsAmbiguous": ambiguous, "conflicts": conflicts,
            "visualFound": suggestions_count, "suggestionsCount": len(suggestions),
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
    "You are a strict document analyst. Your task is to extract facts from uploaded client brief documents. "
    "You must NOT invent, infer beyond the evidence, or complete missing information. You must NOT use general "
    "filmmaking knowledge to fill gaps. Every returned fact value must be grounded in a cited source passage "
    "quoted verbatim from the documents. If a value is not explicitly present, return it as missing. Return ONLY strict JSON."
)

# Fields that must NEVER be creatively invented — only extracted if explicitly stated.
_NO_INVENT = {
    "target_audience", "budget", "deadline", "duration", "aspect_ratio", "platforms",
    "tone_of_voice", "locations", "technical_requirements", "constraints",
}

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

    # NOTE: Image-derived visual observations are AI SUGGESTIONS, not confirmed brief facts,
    # so they are NOT auto-applied to project creative fields (mood/visual_style). They remain
    # available in the analysis for the user; the generation step proposes creative direction.

    restr = " ".join(x for x in [_pick(fields, "legal_notes"), _pick(fields, "constraints"),
                                 _pick(fields, "mandatory_requirements")] if x).strip()
    if restr:
        payload["restrictions"] = restr[:500]

    extra_bits = []
    for k, lbl in [("problem", "Problem"), ("success_metrics", "Success Metrics"),
                   ("competitors", "Competitors"), ("risks", "Risks"), ("deadline", "Deadline"),
                   ("products", "Products"), ("technical_requirements", "Tech"),
                   ("assets_required", "Assets"), ("tone_of_voice", "Tone")]:
        v = _pick(fields, k)
        if v:
            extra_bits.append(f"{lbl}: {v}")
    if extra_bits:
        payload["extra_notes"] = " • ".join(extra_bits)[:1000]
    return payload
