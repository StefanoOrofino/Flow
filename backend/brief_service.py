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
    ("client", "Client"), ("brand", "Brand"), ("campaign", "Campaign"),
    ("objective", "Objective"), ("problem", "Problem"), ("target_audience", "Target Audience"),
    ("key_message", "Key Message"), ("call_to_action", "Call to Action"), ("tone_of_voice", "Tone of Voice"),
    ("deliverables", "Deliverables"), ("platforms", "Platforms"), ("duration", "Duration"),
    ("aspect_ratio", "Aspect Ratio"), ("budget", "Budget"), ("deadline", "Deadline"),
    ("locations", "Locations"), ("products", "Products"), ("mandatory_requirements", "Mandatory Requirements"),
    ("legal_notes", "Legal Notes"), ("brand_guidelines", "Brand Guidelines"), ("references", "References"),
    ("mood", "Mood"), ("visual_style", "Visual Style"), ("competitors", "Competitors"),
    ("success_metrics", "Success Metrics"), ("risks", "Risks"), ("constraints", "Constraints"),
]

FIELD_CATEGORY = {
    "client": "Client & Brand", "brand": "Client & Brand", "campaign": "Client & Brand",
    "objective": "Strategy", "problem": "Strategy", "target_audience": "Strategy",
    "key_message": "Strategy", "call_to_action": "Strategy", "tone_of_voice": "Strategy",
    "deliverables": "Production", "platforms": "Production", "duration": "Production",
    "aspect_ratio": "Production", "budget": "Production", "deadline": "Production",
    "locations": "Production", "products": "Production",
    "mandatory_requirements": "Requirements", "legal_notes": "Requirements",
    "brand_guidelines": "Requirements", "constraints": "Requirements",
    "references": "Creative", "mood": "Creative", "visual_style": "Creative",
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


def build_analysis_prompt(docs: list) -> str:
    fields_desc = "\n".join(f'  - {k} ({label})' for k, label in BRIEF_FIELDS)
    corpus = "\n\n".join(
        f"=== DOCUMENT: {d['fileName']} ({d['fileType']}) ===\n{d['text'] or '[no extractable text]'}"
        for d in docs
    )[:MAX_TEXT]
    keys = ", ".join(f'"{k}"' for k, _ in BRIEF_FIELDS)
    multi = len(docs) > 1
    conflict_rule = (
        'CONFLICT DETECTION: Multiple documents were provided. If two or more documents state DIFFERENT '
        'values for the same field, set "conflict" to an object {"hasConflict": true, "values": '
        '[{"document": "<fileName>", "value": "<value in that doc>"}]} listing each conflicting value. '
        'When there is no conflict, set "conflict" to null.\n'
        if multi else 'Only one document was provided; always set "conflict" to null.\n'
    )
    return f"""You are a senior advertising producer analyzing one or more client brief documents.
Extract ONLY information actually present. NEVER invent values. If a field is not present, set value to null, confidence to "low" and confidenceScore to 0.

Extract these fields:
{fields_desc}

For EACH field return an object with:
- "value": the extracted value as a concise string (or null if absent)
- "confidence": "high" | "medium" | "low"  (based on EVIDENCE quality in the documents, not your own certainty)
- "confidenceScore": integer 0-100. Use 85-100 for high (explicit, unambiguous), 60-84 for medium (implied/partial), 0-59 for low/absent.
- "sourceDocument": the fileName the value came from (or null)
- "sourceLocation": a SHORT verbatim snippet (<=140 chars) from the document supporting the value (or null)
- "extractionNotes": brief note if ambiguous/merged (or "")
- "lowConfidenceReason": if confidence is low/medium, a SHORT reason why (e.g. "implied, not explicitly stated") else ""
- "suggestedCorrection": if the value looks incomplete or you can infer a likely intended value, a short suggestion else null
- "conflict": null OR {{"hasConflict": true, "values": [{{"document": "<fileName>", "value": "<value>"}}]}}

{conflict_rule}
DOCUMENTS:
{corpus}

Respond with ONLY valid JSON, no markdown, shaped exactly:
{{ "fields": {{ {keys}: {{"value": null, "confidence": "low", "confidenceScore": 0, "sourceDocument": null, "sourceLocation": null, "extractionNotes": "", "lowConfidenceReason": "", "suggestedCorrection": null, "conflict": null}} , ... }} }}
Include EVERY listed field key."""


def _band_from_score(score: int) -> str:
    if score >= 85:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def normalize_analysis(raw: dict, docs: list) -> dict:
    fields_in = (raw or {}).get("fields", {}) if isinstance(raw, dict) else {}
    out = {}
    present = 0
    conflicts = 0
    conf_counts = {"high": 0, "medium": 0, "low": 0}
    score_sum = 0
    for k, label in BRIEF_FIELDS:
        f = fields_in.get(k) or {}
        val = f.get("value")
        if isinstance(val, (list, dict)):
            val = json.dumps(val, ensure_ascii=False)
        val = (str(val).strip() if val not in (None, "", "null") else "")

        # score + band (prefer explicit score, else derive from label)
        try:
            score = int(round(float(f.get("confidenceScore"))))
        except (TypeError, ValueError):
            lbl = str(f.get("confidence", "low")).lower()
            score = {"high": 92, "medium": 72, "low": 30}.get(lbl, 30)
        score = max(0, min(100, score))
        if not val:
            score = 0
        band = _band_from_score(score) if val else "low"

        # conflict normalization
        conflict = f.get("conflict")
        has_conflict = False
        conflict_values = []
        if isinstance(conflict, dict) and conflict.get("hasConflict"):
            vals = conflict.get("values") or []
            for v in vals:
                if isinstance(v, dict) and str(v.get("value", "")).strip():
                    conflict_values.append({
                        "document": str(v.get("document") or ""),
                        "value": str(v.get("value")).strip(),
                    })
            has_conflict = len(conflict_values) >= 2

        status = "missing"
        if val and has_conflict:
            status = "conflict"
        elif val:
            status = "found"

        if val:
            present += 1
            conf_counts[band] += 1
            score_sum += score
        if status == "conflict":
            conflicts += 1

        out[k] = {
            "key": k, "label": label, "category": FIELD_CATEGORY.get(k, "Other"),
            "value": val,
            "confidence": band,
            "confidenceScore": score,
            "aiConfidence": band, "aiConfidenceScore": score,
            "sourceDocument": f.get("sourceDocument") or "",
            "sourceLocation": f.get("sourceLocation") or "",
            "extractionNotes": f.get("extractionNotes") or "",
            "lowConfidenceReason": f.get("lowConfidenceReason") or "",
            "suggestedCorrection": (str(f.get("suggestedCorrection")).strip()
                                    if f.get("suggestedCorrection") not in (None, "", "null") else ""),
            "conflict": {"hasConflict": has_conflict, "values": conflict_values} if has_conflict else None,
            "status": status,
            "isUserEdited": False, "confirmed": False,
        }
    overall = round(score_sum / present) if present else 0
    return {
        "fields": out,
        "summary": {
            "totalFields": len(BRIEF_FIELDS), "fieldsFound": present,
            "fieldsMissing": len(BRIEF_FIELDS) - present,
            "conflicts": conflicts,
            "confidence": conf_counts,
            "overallConfidence": overall,
        },
    }


def mock_analysis(docs: list) -> dict:
    """Heuristic fallback when no LLM key is configured or the AI call fails."""
    raw = {"fields": {}}
    for k, _ in BRIEF_FIELDS:
        raw["fields"][k] = {"value": None, "confidence": "low", "confidenceScore": 0,
                            "sourceDocument": None, "sourceLocation": None,
                            "extractionNotes": "MOCK — add LLM balance for real analysis",
                            "lowConfidenceReason": "", "suggestedCorrection": None, "conflict": None}
    return normalize_analysis(raw, docs)


SYSTEM = (
    "You are a meticulous senior advertising producer. You extract structured brief data from client "
    "documents. You NEVER invent information and you return ONLY strict JSON."
)


async def analyze_brief(docs: list) -> dict:
    """Run the LLM brief analysis. Returns (normalized_analysis, mock_mode)."""
    import os
    import uuid
    from ai_config import get_ai_config
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.warning("Brief analysis MOCK MODE — no EMERGENT_LLM_KEY")
        return mock_analysis(docs), True
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider, model = get_ai_config("brief")
        chat = LlmChat(api_key=api_key, session_id="brief_" + uuid.uuid4().hex[:10],
                       system_message=SYSTEM).with_model(provider, model)
        resp = await chat.send_message(UserMessage(text=build_analysis_prompt(docs)))
        text = resp if isinstance(resp, str) else str(resp)
        text = text.strip()
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


# brief field key -> project field (ProjectIn) for Run 2 generation.
_BRIEF_TO_PROJECT = {
    "client": "client", "brand": "brand", "campaign": "campaign",
    "objective": "goal", "target_audience": "target_audience",
    "key_message": "key_message", "call_to_action": "call_to_action",
    "deliverables": "deliverables", "duration": "duration", "aspect_ratio": "aspect_ratio",
    "budget": "budget", "locations": "location_type", "mood": "mood",
    "visual_style": "visual_style", "references": "references",
    "tone_of_voice": "brand",
}


def map_brief_to_project(fields: dict) -> dict:
    """Map a reviewed brief field-map -> ProjectIn-compatible payload."""
    def val(k):
        f = fields.get(k) or {}
        return str(f.get("value") or "").strip() if isinstance(f, dict) else str(f or "").strip()

    payload = {}
    for bkey, pkey in _BRIEF_TO_PROJECT.items():
        v = val(bkey)
        if v and not payload.get(pkey):
            payload[pkey] = v

    # platform: take first from a comma/newline list
    platforms = val("platforms")
    if platforms:
        payload["platform"] = re.split(r"[,\n/]", platforms)[0].strip()

    # title: campaign > client > first non-empty
    title = val("campaign") or val("client") or val("objective")
    payload["title"] = (title[:80] if title else "Untitled Brief Project")

    # restrictions from legal/constraints/mandatory
    restr = " ".join(x for x in [val("legal_notes"), val("constraints"),
                                 val("mandatory_requirements")] if x).strip()
    if restr:
        payload["restrictions"] = restr[:500]

    # extra notes: fold in leftover strategic fields
    notes = " • ".join(f"{lbl}: {val(k)}" for k, lbl in [
        ("problem", "Problem"), ("success_metrics", "Success Metrics"),
        ("competitors", "Competitors"), ("risks", "Risks"), ("deadline", "Deadline"),
        ("products", "Products"),
    ] if val(k))
    if notes:
        payload["extra_notes"] = notes[:800]
    return payload
