// SHORT STAFFED — procedural WebAudio soundboard (manifest rows sfx-* / amb-* /
// music-banjo). No audio files; adaptive loops. All view-side.
let ac = null, master = null, noiseBuf = null;
let listX = 0, listZ = 0;
let sizzleG = null, murmurG = null, murmurN = null, sizzleN = null, fireG = null, fireN = null;
let banjoTimer = null;

export function getAC() { return ac; }
export function audioInit() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  // sizzle bed (griddle intensity drives gain)
  sizzleN = src(); const sf = ac.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 5200;
  sizzleG = ac.createGain(); sizzleG.gain.value = 0;
  sizzleN.connect(sf); sf.connect(sizzleG); sizzleG.connect(master); sizzleN.start();
  // crowd murmur (customer count drives gain)
  murmurN = src(); const mf = ac.createBiquadFilter(); mf.type = 'bandpass'; mf.frequency.value = 420; mf.Q.value = 0.6;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 140; lfo.connect(lg); lg.connect(mf.frequency); lfo.start();
  murmurG = ac.createGain(); murmurG.gain.value = 0;
  murmurN.connect(mf); mf.connect(murmurG); murmurG.connect(master); murmurN.start();
  // fire crackle bed
  fireN = src(); const ff = ac.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 900;
  fireG = ac.createGain(); fireG.gain.value = 0;
  fireN.connect(ff); ff.connect(fireG); fireG.connect(master); fireN.start();
}
function src() { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
export function setListener(x, z) { listX = x; listZ = z; }
function spat(x, z) {
  if (x == null) return { pan: 0, g: 1 };
  const dx = x - listX, dz = z - listZ, d = Math.hypot(dx, dz);
  return { pan: Math.max(-0.8, Math.min(0.8, dx / 12)), g: 1 / (1 + d / 10) };
}
function tone(f0, f1, dur, type, vol, x, z, curve) {
  if (!ac) return;
  const { pan, g } = spat(x, z);
  const o = ac.createOscillator(), gn = ac.createGain(), p = ac.createStereoPanner();
  o.type = type || 'sine';
  const t = ac.currentTime;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency[curve === 'exp' ? 'exponentialRampToValueAtTime' : 'linearRampToValueAtTime'](Math.max(30, f1), t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.linearRampToValueAtTime(vol * g, t + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  p.pan.value = pan;
  o.connect(gn); gn.connect(p); p.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, fLo, fHi, x, z) {
  if (!ac) return;
  const { pan, g } = spat(x, z);
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass';
  const t = ac.currentTime;
  f.frequency.setValueAtTime(fHi, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, fLo), t + dur); f.Q.value = 0.8;
  const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t);
  gn.gain.linearRampToValueAtTime(vol * g, t + 0.015); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const p = ac.createStereoPanner(); p.pan.value = pan;
  s.connect(f); f.connect(gn); gn.connect(p); p.connect(master);
  s.start(t); s.stop(t + dur + 0.02);
}
// Karplus-Strong pluck — the banjo (manifest: music-banjo)
function pluck(freq, vol, when = 0) {
  if (!ac) return;
  const sr = ac.sampleRate, N = Math.round(sr / freq), dur = 1.1;
  const buf = ac.createBuffer(1, sr * dur, sr), d = buf.getChannelData(0);
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < d.length; i++) {
    const cur = ring[idx], nxt = ring[(idx + 1) % N];
    d[i] = cur;
    ring[idx] = (cur + nxt) * 0.499; // slight damping = plucky twang
    idx = (idx + 1) % N;
  }
  const s = ac.createBufferSource(); s.buffer = buf;
  const gn = ac.createGain(); gn.gain.value = vol;
  s.connect(gn); gn.connect(master);
  s.start(ac.currentTime + when);
}
const BANJO = [0, 4, 7, 12, 7, 4, 0, -5, 0, 4, 9, 7, 4, 2, 0, -5]; // lazy front-porch figure in A
// the same melody, gentrified: soft pads, slower, vinyl crackle (the thesis, audible)
function lofiPad(freq, vol) {
  if (!ac) return;
  const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
  o.type = 'triangle'; o2.type = 'sine';
  o.frequency.value = freq; o2.frequency.value = freq / 2;
  o.detune.value = -8;
  f.type = 'lowpass'; f.frequency.value = 1100;
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.09);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
  o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
}
let crackleG = null, crackleN = null;
function crackle(on) {
  if (!ac) return;
  if (on && !crackleG) {
    crackleN = src(); const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3200;
    crackleG = ac.createGain(); crackleG.gain.value = 0.02;
    crackleN.connect(f); f.connect(crackleG); crackleG.connect(master); crackleN.start();
  } else if (!on && crackleG) {
    try { crackleN.stop(); } catch {}
    crackleG.disconnect(); crackleG = null; crackleN = null;
  }
}
export function banjoLoop(on, style = 'banjo') {
  if (banjoTimer) { clearInterval(banjoTimer); banjoTimer = null; }
  crackle(!!on && style === 'lofi');
  if (!on || !ac) return;
  let step = 0;
  const lofi = style === 'lofi';
  banjoTimer = setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    const semi = BANJO[step % BANJO.length];
    if (lofi) { lofiPad(220 * Math.pow(2, semi / 12), 0.12); if (step % 4 === 0) lofiPad(55, 0.1); }
    else { pluck(220 * Math.pow(2, semi / 12), 0.16); if (step % 4 === 2) pluck(110, 0.10, 0.02); }
    step++;
  }, lofi ? 480 : 340);
}
export function beds({ sizzle, crowd, fire }) {
  if (!ac) return;
  const t = ac.currentTime;
  sizzleG.gain.linearRampToValueAtTime(Math.min(0.16, sizzle * 0.06), t + 0.2);
  murmurG.gain.linearRampToValueAtTime(Math.min(0.12, crowd * 0.012), t + 0.4);
  fireG.gain.linearRampToValueAtTime(Math.min(0.22, fire * 0.055), t + 0.15);
}
export function sfx(k, x, z) {
  if (!ac) return;
  switch (k) {
    case 'ding': tone(1560, 1560, 0.5, 'triangle', 0.22, x, z); tone(2340, 2340, 0.3, 'sine', 0.08, x, z); break;
    case 'cha': tone(880, 880, 0.07, 'square', 0.10, x, z); setTimeout(() => { tone(1320, 1320, 0.1, 'square', 0.10, x, z); tone(2093, 2093, 0.18, 'triangle', 0.12, x, z); }, 70); break;
    case 'tip': tone(1760, 2200, 0.16, 'triangle', 0.12, x, z); break;
    case 'chime': tone(988, 988, 0.25, 'sine', 0.14); setTimeout(() => tone(1319, 1319, 0.4, 'sine', 0.12), 120); break;
    case 'order': tone(660, 660, 0.09, 'triangle', 0.1, x, z); setTimeout(() => tone(880, 880, 0.09, 'triangle', 0.1, x, z), 90); break;
    case 'pour': noise(0.9, 0.12, 300, 1400, x, z); break;
    case 'flip': noise(0.12, 0.14, 900, 2400, x, z); tone(300, 480, 0.1, 'sine', 0.08, x, z); break;
    case 'plateup': tone(520, 700, 0.09, 'triangle', 0.1, x, z); break;
    case 'sizzleon': noise(0.35, 0.16, 500, 3800, x, z); break;
    case 'smoke': noise(0.5, 0.1, 200, 900, x, z); break;
    case 'ignite': noise(0.7, 0.3, 120, 2400, x, z); tone(90, 45, 0.6, 'sawtooth', 0.12, x, z, 'exp'); break;
    case 'spread': noise(0.4, 0.18, 150, 1600, x, z); break;
    case 'douse': noise(0.5, 0.2, 2000, 300, x, z); break;
    case 'spray': noise(0.2, 0.1, 2500, 3500, x, z); break;
    case 'break': noise(0.25, 0.28, 1800, 5200, x, z); tone(2800, 1400, 0.12, 'square', 0.06, x, z); break;
    case 'yeet': noise(0.3, 0.14, 300, 2200, x, z); break;
    case 'thud': tone(120, 48, 0.3, 'sine', 0.3, x, z, 'exp'); noise(0.15, 0.16, 80, 400, x, z); break;
    case 'grab': tone(240, 300, 0.07, 'triangle', 0.09, x, z); break;
    case 'shove': tone(190, 120, 0.12, 'sine', 0.14, x, z); break;
    case 'trash': tone(160, 90, 0.15, 'sine', 0.12, x, z); noise(0.1, 0.08, 200, 700, x, z); break;
    case 'wash': noise(0.5, 0.1, 500, 1800); break;
    case 'angry': tone(160, 120, 0.18, 'sawtooth', 0.09, x, z); setTimeout(() => tone(140, 100, 0.2, 'sawtooth', 0.09, x, z), 160); break;
    case 'flee': noise(0.2, 0.08, 600, 1800, x, z); break;
    case 'appraise': tone(1200, 1600, 0.12, 'sine', 0.05, x, z); break;
    case 'open': tone(988, 988, 0.3, 'sine', 0.16); setTimeout(() => tone(1319, 1319, 0.5, 'sine', 0.14), 140); break;
    case 'lastcall': tone(659, 659, 0.5, 'sine', 0.15); setTimeout(() => tone(494, 494, 0.7, 'sine', 0.13), 260); break;
    case 'count': tone(740, 740, 0.12, 'square', 0.1); break;
    case 'text': tone(1976, 2200, 0.09, 'sine', 0.1); setTimeout(() => tone(1976, 1760, 0.09, 'sine', 0.08), 90); break;
    // the director's second channel: a low anticipatory two-note under every telegraph toast
    case 'tg': tone(392, 392, 0.16, 'triangle', 0.11); setTimeout(() => tone(466, 466, 0.24, 'triangle', 0.1), 140); break;
    case 'traydump': noise(0.35, 0.34, 1200, 5200, x, z); tone(2400, 900, 0.2, 'square', 0.08, x, z); setTimeout(() => noise(0.2, 0.2, 900, 3600, x, z), 130); break;
    case 'traygrab': tone(340, 300, 0.08, 'triangle', 0.12, x, z); break;
    case 'trayback': tone(300, 340, 0.08, 'triangle', 0.1); break;
    case 'barge': tone(130, 60, 0.22, 'sine', 0.26, x, z, 'exp'); noise(0.12, 0.14, 100, 500, x, z); break;
    case 'helpup': tone(523, 659, 0.14, 'triangle', 0.12, x, z); setTimeout(() => tone(784, 784, 0.16, 'triangle', 0.1, x, z), 110); break;
    case 'callout': tone(880, 1174, 0.12, 'square', 0.12, x, z); setTimeout(() => tone(1174, 880, 0.14, 'square', 0.1, x, z), 130); break;
    case 'subok': tone(660, 880, 0.09, 'sine', 0.08, x, z); setTimeout(() => tone(990, 1320, 0.08, 'sine', 0.06, x, z), 90); break;
    case 'subfail': [220, 208].forEach((f, i) => setTimeout(() => tone(f, f * 0.96, 0.22, 'sawtooth', 0.1, x, z), i * 180)); break;
    case 'spill': noise(0.25, 0.16, 300, 1100, x, z); tone(280, 160, 0.18, 'sine', 0.1, x, z, 'exp'); break;
    case 'mopped': noise(0.5, 0.12, 400, 1600, x, z); setTimeout(() => noise(0.25, 0.08, 600, 2000, x, z), 200); break;
    case 'ability': [0, 4, 9].forEach((s2, i) => setTimeout(() => tone(659 * Math.pow(2, s2 / 12), 0, 0.16, 'triangle', 0.13), i * 90)); break;
    case 'inspsaw': tone(2400, 2000, 0.05, 'square', 0.07); setTimeout(() => tone(2200, 1900, 0.06, 'square', 0.06), 80); break; // pencil scratch
    case 'insppass': [0, 4, 7].forEach((s2, i) => setTimeout(() => tone(784 * Math.pow(2, s2 / 12), 0, 0.18, 'triangle', 0.12), i * 110)); break;
    case 'inspwarn': tone(392, 370, 0.3, 'sawtooth', 0.09); break;
    case 'inspcite': [311, 294, 233].forEach((f, i) => setTimeout(() => tone(f, f * 0.97, 0.3, 'sawtooth', 0.11), i * 220)); break;
    case 'boom': noise(1.2, 0.6, 40, 900, x, z); tone(60, 28, 0.9, 'sawtooth', 0.4, x, z, 'exp'); setTimeout(() => noise(0.6, 0.25, 200, 1600, x, z), 180); break;
    case 'gunclick': tone(1400, 1100, 0.04, 'square', 0.12, x, z); break;
    case 'gungrab': noise(0.08, 0.16, 800, 2400, x, z); setTimeout(() => noise(0.08, 0.16, 700, 2200, x, z), 140); break; // shk-shk
    case 'gatebreak': noise(0.3, 0.3, 200, 1400, x, z); tone(180, 90, 0.3, 'square', 0.12, x, z, 'exp'); break;
    case 'gatefixed': [0, 1, 2].forEach(i => setTimeout(() => { tone(220, 180, 0.08, 'square', 0.14); noise(0.05, 0.1, 400, 1600); }, i * 160)); break;
    case 'pigscoop': tone(520, 720, 0.12, 'sawtooth', 0.14, x, z); break; // oink up
    case 'pigsquirm': tone(680, 480, 0.14, 'sawtooth', 0.15, x, z); break;
    case 'pigyeet': tone(760, 1080, 0.3, 'sawtooth', 0.16, x, z); break;  // squeeeee
    case 'pigate': noise(0.18, 0.12, 300, 900, x, z); setTimeout(() => noise(0.14, 0.1, 260, 800, x, z), 160); break;
    case 'pighome': tone(440, 560, 0.1, 'sawtooth', 0.1, x, z); setTimeout(() => tone(560, 480, 0.12, 'sawtooth', 0.09, x, z), 120); break;
    // phase turn: a low timpani hit + a rising swell — the night changes gear
    case 'phase': tone(98, 96, 0.7, 'sine', 0.3); noise(0.5, 0.1, 60, 300); setTimeout(() => tone(147, 196, 0.5, 'triangle', 0.14), 240); break;
    case 'openfault': noise(0.2, 0.2, 1400, 4200); tone(2200, 1100, 0.14, 'square', 0.05); break;
    case 'busin': noise(0.8, 0.14, 200, 900); tone(155, 110, 0.5, 'sawtooth', 0.1, x, z, 'exp'); break;
    case 'buswarn': tone(233, 233, 0.18, 'sawtooth', 0.12); setTimeout(() => tone(233, 233, 0.18, 'sawtooth', 0.12), 240); break;
    case 'bushonk': tone(233, 231, 0.7, 'sawtooth', 0.16); tone(294, 291, 0.7, 'sawtooth', 0.13); break;
    case 'over': [0, 4, 7, 12].forEach((s, i) => pluck(220 * Math.pow(2, s / 12), 0.2, i * 0.13)); break;
    case 'click': tone(900, 700, 0.05, 'square', 0.06); break;
    case 'supply': tone(988, 988, 0.3, 'sine', 0.14); setTimeout(() => tone(784, 784, 0.4, 'sine', 0.12), 180); break;
    case 'cast': noise(0.35, 0.1, 800, 2600, x, z); setTimeout(() => noise(0.12, 0.08, 300, 900, x, z), 350); break;
    case 'bite': tone(1760, 1760, 0.09, 'square', 0.16); setTimeout(() => tone(2217, 2217, 0.12, 'square', 0.16), 90); break;
    case 'catch': [0, 5, 9].forEach((s, i) => setTimeout(() => tone(1046 * Math.pow(2, s / 12), 0, 0.14, 'triangle', 0.14, x, z), i * 80)); break;
    case 'lost': noise(0.4, 0.16, 400, 1200, x, z); tone(500, 180, 0.35, 'sine', 0.08, x, z, 'exp'); break;
    case 'pick': tone(700, 900, 0.06, 'sine', 0.09, x, z); break;
    case 'bank': tone(180, 110, 0.12, 'sine', 0.14, x, z); setTimeout(() => tone(1568, 1568, 0.1, 'triangle', 0.1, x, z), 100); break;
    case 'bear': tone(90, 70, 0.4, 'sawtooth', 0.07, x, z); break;
    case 'roar': tone(82, 38, 0.75, 'sawtooth', 0.32, x, z, 'exp'); noise(0.6, 0.24, 60, 500, x, z); break;
    case 'bearout': tone(110, 80, 0.3, 'sawtooth', 0.08, x, z); break;
    case 'sysco_ok': tone(392, 392, 0.22, 'square', 0.12); setTimeout(() => tone(523, 523, 0.3, 'square', 0.12), 200); break;
    case 'sysco_out': [392, 349, 293].forEach((f, i) => setTimeout(() => tone(f, f * 0.97, 0.32, 'sawtooth', 0.09), i * 260)); break;
    case 'sysco_broke': tone(220, 200, 0.2, 'square', 0.08); break;
    case 'bought': tone(160, 100, 0.12, 'sine', 0.14); setTimeout(() => { tone(1046, 1046, 0.12, 'triangle', 0.12); tone(1568, 1568, 0.18, 'triangle', 0.1); }, 120); break;
    case 'grabf': tone(220, 330, 0.14, 'square', 0.12, x, z); break;
    case 'yeetf': noise(0.45, 0.2, 400, 2600, x, z); tone(500, 900, 0.3, 'square', 0.1, x, z); break;
    case 'landf': tone(110, 45, 0.3, 'sine', 0.3, x, z, 'exp'); noise(0.18, 0.18, 80, 500, x, z); setTimeout(() => tone(180, 140, 0.25, 'sawtooth', 0.07, x, z), 200); break;
    case 'splash': noise(0.7, 0.32, 300, 2400, x, z); tone(300, 90, 0.5, 'sine', 0.12, x, z, 'exp'); break;
    case 'slip': tone(900, 200, 0.35, 'sine', 0.14, x, z, 'exp'); setTimeout(() => noise(0.2, 0.2, 200, 1200, x, z), 250); break;
    case 'tumble': for (let i = 0; i < 4; i++) setTimeout(() => noise(0.12, 0.16, 1400 + i * 400, 4000, x, z), i * 90); break;
    case 'stackup': tone(1200, 1400, 0.07, 'triangle', 0.1, x, z); break;
    case 'sweep': noise(0.3, 0.1, 800, 2200, x, z); break;
    case 'bellding': tone(2093, 2093, 0.4, 'sine', 0.2, x, z); tone(2637, 2637, 0.25, 'sine', 0.1, x, z); break;
    case 'kalewrong': tone(392, 340, 0.35, 'sine', 0.1, x, z); setTimeout(() => tone(330, 290, 0.4, 'sine', 0.09, x, z), 300); break;
    case 'kaleok': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, f, 0.16, 'triangle', 0.12, x, z), i * 90)); break;
    case 'yeehaw': tone(300, 700, 0.18, 'square', 0.14, x, z); setTimeout(() => tone(750, 500, 0.25, 'square', 0.12, x, z), 160); break;
    case 'larpertip': tone(880, 880, 0.08, 'square', 0.1); setTimeout(() => { tone(1320, 1320, 0.1, 'square', 0.1); tone(2093, 2093, 0.2, 'triangle', 0.14); }, 80); break;
    case 'seqpost': noise(0.06, 0.2, 3000, 5000, x, z); setTimeout(() => tone(1976, 2200, 0.12, 'sine', 0.12), 90); setTimeout(() => tone(1976, 2200, 0.12, 'sine', 0.1), 220); break;
    case 'seqclip': noise(0.06, 0.18, 3000, 5000, x, z); break;
    case 'seqgood': tone(1568, 1760, 0.14, 'sine', 0.1); break;
    case 'contagion': tone(1976, 1976, 0.09, 'sine', 0.1); setTimeout(() => tone(1976, 1976, 0.09, 'sine', 0.1), 130); setTimeout(() => tone(1976, 1976, 0.09, 'sine', 0.1), 260); break;
  }
}
