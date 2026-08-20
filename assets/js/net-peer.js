// SHORT STAFFED — peer-to-peer rooms over PeerJS.
//
// WHY THIS EXISTS: co-op used to require a Cloudflare room server hosted on the
// publishing platform. When that deploy path disappeared the server froze eight
// rounds behind the client, so every online room played a stale game while the
// static build had the real one. This file removes the dependency entirely.
//
// THE DESIGN: the wire protocol is UNCHANGED from the WebSocket server
// (hi / hello / in / s / ev / pick / buy / again / rtc / ping). The HOST simply
// runs the authoritative Sim in its own browser — the same sim.js the page just
// loaded — and relays to guests over data channels. Guests are byte-identical to
// the old WebSocket clients. That means:
//   • online is always the current build, because the host IS the current build
//   • no accounts, no infrastructure, no deploy step
//   • the voice mesh keeps working (the host relays rtc exactly as the DO did)
// Host leaves = room ends. No host migration; that matches the co-op scope.
import { Sim } from './sim.js';

const PREFIX = 'shortstaffed-';
const TICK_MS = 50, SNAP_EVERY = 2, MAX_GUESTS = 3;

function djb2(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }

async function loadPeer() {
  if (window.Peer) return;
  const tryLoad = src => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('load failed: ' + src));
    document.head.appendChild(s);
  });
  // vendored first, so a room still opens if the CDN is blocked
  try { await tryLoad('./assets/vendor/peerjs.min.js'); }
  catch { await tryLoad('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'); }
  if (!window.Peer) throw new Error('PeerJS unavailable — co-op needs internet.');
}

export class PeerNet {
  constructor(h) {
    this.h = h;
    this.isHost = false; this.open = false;
    this.room = null; this.profile = null;
    this.peer = null; this.hostConn = null;
    this.guests = [];            // host: [{conn, pid, seat}]
    this.sim = null; this.timer = null; this.tickN = 0;
    this.rtt = 0; this.lastSnapAt = 0; this.mySeat = -1;
    this.input = { x: 0, z: 0, fx: 0, fz: -1, a: 0, th: 0, ah: false, sp: false };
    this._lastSent = ''; this._lastForce = 0;
    setInterval(() => this.pump(), 50);
  }

  // ── becoming the room ────────────────────────────────────────────────────
  async host(room, profile) {
    this.isHost = true; this.room = room; this.profile = profile;
    await loadPeer();
    await new Promise((resolve, reject) => {
      this.peer = new window.Peer(PREFIX + room);
      const to = setTimeout(() => reject(new Error('Signaling timed out — try again.')), 20000);
      this.peer.on('open', () => { clearTimeout(to); resolve(); });
      this.peer.on('error', e => { clearTimeout(to); reject(e); });
      this.peer.on('connection', conn => {
        conn.on('data', d => this.onGuestData(conn, d));
        const bye = () => this.onGuestGone(conn);
        conn.on('close', bye); conn.on('error', bye);
      });
    });
    // stand the room up and seat ourselves in it
    this.sim = new Sim(djb2(room));
    this.mySeat = this.sim.join(profile.pid, profile.name, profile.color);
    if (profile.bot) this.sim.addBot();   // Hazel works hosted shifts too
    this.open = true;
    this.timer = setInterval(() => this.step(), TICK_MS);
    this.h.hello({ t: 'hello', you: this.mySeat, room, snap: this.sim.snapshot(), host: 1 });
  }

  onGuestData(conn, m) {
    if (!m || typeof m !== 'object' || !this.sim) return;
    if (m.t === 'hi') {
      if (this.guests.length >= MAX_GUESTS) { try { conn.send({ t: 'full' }); } catch {} return; }
      const pid = String(m.pid || '').slice(0, 40);
      if (!pid) return;
      const seat = this.sim.join(pid, m.name, m.color);
      conn._pid = pid; conn._seat = seat;
      this.guests.push({ conn, pid, seat });
      try { conn.send({ t: 'hello', you: seat, room: this.room, snap: this.sim.snapshot() }); } catch {}
      this.h.roster && this.h.roster(this.guests.length + 1);
      return;
    }
    if (m.t === 'in') { if (conn._pid) this.sim.input(conn._pid, m); return; }
    if (m.t === 'again') { this.sim.again(); return; }
    if (m.t === 'pick') { if (conn._pid && this.sim.players.has(conn._pid)) this.sim.pick(m.i | 0); return; }
    if (m.t === 'buy') { if (conn._pid && this.sim.players.has(conn._pid)) this.sim.buy(String(m.u || '').slice(0, 20)); return; }
    if (m.t === 'ping') { try { conn.send({ t: 'pong', n: m.n | 0 }); } catch {} return; }
    if (m.t === 'rtc') { this.relayRtc(conn._seat, m); return; }
  }

  onGuestGone(conn) {
    this.guests = this.guests.filter(g => g.conn !== conn);
    if (conn._pid && this.sim) this.sim.leave(conn._pid);
    this.h.roster && this.h.roster(this.guests.length + 1);
  }

  /** Voice-mesh signalling, stamped with the sender's seat and delivered by
   *  seat — the same contract the Durable Object had, including delivery to the
   *  HOST's own seat, which is local rather than a data channel. */
  relayRtc(fromSeat, m) {
    if (fromSeat == null || fromSeat < 0) return;
    const fwd = { t: 'rtc', k: String(m.k || '').slice(0, 10), from: fromSeat };
    if (m.sdp) fwd.sdp = m.sdp;
    if (m.c) fwd.c = m.c;
    const toSeat = m.to == null ? null : (m.to | 0);
    if (toSeat != null) {
      if (toSeat === this.mySeat) { this.h.rtc && this.h.rtc(fwd); return; }
      const g = this.guests.find(q => q.seat === toSeat);
      if (g) { try { g.conn.send(fwd); } catch {} }
      return;
    }
    if (fromSeat !== this.mySeat) this.h.rtc && this.h.rtc(fwd);
    for (const g of this.guests) if (g.seat !== fromSeat) { try { g.conn.send(fwd); } catch {} }
  }

  step() {
    if (!this.sim) return;
    this.tickN++;
    const evs = this.sim.tick(0.05);
    if (evs.length) {
      for (const g of this.guests) { try { g.conn.send({ t: 'ev', l: evs }); } catch {} }
      for (const ev of evs) this.h.ev(ev);
    }
    if (this.tickN % SNAP_EVERY === 0) {
      const snap = this.sim.snapshot();
      for (const g of this.guests) { try { g.conn.send({ t: 's', snap }); } catch {} }
      this.lastSnapAt = performance.now();
      this.h.snap(snap);
    }
  }

  // ── joining someone else's room ──────────────────────────────────────────
  async join(room, profile) {
    this.isHost = false; this.room = room; this.profile = profile;
    await loadPeer();
    this.h.status && this.h.status('connecting');
    await new Promise((resolve, reject) => {
      this.peer = new window.Peer();
      const to = setTimeout(() => reject(new Error('Could not reach that diner — check the code.')), 20000);
      this.peer.on('error', e => { clearTimeout(to); reject(e); });
      this.peer.on('open', () => {
        const conn = this.peer.connect(PREFIX + room, { reliable: true });
        this.hostConn = conn;
        conn.on('open', () => {
          this.open = true;
          conn.send({ t: 'hi', pid: profile.pid, name: profile.name, color: profile.color });
        });
        conn.on('data', m => {
          if (!m || typeof m !== 'object') return;
          if (m.t === 'hello') { clearTimeout(to); this.mySeat = m.you; this.h.hello(m); resolve(); return; }
          if (m.t === 'full') { clearTimeout(to); reject(new Error('That diner is full.')); return; }
          if (m.t === 's') { this.lastSnapAt = performance.now(); this.h.snap(m.snap); return; }
          if (m.t === 'ev') { for (const ev of m.l) this.h.ev(ev); return; }
          if (m.t === 'rtc') { this.h.rtc && this.h.rtc(m); return; }
          if (m.t === 'pong') { this.rtt = (Date.now() % 1e9) - m.n; return; }
        });
        const lost = () => { this.open = false; this.h.status && this.h.status('hostlost'); };
        conn.on('close', lost); conn.on('error', lost);
      });
    });
    setInterval(() => { if (this.open) this.send({ t: 'ping', n: Date.now() % 1e9 }); }, 2000);
  }

  // ── transport ────────────────────────────────────────────────────────────
  /** Same signature the WebSocket client had, so callers (including the voice
   *  mesh and the prep-card buttons) never learn which transport they are on. */
  send(o) {
    if (this.isHost) {
      if (!this.sim) return;
      if (o.t === 'again') this.sim.again();
      else if (o.t === 'pick') this.sim.pick(o.i | 0);
      else if (o.t === 'buy') this.sim.buy(String(o.u || '').slice(0, 20));
      else if (o.t === 'rtc') this.relayRtc(this.mySeat, o);
      return;
    }
    if (this.open && this.hostConn) { try { this.hostConn.send(o); } catch {} }
  }
  again() { this.send({ t: 'again' }); }

  pump() {
    const i = this.input;
    if (this.isHost) {
      // the host's own hands: straight into the sim it is already running
      if (this.sim && this.profile) this.sim.input(this.profile.pid, i);
      return;
    }
    if (!this.open) return;
    const s = [i.x.toFixed(2), i.z.toFixed(2), i.fx.toFixed(2), i.fz.toFixed(2), i.a, i.th, i.ah ? 1 : 0, i.sp ? 1 : 0, i.co | 0, i.ab | 0, i.gn | 0].join(',');
    const now = performance.now();
    if (s !== this._lastSent || now - this._lastForce > 250) {
      this._lastSent = s; this._lastForce = now;
      this.send({ t: 'in', x: i.x, z: i.z, fx: i.fx, fz: i.fz, a: i.a, th: i.th, ah: i.ah, sp: i.sp, co: i.co, ab: i.ab, gn: i.gn });
    }
  }

  close() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try { if (this.peer) this.peer.destroy(); } catch {}
    this.open = false;
  }
}
