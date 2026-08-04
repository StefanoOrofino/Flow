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
    return f"""You are a senior advertising producer analyzing one or more client brief documents.
Extract ONLY information actually present. NEVER invent values. If a field is not present, set value to null and confidence to "low".

Extract these fields:
{fields_desc}

For EACH field return an object with:
- "value": the extracted value as a concise string (or null if absent)
- "confidence": "high" | "medium" | "low"  (base this on EVIDENCE quality in the documents, not your own certainty)
- "sourceDocument": the fileName the value came from (or null)
- "sourceLocation": a SHORT verbatim snippet (<=140 chars) from the document supporting the value (or null)
- "extractionNotes": brief note if ambiguous/merged/conflicting (or "")

DOCUMENTS:
{corpus}

Respond with ONLY valid JSON, no markdown, shaped exactly:
{{ "fields": {{ {keys}: {{"value": null, "confidence": "low", "sourceDocument": null, "sourceLocation": null, "extractionNotes": ""}} , ... }} }}
Include EVERY listed field key."""


def normalize_analysis(raw: dict, docs: list) -> dict:
    fields_in = (raw or {}).get("fields", {}) if isinstance(raw, dict) else {}
    out = {}
    present = 0
    conf_counts = {"high": 0, "medium": 0, "low": 0}
    for k, label in BRIEF_FIELDS:
        f = fields_in.get(k) or {}
        val = f.get("value")
        if isinstance(val, (list, dict)):
            val = json.dumps(val, ensure_ascii=False)
        val = (str(val).strip() if val not in (None, "", "null") else "")
        conf = str(f.get("confidence", "low")).lower()
        if conf not in conf_counts:
            conf = "low"
        if val:
            present += 1
            conf_counts[conf] += 1
        out[k] = {
            "key": k, "label": label, "category": FIELD_CATEGORY.get(k, "Other"),
            "value": val, "confidence": conf if val else "low",
            "sourceDocument": f.get("sourceDocument") or "",
            "sourceLocation": f.get("sourceLocation") or "",
            "extractionNotes": f.get("extractionNotes") or "",
            "isUserEdited": False, "confirmed": False,
        }
    return {
        "fields": out,
        "summary": {
            "totalFields": len(BRIEF_FIELDS), "fieldsFound": present,
            "fieldsMissing": len(BRIEF_FIELDS) - present, "confidence": conf_counts,
        },
    }


def mock_analysis(docs: list) -> dict:
    """Heuristic fallback when no LLM key is configured."""
    raw = {"fields": {}}
    joined = "\n".join(d["text"] for d in docs).lower()
    src = docs[0]["fileName"] if docs else None
    for k, _ in BRIEF_FIELDS:
        raw["fields"][k] = {"value": None, "confidence": "low",
                            "sourceDocument": None, "sourceLocation": None,
                            "extractionNotes": "MOCK — add LLM balance for real analysis"}
    return normalize_analysis(raw, docs)
