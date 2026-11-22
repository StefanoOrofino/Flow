"""Ticketing prototype API.

Run from the ticketing/ folder:
    uvicorn backend.app:app --reload
then open http://localhost:8000 (store), /admin.html (pricing & sales), /gate.html (gate check).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db, pricing, venue, views

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "demo-admin")
WEB_DIR = Path(__file__).resolve().parent.parent / "web"

@asynccontextmanager
async def lifespan(_app):
    db.init(seed_demo=os.environ.get("TICKETING_SEED", "1") == "1")
    yield


app = FastAPI(title="Ticketing prototype", lifespan=lifespan)


def conn_dep():
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


def require_admin(x_admin_token: str = Header(default="")):
    if not hmac.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(401, "Token amministratore mancante o errato")


# ---------------------------------------------------------------- helpers

def release_expired(conn, match_id: str | None = None):
    now = time.time()
    q = "UPDATE seats SET status='free', hold_id=NULL, hold_expires=NULL WHERE status='held' AND hold_expires < ?"
    args: tuple = (now,)
    if match_id:
        q += " AND match_id = ?"
        args = (now, match_id)
    conn.execute(q, args)
    conn.execute("UPDATE holds SET status='released' WHERE status='active' AND expires < ?", (now,))


def load_match(conn, match_id: str) -> dict:
    row = conn.execute("SELECT * FROM matches WHERE id = ?", (match_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Partita non trovata")
    m = dict(row)
    m["price_overrides"] = json.loads(m["price_overrides"])
    m["on_sale"] = bool(m["on_sale"])
    return m


def zone_occupancy(conn, match_id: str) -> dict[str, float]:
    caps = {z: info["capacity"] for z, info in venue.zones().items()}
    taken = {r["zone"]: r["n"] for r in conn.execute(
        "SELECT zone, COUNT(*) n FROM seats WHERE match_id = ? AND status != 'free' GROUP BY zone", (match_id,))}
    return {z: taken.get(z, 0) / cap for z, cap in caps.items()}


def price_table(conn, match: dict) -> dict:
    cfg = db.get_config(conn)
    occ = zone_occupancy(conn, match["id"])
    zones = {}
    for code, info in venue.zones().items():
        zones[code] = {
            "name": info["name"],
            "occupancy": round(occ[code], 3),
            "prices": {t["code"]: pricing.unit_price_cents(cfg, match, code, t["code"], occ[code]) for t in cfg["ticket_types"]},
        }
    return {
        "match_id": match["id"],
        "fee_cents": pricing.fee_cents(cfg),
        "ticket_types": cfg["ticket_types"],
        "max_tickets_per_order": cfg["max_tickets_per_order"],
        "hold_minutes": cfg["hold_minutes"],
        "zones": zones,
    }


def sign_ticket(conn, ticket_id: str, match_id: str, seat_id: str) -> str:
    payload = f"{ticket_id}.{match_id}.{seat_id}"
    sig = hmac.new(db.secret(conn), payload.encode(), hashlib.sha256).digest()[:16]
    b64 = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")
    return f"{b64(payload.encode())}.{b64(sig)}"


def verify_token(conn, token: str) -> str | None:
    """Return the ticket id if the signature is genuine."""
    try:
        p64, s64 = token.strip().split(".")
        pad = lambda s: s + "=" * (-len(s) % 4)
        payload = base64.urlsafe_b64decode(pad(p64)).decode()
        sig = base64.urlsafe_b64decode(pad(s64))
    except Exception:
        return None
    good = hmac.new(db.secret(conn), payload.encode(), hashlib.sha256).digest()[:16]
    if not hmac.compare_digest(sig, good):
        return None
    return payload.split(".")[0]


def match_public(m: dict, cfg: dict) -> dict:
    return {
        "id": m["id"], "home_team": cfg.get("club_name", "Club di casa"), "away_team": m["away_team"],
        "competition": m["competition"], "kickoff": m["kickoff"], "category": m["category"], "on_sale": m["on_sale"],
    }


# ---------------------------------------------------------------- public API

@app.get("/api/venue")
def get_venue():
    return {
        "capacity": venue.capacity(),
        "zones": venue.zones(),
        "sectors": [
            {"number": s.number, "ring": s.ring, "index": s.index, "side": s.side, "area": s.area,
             "stand": s.stand, "central": s.central, "zone": s.zone, "rows": s.rows}
            for s in venue.sectors()
        ],
    }


@app.get("/api/matches")
def list_matches(conn=Depends(conn_dep)):
    cfg = db.get_config(conn)
    rows = conn.execute("SELECT * FROM matches ORDER BY kickoff").fetchall()
    out = []
    for r in rows:
        m = load_match(conn, r["id"])
        out.append(match_public(m, cfg))
    return out


@app.get("/api/matches/{match_id}/prices")
def get_prices(match_id: str, conn=Depends(conn_dep)):
    return price_table(conn, load_match(conn, match_id))


@app.get("/api/matches/{match_id}/availability")
def availability(match_id: str, conn=Depends(conn_dep)):
    load_match(conn, match_id)
    release_expired(conn, match_id)
    taken = {r["seat_id"] for r in conn.execute(
        "SELECT seat_id FROM seats WHERE match_id = ? AND status != 'free'", (match_id,))}
    sectors = {}
    free_total = 0
    for s in venue.sectors():
        bits = "".join("1" if sid in taken else "0" for sid in s.seat_ids())
        free_total += bits.count("0")
        sectors[s.number] = bits
    return {"match_id": match_id, "free": free_total, "capacity": venue.capacity(), "sectors": sectors}


class HoldIn(BaseModel):
    seat_ids: list[str] = Field(min_length=1)


@app.post("/api/matches/{match_id}/holds", status_code=201)
def create_hold(match_id: str, body: HoldIn, conn=Depends(conn_dep)):
    match = load_match(conn, match_id)
    if not match["on_sale"]:
        raise HTTPException(409, "La vendita per questa partita è chiusa")
    cfg = db.get_config(conn)
    seat_ids = list(dict.fromkeys(body.seat_ids))
    if len(seat_ids) > cfg["max_tickets_per_order"]:
        raise HTTPException(422, f"Puoi bloccare al massimo {cfg['max_tickets_per_order']} posti per ordine")
    for sid in seat_ids:
        try:
            venue.parse_seat_id(sid)
        except ValueError as e:
            raise HTTPException(422, str(e))
    hold_id = uuid.uuid4().hex
    expires = time.time() + cfg["hold_minutes"] * 60
    with db.transaction(conn):
        release_expired(conn, match_id)
        marks = ",".join("?" * len(seat_ids))
        cur = conn.execute(
            f"UPDATE seats SET status='held', hold_id=?, hold_expires=? "
            f"WHERE match_id=? AND status='free' AND seat_id IN ({marks})",
            (hold_id, expires, match_id, *seat_ids))
        if cur.rowcount != len(seat_ids):
            # someone else got (some of) them first: undo and tell the client which ones
            conn.execute("UPDATE seats SET status='free', hold_id=NULL, hold_expires=NULL WHERE hold_id=?", (hold_id,))
            taken = [r["seat_id"] for r in conn.execute(
                f"SELECT seat_id FROM seats WHERE match_id=? AND seat_id IN ({marks}) AND status != 'free'",
                (match_id, *seat_ids))]
            raise HTTPException(409, {"message": "Alcuni posti non sono più disponibili", "unavailable": taken})
        conn.execute("INSERT INTO holds (id, match_id, expires) VALUES (?, ?, ?)", (hold_id, match_id, expires))
    return {"hold_id": hold_id, "match_id": match_id, "seat_ids": seat_ids, "expires_at": expires}


@app.delete("/api/holds/{hold_id}", status_code=204)
def release_hold(hold_id: str, conn=Depends(conn_dep)):
    with db.transaction(conn):
        conn.execute("UPDATE seats SET status='free', hold_id=NULL, hold_expires=NULL WHERE hold_id=? AND status='held'", (hold_id,))
        conn.execute("UPDATE holds SET status='released' WHERE id=? AND status='active'", (hold_id,))


class Holder(BaseModel):
    seat_id: str
    ticket_type: str = "INTERO"
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    birth_date: date


class OrderIn(BaseModel):
    hold_id: str
    email: str = Field(max_length=200)
    tickets: list[Holder] = Field(min_length=1)


def active_hold(conn, hold_id: str) -> dict:
    h = conn.execute("SELECT * FROM holds WHERE id=?", (hold_id,)).fetchone()
    if not h or h["status"] != "active" or h["expires"] < time.time():
        raise HTTPException(410, "Il tempo per completare l'acquisto è scaduto: scegli di nuovo i posti")
    return dict(h)


@app.post("/api/orders", status_code=201)
def create_order(body: OrderIn, conn=Depends(conn_dep)):
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", body.email):
        raise HTTPException(422, "Indirizzo email non valido")
    hold = active_hold(conn, body.hold_id)
    match = load_match(conn, hold["match_id"])
    cfg = db.get_config(conn)
    held = {r["seat_id"]: r["zone"] for r in conn.execute(
        "SELECT seat_id, zone FROM seats WHERE hold_id=? AND status='held'", (body.hold_id,))}
    if sorted(held) != sorted(t.seat_id for t in body.tickets):
        raise HTTPException(422, "I nominativi devono corrispondere esattamente ai posti bloccati")
    match_day = datetime.fromisoformat(match["kickoff"]).date()
    occ = zone_occupancy(conn, match["id"])
    fee = pricing.fee_cents(cfg)
    lines, errors = [], []
    for t in body.tickets:
        tt = pricing.ticket_type(cfg, t.ticket_type)
        if tt is None:
            errors.append(f"{t.seat_id}: tipo di biglietto sconosciuto")
            continue
        err = pricing.check_eligibility(tt, t.birth_date, match_day)
        if err:
            errors.append(f"{t.first_name} {t.last_name}: {err}")
            continue
        price = pricing.unit_price_cents(cfg, match, held[t.seat_id], t.ticket_type, occ[held[t.seat_id]])
        lines.append({**t.model_dump(mode="json"), "zone": held[t.seat_id], "price_cents": price, "fee_cents": fee})
    if errors:
        raise HTTPException(422, {"message": "Controlla i nominativi", "errors": errors})
    total = sum(l["price_cents"] + l["fee_cents"] for l in lines)
    order_id = "ORD-" + uuid.uuid4().hex[:8].upper()
    conn.execute(
        "INSERT INTO orders (id, match_id, hold_id, email, status, total_cents, lines, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",
        (order_id, match["id"], body.hold_id, body.email, total, json.dumps(lines), time.time()))
    return {"order_id": order_id, "status": "pending", "total_cents": total, "lines": lines, "expires_at": hold["expires"]}


class PayIn(BaseModel):
    card_number: str


# Demo payment: card numbers mimic common test cards. Real payments go through a PSP (Stripe, Adyen, Nexi...)
DECLINED_CARDS = {"4000000000000002"}


@app.post("/api/orders/{order_id}/pay")
def pay(order_id: str, body: PayIn, conn=Depends(conn_dep)):
    card = re.sub(r"\D", "", body.card_number)
    order = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not order:
        raise HTTPException(404, "Ordine non trovato")
    if order["status"] == "paid":
        return get_order(order_id, conn)
    if len(card) < 12:
        raise HTTPException(422, "Numero di carta non valido")
    if card in DECLINED_CARDS:
        raise HTTPException(402, "Pagamento rifiutato dalla banca (carta di prova). Prova con 4242 4242 4242 4242")
    lines = json.loads(order["lines"])
    with db.transaction(conn):
        active_hold(conn, order["hold_id"])
        cur = conn.execute("UPDATE seats SET status='sold', order_id=?, hold_id=NULL, hold_expires=NULL WHERE hold_id=? AND status='held'",
                           (order_id, order["hold_id"]))
        if cur.rowcount != len(lines):
            raise HTTPException(410, "Il tempo per completare l'acquisto è scaduto: scegli di nuovo i posti")
        for l in lines:
            tid = "TK-" + uuid.uuid4().hex[:10].upper()
            conn.execute(
                "INSERT INTO tickets (id, order_id, match_id, seat_id, zone, ticket_type, holder_first, holder_last, holder_birth, "
                "price_cents, fee_cents, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (tid, order_id, order["match_id"], l["seat_id"], l["zone"], l["ticket_type"], l["first_name"], l["last_name"],
                 l["birth_date"], l["price_cents"], l["fee_cents"], sign_ticket(conn, tid, order["match_id"], l["seat_id"])))
        conn.execute("UPDATE orders SET status='paid', paid_at=? WHERE id=?", (time.time(), order_id))
        conn.execute("UPDATE holds SET status='converted' WHERE id=?", (order["hold_id"],))
    return get_order(order_id, conn)


@app.get("/api/orders/{order_id}")
def get_order(order_id: str, conn=Depends(conn_dep)):
    order = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not order:
        raise HTTPException(404, "Ordine non trovato")
    tickets = [dict(t) for t in conn.execute("SELECT * FROM tickets WHERE order_id=? ORDER BY seat_id", (order_id,))]
    return {"order_id": order_id, "match_id": order["match_id"], "status": order["status"], "email": order["email"],
            "total_cents": order["total_cents"], "tickets": tickets}


class ScanIn(BaseModel):
    token: str
    match_id: str | None = None


@app.post("/api/gate/scan")
def scan(body: ScanIn, conn=Depends(conn_dep)):
    tid = verify_token(conn, body.token)
    if not tid:
        return {"result": "invalid", "message": "QR non valido o contraffatto"}
    t = conn.execute("SELECT * FROM tickets WHERE id=?", (tid,)).fetchone()
    if not t:
        return {"result": "invalid", "message": "Biglietto inesistente"}
    info = {"ticket_id": tid, "seat_id": t["seat_id"], "holder": f"{t['holder_first']} {t['holder_last']}",
            "birth_date": t["holder_birth"], "ticket_type": t["ticket_type"]}
    if body.match_id and body.match_id != t["match_id"]:
        return {"result": "wrong_match", "message": "Biglietto valido per un'altra partita", **info}
    cur = conn.execute("UPDATE tickets SET status='used', scanned_at=? WHERE id=? AND status='valid'", (time.time(), tid))
    if cur.rowcount == 0:
        return {"result": "already_used", "message": "Biglietto già utilizzato", **info}
    return {"result": "ok", "message": "Ingresso consentito: controlla il documento", **info}


# ---------------------------------------------------------------- admin API

@app.get("/api/admin/config", dependencies=[Depends(require_admin)])
def admin_get_config(conn=Depends(conn_dep)):
    return {"config": db.get_config(conn), "zones": venue.zones()}


@app.put("/api/admin/config", dependencies=[Depends(require_admin)])
def admin_put_config(cfg: dict, conn=Depends(conn_dep)):
    merged = {**db.get_config(conn), **cfg}
    errors = pricing.validate_config(merged)
    if errors:
        raise HTTPException(422, {"message": "Configurazione non valida", "errors": errors})
    db.set_setting(conn, "config", merged)
    return {"config": merged}


class MatchIn(BaseModel):
    away_team: str = Field(min_length=1, max_length=60)
    competition: str = Field(min_length=1, max_length=60)
    kickoff: datetime
    category: str
    presale: bool = False


@app.post("/api/admin/matches", status_code=201, dependencies=[Depends(require_admin)])
def admin_create_match(body: MatchIn, conn=Depends(conn_dep)):
    cfg = db.get_config(conn)
    if body.category not in cfg["match_categories"]:
        raise HTTPException(422, f"Categoria sconosciuta: {body.category}")
    mid = db.create_match(conn, body.away_team, body.competition, body.kickoff.isoformat(), body.category, presale=body.presale)
    return match_public(load_match(conn, mid), cfg)


class MatchPatch(BaseModel):
    category: str | None = None
    on_sale: bool | None = None
    price_overrides: dict[str, float] | None = None


@app.patch("/api/admin/matches/{match_id}", dependencies=[Depends(require_admin)])
def admin_patch_match(match_id: str, body: MatchPatch, conn=Depends(conn_dep)):
    m = load_match(conn, match_id)
    cfg = db.get_config(conn)
    if body.category is not None:
        if body.category not in cfg["match_categories"]:
            raise HTTPException(422, f"Categoria sconosciuta: {body.category}")
        conn.execute("UPDATE matches SET category=? WHERE id=?", (body.category, match_id))
    if body.on_sale is not None:
        conn.execute("UPDATE matches SET on_sale=? WHERE id=?", (int(body.on_sale), match_id))
    if body.price_overrides is not None:
        zones = venue.zones()
        bad = [z for z, p in body.price_overrides.items() if z not in zones or not 0 < p <= 5000]
        if bad:
            raise HTTPException(422, "Prezzi personalizzati non validi per: " + ", ".join(bad))
        conn.execute("UPDATE matches SET price_overrides=? WHERE id=?", (json.dumps(body.price_overrides), match_id))
    return {**match_public(load_match(conn, match_id), cfg), "price_overrides": load_match(conn, match_id)["price_overrides"]}


@app.get("/api/admin/matches/{match_id}/report", dependencies=[Depends(require_admin)])
def admin_report(match_id: str, conn=Depends(conn_dep)):
    m = load_match(conn, match_id)
    release_expired(conn, match_id)
    zones = venue.zones()
    status = {(r["zone"], r["status"], r["presale"]): r["n"] for r in conn.execute(
        "SELECT zone, status, COALESCE(order_id, '') = 'PRESALE' AS presale, COUNT(*) n FROM seats WHERE match_id=? GROUP BY zone, status, presale",
        (match_id,))}
    sales = {r["zone"]: dict(r) for r in conn.execute(
        "SELECT zone, COUNT(*) n, SUM(price_cents) revenue, SUM(fee_cents) fees FROM tickets WHERE match_id=? GROUP BY zone", (match_id,))}
    by_type = {r["ticket_type"]: r["n"] for r in conn.execute(
        "SELECT ticket_type, COUNT(*) n FROM tickets WHERE match_id=? GROUP BY ticket_type", (match_id,))}
    rows = []
    for code, info in zones.items():
        presold = status.get((code, "sold", 1), 0)
        online = sales.get(code, {}).get("n", 0) or 0
        held = status.get((code, "held", 0), 0)
        rows.append({"zone": code, "name": info["name"], "capacity": info["capacity"], "presold": presold, "sold_online": online,
                     "held": held, "free": info["capacity"] - presold - online - held,
                     "revenue_cents": sales.get(code, {}).get("revenue") or 0, "fees_cents": sales.get(code, {}).get("fees") or 0})
    scanned = conn.execute("SELECT COUNT(*) FROM tickets WHERE match_id=? AND status='used'", (match_id,)).fetchone()[0]
    orders = conn.execute("SELECT COUNT(*) FROM orders WHERE match_id=? AND status='paid'", (match_id,)).fetchone()[0]
    return {"match": {**match_public(m, db.get_config(conn)), "price_overrides": m["price_overrides"]},
            "zones": rows, "by_type": by_type, "orders": orders, "scanned": scanned}


# ---------------------------------------------------------------- seat views

@app.get("/api/views")
def list_views():
    return {"enabled": views.provider_name() is not None, "provider": views.provider_name(), "images": views.images()}


class ViewIn(BaseModel):
    sector: int
    row: int
    image: str = Field(max_length=9_000_000)
    night: bool = True


@app.post("/api/views", status_code=201)
def create_view(body: ViewIn):
    sector = venue.sector_map().get(body.sector)
    if sector is None or not 1 <= body.row <= len(sector.rows):
        raise HTTPException(422, "Settore o fila inesistente")
    try:
        return views.generate(sector, body.row, body.image, body.night)
    except views.ViewError as e:
        raise HTTPException(e.status, str(e))


views.VIEWS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/views", StaticFiles(directory=views.VIEWS_DIR), name="views")
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
