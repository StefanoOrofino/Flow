"""SQLite storage.

SQLite keeps the prototype self-contained (no database server to install) and
gives real transactions, which is what matters most here: a seat must never be
sold twice. In production this would move to PostgreSQL with the same
"update only if still free" pattern.
"""
from __future__ import annotations

import json
import os
import random
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

from . import pricing, venue

DB_PATH = Path(os.environ.get("TICKETING_DB", Path(__file__).resolve().parent.parent / "ticketing.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  away_team TEXT NOT NULL,
  competition TEXT NOT NULL,
  kickoff TEXT NOT NULL,
  category TEXT NOT NULL,
  on_sale INTEGER NOT NULL DEFAULT 1,
  price_overrides TEXT NOT NULL DEFAULT '{}',
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS seats (
  match_id TEXT NOT NULL,
  seat_id TEXT NOT NULL,
  sector INTEGER NOT NULL,
  zone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free',      -- free | held | sold
  hold_id TEXT,
  hold_expires REAL,
  order_id TEXT,
  PRIMARY KEY (match_id, seat_id)
);
CREATE INDEX IF NOT EXISTS seats_status ON seats (match_id, status);
CREATE INDEX IF NOT EXISTS seats_hold ON seats (hold_id);
CREATE TABLE IF NOT EXISTS holds (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  expires REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'     -- active | released | converted
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  hold_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,                     -- pending | paid
  total_cents INTEGER NOT NULL,
  lines TEXT NOT NULL,
  created_at REAL NOT NULL,
  paid_at REAL
);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  seat_id TEXT NOT NULL,
  zone TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  holder_first TEXT NOT NULL,
  holder_last TEXT NOT NULL,
  holder_birth TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',     -- valid | used
  scanned_at REAL,
  UNIQUE (match_id, seat_id)
);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def transaction(conn: sqlite3.Connection):
    """BEGIN IMMEDIATE takes the write lock up front, so check-then-update is atomic."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
        conn.execute("COMMIT")
    except BaseException:
        conn.execute("ROLLBACK")
        raise


def get_setting(conn, key, default=None):
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def set_setting(conn, key, value):
    conn.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                 (key, json.dumps(value)))


def get_config(conn) -> dict:
    return get_setting(conn, "config") or pricing.default_config()


def secret(conn) -> bytes:
    env = os.environ.get("TICKET_SECRET")
    if env:
        return env.encode()
    s = get_setting(conn, "ticket_secret")
    if not s:
        s = secrets.token_hex(32)
        set_setting(conn, "ticket_secret", s)
    return s.encode()


# Share of seats already sold when a demo match is created, by colour area.
PRESALE = {"arancio": 0.40, "rosso": 0.36, "blu": 0.62, "verde": 0.62}


def create_match(conn, away_team, competition, kickoff, category, presale=True, match_id=None) -> str:
    match_id = match_id or uuid.uuid4().hex[:10]
    rng = random.Random(match_id)
    with transaction(conn):
        conn.execute(
            "INSERT INTO matches (id, away_team, competition, kickoff, category, on_sale, price_overrides, created_at) "
            "VALUES (?, ?, ?, ?, ?, 1, '{}', ?)",
            (match_id, away_team, competition, kickoff, category, time.time()),
        )
        rows = []
        for sec in venue.sectors():
            rate = PRESALE[sec.area] * (0.6 + rng.random() * 0.8) if presale else 0
            for seat_id in sec.seat_ids():
                sold = rng.random() < rate
                rows.append((match_id, seat_id, sec.number, sec.zone, "sold" if sold else "free", "PRESALE" if sold else None))
        conn.executemany(
            "INSERT INTO seats (match_id, seat_id, sector, zone, status, order_id) VALUES (?, ?, ?, ?, ?, ?)", rows)
    return match_id


DEMO_MATCHES = [
    ("demo-derby", "Torre Calcio", "Campionato", "2026-12-13T20:45:00+01:00", "A+"),
    ("demo-coppa", "Lago United", "Coppa europea", "2026-12-09T21:00:00+01:00", "A"),
    ("demo-campionato", "Valle FC", "Campionato", "2027-01-10T15:00:00+01:00", "B"),
]


def init(seed_demo: bool = True):
    conn = connect()
    conn.executescript(SCHEMA)
    if get_setting(conn, "config") is None:
        set_setting(conn, "config", pricing.default_config())
    if seed_demo and conn.execute("SELECT COUNT(*) FROM matches").fetchone()[0] == 0:
        for mid, away, comp, kickoff, cat in DEMO_MATCHES:
            create_match(conn, away, comp, kickoff, cat, match_id=mid)
    conn.close()
