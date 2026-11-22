"""Seat layout of the stadium.

This is the single source of truth for which sectors, rows and seats exist.
The 3D web client draws seats from the counts returned by /api/venue, so the
geometry here must match the curve used in web/index.html (a rounded
rectangle around the pitch, with each stand an offset of that curve).

In a real deployment this module would be replaced by the venue's official
seat plan (an export from the stadium's ticketing system).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from functools import lru_cache

# Tiers: offset from the pitch curve (m), rows, row depth, row rise, first-row height.
RINGS = [
    {"name": "1° anello", "o0": 7, "rows": 14, "depth": 0.9, "rise": 0.45, "h0": 1.2},
    {"name": "2° anello", "o0": 20, "rows": 14, "depth": 0.9, "rise": 0.60, "h0": 12.5},
    {"name": "3° anello", "o0": 32, "rows": 14, "depth": 0.9, "rise": 0.70, "h0": 25.0},
]
SECTORS_PER_RING = 24
SECTOR_START = -2.0
AISLE = 1.3
SEAT_GAP = 0.56

HW, HH, R = 58.0, 40.0, 12.0
SX, SZ = HW - R, HH - R

# Colour areas by stand. The west (orange) main stand has no third ring.
SIDES = {
    "ovest": ("arancio", "Tribuna Ovest"),
    "est": ("rosso", "Tribuna Est"),
    "sud": ("blu", "Curva Sud"),
    "nord": ("verde", "Curva Nord"),
}
AREA_NAMES = {"arancio": "Arancio", "rosso": "Rosso", "blu": "Blu", "verde": "Verde"}
NO_THIRD_RING = "ovest"
CENTRAL_HALF_WIDTH = 26.0  # m from the halfway line that counts as "centrale"


def _line(x0, z0, x1, z1, nx, nz):
    length = math.hypot(x1 - x0, z1 - z0)
    return length, lambda u: (x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, nx, nz)


def _arc(cx, cz, a0, a1):
    def at(u):
        a = a0 + (a1 - a0) * u
        c, s = math.cos(a), math.sin(a)
        return cx + R * c, cz + R * s, c, s

    return R * abs(a1 - a0), at


SEGS = [
    _line(-SX, -HH, SX, -HH, 0, -1), _arc(SX, -SZ, -math.pi / 2, 0),
    _line(HW, -SZ, HW, SZ, 1, 0), _arc(SX, SZ, 0, math.pi / 2),
    _line(SX, HH, -SX, HH, 0, 1), _arc(-SX, SZ, math.pi / 2, math.pi),
    _line(-HW, SZ, -HW, -SZ, -1, 0), _arc(-SX, -SZ, math.pi, math.pi * 1.5),
]
PERIM = sum(length for length, _ in SEGS)


def base(s: float):
    s = ((s % PERIM) + PERIM) % PERIM
    for length, at in SEGS:
        if s <= length:
            return at(s / length)
        s -= length
    return SEGS[-1][1](1.0)


def side_of(x, z, nx, nz) -> str:
    if abs(nx) > abs(nz):
        return "sud" if x > 0 else "nord"
    return "ovest" if z < 0 else "est"


@dataclass
class Sector:
    number: int
    ring: int          # 0-based
    index: int         # position around the bowl, 0..SECTORS_PER_RING-1
    side: str          # ovest / est / sud / nord
    area: str          # arancio / rosso / blu / verde
    stand: str         # "Tribuna Ovest", ...
    central: bool
    rows: list[int] = field(default_factory=list)  # seats per row

    @property
    def zone(self) -> str:
        """Price zone code, e.g. '1-ARANCIO-C' (ring, colour area, centrale)."""
        return f"{self.ring + 1}-{self.area.upper()}{'-C' if self.central else ''}"

    @property
    def capacity(self) -> int:
        return sum(self.rows)

    def seat_ids(self):
        for r, n in enumerate(self.rows, start=1):
            for k in range(1, n + 1):
                yield f"{self.number}-{r}-{k}"


def _row_count(s_a: float, s_b: float, offset: float, samples: int = 40) -> int:
    pts = []
    for k in range(samples + 1):
        x, z, nx, nz = base(s_a + (s_b - s_a) * k / samples)
        pts.append((x + nx * offset, z + nz * offset))
    total = sum(math.dist(pts[k], pts[k - 1]) for k in range(1, len(pts)))
    return int((total - 0.4) // SEAT_GAP)


@lru_cache(maxsize=1)
def sectors() -> tuple[Sector, ...]:
    out = []
    sec_len = PERIM / SECTORS_PER_RING
    for ri, ring in enumerate(RINGS):
        for i in range(SECTORS_PER_RING):
            s_a = SECTOR_START + i * sec_len + AISLE / 2
            s_b = SECTOR_START + (i + 1) * sec_len - AISLE / 2
            x, z, nx, nz = base((s_a + s_b) / 2)
            side = side_of(x, z, nx, nz)
            if ri == 2 and side == NO_THIRD_RING:
                continue
            area, stand = SIDES[side]
            central = side in ("ovest", "est") and abs(x) < CENTRAL_HALF_WIDTH
            rows = [
                _row_count(s_a, s_b, ring["o0"] + j * ring["depth"] + ring["depth"] * 0.45)
                for j in range(ring["rows"])
            ]
            out.append(Sector((ri + 1) * 100 + i + 1, ri, i, side, area, stand, central, rows))
    return tuple(out)


@lru_cache(maxsize=1)
def sector_map() -> dict[int, Sector]:
    return {s.number: s for s in sectors()}


def zones() -> dict[str, dict]:
    """All price zones with a readable name and their capacity."""
    out: dict[str, dict] = {}
    for s in sectors():
        z = out.setdefault(s.zone, {
            "code": s.zone,
            "name": f"{['Primo', 'Secondo', 'Terzo'][s.ring]} {AREA_NAMES[s.area]}{' centrale' if s.central else ''}",
            "ring": s.ring,
            "area": s.area,
            "central": s.central,
            "capacity": 0,
        })
        z["capacity"] += s.capacity
    return dict(sorted(out.items()))


def parse_seat_id(seat_id: str) -> tuple[Sector, int, int]:
    """'104-6-13' -> (sector 104, row 6, seat 13). Raises ValueError if it does not exist."""
    try:
        sec_s, row_s, num_s = seat_id.split("-")
        sec, row, num = int(sec_s), int(row_s), int(num_s)
    except ValueError as exc:
        raise ValueError(f"Posto non valido: {seat_id}") from exc
    sector = sector_map().get(sec)
    if sector is None or not (1 <= row <= len(sector.rows)) or not (1 <= num <= sector.rows[row - 1]):
        raise ValueError(f"Posto inesistente: {seat_id}")
    return sector, row, num


def capacity() -> int:
    return sum(s.capacity for s in sectors())
