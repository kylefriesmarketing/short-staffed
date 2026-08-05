// SHORT STAFFED — the view. three.js r160 (vendored). Janky low-poly per the
// STYLE FORMULA: flat-shaded facets, warm diner cream + wood + faded teal,
// saturated apron accents, hot orange hazards, golden-hour light. View-only:
// Math.random is allowed here, the sim never sees any of this.
import * as THREE from '../vendor/three.module.js';
import { C, LAYOUT } from './sim.js';

const PAL = {
  cream: 0xf3e5c8, creamDark: 0xe4d2ac, teal: 0x8fb8ad, tealDark: 0x6e968b,
  wood: 0x8a6844, woodDark: 0x6b4f33, top: 0xa77e52, steel: 0x9aa1a8, steelDark: 0x5c6167,
  floorA: 0xe8d9b8, floorB: 0xcfd8c6, hazard: 0xff5a26, white: 0xfff6e8,
  aprons: [0xd94f38, 0x3a76c4, 0xe8b53a, 0x5c9e4f],
  skin: [0xe8b48c, 0xc98e66, 0xf0c8a0, 0xa9764f],
  flock: [0xd9a7c7, 0xa7c7d9, 0xc7d9a7],
  gray: 0x8c8c94, denim: 0x5b7292, hatBrown: 0x7a5a3a, flannel: 0xb5533c,
  zillow: [0x7ea2c4, 0xc4a27e], mountain: 0x9aa78f, mountainFar: 0xb8c2b0,
  batter: 0xf5e6c4, patty: 0xa2543c, troutC: 0x9fb6c4, coffee: 0x4a3320, matcha: 0x7fae6a,
  fire: [0xff5a26, 0xffa02e, 0xffd23e],
};
const mats = new Map();
function M(color, opt = {}) {
  const key = color + '|' + (opt.e || 0) + '|' + (opt.t || 0);
  if (!mats.has(key)) {
    const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    if (opt.e) { m.emissive = new THREE.Color(color); m.emissiveIntensity = opt.e; }
    if (opt.t) { m.transparent = true; m.opacity = opt.t; }
    mats.set(key, m);
  }
  return mats.get(key);
}
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  sph: new THREE.SphereGeometry(0.5, 7, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 6),
  caps: new THREE.CapsuleGeometry(0.5, 0.6, 3, 7),
  tri: new THREE.CircleGeometry(0.5, 3),
  disc: new THREE.CircleGeometry(0.5, 16),
};
function mesh(g, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0) {
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry;
  return m;
}
// merge static boxes/cyls into one vertex-colored geometry (draw-call budget)
class Merger {
  constructor() { this.pos = []; this.nor = []; this.col = []; this._c = new THREE.Color(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); }
  add(geo, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    this._e.set(rx, ry, rz); this._q.setFromEuler(this._e);
    this._m.compose(new THREE.Vector3(x, y, z), this._q, new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(this._m);
    const p = g.attributes.position, n = g.attributes.normal; this._c.set(color);
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(this._c.r, this._c.g, this._c.b);
    }
    g.dispose();
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  }
}
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
function blob(r) { const m = new THREE.Mesh(GEO.disc, shadowMat); m.rotation.x = -Math.PI / 2; m.scale.setScalar(r * 2); m.position.y = 0.02; m.renderOrder = 2; return m; }
// emote bubbles (manifest row fx-emotes): cached canvas emoji sprites
const emojiCache = new Map();
function emojiTexture(ch) {
  if (!emojiCache.has(ch)) {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
    const cx = cv.getContext('2d');
    cx.beginPath(); cx.arc(48, 44, 40, 0, 7); cx.fillStyle = 'rgba(255,246,232,.95)'; cx.fill();
    cx.beginPath(); cx.moveTo(38, 80); cx.lineTo(48, 94); cx.lineTo(56, 80); cx.fillStyle = 'rgba(255,246,232,.95)'; cx.fill();
    cx.font = '46px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(ch, 48, 46);
    emojiCache.set(ch, new THREE.CanvasTexture(cv));
  }
  return emojiCache.get(ch);
}
// floating +$ pops (manifest row fx-money-pop)
function moneyTexture(txt) {
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 64;
  const cx = cv.getContext('2d');
  cx.font = '900 40px "Trebuchet MS", Verdana, sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.lineWidth = 9; cx.strokeStyle = 'rgba(36,50,31,.9)'; cx.strokeText(txt, 80, 32);
  cx.fillStyle = '#b8f09a'; cx.fillText(txt, 80, 32);
  return new THREE.CanvasTexture(cv);
}
// name tag: canvas-texture sprite (manifest row ui-nametags — ticket-white, ink outline)
function nameSprite(name) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const cx = cv.getContext('2d');
  cx.font = '900 34px "Trebuchet MS", Verdana, sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.lineWidth = 8; cx.strokeStyle = 'rgba(58,44,28,0.9)'; cx.strokeText(name, 128, 34);
  cx.fillStyle = '#fff6e8'; cx.fillText(name, 128, 34);
  const tx = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
  sp.scale.set(1.7, 0.42, 1); sp.position.y = 1.78; sp.renderOrder = 4;
  return sp;
}

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7cf9e);
    this.scene.fog = new THREE.Fog(0xf7cf9e, 26, 60);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    this.camTgt = new THREE.Vector3(0, 0, 1);
    this.camPos = new THREE.Vector3(0, 12, 10);
    this.sun = new THREE.DirectionalLight(0xffd9a0, 1.35); this.sun.position.set(-7, 11, 5);
    this.hemi = new THREE.HemisphereLight(0xfff2dc, 0x9a7f5c, 0.95);
    this.scene.add(this.sun, this.hemi);
    this._cB = new THREE.Color(); this._cB2 = new THREE.Color();
    this.simPh = 'lobby'; this.simT = 0; this._dayF = 0;
    this.pl = new Map(); this.cu = new Map(); this.it = new Map(); this.fi = new Map();
    this.slotFood = new Map(); this.smoke = []; this.foam = []; this.pop = [];
    this.snap = null; this.you = -1; this.pred = null;
    this.buildRoom();
    this.buildPools();
    this.highlight = mesh(new THREE.RingGeometry(0.42, 0.55, 18), new THREE.MeshBasicMaterial({ color: PAL.white, transparent: true, opacity: 0.85, depthWrite: false }));
    this.highlight.rotation.x = -Math.PI / 2; this.highlight.position.y = 0.04; this.highlight.visible = false; this.highlight.renderOrder = 3;
    this.scene.add(this.highlight);
    this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---- static room -----------------------------------------------------------
  buildRoom() {
    const m = new Merger();
    // checker floor as one merged grid of thin boxes — per-tile jitter + worn patches
    const wearC = new THREE.Color();
    for (let i = 0; i < 24; i++) for (let j = 0; j < 14; j++) {
      const x = -12 + i + 0.5, z = -7 + j + 0.5;
      wearC.set((i + j) % 2 ? PAL.floorA : PAL.floorB);
      const jit = (Math.random() - 0.5) * 0.045;
      wearC.offsetHSL(0, 0, jit);
      const nearDoor = Math.hypot(x - LAYOUT.door.x, z - 6.5) < 2.6;
      const nearGriddle = Math.hypot(x + 8, z + 5) < 2.4;
      if ((nearDoor || nearGriddle) && Math.random() < 0.5) wearC.offsetHSL(0, -0.05, -0.06);
      m.add(GEO.box, wearC.getHex(), x, -0.05, z, 1, 0.1, 1);
    }
    // porch + dirt yard outside the door
    m.add(GEO.box, PAL.woodDark, LAYOUT.door.x, -0.06, 8.3, 4.6, 0.1, 2.6);
    m.add(GEO.box, 0xcbb27e, 2, -0.12, 9.5, 26, 0.1, 5);
    // walls (south low, door gap)
    m.add(GEO.box, PAL.cream, 0, 1.2, -7.25, 24.7, 2.4, 0.5);
    m.add(GEO.box, PAL.cream, -12.25, 1.2, 0, 0.5, 2.4, 14.5);
    m.add(GEO.box, PAL.cream, 12.25, 1.2, 0, 0.5, 2.4, 14.5);
    const d = LAYOUT.door;
    m.add(GEO.box, PAL.cream, (-12 + (d.x - d.gap)) / 2, 0.5, 7.25, (d.x - d.gap) + 12, 1.0, 0.5);
    m.add(GEO.box, PAL.cream, (d.x + d.gap + 12) / 2, 0.5, 7.25, 12 - (d.x + d.gap), 1.0, 0.5);
    m.add(GEO.box, PAL.teal, d.x - d.gap, 1.1, 7.25, 0.22, 2.2, 0.3); // door posts
    m.add(GEO.box, PAL.teal, d.x + d.gap, 1.1, 7.25, 0.22, 2.2, 0.3);
    m.add(GEO.box, PAL.teal, d.x, 2.25, 7.25, d.gap * 2 + 0.2, 0.22, 0.3);
    // windows on the north wall (sky shine planes added separately)
    for (const wx of [-9, -4, 1]) m.add(GEO.box, PAL.teal, wx, 1.5, -7.02, 2.6, 1.3, 0.1);
    // baseboard trim
    m.add(GEO.box, PAL.tealDark, 0, 0.12, -6.98, 24, 0.24, 0.06);
    // counter runs + tops
    const ct = LAYOUT.counter;
    const w1 = { x: (ct.x0 + ct.gapX0) / 2, w: ct.gapX0 - ct.x0 }, w2 = { x: (ct.gapX1 + 12) / 2, w: 12 - ct.gapX1 };
    for (const r of [w1, w2]) {
      m.add(GEO.box, PAL.wood, r.x, 0.46, ct.z, r.w, 0.92, 0.66);
      m.add(GEO.box, PAL.top, r.x, 0.95, ct.z, r.w + 0.12, 0.1, 0.9);
    }
    for (const ps of LAYOUT.pass) m.add(GEO.box, PAL.teal, ps.x, 1.005, ps.z, 0.9, 0.02, 0.7); // pass mats
    // kitchen stations
    m.add(GEO.box, PAL.steelDark, -8, 0.5, -6.35, 2.7, 1.0, 1.1);       // griddle body
    m.add(GEO.box, PAL.steel, -8, 1.02, -6.35, 2.5, 0.08, 0.95);        // flat top
    m.add(GEO.box, PAL.steelDark, -8, 2.35, -6.6, 2.3, 0.5, 0.6);       // hood
    m.add(GEO.box, PAL.steel, -5.5, 0.5, -6.35, 1.6, 1.0, 1.1);         // range
    m.add(GEO.cyl, 0x2c2c30, -5.5, 1.04, -6.1, 0.9, 0.08, 0.9);         // burner
    m.add(GEO.cyl, 0x3a3a40, -5.5, 1.1, -6.1, 0.75, 0.08, 0.75);        // pan
    m.add(GEO.box, 0x3a3a40, -4.85, 1.1, -6.1, 0.5, 0.06, 0.12);        // handle
    m.add(GEO.box, PAL.wood, -2.5, 0.5, -6.35, 1.9, 1.0, 1.1);          // bev cabinet
    m.add(GEO.box, PAL.steel, -2.5, 1.06, -6.35, 1.8, 0.12, 0.95);
    m.add(GEO.box, 0x6b4226, -2.9, 1.5, -6.2, 0.42, 0.75, 0.5);         // coffee urn
    m.add(GEO.box, 0x5c8a4d, -2.1, 1.5, -6.2, 0.42, 0.75, 0.5);         // matcha urn
    m.add(GEO.box, PAL.steel, 1.5, 0.5, -6.35, 1.4, 1.0, 1.1);          // sink
    m.add(GEO.box, 0x7d848b, 1.5, 1.0, -6.3, 1.1, 0.14, 0.8);
    m.add(GEO.cyl, PAL.steelDark, 1.5, 1.45, -6.6, 0.08, 0.7, 0.08);    // faucet
    m.add(GEO.cyl6, 0x4c5c46, 3.1, 0.55, -6.35, 0.8, 1.1, 0.8);         // bin
    m.add(GEO.box, PAL.wood, -10.6, 1.3, -6.6, 1.3, 0.1, 0.6);          // shelf board
    for (const c of LAYOUT.crates) {                                     // crates
      m.add(GEO.box, PAL.woodDark, c.x, 0.3, c.z, 0.64, 0.6, 0.64);
      const lid = c.ing === 'batter' ? PAL.batter : c.ing === 'patty' ? PAL.patty : PAL.troutC;
      m.add(GEO.box, lid, c.x, 0.62, c.z, 0.56, 0.1, 0.56);
      m.add(GEO.box, PAL.white, c.x, 0.42, c.z + 0.33, 0.36, 0.22, 0.02);
    }
    // tables + chairs + stools + register + jukebox
    for (const t of LAYOUT.tables) {
      m.add(GEO.cyl6, PAL.woodDark, t.x, 0.35, t.z, 0.24, 0.7, 0.24);
      m.add(GEO.cyl, PAL.cream, t.x, 0.72, t.z, 1.5, 0.1, 1.5);
      m.add(GEO.cyl, PAL.teal, t.x, 0.745, t.z, 1.0, 0.06, 1.0);
      for (const s of t.seats) {
        const a = Math.atan2(t.x - s.x, t.z - s.z);
        m.add(GEO.box, PAL.wood, s.x, 0.25, s.z, 0.42, 0.5, 0.42, 0, a, 0);
        m.add(GEO.box, PAL.wood, s.x - Math.sin(a) * 0.2, 0.62, s.z - Math.cos(a) * 0.2, 0.42, 0.5, 0.08, 0, a, 0);
      }
    }
    for (const s of LAYOUT.stools) {
      m.add(GEO.cyl6, PAL.steelDark, s.x, 0.3, s.z, 0.14, 0.6, 0.14);
      m.add(GEO.cyl, 0xc44536, s.x, 0.62, s.z, 0.52, 0.12, 0.52);
    }
    m.add(GEO.box, 0x4a4a52, 5.9, 1.25, -2.6, 0.8, 0.6, 0.6);           // register on east counter
    m.add(GEO.box, PAL.wood, 7.6, 0.7, -0.9, 1.1, 1.4, 0.7);            // jukebox
    m.add(GEO.sph, PAL.teal, 7.6, 1.45, -0.9, 1.1, 0.7, 0.7);
    // elk head, west wall
    m.add(GEO.box, PAL.woodDark, -11.9, 2.0, 2.0, 0.15, 0.9, 0.9);
    m.add(GEO.box, 0x8a6a4a, -11.6, 2.05, 2.0, 0.5, 0.42, 0.36);
    m.add(GEO.cone, 0x8a6a4a, -11.35, 1.9, 2.0, 0.24, 0.5, 0.24, 0, 0, -Math.PI / 2);
    for (const sgn of [-1, 1]) {
      m.add(GEO.cyl, 0xd8c6a8, -11.6, 2.5, 2.0 + sgn * 0.22, 0.05, 0.7, 0.05, sgn * 0.7, 0, 0.4);
      m.add(GEO.cyl, 0xd8c6a8, -11.6, 2.75, 2.0 + sgn * 0.34, 0.04, 0.4, 0.04, sgn * 1.2, 0, 0.9);
    }
    // extinguisher wall mount plate
    m.add(GEO.box, 0xb03a2a, LAYOUT.extHook.x, 1.35, -6.95, 0.4, 0.55, 0.08);
    // mountains + a couple of pines out the windows
    for (const [mx, mz, s, c] of [[-16, -24, 9, PAL.mountain], [-2, -28, 12, PAL.mountainFar], [12, -25, 10, PAL.mountain], [24, -29, 13, PAL.mountainFar]])
      m.add(GEO.cone, c, mx, s * 0.32, mz, s, s * 0.8, s);
    for (const [px, pz] of [[-14, -12], [15, -13], [19, -11]]) {
      m.add(GEO.cyl, PAL.woodDark, px, 0.7, pz, 0.18, 1.4, 0.18);
      m.add(GEO.cone, 0x5c7a52, px, 2.1, pz, 1.5, 2.6, 1.5);
    }
    const room = m.build();
    this.scene.add(room);
    // dynamic bits
    this.signPlate = mesh(GEO.box, M(0xc44536), LAYOUT.sign.x, 1.35, LAYOUT.sign.z + 0.2, 0.85, 0.5, 0.08);
    const signPost = mesh(GEO.cyl, M(PAL.woodDark), LAYOUT.sign.x, 0.8, LAYOUT.sign.z + 0.2, 0.08, 1.6, 0.08);
    this.scene.add(this.signPlate, signPost);
    this.glowGriddle = mesh(GEO.box, M(PAL.hazard, { e: 0.9 }), -8, 1.07, -6.1, 2.3, 0.02, 0.7); this.glowGriddle.visible = false;
    this.glowPan = mesh(GEO.box, M(PAL.hazard, { e: 0.9 }), -5.5, 1.09, -6.1, 1.0, 0.02, 0.7); this.glowPan.visible = false;
    this.scene.add(this.glowGriddle, this.glowPan);
    // window sky shine
    for (const wx of [-9, -4, 1]) this.scene.add(mesh(GEO.box, M(0xffe6b8, { e: 0.55 }), wx, 1.5, -6.96, 2.2, 1.0, 0.03));
    this.plateStack = mesh(GEO.cyl, M(PAL.white), LAYOUT.shelf.x, 1.4, LAYOUT.shelf.z - 0.5, 0.62, 0.5, 0.62);
    this.dirtyStack = mesh(GEO.cyl, M(0xb8a27e), LAYOUT.sink.x - 0.35, 1.1, LAYOUT.sink.z - 0.3, 0.5, 0.3, 0.5);
    this.extMesh = this.buildItem({ k: 'ext' }); this.extMesh.position.set(LAYOUT.extHook.x, 1.35, -6.8);
    this.scene.add(this.plateStack, this.dirtyStack, this.extMesh);
    this.buildYard();
    this.buildLife();
  }

  // ---- the supply yard: meadow, river, docks, bushes, the F-250, payphone -----
  buildYard() {
    const m = new Merger();
    m.add(GEO.box, 0x8fae6a, 0, -0.14, 16.6, 24.7, 0.1, 9.6);                 // meadow
    for (let i = 0; i < 26; i++) m.add(GEO.cone, 0x7d9c5b, -11 + Math.random() * 22, 0.05, 12.5 + Math.random() * 8, 0.5, 0.3 + Math.random() * 0.35, 0.5);
    m.add(GEO.box, 0x5b8fa6, 0, -0.18, 22.6, 24.7, 0.08, 3.2);                // river
    m.add(GEO.box, 0x7d9c5b, 0, -0.1, 24.7, 24.7, 0.12, 1.4);                 // far bank
    for (const f of LAYOUT.fishSpots) {
      m.add(GEO.box, PAL.woodDark, f.x, 0.08, f.z + 0.9, 1.1, 0.12, 1.9);
      m.add(GEO.cyl, PAL.woodDark, f.x - 0.45, -0.12, f.z + 1.7, 0.14, 0.6, 0.14);
      m.add(GEO.cyl, PAL.woodDark, f.x + 0.45, -0.12, f.z + 1.7, 0.14, 0.6, 0.14);
    }
    for (const [px, pz, s] of [[-11, 13, 1.2], [-11.6, 15.8, 1.5], [-10.8, 19.5, 1.1], [11.2, 15, 1.3], [11.5, 19, 1.0]]) {
      m.add(GEO.cyl, PAL.woodDark, px, 0.5 * s, pz, 0.16 * s, s, 0.16 * s);
      m.add(GEO.cone, 0x5c7a52, px, 1.7 * s, pz, 1.3 * s, 2.2 * s, 1.3 * s);
    }
    const ph = LAYOUT.payphone;
    m.add(GEO.cyl, PAL.woodDark, ph.x, 0.8, ph.z, 0.1, 1.6, 0.1);
    m.add(GEO.box, PAL.teal, ph.x, 1.45, ph.z, 0.55, 0.8, 0.42);
    m.add(GEO.box, 0x2c2c30, ph.x, 1.45, ph.z + 0.22, 0.3, 0.45, 0.05);
    const T = LAYOUT.truck;
    m.add(GEO.box, 0x9a4a32, T.x, 0.72, T.z, 4.1, 0.5, 1.8);
    m.add(GEO.box, 0x9a4a32, T.x - 1.05, 1.28, T.z, 1.5, 0.62, 1.7);
    m.add(GEO.box, 0xbcd8e0, T.x - 1.05, 1.36, T.z, 1.28, 0.4, 1.5);
    m.add(GEO.box, 0x8a3f28, T.x + 0.95, 1.08, T.z - 0.85, 2.1, 0.55, 0.12);
    m.add(GEO.box, 0x8a3f28, T.x + 0.95, 1.08, T.z + 0.85, 2.1, 0.55, 0.12);
    m.add(GEO.box, 0x8a3f28, T.x + 1.98, 1.08, T.z, 0.12, 0.55, 1.75);
    for (const [wx, wz] of [[-1.3, -0.95], [-1.3, 0.95], [1.3, -0.95], [1.3, 0.95]])
      m.add(GEO.cyl, 0x2c2c30, T.x + wx, 0.42, T.z + wz, 0.44, 0.28, 0.44, Math.PI / 2, 0, 0);
    this.scene.add(m.build());
    this.river = mesh(new THREE.PlaneGeometry(24.7, 3.0), new THREE.MeshBasicMaterial({ color: 0x9fd0e0, transparent: true, opacity: 0.3, depthWrite: false }));
    this.river.rotation.x = -Math.PI / 2; this.river.position.set(0, -0.1, 22.55);
    this.scene.add(this.river);
    this.bushViews = LAYOUT.huckBushes.map(b => {
      const g = new THREE.Group();
      g.add(mesh(GEO.sph, M(0x4f7a4a), 0, 0.4, 0, 1.15, 0.85, 1.15));
      g.add(mesh(GEO.sph, M(0x5c8a56), 0.35, 0.6, 0.2, 0.7, 0.55, 0.7));
      const berries = [];
      for (let k = 0; k < 6; k++) { const be = mesh(GEO.sph, M(0x5a3a6a), (Math.random() - 0.5) * 0.9, 0.45 + Math.random() * 0.35, (Math.random() - 0.5) * 0.9, 0.14, 0.14, 0.14); berries.push(be); g.add(be); }
      g.position.set(b.x, 0, b.z);
      this.scene.add(g);
      return { g, berries };
    });
    this.crateFish = mesh(GEO.box, M(0x9fb6c4), T.x + 0.5, 1.15, T.z, 0.8, 0.5, 0.8); this.crateFish.visible = false;
    this.crateBerry = mesh(GEO.box, M(0x5a3a6a), T.x + 1.45, 1.15, T.z, 0.8, 0.5, 0.8); this.crateBerry.visible = false;
    this.scene.add(this.crateFish, this.crateBerry);
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x3a2c1c });
    this.bearG = null; this.bearD = null;
  }
  buildBear() {
    const g = new THREE.Group();
    const m = new Merger();
    m.add(GEO.box, 0x5f4632, 0, 0.85, 0, 1.25, 0.85, 0.75);
    m.add(GEO.sph, 0x5f4632, 0, 1.05, 0.55, 0.62, 0.55, 0.55);
    m.add(GEO.box, 0x4a3626, 0, 0.95, 0.88, 0.26, 0.2, 0.18);
    m.add(GEO.sph, 0x4a3626, -0.2, 1.38, 0.5, 0.16, 0.16, 0.1);
    m.add(GEO.sph, 0x4a3626, 0.2, 1.38, 0.5, 0.16, 0.16, 0.1);
    g.add(m.build());
    g.userData.legs = [];
    for (const [lx, lz] of [[-0.4, 0.25], [0.4, 0.25], [-0.4, -0.25], [0.4, -0.25]]) {
      const leg = mesh(GEO.box, M(0x4a3626), lx, 0.25, lz, 0.28, 0.5, 0.28);
      g.add(leg); g.userData.legs.push(leg);
    }
    g.add(blob(0.75));
    return g;
  }

  // ---- the life layer: fans, shafts, motes, door, clouds, birds, THE ELK ------
  buildLife() {
    // ceiling fans
    this.fans = [];
    for (const [fx, fz] of [[-4, 1.8], [4, 3.8]]) {
      const fan = new THREE.Group();
      fan.add(mesh(GEO.cyl, M(PAL.woodDark), 0, 0.35, 0, 0.07, 0.7, 0.07));
      const hub = new THREE.Group();
      hub.add(mesh(GEO.sph, M(PAL.woodDark), 0, 0, 0, 0.24, 0.14, 0.24));
      for (let i = 0; i < 4; i++) hub.add(mesh(GEO.box, M(PAL.wood), Math.sin(i * Math.PI / 2) * 0.62, 0, Math.cos(i * Math.PI / 2) * 0.62, 0.24, 0.03, 1.0, 0, i * Math.PI / 2, 0));
      fan.add(hub); fan.position.set(fx, 2.6, fz);
      fan.userData.hub = hub;
      this.scene.add(fan); this.fans.push(fan);
    }
    // golden shafts from the windows + dust motes
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0xffdf9e, transparent: true, opacity: 0.075, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (const wx of [-9, -4, 1]) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.4), shaftMat);
      sh.position.set(wx, 1.45, -5.45); sh.rotation.x = -1.12;
      this.scene.add(sh);
    }
    const mN = 60, mPos = new Float32Array(mN * 3);
    this.moteSeed = [];
    for (let i = 0; i < mN; i++) {
      mPos[i * 3] = -10 + Math.random() * 12; mPos[i * 3 + 1] = 0.4 + Math.random() * 1.9; mPos[i * 3 + 2] = -6 + Math.random() * 4.4;
      this.moteSeed.push(Math.random() * 6.28);
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    this.motes = new THREE.Points(mGeo, new THREE.PointsMaterial({ color: 0xffe9bb, size: 0.05, transparent: true, opacity: 0.65, depthWrite: false }));
    this.scene.add(this.motes);
    // screen door on a hinge
    const d = LAYOUT.door;
    this.door = new THREE.Group();
    const leaf = new THREE.Group();
    leaf.add(mesh(GEO.box, M(PAL.teal), d.gap - 0.05, 1.05, 0, d.gap * 2 - 0.16, 2.05, 0.07));
    leaf.add(mesh(GEO.box, M(PAL.cream, { t: 0.25 }), d.gap - 0.05, 1.05, 0.01, d.gap * 2 - 0.34, 1.85, 0.03));
    this.door.add(leaf);
    this.door.position.set(d.x - d.gap + 0.05, 0, C.ROOM_Z + 0.12);
    this.scene.add(this.door);
    this.doorT = 0;
    // clouds + a bird flight
    this.clouds = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Group();
      const puffs = 2 + (i % 2);
      for (let k = 0; k <= puffs; k++) c.add(mesh(GEO.sph, M(0xfff2dc), k * 1.6 - puffs * 0.8, 0, (Math.random() - 0.5), 2.6 - k * 0.4, 1.1, 1.6));
      c.position.set(-24 + i * 17, 8.2 + i * 1.1, -20 - i * 3);
      this.scene.add(c); this.clouds.push(c);
    }
    this.birds = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = mesh(GEO.tri, M(0x4a3a2c), i * 0.7 - 0.7, i === 1 ? 0.25 : 0, 0, 0.34, 0.34, 0.34);
      b.rotation.x = -Math.PI / 2;
      this.birds.add(b);
    }
    this.birds.visible = false; this.scene.add(this.birds);
    this.birdT = 24 + Math.random() * 40;
    // THE ELK — wanders past the north windows; antlers glide over the wall
    const elk = new THREE.Group();
    const eb = new Merger();
    eb.add(GEO.box, 0x7a5c40, 0, 1.18, 0, 1.55, 0.8, 0.6);                  // body
    eb.add(GEO.box, 0x6b4f36, 0.85, 1.55, 0, 0.35, 0.75, 0.4, 0, 0, -0.5); // neck
    eb.add(GEO.box, 0x7a5c40, 1.18, 1.95, 0, 0.42, 0.32, 0.3);             // head
    eb.add(GEO.box, 0x5c4530, 1.42, 1.88, 0, 0.22, 0.16, 0.2);             // snout
    eb.add(GEO.box, 0x5c4530, -0.82, 1.35, 0, 0.14, 0.3, 0.12, 0, 0, 0.5); // tail
    elk.add(eb.build());
    const antler = side => {
      const a = new THREE.Group();
      a.add(mesh(GEO.cyl, M(0xd8c6a8), 0, 0.3, 0, 0.05, 0.6, 0.05, 0));
      const t1 = mesh(GEO.cyl, M(0xd8c6a8), 0.12, 0.52, 0.08 * side, 0.04, 0.4, 0.04); t1.rotation.z = -0.7; a.add(t1);
      const t2 = mesh(GEO.cyl, M(0xd8c6a8), -0.1, 0.58, 0.04 * side, 0.04, 0.34, 0.04); t2.rotation.z = 0.6; a.add(t2);
      a.position.set(1.12, 2.08, 0.14 * side); a.rotation.x = side * 0.35;
      return a;
    };
    elk.add(antler(1), antler(-1));
    this.elkLegs = [];
    for (const [lx, lz] of [[0.55, 0.2], [0.55, -0.2], [-0.55, 0.2], [-0.55, -0.2]]) {
      const leg = mesh(GEO.box, M(0x5c4530), lx, 0.4, lz, 0.16, 0.8, 0.16);
      elk.add(leg); this.elkLegs.push(leg);
    }
    elk.visible = false;
    this.scene.add(elk);
    this.elk = { g: elk, state: 'off', t: 30 + Math.random() * 40, x: -17, pauseX: 0, pauseT: 0, head: null };
    // fire light
    this.fireLight = new THREE.PointLight(0xff7a30, 0, 10);
    this.fireLight.position.y = 1.4;
    this.scene.add(this.fireLight);
  }

  buildPools() {
    this.smokeMat = new THREE.MeshLambertMaterial({ color: 0x8d8d8d, transparent: true, opacity: 0.55, flatShading: true });
    this.foamMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, flatShading: true });
    this.steamMat = new THREE.MeshLambertMaterial({ color: 0xfff4e2, transparent: true, opacity: 0.34, flatShading: true });
    for (let i = 0; i < 14; i++) { const s = mesh(GEO.sph, this.smokeMat); s.visible = false; this.smoke.push({ m: s, t: 0 }); this.scene.add(s); }
    for (let i = 0; i < 22; i++) { const f = mesh(GEO.sph, this.foamMat); f.visible = false; this.foam.push({ m: f, t: 0, vx: 0, vy: 0, vz: 0 }); this.scene.add(f); }
    for (let i = 0; i < 16; i++) { const p = mesh(GEO.tri, M(PAL.creamDark)); p.visible = false; this.pop.push({ m: p, t: 0, vx: 0, vy: 0, vz: 0 }); this.scene.add(p); }
    this.steam = [];
    for (let i = 0; i < 16; i++) { const s = mesh(GEO.sph, this.steamMat); s.visible = false; this.steam.push({ m: s, t: 0, vx: 0, vy: 0, vz: 0 }); this.scene.add(s); }
    this.emotes = [];
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sp.scale.set(0.62, 0.62, 1); sp.visible = false; sp.renderOrder = 5;
      this.emotes.push({ m: sp, t: 0 }); this.scene.add(sp);
    }
    this.moneys = [];
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      sp.scale.set(1.15, 0.46, 1); sp.visible = false; sp.renderOrder = 5;
      this.moneys.push({ m: sp, t: 0 }); this.scene.add(sp);
    }
  }
  emote(ch, x, z) {
    const e = this.emotes.find(q => !q.m.visible) || this.emotes[0];
    e.m.material.map = emojiTexture(ch); e.m.material.opacity = 1; e.m.material.needsUpdate = true;
    e.m.position.set(x, 1.95, z); e.m.visible = true; e.t = 1.7;
  }
  moneyPop(txt, x, z) {
    const e = this.moneys.find(q => !q.m.visible) || this.moneys[0];
    if (e.m.material.map) e.m.material.map.dispose();
    e.m.material.map = moneyTexture(txt); e.m.material.opacity = 1; e.m.material.needsUpdate = true;
    e.m.position.set(x, 1.5, z); e.m.visible = true; e.t = 1.5;
  }
  puff(pool, x, y, z, opts = {}) {
    const e = pool.find(q => !q.m.visible) || pool[0];
    e.m.visible = true; e.m.position.set(x, y, z);
    const s = opts.s || 0.3; e.m.scale.setScalar(s);
    e.t = opts.life || 1.2;
    e.vx = (Math.random() - 0.5) * (opts.v || 0.6); e.vy = opts.vy ?? 1.0; e.vz = (Math.random() - 0.5) * (opts.v || 0.6);
    return e;
  }

  // ---- characters --------------------------------------------------------------
  buildCook(color, name) {
    const g = new THREE.Group();
    if (name) g.add(nameSprite(name));
    const m = new Merger();
    m.add(GEO.caps, PAL.white, 0, 0.52, 0, 0.62, 0.62, 0.62);                 // body whites
    m.add(GEO.box, PAL.aprons[color % 4], 0, 0.46, 0.18, 0.5, 0.55, 0.22);    // apron
    m.add(GEO.box, PAL.aprons[color % 4], 0, 0.86, 0.13, 0.2, 0.3, 0.1);      // bib
    const body = m.build(); g.add(body);
    const head = new THREE.Group();
    head.add(mesh(GEO.sph, M(PAL.skin[color % 4]), 0, 0, 0, 0.62, 0.56, 0.6));
    head.add(mesh(GEO.cyl, M(PAL.white), 0, 0.22, 0, 0.5, 0.22, 0.5));
    head.add(mesh(GEO.box, M(PAL.white), 0, 0.16, 0.24, 0.46, 0.1, 0.2));
    head.position.y = 1.06; g.add(head);
    const armL = this.arm(PAL.white), armR = this.arm(PAL.white);
    armL.position.set(-0.36, 0.82, 0); armR.position.set(0.36, 0.82, 0);
    g.add(armL, armR);
    const legL = new THREE.Group(), legR = new THREE.Group();
    legL.add(mesh(GEO.box, M(0x4a5a6a), 0, -0.14, 0, 0.15, 0.3, 0.16));
    legR.add(mesh(GEO.box, M(0x4a5a6a), 0, -0.14, 0, 0.15, 0.3, 0.16));
    legL.position.set(-0.15, 0.3, 0); legR.position.set(0.15, 0.3, 0);
    g.add(legL, legR);
    const carry = new THREE.Group(); carry.position.set(0, 0.78, 0.5); g.add(carry);
    g.add(blob(0.42));
    g.userData = { head, armL, armR, legL, legR, carry, ph: Math.random() * 6.28 };
    return g;
  }
  arm(color) { const a = new THREE.Group(); a.add(mesh(GEO.box, M(color), 0, -0.16, 0, 0.13, 0.34, 0.13)); return a; }
  buildCustomer(ty, id) {
    const g = new THREE.Group();
    let bodyC = PAL.gray, skin = PAL.skin[id % 4], headExtra = null, scale = 1;
    if (ty === 'flock') bodyC = PAL.flock[id % 3];
    if (ty === 'zillow') bodyC = PAL.zillow[id % 2];
    if (ty === 'dale') { bodyC = PAL.denim; }
    if (ty === 'camper') bodyC = id % 2 ? PAL.flannel : 0x4f7a4a;
    if (ty === 'squatter') { bodyC = PAL.gray; scale = 1.08; }
    if (ty === 'kale') bodyC = 0x9caf88;
    if (ty === 'sequoia') bodyC = 0xc47a5a;
    if (ty === 'larper') bodyC = 0x7a4a8a;
    const m = new Merger();
    m.add(GEO.caps, bodyC, 0, 0.5, 0, 0.6 * scale, 0.6 * scale, 0.6 * scale);
    const body = m.build(); g.add(body);
    const head = new THREE.Group();
    head.add(mesh(GEO.sph, M(skin), 0, 0, 0, 0.56, 0.52, 0.54));
    if (ty === 'flock') { head.add(mesh(GEO.box, M(0x22222a), 0, 0.03, 0.22, 0.42, 0.1, 0.12)); head.add(mesh(GEO.sph, M(0xe8d29a), 0, 0.24, 0, 0.5, 0.28, 0.46)); }
    if (ty === 'squatter') { head.add(mesh(GEO.box, M(PAL.gray), 0, 0.14, -0.05, 0.6, 0.4, 0.55)); head.add(mesh(GEO.box, M(PAL.white), -0.24, -0.02, 0.14, 0.06, 0.12, 0.06)); head.add(mesh(GEO.box, M(PAL.white), 0.24, -0.02, 0.14, 0.06, 0.12, 0.06)); }
    if (ty === 'dale') { head.add(mesh(GEO.cyl, M(PAL.hatBrown), 0, 0.26, 0, 0.44, 0.24, 0.44)); head.add(mesh(GEO.cyl, M(PAL.hatBrown), 0, 0.16, 0, 0.78, 0.05, 0.78)); head.add(mesh(GEO.box, M(0xd8d2c8), 0, -0.08, 0.24, 0.3, 0.1, 0.08)); }
    if (ty === 'zillow' && id % 2 === 0) headExtra = 'point';
    if (ty === 'camper') head.add(mesh(GEO.cyl, M(0xc44536), 0, 0.24, 0, 0.5, 0.22, 0.5));
    if (ty === 'kale') { head.add(mesh(GEO.sph, M(0x4a3a2c), 0, 0.28, -0.12, 0.24, 0.2, 0.24)); head.add(mesh(GEO.cyl, M(0xc9a227), -0.13, 0.02, 0.24, 0.11, 0.02, 0.11, Math.PI / 2, 0, 0)); head.add(mesh(GEO.cyl, M(0xc9a227), 0.13, 0.02, 0.24, 0.11, 0.02, 0.11, Math.PI / 2, 0, 0)); }
    let hat = null;
    if (ty === 'larper') {
      hat = new THREE.Group();
      hat.add(mesh(GEO.cyl, M(0xd8bc8a), 0, 0.1, 0, 0.95, 0.06, 0.95));
      hat.add(mesh(GEO.cyl, M(0xd8bc8a), 0, 0.26, 0, 0.5, 0.3, 0.5));
      hat.add(mesh(GEO.box, M(PAL.white), 0.5, 0.02, 0.2, 0.12, 0.16, 0.02)); // the $200 price tag
      hat.position.y = 0.2; head.add(hat);
      head.add(mesh(GEO.box, M(0xc44536), 0, -0.24, 0.1, 0.4, 0.14, 0.3)); // bandana
    }
    head.position.y = 1.0; g.add(head);
    const armL = this.arm(bodyC), armR = this.arm(bodyC);
    armL.position.set(-0.34, 0.78, 0); armR.position.set(0.34, 0.78, 0);
    if (headExtra === 'point') armR.rotation.x = -1.35;
    if (ty === 'squatter') { const lap = mesh(GEO.box, M(0xd0d4d8), 0, 0.62, 0.34, 0.42, 0.05, 0.3); const scr = mesh(GEO.box, M(0x3a4a5a, { e: 0.5 }), 0, 0.75, 0.46, 0.42, 0.26, 0.03); scr.rotation.x = -0.5; g.add(lap, scr); }
    if (ty === 'flock') { const ph = mesh(GEO.box, M(0x22222a), 0.4, 0.85, 0.2, 0.08, 0.22, 0.05); ph.rotation.z = -0.3; g.add(ph); }
    if (ty === 'sequoia') {
      g.add(mesh(GEO.box, M(0xf2ece2), 0, 0.52, 0.16, 0.52, 0.5, 0.16)); // the white puffer vest
      armR.rotation.x = -2.5; // phone always up, always filming
      const cam = mesh(GEO.box, M(0x22222a), 0, -0.34, 0.06, 0.1, 0.2, 0.04);
      const scr = mesh(GEO.box, M(0xbfe8ff, { e: 0.7 }), 0, -0.34, 0.045, 0.08, 0.16, 0.01);
      armR.add(cam, scr);
    }
    g.add(armL, armR, blob(0.4));
    g.userData = { head, armL, armR, hat, ph: Math.random() * 6.28, ty };
    return g;
  }

  // ---- items ---------------------------------------------------------------------
  buildItem(it) {
    const g = new THREE.Group();
    const kind = it.k, d = it.d;
    if (kind === 'plate') g.add(mesh(GEO.cyl, M(PAL.white), 0, 0.03, 0, 0.56, 0.07, 0.56));
    else if (kind === 'dirty') { g.add(mesh(GEO.cyl, M(PAL.white), 0, 0.03, 0, 0.56, 0.07, 0.56)); g.add(mesh(GEO.sph, M(0x8a6844), 0.08, 0.08, 0.04, 0.2, 0.1, 0.2)); g.add(mesh(GEO.sph, M(0xa2543c), -0.1, 0.08, -0.06, 0.14, 0.08, 0.14)); }
    else if (kind === 'mug') { g.add(mesh(GEO.cyl, M(PAL.white), 0, 0.09, 0, 0.26, 0.2, 0.26)); g.add(mesh(GEO.box, M(PAL.white), 0.17, 0.09, 0, 0.08, 0.12, 0.05)); g.add(mesh(GEO.cyl, M(d === 'matcha' ? PAL.matcha : PAL.coffee), 0, 0.17, 0, 0.2, 0.03, 0.2)); }
    else if (kind === 'dish') {
      g.add(mesh(GEO.cyl, M(PAL.white), 0, 0.03, 0, 0.6, 0.07, 0.6));
      if (d === 'flapjacks') { for (let i = 0; i < 3; i++) g.add(mesh(GEO.cyl, M(it.s ? 0x9a7a4a : 0xe0a54e), (Math.random() - 0.5) * 0.06, 0.1 + i * 0.07, 0, 0.42 - i * 0.03, 0.07, 0.42 - i * 0.03)); g.add(mesh(GEO.box, M(0xf5e04a), 0, 0.34, 0, 0.1, 0.06, 0.1)); g.add(mesh(GEO.sph, M(0x5a3a6a), 0.14, 0.3, 0.08, 0.08, 0.08, 0.08)); }
      if (d === 'burger') { g.add(mesh(GEO.cyl, M(0xd8a05a), 0, 0.09, 0, 0.36, 0.08, 0.36)); g.add(mesh(GEO.cyl, M(0x6b3a2a), 0, 0.16, 0, 0.4, 0.07, 0.4)); g.add(mesh(GEO.cyl, M(0x7fae3a), 0, 0.21, 0, 0.42, 0.03, 0.42)); g.add(mesh(GEO.sph, M(0xd8a05a), 0, 0.3, 0, 0.4, 0.22, 0.4)); }
      if (d === 'trout') { g.add(mesh(GEO.sph, M(PAL.troutC), 0, 0.1, 0, 0.6, 0.12, 0.22)); g.add(mesh(GEO.tri, M(PAL.troutC), 0.34, 0.1, 0, 0.24, 0.24, 0.24, 0)); g.add(mesh(GEO.cyl, M(0xf5e04a), -0.28, 0.08, 0.12, 0.1, 0.04, 0.1)); }
      if (it.m === 2 && d === 'flapjacks') for (let i = 0; i < 3; i++) g.add(mesh(GEO.sph, M(0x5a3a6a), (i - 1) * 0.12, 0.37, 0.06 - i * 0.05, 0.07, 0.07, 0.07));
      if (it.m === 1 && d === 'trout') g.add(mesh(GEO.sph, M(0xf0c84a), -0.05, 0.18, -0.12, 0.1, 0.07, 0.1));
    }
    else if (kind === 'raw') {
      if (d === 'batter') { g.add(mesh(GEO.cyl, M(PAL.steel), 0, 0.08, 0, 0.34, 0.16, 0.34)); g.add(mesh(GEO.cyl, M(PAL.batter), 0, 0.15, 0, 0.28, 0.04, 0.28)); }
      else if (d === 'patty') g.add(mesh(GEO.cyl, M(0xc4766a), 0, 0.05, 0, 0.34, 0.1, 0.34));
      else { g.add(mesh(GEO.sph, M(PAL.troutC), 0, 0.08, 0, 0.56, 0.14, 0.2)); g.add(mesh(GEO.tri, M(PAL.troutC), 0.32, 0.08, 0, 0.2, 0.2, 0.2)); }
    }
    else if (kind === 'burnt') g.add(mesh(GEO.sph, M(0x2c2620), 0, 0.09, 0, 0.4, 0.24, 0.4));
    else if (kind === 'fish') { g.add(mesh(GEO.sph, M(0x9fb6c4), 0, 0.09, 0, 0.62, 0.16, 0.22)); g.add(mesh(GEO.tri, M(0x8aa2b0), 0.36, 0.09, 0, 0.22, 0.22, 0.22)); g.add(mesh(GEO.sph, M(0x22222a), -0.2, 0.13, 0.09, 0.04, 0.04, 0.04)); }
    else if (kind === 'huck') { g.add(mesh(GEO.cyl, M(0x8a97a0), 0, 0.12, 0, 0.3, 0.24, 0.3)); g.add(mesh(GEO.sph, M(0x5a3a6a), 0, 0.26, 0, 0.24, 0.12, 0.24)); g.add(mesh(GEO.box, M(0x6b7780), 0, 0.3, 0, 0.36, 0.04, 0.05)); }
    else if (kind === 'ext') { g.add(mesh(GEO.caps, M(0xc42a1a), 0, 0.2, 0, 0.3, 0.3, 0.3)); g.add(mesh(GEO.cyl, M(0x2c2c30), 0.1, 0.44, 0, 0.06, 0.18, 0.06)); }
    else if (kind === 'shard') { const s = mesh(GEO.tri, M(PAL.creamDark), 0, 0.02, 0); s.rotation.x = -Math.PI / 2; s.scale.setScalar(0.3 + Math.random() * 0.3); g.add(s); }
    else if (kind === 'laptop') { g.add(mesh(GEO.box, M(0xd0d4d8), 0, 0.03, 0, 0.5, 0.05, 0.36)); const scr = mesh(GEO.box, M(0x3a4a5a), 0, 0.16, -0.16, 0.5, 0.3, 0.04); scr.rotation.x = 0.6; g.add(scr); }
    if (kind !== 'shard') g.add(blob(kind === 'plate' || kind === 'dish' ? 0.3 : 0.22));
    return g;
  }
  itemKey(it) { return it.k + '|' + (it.d || 0) + '|' + (it.s || 0) + '|' + (it.m || 0); }

  // ---- snapshot application ---------------------------------------------------
  applySnap(snap, you) {
    this.snap = snap; this.you = you;
    this.simPh = snap.ph; this.simT = snap.t || 0;
    const seen = new Set();
    for (const p of snap.pl) {
      seen.add(p.i);
      let v = this.pl.get(p.i);
      if (!v || v.color !== p.c || v.name !== p.n) { if (v) this.scene.remove(v.g); v = { g: this.buildCook(p.c, p.n), color: p.c, name: p.n, tx: p.x, tz: p.z, carryKey: null }; this.scene.add(v.g); this.pl.set(p.i, v); v.g.position.set(p.x, 0, p.z); }
      v.d = p; v.tx = p.x; v.tz = p.z;
      const ck = p.h ? this.itemKey(p.h) : (p.dc ? 'CU' : null);
      if (ck !== v.carryKey) {
        v.carryKey = ck;
        const slot = v.g.userData.carry;
        while (slot.children.length) slot.remove(slot.children[0]);
        if (p.h) slot.add(this.buildItem(p.h));
      }
      v.g.visible = !p.off;
    }
    for (const [k, v] of this.pl) if (!seen.has(k)) { const u = v.g.userData; if (u.line) this.scene.remove(u.line, u.bobber); this.scene.remove(v.g); this.pl.delete(k); }
    const seenCu = new Set();
    const daleServed = !snap.tk.some(t => t.dale);
    for (const c of snap.cu) {
      seenCu.add(c.i);
      let v = this.cu.get(c.i);
      if (!v) { v = { g: this.buildCustomer(c.ty, c.i), ty: c.ty, emoteT: 2 + Math.random() * 6 }; this.scene.add(v.g); this.cu.set(c.i, v); v.g.position.set(c.x, 0, c.z); }
      v.d = c;
      // food appears in front of eaters; Dale keeps a mug on the counter once served
      if (c.st === 'eat' && !v.food) {
        const f = new THREE.Group();
        f.add(mesh(GEO.cyl, M(PAL.white), 0, 0.02, 0, 0.44, 0.05, 0.44));
        f.add(mesh(GEO.sph, M([0xe0a54e, 0x6b3a2a, PAL.troutC][c.i % 3]), 0, 0.09, 0, 0.3, 0.12, 0.3));
        f.position.set(c.x + Math.sin(c.yw) * 0.5, 0.78, c.z + Math.cos(c.yw) * 0.5);
        this.scene.add(f); v.food = f;
      } else if (c.st !== 'eat' && v.food) { this.scene.remove(v.food); v.food = null; }
      if (c.ty === 'dale') {
        if (daleServed && !v.mug) {
          const mg = this.buildItem({ k: 'mug', d: 'coffee' });
          mg.position.set(c.x, 1.01, c.z - 0.5);
          this.scene.add(mg); v.mug = mg;
        } else if (!daleServed && v.mug) { this.scene.remove(v.mug); v.mug = null; }
      }
    }
    for (const [k, v] of this.cu) if (!seenCu.has(k)) { if (v.food) this.scene.remove(v.food); if (v.mug) this.scene.remove(v.mug); this.scene.remove(v.g); this.cu.delete(k); }
    const seenIt = new Set();
    for (const it of snap.it) {
      seenIt.add(it.i);
      let v = this.it.get(it.i);
      const key = this.itemKey(it);
      if (!v || v.key !== key) { if (v) this.scene.remove(v.g); v = { g: this.buildItem(it), key }; this.scene.add(v.g); this.it.set(it.i, v); v.g.position.set(it.x, it.y, it.z); }
      v.d = it;
    }
    for (const [k, v] of this.it) if (!seenIt.has(k)) { this.scene.remove(v.g); this.it.delete(k); }
    // fires
    const seenF = new Set();
    for (const f of snap.fi) {
      const k = f.x + ':' + f.z; seenF.add(k);
      if (!this.fi.has(k)) {
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) g.add(mesh(GEO.cone, M(PAL.fire[i], { e: 0.9 }), (Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3, 0.4 - i * 0.09, 0.7 - i * 0.12, 0.4 - i * 0.09));
        const gl = mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: PAL.hazard, transparent: true, opacity: 0.4, depthWrite: false }));
        gl.rotation.x = -Math.PI / 2; gl.position.y = 0.03; gl.scale.setScalar(1.6); gl.renderOrder = 2;
        g.add(gl);
        g.position.set(f.x, f.z < -5 ? 1.06 : (Math.abs(f.z + 2.6) < 0.5 ? 1.0 : 0), f.z);
        this.scene.add(g); this.fi.set(k, { g });
      }
      this.fi.get(k).hp = f.hp;
    }
    for (const [k, v] of this.fi) if (!seenF.has(k)) { this.scene.remove(v.g); this.fi.delete(k); }
    // supply yard dynamics
    if (this.bushViews && snap.bu) for (let i = 0; i < this.bushViews.length; i++) {
      const picks = snap.bu.length ? (snap.bu[i] ?? 0) : 3;
      const bv = this.bushViews[i];
      for (let k = 0; k < bv.berries.length; k++) bv.berries[k].visible = k < picks * 2;
    }
    if (snap.be) {
      if (!this.bearG) { this.bearG = this.buildBear(); this.bearG.position.set(snap.be.x, 0, snap.be.z); this.scene.add(this.bearG); }
      this.bearG.visible = true; this.bearD = snap.be;
    } else if (this.bearG) { this.bearG.visible = false; this.bearD = null; }
    if (snap.sk2) {
      this.crateFish.visible = snap.sk2.t > 0; this.crateFish.scale.y = 0.2 + 0.8 * (snap.sk2.t / 8);
      this.crateBerry.visible = snap.sk2.h > 0; this.crateBerry.scale.y = 0.2 + 0.8 * (snap.sk2.h / 8);
    }
    // Hazel's wish list — every purchase physically appears in the diner
    if (!this.upViews) {
      const uv = this.upViews = {};
      uv.bell = new THREE.Group();
      uv.bell.add(mesh(GEO.cyl, M(0x2c2c30), 0, 0, 0, 0.3, 0.04, 0.3));
      uv.bell.add(mesh(GEO.sph, M(0xd8a838), 0, 0.1, 0, 0.3, 0.24, 0.3));
      uv.bell.add(mesh(GEO.cyl, M(0x8a6a20), 0, 0.24, 0, 0.05, 0.12, 0.05));
      uv.bell.position.set(0.6, 1.02, -2.6);
      uv.flattop = mesh(GEO.box, M(0xc9cfd6), -8, 1.075, -6.35, 2.4, 0.035, 0.92);
      uv.pan2 = new THREE.Group();
      uv.pan2.add(mesh(GEO.cyl, M(0x2c2c30), 0, 0, 0, 0.8, 0.08, 0.8));
      uv.pan2.add(mesh(GEO.cyl, M(0x3a3a40), 0, 0.06, 0, 0.66, 0.08, 0.66));
      uv.pan2.add(mesh(GEO.box, M(0x3a3a40), 0.56, 0.06, 0, 0.42, 0.05, 0.11));
      uv.pan2.position.set(-4.82, 1.04, -6.1);
      uv.espresso = new THREE.Group();
      uv.espresso.add(mesh(GEO.box, M(0xb8bfc6), 0, 0.3, 0, 0.6, 0.6, 0.45));
      uv.espresso.add(mesh(GEO.box, M(0x8a2f22), 0, 0.62, 0, 0.62, 0.08, 0.47));
      uv.espresso.add(mesh(GEO.cyl, M(0x2c2c30), -0.12, 0.12, 0.26, 0.06, 0.1, 0.06));
      uv.espresso.add(mesh(GEO.box, M(0x2c2c30), 0.18, 0.2, 0.24, 0.06, 0.18, 0.06, 0.4));
      uv.espresso.position.set(-3.35, 1.12, -6.3);
      uv.walkin = new THREE.Group();
      uv.walkin.add(mesh(GEO.box, M(0xa9b0b8), 0, 0, 0, 1.35, 1.95, 0.14));
      uv.walkin.add(mesh(GEO.box, M(0x878e96), 0, 0, 0.02, 1.1, 1.7, 0.13));
      uv.walkin.add(mesh(GEO.box, M(0x3a3a40), 0.42, 0.1, 0.1, 0.09, 0.5, 0.07));
      uv.walkin.position.set(2.35, 1.05, -6.92);
      uv.dishpit = new THREE.Group();
      uv.dishpit.add(mesh(GEO.box, M(0x7d848b), 0, 0, 0, 0.75, 0.16, 0.7));
      uv.dishpit.add(mesh(GEO.cyl, M(PAL.steelDark), 0, 0.4, -0.28, 0.07, 0.6, 0.07));
      for (let i = 0; i < 3; i++) uv.dishpit.add(mesh(GEO.box, M(PAL.steel), -0.25 + i * 0.25, 0.28, 0.15, 0.05, 0.4, 0.05, -0.35));
      uv.dishpit.position.set(2.45, 1.03, -6.25);
      for (const k of Object.keys(uv)) { uv[k].visible = false; this.scene.add(uv[k]); }
    }
    const ug = snap.ug || [];
    for (const k of Object.keys(this.upViews)) this.upViews[k].visible = ug.includes(k);
    // station food
    const slotDefs = [
      ...LAYOUT.griddle.slots.map((sp, i) => ({ id: 'g' + i, sp, s: snap.st.gr[i] })),
      ...LAYOUT.pan.slots.map((sp, i) => ({ id: 'p' + i, sp, s: snap.st.pn[i] })),
    ];
    let anyCookG = false, anyCookP = false;
    for (const sd of slotDefs) {
      const cur = this.slotFood.get(sd.id);
      if (sd.s) {
        if (sd.id[0] === 'g') anyCookG = true; else anyCookP = true;
        const key = sd.s.g + '|' + sd.s.s;
        if (!cur || cur.key !== key) {
          if (cur) this.scene.remove(cur.g);
          const g = new THREE.Group();
          const col = sd.s.s === 'burnt' ? 0x2c2620 : sd.s.g === 'batter' ? 0xe8c05e : sd.s.g === 'patty' ? 0x8a4634 : PAL.troutC;
          g.add(mesh(GEO.cyl, M(col), 0, 0, 0, 0.44, 0.1, 0.44));
          g.position.set(sd.sp.x, 1.12, sd.sp.z);
          this.scene.add(g); this.slotFood.set(sd.id, { g, key });
        }
        const v = this.slotFood.get(sd.id);
        v.state = sd.s.s;
      } else if (cur) { this.scene.remove(cur.g); this.slotFood.delete(sd.id); }
    }
    this.glowGriddle.visible = anyCookG; this.glowPan.visible = anyCookP;
    // plate stacks, sign, extinguisher hook
    const sh = snap.st.sk.sh;
    this.plateStack.visible = sh > 0; this.plateStack.scale.y = 0.1 + 0.4 * (sh / 12);
    this.plateStack.position.y = 1.33 + 0.2 * (sh / 12);
    const dd = snap.st.sk.d;
    this.dirtyStack.visible = dd > 0; this.dirtyStack.scale.y = 0.08 + 0.1 * dd;
    if (this._ph && this._ph !== snap.ph && snap.ph === 'count') this.signFlipT = 0.7;
    this._ph = snap.ph;
    this.signPlate.material = M(snap.ph === 'lobby' || snap.ph === 'over' ? 0xc44536 : 0x5c9e4f);
    const extSomewhere = snap.it.some(i => i.k === 'ext') || snap.pl.some(p => p.h && p.h.k === 'ext');
    this.extMesh.visible = !extSomewhere;
  }

  onEvent(e) {
    if (e.k === 'break') { for (let i = 0; i < 5; i++) { const p = this.puff(this.pop, e.x, 0.4, e.z, { life: 0.7, v: 3, vy: 2.4, s: 0.5 }); p.m.rotation.set(Math.random() * 3, Math.random() * 3, 0); } this.shake(0.14); }
    if (e.k === 'thud') { for (let i = 0; i < 4; i++) this.puff(this.smoke, e.x, 0.2, e.z, { life: 0.6, v: 1.6, vy: 0.8, s: 0.35 }); this.shake(0.26); }
    if (e.k === 'douse') for (let i = 0; i < 5; i++) this.puff(this.smoke, e.x, 0.8, e.z, { life: 1.0, v: 1, vy: 1.6, s: 0.4 });
    if (e.k === 'ignite') this.shake(0.3);
    if (e.k === 'yeet') this.shake(0.1);
    if (e.k === 'chime') this.doorT = 1.15;
    if (e.k === 'cha') this.moneyPop('+$' + e.a, e.x, e.z);
    if (e.k === 'order') { const pos = e.tb != null ? LAYOUT.tables[e.tb] : (e.st != null ? LAYOUT.stools[e.st] : null); if (pos) this.emote('📝', pos.x, pos.z); }
    if (e.k === 'pour') this.puff(this.steam, e.x, 1.6, e.z, { life: 1.0, v: 0.2, vy: 0.7, s: 0.12 });
  }
  updateElk(dt) {
    const e = this.elk;
    if (e.state === 'off') {
      e.t -= dt;
      if (e.t <= 0) { e.state = 'walk'; e.x = -17; e.pauseX = -9 + Math.random() * 10; e.g.visible = true; e.g.position.set(e.x, 0, -8.55); e.g.rotation.y = 0; }
      return;
    }
    if (e.state === 'walk') {
      e.x += dt * 0.85; e.g.position.x = e.x;
      e.g.rotation.y += (0 - e.g.rotation.y) * Math.min(1, dt * 2.5);
      const ph = e.x * 4;
      this.elkLegs[0].rotation.z = Math.sin(ph) * 0.35; this.elkLegs[3].rotation.z = Math.sin(ph) * 0.35;
      this.elkLegs[1].rotation.z = -Math.sin(ph) * 0.35; this.elkLegs[2].rotation.z = -Math.sin(ph) * 0.35;
      e.g.position.y = Math.abs(Math.sin(ph * 0.5)) * 0.04;
      if (e.pauseX != null && e.x >= e.pauseX) { e.state = 'look'; e.pauseT = 2.5 + Math.random() * 1.5; e.pauseX = null; }
      if (e.x > 17) { e.state = 'off'; e.g.visible = false; e.t = 90 + Math.random() * 70; }
    } else if (e.state === 'look') {
      e.pauseT -= dt;
      for (const l of this.elkLegs) l.rotation.z *= 0.85;
      e.g.rotation.y += (1.15 - e.g.rotation.y) * Math.min(1, dt * 3); // turns to peer into the diner
      if (e.pauseT <= 0) e.state = 'walk';
    }
  }
  shake(a) { this.shakeA = Math.max(this.shakeA || 0, a); this.shakeT = 0.45; }

  setHighlight(x, z, on) { this.highlight.visible = on; if (on) this.highlight.position.set(x, 0.05, z); }
  toScreen(x, y, z, out) {
    this._pv = this._pv || new THREE.Vector3();
    this._pv.set(x, y, z).project(this.camera);
    out.sx = (this._pv.x * 0.5 + 0.5) * innerWidth;
    out.sy = (-this._pv.y * 0.5 + 0.5) * innerHeight;
    out.vis = this._pv.z < 1 && this._pv.x > -1.1 && this._pv.x < 1.1 && this._pv.y > -1.1 && this._pv.y < 1.1;
    return out;
  }

  // ---- frame --------------------------------------------------------------------
  render(dt, myPred) {
    const t = performance.now() / 1000;
    const lerpK = 1 - Math.exp(-13 * dt);
    for (const [seat, v] of this.pl) {
      const g = v.g, d = v.d; if (!d) continue;
      let tx = v.tx, tz = v.tz, fx = d.fx, fz = d.fz;
      if (seat === this.you && myPred) { tx = myPred.x; tz = myPred.z; fx = myPred.fx; fz = myPred.fz; }
      g.position.x += (tx - g.position.x) * (seat === this.you ? 1 : lerpK);
      g.position.z += (tz - g.position.z) * (seat === this.you ? 1 : lerpK);
      const targetYaw = Math.atan2(fx, fz);
      g.rotation.y += shortest(g.rotation.y, targetYaw) * lerpK;
      const u = g.userData;
      const moving = d.mv || (seat === this.you && myPred && myPred.mv);
      u.ph += dt * (moving ? 11 : 2.2);
      g.position.y = moving ? Math.abs(Math.sin(u.ph)) * 0.06 : 0;
      const carrying = !!d.h || !!d.dc;
      const armT = carrying ? -1.5 : d.sp ? -1.1 : moving ? Math.sin(u.ph) * 0.7 : 0.08;
      const armT2 = carrying ? -1.5 : d.sp ? -1.1 : moving ? -Math.sin(u.ph) * 0.7 : -0.08;
      u.armL.rotation.x += (armT - u.armL.rotation.x) * lerpK * 1.6;
      u.armR.rotation.x += (armT2 - u.armR.rotation.x) * lerpK * 1.6;
      u.head.rotation.z = Math.sin(u.ph * 0.5) * 0.05;
      const legT = moving ? Math.sin(u.ph) * 0.85 : 0;
      u.legL.rotation.x += (legT - u.legL.rotation.x) * lerpK * 1.8;
      u.legR.rotation.x += (-legT - u.legR.rotation.x) * lerpK * 1.8;
      const leanT = d.b ? -0.12 : moving ? -0.08 : 0;
      g.rotation.x += (leanT - g.rotation.x) * lerpK;
      if (!u.cone) {
        u.cone = mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0.72, 1.25, 0.55, 1.7, 0.55);
        u.cone.rotation.x = Math.PI / 2; u.cone.visible = false; g.add(u.cone);
      }
      u.cone.visible = !!d.sp;
      // fishing rod + line + bobber
      const fs = d.fs || 0;
      if (fs > 0) {
        if (!u.rod) {
          u.rod = new THREE.Group();
          const stick = mesh(GEO.cyl, M(0x7a5a3a), 0, 0, 0, 0.05, 1.6, 0.05);
          stick.rotation.x = 1.05; stick.position.set(0.3, 1.0, 0.45);
          u.rod.add(stick);
          g.add(u.rod);
          u.lineGeo = new THREE.BufferGeometry();
          u.lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
          u.line = new THREE.Line(u.lineGeo, this.lineMat);
          u.bobber = mesh(GEO.sph, M(0xd94f38), 0, 0, 0, 0.17, 0.17, 0.17);
          this.scene.add(u.line, u.bobber);
        }
        u.rod.visible = true; u.line.visible = true; u.bobber.visible = true;
        let bs = LAYOUT.fishSpots[0], bd2 = 1e9;
        for (const f2 of LAYOUT.fishSpots) { const dd = (f2.x - g.position.x) ** 2 + (f2.z - g.position.z) ** 2; if (dd < bd2) { bd2 = dd; bs = f2; } }
        const dip = fs === 2 ? Math.sin(t * 18) * 0.14 - 0.05 : Math.sin(t * 2) * 0.02;
        u.bobber.position.set(bs.x + 0.3, 0.04 + dip, bs.z + 1.9);
        const fx2 = Math.sin(g.rotation.y), fz2 = Math.cos(g.rotation.y);
        const arr = u.lineGeo.attributes.position.array;
        arr[0] = g.position.x + fx2 * 1.1; arr[1] = 1.66; arr[2] = g.position.z + fz2 * 1.1;
        arr[3] = u.bobber.position.x; arr[4] = u.bobber.position.y; arr[5] = u.bobber.position.z;
        u.lineGeo.attributes.position.needsUpdate = true;
        u.lineGeo.computeBoundingSphere();
      } else if (u.rod) { u.rod.visible = false; u.line.visible = false; u.bobber.visible = false; }
      if (d.sp && Math.random() < 0.5) {
        const px = g.position.x + fx * 0.8, pz = g.position.z + fz * 0.8;
        const f = this.puff(this.foam, px, 0.7, pz, { life: 0.5, v: 0.8, vy: 0.4, s: 0.16 + Math.random() * 0.12 });
        f.vx += fx * 4; f.vz += fz * 4;
      }
    }
    for (const [, v] of this.cu) {
      const g = v.g, d = v.d; if (!d) continue;
      g.position.x += (d.x - g.position.x) * lerpK;
      g.position.z += (d.z - g.position.z) * lerpK;
      const u = g.userData;
      if (d.st === 'drag') { g.rotation.z += (1.35 - g.rotation.z) * lerpK; g.position.y = 0.5; u.armL.rotation.x = Math.sin(t * 14) * 1.2; u.armR.rotation.x = -Math.sin(t * 14) * 1.2; }
      else if (d.st === 'air') { g.rotation.z += dt * 9; g.position.y = d.y; }
      else {
        g.rotation.z *= 0.85; g.position.y += ((['sit', 'wait', 'eat', 'squat', 'sitT'].includes(d.st) ? 0.22 : 0) - g.position.y) * lerpK;
        g.rotation.y += shortest(g.rotation.y, d.yw) * lerpK;
        u.ph += dt * (d.st === 'enter' || d.st === 'leave' || d.st === 'wander' || d.st === 'reseat' ? 9 : 1.6);
        const walking = ['enter', 'leave', 'wander', 'reseat'].includes(d.st);
        if (walking) { g.position.y += Math.abs(Math.sin(u.ph)) * 0.05; u.armL.rotation.x = Math.sin(u.ph) * 0.5; if (u.ty !== 'sequoia') u.armR.rotation.x = -Math.sin(u.ph) * 0.5; }
        if (d.st === 'eat') u.head.rotation.x = Math.sin(t * 6) * 0.15;
      }
      if (u.hat) u.hat.rotation.z += ((d.yh ? 0.45 : 0) - u.hat.rotation.z) * lerpK; // the yee-haw tips the hat
      v.emoteT -= dt;
      if (v.emoteT <= 0) {
        v.emoteT = 6 + Math.random() * 8;
        const ch = d.st === 'sit' ? '🤔' : d.st === 'eat' ? '😋' : d.st === 'squat' ? '💻'
          : d.st === 'wander' ? '💲' : d.st === 'wait' ? (d.ty === 'flock' ? '📱' : d.ty === 'dale' ? '☕' : d.ty === 'kale' ? '🧘' : d.ty === 'sequoia' ? '🤳' : d.ty === 'larper' ? '🤠' : '🗣️') : null;
        if (ch && Math.random() < 0.8) this.emote(ch, d.x, d.z);
      }
    }
    for (const [, v] of this.it) {
      const g = v.g, d = v.d; if (!d) continue;
      g.position.x += (d.x - g.position.x) * lerpK;
      g.position.y += (d.y - g.position.y) * Math.min(1, lerpK * 2);
      g.position.z += (d.z - g.position.z) * lerpK;
      const air = d.y > 0.04;
      if (air && d.k !== 'shard') { g.rotation.x += dt * 6.5; g.rotation.z += dt * 4.8; }
      else if (v.wasAir && !air) { g.rotation.x = 0; g.rotation.z = 0; this.puff(this.smoke, d.x, 0.12, d.z, { life: 0.45, v: 1.0, vy: 0.5, s: 0.2 }); }
      v.wasAir = air;
    }
    for (const [, f] of this.fi) {
      for (let i = 0; i < 3; i++) { const c = f.g.children[i]; c.scale.y = (0.55 - i * 0.1) * (0.8 + Math.random() * 0.5) * (0.5 + (f.hp ?? 1) * 0.5); c.rotation.y += dt * (2 + i); }
    }
    for (const pool of [this.smoke, this.foam, this.pop, this.steam]) for (const e of pool) {
      if (!e.m.visible) continue;
      e.t -= dt; if (e.t <= 0) { e.m.visible = false; continue; }
      e.m.position.x += e.vx * dt; e.m.position.y += e.vy * dt; e.m.position.z += e.vz * dt;
      if (pool === this.foam) e.vy -= 6 * dt;
      e.m.scale.multiplyScalar(pool === this.smoke || pool === this.steam ? 1 + dt * 0.9 : 1 - dt * 0.4);
    }
    for (const e of this.emotes) if (e.m.visible) { e.t -= dt; if (e.t <= 0) { e.m.visible = false; continue; } e.m.position.y += dt * 0.35; e.m.material.opacity = Math.min(1, e.t / 0.6); }
    for (const e of this.moneys) if (e.m.visible) { e.t -= dt; if (e.t <= 0) { e.m.visible = false; continue; } e.m.position.y += dt * 0.8; e.m.material.opacity = Math.min(1, e.t / 0.5); }
    // burning-slot smoke + cooking steam + urn steam
    if (Math.random() < 0.25) for (const [id, v] of this.slotFood) if (v.state === 'burning' || v.state === 'burnt') this.puff(this.smoke, v.g.position.x, 1.3, v.g.position.z, { life: 1.4, v: 0.3, vy: 1.2, s: 0.22 });
    if (Math.random() < 0.3) for (const [, v] of this.slotFood) if (v.state === 'cook' || v.state === 'ready') this.puff(this.steam, v.g.position.x + (Math.random() - 0.5) * 0.3, 1.25, v.g.position.z, { life: 1.2, v: 0.2, vy: 0.8, s: 0.13 });
    if (Math.random() < 0.09) this.puff(this.steam, Math.random() < 0.5 ? -2.9 : -2.1, 2.0, -6.15, { life: 1.5, v: 0.12, vy: 0.55, s: 0.1 });
    // ---- the life layer -------------------------------------------------------
    for (const f of this.fans) f.userData.hub.rotation.y += dt * 3.4;
    const mp = this.motes.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      mp.array[i * 3] += Math.sin(t * 0.4 + this.moteSeed[i]) * dt * 0.05;
      mp.array[i * 3 + 1] -= dt * 0.045;
      if (mp.array[i * 3 + 1] < 0.3) mp.array[i * 3 + 1] = 2.3;
    }
    mp.needsUpdate = true;
    for (const c of this.clouds) { c.position.x += dt * 0.22; if (c.position.x > 30) c.position.x = -32; }
    this.birdT -= dt;
    if (this.birdT <= 0 && !this.birds.visible) { this.birds.visible = true; this.birds.position.set(-26, 7.6 + Math.random() * 1.5, -13); }
    if (this.birds.visible) {
      this.birds.position.x += dt * 4.2;
      for (let i = 0; i < 3; i++) this.birds.children[i].scale.y = 0.1 + Math.abs(Math.sin(t * 11 + i)) * 0.35;
      if (this.birds.position.x > 27) { this.birds.visible = false; this.birdT = 60 + Math.random() * 80; }
    }
    if (this.doorT > 0) {
      this.doorT -= dt;
      const f = Math.max(0, this.doorT) / 1.15;
      const open = f > 0.65 ? (1 - f) / 0.35 : f / 0.65;
      this.door.rotation.y = -1.75 * Math.min(1, Math.max(0, open));
    }
    this.updateElk(dt);
    if (this.river) { this.river.position.x = Math.sin(t * 0.5) * 0.6; this.river.material.opacity = 0.26 + Math.sin(t * 1.7) * 0.06; }
    if (this.bearD && this.bearG) {
      const bg = this.bearG, bd = this.bearD;
      bg.position.x += (bd.x - bg.position.x) * lerpK;
      bg.position.z += (bd.z - bg.position.z) * lerpK;
      bg.rotation.y += shortest(bg.rotation.y, bd.yw || 0) * lerpK;
      const walking = bd.st !== 'eat';
      const bph = t * 7;
      bg.userData.legs.forEach((l, i) => l.rotation.x = walking ? Math.sin(bph + (i % 2) * Math.PI) * 0.5 : 0);
      bg.position.y = walking ? Math.abs(Math.sin(bph * 0.5)) * 0.05 : 0;
      bg.rotation.x += ((bd.st === 'eat' ? 0.35 : 0) - bg.rotation.x) * lerpK;
    }
    // sun drift: noon → golden hour across the shift (morning gold in the lobby)
    const dayTgt = this.simPh === 'shift' ? Math.min(1, this.simT / C.SHIFT_LEN) : (this.simPh === 'lobby' || this.simPh === 'count') ? 0 : 1;
    this._dayF += (dayTgt - this._dayF) * Math.min(1, dt * 0.5);
    const f01 = this._dayF;
    this.sun.color.setHex(0xffe9c4).lerp(this._cB.setHex(0xff9a52), f01);
    this.sun.intensity = 1.35 - 0.18 * f01;
    this.sun.position.set(-7 + 10 * f01, 11 - 2.5 * f01, 5 - 5 * f01);
    this.hemi.intensity = 0.95 - 0.18 * f01;
    this.scene.background.setHex(0xf7cf9e).lerp(this._cB2.setHex(0xefa06b), f01);
    this.scene.fog.color.copy(this.scene.background);
    if (this.snap && this.snap.fi && this.snap.fi.length) {
      const f0 = this.snap.fi[0];
      this.fireLight.position.set(f0.x, 1.5, f0.z);
      this.fireLight.intensity = 1.1 + Math.random() * 0.7;
    } else this.fireLight.intensity = 0;
    // camera
    let fx = 0, fz = 1.2;
    let target = null;
    if (this.you >= 0 && this.pl.has(this.you)) target = this.pl.get(this.you).g.position;
    if (target) {
      this.camTgt.lerp(new THREE.Vector3(target.x * 0.85, 0, target.z * 0.8 + 0.4), Math.min(1, dt * 4));
      this.camPos.lerp(new THREE.Vector3(this.camTgt.x, 11.6, this.camTgt.z + 8.6), Math.min(1, dt * 4));
    } else {
      this.camTgt.lerp(new THREE.Vector3(0, 0, 0.5), dt);
      this.camPos.lerp(new THREE.Vector3(0, 15.5, 12), dt);
    }
    this.camera.position.copy(this.camPos);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / 0.45) * (this.shakeA || 0);
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * k;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    this.camera.lookAt(this.camTgt.x, 0.4, this.camTgt.z);
    if (this.signFlipT > 0) {
      this.signFlipT -= dt;
      this.signPlate.rotation.x = Math.max(0, this.signFlipT) / 0.7 * Math.PI * 2;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
function shortest(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
