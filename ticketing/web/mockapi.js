/* Demo mode: when the Python backend is not reachable (e.g. the pages are opened from a shared link),
   this file answers /api/* requests inside the browser with the same rules as backend/app.py.
   Data is kept in this browser's localStorage, shared by the store, admin and gate pages.
   With the backend running, every request goes to the real server and this file does nothing. */
(() => {
  const realFetch = window.fetch.bind(window);
  let modeP = null;
  const mode = () => modeP || (modeP = realFetch('/api/venue', { cache: 'no-store' })
    .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? 'server' : 'demo'))
    .catch(() => 'demo'));
  window.ticketingMode = mode;

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!/^\/api\//.test(url) || (await mode()) === 'server') return realFetch(input, init);
    try {
      const [status, body] = await handle(init.method || 'GET', url.split('?')[0], init.body ? JSON.parse(init.body) : null, init.headers || {});
      return status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      if (e && e.http) return new Response(JSON.stringify({ detail: e.detail }), { status: e.http, headers: { 'Content-Type': 'application/json' } });
      console.error(e);
      return new Response(JSON.stringify({ detail: 'Errore interno della demo' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };
  const fail = (http, detail) => { throw { http, detail }; };

  /* ---------- venue (same geometry as backend/venue.py) ---------- */
  const RINGS = [{ o0: 7, rows: 14, depth: 0.9 }, { o0: 20, rows: 14, depth: 0.9 }, { o0: 32, rows: 14, depth: 0.9 }];
  const SPR = 24, START = -2.0, AISLE = 1.3, GAP = 0.56, HW = 58, HH = 40, R = 12, SX = HW - R, SZ = HH - R;
  const line = (x0, z0, x1, z1, nx, nz) => [Math.hypot(x1 - x0, z1 - z0), (u) => [x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, nx, nz]];
  const arc = (cx, cz, a0, a1) => [R * Math.abs(a1 - a0), (u) => { const a = a0 + (a1 - a0) * u; return [cx + R * Math.cos(a), cz + R * Math.sin(a), Math.cos(a), Math.sin(a)]; }];
  const SEGS = [line(-SX, -HH, SX, -HH, 0, -1), arc(SX, -SZ, -Math.PI / 2, 0), line(HW, -SZ, HW, SZ, 1, 0), arc(SX, SZ, 0, Math.PI / 2),
    line(SX, HH, -SX, HH, 0, 1), arc(-SX, SZ, Math.PI / 2, Math.PI), line(-HW, SZ, -HW, -SZ, -1, 0), arc(-SX, -SZ, Math.PI, Math.PI * 1.5)];
  const PERIM = SEGS.reduce((a, s) => a + s[0], 0);
  const base = (s) => { s = ((s % PERIM) + PERIM) % PERIM; for (const [len, at] of SEGS) { if (s <= len) return at(s / len); s -= len; } return SEGS[7][1](1); };
  const sideOf = ([x, z, nx, nz]) => Math.abs(nx) > Math.abs(nz) ? (x > 0 ? 'sud' : 'nord') : (z < 0 ? 'ovest' : 'est');
  const SIDES = { ovest: ['arancio', 'Tribuna Ovest'], est: ['rosso', 'Tribuna Est'], sud: ['blu', 'Curva Sud'], nord: ['verde', 'Curva Nord'] };
  const AREA = { arancio: 'Arancio', rosso: 'Rosso', blu: 'Blu', verde: 'Verde' };
  function rowCount(sA, sB, off) {
    let total = 0, prev = null;
    for (let k = 0; k <= 40; k++) { const [x, z, nx, nz] = base(sA + (sB - sA) * k / 40), p = [x + nx * off, z + nz * off]; if (prev) total += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; }
    return Math.floor((total - 0.4) / GAP);
  }
  const SECTORS = [];
  RINGS.forEach((r, ri) => {
    const L = PERIM / SPR;
    for (let i = 0; i < SPR; i++) {
      const sA = START + i * L + AISLE / 2, sB = START + (i + 1) * L - AISLE / 2, mid = base((sA + sB) / 2), side = sideOf(mid);
      if (ri === 2 && side === 'ovest') continue;
      const [area, stand] = SIDES[side], central = (side === 'ovest' || side === 'est') && Math.abs(mid[0]) < 26;
      const rows = []; for (let j = 0; j < r.rows; j++) rows.push(rowCount(sA, sB, r.o0 + j * r.depth + r.depth * 0.45));
      SECTORS.push({ number: (ri + 1) * 100 + i + 1, ring: ri, index: i, side, area, stand, central, zone: `${ri + 1}-${area.toUpperCase()}${central ? '-C' : ''}`, rows });
    }
  });
  const SECMAP = new Map(SECTORS.map((s) => [s.number, s]));
  const ZONES = {};
  for (const s of SECTORS) {
    const z = ZONES[s.zone] || (ZONES[s.zone] = { code: s.zone, name: `${['Primo', 'Secondo', 'Terzo'][s.ring]} ${AREA[s.area]}${s.central ? ' centrale' : ''}`, ring: s.ring, area: s.area, central: s.central, capacity: 0 });
    z.capacity += s.rows.reduce((a, n) => a + n, 0);
  }
  const ZONE_CODES = Object.keys(ZONES).sort();
  const CAPACITY = SECTORS.reduce((a, s) => a + s.rows.reduce((b, n) => b + n, 0), 0);
  function* seatIds(s) { for (let r = 0; r < s.rows.length; r++) for (let k = 1; k <= s.rows[r]; k++) yield `${s.number}-${r + 1}-${k}`; }
  function parseSeat(id) {
    const [a, b, c] = String(id).split('-').map(Number), s = SECMAP.get(a);
    if (!s || !(b >= 1 && b <= s.rows.length) || !(c >= 1 && c <= s.rows[b - 1])) fail(422, `Posto inesistente: ${id}`);
    return s;
  }

  /* ---------- pricing (same as backend/pricing.py) ---------- */
  const AREA_BASE = { arancio: [189, 119, null], rosso: [159, 99, 59], blu: [79, 55, 39], verde: [79, 55, 39] };
  function defaultConfig() {
    const zp = {};
    for (const c of ZONE_CODES) { const z = ZONES[c]; let p = AREA_BASE[z.area][z.ring]; if (z.central) p = Math.round(p * 1.85 / 10) * 10 - 1; zp[c] = p; }
    return { club_name: 'Club di casa', zone_prices: zp, match_categories: { 'A+': 1.6, A: 1.25, B: 1.0, C: 0.8 },
      ticket_types: [{ code: 'INTERO', label: 'Intero', discount_pct: 0 }, { code: 'U18', label: 'Under 18', discount_pct: 40, max_age: 17 }, { code: 'OVER65', label: 'Over 65', discount_pct: 25, min_age: 65 }],
      service_fee: 2.5, dynamic_pricing: { enabled: true, steps: [[0.7, 0.10], [0.9, 0.20]] }, max_tickets_per_order: 4, hold_minutes: 10 };
  }
  function validate(cfg) {
    const e = [];
    for (const [c, p] of Object.entries(cfg.zone_prices || {})) { if (!ZONES[c]) e.push(`Zona sconosciuta: ${c}`); else if (!(p > 0 && p <= 5000)) e.push(`Prezzo non valido per ${c}: deve essere tra 1 e 5000 €`); }
    const miss = ZONE_CODES.filter((c) => !(c in (cfg.zone_prices || {}))); if (miss.length) e.push('Mancano i prezzi per: ' + miss.join(', '));
    for (const [c, m] of Object.entries(cfg.match_categories || {})) if (!(m >= 0.1 && m <= 5)) e.push(`Moltiplicatore non valido per la categoria ${c}`);
    const codes = new Set();
    for (const t of cfg.ticket_types || []) { if (!t.code || !t.label) e.push('Ogni tipo di biglietto deve avere codice e nome'); if (codes.has(t.code)) e.push(`Codice biglietto duplicato: ${t.code}`); codes.add(t.code); if (!((t.discount_pct || 0) >= 0 && (t.discount_pct || 0) < 100)) e.push(`Sconto non valido per ${t.code}`); }
    if (!codes.has('INTERO')) e.push('Serve sempre il biglietto INTERO');
    if (!(cfg.service_fee >= 0 && cfg.service_fee <= 50)) e.push('Commissione di servizio non valida');
    if (!(cfg.max_tickets_per_order >= 1 && cfg.max_tickets_per_order <= 10)) e.push('Il limite di biglietti per ordine deve essere tra 1 e 10');
    if (!(cfg.hold_minutes >= 2 && cfg.hold_minutes <= 30)) e.push('Il blocco dei posti deve durare tra 2 e 30 minuti');
    for (const s of (cfg.dynamic_pricing || {}).steps || []) if (s.length !== 2 || !(s[0] > 0 && s[0] < 1) || !(s[1] >= 0 && s[1] <= 1)) e.push('Ogni soglia di prezzo dinamico è [riempimento 0-1, rincaro 0-1]');
    return e;
  }
  const dyn = (cfg, occ) => { if (!cfg.dynamic_pricing.enabled) return 1; let x = 0; for (const [t, ex] of [...cfg.dynamic_pricing.steps].sort((a, b) => a[0] - b[0])) if (occ >= t) x = ex; return 1 + x; };
  const ttype = (cfg, code) => cfg.ticket_types.find((t) => t.code === code);
  function unitPrice(cfg, match, zone, code, occ) {
    const t = ttype(cfg, code); if (!t) fail(422, `Tipo di biglietto sconosciuto: ${code}`);
    const base = (match.price_overrides || {})[zone] || cfg.zone_prices[zone];
    return Math.floor(base * (cfg.match_categories[match.category] || 1) * dyn(cfg, occ) * (1 - (t.discount_pct || 0) / 100) + 0.5) * 100;
  }
  const feeC = (cfg) => Math.round(cfg.service_fee * 100);
  function ageOn(birth, day) { const [by, bm, bd] = birth.split('-').map(Number); return day.y - by - ((day.m < bm || (day.m === bm && day.d < bd)) ? 1 : 0); }

  /* ---------- storage ---------- */
  const KEY = 'tk_demo_v1';
  let mem = null;
  const now = () => Date.now() / 1000;
  const rid = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { mem = null; }
    if (!mem) {
      mem = { config: defaultConfig(), matches: [], seats: {}, holds: {}, orders: {}, tickets: {}, secret: rid(32) };
      for (const [id, away, comp, kickoff, cat] of [['demo-derby', 'Torre Calcio', 'Campionato', '2026-12-13T20:45:00+01:00', 'A+'],
        ['demo-coppa', 'Lago United', 'Coppa europea', '2026-12-09T21:00:00+01:00', 'A'], ['demo-campionato', 'Valle FC', 'Campionato', '2027-01-10T15:00:00+01:00', 'B']])
        mem.matches.push({ id, away_team: away, competition: comp, kickoff, category: cat, on_sale: true, price_overrides: {}, presale: true });
    }
    return mem;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {} };
  addEventListener('storage', (e) => { if (e.key === KEY) mem = null; });

  // Pre-sold seats are generated from the match id, so they never need to be stored.
  const PRESALE = { arancio: 0.40, rosso: 0.36, blu: 0.62, verde: 0.62 };
  const presaleCache = new Map();
  function presold(m) {
    if (presaleCache.has(m.id)) return presaleCache.get(m.id);
    const set = new Set();
    if (m.presale) {
      let h = 2166136261; for (const ch of m.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      let a = h >>> 0;
      const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      for (const s of SECTORS) { const rate = PRESALE[s.area] * (0.6 + rnd() * 0.8); for (const id of seatIds(s)) if (rnd() < rate) set.add(id); }
    }
    presaleCache.set(m.id, set); return set;
  }
  const getMatch = (id) => load().matches.find((m) => m.id === id) || fail(404, 'Partita non trovata');
  function releaseExpired() {
    const d = load(), t = now();
    for (const [mid, seats] of Object.entries(d.seats)) for (const [sid, st] of Object.entries(seats)) if (st.s === 'held' && st.exp < t) delete seats[sid];
    for (const h of Object.values(d.holds)) if (h.status === 'active' && h.expires < t) h.status = 'released';
  }
  const taken = (m) => { const s = new Set(presold(m)); for (const k of Object.keys(load().seats[m.id] || {})) s.add(k); return s; };
  function occupancy(m) {
    const tk = taken(m), cnt = {};
    for (const id of tk) { const z = SECMAP.get(+id.split('-')[0]).zone; cnt[z] = (cnt[z] || 0) + 1; }
    const o = {}; for (const c of ZONE_CODES) o[c] = (cnt[c] || 0) / ZONES[c].capacity; return o;
  }
  const pub = (m) => ({ id: m.id, home_team: load().config.club_name, away_team: m.away_team, competition: m.competition, kickoff: m.kickoff, category: m.category, on_sale: m.on_sale });

  async function sign(payload) {
    const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(load().secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))).slice(0, 16);
    return `${b64(new TextEncoder().encode(payload))}.${b64(sig)}`;
  }
  async function verify(token) {
    try {
      const [p64] = token.trim().split('.');
      const payload = new TextDecoder().decode(Uint8Array.from(atob(p64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
      return (await sign(payload)) === token.trim() ? payload.split('.')[0] : null;
    } catch { return null; }
  }

  /* ---------- routes ---------- */
  async function handle(method, path, body, headers) {
    const d = load(); releaseExpired();
    const p = path.split('/').filter(Boolean).slice(1); // drop 'api'
    const admin = () => { if ((headers['X-Admin-Token'] || headers['x-admin-token']) !== 'demo-admin') fail(401, 'Token amministratore mancante o errato'); };
    const out = (s, b) => { save(); return [s, b]; };

    if (method === 'GET' && p[0] === 'venue') return [200, { capacity: CAPACITY, zones: ZONES, sectors: SECTORS }];
    if (method === 'GET' && p[0] === 'matches' && p.length === 1) return [200, [...d.matches].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).map(pub)];
    if (p[0] === 'matches' && p[2] === 'prices') {
      const m = getMatch(p[1]), cfg = d.config, occ = occupancy(m), zones = {};
      for (const c of ZONE_CODES) { const pr = {}; for (const t of cfg.ticket_types) pr[t.code] = unitPrice(cfg, m, c, t.code, occ[c]); zones[c] = { name: ZONES[c].name, occupancy: Math.round(occ[c] * 1000) / 1000, prices: pr }; }
      return [200, { match_id: m.id, fee_cents: feeC(cfg), ticket_types: cfg.ticket_types, max_tickets_per_order: cfg.max_tickets_per_order, hold_minutes: cfg.hold_minutes, zones }];
    }
    if (p[0] === 'matches' && p[2] === 'availability') {
      const m = getMatch(p[1]), tk = taken(m), sectors = {}; let free = 0;
      for (const s of SECTORS) { let bits = ''; for (const id of seatIds(s)) bits += tk.has(id) ? '1' : '0'; free += bits.split('0').length - 1; sectors[s.number] = bits; }
      return out(200, { match_id: m.id, free, capacity: CAPACITY, sectors });
    }
    if (method === 'POST' && p[0] === 'matches' && p[2] === 'holds') {
      const m = getMatch(p[1]), cfg = d.config;
      if (!m.on_sale) fail(409, 'La vendita per questa partita è chiusa');
      const ids = [...new Set(body.seat_ids || [])];
      if (!ids.length) fail(422, 'Nessun posto selezionato');
      if (ids.length > cfg.max_tickets_per_order) fail(422, `Puoi bloccare al massimo ${cfg.max_tickets_per_order} posti per ordine`);
      ids.forEach(parseSeat);
      const tk = taken(m), un = ids.filter((id) => tk.has(id));
      if (un.length) fail(409, { message: 'Alcuni posti non sono più disponibili', unavailable: un });
      const hold_id = rid(16), expires = now() + cfg.hold_minutes * 60, seats = d.seats[m.id] || (d.seats[m.id] = {});
      for (const id of ids) seats[id] = { s: 'held', hold: hold_id, exp: expires };
      d.holds[hold_id] = { id: hold_id, match_id: m.id, expires, status: 'active' };
      return out(201, { hold_id, match_id: m.id, seat_ids: ids, expires_at: expires });
    }
    if (method === 'DELETE' && p[0] === 'holds') {
      const h = d.holds[p[1]];
      if (h) { const seats = d.seats[h.match_id] || {}; for (const [k, v] of Object.entries(seats)) if (v.hold === h.id && v.s === 'held') delete seats[k]; if (h.status === 'active') h.status = 'released'; }
      return out(204);
    }
    const activeHold = (id) => { const h = d.holds[id]; if (!h || h.status !== 'active' || h.expires < now()) fail(410, "Il tempo per completare l'acquisto è scaduto: scegli di nuovo i posti"); return h; };
    if (method === 'POST' && p[0] === 'orders' && p.length === 1) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email || '')) fail(422, 'Indirizzo email non valido');
      const h = activeHold(body.hold_id), m = getMatch(h.match_id), cfg = d.config;
      const held = Object.entries(d.seats[m.id] || {}).filter(([, v]) => v.hold === h.id && v.s === 'held').map(([k]) => k);
      const tickets = body.tickets || [];
      if (held.sort().join() !== tickets.map((t) => t.seat_id).sort().join()) fail(422, 'I nominativi devono corrispondere esattamente ai posti bloccati');
      const kd = m.kickoff.slice(0, 10).split('-').map(Number), day = { y: kd[0], m: kd[1], d: kd[2] }, occ = occupancy(m), fee = feeC(cfg), errors = [], lines = [];
      for (const t of tickets) {
        const tt = ttype(cfg, t.ticket_type);
        if (!tt) { errors.push(`${t.seat_id}: tipo di biglietto sconosciuto`); continue; }
        if (!t.first_name || !t.last_name || !/^\d{4}-\d{2}-\d{2}$/.test(t.birth_date || '')) { errors.push(`${t.seat_id}: mancano nome, cognome o data di nascita`); continue; }
        const age = ageOn(t.birth_date, day);
        if ('max_age' in tt && age > tt.max_age) { errors.push(`${t.first_name} ${t.last_name}: ${tt.label}: il titolare deve avere al massimo ${tt.max_age} anni il giorno della partita`); continue; }
        if ('min_age' in tt && age < tt.min_age) { errors.push(`${t.first_name} ${t.last_name}: ${tt.label}: il titolare deve avere almeno ${tt.min_age} anni il giorno della partita`); continue; }
        const zone = SECMAP.get(+t.seat_id.split('-')[0]).zone;
        lines.push({ ...t, zone, price_cents: unitPrice(cfg, m, zone, t.ticket_type, occ[zone]), fee_cents: fee });
      }
      if (errors.length) fail(422, { message: 'Controlla i nominativi', errors });
      const total = lines.reduce((a, l) => a + l.price_cents + l.fee_cents, 0), id = 'ORD-' + rid(4).toUpperCase();
      d.orders[id] = { id, match_id: m.id, hold_id: h.id, email: body.email, status: 'pending', total_cents: total, lines, created_at: now() };
      return out(201, { order_id: id, status: 'pending', total_cents: total, lines, expires_at: h.expires });
    }
    const orderView = (o) => ({ order_id: o.id, match_id: o.match_id, status: o.status, email: o.email, total_cents: o.total_cents,
      tickets: Object.values(d.tickets).filter((t) => t.order_id === o.id).sort((a, b) => a.seat_id.localeCompare(b.seat_id)) });
    if (method === 'POST' && p[0] === 'orders' && p[2] === 'pay') {
      const o = d.orders[p[1]] || fail(404, 'Ordine non trovato');
      if (o.status === 'paid') return [200, orderView(o)];
      const card = String(body.card_number || '').replace(/\D/g, '');
      if (card.length < 12) fail(422, 'Numero di carta non valido');
      if (card === '4000000000000002') fail(402, 'Pagamento rifiutato dalla banca (carta di prova). Prova con 4242 4242 4242 4242');
      const h = activeHold(o.hold_id), seats = d.seats[o.match_id] || {};
      for (const l of o.lines) {
        const tid = 'TK-' + rid(5).toUpperCase();
        seats[l.seat_id] = { s: 'sold', order: o.id };
        d.tickets[tid] = { id: tid, order_id: o.id, match_id: o.match_id, seat_id: l.seat_id, zone: l.zone, ticket_type: l.ticket_type, holder_first: l.first_name,
          holder_last: l.last_name, holder_birth: l.birth_date, price_cents: l.price_cents, fee_cents: l.fee_cents, token: await sign(`${tid}.${o.match_id}.${l.seat_id}`), status: 'valid', scanned_at: null };
      }
      o.status = 'paid'; o.paid_at = now(); h.status = 'converted';
      return out(200, orderView(o));
    }
    if (method === 'GET' && p[0] === 'orders') return [200, orderView(d.orders[p[1]] || fail(404, 'Ordine non trovato'))];
    if (method === 'POST' && p[0] === 'gate') {
      const tid = await verify(body.token || '');
      if (!tid) return [200, { result: 'invalid', message: 'QR non valido o contraffatto' }];
      const t = d.tickets[tid]; if (!t) return [200, { result: 'invalid', message: 'Biglietto inesistente' }];
      const info = { ticket_id: tid, seat_id: t.seat_id, holder: `${t.holder_first} ${t.holder_last}`, birth_date: t.holder_birth, ticket_type: t.ticket_type };
      if (body.match_id && body.match_id !== t.match_id) return [200, { result: 'wrong_match', message: "Biglietto valido per un'altra partita", ...info }];
      if (t.status !== 'valid') return [200, { result: 'already_used', message: 'Biglietto già utilizzato', ...info }];
      t.status = 'used'; t.scanned_at = now();
      return out(200, { result: 'ok', message: 'Ingresso consentito: controlla il documento', ...info });
    }
    if (p[0] === 'admin') {
      admin();
      if (p[1] === 'config' && method === 'GET') return [200, { config: d.config, zones: ZONES }];
      if (p[1] === 'config' && method === 'PUT') {
        const merged = { ...d.config, ...body }, e = validate(merged);
        if (e.length) fail(422, { message: 'Configurazione non valida', errors: e });
        d.config = merged; return out(200, { config: merged });
      }
      if (p[1] === 'matches' && p.length === 2 && method === 'POST') {
        if (!body.away_team || !body.competition || !body.kickoff) fail(422, 'Compila avversario, competizione e data');
        if (!(body.category in d.config.match_categories)) fail(422, `Categoria sconosciuta: ${body.category}`);
        const m = { id: rid(5), away_team: body.away_team, competition: body.competition, kickoff: body.kickoff, category: body.category, on_sale: true, price_overrides: {}, presale: !!body.presale };
        d.matches.push(m); return out(201, pub(m));
      }
      if (p[1] === 'matches' && method === 'PATCH') {
        const m = getMatch(p[2]);
        if (body.category != null) { if (!(body.category in d.config.match_categories)) fail(422, `Categoria sconosciuta: ${body.category}`); m.category = body.category; }
        if (body.on_sale != null) m.on_sale = !!body.on_sale;
        if (body.price_overrides != null) {
          const bad = Object.entries(body.price_overrides).filter(([z, v]) => !ZONES[z] || !(v > 0 && v <= 5000)).map(([z]) => z);
          if (bad.length) fail(422, 'Prezzi personalizzati non validi per: ' + bad.join(', '));
          m.price_overrides = body.price_overrides;
        }
        return out(200, { ...pub(m), price_overrides: m.price_overrides });
      }
      if (p[1] === 'matches' && p[3] === 'report') {
        const m = getMatch(p[2]), pre = presold(m), seats = d.seats[m.id] || {}, rows = {};
        for (const c of ZONE_CODES) rows[c] = { zone: c, name: ZONES[c].name, capacity: ZONES[c].capacity, presold: 0, sold_online: 0, held: 0, free: 0, revenue_cents: 0, fees_cents: 0 };
        for (const id of pre) if (!seats[id]) rows[SECMAP.get(+id.split('-')[0]).zone].presold++;
        for (const [id, v] of Object.entries(seats)) if (v.s === 'held') rows[SECMAP.get(+id.split('-')[0]).zone].held++;
        const ts = Object.values(d.tickets).filter((t) => t.match_id === m.id), byType = {};
        for (const t of ts) { const r = rows[t.zone]; r.sold_online++; r.revenue_cents += t.price_cents; r.fees_cents += t.fee_cents; byType[t.ticket_type] = (byType[t.ticket_type] || 0) + 1; }
        for (const r of Object.values(rows)) r.free = r.capacity - r.presold - r.sold_online - r.held;
        return [200, { match: { ...pub(m), price_overrides: m.price_overrides }, zones: Object.values(rows), by_type: byType,
          orders: Object.values(d.orders).filter((o) => o.match_id === m.id && o.status === 'paid').length, scanned: ts.filter((t) => t.status === 'used').length }];
      }
    }
    fail(404, 'Indirizzo non trovato');
  }
})();
