import os
import tempfile
import threading
import time

import pytest

os.environ["TICKETING_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["TICKETING_SEED"] = "1"
os.environ["ADMIN_TOKEN"] = "test-admin"

from fastapi.testclient import TestClient  # noqa: E402

from backend import app as app_module, db, pricing, venue  # noqa: E402

ADMIN = {"X-Admin-Token": "test-admin"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app_module.app) as c:
        yield c


def free_seats(client, match_id, sector, n):
    av = client.get(f"/api/matches/{match_id}/availability").json()
    sec = venue.sector_map()[sector]
    ids = list(sec.seat_ids())
    bits = av["sectors"][str(sector)]
    return [sid for sid, b in zip(ids, bits) if b == "0"][:n]


def holder(seat_id, **kw):
    return {"seat_id": seat_id, "ticket_type": "INTERO", "first_name": "Mario", "last_name": "Rossi",
            "birth_date": "1990-05-01", **kw}


def test_venue_layout(client):
    v = client.get("/api/venue").json()
    assert v["capacity"] == sum(sum(s["rows"]) for s in v["sectors"])
    # third ring is missing on the west (orange) stand
    assert not [s for s in v["sectors"] if s["ring"] == 2 and s["side"] == "ovest"]
    assert any(s["zone"] == "1-ARANCIO-C" for s in v["sectors"])


def euros(x):
    return int(x + 0.5) * 100  # prices round half up to whole euros


def test_price_rules():
    cfg = pricing.default_config()
    match = {"category": "A", "price_overrides": {}}
    base = cfg["zone_prices"]["2-BLU"]
    assert pricing.unit_price_cents(cfg, match, "2-BLU", "INTERO", 0.1) == euros(base * 1.25)
    # dynamic surcharge kicks in above 90% occupancy
    assert pricing.unit_price_cents(cfg, match, "2-BLU", "INTERO", 0.95) == euros(base * 1.25 * 1.2)
    # under 18 discount
    assert pricing.unit_price_cents(cfg, match, "2-BLU", "U18", 0.1) == euros(base * 1.25 * 0.6)
    # per-match override wins over the zone price
    assert pricing.unit_price_cents(cfg, {"category": "B", "price_overrides": {"2-BLU": 10}}, "2-BLU", "INTERO", 0) == 1000


def test_full_purchase_and_gate(client):
    mid = "demo-campionato"
    seats = free_seats(client, mid, 104, 2)
    h = client.post(f"/api/matches/{mid}/holds", json={"seat_ids": seats})
    assert h.status_code == 201, h.text
    hold = h.json()
    o = client.post("/api/orders", json={"hold_id": hold["hold_id"], "email": "fan@example.com",
                                          "tickets": [holder(seats[0]), holder(seats[1], ticket_type="U18", first_name="Luca", birth_date="2012-03-03")]})
    assert o.status_code == 201, o.text
    order = o.json()
    assert order["lines"][1]["price_cents"] < order["lines"][0]["price_cents"]
    declined = client.post(f"/api/orders/{order['order_id']}/pay", json={"card_number": "4000 0000 0000 0002"})
    assert declined.status_code == 402
    paid = client.post(f"/api/orders/{order['order_id']}/pay", json={"card_number": "4242 4242 4242 4242"}).json()
    assert paid["status"] == "paid" and len(paid["tickets"]) == 2
    token = paid["tickets"][0]["token"]
    assert client.post("/api/gate/scan", json={"token": token, "match_id": mid}).json()["result"] == "ok"
    assert client.post("/api/gate/scan", json={"token": token, "match_id": mid}).json()["result"] == "already_used"
    forged = token[:-3] + ("AAA" if not token.endswith("AAA") else "BBB")
    assert client.post("/api/gate/scan", json={"token": forged}).json()["result"] == "invalid"
    # seats now show as taken
    assert free_seats(client, mid, 104, 500)[0] not in seats


def test_no_double_booking_under_concurrency(client):
    mid = "demo-coppa"
    seat = free_seats(client, mid, 112, 1)
    results = []

    def grab():
        results.append(client.post(f"/api/matches/{mid}/holds", json={"seat_ids": seat}).status_code)

    threads = [threading.Thread(target=grab) for _ in range(12)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert results.count(201) == 1 and results.count(409) == 11


def test_age_check_and_limits(client):
    mid = "demo-derby"
    seats = free_seats(client, mid, 205, 5)
    too_many = client.post(f"/api/matches/{mid}/holds", json={"seat_ids": seats})
    assert too_many.status_code == 422
    hold = client.post(f"/api/matches/{mid}/holds", json={"seat_ids": seats[:1]}).json()
    bad = client.post("/api/orders", json={"hold_id": hold["hold_id"], "email": "a@b.it",
                                            "tickets": [holder(seats[0], ticket_type="U18")]})
    assert bad.status_code == 422 and "Under 18" in bad.text


def test_hold_expiry_frees_seats(client):
    mid = "demo-derby"
    seat = free_seats(client, mid, 210, 1)
    hold = client.post(f"/api/matches/{mid}/holds", json={"seat_ids": seat}).json()
    conn = db.connect()
    conn.execute("UPDATE seats SET hold_expires=? WHERE hold_id=?", (time.time() - 1, hold["hold_id"]))
    conn.execute("UPDATE holds SET expires=? WHERE id=?", (time.time() - 1, hold["hold_id"]))
    conn.close()
    assert client.post(f"/api/matches/{mid}/holds", json={"seat_ids": seat}).status_code == 201
    late = client.post("/api/orders", json={"hold_id": hold["hold_id"], "email": "a@b.it", "tickets": [holder(seat[0])]})
    assert late.status_code == 410


def test_admin_pricing_and_report(client):
    assert client.get("/api/admin/config").status_code == 401
    cfg = client.get("/api/admin/config", headers=ADMIN).json()["config"]
    cfg["zone_prices"]["3-VERDE"] = 25
    assert client.put("/api/admin/config", json=cfg, headers=ADMIN).status_code == 200
    bad = client.put("/api/admin/config", json={"service_fee": 999}, headers=ADMIN)
    assert bad.status_code == 422
    m = client.post("/api/admin/matches", headers=ADMIN, json={"away_team": "Test FC", "competition": "Amichevole",
                                                                "kickoff": "2027-02-01T18:00:00+01:00", "category": "C"}).json()
    prices = client.get(f"/api/matches/{m['id']}/prices").json()
    assert prices["zones"]["3-VERDE"]["prices"]["INTERO"] == 2000  # 25 € x 0.8 (category C)
    client.patch(f"/api/admin/matches/{m['id']}", headers=ADMIN, json={"on_sale": False})
    seat = free_seats(client, m["id"], 101, 1)
    assert client.post(f"/api/matches/{m['id']}/holds", json={"seat_ids": seat}).status_code == 409
    rep = client.get("/api/admin/matches/demo-campionato/report", headers=ADMIN).json()
    assert rep["orders"] >= 1 and sum(z["sold_online"] for z in rep["zones"]) >= 2
