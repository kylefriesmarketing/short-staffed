// SHORT STAFFED — proximity voice (manifest: the walk-in-freezer feature, v1).
// A ≤4-peer WebRTC mesh signaled over the room's own WebSocket ({t:'rtc',…}
// relayed by seat). Audio routes through WebAudio so every voice is panned and
// attenuated by in-game distance. Lower seat initiates each pair. Best-effort:
// no TURN server, so a rare NAT pair may not connect — the game never breaks.
import { getAC, audioInit } from './audio.js';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const KINDS = new Set(['hello', 'hello2', 'bye', 'offer', 'answer', 'ice']);

export class Voice {
  constructor(net, getSeat, getSnap) {
    this.net = net; this.getSeat = getSeat; this.getSnap = getSnap;
    this.pcs = new Map(); this.nodes = new Map(); this.ready = new Set();
    this.enabled = false; this.localStream = null; this.speaking = new Set();
    this.onstate = null; this.state = 'off';
  }
  setState(s) { this.state = s; this.onstate && this.onstate(s); }
  async toggle() {
    if (this.enabled) { this.stop(); return; }
    audioInit();
    this.setState('conn');
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) { this.setState('err'); return; }
    this.enabled = true; this.setState('on');
    this.net.send({ t: 'rtc', k: 'hello' });
    for (const s of this.ready) if (this.getSeat() < s && !this.pcs.has(s)) this.call(s);
  }
  stop() {
    this.enabled = false;
    for (const pc of this.pcs.values()) { try { pc.close(); } catch {} }
    this.pcs.clear();
    for (const seat of [...this.nodes.keys()]) this.detach(seat);
    if (this.localStream) { for (const t of this.localStream.getTracks()) t.stop(); this.localStream = null; }
    this.net.send({ t: 'rtc', k: 'bye' });
    this.setState('off');
  }
  mkpc(seat) {
    const pc = new RTCPeerConnection(ICE);
    this.pcs.set(seat, pc);
    if (this.localStream) for (const tr of this.localStream.getTracks()) pc.addTrack(tr, this.localStream);
    pc.onicecandidate = e => { if (e.candidate) this.net.send({ t: 'rtc', to: seat, k: 'ice', c: e.candidate }); };
    pc.ontrack = e => this.attach(seat, e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) { this.pcs.delete(seat); this.detach(seat); }
    };
    return pc;
  }
  async call(seat) {
    try {
      const pc = this.mkpc(seat);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.net.send({ t: 'rtc', to: seat, k: 'offer', sdp: pc.localDescription });
    } catch {}
  }
  async onSignal(m) {
    if (!m || !KINDS.has(m.k) || m.from == null || m.from === this.getSeat()) return;
    const from = m.from | 0;
    try {
      if (m.k === 'hello') {
        this.ready.add(from);
        if (this.enabled) {
          this.net.send({ t: 'rtc', to: from, k: 'hello2' });
          if (this.getSeat() < from && !this.pcs.has(from)) this.call(from);
        }
      } else if (m.k === 'hello2') {
        this.ready.add(from);
        if (this.enabled && this.getSeat() < from && !this.pcs.has(from)) this.call(from);
      } else if (m.k === 'bye') {
        const pc = this.pcs.get(from); if (pc) { try { pc.close(); } catch {} }
        this.pcs.delete(from); this.detach(from); this.ready.delete(from);
      } else if (!this.enabled) {
        return;
      } else if (m.k === 'offer') {
        let pc = this.pcs.get(from) || this.mkpc(from);
        await pc.setRemoteDescription(m.sdp);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        this.net.send({ t: 'rtc', to: from, k: 'answer', sdp: pc.localDescription });
      } else if (m.k === 'answer') {
        const pc = this.pcs.get(from); if (pc) await pc.setRemoteDescription(m.sdp);
      } else if (m.k === 'ice') {
        const pc = this.pcs.get(from); if (pc) { try { await pc.addIceCandidate(m.c); } catch {} }
      }
    } catch {}
  }
  attach(seat, stream) {
    this.detach(seat);
    const ac = getAC(); if (!ac) return;
    // Chrome quirk: a MediaStream must also feed a (muted) media element or the
    // WebAudio graph receives silence
    const el = document.createElement('audio');
    el.srcObject = stream; el.muted = true; el.autoplay = true; el.style.display = 'none';
    document.body.appendChild(el);
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser(); an.fftSize = 512;
    const pan = ac.createStereoPanner();
    const g = ac.createGain(); g.gain.value = 0.9;
    src.connect(an); an.connect(pan); pan.connect(g); g.connect(ac.destination);
    this.nodes.set(seat, { pan, g, an, el, data: new Uint8Array(256) });
  }
  detach(seat) {
    const n = this.nodes.get(seat);
    if (n) { try { n.g.disconnect(); } catch {} if (n.el) n.el.remove(); }
    this.nodes.delete(seat); this.speaking.delete(seat);
  }
  // pan + attenuate every voice by in-game distance; flag who is talking
  updateSpatial(my, snap) {
    this.speaking.clear();
    if (!snap || !my) return;
    for (const [seat, n] of this.nodes) {
      const pl = snap.pl.find(p => p.i === seat);
      if (!pl) { n.g.gain.value = 0; continue; }
      const dx = pl.x - my.x, dz = pl.z - my.z, d = Math.hypot(dx, dz);
      n.pan.pan.value = Math.max(-0.85, Math.min(0.85, dx / 10));
      n.g.gain.value = Math.max(0, Math.min(1, 1.3 / (1 + d / 7) - 0.04));
      n.an.getByteTimeDomainData(n.data);
      let s = 0, c = 0;
      for (let i = 0; i < n.data.length; i += 8) { const v = (n.data[i] - 128) / 128; s += v * v; c++; }
      if (Math.sqrt(s / c) > 0.055 && n.g.gain.value > 0.05) this.speaking.add(seat);
    }
  }
}
