"""Pricing rules.

A ticket price is built in four steps, all configurable from the admin panel:

1. base price of the zone (e.g. "1-ARANCIO-C" = primo anello arancio centrale),
   or a per-match override for that zone;
2. times the match category multiplier (A+, A, B, C);
3. times a dynamic surcharge when the zone is filling up (optional);
4. minus the ticket-type discount (Intero, Under 18, Over 65...),
   rounded to whole euros.

A fixed service fee per ticket is added on top at checkout.
All amounts are handled in cents to avoid float drift.
"""
from __future__ import annotations

import math
from datetime import date

from . import venue

AREA_BASE = {  # euros per ring (1°, 2°, 3°)
    "arancio": [189, 119, None],
    "rosso": [159, 99, 59],
    "blu": [79, 55, 39],
    "verde": [79, 55, 39],
}
CENTRAL_MULTIPLIER = 1.85


def default_zone_prices() -> dict[str, int]:
    out = {}
    for code, z in venue.zones().items():
        p = AREA_BASE[z["area"]][z["ring"]]
        if z["central"]:
            p = round(p * CENTRAL_MULTIPLIER / 10) * 10 - 1
        out[code] = p
    return out


def default_config() -> dict:
    return {
        "club_name": "Club di casa",
        "zone_prices": default_zone_prices(),
        "match_categories": {"A+": 1.6, "A": 1.25, "B": 1.0, "C": 0.8},
        "ticket_types": [
            {"code": "INTERO", "label": "Intero", "discount_pct": 0},
            {"code": "U18", "label": "Under 18", "discount_pct": 40, "max_age": 17},
            {"code": "OVER65", "label": "Over 65", "discount_pct": 25, "min_age": 65},
        ],
        "service_fee": 2.5,
        "dynamic_pricing": {"enabled": True, "steps": [[0.7, 0.10], [0.9, 0.20]]},
        "max_tickets_per_order": 4,
        "hold_minutes": 10,
    }


def validate_config(cfg: dict) -> list[str]:
    errors = []
    zones = venue.zones()
    for code, p in cfg.get("zone_prices", {}).items():
        if code not in zones:
            errors.append(f"Zona sconosciuta: {code}")
        elif not isinstance(p, (int, float)) or p <= 0 or p > 5000:
            errors.append(f"Prezzo non valido per {code}: deve essere tra 1 e 5000 €")
    missing = set(zones) - set(cfg.get("zone_prices", {}))
    if missing:
        errors.append("Mancano i prezzi per: " + ", ".join(sorted(missing)))
    for cat, m in cfg.get("match_categories", {}).items():
        if not isinstance(m, (int, float)) or not 0.1 <= m <= 5:
            errors.append(f"Moltiplicatore non valido per la categoria {cat}")
    codes = set()
    for t in cfg.get("ticket_types", []):
        if not t.get("code") or not t.get("label"):
            errors.append("Ogni tipo di biglietto deve avere codice e nome")
        if t.get("code") in codes:
            errors.append(f"Codice biglietto duplicato: {t.get('code')}")
        codes.add(t.get("code"))
        if not 0 <= t.get("discount_pct", 0) < 100:
            errors.append(f"Sconto non valido per {t.get('code')}")
    if "INTERO" not in codes:
        errors.append("Serve sempre il biglietto INTERO")
    if not 0 <= cfg.get("service_fee", 0) <= 50:
        errors.append("Commissione di servizio non valida")
    if not 1 <= cfg.get("max_tickets_per_order", 4) <= 10:
        errors.append("Il limite di biglietti per ordine deve essere tra 1 e 10")
    if not 2 <= cfg.get("hold_minutes", 10) <= 30:
        errors.append("Il blocco dei posti deve durare tra 2 e 30 minuti")
    steps = cfg.get("dynamic_pricing", {}).get("steps", [])
    for s in steps:
        if len(s) != 2 or not 0 < s[0] < 1 or not 0 <= s[1] <= 1:
            errors.append("Ogni soglia di prezzo dinamico è [riempimento 0-1, rincaro 0-1]")
    return errors


def dynamic_factor(cfg: dict, occupancy: float) -> float:
    dp = cfg.get("dynamic_pricing", {})
    if not dp.get("enabled"):
        return 1.0
    surcharge = 0.0
    for threshold, extra in sorted(dp.get("steps", [])):
        if occupancy >= threshold:
            surcharge = extra
    return 1.0 + surcharge


def ticket_type(cfg: dict, code: str) -> dict | None:
    return next((t for t in cfg["ticket_types"] if t["code"] == code), None)


def unit_price_cents(cfg: dict, match: dict, zone: str, type_code: str, occupancy: float) -> int:
    base = match.get("price_overrides", {}).get(zone) or cfg["zone_prices"][zone]
    mult = cfg["match_categories"].get(match["category"], 1.0)
    t = ticket_type(cfg, type_code)
    if t is None:
        raise ValueError(f"Tipo di biglietto sconosciuto: {type_code}")
    euros = base * mult * dynamic_factor(cfg, occupancy) * (1 - t.get("discount_pct", 0) / 100)
    return int(math.floor(euros + 0.5)) * 100


def fee_cents(cfg: dict) -> int:
    return int(round(cfg.get("service_fee", 0) * 100))


def age_on(birth: date, on: date) -> int:
    return on.year - birth.year - ((on.month, on.day) < (birth.month, birth.day))


def check_eligibility(t: dict, birth: date, match_day: date) -> str | None:
    """Return an error message if the holder cannot use this ticket type."""
    age = age_on(birth, match_day)
    if "max_age" in t and age > t["max_age"]:
        return f"{t['label']}: il titolare deve avere al massimo {t['max_age']} anni il giorno della partita"
    if "min_age" in t and age < t["min_age"]:
        return f"{t['label']}: il titolare deve avere almeno {t['min_age']} anni il giorno della partita"
    return None
