// SHORT STAFFED — authoritative simulation. Pure ES module: no DOM, no three.js,
// seeded LCG only (no Math.random in here). This exact file is inlined into
// server.js at package time and imported by the client for ?local=1 practice mode.

export const C = {
  TICK: 0.05, ROOM_X: 12, ROOM_Z: 7,
  COOK_R: 0.38, COOK_SPEED: 4.2, DRAG_MULT: 0.86, CUST_R: 0.36, CUST_SPEED: 1.7,
  REACH: 1.6, THROW_V: 8.5, THROW_UP: 4.8, GRAV: 20, BREAK_V: 6.5,
  SHIFT_LEN: 420, CLOSE_LEN: 8, COUNT_LEN: 3,
  SPRINT_MULT: 1.45, SPRINT_ACCEL: 6.5, STACK_MAX: 2, WOB_TUMBLE: 1,
  SLIP_SPEED: 3.4, STUN_SLIP: 0.9, STUN_LAND: 1.2, STUN_DROP: 0.3,
  PL_THROW_V: 9.5, PL_THROW_UP: 5.2, CARRY_RELEASE: 6, CARRY_MULT: 0.75, SOAK_T: 8, SOAK_MULT: 0.9,
  RENT: [520, 520, 1000, 1350, 1700], RENT_ZILLOW: 25,
  PAY: { flapjacks: 45, burger: 55, trout: 70, coffee: 15, matcha: 20 },
  TIP_MAX: 0.5, PATIENCE: 75, DALE_AURA: 0.75, FIRE_PANIC: 3,
  COOK_T: { batter: 10, patty: 12, trout: 8 }, FLIP_LO: 4, FLIP_HI: 6,
  BURN_T: { batter: 12, patty: 12, trout: 7 }, IGNITE_T: 6,
  FIRE_SPREAD: 8, FIRE_CAP: 6, DOUSE_T: 1.8, SPRAY_RANGE: 2.8, SCORCH_T: 5,
  PLATES: 12, WASH_T: 5, EAT_T: 20, ORDER_T: 5, POUR_T: 1.2,
  SPAWN_RATE: [2.5, 3, 3.2, 4, 4.2, 5, 5.5, 6], // parties/min by shift minute (hot open, hotter close)
  CREW_MULT: [0.65, 0.65, 1.0, 1.3, 1.6], PARTY_CAP_BASE: 2, PARTY_CAP_PER: 2,
  FLOCK_FAST: 45, FLOCK_BONUS_CAP: 3, SQUAT_AT: [90, 300], ZILLOW_AT: 150,
  ZILLOW_STAY: 120, ZILLOW_SPOT_T: 8, DALE_AT: 20, DALE_REFILL: 90, DALE_GIVEUP: 45,
  QUEUE_GIVEUP: 40, GRACE: 60, SEATS: 4, MAXQ: 40, SHARD_TTL: 30, DEBRIS_CAP: 40,
  SEASON_SHIFTS: 3, RENT_SCALE: 1.45, PREP_LEN: 30, CRED0: 20, GENT0: 10,
  CRED_DALE: 4, CRED_YEET: 2, CRED_CAPMULT: 0.3, GENT_ZILLOW: 8, GENT_FLOCK: 3, GENT_RENTMULT: 0.3,
  SUPPLY_LEN: 75, YARD_Z: 21.3, STOCK_CAP: 8,
  LARPER_AT: 120, SEQ_AT: 160, KALE_AT: 210,
  KALE_MULT: 3, KALE_PENALTY: 15, KALE_TRIES: 2, KALE_GENT: 4,
  SEQ_LATE: 0.5, SEQ_GENT_GOOD: 3, SEQ_GENT_POST: 6, SEQ_GENT_CLIP: 2, CONTAGION_FLOCKS: 2,
  LARPER_TIP: 45, LARPER_CRED: 2,
  FISH_MIN: 2.5, FISH_MAX: 6, FISH_WINDOW: 1.1,
  HUCK_PICKS: 3, BEAR_PROB: 0.22, BEAR_MINPICKS: 2, BEAR_SPEED: 1.4, BEAR_ROAR_R: 2.6, BEAR_SHOVE_R: 3.2, BEAR_EAT: 3,
  SYSCO_COST: 80, SYSCO_ODDS: 0.6, SYSCO_YIELD: 4,
  PREMIUM_TROUT_MULT: 1.6, HUCK_BONUS: 15, CRED_PREMIUM: 1,
  BUS_CLOCK: 70, BUS_BONUS: 15, BUS_WARN: 12,
};
// ── THE DIRECTOR (ported from THE LAST LOCAL, bible §12) ────────────────────
// The shift stops being a flat spawn curve and gains dramaturgy: named phases,
// an intensity budget that buys pressure events, ≤2 disaster families at once,
// every event telegraphed ~4s ahead, and a recovery valve after big hits.
// Arrivals stay OUTSIDE the budget (the existing spawn curve is the service
// floor): the room keeps filling while everything burns. That is the joke.
export const DIR = {
  phases: [
    { id: 'warm', start: 0, end: 100 },
    { id: 'compression', start: 100, end: 260 },
    { id: 'break', start: 260, end: 370 },
    { id: 'last_call', start: 370, end: 9999 },
  ],
  maxFam: 2,
  budget: { warm: 20, compression: 44, break: 58, last_call: 8 },
  regen: 0.55,
  valve: 26,            // seconds of no NEW pressure after a cost>=20 event
  lead: 4,              // telegraph seconds before the event bites
  messHold: 24,         // messScore above this holds new pressure too
  prepFault: 10,        // "something is already broken": shards at open
  headline: {           // guaranteed beats — the budget buys EXTRA friction, never the plot
    compression: { at: 40, pool: ['greasefire', 'flockwave'] },
    break: { at: 24, pool: ['tourbus', 'greasefire', 'flockwave'] },
  },
};
export const DIR_EV = {
  // weighted pressure (cost > 0, budget-gated)
  flockwave: { fam: 'tourist', w: 1.1, cost: 16, cd: 90, max: 3, phases: ['compression', 'break'], tg: 'phones_up' },
  greasefire: { fam: 'failure', w: 1.2, cost: 26, cd: 150, max: 2, phases: ['compression', 'break'], tg: 'griddle_hiss' },
  tourbus: { fam: 'tourist', w: 1.0, cost: 30, cd: 999, max: 1, phases: ['break'], tg: 'air_brakes' },
  // authored opening fault
  shardsopen: { fam: 'failure', cost: 0, cd: 999, max: 1, authored: true, tg: 'crash_back' },
  // fixed-time set pieces (the old AT clocks, now telegraphed + family-fair).
  // Social pressure holds a family slot; regulars/opportunities are service.
  squatter: { fam: 'social', ats: 'SQUAT_AT', cost: 0, cd: 30, max: 2, tg: 'airpods' },
  zillow: { fam: 'social', at: 'ZILLOW_AT', cost: 0, cd: 999, max: 1, tg: 'sedan_parks' },
  sequoia: { fam: 'social', at: 'SEQ_AT', cost: 0, cd: 999, max: 1, day: 2, tg: 'ringlight' },
  dale: { service: true, at: 'DALE_AT', cd: 20, tg: 'spurs_jingle' },
  larper: { service: true, at: 'LARPER_AT', cd: 999, max: 1, tg: 'yodel_radio' },
  kale: { service: true, at: 'KALE_AT', cd: 999, max: 1, tg: 'kale_text' },
};
// tomorrow's Specials — the player-drafted difficulty (3 of these 4 are offered each prep)
export const SPECIALS = {
  hucktoast: { pay: { flapjacks: 1.3 } },
  troutexp: { pay: { trout: 2.0 }, flockMult: 2 },
  oatmilk: { pay: { matcha: 2.2, coffee: 1.8 }, gent: 15 },
  menu87: { payAll: 0.85, patience: 1.25, cred: 12 },
};
// Hazel's wish list — season-permanent diner upgrades, bought from the banked
// carry on the prep card; each physically appears in the diner next shift
export const UPGRADES = {
  bell: { price: 60 },      // pass bell: tips ×1.5
  dishpit: { price: 90 },   // new dish pit: wash ×2, +4 plates
  walkin: { price: 100 },   // bigger walk-in: stock cap 8→14
  espresso: { price: 120 }, // espresso machine: instant-ish pours, drinks +$5
  pan2: { price: 140 },     // second pan: trout throughput doubles
  flattop: { price: 180 },  // new flat-top: griddle cooks 25% faster
};

// ---- layout ----------------------------------------------------------------
const T = (x, z) => ({ x, z, seats: [{ x: x - 0.95, z }, { x: x + 0.95, z }, { x, z: z - 0.95 }, { x, z: z + 0.95 }] });
export const LAYOUT = {
  door: { x: 10.4, z: 7, gap: 1.1 },              // opening in the south wall
  counter: { z: -2.6, x0: -12, x1: 5.0, gapX0: 5.5, gapX1: 7.2 }, // pass between kitchen/dining
  pass: [-6, -4.8, -3.6, -2.4, -1.2, 0, 1.2].map(x => ({ x, z: -2.6 })), // put-down spots on the counter
  griddle: { x: -8, z: -6.1, slots: [{ x: -8.5, z: -6.1 }, { x: -7.5, z: -6.1 }] },
  pan: { x: -5.5, z: -6.1, slots: [{ x: -5.5, z: -6.1 }, { x: -4.82, z: -6.1 }] }, // slot 1 unlocks with the pan2 upgrade
  taps: [{ x: -2.9, z: -6.1, fill: 'coffee' }, { x: -2.1, z: -6.1, fill: 'matcha' }],
  sink: { x: 1.5, z: -6.1 }, bin: { x: 3.1, z: -6.1 },
  shelf: { x: -10.6, z: -6.1 },
  crates: [{ x: -11.3, z: -4.3, ing: 'batter' }, { x: -10.3, z: -4.3, ing: 'patty' }, { x: -9.3, z: -4.3, ing: 'trout' }],
  extHook: { x: 4.4, z: -6.3 },
  sign: { x: 9.2, z: 6.6 },
  tables: [T(-8.5, 1.2), T(-4.5, 1.2), T(-0.5, 1.2), T(-8.5, 4.8), T(-4.5, 4.8), T(-0.5, 4.8)],
  stools: [{ x: -1, z: -1.9 }, { x: 0.5, z: -1.9 }, { x: 2, z: -1.9 }],
  wanderSpots: [{ x: 7.6, z: -0.6 }, { x: 3.4, z: 6.2 }, { x: -6.5, z: 3.1 }, { x: -10.9, z: -0.9 }],
  spawnsIn: [{ x: 9.6, z: 5.6 }, { x: 8.6, z: 6.2 }, { x: 10.8, z: 5.0 }, { x: 9.9, z: 4.4 }],
  // the supply yard (used during the 'supply' phase, dusk between shifts)
  truck: { x: 7.5, z: 11.5 },
  payphone: { x: 11, z: 9.5 },
  fishSpots: [{ x: -3, z: 19.6 }, { x: 2, z: 19.6 }, { x: 7, z: 19.6 }],
  huckBushes: [{ x: -8, z: 13.5 }, { x: -9.5, z: 15.5 }, { x: -7, z: 16.8 }, { x: -10.5, z: 18 }],
  bearDen: { x: -11.5, z: 13.2 },
  // fire can live on these surfaces (stations + counter run)
  surfaces: [
    { x: -8.5, z: -6.1 }, { x: -7.5, z: -6.1 }, { x: -5.5, z: -6.1 }, { x: -2.9, z: -6.1 }, { x: -2.1, z: -6.1 },
    { x: 1.5, z: -6.1 }, { x: -10.6, z: -6.1 }, { x: -6, z: -2.6 }, { x: -4.8, z: -2.6 }, { x: -3.6, z: -2.6 },
    { x: -2.4, z: -2.6 }, { x: -1.2, z: -2.6 }, { x: 0, z: -2.6 }, { x: 1.2, z: -2.6 },
  ],
};
// solid rectangles {x,z,hx,hz} — stations, counter segments, tables (as squares)
export const SOLIDS = (() => {
  const s = [];
  const add = (x, z, hx, hz) => s.push({ x, z, hx, hz });
  add(-8, -6.35, 1.35, 0.55); add(-5.5, -6.35, 0.8, 0.55); add(-2.5, -6.35, 0.95, 0.55); // griddle, range, bev
  add(1.5, -6.35, 0.7, 0.55); add(3.1, -6.35, 0.45, 0.45); add(-10.6, -6.35, 0.65, 0.5);  // sink, bin, shelf
  for (const c of LAYOUT.crates) add(c.x, c.z, 0.34, 0.34);
  const ct = LAYOUT.counter;
  add((ct.x0 + ct.gapX0) / 2, ct.z, (ct.gapX0 - ct.x0) / 2, 0.35);          // counter west run
  add((ct.gapX1 + 12) / 2, ct.z, (12 - ct.gapX1) / 2, 0.35);                // counter east run
  for (const t of LAYOUT.tables) add(t.x, t.z, 0.58, 0.58);
  // supply yard solids (outside the room; irrelevant during shifts)
  add(LAYOUT.truck.x, LAYOUT.truck.z, 2.2, 1.05);                           // the '87 F-250
  add(LAYOUT.payphone.x, LAYOUT.payphone.z, 0.32, 0.32);
  for (const b of LAYOUT.huckBushes) add(b.x, b.z, 0.55, 0.55);
  add(0, 21.55, 12, 0.35);                                                  // riverbank
  return s;
})();

const DISHES = ['flapjacks', 'burger', 'trout'];
const ING_DISH = { batter: 'flapjacks', patty: 'burger', trout: 'trout' };
const ING_STATION = { batter: 'griddle', patty: 'griddle', trout: 'pan' };

const R2 = v => Math.round(v * 100) / 100;
const d2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };

export class Sim {
  constructor(seed) {
    this.rs = (seed >>> 0) || 1;
    this.reset();
  }
  r() { this.rs = (this.rs * 1664525 + 1013904223) >>> 0; return this.rs / 4294967296; }
  ri(n) { return Math.floor(this.r() * n); }
  nid() { return this._id++; }

  reset() {
    this.ph = 'lobby'; this.t = 0; this.cd = 0; this._id = 1;
    this._tx1 = 0; this._tx2 = 0; this._zpaid = 0; this._daleGone = null; this._pendingOrder = new Map();
    this.players = new Map();           // pid -> player
    this.cust = []; this.items = []; this.tickets = []; this.fires = [];
    this.st = {
      griddle: LAYOUT.griddle.slots.map(() => null), pan: LAYOUT.pan.slots.map(() => null),
      taps: [0, 0], sink: { dirty: 0, washT: 0 }, shelf: C.PLATES, scorch: new Map(),
    };
    this.rentE = 0; this.rentTg = C.RENT[1];
    this.ev = []; this.spawnAcc = 0; this.flockBonus = 0; this.flockQ = 0;
    this.squatDone = []; this.zillowDone = false; this.dale = null; this.stats = { served: 0, broken: 0, fires: 0, yeets: 0, lost: 0 };
    this.reviews = []; this.ec = null; this.extOut = false;
    this.day = 1; this.cred = C.CRED0; this.gent = C.GENT0; this.special = null; this.prep = null; this.carry = 0;
    this.stock = { trout: 0, huck: 0 }; this.supplyT = 0; this.bushes = []; this.bear = null; this.syscoUsed = false;
    this.upgrades = [];
    this._larpDone = 0; this._kaleDone = 0; this._seqDone = 0; this._contagionNext = false;
    this.pstats = {};
    this.drcInit();
  }
  rentTarget() { return Math.round(C.RENT[this.crew()] * Math.pow(C.RENT_SCALE + (this.gent / 100) * C.GENT_RENTMULT, this.day - 1)); }
  bumpCred(n) { this.cred = Math.max(0, Math.min(100, this.cred + n)); }
  bumpGent(n) { this.gent = Math.max(0, Math.min(100, this.gent + n)); }
  up(id) { return this.upgrades.includes(id); }
  stockCap() { return this.up('walkin') ? 14 : C.STOCK_CAP; }
  buy(id) {
    if (this.ph !== 'supply' && this.ph !== 'prep') return;
    const u = UPGRADES[id];
    if (!u || this.up(id) || this.carry < u.price) return;
    this.carry -= u.price;
    this.upgrades.push(id);
    if (this.prep) this.prep.sum.carry = Math.round(this.carry);
    this.push({ k: 'bought', u: id });
  }

  // ---- players --------------------------------------------------------------
  join(pid, name, color) {
    let p = this.players.get(pid);
    if (p) { p.conn = true; p.graceT = 0; return p.seat; }
    let seat = -1;
    const used = new Set([...this.players.values()].map(q => q.seat));
    for (let i = 0; i < C.SEATS; i++) if (!used.has(i)) { seat = i; break; }
    if (seat < 0) return -1; // spectator
    p = {
      pid, seat, name: String(name || 'Cook').slice(0, 16), color: (color | 0) % 4,
      x: 8.2 + seat * 0.7, z: 5.4, yaw: 0, fx: 0, fz: -1, vx: 0, vz: 0,
      held: null, heldCu: null, busyT: 0, spray: false, cast: false, castT: 0, biteT: 0,
      stack: [], wob: 0, stunT: 0, carriedBy: -1, heldPl: -1, air: null, y: 0, soakT: 0, carryT: 0,
      slideX: 0, slideZ: 0, svx: 0, svz: 0,
      in: { x: 0, z: 0, ah: false, sp: false, fx: 0, fz: -1 }, aSeen: 0, thSeen: 0, aPend: 0, thPend: 0,
      conn: true, graceT: 0,
    };
    this.players.set(pid, p);
    if (!this.pstats) this.pstats = {};
    this.pstats[seat] = this.pstats[seat] || { sv: 0, br: 0, fi: 0, yt: 0, fy: 0, sl: 0, ca: 0, bk: 0, name: p.name };
    this.pstats[seat].name = p.name;
    return seat;
  }
  bySeat(seat) { for (const p of this.players.values()) if (p.seat === seat) return p; return null; }
  pst(seat) { if (!this.pstats) this.pstats = {}; return this.pstats[seat] = this.pstats[seat] || { sv: 0, br: 0, fi: 0, yt: 0, fy: 0, sl: 0, ca: 0, bk: 0, name: '?' }; }
  leave(pid) { const p = this.players.get(pid); if (p) { p.conn = false; p.graceT = C.GRACE; this.dropAll(p); } }
  input(pid, m) {
    const p = this.players.get(pid); if (!p) return;
    const f = v => (Number.isFinite(v) ? v : 0);
    let x = f(m.x), z = f(m.z); const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    p.in.x = x; p.in.z = z; p.in.ah = !!m.ah; p.in.sp = !!m.sp;
    const fx = f(m.fx), fz = f(m.fz), fl = Math.hypot(fx, fz);
    if (fl > 0.3) { p.in.fx = fx / fl; p.in.fz = fz / fl; }
    const a = m.a | 0, th = m.th | 0;
    if (a > p.aSeen) { p.aPend += Math.min(4, a - p.aSeen); p.aSeen = a; }
    if (th > p.thSeen) { p.thPend += Math.min(4, th - p.thSeen); p.thSeen = th; }
  }
  again() { if (this.ph === 'over') { const keep = [...this.players.values()]; this.reset(); for (const p of keep) if (p.conn) this.join(p.pid, p.name, p.color); this.push({ k: 'start' }); } }

  push(e) { this.ev.push(e); }
  crew() { return Math.max(1, Math.min(4, [...this.players.values()].filter(p => p.conn).length)); }

  // ---- tick -----------------------------------------------------------------
  tick(dt) {
    this.ev = [];
    for (const [pid, p] of [...this.players]) {
      if (!p.conn) { p.graceT -= dt; if (p.graceT <= 0) { this.dropAll(p); this.players.delete(pid); } }
    }
    if (this.ph === 'count') { this.cd -= dt; if (this.cd <= 0) { this.ph = 'shift'; this.t = 0; this.rentTg = this.rentTarget(); this.push({ k: 'open' }); } }
    if (this.ph === 'shift') { this.t += dt; this.shiftDirector(dt); if (this.t >= C.SHIFT_LEN) { this.ph = 'close'; this.cd = C.CLOSE_LEN; this.push({ k: 'lastcall' }); } }
    if (this.ph === 'close') {
      this.cd -= dt;
      for (const cu of this.cust) if (cu.st !== 'leave' && cu.st !== 'drag' && cu.st !== 'air') this.sendHome(cu);
      for (const f of this.fires) f.hp = 0;
      if (this.cd <= 0) this.endShift();
    }
    if (this.ph === 'supply') {
      this.supplyT -= dt;
      this.tickBear(dt);
      if (this.supplyT <= 0) {
        for (const p of this.players.values()) { p.cast = false; p.biteT = 0; }
        this.prep.sum.carry = Math.round(this.carry);
        this.ph = 'prep';
        this.push({ k: 'prep' });
      }
    }
    if (this.ph === 'prep' && this.prep) {
      this.prep.t -= dt;
      if (this.prep.t <= 0 && this.prep.picked == null) this.pick(this.ri(this.prep.offer.length));
    }
    const order = [...this.players.values()].sort((a, b) => a.seat - b.seat);
    for (const p of order) this.tickPlayer(p, dt);
    // carried friends ride the carrier; everyone else gets personal space (barely)
    for (const p of order) {
      if (p.carriedBy < 0) continue;
      const c = this.bySeat(p.carriedBy);
      if (c && c.conn) { p.x = c.x - c.in.fx * 0.18; p.z = c.z - c.in.fz * 0.18; p.y = 0; }
      else p.carriedBy = -1;
    }
    for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
      const a = order[i], b = order[j];
      if (!a.conn || !b.conn || a.carriedBy >= 0 || b.carriedBy >= 0 || a.air || b.air) continue;
      let dx = b.x - a.x, dz = b.z - a.z;
      const dd = Math.hypot(dx, dz), min = C.COOK_R * 1.8;
      if (dd < min && dd > 0.0001) {
        const push = (min - dd) / 2; dx /= dd; dz /= dd;
        a.x -= dx * push; a.z -= dz * push;
        b.x += dx * push; b.z += dz * push;
      }
    }
    this.tickStations(dt); this.tickFires(dt); this.tickCustomers(dt); this.tickItems(dt);
    return this.ev;
  }

  shiftDirector(dt) {
    // service floor: the baseline spawn curve. NOT budget-gated — the room
    // keeps filling while everything burns (that is the joke).
    const min = Math.min(7, Math.floor(this.t / 60));
    const rate = C.SPAWN_RATE[min] * C.CREW_MULT[this.crew()] / 60;
    this.spawnAcc += rate * dt;
    const parties = new Set(this.cust.filter(c => c.party != null && ['enter', 'sit', 'wait', 'eat'].includes(c.st)).map(c => c.party));
    const cap = C.PARTY_CAP_BASE + C.PARTY_CAP_PER * this.crew();
    if (this.spawnAcc >= 1 && parties.size < cap) { this.spawnAcc -= 1; this.spawnParty(); }
    if (this.flockQ > 0) { this.flockQ--; this.spawnFlock(true); }
    if (!this._tx1 && this.t >= 120) { this._tx1 = 1; this.push({ k: 'text', s: 'll_up' }); }
    if (!this._tx2 && this.t >= 360) { this._tx2 = 1; this.push({ k: 'text', s: 'll_grateful' }); }
    // the tour bus departure clock runs on real dt (the honk must not quantize)
    if (this.busT > 0) {
      this.busT -= dt;
      if (!this._busWarn && this.busT <= C.BUS_WARN) { this._busWarn = 1; this.push({ k: 'buswarn' }); }
      if (this.busT <= 0) this.busHonk();
    }
    // director core at 1 Hz
    this.drc.t1 -= dt;
    if (this.drc.t1 <= 0) { this.drc.t1 += 1; this.drcTick(); }
  }

  // ── THE DIRECTOR (ported from THE LAST LOCAL, bible §12) ──────────────────
  drcInit() {
    this.drc = {
      t1: 1, budget: 0, valveT: 0, used: {}, cd: {}, pending: [],
      famAt: {}, hlDone: {}, prepDone: false, log: [],
    };
    this.busT = 0; this._busWarn = 0; this.squatDone = this.squatDone || [];
  }
  phaseId() { for (const p of DIR.phases) if (this.t >= p.start && this.t < p.end) return p.id; return 'last_call'; }
  messScore() {
    let m = 0;
    m += this.fires.length * 10;
    m += this.items.filter(i => i.k === 'shard').length * 4;
    m += this.cust.filter(c => c.ty === 'squatter' && ['squat', 'reseat'].includes(c.st)).length * 3;
    for (const stName of ['griddle', 'pan']) for (const s of this.st[stName]) if (s && (s.st === 'burning' || s.st === 'burnt')) m += 2;
    return m;
  }
  drcFamOpen(key) {
    const e = DIR_EV[key];
    if (e.service) return true;
    const active = Object.keys(this.drc.famAt).filter(f => this.drc.famAt[f] > this.t - 45);
    return active.includes(e.fam) || active.length < DIR.maxFam;
  }
  /** Book a module: bookkeeping, the telegraph, then the lead-in wait. Every
   *  path into the pressure web goes through here so "announces itself before
   *  it bites" can never be bypassed. */
  drcSchedule(key, why) {
    const d = this.drc, e = DIR_EV[key];
    d.used[key] = (d.used[key] || 0) + 1;
    d.cd[key] = e.cd || 0;
    if (!e.service) d.famAt[e.fam] = this.t;
    if ((e.cost || 0) >= 20) d.valveT = DIR.valve;
    if (d.log.length < 60) d.log.push({ t: this.t | 0, key, why });
    this.push({ k: 'tg', s: e.tg });
    d.pending.push({ key, tLeft: DIR.lead });
  }
  drcPending(key) { return this.drc.pending.some(p => p.key === key); }
  drcTick() {
    const d = this.drc;
    const phase = this.phaseId();
    d.budget = Math.min(DIR.budget[phase] || 0, d.budget + DIR.regen);
    if (d.valveT > 0) d.valveT -= 1;
    for (const k of Object.keys(d.cd)) if (d.cd[k] > 0) d.cd[k] -= 1;
    // fire pending effects whose telegraph lead elapsed
    for (let i = d.pending.length - 1; i >= 0; i--) {
      const pe = d.pending[i];
      pe.tLeft -= 1;
      if (pe.tLeft <= 0) { d.pending.splice(i, 1); this.drcFire(pe.key); }
    }
    // authored opening fault: something is ALREADY broken (bible §7)
    if (!d.prepDone && this.t >= DIR.prepFault) { d.prepDone = true; this.drcSchedule('shardsopen', 'prep'); }
    // fixed-time set pieces — the old AT clocks, now telegraphed and
    // family-fair: social pressure WAITS for a slot rather than piling on
    for (const key of Object.keys(DIR_EV)) {
      const e = DIR_EV[key];
      if (!e.at && !e.ats) continue;
      if ((d.cd[key] || 0) > 0 || this.drcPending(key)) continue;
      if (e.day && this.day < e.day) continue;
      if (e.ats) {
        const at = C[e.ats].find(a => this.t >= a && !this.squatDone.includes(a));
        if (at == null) continue;
        if ((d.used[key] || 0) >= (e.max || 99)) continue;
        if (!this.drcFamOpen(key)) continue;
        this.squatDone.push(at);
        this.drcSchedule(key, 'set');
        continue;
      }
      if (this.t < C[e.at]) continue;
      if (key === 'dale') {
        // Dale comes back after a walk (the regular's return keeps its old rule)
        if (this.dale || (this._daleGone != null && this.t - this._daleGone <= 120)) continue;
        if (this._daleGone == null && (d.used.dale || 0) > 0) continue;
      } else if ((d.used[key] || 0) >= (e.max || 99)) continue;
      if (!this.drcFamOpen(key)) continue;
      this.drcSchedule(key, 'set');
    }
    if (phase === 'last_call') return;
    // guaranteed headlines: compression fails one system, the break point
    // lands one big beat. Budget-free — the budget buys EXTRA friction, never
    // the plot. Still obeys the ≤2-family rule (waits for a slot).
    const hl = DIR.headline[phase];
    if (hl && !d.hlDone[phase]) {
      const ph = DIR.phases.find(q => q.id === phase);
      if (this.t - ph.start >= hl.at) {
        const live = hl.pool.filter(k => (d.used[k] || 0) < (DIR_EV[k].max || 99));
        const pool = live.filter(k => this.drcFamOpen(k));
        if (pool.length) { d.hlDone[phase] = true; this.drcSchedule(pool[this.ri(pool.length)], 'headline'); return; }
        if (!live.length) d.hlDone[phase] = true;
        else return; // wait for a family slot
      }
    }
    // weighted extras: mess and the post-spike valve hold back NEW pressure
    if (d.valveT > 0 || this.messScore() > DIR.messHold) return;
    const cands = [];
    for (const key of ['flockwave', 'greasefire', 'tourbus']) {
      const e = DIR_EV[key];
      if (!e.phases.includes(phase)) continue;
      if ((d.used[key] || 0) >= e.max) continue;
      if ((d.cd[key] || 0) > 0 || this.drcPending(key)) continue;
      if (e.cost > d.budget) continue;
      if (!this.drcFamOpen(key)) continue;
      cands.push(e.w);
      cands.push(key);
    }
    if (!cands.length) return;
    let total = 0;
    for (let i = 0; i < cands.length; i += 2) total += cands[i];
    let roll = this.r() * total, chosen = cands[1];
    for (let i = 0; i < cands.length; i += 2) { roll -= cands[i]; if (roll <= 0) { chosen = cands[i + 1]; break; } }
    d.budget -= DIR_EV[chosen].cost;
    this.drcSchedule(chosen, 'budget');
  }
  drcFire(key) {
    if (key === 'squatter') this.spawnSquatter();
    else if (key === 'zillow') { this.zillowDone = true; this.spawnZillow(); }
    else if (key === 'dale') this.spawnDale();
    else if (key === 'larper') this.spawnLarper();
    else if (key === 'kale') this.spawnKale();
    else if (key === 'sequoia') this.spawnSequoia();
    else if (key === 'flockwave') { this.spawnFlock(false); this.flockQ += 1; }
    else if (key === 'greasefire') {
      const slots = LAYOUT.griddle.slots;
      const s = slots[this.ri(slots.length)];
      this.igniteAt(s.x, s.z, null);
    } else if (key === 'shardsopen') {
      for (let i = 0; i < 2; i++) this.spawnItem('shard', LAYOUT.sink.x + 0.5 + i * 0.55, 0, LAYOUT.sink.z + 0.9 + i * 0.3);
      this.push({ k: 'openfault' });
    } else if (key === 'tourbus') {
      const before = this.cust.length;
      for (let i = 0; i < 3; i++) this.spawnCampers(2);
      const fresh = this.cust.slice(before);
      if (!fresh.length) return;
      for (const cu of fresh) cu.bus = true;
      this.busT = C.BUS_CLOCK; this._busWarn = 0;
      this.push({ k: 'busin' });
    }
  }
  busHonk() {
    this.busT = 0;
    this.push({ k: 'bushonk' });
    const parties = new Map();
    for (const cu of this.cust) if (cu.bus) { if (!parties.has(cu.party)) parties.set(cu.party, []); parties.get(cu.party).push(cu); }
    for (const [, members] of parties) {
      const fed = members.some(m => m.st === 'eat' || m.eatT > 0);
      if (fed) { this.rentE += C.BUS_BONUS; this.push({ k: 'tip', a: C.BUS_BONUS }); }
      else for (const m of members) this.sendHome(m);
    }
    for (const cu of this.cust) cu.bus = false;
  }

  // ---- customers ------------------------------------------------------------
  mkCust(ty, x, z, extra) {
    const cu = Object.assign({
      id: this.nid(), ty, st: 'enter', x, z, yaw: 0, tx: x, tz: z, seat: null, table: null, stool: null,
      party: null, pat: C.PATIENCE, order: null, eatT: 0, spotT: 0, spot: 0, stayT: 0,
      y: 0, vx: 0, vy: 0, vz: 0, holder: null, wants: null, giveT: C.QUEUE_GIVEUP,
    }, extra || {});
    this.cust.push(cu); this.push({ k: 'chime' }); return cu;
  }
  freeTable(n) {
    for (let i = 0; i < LAYOUT.tables.length; i++) {
      if (this.cust.some(c => c.table === i && !['leave', 'out'].includes(c.st))) continue;
      if (n <= 4) return i;
    }
    return -1;
  }
  freeStool() {
    for (let i = 0; i < LAYOUT.stools.length; i++) if (!this.cust.some(c => c.stool === i && !['leave', 'out'].includes(c.st))) return i;
    return -1;
  }
  spawnParty() {
    const roll = this.r();
    if (this.t > 60 && roll < 0.45) this.spawnFlock(false);
    else this.spawnCampers(this.t > 60 && roll < 0.8 ? 2 : 1);
  }
  spawnFlock(bonus) {
    const ti = this.freeTable(3); if (ti < 0) return;
    const party = this.nid(); const tbl = LAYOUT.tables[ti];
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const sp = LAYOUT.spawnsIn[i % LAYOUT.spawnsIn.length];
      this.mkCust('flock', sp.x + this.r() * 0.6, sp.z, { party, table: ti, seat: i });
      lines.push({ d: 'matcha', ok: false });
      if (this.r() < 0.3) lines.push({ d: 'flapjacks', ok: false });
    }
    this._pendingOrder = this._pendingOrder || new Map();
    this._pendingOrder.set(party, { lines, flock: true, bonus });
  }
  spawnCampers(n) {
    if (n === 1 && this.r() < 0.35) {
      const si = this.freeStool(); if (si >= 0) {
        const party = this.nid(); const sp = LAYOUT.spawnsIn[0];
        this.mkCust('camper', sp.x, sp.z, { party, stool: si });
        const lines = [{ d: this.rollDish(), ok: false }];
        (this._pendingOrder = this._pendingOrder || new Map()).set(party, { lines });
        return;
      }
    }
    const ti = this.freeTable(n); if (ti < 0) return;
    const party = this.nid(); const lines = [];
    for (let i = 0; i < n; i++) {
      const sp = LAYOUT.spawnsIn[i % LAYOUT.spawnsIn.length];
      this.mkCust('camper', sp.x - i * 0.5, sp.z + i * 0.3, { party, table: ti, seat: i });
      lines.push({ d: this.rollDish(), ok: false });
    }
    (this._pendingOrder = this._pendingOrder || new Map()).set(party, { lines });
  }
  rollDish() { const r = this.r(); return r < 0.35 ? 'flapjacks' : r < 0.7 ? 'burger' : r < 0.9 ? 'trout' : 'coffee'; }
  spawnSquatter() {
    const ti = this.freeTable(4); if (ti < 0) return;
    const party = this.nid();
    this.mkCust('squatter', LAYOUT.spawnsIn[1].x, LAYOUT.spawnsIn[1].z, { party, table: ti, seat: 0 });
    (this._pendingOrder = this._pendingOrder || new Map()).set(party, { lines: [{ d: 'coffee', ok: false }], squat: true });
    this.push({ k: 'text', s: 'squat_in' });
  }
  spawnKale() {
    const ti = this.freeTable(1); if (ti < 0) return;
    const party = this.nid();
    this.mkCust('kale', LAYOUT.spawnsIn[2].x, LAYOUT.spawnsIn[2].z, { party, table: ti, seat: 0 });
    const answers = ['flapjacks', 'burger', 'trout', 'coffee', 'matcha'];
    const answer = answers[this.ri(answers.length)];
    this._pendingOrder.set(party, { lines: [{ d: answer, ok: false }], kale: true });
    this.push({ k: 'text', s: 'kale_in' });
  }
  spawnSequoia() {
    const ti = this.freeTable(1); if (ti < 0) return;
    const party = this.nid();
    this.mkCust('sequoia', LAYOUT.spawnsIn[3].x, LAYOUT.spawnsIn[3].z, { party, table: ti, seat: 0 });
    this._pendingOrder.set(party, { lines: [{ d: 'matcha', ok: false }, { d: 'trout', ok: false }], seq: true });
    this.push({ k: 'text', s: 'seq_in' });
  }
  spawnLarper() {
    const si = this.freeStool();
    const party = this.nid();
    if (si >= 0) this.mkCust('larper', LAYOUT.spawnsIn[0].x, LAYOUT.spawnsIn[0].z, { party, stool: si });
    else { const ti = this.freeTable(1); if (ti < 0) return; this.mkCust('larper', LAYOUT.spawnsIn[0].x, LAYOUT.spawnsIn[0].z, { party, table: ti, seat: 0 }); }
    this._pendingOrder.set(party, { lines: [{ d: 'burger', ok: false }] });
  }
  spawnZillow() {
    for (let i = 0; i < 2; i++) this.mkCust('zillow', LAYOUT.spawnsIn[2].x - i, LAYOUT.spawnsIn[2].z, { st: 'wander', stayT: C.ZILLOW_STAY, spot: this.ri(LAYOUT.wanderSpots.length), spotT: C.ZILLOW_SPOT_T, zw: i });
    this.push({ k: 'text', s: 'zillow_in' });
  }
  spawnDale() {
    const si = this.freeStool();
    const cu = this.mkCust('dale', LAYOUT.spawnsIn[0].x, LAYOUT.spawnsIn[0].z, { stool: si >= 0 ? si : 2, party: this.nid() });
    this.dale = { id: cu.id, content: false, refillT: 0, giveT: C.DALE_GIVEUP };
    (this._pendingOrder = this._pendingOrder || new Map()).set(cu.party, { lines: [{ d: 'coffee', ok: false }], dale: true });
  }
  seatPos(cu) {
    if (cu.stool != null) return LAYOUT.stools[cu.stool];
    const t = LAYOUT.tables[cu.table]; return t.seats[cu.seat % 4];
  }
  sendHome(cu) { if (['drag', 'air', 'out'].includes(cu.st)) return; cu.st = 'leave'; cu.tx = LAYOUT.door.x; cu.tz = LAYOUT.door.z + 1.5; }

  tickCustomers(dt) {
    const fireVisible = this.fires.length > 0;
    const aura = this.dale && this.dale.content ? C.DALE_AURA : 1;
    for (const cu of this.cust) {
      if (cu.st === 'enter') {
        const sp = cu.st === 'enter' && (cu.table != null || cu.stool != null) ? this.seatPos(cu) : null;
        if (!sp) { cu.st = 'leave'; continue; }
        this.walk(cu, sp.x, sp.z, dt);
        if (d2(cu.x, cu.z, sp.x, sp.z) < 0.09) {
          cu.st = 'sit'; cu.x = sp.x; cu.z = sp.z; cu.sitT = C.ORDER_T;
          if (cu.stool != null) cu.yaw = Math.PI; // stools face the counter
          else { const t = LAYOUT.tables[cu.table]; cu.yaw = Math.atan2(t.x - cu.x, t.z - cu.z); }
        }
      } else if (cu.st === 'sit') {
        cu.sitT -= dt;
        if (cu.sitT <= 0) {
          cu.st = cu.ty === 'squatter' ? 'squat' : 'wait';
          const po = this._pendingOrder && this._pendingOrder.get(cu.party);
          if (po && !po.placed) {
            po.placed = true;
            this.tickets.push({
              id: this.nid(), party: cu.party, table: cu.table, stool: cu.stool, ln: po.lines, t0: this.t, pat: C.PATIENCE,
              flock: !!po.flock, bonus: !!po.bonus, squat: !!po.squat, dale: !!po.dale,
              kale: !!po.kale, riddle: po.kale ? po.lines[0].d : undefined, tries: 0, seq: !!po.seq,
            });
            this.push({ k: 'order', tb: cu.table, st: cu.stool });
          }
        }
      } else if (cu.st === 'wait' || cu.st === 'squat') {
        // patience lives on the ticket
      } else if (cu.st === 'eat') {
        cu.eatT -= dt;
        if (cu.eatT <= 0) {
          this.sendHome(cu);
          const sp = this.seatPos(cu);
          this.spawnItem('dirty', sp.x, 0.95, sp.z);
          if (this.dale && cu.id === this.dale.id) this.dale = null;
        }
      } else if (cu.st === 'wander') {
        cu.stayT -= dt; cu.spotT -= dt;
        const s = LAYOUT.wanderSpots[cu.spot];
        this.walk(cu, s.x + cu.zw * 0.8, s.z, dt);
        if (cu.spotT <= 0) { cu.spot = this.ri(LAYOUT.wanderSpots.length); cu.spotT = C.ZILLOW_SPOT_T; this.push({ k: 'appraise', x: cu.x, z: cu.z }); }
        if (cu.stayT <= 0) {
          this.sendHome(cu);
          if (!this._zpaid) { this._zpaid = 1; this.rentTg += C.RENT_ZILLOW; this.bumpGent(C.GENT_ZILLOW); this.push({ k: 'text', s: 'zillow_out' }); }
        }
      } else if (cu.st === 'leave') {
        this.walk(cu, cu.tx, cu.tz, dt);
        if (cu.z > C.ROOM_Z + 0.8 || d2(cu.x, cu.z, cu.tx, cu.tz) < 0.16) cu.st = 'out';
      } else if (cu.st === 'drag') {
        const p = [...this.players.values()].find(q => q.heldCu === cu.id);
        if (!p) { cu.st = 'reseat'; continue; }
        cu.x = p.x + p.in.fx * 0.55; cu.z = p.z + p.in.fz * 0.55; cu.yaw = p.yaw;
      } else if (cu.st === 'air') {
        cu.vy -= C.GRAV * dt; cu.x += cu.vx * dt; cu.y += cu.vy * dt; cu.z += cu.vz * dt;
        const out = this.outThroughDoor(cu.x, cu.z);
        if (!out) this.bounceWalls(cu, 0.3);
        if (cu.y <= 0) {
          cu.y = 0;
          if (out) { cu.st = 'out'; this.stats.yeets++; if (cu.thrownBy != null) this.pst(cu.thrownBy).yt++; this.push({ k: 'thud', x: cu.x, z: cu.z, s: cu.thrownBy }); this.queueReview('r_squat'); this.spawnItem('laptop', cu.x - 0.5, 0.6, Math.min(cu.z, C.ROOM_Z + 1.5)); this.dropTicket(cu.party); this.bumpCred(C.CRED_YEET); }
          else { cu.st = 'reseat'; this.push({ k: 'thud', x: cu.x, z: cu.z }); }
        }
      } else if (cu.st === 'reseat') {
        const sp = this.seatPos(cu);
        this.walk(cu, sp.x, sp.z, dt);
        if (d2(cu.x, cu.z, sp.x, sp.z) < 0.09) { cu.st = 'squat'; cu.x = sp.x; cu.z = sp.z; }
      }
      if (fireVisible && ['wait', 'eat'].includes(cu.st) && this.nearFire(cu.x, cu.z, 2.2)) {
        this.sendHome(cu); this.push({ k: 'flee', x: cu.x, z: cu.z }); this.dropTicket(cu.party);
      }
    }
    this.cust = this.cust.filter(c => c.st !== 'out');
    // ticket patience: Dale's aura × Local Cred × the 1987-menu special × fire panic
    const credMult = 1 - Math.min(60, this.cred) / 100 * C.CRED_CAPMULT;
    const spPat = this.special && SPECIALS[this.special] && SPECIALS[this.special].patience || 1;
    for (const tk of this.tickets) {
      if (tk.squat) continue;
      let drain = aura * credMult / spPat; if (fireVisible) drain *= C.FIRE_PANIC;
      tk.pat -= dt * drain;
      if (tk.pat <= 0) {
        if (tk.seq) this.seqPost();
        this.dropTicket(tk.party, true);
        this.queueReview(tk.seq ? 'r_seq_post' : 'r_slow'); this.push({ k: 'angry' }); this.stats.lost++;
      }
    }
    // Dale refill desire
    if (this.dale) {
      const d = this.dale;
      if (d.content) {
        d.refillT += dt;
        if (d.refillT >= C.DALE_REFILL && !this.tickets.some(t => t.dale)) {
          d.refillT = 0; d.content = false; d.giveT = C.DALE_GIVEUP;
          const cu = this.cust.find(c => c.id === d.id);
          if (cu) this.tickets.push({ id: this.nid(), party: cu.party, table: null, stool: cu.stool, ln: [{ d: 'coffee', ok: false }], t0: this.t, pat: C.PATIENCE, dale: true });
        }
      } else if (this.tickets.some(t => t.dale)) {
        d.giveT -= dt;
        if (d.giveT <= 0 && d.giveT > -999) {
          d.giveT = -1000; this.dropTicket(this.cust.find(c => c.id === d.id)?.party, true);
          const cu = this.cust.find(c => c.id === d.id);
          if (cu) { this.sendHome(cu); this.rentE += 1.4; this.push({ k: 'text', s: 'dale_out' }); }
          this.dale = null; this._daleGone = this.t;
        }
      }
    }
  }
  dropTicket(party, angry) {
    const i = this.tickets.findIndex(t => t.party === party);
    if (i >= 0) this.tickets.splice(i, 1);
    for (const cu of this.cust) if (cu.party === party && ['wait', 'sit', 'enter'].includes(cu.st)) this.sendHome(cu);
  }
  queueReview(key) { if (this.reviews.length < 6 && !this.reviews.includes(key)) this.reviews.push(key); }
  nearFire(x, z, r) { return this.fires.some(f => d2(x, z, f.x, f.z) < r * r); }
  outThroughDoor(x, z) { return z > C.ROOM_Z - 0.1 && Math.abs(x - LAYOUT.door.x) < LAYOUT.door.gap; }
  bounceWalls(o, e) {
    if (o.x < -C.ROOM_X + 0.3) { o.x = -C.ROOM_X + 0.3; o.vx = Math.abs(o.vx) * e; }
    if (o.x > C.ROOM_X - 0.3) { o.x = C.ROOM_X - 0.3; o.vx = -Math.abs(o.vx) * e; }
    if (o.z < -C.ROOM_Z + 0.3) { o.z = -C.ROOM_Z + 0.3; o.vz = Math.abs(o.vz) * e; }
    if (o.z > C.ROOM_Z - 0.3 && !this.outThroughDoor(o.x, o.z)) { o.z = C.ROOM_Z - 0.3; o.vz = -Math.abs(o.vz) * e; }
    if (o.z > C.ROOM_Z + 2.2) { o.z = C.ROOM_Z + 2.2; o.vz = 0; }
  }
  walk(cu, tx, tz, dt) {
    const ax0 = tx - cu.x, az0 = tz - cu.z; const d = Math.hypot(ax0, az0);
    if (d < 0.02) return;
    const ax = ax0 / d, az = az0 / d;
    let dx = ax, dz = az, oppose = false;
    // soft repulsion from solids; note head-on opposition (the table-between-me-and-my-seat deadlock)
    for (const s of SOLIDS) {
      const px = Math.max(s.x - s.hx, Math.min(cu.x, s.x + s.hx)), pz = Math.max(s.z - s.hz, Math.min(cu.z, s.z + s.hz));
      const rx = cu.x - px, rz = cu.z - pz, rd = Math.hypot(rx, rz);
      if (rd < 0.7 && rd > 0.0001) {
        dx += (rx / rd) * (0.7 - rd) * 1.6; dz += (rz / rd) * (0.7 - rd) * 1.6;
        if ((rx / rd) * ax + (rz / rd) * az < -0.82 && d > 0.7) oppose = true;
      }
    }
    if (oppose) { dx = -az; dz = ax; } // slide tangentially around the blocker (deterministic)
    const l = Math.hypot(dx, dz) || 1;
    cu.x += (dx / l) * C.CUST_SPEED * dt; cu.z += (dz / l) * C.CUST_SPEED * dt;
    cu.yaw = Math.atan2(dx, dz);
    this.collideSolids(cu, C.CUST_R);
  }

  // ---- player tick ----------------------------------------------------------
  tickPlayer(p, dt) {
    if (!p.conn) return;
    if (p.carriedBy >= 0) { p.aPend = 0; p.thPend = 0; p.wob = 0; p.spray = false; return; } // cargo (glued in the post-pass)
    if (p.air) { this.tickAirPlayer(p, dt); return; }
    if (p.soakT > 0) p.soakT -= dt;
    if (p.heldPl >= 0) { p.carryT -= dt; if (p.carryT <= 0) this.releaseFriend(p, false); }
    if (p.stunT > 0) {
      p.stunT -= dt; p.aPend = 0; p.thPend = 0; p.spray = false;
      p.x += p.slideX * dt; p.z += p.slideZ * dt;
      const dk = Math.max(0, 1 - 3.2 * dt);
      p.slideX *= dk; p.slideZ *= dk;
      this.clampPlayer(p);
      this.collideSolids(p, C.COOK_R);
      return;
    }
    if (p.busyT > 0) { p.busyT -= dt; p.aPend = 0; p.thPend = 0; return; }
    let mult = 1;
    if (p.heldPl >= 0) mult *= C.CARRY_MULT;
    else if (p.heldCu) mult *= C.DRAG_MULT;
    if (p.soakT > 0) mult *= C.SOAK_MULT;
    const sprint = p.in.sp && p.heldPl < 0;
    if (sprint) mult *= C.SPRINT_MULT;
    const tx = p.in.x * C.COOK_SPEED * mult, tz = p.in.z * C.COOK_SPEED * mult;
    let kk = sprint ? C.SPRINT_ACCEL : 18;
    if (!sprint && Math.hypot(p.svx, p.svz) > C.COOK_SPEED + 0.2) kk = 3.5; // skid out of a sprint
    const k = Math.min(1, kk * dt);
    p.svx += (tx - p.svx) * k; p.svz += (tz - p.svz) * k;
    p.vx = p.svx; p.vz = p.svz;
    p.x += p.svx * dt; p.z += p.svz * dt;
    this.clampPlayer(p);
    this.collideSolids(p, C.COOK_R);
    p.yaw = Math.atan2(p.in.fx, p.in.fz);
    // wobble: a stack of plates hates speed, corners, and sprinting
    const spd = Math.hypot(p.svx, p.svz);
    if (p.stack.length > 0) {
      let turn = (p.yaw - (p._pyaw ?? p.yaw)) % (Math.PI * 2);
      if (turn > Math.PI) turn -= Math.PI * 2; if (turn < -Math.PI) turn += Math.PI * 2;
      const stress = (spd / C.COOK_SPEED) * (0.35 + p.stack.length * 0.3) + Math.abs(turn) / dt * 0.055 + (sprint ? 0.55 : 0);
      p.wob = Math.max(0, Math.min(1.25, p.wob + (stress - 0.75) * dt * 1.4));
      if (p.wob >= C.WOB_TUMBLE) { this.tumble(p); }
    } else p.wob = Math.max(0, p.wob - dt * 2);
    p._pyaw = p.yaw;
    // broken plates are a floor hazard at speed
    if (spd > C.SLIP_SPEED) {
      for (const it of this.items) {
        if (it.k !== 'shard' || it.holder) continue;
        if (d2(p.x, p.z, it.x, it.z) < 0.45 * 0.45) { this.slip(p); break; }
      }
    }
    if (this.ph === 'supply') {
      if (p.cast && Math.hypot(p.vx, p.vz) > 0.5) { p.cast = false; p.biteT = 0; } // walking off cancels the cast
      if (p.cast && p.biteT <= 0) { p.castT -= dt; if (p.castT <= 0) { p.biteT = C.FISH_WINDOW; this.push({ k: 'bite', i: p.seat }); } }
      else if (p.biteT > 0) { p.biteT -= dt; if (p.biteT <= 0) { p.cast = false; this.push({ k: 'lost', x: p.x, z: p.z }); } }
    }
    p.spray = !!(p.in.ah && p.held && this.itemOf(p.held)?.k === 'ext');
    while (p.aPend > 0) { p.aPend--; this.doInteract(p); }
    while (p.thPend > 0) { p.thPend--; this.doThrow(p); }
    if (p.spray) this.doSpray(p, dt);
  }
  clampPlayer(p) {
    p.x = Math.max(-C.ROOM_X + C.COOK_R, Math.min(C.ROOM_X - C.COOK_R, p.x));
    if (this.ph === 'supply' || this.ph === 'prep') {
      // the yard is open: pass through the door gap, roam to the riverbank
      if (Math.abs(p.x - LAYOUT.door.x) < LAYOUT.door.gap) p.z = Math.max(-C.ROOM_Z + C.COOK_R, Math.min(C.YARD_Z - C.COOK_R, p.z));
      else if (p.z < C.ROOM_Z) p.z = Math.max(-C.ROOM_Z + C.COOK_R, Math.min(C.ROOM_Z - C.COOK_R, p.z));
      else p.z = Math.max(C.ROOM_Z + C.COOK_R, Math.min(C.YARD_Z - C.COOK_R, p.z));
    } else if (!this.outThroughDoor(p.x, p.z)) p.z = Math.max(-C.ROOM_Z + C.COOK_R, Math.min(C.ROOM_Z - C.COOK_R, p.z));
    else p.z = Math.min(C.ROOM_Z + 0.6, p.z); // lean out the door, not into the void
  }
  tickAirPlayer(p, dt) {
    const a = p.air;
    a.vy -= C.GRAV * dt;
    p.x += a.vx * dt; p.y += a.vy * dt; p.z += a.vz * dt;
    if (p.x < -C.ROOM_X + 0.3) { p.x = -C.ROOM_X + 0.3; a.vx = Math.abs(a.vx) * 0.4; }
    if (p.x > C.ROOM_X - 0.3) { p.x = C.ROOM_X - 0.3; a.vx = -Math.abs(a.vx) * 0.4; }
    const yard = this.ph === 'supply' || this.ph === 'prep';
    const zMax = yard ? C.YARD_Z + 1.6 : (this.outThroughDoor(p.x, p.z) ? C.ROOM_Z + 2 : C.ROOM_Z - 0.3);
    if (p.z < -C.ROOM_Z + 0.3) { p.z = -C.ROOM_Z + 0.3; a.vz = Math.abs(a.vz) * 0.4; }
    if (p.z > zMax) { p.z = zMax; a.vz = -Math.abs(a.vz) * 0.4; }
    if (p.y <= 0) {
      p.y = 0; p.air = null; p.stunT = C.STUN_LAND;
      this.tumble(p, true);
      this.dropAll(p);
      const water = yard && p.z > C.YARD_Z - 0.2;
      if (water) { p.soakT = C.SOAK_T; p.z = C.YARD_Z - 0.9; this.push({ k: 'splash', x: p.x, z: p.z, s: p.seat }); }
      else this.push({ k: 'landf', x: p.x, z: p.z, s: p.seat });
    }
  }
  releaseFriend(p, thrown) {
    const fr = this.bySeat(p.heldPl); p.heldPl = -1;
    if (!fr) return;
    fr.carriedBy = -1;
    if (thrown) {
      fr.air = { vx: p.in.fx * C.PL_THROW_V, vz: p.in.fz * C.PL_THROW_V, vy: C.PL_THROW_UP };
      fr.y = 1.2;
      this.pst(p.seat).fy++;
      this.push({ k: 'yeetf', s: p.seat, v: fr.seat, x: p.x, z: p.z });
    } else fr.stunT = C.STUN_DROP;
  }
  tumble(p, hard) {
    const rel = [];
    if (p.held) {
      const it = this.itemOf(p.held);
      if (it && (hard || ['dish', 'plate', 'dirty', 'mug'].includes(it.k))) { rel.push(it); p.held = null; }
    }
    for (const id of p.stack) { const it = this.itemOf(id); if (it) rel.push(it); }
    p.stack = []; p.wob = 0;
    if (!rel.length) return;
    for (const it of rel) {
      it.holder = null; it.ls = p.seat;
      const ang = this.r() * 6.283, v = 4.5 + this.r() * 3;
      it.x = p.x; it.y = 1.1; it.z = p.z;
      it.vx = Math.sin(ang) * v; it.vz = Math.cos(ang) * v; it.vy = 2.5 + this.r() * 2;
    }
    this.push({ k: 'tumble', x: p.x, z: p.z, s: p.seat, n: rel.length });
  }
  slip(p) {
    if (p.stunT > 0) return;
    p.stunT = C.STUN_SLIP;
    p.slideX = p.svx * 1.3; p.slideZ = p.svz * 1.3;
    p.svx = 0; p.svz = 0;
    if (p.heldPl >= 0) this.releaseFriend(p, false);
    this.tumble(p);
    this.pst(p.seat).sl++;
    this.push({ k: 'slip', x: p.x, z: p.z, s: p.seat });
  }
  collideSolids(o, r) {
    for (const s of SOLIDS) {
      const px = Math.max(s.x - s.hx, Math.min(o.x, s.x + s.hx)), pz = Math.max(s.z - s.hz, Math.min(o.z, s.z + s.hz));
      let rx = o.x - px, rz = o.z - pz; const rd = Math.hypot(rx, rz);
      if (rd < r) {
        if (rd < 0.0001) { const dxc = o.x - s.x, dzc = o.z - s.z; const m = Math.abs(dxc / s.hx) > Math.abs(dzc / s.hz); rx = m ? Math.sign(dxc) : 0; rz = m ? 0 : Math.sign(dzc); o.x = px + rx * r; o.z = pz + rz * r; }
        else { o.x = px + (rx / rd) * r; o.z = pz + (rz / rd) * r; }
      }
    }
  }
  itemOf(id) { return this.items.find(i => i.id === id) || null; }
  spawnItem(k, x, y, z, extra) {
    const it = Object.assign({ id: this.nid(), k, x, y, z, vx: 0, vy: 0, vz: 0, holder: null, ttl: null }, extra || {});
    if (k === 'shard' || k === 'laptop') { it.ttl = C.SHARD_TTL; }
    this.items.push(it); return it;
  }

  // ---- interact -------------------------------------------------------------
  near(p, o, r) { return d2(p.x, p.z, o.x, o.z) < (r || C.REACH) * (r || C.REACH); }
  doInteract(p) {
    const held = p.held ? this.itemOf(p.held) : null;
    // 1. door sign
    if (this.ph === 'lobby' && this.near(p, LAYOUT.sign, 1.9)) { this.ph = 'count'; this.cd = C.COUNT_LEN; this.push({ k: 'count' }); return; }
    if (this.ph === 'supply') { this.supplyAct(p, held); return; }
    if (this.ph !== 'shift' && this.ph !== 'close' && this.ph !== 'count') return;
    // 2. put down whoever you're carrying
    if (p.heldPl >= 0) { this.releaseFriend(p, false); return; }
    if (p.heldCu) { const cu = this.cust.find(c => c.id === p.heldCu); if (cu) { cu.st = 'reseat'; cu.y = 0; } p.heldCu = null; return; }
    // 3. stations
    if (this.stationAct(p, held)) return;
    // 4. taps
    for (let i = 0; i < LAYOUT.taps.length; i++) {
      const tp = LAYOUT.taps[i];
      if (this.near(p, tp) && !held && this.st.taps[i] <= 0) {
        const pourT = this.up('espresso') ? 0.45 : C.POUR_T;
        p.busyT = pourT; this.st.taps[i] = pourT;
        const mug = this.spawnItem('mug', tp.x, 1, tp.z, { fill: tp.fill });
        mug.holder = p.pid; p.held = mug.id; this.push({ k: 'pour', x: tp.x, z: tp.z });
        return;
      }
    }
    // 5. shelf
    if (this.near(p, LAYOUT.shelf) && !held && this.st.shelf > 0) { this.st.shelf--; const pl = this.spawnItem('plate', p.x, 1, p.z); pl.holder = p.pid; p.held = pl.id; return; }
    // 6. crates
    for (const cr of LAYOUT.crates) if (this.near(p, cr) && !held) { const it = this.spawnItem('raw', cr.x, 1, cr.z, { ing: cr.ing }); it.holder = p.pid; p.held = it.id; return; }
    // 7. extinguisher hook
    if (this.near(p, LAYOUT.extHook) && !held && !this.extOut) { this.extOut = true; const ex = this.spawnItem('ext', p.x, 1, p.z); ex.holder = p.pid; p.held = ex.id; return; }
    // 8. tables / stools: serve, then bus
    if (this.tableAct(p, held)) return;
    // 9. squatter grab
    if (!held && !p.heldCu) {
      const sq = this.cust.find(c => c.ty === 'squatter' && ['squat', 'reseat', 'sit', 'wait'].includes(c.st) && this.near(p, c));
      if (sq) { sq.st = 'drag'; p.heldCu = sq.id; this.push({ k: 'grab', x: sq.x, z: sq.z }); return; }
      // the Ranch LARPer accepts exactly one (1) yee-haw
      const lp = this.cust.find(c => c.ty === 'larper' && !c.yh && ['sit', 'wait', 'eat'].includes(c.st) && this.near(p, c));
      if (lp) { lp.yh = 1; this.bumpCred(C.LARPER_CRED); this.push({ k: 'yeehaw', x: lp.x, z: lp.z }); return; }
      // grab a whole coworker (friendslop law: your friends are cargo)
      if (p.heldPl < 0) {
        const fr = [...this.players.values()]
          .filter(q => q !== p && q.conn && q.carriedBy < 0 && q.heldPl < 0 && !q.air && d2(p.x, p.z, q.x, q.z) < 1.3 * 1.3)
          .sort((a, b) => a.seat - b.seat)[0];
        if (fr) {
          fr.carriedBy = p.seat; fr.cast = false; fr.biteT = 0; fr.spray = false;
          p.heldPl = fr.seat; p.carryT = C.CARRY_RELEASE;
          this.push({ k: 'grabf', s: p.seat, v: fr.seat, x: p.x, z: p.z });
          return;
        }
      }
    }
    // 10. sink / bin (the sink takes the whole armload of dirty plates)
    if (this.near(p, LAYOUT.sink) && ((held && held.k === 'dirty') || p.stack.some(id => this.itemOf(id)?.k === 'dirty'))) {
      let n = 0;
      if (held && held.k === 'dirty') { this.removeItem(held.id); p.held = null; n++; }
      p.stack = p.stack.filter(id => {
        const it = this.itemOf(id);
        if (it && it.k === 'dirty') { this.removeItem(id); n++; return false; }
        return true;
      });
      if (!p.held && p.stack.length) p.held = p.stack.shift();
      if (n) { this.st.sink.dirty += n; return; }
    }
    if (this.near(p, LAYOUT.bin) && held && ['burnt', 'raw', 'dirty', 'dish', 'mug'].includes(held.k)) { this.removeItem(held.id); p.held = null; this.push({ k: 'trash' }); return; }
    // 11. stack another plate on the armload (risk it), counter put-down, pickup, sweep
    const STACKABLE = ['dish', 'plate', 'dirty'];
    if (held && STACKABLE.includes(held.k) && p.stack.length < C.STACK_MAX) {
      let best = null, bd = C.REACH * C.REACH;
      for (const it of this.items) {
        if (it.holder || !STACKABLE.includes(it.k)) continue;
        const dd = d2(p.x, p.z, it.x, it.z);
        if (dd < bd) { bd = dd; best = it; }
      }
      if (best) { best.holder = p.pid; best.vx = best.vy = best.vz = 0; p.stack.push(best.id); this.push({ k: 'stackup', x: p.x, z: p.z, n: p.stack.length + 1 }); return; }
    }
    if (held) {
      for (const ps of LAYOUT.pass) if (this.near(p, ps, 1.3) && !this.items.some(i => !i.holder && i.y > 0.5 && d2(i.x, i.z, ps.x, ps.z) < 0.16)) {
        held.holder = null; held.x = ps.x; held.y = 0.95; held.z = ps.z; held.vx = held.vy = held.vz = 0;
        p.held = p.stack.length ? p.stack.shift() : null;
        return;
      }
      // return extinguisher
      if (held.k === 'ext' && this.near(p, LAYOUT.extHook)) { this.removeItem(held.id); p.held = null; this.extOut = false; return; }
    } else {
      let best = null, bd = C.REACH * C.REACH;
      for (const it of this.items) {
        if (it.holder || it.k === 'shard') continue;
        const dd = d2(p.x, p.z, it.x, it.z);
        if (dd < bd) { bd = dd; best = it; }
      }
      if (best) { best.holder = p.pid; p.held = best.id; best.vx = best.vy = best.vz = 0; return; }
      // nothing to grab: sweep up the shards before someone eats it
      let sh = null, sd = C.REACH * C.REACH;
      for (const it of this.items) {
        if (it.k !== 'shard' || it.holder) continue;
        const dd = d2(p.x, p.z, it.x, it.z);
        if (dd < sd) { sd = dd; sh = it; }
      }
      if (sh) { this.removeItem(sh.id); p.busyT = 0.25; this.push({ k: 'sweep', x: sh.x, z: sh.z }); return; }
    }
  }
  // ---- the supply run ---------------------------------------------------------
  supplyAct(p, held) {
    if (p.heldPl >= 0) { this.releaseFriend(p, false); return; }
    for (const fs of LAYOUT.fishSpots) {
      if (!this.near(p, fs, 1.9)) continue;
      if (p.biteT > 0) {
        p.biteT = 0; p.cast = false;
        const f = this.spawnItem('fish', p.x, 1, p.z); f.holder = p.pid; p.held = f.id;
        this.pst(p.seat).ca++;
        this.push({ k: 'catch', x: p.x, z: p.z, s: p.seat });
        return;
      }
      if (!p.cast && !held) { p.cast = true; p.castT = C.FISH_MIN + this.r() * (C.FISH_MAX - C.FISH_MIN); this.push({ k: 'cast', x: p.x, z: p.z }); return; }
      return;
    }
    for (let i = 0; i < LAYOUT.huckBushes.length; i++) {
      const b = LAYOUT.huckBushes[i];
      if (!this.near(p, b) || !this.bushes[i] || held) continue;
      this.bushes[i]--; this._picksTotal++;
      p.busyT = 0.7;
      const h = this.spawnItem('huck', p.x, 1, p.z); h.holder = p.pid; p.held = h.id;
      this.push({ k: 'pick', x: b.x, z: b.z });
      if (!this.bear && this._picksTotal >= C.BEAR_MINPICKS && this.r() < C.BEAR_PROB) this.spawnBear();
      return;
    }
    if (this.near(p, LAYOUT.truck, 2.6) && held && (held.k === 'fish' || held.k === 'huck')) {
      const key = held.k === 'fish' ? 'trout' : 'huck';
      if (this.stock[key] < this.stockCap()) { this.stock[key]++; this.pst(p.seat).bk++; this.push({ k: 'bank', s: key, x: p.x, z: p.z }); }
      this.removeItem(held.id); p.held = null;
      return;
    }
    if (this.near(p, LAYOUT.payphone, 1.7) && !held && !this.syscoUsed) {
      if (this.carry < C.SYSCO_COST) { this.push({ k: 'sysco_broke' }); return; }
      this.syscoUsed = true; this.carry -= C.SYSCO_COST;
      if (this.r() < C.SYSCO_ODDS) {
        this.stock.trout = Math.min(this.stockCap(), this.stock.trout + C.SYSCO_YIELD);
        this.stock.huck = Math.min(this.stockCap(), this.stock.huck + C.SYSCO_YIELD);
        this.push({ k: 'sysco_ok' });
      } else this.push({ k: 'sysco_out' });
      return;
    }
    if (!held) {
      let best = null, bd = C.REACH * C.REACH;
      for (const it of this.items) { if (it.holder || it.k === 'shard') continue; const dd = d2(p.x, p.z, it.x, it.z); if (dd < bd) { bd = dd; best = it; } }
      if (best) { best.holder = p.pid; p.held = best.id; best.vx = best.vy = best.vz = 0; return; }
      // grab a coworker — the river is RIGHT THERE
      const fr = [...this.players.values()]
        .filter(q => q !== p && q.conn && q.carriedBy < 0 && q.heldPl < 0 && !q.air && d2(p.x, p.z, q.x, q.z) < 1.3 * 1.3)
        .sort((a2, b2) => a2.seat - b2.seat)[0];
      if (fr) {
        fr.carriedBy = p.seat; fr.cast = false; fr.biteT = 0; fr.spray = false;
        p.heldPl = fr.seat; p.carryT = C.CARRY_RELEASE;
        this.push({ k: 'grabf', s: p.seat, v: fr.seat, x: p.x, z: p.z });
      }
    }
  }
  spawnBear() {
    let bi = 0, bp = -1;
    for (let i = 0; i < this.bushes.length; i++) if (this.bushes[i] > bp) { bp = this.bushes[i]; bi = i; }
    this.bear = { x: LAYOUT.bearDen.x, z: LAYOUT.bearDen.z, st: 'in', tgt: bi, eatT: 0, roared: false, yaw: 0 };
    this.push({ k: 'bear' });
  }
  tickBear(dt) {
    const be = this.bear; if (!be) return;
    const walkTo = (tx, tz, sp) => {
      const dx = tx - be.x, dz = tz - be.z, dd = Math.hypot(dx, dz);
      if (dd < 0.12) return true;
      be.x += dx / dd * sp * dt; be.z += dz / dd * sp * dt; be.yaw = Math.atan2(dx, dz);
      return false;
    };
    if (be.st === 'in') {
      if (!be.roared) {
        for (const p of this.players.values()) {
          if (d2(p.x, p.z, be.x, be.z) < C.BEAR_ROAR_R * C.BEAR_ROAR_R) {
            be.roared = true; this.push({ k: 'roar', x: be.x, z: be.z });
            for (const q of this.players.values()) if (d2(q.x, q.z, be.x, be.z) < C.BEAR_SHOVE_R * C.BEAR_SHOVE_R) {
              const ang = Math.atan2(q.x - be.x, q.z - be.z);
              q.x += Math.sin(ang) * 2.0; q.z += Math.cos(ang) * 2.0;
              this.dropAll(q);
            }
            break;
          }
        }
      }
      const b = LAYOUT.huckBushes[be.tgt];
      if (walkTo(b.x + 0.95, b.z, C.BEAR_SPEED)) { be.st = 'eat'; be.eatT = C.BEAR_EAT; }
    } else if (be.st === 'eat') {
      be.eatT -= dt;
      if (be.eatT <= 0) { this.bushes[be.tgt] = 0; be.st = 'out'; this.push({ k: 'bearout' }); }
    } else if (be.st === 'out') {
      if (walkTo(LAYOUT.bearDen.x, LAYOUT.bearDen.z, C.BEAR_SPEED * 1.2)) this.bear = null;
    }
  }

  stationAct(p, held) {
    const tryStation = (stName, cfg) => {
      const slots = this.st[stName];
      for (let i = 0; i < cfg.slots.length; i++) {
        if (stName === 'pan' && i === 1 && !this.up('pan2')) continue; // second burner is an upgrade
        const sp = cfg.slots[i];
        if (!this.near(p, sp)) continue;
        const slot = slots[i];
        if (!slot && held && held.k === 'raw' && ING_STATION[held.ing] === stName) {
          const prem = held.ing === 'trout' && this.stock.trout > 0;
          if (prem) this.stock.trout--;
          slots[i] = { ing: held.ing, cookT: 0, flipped: false, st: 'cook', prem, by: p.seat };
          this.removeItem(held.id); p.held = null; this.push({ k: 'sizzleon', x: sp.x, z: sp.z }); return true;
        }
        if (slot) {
          if (slot.st === 'cook' && slot.ing === 'batter' && !slot.flipped && slot.cookT >= C.FLIP_LO && slot.cookT <= C.FLIP_HI) { slot.flipped = true; this.push({ k: 'flip', x: sp.x, z: sp.z }); return true; }
          if (slot.st === 'ready' && held && held.k === 'plate') {
            const dish = ING_DISH[slot.ing];
            const sad = slot.ing === 'batter' && !slot.flipped;
            const huck = dish === 'flapjacks' && this.stock.huck > 0;
            if (huck) this.stock.huck--;
            const prem = !!slot.prem;
            slots[i] = null;
            this.removeItem(held.id); p.held = null;
            const d = this.spawnItem('dish', sp.x, 1, sp.z, { dish, sad, prem, huck });
            d.holder = p.pid; p.held = d.id; this.push({ k: 'plateup', x: sp.x, z: sp.z });
            return true;
          }
          if (slot.st === 'burnt' && !held) { slots[i] = null; const b = this.spawnItem('burnt', sp.x, 1, sp.z); b.holder = p.pid; p.held = b.id; return true; }
        }
      }
      return false;
    };
    return tryStation('griddle', LAYOUT.griddle) || tryStation('pan', LAYOUT.pan);
  }
  tableAct(p, held) {
    if (!held && !p.stack.length) return false;
    for (let ti = 0; ti < LAYOUT.tables.length; ti++) {
      const t = LAYOUT.tables[ti];
      if (d2(p.x, p.z, t.x, t.z) > 2.4 * 2.4) continue;
      if (this.serveTicket(p, tk => tk.table === ti)) return true;
    }
    for (let si = 0; si < LAYOUT.stools.length; si++) {
      const s = LAYOUT.stools[si];
      if (d2(p.x, p.z, s.x, s.z) > C.REACH * C.REACH) continue;
      if (this.serveTicket(p, tk => tk.stool === si)) return true;
    }
    return false;
  }
  seqPost() {
    this.bumpGent(C.SEQ_GENT_POST);
    this._contagionNext = true;
    this.push({ k: 'seqpost' });
  }
  serveTicket(p, match) {
    const kindOf = it => it.k === 'dish' ? it.dish : it.k === 'mug' ? it.fill : null;
    const cands = [];
    if (p.held) { const it = this.itemOf(p.held); if (it) cands.push({ it, src: 'h' }); }
    p.stack.forEach((id, ix) => { const it = this.itemOf(id); if (it) cands.push({ it, src: ix }); });
    if (!cands.some(c => kindOf(c.it))) return false;
    for (const tk of this.tickets) {
      if (!match(tk)) continue;
      let hit = null, ln = null;
      for (const c of cands) {
        const kind = kindOf(c.it); if (!kind) continue;
        const l = tk.ln.find(l2 => !l2.ok && l2.d === kind);
        if (l) { hit = c; ln = l; break; }
      }
      if (!hit) {
        // Kale refuses wrong answers to the riddle — the dish stays in your hands
        if (tk.kale) {
          tk.tries++; tk.pat -= C.KALE_PENALTY;
          this.push({ k: 'kalewrong', x: p.x, z: p.z });
          if (tk.tries >= C.KALE_TRIES) { this.dropTicket(tk.party, true); this.queueReview('r_kale_bad'); this.stats.lost++; }
          return true;
        }
        continue;
      }
      ln.ok = true;
      const held = hit.it, kind = kindOf(held);
      let pay = C.PAY[kind];
      const sp = this.special && SPECIALS[this.special];
      if (sp) {
        if (sp.pay && sp.pay[kind]) pay = Math.round(pay * sp.pay[kind]);
        if (sp.payAll) pay = Math.round(pay * sp.payAll);
      }
      if (held.prem) { pay = Math.round(pay * C.PREMIUM_TROUT_MULT); this.bumpCred(C.CRED_PREMIUM); }
      if (held.huck) { pay += C.HUCK_BONUS; this.bumpCred(C.CRED_PREMIUM); }
      if ((kind === 'coffee' || kind === 'matcha') && this.up('espresso')) pay += 5;
      if (tk.kale) pay *= C.KALE_MULT;
      if (held.sad) pay = Math.round(pay / 2);
      this.rentE += pay; this.stats.served++; this.pst(p.seat).sv++;
      this.removeItem(held.id);
      if (hit.src === 'h') p.held = p.stack.length ? p.stack.shift() : null;
      else p.stack.splice(hit.src, 1);
      this.push({ k: 'cha', a: pay, x: p.x, z: p.z });
      if (held.sad) this.queueReview('r_sad');
      if (tk.ln.every(l => l.ok)) this.completeTicket(tk);
      return true;
    }
    return false;
  }
  completeTicket(tk) {
    const base = tk.ln.reduce((s, l) => s + C.PAY[l.d], 0);
    const tip = Math.round(base * C.TIP_MAX * (Math.max(0, tk.pat) / C.PATIENCE) * (this.up('bell') ? 1.5 : 1));
    if (tip > 0 && !tk.squat) { this.rentE += tip; this.push({ k: 'tip', a: tip }); }
    this.tickets = this.tickets.filter(t => t !== tk);
    if (tk.kale) { this.bumpGent(C.KALE_GENT); this.queueReview('r_kale'); this.push({ k: 'kaleok' }); }
    if (tk.seq) {
      if (tk.pat < C.PATIENCE * C.SEQ_LATE) this.seqPost();
      else { this.bumpGent(C.SEQ_GENT_GOOD); this.queueReview('r_seq_good'); this.push({ k: 'seqgood' }); }
    }
    const larper = this.cust.find(c => c.party === tk.party && c.ty === 'larper');
    if (larper && larper.yh) { this.rentE += C.LARPER_TIP; this.push({ k: 'larpertip', a: C.LARPER_TIP }); this.queueReview('r_larper'); }
    if (tk.dale && this.dale) { this.dale.content = true; this.dale.refillT = 0; this.queueReview('r_dale'); this.bumpCred(C.CRED_DALE); }
    if (tk.flock && (this.t - tk.t0) < C.FLOCK_FAST && this.flockBonus < C.FLOCK_BONUS_CAP) {
      this.flockBonus++;
      const sp = this.special && SPECIALS[this.special];
      this.flockQ += (sp && sp.flockMult) || 1;
      this.bumpGent(C.GENT_FLOCK);
      this.push({ k: 'text', s: 'flock_post' }); this.queueReview('r_flock');
    }
    for (const cu of this.cust) if (cu.party === tk.party && ['wait', 'squat'].includes(cu.st) && cu.ty !== 'squatter' && cu.ty !== 'dale') { cu.st = 'eat'; cu.eatT = C.EAT_T; }
    const dale = this.cust.find(c => c.party === tk.party && c.ty === 'dale');
    if (dale) { /* Dale just drinks at the stool */ }
  }
  doThrow(p) {
    if (p.heldPl >= 0) { this.releaseFriend(p, true); return; }
    if (p.heldCu) {
      const cu = this.cust.find(c => c.id === p.heldCu); p.heldCu = null;
      if (cu) {
        cu.st = 'air'; cu.y = 1.1; cu.thrownBy = p.seat;
        cu.vx = p.in.fx * C.THROW_V; cu.vz = p.in.fz * C.THROW_V; cu.vy = C.THROW_UP;
        this.push({ k: 'yeet', x: p.x, z: p.z });
      }
      return;
    }
    if (p.held) {
      const it = this.itemOf(p.held);
      p.held = p.stack.length ? p.stack.shift() : null;
      if (it) {
        it.holder = null; it.ls = p.seat;
        it.x = p.x + p.in.fx * 0.5; it.y = 1.2; it.z = p.z + p.in.fz * 0.5;
        it.vx = p.in.fx * C.THROW_V; it.vz = p.in.fz * C.THROW_V; it.vy = C.THROW_UP * 0.7;
        this.push({ k: 'yeet', x: p.x, z: p.z });
      }
      return;
    }
    // shove a zillow
    const zi = this.cust.find(c => c.ty === 'zillow' && this.near(p, c));
    if (zi) { zi.x += p.in.fx * 1.1; zi.z += p.in.fz * 1.1; zi.spot = this.ri(LAYOUT.wanderSpots.length); zi.spotT = C.ZILLOW_SPOT_T; this.push({ k: 'shove', x: zi.x, z: zi.z }); }
  }
  doSpray(p, dt) {
    for (const f of this.fires) {
      const dx = f.x - p.x, dz = f.z - p.z, d = Math.hypot(dx, dz);
      if (d > C.SPRAY_RANGE) continue;
      const dot = (dx / (d || 1)) * p.in.fx + (dz / (d || 1)) * p.in.fz;
      if (dot > 0.35) { f.hp -= dt / C.DOUSE_T; if (f.hp <= 0) this.push({ k: 'douse', x: f.x, z: f.z }); }
    }
    this.fires = this.fires.filter(f => f.hp > 0);
  }
  dropAll(p) {
    if (p.held) { const it = this.itemOf(p.held); if (it) { it.holder = null; it.ls = p.seat; it.y = Math.max(it.y, 0.6); } p.held = null; }
    for (const id of p.stack) { const it = this.itemOf(id); if (it) { it.holder = null; it.ls = p.seat; it.y = Math.max(it.y, 0.6); } }
    p.stack = []; p.wob = 0;
    if (p.heldPl >= 0) this.releaseFriend(p, false);
    if (p.heldCu) { const cu = this.cust.find(c => c.id === p.heldCu); if (cu) cu.st = 'reseat'; p.heldCu = null; }
    p.cast = false; p.biteT = 0;
  }
  removeItem(id) { const i = this.items.findIndex(x => x.id === id); if (i >= 0) this.items.splice(i, 1); }

  // ---- stations & fire --------------------------------------------------------
  tickStations(dt) {
    const cookSlots = (stName, cfg) => {
      const slots = this.st[stName];
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i]; if (!s) continue;
        const key = stName + i;
        if (this.st.scorch.get(key) > 0) continue; // scorched pauses cooking
        s.cookT += dt * (s.st === 'cook' && stName === 'griddle' && this.up('flattop') ? 1.25 : 1);
        const need = C.COOK_T[s.ing];
        if (s.st === 'cook' && s.cookT >= need) { s.st = 'ready'; this.push({ k: 'ding', x: cfg.slots[i].x, z: cfg.slots[i].z }); }
        else if (s.st === 'ready' && s.cookT >= need + C.BURN_T[s.ing]) { s.st = 'burning'; this.push({ k: 'smoke', x: cfg.slots[i].x, z: cfg.slots[i].z }); }
        else if (s.st === 'burning' && s.cookT >= need + C.BURN_T[s.ing] + C.IGNITE_T) {
          s.st = 'burnt';
          this.igniteAt(cfg.slots[i].x, cfg.slots[i].z, s.by);
        }
      }
    };
    cookSlots('griddle', LAYOUT.griddle); cookSlots('pan', LAYOUT.pan);
    for (let i = 0; i < this.st.taps.length; i++) if (this.st.taps[i] > 0) this.st.taps[i] -= dt;
    const sk = this.st.sink;
    const washT = this.up('dishpit') ? C.WASH_T / 2 : C.WASH_T;
    const maxPlates = this.up('dishpit') ? C.PLATES + 4 : C.PLATES;
    if (sk.dirty > 0) { sk.washT += dt; if (sk.washT >= washT) { sk.washT = 0; sk.dirty--; this.st.shelf = Math.min(maxPlates, this.st.shelf + 1); this.push({ k: 'wash' }); } }
    for (const [k, v] of this.st.scorch) { const nv = v - dt; if (nv <= 0) this.st.scorch.delete(k); else this.st.scorch.set(k, nv); }
  }
  // one funnel for every ignition — neglect and the director's scheduled
  // grease fire share the blame/review/Sequoia-clip path (s null = the night's fault)
  igniteAt(x, z, by) {
    if (this.fires.length >= C.FIRE_CAP) return;
    this.fires.push({ x, z, hp: 1, spreadT: C.FIRE_SPREAD });
    this.stats.fires++;
    if (by != null) this.pst(by).fi++;
    this.push({ k: 'ignite', x, z, s: by }); this.queueReview('r_fire');
    // Sequoia never misses content
    if (this.cust.some(c => c.ty === 'sequoia' && ['wait', 'eat', 'sit'].includes(c.st))) { this.bumpGent(C.SEQ_GENT_CLIP); this.queueReview('r_seq_fire'); this.push({ k: 'seqclip' }); }
  }
  tickFires(dt) {
    for (const f of this.fires) {
      f.spreadT -= dt;
      if (f.spreadT <= 0) {
        f.spreadT = C.FIRE_SPREAD;
        if (this.fires.length < C.FIRE_CAP) {
          let best = null, bd = 2.2 * 2.2;
          for (const s of LAYOUT.surfaces) {
            if (this.fires.some(g => d2(g.x, g.z, s.x, s.z) < 0.1)) continue;
            const dd = d2(f.x, f.z, s.x, s.z);
            if (dd < bd && dd > 0.05) { bd = dd; best = s; }
          }
          if (best) { this.fires.push({ x: best.x, z: best.z, hp: 1, spreadT: C.FIRE_SPREAD }); this.push({ k: 'spread', x: best.x, z: best.z }); }
        }
      }
    }
  }
  tickItems(dt) {
    for (const it of this.items) {
      if (it.holder) { const p = this.players.get(it.holder); if (p) { it.x = p.x + p.in.fx * 0.45; it.z = p.z + p.in.fz * 0.45; it.y = 1.0; } continue; }
      if (it.ttl != null) { it.ttl -= dt; }
      if (it.y > 0 || Math.abs(it.vx) > 0.01 || Math.abs(it.vz) > 0.01 || it.vy !== 0) {
        if (it.y > 0.951 || it.vy > 0 || it.y < 0.949) { // airborne or floor-bound (0.95 = resting on counter)
          it.vy -= C.GRAV * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
          this.bounceWalls(it, 0.35);
          if (it.y <= 0) {
            it.y = 0;
            const sp = Math.hypot(it.vx, it.vy, it.vz);
            if ((it.k === 'plate' || it.k === 'dish' || it.k === 'mug' || it.k === 'dirty') && sp > C.BREAK_V) {
              if (it.ls != null) this.pst(it.ls).br++;
              this.push({ k: 'break', x: it.x, z: it.z, s: it.ls }); this.stats.broken++;
              it.k = 'shard'; it.ttl = C.SHARD_TTL; it.vx = it.vz = it.vy = 0;
              this.queueReview('r_break');
            } else { it.vy = sp > 2 ? -it.vy * 0.3 : 0; if (it.vy < 0.4) it.vy = 0; it.vx *= 0.5; it.vz *= 0.5; }
          }
        }
      }
    }
    const shards = this.items.filter(i => i.k === 'shard' || i.k === 'laptop');
    if (shards.length > C.DEBRIS_CAP) { const cut = new Set(shards.slice(0, shards.length - C.DEBRIS_CAP).map(s => s.id)); this.items = this.items.filter(i => !cut.has(i.id)); }
    this.items = this.items.filter(i => i.ttl == null || i.ttl > 0);
  }
  tickTickets() { /* patience handled in tickCustomers */ }

  endShift() {
    const made = this.rentE >= this.rentTg;
    const sum = {
      made, day: this.day, earned: Math.round(this.rentE), target: this.rentTg,
      carry: made ? Math.round(this.rentE - this.rentTg) : 0,
      reviews: this.reviews.slice(0, 3),
    };
    if (!made || this.day >= C.SEASON_SHIFTS) {
      this.ph = 'over';
      if (!made) this.queueReview('r_repo');
      this.ec = Object.assign(sum, {
        win: made && this.day >= C.SEASON_SHIFTS, reviews: this.reviews.slice(0, 3),
        served: this.stats.served, broken: this.stats.broken, fires: this.stats.fires,
        yeets: this.stats.yeets, lost: this.stats.lost, cred: Math.round(this.cred), gent: Math.round(this.gent),
        crew: Object.entries(this.pstats || {}).map(([seat, s]) => Object.assign({ seat: +seat }, s)),
      });
      this.push({ k: 'over', made });
    } else {
      // the evening supply run, then the specials draft
      this.carry = sum.carry;
      this.prep = { t: C.PREP_LEN, offer: this.draftSpecials(), picked: null, sum };
      this.ph = 'supply'; this.supplyT = C.SUPPLY_LEN;
      this.bushes = LAYOUT.huckBushes.map(() => C.HUCK_PICKS);
      this.bear = null; this.syscoUsed = false; this._picksTotal = 0;
      for (const p of this.players.values()) { p.cast = false; p.castT = 0; p.biteT = 0; }
      this.push({ k: 'supply' });
    }
  }
  draftSpecials() {
    const all = Object.keys(SPECIALS);
    const i = this.ri(all.length);
    all.splice(i, 1); // drop one, offer the other three (order = deterministic draw)
    return all;
  }
  pick(i) {
    if (this.ph !== 'prep' || !this.prep || this.prep.picked != null) return;
    i = i | 0;
    if (i < 0 || i >= this.prep.offer.length) return;
    this.prep.picked = i;
    const id = this.prep.offer[i], sp = SPECIALS[id];
    this.special = id;
    if (sp.cred) this.bumpCred(sp.cred);
    if (sp.gent) this.bumpGent(sp.gent);
    this.push({ k: 'picked', s: id });
    this.beginDay();
  }
  beginDay() {
    this.day++;
    this.clearShift();
    // Hazel rings the bell: anyone still in the yard hustles back inside
    for (const p of this.players.values()) if (p.z > C.ROOM_Z) { p.x = LAYOUT.door.x - 1.2; p.z = 5.6; }
    this.ph = 'count'; this.cd = C.COUNT_LEN;
    this.push({ k: 'count' });
  }
  clearShift() {
    this.cust = []; this.tickets = []; this.items = []; this.fires = [];
    this.st = {
      griddle: LAYOUT.griddle.slots.map(() => null), pan: LAYOUT.pan.slots.map(() => null),
      taps: [0, 0], sink: { dirty: 0, washT: 0 }, shelf: this.up('dishpit') ? C.PLATES + 4 : C.PLATES, scorch: new Map(),
    };
    this.extOut = false; this.spawnAcc = 0; this.flockBonus = 0; this.flockQ = 0;
    this.bear = null; this.bushes = [];
    this.squatDone = []; this.zillowDone = false; this.dale = null; this._daleGone = null;
    this._zpaid = 0; this._tx1 = 0; this._tx2 = 0; this._pendingOrder = new Map();
    this._larpDone = 0; this._kaleDone = 0; this._seqDone = 0;
    this.drcInit();
    if (this._contagionNext) { this.flockQ = C.CONTAGION_FLOCKS; this._contagionNext = false; this.push({ k: 'contagion' }); }
    this.reviews = []; this.rentE = this.carry;
    for (const p of this.players.values()) {
      p.held = null; p.heldCu = null; p.busyT = 0; p.spray = false;
      p.stack = []; p.wob = 0; p.stunT = 0; p.carriedBy = -1; p.heldPl = -1; p.air = null; p.y = 0; p.soakT = 0;
      p.slideX = 0; p.slideZ = 0; p.svx = 0; p.svz = 0;
    }
  }

  // ---- snapshot ---------------------------------------------------------------
  snapshot() {
    return {
      ph: this.ph, t: R2(this.t), cd: R2(this.cd),
      dy: this.day, dys: C.SEASON_SHIFTS, cr: Math.round(this.cred), gn: Math.round(this.gent), sp: this.special,
      pr: this.prep && this.ph === 'prep' ? { t: R2(this.prep.t), off: this.prep.offer, pk: this.prep.picked, sum: this.prep.sum } : null,
      sy: this.ph === 'supply' ? R2(this.supplyT) : 0, cy: Math.round(this.carry),
      ug: this.upgrades, sk2: { t: this.stock.trout, h: this.stock.huck }, bu: this.bushes,
      be: this.bear ? { x: R2(this.bear.x), z: R2(this.bear.z), st: this.bear.st, yw: R2(this.bear.yaw) } : 0,
      rent: { e: Math.round(this.rentE), tg: this.rentTg },
      pl: [...this.players.values()].filter(p => p.conn || p.graceT > 0).map(p => ({
        i: p.seat, n: p.name, c: p.color, x: R2(p.x), y: R2(p.y || 0), z: R2(p.z),
        fx: R2(p.in.fx), fz: R2(p.in.fz), h: p.held ? this.itemMini(p.held) : null,
        xs: p.stack.map(id => this.itemMini(id)).filter(Boolean),
        wb: R2(p.wob), sn: p.stunT > 0 ? 1 : 0, cb: p.carriedBy, ar: p.air ? 1 : 0, so: p.soakT > 0 ? 1 : 0,
        dc: p.heldCu ? 1 : 0, b: p.busyT > 0 ? 1 : 0, sp: p.spray ? 1 : 0, off: p.conn ? 0 : 1,
        mv: Math.hypot(p.in.x, p.in.z) > 0.1 ? 1 : 0, fs: p.biteT > 0 ? 2 : (p.cast ? 1 : 0),
      })),
      cu: this.cust.map(c => ({
        i: c.id, ty: c.ty, st: c.st, x: R2(c.x), y: R2(c.y || 0), z: R2(c.z), yw: R2(c.yaw), yh: c.yh ? 1 : 0,
      })),
      it: this.items.filter(i => !i.holder).map(i => ({
        i: i.id, k: i.k, x: R2(i.x), y: R2(i.y), z: R2(i.z), d: i.dish || i.fill || i.ing || 0, s: i.sad ? 1 : 0, m: i.prem ? 1 : (i.huck ? 2 : 0),
      })),
      st: {
        gr: this.st.griddle.map(s => s ? { g: s.ing, t: R2(s.cookT), s: s.st, f: s.flipped ? 1 : 0 } : 0),
        pn: this.st.pan.map(s => s ? { g: s.ing, t: R2(s.cookT), s: s.st, f: 1 } : 0),
        sk: { d: this.st.sink.dirty, sh: this.st.shelf },
      },
      fi: this.fires.map(f => ({ x: R2(f.x), z: R2(f.z), hp: R2(f.hp) })),
      tk: this.tickets.map(t => ({
        i: t.id, tb: t.table, sl: t.stool,
        ln: t.ln.map(l => ({ d: t.kale && !l.ok ? '?' : l.d, ok: l.ok ? 1 : 0 })),
        pa: R2(Math.max(0, t.pat) / C.PATIENCE), dale: t.dale ? 1 : 0,
        kl: t.kale ? 1 : 0, rd: t.kale ? t.riddle : undefined, sq: t.seq ? 1 : 0,
      })),
      ec: this.ec,
    };
  }
  itemMini(id) { const it = this.itemOf(id); return it ? { k: it.k, d: it.dish || it.fill || it.ing || 0, s: it.sad ? 1 : 0, m: it.prem ? 1 : (it.huck ? 2 : 0) } : null; }
}
