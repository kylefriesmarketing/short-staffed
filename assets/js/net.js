// SHORT STAFFED — WebSocket client. Builds the room URL from location per the
// platform contract; auto-reconnects; pumps inputs on a fixed interval so a
// hidden tab keeps talking (rAF suspends, setInterval survives).
export class Net {
  constructor(h) {
    this.h = h; this.ws = null; this.room = null; this.profile = null;
    this.open = false; this.backoff = 1000; this.rtt = 0; this.lastSnapAt = 0;
    this.input = { x: 0, z: 0, fx: 0, fz: -1, a: 0, th: 0, ah: false, sp: false };
    this._lastSent = ''; this._stop = false;
    setInterval(() => this.pump(), 50);
    setInterval(() => { if (this.open) this.send({ t: 'ping', n: Date.now() % 1e9 }); }, 2000);
  }
  url() {
    // the room server lives on the game's host; static mirrors (GitHub Pages,
    // localhost) point their sockets at it — same rooms, same worlds
    if (!location.host.endsWith('higgsfield.gg')) return 'wss://lucid-water-700.higgsfield.gg/ws/' + this.room;
    const base = location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + base + '/ws/' + this.room;
  }
  connect(room, profile) {
    this.room = room; this.profile = profile; this._stop = false;
    this.dial();
  }
  dial() {
    if (this._stop) return;
    try { if (this.ws) { this.ws.onclose = null; this.ws.close(); } } catch {}
    this.h.status && this.h.status('connecting');
    const ws = new WebSocket(this.url());
    this.ws = ws;
    ws.onopen = () => {
      this.open = true; this.backoff = 1000;
      this.send({ t: 'hi', pid: this.profile.pid, name: this.profile.name, color: this.profile.color });
    };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'hello') { this.h.hello(m); }
      else if (m.t === 's') { this.lastSnapAt = performance.now(); this.h.snap(m.snap); }
      else if (m.t === 'ev') { for (const ev of m.l) this.h.ev(ev); }
      else if (m.t === 'rtc') { this.h.rtc && this.h.rtc(m); }
      else if (m.t === 'pong') { this.rtt = (Date.now() % 1e9) - m.n; }
    };
    ws.onclose = () => {
      this.open = false;
      if (this._stop) return;
      this.h.status && this.h.status('reconnecting');
      setTimeout(() => this.dial(), this.backoff);
      this.backoff = Math.min(5000, this.backoff * 1.6);
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  pump() {
    if (!this.open) return;
    const i = this.input;
    const s = [i.x.toFixed(2), i.z.toFixed(2), i.fx.toFixed(2), i.fz.toFixed(2), i.a, i.th, i.ah ? 1 : 0, i.sp ? 1 : 0].join(',');
    const now = performance.now();
    if (s !== this._lastSent || now - (this._lastForce || 0) > 250) {
      this._lastSent = s; this._lastForce = now;
      this.send({ t: 'in', x: i.x, z: i.z, fx: i.fx, fz: i.fz, a: i.a, th: i.th, ah: i.ah, sp: i.sp, co: i.co });
    }
  }
  send(o) { if (this.open) { try { this.ws.send(JSON.stringify(o)); } catch {} } }
  again() { this.send({ t: 'again' }); }
}
