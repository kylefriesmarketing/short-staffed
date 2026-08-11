// SHORT STAFFED — the view. three.js r160 (vendored). Janky low-poly per the
// STYLE FORMULA: flat-shaded facets, warm diner cream + wood + faded teal,
// saturated apron accents, hot orange hazards, golden-hour light. View-only:
// Math.random is allowed here, the sim never sees any of this.
import * as THREE from '../vendor/three.module.js';
import { C, LAYOUT } from './sim.js';
import { Post } from './post.js';

const PAL = {
  cream: 0xf3e5c8, creamDark: 0xe4d2ac, teal: 0x8fb8ad, tealDark: 0x6e968b,
  wood: 0x8a6844, woodDark: 0x6b4f33, top: 0xa77e52, steel: 0xb3bcc4, steelDark: 0x7f8891,
  floorA: 0xe8d9b8, floorB: 0xcfd8c6, hazard: 0xff5a26, white: 0xfff6e8,
  aprons: [0xd94f38, 0x3a76c4, 0xe8b53a, 0x5c9e4f],
  skin: [0xe8b48c, 0xc98e66, 0xf0c8a0, 0xa9764f],
  flock: [0xd9a7c7, 0xa7c7d9, 0xc7d9a7],
  gray: 0x8c8c94, denim: 0x5b7292, hatBrown: 0x7a5a3a, flannel: 0xb5533c,
  zillow: [0x7ea2c4, 0xc4a27e], mountain: 0x9aa78f, mountainFar: 0xb8c2b0,
  batter: 0xf5e6c4, patty: 0xa2543c, troutC: 0x9fb6c4, coffee: 0x4a3320, matcha: 0x7fae6a,
  fire: [0xff5a26, 0xffa02e, 0xffd23e],
};
// ---- procedural surface textures -------------------------------------------
// Everything is lit and shaped but UNTEXTURED without these, which is what makes
// flat-shaded geometry read as "programmer blocks". Drawn to canvas, sampled with
// WORLD-SPACE uvs (see Merger), so one texture tiles correctly across every prop.
function cv2(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
function texFrom(c, rep = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4; t.repeat.set(rep, rep);
  return t;
}
function grainTex() {                       // paint / plaster / general surface tooth
  const c = cv2(256), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  const img = x.getImageData(0, 0, 256, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 246 + Math.random() * 9;
    d[i] = d[i + 1] = d[i + 2] = n;
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = 0.06;
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = Math.random() < 0.5 ? '#000' : '#fff';
    x.lineWidth = 0.6 + Math.random();
    x.beginPath();
    const y0 = Math.random() * 256;
    x.moveTo(0, y0); x.bezierCurveTo(85, y0 + (Math.random() - 0.5) * 14, 170, y0 + (Math.random() - 0.5) * 14, 256, y0);
    x.stroke();
  }
  return c;
}
function woodTex() {                        // grain + knots for counters and beams
  const c = cv2(256), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 46; i++) {
    const y0 = Math.random() * 256;
    x.globalAlpha = 0.1 + Math.random() * 0.16;
    x.strokeStyle = Math.random() < 0.65 ? '#6b4f33' : '#c9a877';
    x.lineWidth = 0.7 + Math.random() * 2.2;
    x.beginPath(); x.moveTo(0, y0);
    x.bezierCurveTo(64, y0 + (Math.random() - 0.5) * 9, 170, y0 + (Math.random() - 0.5) * 9, 256, y0 + (Math.random() - 0.5) * 5);
    x.stroke();
  }
  x.globalAlpha = 0.16;
  for (let i = 0; i < 3; i++) {              // knots
    const kx = Math.random() * 256, ky = Math.random() * 256;
    for (let r = 10; r > 0; r -= 2) { x.strokeStyle = '#6b4f33'; x.lineWidth = 1.1; x.beginPath(); x.ellipse(kx, ky, r, r * 0.55, 0.5, 0, 7); x.stroke(); }
  }
  x.globalAlpha = 1;
  return c;
}
function tileTex() {                        // vinyl tile: grout seam + scuffs, 1 unit/tile
  const c = cv2(256), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  const g = x.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(226,222,212,1)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.globalAlpha = 0.05;
  for (let i = 0; i < 240; i++) {           // speckle fleck like real diner vinyl
    x.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
    x.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6);
  }
  x.globalAlpha = 1;
  x.strokeStyle = 'rgba(120,112,98,0.5)'; x.lineWidth = 5;
  x.strokeRect(0, 0, 256, 256);             // grout at the tile edge
  x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2;
  x.strokeRect(5, 5, 246, 246);
  return c;
}
function brushTex() {                       // brushed stainless
  const c = cv2(256), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  x.globalAlpha = 0.11;
  for (let i = 0; i < 320; i++) {
    x.strokeStyle = Math.random() < 0.5 ? '#000' : '#fff';
    x.lineWidth = 0.5 + Math.random() * 1.1;
    const y0 = Math.random() * 256;
    x.beginPath(); x.moveTo(0, y0); x.lineTo(256, y0 + (Math.random() - 0.5) * 2); x.stroke();
  }
  x.globalAlpha = 1;
  return c;
}

const mats = new Map();
function M(color, opt = {}) {
  const key = color + '|' + (opt.e || 0) + '|' + (opt.t || 0) + '|' + (opt.m || 0) + '|' + (opt.r ?? '');
  if (!mats.has(key)) {
    const m = new THREE.MeshStandardMaterial({
      color, flatShading: true,
      roughness: opt.r ?? 0.86, metalness: opt.m || 0,
    });
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
// merge static boxes/cyls into one vertex-colored geometry (draw-call budget).
// Vertex colours also carry a cheap baked AO: everything darkens toward the
// floor and on downward faces, which is what stops a flat-shaded room from
// looking like untextured blocks.
class Merger {
  constructor(ao = true) { this.ao = ao; this.pos = []; this.nor = []; this.col = []; this.uv = []; this._c = new THREE.Color(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); }
  add(geo, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    this._e.set(rx, ry, rz); this._q.setFromEuler(this._e);
    this._m.compose(new THREE.Vector3(x, y, z), this._q, new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(this._m);
    const p = g.attributes.position, n = g.attributes.normal; this._c.set(color);
    for (let i = 0; i < p.count; i++) {
      const vy = p.getY(i), ny = n.getY(i);
      let k = 1;
      if (this.ao) {
        // gentle contact darkening on VERTICAL/downward faces only — baking it
        // into up-facing surfaces just muddies the floor and the counter tops
        if (ny > 0.45) k = 1;
        else {
          const f = Math.min(1, Math.max(0, vy / 1.6));
          k = 0.82 + 0.18 * (f * f * (3 - 2 * f));
          if (ny < -0.5) k *= 0.9;                               // undersides
        }
      }
      const vx = p.getX(i), vz = p.getZ(i), nx = n.getX(i), nz = n.getZ(i);
      this.pos.push(vx, vy, vz);
      this.nor.push(nx, ny, nz);
      this.col.push(this._c.r * k, this._c.g * k, this._c.b * k);
      // world-space planar uvs off the dominant normal axis — one texture set
      // tiles correctly across every box in the room, no per-prop unwrapping
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (ay >= ax && ay >= az) this.uv.push(vx, vz);
      else if (ax >= az) this.uv.push(vz, vy);
      else this.uv.push(vx, vy);
    }
    g.dispose();
  }
  build(opt = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true,
      roughness: opt.r ?? 0.9, metalness: opt.m ?? 0,
    });
    if (opt.tex) {
      mat.map = opt.tex;
      mat.bumpMap = opt.tex;                 // same canvas drives relief under the sun
      mat.bumpScale = opt.bump ?? 0.06;
    }
    if (opt.e) { mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = opt.e; mat.vertexColors = true; }
    const mesh = new THREE.Mesh(g, opt.mat || mat);
    mesh.castShadow = !!opt.cast; mesh.receiveShadow = opt.recv !== false;
    return mesh;
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
  sp.scale.set(1.7, 0.42, 1); sp.position.y = 2.2; sp.renderOrder = 4;
  return sp;
}

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7cf9e);
    this.scene.fog = new THREE.Fog(0xf7cf9e, 30, 70);
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.08, 140);
    this.camTgt = new THREE.Vector3(0, 0, 1);
    this.camPos = new THREE.Vector3(0, 12, 10);
    this.fp = true; this.look = { yaw: 0, pitch: 0 }; this.bob = 0; this.fovBase = 62;
    // key light: real shadow map, frustum wrapped tight around the diner so the
    // texel density is high enough for a toy-sized cook to cast a readable shadow
    this.sun = new THREE.DirectionalLight(0xffe0b0, 2.1);
    this.sun.position.set(-9, 13, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -17; this.sun.shadow.camera.right = 17;
    this.sun.shadow.camera.top = 20; this.sun.shadow.camera.bottom = -14;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 48;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.022;
    this.sun.shadow.radius = 2.5;
    this.hemi = new THREE.HemisphereLight(0xfff4e2, 0xd6c3a2, 1.15);
    this.fill = new THREE.DirectionalLight(0xbfd8ff, 0.4); this.fill.position.set(8, 6, -9);
    // interiors need bounce: without it, ceilings and shaded sides go to mud
    this.amb = new THREE.AmbientLight(0xfff0dc, 0.55);
    // warm practical over the pass so the kitchen half isn't lit only from outside
    this.pass1 = new THREE.PointLight(0xffcf96, 0.9, 16, 1.6); this.pass1.position.set(-4, 2.5, -4.4);
    this.pass2 = new THREE.PointLight(0xffe0b4, 0.7, 15, 1.6); this.pass2.position.set(-4.5, 2.4, 2.5);
    this.scene.add(this.sun, this.sun.target, this.hemi, this.fill, this.amb, this.pass1, this.pass2);
    // procedural environment: warm sky over a cream room, so metal has something
    // to reflect instead of reading as flat grey plastic
    const envCv = document.createElement('canvas'); envCv.width = 32; envCv.height = 32;
    const ex = envCv.getContext('2d');
    const eg = ex.createLinearGradient(0, 0, 0, 32);
    eg.addColorStop(0, '#ffeccb'); eg.addColorStop(0.48, '#fff6e6');
    eg.addColorStop(0.52, '#e7d8bc'); eg.addColorStop(1, '#c2ae90');
    ex.fillStyle = eg; ex.fillRect(0, 0, 32, 32);
    const envTex = new THREE.CanvasTexture(envCv);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromEquirectangular(envTex).texture;
    pmrem.dispose(); envTex.dispose();
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
    this.buildHands();
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.resize();
  }
  // first-person hands: two forearms low in frame plus whatever you're carrying.
  // Parented to the camera, drawn by the same pass (no separate overlay scene).
  buildHands() {
    this.hands = new THREE.Group();
    const mk = s => {
      const g = new THREE.Group();
      g.add(mesh(GEO.box, M(PAL.white, { r: 0.8 }), 0, 0, 0, 0.14, 0.42, 0.14));
      g.add(mesh(GEO.sph, M(PAL.skin[0]), 0, -0.24, 0.02, 0.17, 0.15, 0.17));
      g.position.set(0.26 * s, -0.42, -0.5);
      g.rotation.set(-1.15, 0, -0.16 * s);
      return g;
    };
    this.handL = mk(-1); this.handR = mk(1);
    this.handItem = new THREE.Group();
    this.handItem.position.set(0.26, -0.44, -0.66);
    this.handItem.scale.setScalar(0.5);
    this.hands.add(this.handL, this.handR, this.handItem);
    this.camera.add(this.hands);
    this.scene.add(this.camera);
    this.handKey = '';
  }
  setHandItem(mini, stack) {
    const key = (mini ? this.itemKey(mini) : '') + '|' + (stack || []).map(s => this.itemKey(s)).join(',');
    if (key === this.handKey) return;
    this.handKey = key;
    while (this.handItem.children.length) this.handItem.remove(this.handItem.children[0]);
    if (mini) {
      this.handItem.add(stripBlob(this.buildItem(mini)));
      const onTray = mini.k === 'tray';
      (stack || []).forEach((s, i) => {
        const im = stripBlob(this.buildItem(s));
        if (onTray) { const tp = TRAY_SPOTS[i] || [0, 0.07 + 0.16 * i, 0]; im.position.set(tp[0], tp[1], tp[2]); }
        else { im.position.y = 0.2 * (i + 1); im.rotation.y = (i + 1) * 0.4; }
        this.handItem.add(im);
      });
    }
    const holding = !!mini;
    // a tray rides higher and closer so its surface (and the load) stays in frame
    if (mini && mini.k === 'tray') this.handItem.position.set(0.08, -0.33, -0.56);
    else this.handItem.position.set(0.26, -0.44, -0.66);
    this.handL.rotation.x = holding ? -1.5 : -1.15;
    this.handR.rotation.x = holding ? -1.5 : -1.15;
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.post) this.post.setSize(w, h);
  }

  // ---- static room -----------------------------------------------------------
  buildRoom() {
    const mp = new Merger();           // paint/plaster: walls, ceilings, props
    const mw = new Merger();           // timber: counters, tables, chairs, beams
    const fl = new Merger();           // floor: gets its own tile texture
    const mt = new Merger();           // metal: stations, chrome, fixtures
    const gl = new Merger(false);      // emissive: lamps, windows, heat strip
    // route every existing m.add() by colour, so timber picks up wood grain and
    // everything else picks up plaster tooth without rewriting the whole room
    const WOODY = new Set([PAL.wood, PAL.woodDark, PAL.top, 0x8a5a3a, 0x9a4a32, 0x8a3f28]);
    const m = { add: (g2, c, ...r) => (WOODY.has(c) ? mw : mp).add(g2, c, ...r) };
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
      fl.add(GEO.box, wearC.getHex(), x, -0.05, z, 1, 0.1, 1);
    }
    // porch + dirt yard outside the door
    m.add(GEO.box, PAL.woodDark, LAYOUT.door.x, -0.06, 8.3, 4.6, 0.1, 2.6);
    m.add(GEO.box, 0xcbb27e, 2, -0.12, 9.5, 26, 0.1, 5);
    // walls — full height now that the camera lives at eye level.
    // The north wall is built as piers around three REAL openings; a painted-on
    // window panel reads as a glowing white slab from the inside and you lose
    // the whole reason the diner faces the mountains.
    const WH = 3.3, WINS = [-9, -4, 1], WW = 2.72, WY0 = 0.95, WY1 = 2.52;
    const edges = [-12.25];
    for (const wx of WINS) edges.push(wx - WW / 2, wx + WW / 2);
    edges.push(12.25);
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i], b = edges[i + 1];
      if (b - a > 0.02) m.add(GEO.box, PAL.cream, (a + b) / 2, WH / 2, -7.25, b - a, WH, 0.5);
    }
    for (const wx of WINS) {
      m.add(GEO.box, PAL.cream, wx, WY0 / 2, -7.25, WW, WY0, 0.5);              // under-sill
      m.add(GEO.box, PAL.cream, wx, (WY1 + WH) / 2, -7.25, WW, WH - WY1, 0.5);  // header
    }
    m.add(GEO.box, PAL.cream, -12.25, WH / 2, 0, 0.5, WH, 14.5);
    m.add(GEO.box, PAL.cream, 12.25, WH / 2, 0, 0.5, WH, 14.5);
    const d = LAYOUT.door;
    m.add(GEO.box, PAL.cream, (-12 + (d.x - d.gap)) / 2, WH / 2, 7.25, (d.x - d.gap) + 12, WH, 0.5);
    m.add(GEO.box, PAL.cream, (d.x + d.gap + 12) / 2, WH / 2, 7.25, 12 - (d.x + d.gap), WH, 0.5);
    m.add(GEO.box, PAL.cream, d.x, 2.85, 7.25, d.gap * 2 + 0.5, 0.9, 0.5); // header over the door
    m.add(GEO.box, PAL.teal, d.x - d.gap, 1.1, 7.25, 0.22, 2.2, 0.55);     // door posts
    m.add(GEO.box, PAL.teal, d.x + d.gap, 1.1, 7.25, 0.22, 2.2, 0.55);
    m.add(GEO.box, PAL.teal, d.x, 2.25, 7.25, d.gap * 2 + 0.2, 0.22, 0.55);
    // wainscot + chair rail down every wall — the single biggest "this is a room,
    // not a box" cue at eye level
    for (let wx = -11.6; wx <= 11.6; wx += 0.62) {
      m.add(GEO.box, PAL.tealDark, wx, 0.52, -6.96, 0.5, 1.02, 0.06);
      if (wx > 4.2 || wx < 2.2) m.add(GEO.box, PAL.tealDark, wx, 0.52, 6.96, 0.5, 1.02, 0.06);
    }
    for (let wz = -6.6; wz <= 6.6; wz += 0.62) {
      m.add(GEO.box, PAL.tealDark, -11.96, 0.52, wz, 0.06, 1.02, 0.5);
      m.add(GEO.box, PAL.tealDark, 11.96, 0.52, wz, 0.06, 1.02, 0.5);
    }
    m.add(GEO.box, PAL.wood, 0, 1.08, -6.94, 24, 0.12, 0.12);        // chair rail
    m.add(GEO.box, PAL.wood, -11.94, 1.08, 0, 0.12, 0.12, 14);
    m.add(GEO.box, PAL.wood, 11.94, 1.08, 0, 0.12, 0.12, 14);
    m.add(GEO.box, PAL.tealDark, 0, 0.09, -6.92, 24, 0.18, 0.1);     // baseboard
    m.add(GEO.box, PAL.tealDark, -11.92, 0.09, 0, 0.1, 0.18, 14);
    m.add(GEO.box, PAL.tealDark, 11.92, 0.09, 0, 0.1, 0.18, 14);
    m.add(GEO.box, PAL.woodDark, 0, WH - 0.12, -6.9, 24, 0.16, 0.14); // crown moulding
    // window joinery around the openings: jambs, mullions, sill, curtains
    for (const wx of WINS) {
      const hw = WW / 2;
      m.add(GEO.box, PAL.teal, wx - hw, (WY0 + WY1) / 2, -7.02, 0.16, WY1 - WY0, 0.5);
      m.add(GEO.box, PAL.teal, wx + hw, (WY0 + WY1) / 2, -7.02, 0.16, WY1 - WY0, 0.5);
      m.add(GEO.box, PAL.teal, wx, WY1 - 0.06, -7.02, WW, 0.14, 0.5);
      m.add(GEO.box, PAL.teal, wx, WY0 + 0.05, -7.02, WW, 0.14, 0.5);
      m.add(GEO.box, PAL.teal, wx, (WY0 + WY1) / 2, -7.06, 0.1, WY1 - WY0, 0.1);   // mullions
      m.add(GEO.box, PAL.teal, wx, (WY0 + WY1) / 2, -7.06, WW, 0.1, 0.1);
      m.add(GEO.box, PAL.wood, wx, WY0 + 0.02, -6.88, WW + 0.4, 0.12, 0.42);        // sill
      const cy = (WY0 + WY1) / 2;
      m.add(GEO.box, 0xb85a4a, wx - hw - 0.16, cy, -6.86, 0.3, WY1 - WY0 - 0.1, 0.1); // curtains
      m.add(GEO.box, 0xb85a4a, wx + hw + 0.16, cy, -6.86, 0.3, WY1 - WY0 - 0.1, 0.1);
      m.add(GEO.box, 0xb85a4a, wx, WY1 + 0.16, -6.86, WW + 0.7, 0.22, 0.12);          // valance
    }
    // ceiling + joists (only drawn in first person; it would blind the top-down view)
    const cm = new Merger(false);
    cm.add(GEO.box, 0xe9dcc0, 0, WH + 0.08, 0, 24.7, 0.16, 14.5);
    for (let bx = -10; bx <= 10; bx += 4) cm.add(GEO.box, PAL.woodDark, bx, WH - 0.06, 0, 0.3, 0.22, 14.5);
    this.ceiling = cm.build({ r: 0.95 });
    this.ceiling.receiveShadow = true;
    this.scene.add(this.ceiling);
    // pendant lamps over the dining room — cord, shade, and a hot bulb for bloom
    for (const [lx, lz] of [[-8.5, 1.2], [-4.5, 1.2], [-0.5, 1.2], [-8.5, 4.8], [-4.5, 4.8], [-0.5, 4.8], [0.5, -1.9]]) {
      m.add(GEO.cyl, 0x2c2c30, lx, WH - 0.45, lz, 0.035, 0.9, 0.035);
      m.add(GEO.cone, 0xc44536, lx, WH - 1.02, lz, 0.86, 0.42, 0.86, Math.PI, 0, 0);
      gl.add(GEO.sph, 0xfff0c8, lx, WH - 1.2, lz, 0.26, 0.26, 0.26);
    }
    // heat-lamp strip over the pass (the other bloom source, and it's diegetic)
    gl.add(GEO.box, 0xff8a3a, -2.4, 2.05, -2.6, 7.2, 0.09, 0.26);
    m.add(GEO.box, PAL.steelDark, -2.4, 2.2, -2.6, 7.4, 0.22, 0.4);
    for (const hx of [-5.6, -2.4, 0.8]) m.add(GEO.cyl, PAL.steelDark, hx, 2.75, -2.6, 0.05, 1.1, 0.05);
    // menu board over the pass
    m.add(GEO.box, 0x2c2620, 5.4, 2.35, -6.9, 4.6, 1.5, 0.12);
    m.add(GEO.box, PAL.wood, 5.4, 2.35, -6.96, 4.9, 1.7, 0.06);
    for (let r = 0; r < 5; r++) for (const [sx, sw] of [[-1.5, 1.8], [1.1, 1.1]])
      m.add(GEO.box, r % 2 ? 0xd8cba8 : 0xbfae86, 5.4 + sx, 2.85 - r * 0.26, -6.83, sw, 0.1, 0.02);
    // wall clock + framed photos (Hazel's diner, before)
    m.add(GEO.cyl, PAL.woodDark, -6.5, 2.62, -6.88, 0.62, 0.08, 0.62, Math.PI / 2, 0, 0);
    m.add(GEO.cyl, PAL.white, -6.5, 2.62, -6.83, 0.52, 0.03, 0.52, Math.PI / 2, 0, 0);
    m.add(GEO.box, 0x2c2620, -6.5, 2.68, -6.81, 0.04, 0.2, 0.02);
    m.add(GEO.box, 0x2c2620, -6.56, 2.62, -6.81, 0.16, 0.04, 0.02);
    for (const [px, py, pw, ph] of [[-11.94, 1.9, 0.5, 0.4], [-11.94, 2.5, 0.4, 0.5], [-11.94, 1.35, 0.42, 0.34]]) {
      m.add(GEO.box, PAL.woodDark, px, py, 4.4, 0.06, ph + 0.1, pw + 0.1);
      m.add(GEO.box, 0xd8c6a0, px + 0.04, py, 4.4, 0.02, ph, pw);
    }
    // counter runs + tops
    const ct = LAYOUT.counter;
    const w1 = { x: (ct.x0 + ct.gapX0) / 2, w: ct.gapX0 - ct.x0 }, w2 = { x: (ct.gapX1 + 12) / 2, w: 12 - ct.gapX1 };
    for (const r of [w1, w2]) {
      m.add(GEO.box, PAL.wood, r.x, 0.46, ct.z, r.w, 0.92, 0.66);
      m.add(GEO.box, PAL.top, r.x, 0.95, ct.z, r.w + 0.12, 0.1, 0.9);
    }
    for (const ps of LAYOUT.pass) m.add(GEO.box, PAL.teal, ps.x, 1.005, ps.z, 0.9, 0.02, 0.7); // pass mats
    // kitchen stations — steel goes in the metal group so it reflects the room
    mt.add(GEO.box, PAL.steelDark, -8, 0.5, -6.35, 2.7, 1.0, 1.1);      // griddle body
    mt.add(GEO.box, PAL.steel, -8, 1.02, -6.35, 2.5, 0.08, 0.95);       // flat top
    mt.add(GEO.box, PAL.steelDark, -8, 2.45, -6.6, 2.6, 0.62, 0.7);     // hood
    mt.add(GEO.box, PAL.steelDark, -8, 2.05, -6.5, 2.6, 0.3, 0.5, 0.42);// hood lip
    mt.add(GEO.box, PAL.steel, -5.5, 0.5, -6.35, 1.6, 1.0, 1.1);        // range
    mt.add(GEO.cyl, 0x5e646c, -5.5, 1.04, -6.1, 0.9, 0.08, 0.9);        // burner
    mt.add(GEO.cyl, 0x6e757e, -5.5, 1.1, -6.1, 0.75, 0.08, 0.75);       // pan
    mt.add(GEO.box, 0x4a4f56, -4.85, 1.1, -6.1, 0.5, 0.06, 0.12);       // handle
    m.add(GEO.box, PAL.wood, -2.5, 0.5, -6.35, 1.9, 1.0, 1.1);          // bev cabinet
    mt.add(GEO.box, PAL.steel, -2.5, 1.06, -6.35, 1.8, 0.12, 0.95);
    m.add(GEO.box, 0x6b4226, -2.9, 1.5, -6.2, 0.42, 0.75, 0.5);         // coffee urn
    m.add(GEO.box, 0x5c8a4d, -2.1, 1.5, -6.2, 0.42, 0.75, 0.5);         // matcha urn
    gl.add(GEO.box, 0xff5a26, -2.9, 1.16, -5.95, 0.3, 0.05, 0.1);       // warmer plate
    mt.add(GEO.box, PAL.steel, 1.5, 0.5, -6.35, 1.4, 1.0, 1.1);         // sink
    mt.add(GEO.box, 0x7d848b, 1.5, 1.0, -6.3, 1.1, 0.14, 0.8);
    mt.add(GEO.cyl, PAL.steelDark, 1.5, 1.45, -6.6, 0.08, 0.7, 0.08);   // faucet
    mt.add(GEO.box, PAL.steelDark, 1.5, 1.78, -6.45, 0.06, 0.06, 0.34);
    // wire shelf over the pass with spare plates
    mt.add(GEO.box, PAL.steel, -6.5, 1.95, -6.7, 3.4, 0.05, 0.5);
    for (const px of [-7.6, -6.6, -5.6]) mp.add(GEO.cyl, PAL.white, px, 2.06, -6.7, 0.44, 0.18, 0.44); // crockery isn't metal
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
      m.add(GEO.cyl, PAL.woodDark, t.x, 0.05, t.z, 0.9, 0.1, 0.9);      // foot
      m.add(GEO.cyl, PAL.cream, t.x, 0.72, t.z, 1.5, 0.1, 1.5);
      m.add(GEO.cyl, PAL.teal, t.x, 0.745, t.z, 1.0, 0.06, 1.0);
      // condiment caddy: the clutter that makes a table read as a real table
      m.add(GEO.box, PAL.steelDark, t.x + 0.42, 0.83, t.z - 0.42, 0.26, 0.1, 0.26);
      m.add(GEO.cyl, 0xc44536, t.x + 0.36, 0.92, t.z - 0.48, 0.09, 0.16, 0.09);  // ketchup
      m.add(GEO.cyl, 0xf5e04a, t.x + 0.48, 0.92, t.z - 0.48, 0.09, 0.16, 0.09);  // mustard
      m.add(GEO.cyl, PAL.white, t.x + 0.36, 0.9, t.z - 0.36, 0.06, 0.12, 0.06);  // salt
      m.add(GEO.cyl, 0x4a4a52, t.x + 0.48, 0.9, t.z - 0.36, 0.06, 0.12, 0.06);   // pepper
      mt.add(GEO.box, 0xc9d0d8, t.x - 0.44, 0.87, t.z - 0.44, 0.24, 0.18, 0.14); // napkin dispenser
      for (const s of t.seats) {
        const a = Math.atan2(t.x - s.x, t.z - s.z);
        m.add(GEO.box, PAL.wood, s.x, 0.44, s.z, 0.42, 0.09, 0.42, 0, a, 0);      // seat pad
        m.add(GEO.box, 0xc44536, s.x, 0.49, s.z, 0.36, 0.04, 0.36, 0, a, 0);      // vinyl
        for (const [lx, lz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]])
          m.add(GEO.box, PAL.woodDark, s.x + lx, 0.2, s.z + lz, 0.05, 0.4, 0.05); // legs
        m.add(GEO.box, PAL.wood, s.x - Math.sin(a) * 0.19, 0.72, s.z - Math.cos(a) * 0.19, 0.42, 0.5, 0.07, 0, a, 0);
      }
    }
    for (const s of LAYOUT.stools) {
      mt.add(GEO.cyl6, PAL.steelDark, s.x, 0.3, s.z, 0.14, 0.6, 0.14);
      mt.add(GEO.cyl, PAL.steelDark, s.x, 0.03, s.z, 0.5, 0.06, 0.5);   // base
      mt.add(GEO.cyl, PAL.steelDark, s.x, 0.26, s.z, 0.42, 0.05, 0.42); // footrest ring
      m.add(GEO.cyl, 0xc44536, s.x, 0.62, s.z, 0.54, 0.14, 0.54);
      m.add(GEO.cyl, 0x8a2f22, s.x, 0.68, s.z, 0.5, 0.04, 0.5);
    }
    // ⚠️ a dark body in the METAL group goes black — the register is painted steel.
    // ⚠️ placement: the register lives on the EAST counter stub (x 7.2–12) —
    // x 5.9 was INSIDE the walkway gap, floating mid-air where players sprint.
    mp.add(GEO.box, 0xd8d2c4, 8.6, 1.25, -2.6, 0.8, 0.6, 0.6);          // register on east counter
    mp.add(GEO.box, 0x8a8f98, 8.6, 1.5, -2.45, 0.5, 0.3, 0.3, -0.5);
    mt.add(GEO.box, 0xb9c0c8, 8.6, 1.58, -2.6, 0.62, 0.06, 0.5);        // chrome cap
    gl.add(GEO.box, 0x7fd8a0, 8.6, 1.53, -2.38, 0.36, 0.16, 0.02);      // register readout
    // pie case on the pass — glass dome + a whole huckleberry pie
    m.add(GEO.cyl, PAL.white, 3.4, 1.02, -2.6, 0.72, 0.06, 0.72);
    m.add(GEO.cyl, 0x8a5a3a, 3.4, 1.09, -2.6, 0.6, 0.1, 0.6);
    m.add(GEO.cyl, 0x5a3a6a, 3.4, 1.14, -2.6, 0.5, 0.04, 0.5);
    // the jukebox hugs the EAST WALL (it used to squat in the gap exit, a
    // fake-solid players ghosted through — the worst kind of incoherence)
    m.add(GEO.box, PAL.wood, 11.35, 0.7, -0.9, 1.1, 1.4, 0.7);
    m.add(GEO.sph, PAL.teal, 11.35, 1.45, -0.9, 1.1, 0.7, 0.7);
    // east-wall life: the bare corner finally furnished (all view-only, wall-hugging)
    mp.add(GEO.cyl, 0xc44536, 11.4, 0.5, 0.9, 0.34, 1.0, 0.34);         // gumball machine
    gl.add(GEO.sph, 0xffd98a, 11.4, 1.2, 0.9, 0.4, 0.4, 0.4);
    mp.add(GEO.box, 0x8a8f98, 11.4, 0.05, 0.9, 0.4, 0.1, 0.4);
    m.add(GEO.cyl, 0x8a5a3a, 11.35, 0.4, 3.6, 0.5, 0.5, 0.5);           // fern in a pot
    for (const [fx2, fz2] of [[0, 0], [0.2, 0.1], [-0.2, 0.1], [0.1, -0.2], [-0.1, -0.15]])
      mp.add(GEO.cone, 0x4f7a4a, 11.35 + fx2, 0.95, 3.6 + fz2, 0.3, 0.7, 0.3);
    mp.add(GEO.tri, 0x2c4a6a, 11.93, 2.3, 1.9, 1.4, 0.5, 1, 0, -Math.PI / 2, 0); // MONTANA pennant
    m.add(GEO.cyl, PAL.woodDark, 8.2, 0.9, 6.75, 0.09, 1.8, 0.09);      // coat rack by the door
    m.add(GEO.cyl, PAL.woodDark, 8.2, 1.78, 6.75, 0.4, 0.06, 0.4);
    mp.add(GEO.sph, 0x9d4e35, 8.05, 1.62, 6.7, 0.3, 0.34, 0.22);        // somebody's coat
    mp.add(GEO.cyl, 0x6b4f33, 8.42, 1.86, 6.75, 0.26, 0.1, 0.26);       // somebody's hat
    mp.add(GEO.tri, 0xf0e442, 4.6, 0.42, -2.12, 0.5, 0.8, 1);           // wet-floor sign by the dishpit
    mp.add(GEO.tri, 0xf0e442, 4.6, 0.42, -2.18, 0.5, 0.8, 1, 0, Math.PI, 0);
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
    // ── the clutter that makes a room look WORKED IN ──────────────────────
    // A diner is never tidy. Every one of these is something a real Grubstake
    // would have accumulated and nobody would have got round to removing.
    // corkboard by the door: flyers, a lost dog, a band nobody has heard of
    m.add(GEO.box, 0x8a6a44, 11.9, 1.75, 4.4, 0.08, 1.2, 2.0);
    mp.add(GEO.box, 0xbfa87e, 11.84, 1.75, 4.4, 0.03, 1.05, 1.85);
    for (let i = 0; i < 7; i++) {
      const fy = 1.36 + (i % 3) * 0.36, fz = 3.7 + (i % 4) * 0.44;
      mp.add(GEO.box, [PAL.white, 0xffe9b8, 0xdfeee4, 0xf6d9d2][i % 4], 11.8, fy, fz, 0.02, 0.26 + (i % 2) * 0.08, 0.3, 0, (i % 3 - 1) * 0.12, 0);
    }
    // hand-written specials board, propped where the customers see it
    m.add(GEO.box, PAL.woodDark, 9.4, 1.5, 6.4, 1.5, 1.1, 0.09, 0.5);
    mp.add(GEO.box, 0x27251f, 9.4, 1.5, 6.34, 1.28, 0.9, 0.05, 0.5);
    for (let i = 0; i < 4; i++) mp.add(GEO.box, 0xe8e0cc, 9.4 - i * 0.02, 1.78 - i * 0.19, 6.31, 0.9 - (i % 2) * 0.3, 0.05, 0.03, 0.5);
    // mugs hanging over the coffee station, and a spice rack by the griddle
    for (let i = 0; i < 5; i++) {
      m.add(GEO.box, PAL.steelDark, -2.5, 2.06, -6.5, 1.6, 0.05, 0.05);
      mp.add(GEO.cyl, PAL.white, -3.1 + i * 0.32, 1.9, -6.5, 0.2, 0.24, 0.2);
    }
    m.add(GEO.box, PAL.wood, -9.6, 1.92, -6.72, 2.0, 0.07, 0.3);
    for (let i = 0; i < 7; i++) mp.add(GEO.cyl, [0x9d4e35, 0xc9a227, 0x7a5a3a, 0xdcd6c8][i % 4], -10.4 + i * 0.27, 2.06, -6.72, 0.14, 0.24, 0.14);
    // the ticket wheel at the pass — the most diner object there is
    m.add(GEO.cyl, PAL.steelDark, 4.0, 1.28, -2.6, 0.06, 0.5, 0.06);
    mt.add(GEO.cyl, PAL.steel, 4.0, 1.54, -2.6, 0.5, 0.05, 0.5, Math.PI / 2, 0, 0);
    for (let i = 0; i < 6; i++) { const a = i * 1.047; mp.add(GEO.box, PAL.white, 4.0 + Math.sin(a) * 0.2, 1.54 + Math.cos(a) * 0.2, -2.54, 0.16, 0.2, 0.01); }
    // a coffee pot on its warmer, a tip jar, a stack of menus, the newspaper
    m.add(GEO.box, 0x2c2c30, -2.5, 1.06, -6.05, 0.42, 0.08, 0.34);
    mp.add(GEO.cyl, 0x3a2a1c, -2.5, 1.25, -6.05, 0.28, 0.32, 0.28);
    mp.add(GEO.box, PAL.white, -2.68, 1.3, -6.05, 0.05, 0.2, 0.16);
    mp.add(GEO.cyl, 0xcfe3ea, 6.5, 1.16, -2.6, 0.3, 0.34, 0.3);      // tip jar
    mp.add(GEO.cyl, 0x5c9e4f, 6.5, 1.12, -2.6, 0.26, 0.16, 0.26);
    for (let i = 0; i < 5; i++) mp.add(GEO.box, [0xe8dcc0, 0xdfd3b6][i % 2], 7.4, 1.03 + i * 0.022, -2.6, 0.5, 0.02, 0.66, 0, (i - 2) * 0.05, 0);
    for (let i = 0; i < 3; i++) mp.add(GEO.box, 0xdedad2, -0.6, 1.02 + i * 0.012, -2.55, 0.62, 0.012, 0.46, 0, 0.22, 0);
    // hat + coats already by the door; add a boot tray and a folded high chair
    m.add(GEO.box, 0x4a4238, 7.4, 0.05, 6.6, 1.0, 0.1, 0.6);
    m.add(GEO.box, 0x6b4f33, 7.15, 0.2, 6.6, 0.22, 0.3, 0.34);
    m.add(GEO.box, 0x6b4f33, 7.6, 0.2, 6.6, 0.22, 0.3, 0.34);
    m.add(GEO.box, PAL.wood, -11.7, 0.55, 5.4, 0.5, 1.1, 0.5, 0.2);
    // a fly strip nobody wants to talk about
    m.add(GEO.cyl, 0xd8c078, -6.2, 2.42, -5.6, 0.05, 0.55, 0.05);
    // the view out the windows — worth the polygons now that you can see it
    for (const [mx, mz, s, c] of [[-16, -24, 9, PAL.mountain], [-2, -28, 12, PAL.mountainFar], [12, -25, 10, PAL.mountain], [24, -29, 13, PAL.mountainFar], [-27, -26, 11, PAL.mountainFar], [4, -22, 7, PAL.mountain]])
      m.add(GEO.cone, c, mx, s * 0.32, mz, s, s * 0.8, s);
    m.add(GEO.box, 0x9aae86, 0, -0.3, -14, 90, 0.4, 16);                    // meadow beyond the lot
    m.add(GEO.box, 0x8d8f8a, 0, -0.16, -9.4, 40, 0.3, 4.6);                 // gravel lot
    // ⚠️ pines live BEHIND the strip and out on the flanks. They used to stand
    // at z −12.5…−17.7 across the middle — which is exactly where the road and
    // the storefronts are now, so the town was hidden in a forest.
    for (let i = 0; i < 14; i++) {
      const flank = i % 2 ? 1 : -1;
      const px = flank * (30 + (i % 5) * 4.5) + (i % 3) * 2.2;
      const pz = -11 - (i % 4) * 3.4, s = 0.8 + (i % 4) * 0.22;
      m.add(GEO.cyl, PAL.woodDark, px, 0.7 * s, pz, 0.2, 1.5 * s, 0.2);
      m.add(GEO.cone, i % 2 ? 0x4f6f46 : 0x5c7a52, px, 2.2 * s, pz, 1.5 * s, 2.8 * s, 1.5 * s);
    }
    for (let i = 0; i < 10; i++) {  // treeline on the ridge behind the town
      const px = -34 + i * 7.6 + (i % 3) * 1.8, pz = -21.5 - (i % 3) * 1.8, s = 1.1 + (i % 3) * 0.3;
      m.add(GEO.cyl, PAL.woodDark, px, 0.7 * s, pz, 0.2, 1.5 * s, 0.2);
      m.add(GEO.cone, i % 2 ? 0x46603f : 0x536e4a, px, 2.2 * s, pz, 1.5 * s, 2.8 * s, 1.5 * s);
    }
    m.add(GEO.box, 0x9a4a32, -6.5, 0.55, -9.6, 1.9, 0.9, 4.2);              // a truck in the lot
    m.add(GEO.box, 0x8a3f28, -6.5, 1.25, -10.4, 1.7, 0.7, 1.7);
    const grain = texFrom(grainTex(), 0.5);
    const room = mp.build({ r: 0.92, cast: true, tex: grain, bump: 0.05 });
    const timber = mw.build({ r: 0.72, cast: true, tex: texFrom(woodTex(), 0.45), bump: 0.09 });
    const floor = fl.build({ r: 0.78, cast: false, tex: texFrom(tileTex(), 1), bump: 0.03 });
    // ⚠️ metalness this high with only a small procedural env renders BLACK —
    // a metal's colour comes entirely from what it reflects. Half-metal plus a
    // boosted env intensity keeps the steel reading as steel.
    const metal = mt.build({ r: 0.34, m: 0.45, cast: true, tex: texFrom(brushTex(), 0.6), bump: 0.02 });
    metal.material.envMapIntensity = 1.6;
    const glow = gl.build({ r: 0.4, e: 1.9, recv: false });
    this.scene.add(room, timber, floor, metal, glow);
    // glass: pie dome + the door's screen — transparent, so it draws last
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.06, metalness: 0, transmission: 0 });
    const dome = mesh(GEO.sph, glass, 3.4, 1.1, -2.6, 0.86, 0.72, 0.86);
    dome.renderOrder = 6;
    this.scene.add(dome);
    // dynamic bits
    this.signPlate = mesh(GEO.box, M(0xc44536), LAYOUT.sign.x, 1.35, LAYOUT.sign.z + 0.2, 0.85, 0.5, 0.08);
    const signPost = mesh(GEO.cyl, M(PAL.woodDark), LAYOUT.sign.x, 0.8, LAYOUT.sign.z + 0.2, 0.08, 1.6, 0.08);
    this.scene.add(this.signPlate, signPost);
    const hotMat = () => new THREE.MeshStandardMaterial({ color: 0xd8481c, emissive: new THREE.Color(0xff5a26), emissiveIntensity: 0.75, roughness: 0.55, transparent: true, opacity: 0.75 });
    this.glowGriddle = mesh(GEO.box, hotMat(), -8, 1.07, -6.1, 2.3, 0.02, 0.7); this.glowGriddle.visible = false;
    this.glowPan = mesh(GEO.box, hotMat(), -5.5, 1.09, -6.1, 1.0, 0.02, 0.7); this.glowPan.visible = false;
    this.scene.add(this.glowGriddle, this.glowPan);
    // glare haze IN the opening — thin and translucent, so it blooms without
    // hiding the mountains behind it
    this.windowGlow = [];
    for (const wx of [-9, -4, 1]) {
      const gm = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: new THREE.Color(0xfff0d0), emissiveIntensity: 1.7, transparent: true, opacity: 0.13, depthWrite: false });
      const g2 = mesh(GEO.box, gm, wx, 1.72, -7.1, 2.6, 1.5, 0.02);
      g2.renderOrder = 5;
      this.windowGlow.push(g2); this.scene.add(g2);
    }
    // the tray rack: a peg and three trays at the east end of the pass —
    // where the runner's loop starts
    const rack = new THREE.Group();
    rack.position.set(LAYOUT.trayRack.x, 0, LAYOUT.trayRack.z);
    rack.add(mesh(GEO.cyl, M(0x5a3a24), 0, 1.22, 0, 0.07, 0.5, 0.07));
    for (let i = 0; i < 3; i++) rack.add(mesh(GEO.cyl, M(i % 2 ? 0x6b4a2e : 0x7a5438, { r: 0.6 }), 0, 1.02 + i * 0.075, 0, 0.72, 0.05, 0.72));
    castAll(rack);
    this.scene.add(rack);
    this.plateStack = mesh(GEO.cyl, M(PAL.white), LAYOUT.shelf.x, 1.4, LAYOUT.shelf.z - 0.5, 0.62, 0.5, 0.62);
    this.dirtyStack = mesh(GEO.cyl, M(0xb8a27e), LAYOUT.sink.x - 0.35, 1.1, LAYOUT.sink.z - 0.3, 0.5, 0.3, 0.5);
    this.extMesh = this.buildItem({ k: 'ext' }); this.extMesh.position.set(LAYOUT.extHook.x, 1.35, -6.8);
    // the mop BUCKET station: a yellow janitor bucket out in the open where
    // nothing else competes for the E press — the mop stands in it when home
    const bucket = new THREE.Group();
    bucket.position.set(LAYOUT.mopHook.x, 0, LAYOUT.mopHook.z);
    bucket.add(mesh(GEO.cyl, M(0xe8b53a, { r: 0.6 }), 0, 0.24, 0, 0.56, 0.48, 0.56));
    bucket.add(mesh(GEO.cyl, M(0xc49222), 0, 0.47, 0, 0.6, 0.05, 0.6));
    bucket.add(mesh(GEO.cyl, M(0x35424e, { r: 0.3 }), 0, 0.45, 0, 0.46, 0.03, 0.46)); // grey water
    bucket.add(mesh(GEO.box, M(0xb0b6bc, { r: 0.4, m: 0.5 }), 0, 0.5, 0.26, 0.34, 0.1, 0.14)); // wringer
    bucket.add(blob(0.4));
    castAll(bucket);
    this.scene.add(bucket);
    this.mopMesh = stripBlob(this.buildItem({ k: 'mop' }));
    this.mopMesh.position.set(LAYOUT.mopHook.x - 0.08, 0.3, LAYOUT.mopHook.z + 0.05);
    this.mopMesh.rotation.z = 0.3; this.mopMesh.rotation.x = -0.12;
    this.scene.add(this.plateStack, this.dirtyStack, this.extMesh, this.mopMesh);
    this.spillMeshes = new Map();
    this.bubbles = new Map();
    this.buildYard();
    this.buildTown();
    this.buildLife();
  }

  // ── ELKHORN, MONTANA (pop. 743 and falling) ────────────────────────────────
  // Everything past the glass. Static strip + a living road + the gentrification
  // staging: as 🏙️ climbs, the TOWN changes while your diner stays the same.
  // That contrast is the whole game, so it is built to be seen from a stool.
  buildTown() {
    const t = new Merger();       // painted/rough town surfaces
    const tg = new Merger(false); // town glow (windows, signs) — no baked AO
    const ROAD = -13.2, WALK = -15.6, FRONT = -17.2;
    // highway + shoulder + centre dashes
    t.add(GEO.box, 0x4a4a50, 0, -0.14, ROAD, 90, 0.3, 4.2);
    t.add(GEO.box, 0x8d8f8a, 0, -0.15, ROAD - 2.6, 90, 0.3, 1.2);
    t.add(GEO.box, 0x8d8f8a, 0, -0.15, ROAD + 2.6, 90, 0.3, 1.2);
    for (let x = -44; x < 44; x += 4) t.add(GEO.box, 0xe8d98a, x, -0.12, ROAD, 1.7, 0.3, 0.16);
    t.add(GEO.box, 0xb8b2a4, 0, -0.13, WALK, 90, 0.3, 1.6);   // far sidewalk
    // ── the strip. Each storefront is a box + roof + awning + a lit window.
    // ⚠️ these read from 20 units away through a 2.7-wide window: pale, evenly
    // lit boxes turn to mush. Weathered wood, a dark plinth, a shadowed
    // recess and a saturated awning are what make them read as BUILDINGS.
    // ⚠️⚠️ THE FACADE FACES THE DINER. `FRONT` is the block's CENTRE, so the
    // side you can see from a stool is FRONT **+** half-depth. Building the
    // shopfronts at FRONT − 2.2 put every awning, sign and window on the back
    // wall and left the town as blank tan boxes — which is exactly what it
    // looked like. South-facing is +z here.
    const shop = (x, w, h, body, roof, awn, sign, signCol) => {
      const F = FRONT + 2.2;                                                     // the face you see
      t.add(GEO.box, body, x, h / 2, FRONT, w, h, 4.4);
      t.add(GEO.box, 0x5a5148, x, 0.22, F + 0.01, w, 0.44, 0.14);                // dark plinth
      t.add(GEO.box, roof, x, h + 0.2, FRONT, w + 0.6, 0.4, 4.9);                // heavy cornice
      t.add(GEO.box, 0x3f3a34, x, h * 0.36, F - 0.04, w * 0.72, h * 0.42, 0.1);  // shopfront recess
      tg.add(GEO.box, 0xffd489, x, h * 0.34, F + 0.04, w * 0.5, h * 0.24, 0.1);  // lit glass
      t.add(GEO.box, awn, x, h * 0.6, F + 0.25, w * 0.9, 0.24, 1.3);             // awning, projecting
      t.add(GEO.box, 0x2e2a26, x, h * 0.49, F + 0.3, w * 0.9, 0.1, 1.3);         // its shadow line
      for (const px of [-w * 0.42, w * 0.42]) t.add(GEO.cyl, 0x6b5540, x + px, h * 0.3, F + 0.25, 0.07, h * 0.6, 0.07);
      if (sign) {
        t.add(GEO.box, signCol, x, h * 0.86, F + 0.06, w * 0.74, h * 0.22, 0.16);
        t.add(GEO.box, 0xe8e0cc, x, h * 0.86, F + 0.15, w * 0.5, h * 0.07, 0.06); // lettering bar
      }
    };
    // gas station (west end): canopy on posts + the tall price sign
    t.add(GEO.box, 0xc0baa8, -25, 1.5, FRONT, 5, 3, 4);
    t.add(GEO.box, 0xa8321f, -25, 3.3, FRONT, 5.6, 0.56, 4.4);
    tg.add(GEO.box, 0xffe0a0, -25, 1.2, FRONT + 2.05, 3.2, 1.5, 0.1);
    t.add(GEO.box, 0xe4e0d6, -19.5, 2.6, ROAD - 2.2, 7.5, 0.4, 5);        // pump canopy
    for (const px of [-22.6, -16.4]) for (const pz of [ROAD - 4.2, ROAD - 0.4]) t.add(GEO.cyl, 0xb8b2a4, px, 1.3, pz, 0.22, 2.6, 0.22);
    for (const px of [-21, -18]) { t.add(GEO.box, 0xdcd6c8, px, 0.55, ROAD - 2.2, 0.5, 1.1, 0.9); t.add(GEO.box, 0x9a3a2a, px, 1.18, ROAD - 2.2, 0.54, 0.2, 0.94); }
    t.add(GEO.cyl, 0xb8b2a4, -14.5, 3.2, ROAD - 3.4, 0.2, 6.4, 0.2);      // sign pole
    t.add(GEO.box, 0xf0ece2, -14.5, 6.6, ROAD - 3.4, 2.6, 1.9, 0.2);
    tg.add(GEO.box, 0xc44536, -14.5, 7.05, ROAD - 3.5, 2.2, 0.7, 0.1);
    // the strip proper (x from west to east)
    shop(-9, 5.4, 3.4, 0x9a7448, 0x4f3a26, 0x8a3428, 1, 0x4a2c1e);        // HARDWARE (gentrifies)
    shop(-2.4, 4.6, 3.0, 0xb0a488, 0x5f5340, 0x35603a, 1, 0x27401f);      // feed & seed
    shop(4.5, 5.2, 3.2, 0xa2947c, 0x4f3a26, 0x2a4a7a, 1, 0x1f3352);       // laundromat
    // motel: long low block + a tall neon-ish sign
    t.add(GEO.box, 0xa89c86, 14, 1.5, FRONT + 0.6, 9, 3, 4);
    t.add(GEO.box, 0x5f5340, 14, 3.2, FRONT + 0.6, 9.6, 0.42, 4.5);
    t.add(GEO.box, 0x4a4238, 14, 0.24, FRONT + 2.62, 9, 0.48, 0.14);
    for (let i = 0; i < 4; i++) tg.add(GEO.box, 0xffe0a8, 10.6 + i * 2.2, 1.4, FRONT + 2.65, 0.9, 1.1, 0.12);
    for (let i = 0; i < 4; i++) t.add(GEO.box, 0x4a4238, 10.6 + i * 2.2, 1.4, FRONT + 2.6, 1.1, 1.3, 0.1);
    t.add(GEO.cyl, 0xb8b2a4, 20.5, 3.4, ROAD - 3.2, 0.22, 6.8, 0.22);
    this.motelSign = mesh(GEO.box, M(0x3a5a8a, { e: 0.55 }), 20.5, 7.0, ROAD - 3.2, 3.2, 2.1, 0.22);
    this.scene.add(this.motelSign);
    // power poles + the wire sag
    for (let i = -4; i <= 4; i++) {
      const px = i * 11;
      t.add(GEO.cyl, 0x6b5540, px, 3.4, ROAD + 2.9, 0.18, 6.8, 0.18);
      t.add(GEO.box, 0x6b5540, px, 6.3, ROAD + 2.9, 2.2, 0.16, 0.16);
      if (i < 4) for (let k = 0; k < 5; k++) {
        const f = k / 4, x0 = px, x1 = px + 11;
        const wx = x0 + (x1 - x0) * f, sag = Math.sin(f * Math.PI) * 0.5;
        t.add(GEO.box, 0x3a3630, wx, 6.22 - sag, ROAD + 2.9, 11 / 4 + 0.1, 0.05, 0.05);
      }
    }
    // water tower on the ridge
    t.add(GEO.cyl, 0xb0b8b4, -30, 8.4, -23, 2.6, 3.2, 2.6);
    t.add(GEO.cone, 0xa0a8a4, -30, 10.4, -23, 2.7, 1.4, 2.7);
    for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) t.add(GEO.cyl, 0x9aa29e, -30 + lx, 3.4, -23 + lz, 0.16, 6.8, 0.16);
    this.scene.add(t.build({ r: 0.9, cast: false, recv: false }));
    // ⚠️ the town's windows are EMISSIVE WHITE. Left at full strength they
    // bloom into one flat band and erase the whole strip in daylight — the
    // lights have to come on with the evening, which is what they'd do anyway.
    this.townGlow = tg.build({ r: 0.5, e: 1.5, recv: false });
    // ⚠️ Merger's `e` option hard-codes emissive to WHITE, so a "warm" vertex
    // colour still glows like a searchlight. Retint it to sodium-lamp amber.
    this.townGlow.material.emissive.setHex(0xffb45e);
    this.scene.add(this.townGlow);

    // ── the living road: trucks and cars that actually pass ──────────────────
    this.traffic = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const body = mesh(GEO.box, M(0x9a4a32), 0, 0.62, 0, 4.2, 0.78, 1.9);
      const cab = mesh(GEO.box, M(0x8a3f28), -0.9, 1.28, 0, 1.7, 0.68, 1.8);
      const glass = mesh(GEO.box, M(0xbcd8e0, { r: 0.2, m: 0.4 }), -0.9, 1.34, 0, 1.5, 0.4, 1.62);
      g.add(body, cab, glass);
      for (const [wx, wz] of [[-1.3, -0.95], [-1.3, 0.95], [1.3, -0.95], [1.3, 0.95]])
        g.add(mesh(GEO.cyl, M(0x2c2c30), wx, 0.34, wz, 0.4, 0.26, 0.4, 0, 0, Math.PI / 2));
      g.userData = { body, cab, t: -1 };
      g.visible = false;
      this.scene.add(g);
      this.traffic.push(g);
    }
    this.trafficT = 1 + Math.random() * 3;
    // ── people on the far sidewalk (small, distant, but they MOVE) ───────────
    this.walkers = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const coat = mesh(GEO.box, M([0x5b7292, 0x9d4e35, 0x4f7a4a, 0x6a6a62][i % 4]), 0, 0.62, 0, 0.42, 0.78, 0.3);
      const head = mesh(GEO.sph, M(PAL.skin[i % 4]), 0, 1.16, 0, 0.34, 0.34, 0.34);
      const legL = mesh(GEO.box, M(0x3a3f4a), -0.1, 0.16, 0, 0.15, 0.5, 0.15);
      const legR = mesh(GEO.box, M(0x3a3f4a), 0.1, 0.16, 0, 0.15, 0.5, 0.15);
      g.add(coat, head, legL, legR);
      g.userData = { legL, legR, ph: Math.random() * 6.28, t: -1 };
      g.visible = false;
      this.scene.add(g);
      this.walkers.push(g);
    }
    this.walkerT = 2 + Math.random() * 4;

    // ── THE GENTRIFICATION STAGES ───────────────────────────────────────────
    // Keyed to the 🏙️ meter. Your diner never changes. The town does.
    const stage = (at, build) => { const g = new THREE.Group(); build(g); g.visible = false; this.scene.add(g); return { at, g }; };
    this.gentStages = [
      // 18 — the hardware store loses its lease
      stage(18, g => {
        g.add(mesh(GEO.box, M(0xf0ece2), -9, 2.0, FRONT + 2.32, 2.1, 1.2, 0.1));
        g.add(mesh(GEO.box, M(0xc44536), -9, 2.32, FRONT + 2.38, 1.8, 0.28, 0.06));
        g.add(mesh(GEO.box, M(0xc44536), -9, 1.86, FRONT + 2.38, 1.5, 0.22, 0.06));
      }),
      // 34 — scaffolding goes up on the feed store
      stage(34, g => {
        for (const px of [-4.3, -0.5]) g.add(mesh(GEO.cyl, M(0xc9c2b0), px, 1.9, FRONT + 2.6, 0.09, 3.8, 0.09));
        for (const py of [1.1, 2.2, 3.3]) g.add(mesh(GEO.box, M(0xc9c2b0), -2.4, py, FRONT + 2.6, 4.1, 0.1, 0.1));
        g.add(mesh(GEO.box, M(0x8fb8ad, { t: 0.55 }), -2.4, 2.2, FRONT + 2.66, 4.0, 3.4, 0.05));
      }),
      // 50 — the hardware store is now a juice bar
      stage(50, g => {
        g.add(mesh(GEO.box, M(0xf4f0e6), -9, 1.7, FRONT + 2.26, 5.0, 3.2, 0.16));   // white reface
        g.add(mesh(GEO.box, M(0x9fd8b4), -9, 1.9, FRONT + 2.5, 4.7, 0.26, 1.2));    // pale green awning
        g.add(mesh(GEO.box, M(0x2c3a30, { e: 0.4 }), -9, 2.72, FRONT + 2.38, 3.4, 0.66, 0.12));
        g.add(mesh(GEO.box, M(0xbfe8cc, { e: 0.9 }), -9, 2.72, FRONT + 2.46, 2.6, 0.2, 0.06));
      }),
      // 66 — a crane, and the frame of something taller than anything in town.
      // It goes up on the EAST end of the strip, in frame from the dining room.
      stage(66, g => {
        g.add(mesh(GEO.cyl, M(0xe8b53a), 25, 7, -18.6, 0.34, 14, 0.34));
        g.add(mesh(GEO.box, M(0xe8b53a), 22.4, 13.4, -18.6, 9.5, 0.34, 0.34));
        g.add(mesh(GEO.box, M(0xe8b53a), 27.6, 13.9, -18.6, 0.3, 1.3, 0.3));
        g.add(mesh(GEO.box, M(0x3a3630), 19.4, 12.4, -18.6, 0.05, 2.2, 0.05));
        g.add(mesh(GEO.box, M(0x8a8f98), 19.4, 11.0, -18.6, 1.2, 0.7, 1.2));
        for (let f = 0; f < 3; f++) {
          g.add(mesh(GEO.box, M(0xa8a49a), 25, 1.4 + f * 2.6, -18.6, 8.5, 0.28, 5));
          for (const cx of [21.2, 25, 28.8]) g.add(mesh(GEO.cyl, M(0x9a968c), cx, 1.4 + f * 2.6 + 1.3, -18.6, 0.22, 2.6, 0.22));
        }
      }),
      // 82 — the banner, the boutique, and the SUVs have arrived
      stage(82, g => {
        g.add(mesh(GEO.box, M(0xf4f0e6), 25, 9.6, -16.2, 9, 3.4, 0.14));
        g.add(mesh(GEO.box, M(0x3a5a8a, { e: 0.35 }), 25, 10.2, -16.12, 7.6, 1.1, 0.08));
        g.add(mesh(GEO.box, M(0xc9a227, { e: 0.3 }), 25, 8.9, -16.12, 5.2, 0.6, 0.08));
        for (let f = 3; f < 5; f++) {
          g.add(mesh(GEO.box, M(0xa8a49a), 25, 1.4 + f * 2.6, -18.6, 8.5, 0.28, 5));
          for (const cx of [21.2, 25, 28.8]) g.add(mesh(GEO.cyl, M(0x9a968c), cx, 1.4 + f * 2.6 + 1.3, -18.6, 0.22, 2.6, 0.22));
        }
        // two spotless SUVs where the ranch trucks used to park
        for (const [sx, sc] of [[-3.5, 0xf0ece2], [-0.6, 0x2c3038]]) {
          g.add(mesh(GEO.box, M(sc), sx, 0.78, -9.8, 2.0, 0.9, 4.2));
          g.add(mesh(GEO.box, M(sc), sx, 1.42, -9.4, 1.85, 0.5, 2.6));
          g.add(mesh(GEO.box, M(0xbcd8e0, { r: 0.2, m: 0.4 }), sx, 1.44, -9.4, 1.7, 0.4, 2.4));
          for (const [wx, wz] of [[-0.85, -1.5], [0.85, -1.5], [-0.85, 1.5], [0.85, 1.5]])
            g.add(mesh(GEO.cyl, M(0x22222a), sx + wx, 0.4, -9.8 + wz, 0.42, 0.24, 0.42, 0, 0, Math.PI / 2));
        }
      }),
    ];
    for (const s of this.gentStages) castAll(s.g);
  }

  /** Light the room for the day and the hour. `dy` is the shift number (1-3),
   *  `f` the 0→1 drift across that shift. Every value is a lerp between the
   *  slot's opening and closing look, so nothing ever pops. */
  applyDay(dy, f, dt) {
    const A = DAY_ARC[Math.min(DAY_ARC.length - 1, Math.max(0, dy - 1))];
    const L = (a, b) => a + (b - a) * f;
    // rain flattens and cools everything; snow lifts the ambient (white ground)
    const wet = this._wxKind === 'rain' ? 1 : 0, snow = this._wxKind === 'snow' ? 1 : 0;
    this.sun.color.setHex(A.sunA).lerp(this._cB.setHex(A.sunB), f);
    if (wet) this.sun.color.lerp(this._cB.setHex(0x9fb0c4), 0.45);
    this.sun.intensity = L(A.sunIA, A.sunIB) * (wet ? 0.5 : 1) * (snow ? 0.8 : 1);
    this.sun.position.set(L(A.pA[0], A.pB[0]), L(A.pA[1], A.pB[1]), L(A.pA[2], A.pB[2]));
    this.hemi.intensity = L(A.hemA, A.hemB) * (wet ? 0.85 : 1) + snow * 0.15;
    this.amb.intensity = L(A.ambA, A.ambB) + wet * 0.06 + snow * 0.05;
    this._cB2.setHex(A.skyA).lerp(this._cB.setHex(A.skyB), f);
    if (wet) this._cB2.lerp(this._cB.setHex(0x8d9aa8), 0.5);
    if (snow) this._cB2.lerp(this._cB.setHex(0xc8cdd4), 0.45);
    this.scene.background.copy(this._cB2);
    this.scene.fog.color.copy(this._cB2);
    // The practicals carry the room once the sun leaves it. ⚠️ this is a
    // COOKING game — Sunday night still has to be readable enough to tell a
    // burger from a trout, so the interior floor is deliberately generous.
    const dark = Math.max(0, Math.min(1, (1 - L(A.sunIA, A.sunIB) / 2.1)));
    this.pass1.intensity = 0.9 + dark * 2.3;
    this.pass2.intensity = 0.7 + dark * 2.0;
    this.amb.intensity += dark * 0.16;
    this.hemi.intensity += dark * 0.12;
    if (this.windowGlow) for (const g of this.windowGlow) g.material.opacity = 0.13 * (1 - dark * 0.85);
    // Elkhorn turns its lights on as the sun goes: invisible at noon, the whole
    // strip glowing by last call on Sunday. Kept low — it is a warm glow behind
    // glass, not a light source in the room.
    if (this.townGlow) this.townGlow.material.emissiveIntensity = 0.03 + dark * 0.8;
    if (this.motelSign) this.motelSign.material.emissiveIntensity = 0.1 + dark * 1.1;
    this._night = dark;
  }

  /** Rain and snow, seen through the glass. Sim-chosen per shift so every
   *  client sees the same weather; view-only motion. */
  ensureWeather() {
    if (this.wxPoints) return;
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -26 + Math.random() * 52;
      pos[i * 3 + 1] = Math.random() * 11;
      pos[i * 3 + 2] = -8.5 - Math.random() * 15;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.wxMat = new THREE.PointsMaterial({ color: 0xd8e4ee, size: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
    this.wxPoints = new THREE.Points(g, this.wxMat);
    this.wxPoints.visible = false;
    this.wxPoints.frustumCulled = false;
    this.scene.add(this.wxPoints);
    this.wxDrift = new Float32Array(N);
    for (let i = 0; i < N; i++) this.wxDrift[i] = Math.random() * 6.28;
  }
  updateWeather(dt) {
    const kind = this.snap ? (this.snap.wx || 'clear') : 'clear';
    this._wxKind = kind;
    if (kind === 'clear') { if (this.wxPoints) this.wxPoints.visible = false; return; }
    this.ensureWeather();
    this.wxPoints.visible = true;
    const rain = kind === 'rain';
    this.wxMat.size = rain ? 0.075 : 0.16;
    this.wxMat.opacity = rain ? 0.45 : 0.8;
    this.wxMat.color.setHex(rain ? 0xbcd0e0 : 0xfdfdff);
    const p = this.wxPoints.geometry.attributes.position;
    const fall = rain ? 17 : 1.6;
    const t = performance.now() / 1000;
    for (let i = 0; i < p.count; i++) {
      p.array[i * 3 + 1] -= fall * dt;
      if (!rain) {
        p.array[i * 3] += Math.sin(t * 0.7 + this.wxDrift[i]) * dt * 0.7;
        p.array[i * 3 + 2] += Math.cos(t * 0.5 + this.wxDrift[i]) * dt * 0.3;
      } else p.array[i * 3] -= dt * 1.6;
      if (p.array[i * 3 + 1] < -0.4) {
        p.array[i * 3] = -26 + Math.random() * 52;
        p.array[i * 3 + 1] = 10 + Math.random() * 2;
        p.array[i * 3 + 2] = -8.5 - Math.random() * 15;
      }
    }
    p.needsUpdate = true;
  }

  // traffic, pedestrians, and the town's slow surrender to money
  updateTown(dt, snap) {
    if (!this.traffic) return;
    const ROAD = -13.2, WALK = -15.6;
    // gentrification staging (snap.gn is the 🏙️ meter)
    const gn = snap ? snap.gn : 0;
    for (const s of this.gentStages) {
      const want = gn >= s.at;
      if (s.g.visible !== want) {
        s.g.visible = want;
        if (want && this.onGentStage) this.onGentStage(s.at);
      }
    }
    if (this.motelSign) this.motelSign.material.color.setHex(gn >= 82 ? 0xc9a227 : 0x3a5a8a);
    // traffic
    this.trafficT -= dt;
    if (this.trafficT <= 0) {
      this.trafficT = 3 + Math.random() * 7;
      const free = this.traffic.find(v => !v.visible);
      if (free) {
        const east = Math.random() < 0.5;
        const gentrified = (snap ? snap.gn : 0) >= 66 && Math.random() < 0.5;
        const col = gentrified ? [0xf0ece2, 0x2c3038, 0x8a8f98][Math.floor(Math.random() * 3)]
          : [0x9a4a32, 0x4f6f46, 0x6b5540, 0x8a7a5a][Math.floor(Math.random() * 4)];
        free.userData.body.material = M(col);
        free.userData.cab.material = M(col);
        free.visible = true;
        free.position.set(east ? -46 : 46, 0, east ? ROAD + 1.05 : ROAD - 1.05);
        free.rotation.y = east ? Math.PI / 2 : -Math.PI / 2;
        free.userData.v = (east ? 1 : -1) * (7 + Math.random() * 5);
      }
    }
    for (const v of this.traffic) {
      if (!v.visible) continue;
      v.position.x += v.userData.v * dt;
      if (v.position.x > 48 || v.position.x < -48) v.visible = false;
    }
    // pedestrians
    this.walkerT -= dt;
    if (this.walkerT <= 0) {
      this.walkerT = 6 + Math.random() * 12;
      const free = this.walkers.find(w => !w.visible);
      if (free) {
        const east = Math.random() < 0.5;
        free.visible = true;
        free.position.set(east ? -34 : 34, 0, WALK + (Math.random() - 0.5) * 0.5);
        free.rotation.y = east ? Math.PI / 2 : -Math.PI / 2;
        free.userData.v = (east ? 1 : -1) * (1.1 + Math.random() * 0.5);
      }
    }
    for (const w of this.walkers) {
      if (!w.visible) continue;
      w.position.x += w.userData.v * dt;
      w.userData.ph += dt * 7;
      w.userData.legL.rotation.x = Math.sin(w.userData.ph) * 0.6;
      w.userData.legR.rotation.x = -Math.sin(w.userData.ph) * 0.6;
      w.position.y = Math.abs(Math.sin(w.userData.ph)) * 0.03;
      if (w.position.x > 36 || w.position.x < -36) w.visible = false;
    }
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
    // the pig pen: posts, rails, mud, and a gate that the director rattles
    const pen = new THREE.Group();
    const P = LAYOUT.pigPen;
    const mud = mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: 0x6b4a34, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mud.rotation.x = -Math.PI / 2; mud.scale.setScalar(P.r * 2); mud.position.set(P.x, 0.005, P.z);
    pen.add(mud);
    const N = 8;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const px = P.x + Math.sin(a) * P.r, pz = P.z + Math.cos(a) * P.r;
      if (Math.abs(pz - LAYOUT.pigGate.z) < 0.9 && Math.abs(px - LAYOUT.pigGate.x) < 1.2) continue; // the gate spans here
      pen.add(mesh(GEO.cyl, M(PAL.woodDark), px, 0.4, pz, 0.09, 0.8, 0.09));
      const a2 = ((i + 1) / N) * Math.PI * 2;
      const qx = P.x + Math.sin(a2) * P.r, qz = P.z + Math.cos(a2) * P.r;
      const mx = (px + qx) / 2, mz = (pz + qz) / 2, len = Math.hypot(qx - px, qz - pz);
      if (!(Math.abs(mz - LAYOUT.pigGate.z) < 0.9 && Math.abs(mx - LAYOUT.pigGate.x) < 1.2)) {
        for (const ry of [0.28, 0.58]) pen.add(mesh(GEO.box, M(PAL.wood), mx, ry, mz, len, 0.06, 0.06, Math.atan2(qx - px, qz - pz) + Math.PI / 2));
      }
    }
    this.gateMesh = new THREE.Group();
    this.gateMesh.position.set(LAYOUT.pigGate.x - 0.55, 0, LAYOUT.pigGate.z);
    const gatePanel = new THREE.Group();
    for (const ry of [0.22, 0.45, 0.68]) gatePanel.add(mesh(GEO.box, M(0x8a5a3a), 0.55, ry, 0, 1.1, 0.07, 0.06));
    gatePanel.add(mesh(GEO.box, M(0x8a5a3a), 0.55, 0.45, 0, 0.08, 0.55, 0.07, 0.6));
    this.gateMesh.add(gatePanel);
    this.gatePanel = gatePanel;
    pen.add(this.gateMesh);
    castAll(pen);
    this.scene.add(pen);
    this.pigM = new Map();
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
      hub.add(mesh(GEO.sph, M(PAL.woodDark), 0, 0, 0, 0.28, 0.16, 0.28));
      // ⚠️ blades need PITCH: a dead-flat blade goes invisible edge-on twice a
      // revolution and strobes — it reads as broken the moment it spins. Each
      // blade lives in its own yaw group, offset radially, tipped ~14° about
      // its long axis, with a wooden finger joining it to the hub.
      for (let i = 0; i < 4; i++) {
        const bg = new THREE.Group();
        bg.rotation.y = i * Math.PI / 2;
        const blade = mesh(GEO.box, M(PAL.wood), 0, 0, 0.66, 0.3, 0.035, 0.92);
        blade.rotation.x = 0.24;
        const arm = mesh(GEO.box, M(PAL.woodDark), 0, 0, 0.16, 0.07, 0.05, 0.34);
        bg.add(blade, arm);
        hub.add(bg);
      }
      fan.add(hub); fan.position.set(fx, 2.6, fz);
      fan.userData.hub = hub;
      this.scene.add(fan); this.fans.push(fan);
    }
    // golden shafts from the windows + dust motes
    // sun shafts: a hard-edged additive quad reads as a rendering artifact, so
    // fade the edges out in the texture and keep the opacity very low
    const shCv = document.createElement('canvas'); shCv.width = 64; shCv.height = 64;
    const sx2 = shCv.getContext('2d');
    const sgr = sx2.createLinearGradient(0, 0, 0, 64);
    sgr.addColorStop(0, 'rgba(255,232,180,0.9)'); sgr.addColorStop(1, 'rgba(255,232,180,0)');
    sx2.fillStyle = sgr; sx2.fillRect(0, 0, 64, 64);
    sx2.globalCompositeOperation = 'destination-in';
    const sgr2 = sx2.createLinearGradient(0, 0, 64, 0);
    sgr2.addColorStop(0, 'rgba(0,0,0,0)'); sgr2.addColorStop(0.5, 'rgba(0,0,0,1)'); sgr2.addColorStop(1, 'rgba(0,0,0,0)');
    sx2.fillStyle = sgr2; sx2.fillRect(0, 0, 64, 64);
    const shTex = new THREE.CanvasTexture(shCv);
    const shaftMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (const wx of [-9, -4, 1]) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), shaftMat);
      sh.position.set(wx, 1.4, -5.4); sh.rotation.x = -1.12;
      sh.renderOrder = 4;
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
    e.m.position.set(x, 2.25, z); e.m.visible = true; e.t = 1.7;
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
    const g = human({
      shirt: PAL.white, sleeve: PAL.white, pants: 0x4a5a6a, shoe: 0x3a2f28,
      skin: PAL.skin[color % 4], apron: PAL.aprons[color % 4], hat: 'paper',
      hair: [0x4a3a2c, 0x7a5a3a, 0x2c2620, 0xb08a4a][color % 4],
      brow: 0x5a4030, mouth: 0.13, badge: true,
    });
    if (name) g.add(nameSprite(name));
    return castAll(g);
  }
  buildCustomer(ty, id) {
    const skin = PAL.skin[id % 4];
    const HAIR = [0x4a3a2c, 0x2c2620, 0xb08a4a, 0x7a5a3a, 0x8a4a3a];
    const hair = HAIR[id % HAIR.length];
    // one silhouette per archetype — you should know who just walked in from
    // across the room, before you can read a single ticket
    const K = {
      flock: { shirt: PAL.flock[id % 3], pants: 0x2c3038, shoe: PAL.white, hair, pony: true, glasses: 0x3a3f4a, mouth: 0.1 },
      camper: { shirt: id % 2 ? PAL.flannel : 0x4f7a4a, pants: 0x8a7a5a, shoe: 0x5a4030, hair, hat: 'cap', hatC: id % 2 ? 0xc44536 : 0x3a5a8a, brow: 0x5a4030 },
      squatter: { shirt: PAL.gray, pants: 0x3a3f4a, shoe: PAL.white, hair, hoodie: PAL.gray, mouth: 0.09, scale: 1.06 },
      zillow: { shirt: PAL.zillow[id % 2], pants: 0xc4b48a, shoe: 0x6b4f33, hair, brow: 0x5a4030, mouth: 0.11 },
      dale: { shirt: PAL.denim, pants: PAL.denim, shoe: 0x5a3a24, hair: 0x9a9a92, hat: 'cowboy', hatC: PAL.hatBrown, beard: 0xd8d2c8, mouth: 0 },
      kale: { shirt: 0x9caf88, pants: 0x6a6a62, shoe: 0xd8d2c8, hair: 0x4a3a2c, bun: true, glasses: 0xc9a227, brow: 0x4a3a2c, mouth: 0.1 },
      sequoia: { shirt: 0xc47a5a, pants: 0x2c3038, shoe: PAL.white, hair, pony: true, vest: 0xf2ece2, hat: 'band', hatC: 0xe8e2d6, mouth: 0.11 },
      larper: { shirt: 0x7a4a8a, pants: PAL.denim, shoe: 0x5a3a24, hair, hat: 'cowboy', hatC: 0xd8bc8a, brow: 0x5a4030, mouth: 0.12 },
      inspector: { shirt: 0x8a8a76, pants: 0x4a4f5c, shoe: 0x2c2620, hair: 0x4a3a2c, glasses: 0x3a3f4a, mouth: 0.08, brow: 0x3a2c20 },
    }[ty] || { shirt: PAL.gray, pants: 0x4a5a6a, shoe: 0x3a2f28, hair, brow: 0x5a4030 };
    // ── per-person variation, derived from the id so it is stable ───────────
    // Height, build, eye spacing, brow angle and mouth width all shift, plus a
    // small tint on the shirt. Same archetype, different human.
    const V = n => (id * 2654435761 >>> ((n * 7) % 20)) % 1000 / 1000;
    K.scale = (K.scale ?? 1) * (0.93 + V(1) * 0.15);
    K.girth = 0.9 + V(2) * 0.28;
    K.eyeGap = 0.125 + V(3) * 0.032;
    K.browTilt = (V(4) - 0.5) * 0.5;
    if (K.mouth !== 0) K.mouth = 0.09 + V(5) * 0.07;
    if (K.shirt != null) { const c = new THREE.Color(K.shirt); c.offsetHSL((V(6) - 0.5) * 0.05, (V(7) - 0.5) * 0.16, (V(8) - 0.5) * 0.14); K.shirt = c.getHex(); }
    if (V(9) > 0.72 && !K.hoodie && !K.vest) K.scarf = [0x9d4e35, 0x3f5f3a, 0x8a5a8a, 0xc9a227][id % 4];
    if (ty === 'camper' && V(10) > 0.5) K.pack = [0x4f6f46, 0x8a4a3a, 0x3a5a8a][id % 3];
    const g = human(Object.assign({ skin }, K));
    const u = g.userData;
    u.ty = ty;
    u.hat = K.hat === 'cowboy' ? u.head.children[1] : null;   // the yee-haw tips it
    if (ty === 'larper') u.head.add(mesh(GEO.box, M(PAL.white), 0.52, 0.14, 0.22, 0.13, 0.17, 0.02)); // $200 tag still on
    if (ty === 'squatter') {                                   // laptop he will not close
      const lap = mesh(GEO.box, M(0xd0d4d8, { r: 0.4, m: 0.3 }), 0, 1.06, 0.42, 0.46, 0.05, 0.32);
      const scr = mesh(GEO.box, M(0x9fd8ff, { e: 0.9 }), 0, 1.2, 0.54, 0.46, 0.28, 0.03);
      scr.rotation.x = -0.5; g.add(lap, scr);
    }
    if (ty === 'flock') {                                      // phone up, always
      u.armR.rotation.x = -1.9;
      const ph = mesh(GEO.box, M(0x4a5060, { r: 0.3, m: 0.4 }), 0, -0.5, 0.16, 0.11, 0.2, 0.04);
      const sc = mesh(GEO.box, M(0xbfe8ff, { e: 0.9 }), 0, -0.5, 0.19, 0.09, 0.17, 0.01);
      u.armR.add(ph, sc);
    }
    if (ty === 'sequoia') {                                    // filming your flat-top
      u.armR.rotation.x = -2.5;
      const cam = mesh(GEO.box, M(0x3a3f4a, { r: 0.3, m: 0.4 }), 0, -0.52, 0.08, 0.12, 0.22, 0.04);
      const scr = mesh(GEO.box, M(0xbfe8ff, { e: 0.9 }), 0, -0.52, 0.055, 0.1, 0.19, 0.01);
      u.armR.add(cam, scr);
    }
    if (ty === 'inspector') {                                  // the clipboard, mid-note
      u.armL.rotation.x = -1.15;
      const cb = mesh(GEO.box, M(0xe8e2d4, { r: 0.9 }), 0, -0.52, 0.12, 0.26, 0.32, 0.03);
      cb.rotation.x = 0.5;
      const pen = mesh(GEO.box, M(0xc49222), 0.1, -0.5, 0.16, 0.03, 0.14, 0.03);
      pen.rotation.x = 0.5;
      u.armL.add(cb, pen);
      u.armLFixed = true;
    }
    if (ty === 'zillow' && id % 2 === 0) u.armR.rotation.x = -1.35; // pointing at the fixtures
    return castAll(g);
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
    else if (kind === 'tray') {
      g.add(mesh(GEO.cyl, M(0x6b4a2e, { r: 0.6 }), 0, 0.03, 0, 0.72, 0.05, 0.72));
      g.add(mesh(GEO.cyl, M(0x8a5a3a, { r: 0.55 }), 0, 0.055, 0, 0.62, 0.02, 0.62));
      for (const a of [0, 1.57, 3.14, 4.71]) g.add(mesh(GEO.box, M(0x5a3a24), Math.sin(a) * 0.33, 0.07, Math.cos(a) * 0.33, 0.1, 0.05, 0.04, a));
    }
    else if (kind === 'gun') {
      // Hazel's varmint gun: side-by-side, older than the diner
      g.add(mesh(GEO.cyl, M(0x5a5f66, { r: 0.35, m: 0.5 }), 0.12, 0.1, -0.05, 0.05, 0.9, 0.05, Math.PI / 2, 0, 0));
      g.add(mesh(GEO.cyl, M(0x5a5f66, { r: 0.35, m: 0.5 }), 0.12, 0.1, 0.05, 0.05, 0.9, 0.05, Math.PI / 2, 0, 0));
      g.add(mesh(GEO.box, M(0x6b4a2e, { r: 0.6 }), -0.32, 0.08, 0, 0.34, 0.12, 0.1));
      g.add(mesh(GEO.box, M(0x5a3a24), -0.12, 0.05, 0, 0.14, 0.08, 0.09));
    }
    else if (kind === 'mop') {
      const stick = mesh(GEO.cyl, M(0x8a7a5a), 0, 0.55, 0, 0.05, 1.1, 0.05);
      g.add(stick);
      g.add(mesh(GEO.box, M(0xd8d2c4, { r: 0.95 }), 0, 0.06, 0, 0.3, 0.12, 0.2));
      for (const dx of [-0.1, 0, 0.1]) g.add(mesh(GEO.cyl, M(0xc4bcac, { r: 0.95 }), dx, 0.03, 0.06, 0.05, 0.1, 0.05));
    }
    if (kind !== 'shard') g.add(blob(kind === 'plate' || kind === 'dish' ? 0.3 : 0.22));
    return g;
  }
  itemKey(it) { return it.k + '|' + (it.d || 0) + '|' + (it.s || 0) + '|' + (it.m || 0); }

  // ── order bubbles: the ticket floats over the TABLE, readable across the
  // room (last-local's world markers — you read the floor, not the rail)
  syncBubbles(snap) {
    const DISH_EMO = { flapjacks: '🥞', burger: '🍔', trout: '🐟', coffee: '☕', matcha: '🍵', '?': '❓' };
    const seen = new Set();
    for (const t of snap.tk) {
      const pos = t.tb != null ? LAYOUT.tables[t.tb] : (t.sl != null ? LAYOUT.stools[t.sl] : null);
      if (!pos) continue;
      const un = t.ln.filter(l => !l.ok);
      if (!un.length) continue;
      seen.add(t.i);
      const sig = un.map(l => l.d).join(',') + '|' + Math.round(t.pa * 24);
      let b = this.bubbles.get(t.i);
      if (b && b.sig === sig) continue;
      if (b) this.scene.remove(b.g);
      const g = new THREE.Group();
      g.position.set(pos.x, t.tb != null ? 2.2 : 2.05, pos.z);
      const n = Math.min(un.length, 4);
      un.slice(0, 4).forEach((l, i) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(DISH_EMO[l.d] || '❓'), transparent: true, depthWrite: false, depthTest: false }));
        sp.scale.set(0.62, 0.62, 1);
        sp.position.x = (i - (n - 1) / 2) * 0.56;
        sp.renderOrder = 6;
        g.add(sp);
      });
      // patience bar: green → amber → red, always camera-facing (sprites)
      const w = Math.max(0.55, n * 0.5);
      const barBack = new THREE.Sprite(new THREE.SpriteMaterial({ map: barTexture(0x2c2620), transparent: true, opacity: 0.6, depthWrite: false, depthTest: false }));
      barBack.scale.set(w, 0.07, 1); barBack.position.y = -0.36; barBack.renderOrder = 6;
      const col = t.pa > 0.5 ? 0x5c9e4f : t.pa > 0.25 ? 0xe8b53a : 0xd94f38;
      const barFront = new THREE.Sprite(new THREE.SpriteMaterial({ map: barTexture(col), depthWrite: false, depthTest: false }));
      barFront.scale.set(Math.max(0.02, w * t.pa), 0.085, 1); barFront.position.set(-(w * (1 - t.pa)) / 2, -0.36, 0); barFront.renderOrder = 7;
      g.add(barBack, barFront);
      this.scene.add(g);
      this.bubbles.set(t.i, { g, sig });
    }
    for (const [id, b] of this.bubbles) if (!seen.has(id)) { this.scene.remove(b.g); this.bubbles.delete(id); }
  }

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
      const ck = (p.h ? this.itemKey(p.h) : (p.dc ? 'CU' : '')) + '|' + (p.xs || []).map(m => this.itemKey(m)).join(',');
      if (ck !== v.carryKey) {
        if (v.carryKey !== null) v.g.userData.reachT = 0.32;   // grabbing/placing gets a reach
        v.carryKey = ck;
        const slot = v.g.userData.carry;
        while (slot.children.length) slot.remove(slot.children[0]);
        if (p.h) {
          slot.add(stripBlob(this.buildItem(p.h)));
          const onTray = p.h.k === 'tray';
          (p.xs || []).forEach((m, ix) => {
            const im = stripBlob(this.buildItem(m));
            if (onTray) { const tp = TRAY_SPOTS[ix] || [0, 0.07 + 0.16 * ix, 0]; im.position.set(tp[0], tp[1], tp[2]); }
            else { im.position.y = 0.18 * (ix + 1); im.rotation.y = (ix + 1) * 0.4; }
            slot.add(im);
          });
        }
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
    // spills: dark wet decals — polygonOffset, never a raised y (the AoT law)
    if (snap.spl) {
      const seenS = new Set();
      for (const s of snap.spl) {
        seenS.add(s.i);
        if (!this.spillMeshes.has(s.i)) {
          const g = new THREE.Group();
          const mat = new THREE.MeshBasicMaterial({ color: 0x35424e, transparent: true, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });
          const d1 = mesh(GEO.disc, mat); d1.rotation.x = -Math.PI / 2; d1.scale.set(1.15, 0.9, 1);
          const d2b = mesh(GEO.disc, mat); d2b.rotation.x = -Math.PI / 2; d2b.scale.set(0.7, 0.85, 1); d2b.position.set(0.35, 0, 0.2);
          const sh = mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.18, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false }));
          sh.rotation.x = -Math.PI / 2; sh.scale.set(0.6, 0.45, 1); sh.position.set(-0.1, 0, -0.08);
          d1.renderOrder = 2; d2b.renderOrder = 2; sh.renderOrder = 3;
          g.add(d1, d2b, sh);
          g.position.set(s.x, 0.001, s.z);
          g.rotation.y = (s.i % 7) * 0.9;
          this.scene.add(g); this.spillMeshes.set(s.i, g);
        }
      }
      for (const [id, g] of this.spillMeshes) if (!seenS.has(id)) { this.scene.remove(g); this.spillMeshes.delete(id); }
    }
    if (this.mopMesh) this.mopMesh.visible = !snap.mo;
    // pigs
    if (snap.pg && this.pigM) {
      const seenPg = new Set();
      for (const q of snap.pg) {
        seenPg.add(q.i);
        let v = this.pigM.get(q.i);
        if (!v) {
          const g = new THREE.Group();
          const body = mesh(GEO.box, M(0xe8a8b8, { r: 0.85 }), 0, 0.3, 0, 0.62, 0.4, 0.44);
          const snout = mesh(GEO.box, M(0xd98a9c), 0, 0.28, 0.26, 0.18, 0.15, 0.1);
          g.add(body, snout);
          for (const dx of [-0.17, 0.17]) g.add(mesh(GEO.cone, M(0xd98a9c), dx, 0.53, 0.1, 0.13, 0.16, 0.1));
          for (const [lx, lz] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.14], [0.2, 0.14]]) g.add(mesh(GEO.cyl, M(0xd98a9c), lx, 0.09, lz, 0.09, 0.18, 0.09));
          g.add(mesh(GEO.cyl, M(0xd98a9c), 0, 0.42, -0.26, 0.05, 0.16, 0.05, 0, 0, 0.9));
          g.add(blob(0.36));
          g.userData = { body, ph: Math.random() * 6.28 };
          castAll(g);
          this.scene.add(g);
          v = { g }; this.pigM.set(q.i, v);
        }
        const g = v.g;
        g.position.x += (q.x - g.position.x) * 0.4;
        g.position.z += (q.z - g.position.z) * 0.4;
        g.position.y = q.y || 0;
        g.rotation.y = q.yw || 0;
        const u = g.userData;
        u.ph += 0.28;
        if (q.et) { g.rotation.x = 0.35 + Math.sin(u.ph * 2.4) * 0.08; }          // nose down, munching
        else if (q.st === 'held') { g.rotation.x = 0; g.rotation.z = Math.sin(u.ph) * 0.16; } // squirming
        else { g.rotation.x = 0; g.rotation.z = Math.sin(u.ph) * 0.05; }
      }
      for (const [id, v] of this.pigM) if (!seenPg.has(id)) { this.scene.remove(v.g); this.pigM.delete(id); }
    }
    if (this.gatePanel) this.gatePanel.rotation.y += (((snap.gt ? -1.9 : 0)) - this.gatePanel.rotation.y) * 0.2; // broken = swung open
    this.syncBubbles(snap);
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
    if (e.k === 'yeetf') this.shake(0.16);
    if (e.k === 'landf') { this.shake(0.22); for (let i = 0; i < 4; i++) this.puff(this.smoke, e.x, 0.15, e.z, { life: 0.5, v: 1.8, vy: 0.7, s: 0.3 }); }
    if (e.k === 'splash') { this.shake(0.2); for (let i = 0; i < 9; i++) this.puff(this.foam, e.x, 0.3, e.z, { life: 0.8, v: 2.6, vy: 3.2, s: 0.22 }); }
    if (e.k === 'slip') { for (let i = 0; i < 3; i++) this.puff(this.pop, e.x, 0.3, e.z, { life: 0.5, v: 2.2, vy: 1.6, s: 0.35 }); }
    if (e.k === 'tumble') this.shake(0.12);
    if (e.k === 'traydump') { this.shake(0.2); for (let i = 0; i < 6; i++) { const p = this.puff(this.pop, e.x, 0.5, e.z, { life: 0.8, v: 3.4, vy: 2.8, s: 0.5 }); p.m.rotation.set(Math.random() * 3, Math.random() * 3, 0); } }
    if (e.k === 'barge') { this.shake(0.18); for (let i = 0; i < 4; i++) this.puff(this.smoke, e.x, 0.4, e.z, { life: 0.5, v: 2, vy: 1, s: 0.3 }); }
    if (e.k === 'helpup') this.emote('🤝', e.x, e.z);
    if (e.k === 'subok') this.emote('🤫', e.x, e.z);
    if (e.k === 'subfail') this.emote('😤', e.x, e.z);
    if (e.k === 'callout') { const ic = { fire: '🔥', bus: '🚌', squat: '🧳', hands: '🆘', table: '🗒️', mess: '🧹', plates: '🍽️', need: '🙋' }[e.w] || '🙋'; this.emote(ic, e.x, e.z); }
    if (e.k === 'ability') { const ic = { hazel: '🏠', buck: '💪', june: '⚡', reed: '🎵' }[e.e] || '✨'; this.emote(ic, e.x, e.z); }
    if (e.k === 'boom') {
      this.shake(0.55);
      for (let i = 0; i < 10; i++) this.puff(this.smoke, e.x, 1.3, e.z, { life: 1.1, v: 3.2, vy: 1.8, s: 0.5 });
      for (let i = 0; i < 5; i++) this.puff(this.pop, e.x, 1.3, e.z, { life: 0.4, v: 5, vy: 2.5, s: 0.3 });
    }
    if (e.k === 'gunclick') this.emote('…', e.x, e.z);
    if (e.k === 'gatebreak') this.shake(0.18);
    if (e.k === 'pigate') { for (let i = 0; i < 3; i++) this.puff(this.pop, e.x, 0.3, e.z, { life: 0.5, v: 1.6, vy: 1.4, s: 0.25 }); }
    if (e.k === 'pigevidence') this.emote('🐷', e.x, e.z);
    if (e.k === 'pigsquirm') this.emote('🐷', e.x, e.z);
    if (e.k === 'pigyeet') this.shake(0.14);
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
      const own = seat === this.you && myPred && !d.sn && !d.ar && !(d.cb >= 0);
      if (own) { tx = myPred.x; tz = myPred.z; fx = myPred.fx; fz = myPred.fz; }
      g.position.x += (tx - g.position.x) * (own ? 1 : lerpK);
      g.position.z += (tz - g.position.z) * (own ? 1 : lerpK);
      const targetYaw = Math.atan2(fx, fz);
      g.rotation.y += shortest(g.rotation.y, targetYaw) * lerpK;
      const u = g.userData;
      const moving = d.mv || (own && myPred.mv);
      u.ph += dt * (moving ? 11 : 2.2);
      // body states: airborne cartwheels, carried slumps, stunned sees stars, stacks lean
      if (d.ar) { g.position.y = d.y || 0.5; g.rotation.z += dt * 8; }
      else if (d.cb >= 0) { g.position.y = 0.85; g.rotation.z += (1.35 - g.rotation.z) * lerpK; u.armL.rotation.x = Math.sin(t * 13) * 1.1; u.armR.rotation.x = -Math.sin(t * 13) * 1.1; }
      else {
        g.rotation.z += ((d.wb ? Math.sin(t * 12) * 0.3 * d.wb : 0) - g.rotation.z) * Math.min(1, dt * 9);
        g.position.y = moving ? Math.abs(Math.sin(u.ph)) * 0.06 : 0;
        if (d.sn) { g.rotation.z = Math.sin(t * 20) * 0.12; if (Math.random() < 0.05) this.emote('💫', g.position.x, g.position.z); }
      }
      if (d.so && Math.random() < 0.1) this.puff(this.steam, g.position.x, 0.6, g.position.z, { life: 0.7, v: 0.4, vy: -0.2, s: 0.09 });
      if (!u.micS) {
        u.micS = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('🔊'), transparent: true, depthWrite: false }));
        u.micS.scale.set(0.5, 0.5, 1); u.micS.position.y = 2.5; u.micS.visible = false; g.add(u.micS);
      }
      u.micS.visible = !!(this.speakSet && this.speakSet.has(seat));
      const inert = d.ar || d.cb >= 0;
      const carrying = !!d.h || !!d.dc;
      alive(u, g, dt, lerpK, null);
      if (d.ar) {
        // thrown: arms and legs flail — a rigid spinning body isn't funny
        const f = t * 17 + u.ph;
        u.armL.rotation.x = Math.sin(f) * 1.5 - 0.6; u.armR.rotation.x = Math.sin(f + 2.1) * 1.5 - 0.6;
        u.armL.rotation.z = 0.5; u.armR.rotation.z = -0.5;
        setLegs(u, Math.sin(f + 1) * 0.9, Math.sin(f + 3.4) * 0.9, 1, true);
      } else if (d.cb >= 0) {
        const f = t * 13 + u.ph;
        u.armL.rotation.x = Math.sin(f) * 1.2; u.armR.rotation.x = -Math.sin(f) * 1.2;
        setLegs(u, Math.sin(f + 1.7) * 0.7, -Math.sin(f + 1.7) * 0.7, 1, true);
      } else {
        u.armL.rotation.z *= 0.85; u.armR.rotation.z *= 0.85;
        // busy = a working pose: both arms out, pumping (pour, pick, scrub, sweep)
        const work = d.b ? -1.25 + Math.sin(t * 9) * 0.22 : null;
        const reach = u.reachT > 0 ? -1.75 : null;
        const armT = work ?? reach ?? (carrying ? -1.5 : d.sp ? -1.1 : moving ? Math.sin(u.ph) * 0.7 : 0.08);
        const armT2 = work ?? reach ?? (carrying ? -1.5 : d.sp ? -1.1 : moving ? -Math.sin(u.ph) * 0.7 : -0.08);
        u.armL.rotation.x += (armT - u.armL.rotation.x) * lerpK * 1.6;
        u.armR.rotation.x += (armT2 - u.armR.rotation.x) * lerpK * 1.6;
        const legT = moving ? Math.sin(u.ph) * 0.8 : 0;
        setLegs(u, legT, -legT, Math.min(1, lerpK * 1.8), moving);
      }
      u.carry.rotation.z = Math.sin(t * 12) * (d.wb || 0) * 0.5;
      u.head.rotation.z = Math.sin(u.ph * 0.5) * 0.05;
      if (!moving && !d.b && !inert) g.position.y += Math.sin(u.breath) * 0.008;
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
    // ── what the room is looking at ────────────────────────────────────────
    // One scene-wide "drama" point, in the order a person would actually care:
    // fire, then livestock indoors, then somebody airborne. When it exists the
    // WHOLE room turns to watch, which is the single most alive thing a crowd
    // can do — and it means your disasters have an audience.
    const dsnap = this.snap;
    let drama = null;
    if (dsnap) {
      if (dsnap.fi && dsnap.fi.length) drama = { x: dsnap.fi[0].x, z: dsnap.fi[0].z, y: 1.4, kind: 'fire' };
      else if (dsnap.pg) { const pin = dsnap.pg.find(q => q.in); if (pin) drama = { x: pin.x, z: pin.z, y: 0.5, kind: 'pig' }; }
      if (!drama && dsnap.pl) { const fly = dsnap.pl.find(q => q.ar); if (fly) drama = { x: fly.x, z: fly.z, y: 1.6, kind: 'fly' }; }
    }
    if (drama && drama.kind !== this._dramaKind) { this._dramaKind = drama.kind; this._dramaT = 2.2; }
    else if (!drama) this._dramaKind = null;
    if (this._dramaT > 0) this._dramaT -= dt;
    // whoever is nearest gets looked at — customers track the staff, which is
    // most of what makes a room feel occupied rather than decorated
    let nearestCook = null;
    for (const [, pv] of this.pl) if (pv.d && !pv.d.off) nearestCook = nearestCook || pv.g.position;
    for (const [, v] of this.cu) {
      const g = v.g, d = v.d; if (!d) continue;
      g.position.x += (d.x - g.position.x) * lerpK;
      g.position.z += (d.z - g.position.z) * lerpK;
      const u = g.userData;
      let lookAt = null;
      // drama outranks everything: the whole room rubbernecks
      if (drama && d2(drama.x, drama.z, g.position.x, g.position.z) < 13 * 13) {
        lookAt = drama;
        if (this._dramaT > 0 && !v.reacted) {
          v.reacted = 1;
          this.emote(drama.kind === 'fire' ? '😱' : drama.kind === 'pig' ? '🐷' : '😮', g.position.x, g.position.z);
        }
      } else if (['sit', 'wait', 'squat'].includes(d.st)) {
        v.reacted = 0;
        let best = null, bd = 7 * 7;
        for (const [, pv] of this.pl) {
          if (!pv.d || pv.d.off) continue;
          const dd = d2(pv.g.position.x, pv.g.position.z, g.position.x, g.position.z);
          if (dd < bd) { bd = dd; best = pv.g.position; }
        }
        // nobody serving them? talk to whoever they came in with. Seatmates
        // turning to each other is what makes a full table look like a party
        // instead of two strangers facing the same wall.
        if (!best) {
          v.chatT = (v.chatT || 0) - dt;
          if (v.chatT <= 0) { v.chatT = 3 + Math.random() * 5; v.chatOn = !v.chatOn; }
          if (v.chatOn) {
            for (const [, ov] of this.cu) {
              if (ov === v || !ov.d || ov.d.i === d.i) continue;
              if (ov.d.st !== d.st) continue;
              if (d2(ov.g.position.x, ov.g.position.z, g.position.x, g.position.z) < 2.2 * 2.2) { best = ov.g.position; break; }
            }
          }
        }
        lookAt = best;
      } else if (d.st === 'eat' && v.food) { v.reacted = 0; lookAt = v.food.position; }
      else v.reacted = 0;
      alive(u, g, dt, lerpK, lookAt);
      if (d.st === 'drag') { g.rotation.z += (1.35 - g.rotation.z) * lerpK; g.position.y = 0.5; u.armL.rotation.x = Math.sin(t * 14) * 1.2; u.armR.rotation.x = -Math.sin(t * 14) * 1.2; }
      else if (d.st === 'air') { g.rotation.z += dt * 9; g.position.y = d.y; }
      else {
        // a seated body drops so the hips meet the seat, not floats above it
        g.rotation.z *= 0.85; g.position.y += ((['sit', 'wait', 'eat', 'squat', 'sitT'].includes(d.st) ? -0.27 : 0) - g.position.y) * lerpK;
        g.rotation.y += shortest(g.rotation.y, d.yw) * lerpK;
        u.ph += dt * (d.st === 'enter' || d.st === 'leave' || d.st === 'wander' || d.st === 'reseat' ? 9 : 1.6);
        const walking = ['enter', 'leave', 'wander', 'reseat'].includes(d.st);
        const armFixed = u.ty === 'sequoia' || u.ty === 'flock' || u.ty === 'zillow';
        if (walking) {
          g.position.y += Math.abs(Math.sin(u.ph)) * 0.05;
          if (!u.armLFixed) u.armL.rotation.x = Math.sin(u.ph) * 0.5;
          if (!armFixed) u.armR.rotation.x = -Math.sin(u.ph) * 0.5;
          setLegs(u, Math.sin(u.ph) * 0.62, -Math.sin(u.ph) * 0.62, lerpK, true);
        } else {
          // seated: thighs forward off the hip, shins folded back down at the knee
          const seated = ['sit', 'wait', 'eat', 'squat'].includes(d.st);
          setLegs(u, seated ? -1.45 : 0, seated ? -1.45 : 0, lerpK, false, seated ? 1.45 : 0);
          if (!armFixed) { u.armL.rotation.x *= 0.9; u.armR.rotation.x *= 0.9; }
        }
        // per-archetype idles: the bit each one is famous for, in motion
        if (d.st === 'eat') {
          const bite = (Math.sin(t * 1.7 + u.ph) + 1) * 0.5;          // fork up, chew, fork down
          u.armR.rotation.x = -0.5 - bite * 1.5;
          u.head.rotation.x += Math.sin(t * 6) * 0.06 * bite;
        } else if (u.ty === 'squatter') {
          u.armL.rotation.x = -1.25 + Math.sin(t * 11) * 0.09;        // typing, forever
          u.armR.rotation.x = -1.25 + Math.sin(t * 11 + 1.6) * 0.09;
        } else if (u.ty === 'dale' && v.mug) {
          const sip = Math.max(0, Math.sin(t * 0.5 + u.ph));          // coffee. black.
          u.armR.rotation.x = -0.2 - sip * sip * 1.9;
        } else if (u.ty === 'flock') {
          u.armR.rotation.x = -1.9 + Math.sin(t * 2.3 + u.ph) * 0.07; // scrolling
        } else if (u.ty === 'sequoia') {
          u.armR.rotation.x = -2.5 + Math.sin(t * 1.1) * 0.05;        // panning the shot
        } else if (u.ty === 'inspector') {
          u.armL.rotation.x = -1.15 + Math.sin(t * 9 + u.ph) * 0.04;  // scribbling, always
          u.armR.rotation.x = Math.max(u.armR.rotation.x, -0.4);
        }
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
    for (const f of this.fans) f.userData.hub.rotation.y += dt * 2.4; // lazy diner speed
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
    // ── the day arc: three shifts, three times of day ──────────────────────
    // Friday morning → Saturday afternoon → Sunday dusk. Each shift also drifts
    // within its own slot, so the light is never once static.
    const dayTgt = this.simPh === 'shift' ? Math.min(1, this.simT / C.SHIFT_LEN) : (this.simPh === 'lobby' || this.simPh === 'count') ? 0 : 1;
    this._dayF += (dayTgt - this._dayF) * Math.min(1, dt * 0.5);
    this.applyDay(this.snap ? (this.snap.dy || 1) : 1, this._dayF, dt);
    this.updateTown(dt, this.snap);
    this.updateWeather(dt);
    if (this.snap && this.snap.fi && this.snap.fi.length) {
      const f0 = this.snap.fi[0];
      this.fireLight.position.set(f0.x, 1.5, f0.z);
      this.fireLight.intensity = 1.1 + Math.random() * 0.7;
    } else this.fireLight.intensity = 0;
    // ---- camera ---------------------------------------------------------------
    const meV = this.you >= 0 ? this.pl.get(this.you) : null;
    const meD = meV && meV.d;
    const firstPerson = this.fp && meV && meD;
    if (firstPerson) {
      const px = meV.g.position.x, pz = meV.g.position.z;
      const moving = meD.mv || (myPred && myPred.mv);
      this.bob += dt * (moving ? (this.sprinting ? 13.5 : 10) : 1.6);
      const amt = moving ? 1 : 0.12;
      let eye = 1.52 + Math.sin(this.bob * 2) * 0.032 * amt;
      let roll = Math.sin(this.bob) * 0.014 * amt;
      let pitch = this.look.pitch;
      if (meD.cb >= 0) { eye = 1.18; roll = 1.2; }                       // slung over a shoulder
      else if (meD.ar) { this.airRoll = (this.airRoll || 0) + dt * 7.5; eye = 0.75 + (meD.y || 0); roll = this.airRoll; }
      else if (meD.sn) { eye = 0.6; roll = 0.55; pitch = Math.min(pitch, -0.2); } // face down on the tile
      else this.airRoll = 0;
      this.camera.position.set(px, eye, pz);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(pitch, this.look.yaw, roll);
      const wantFov = this.fovBase + (this.sprinting && moving ? 6 : 0);
      if (Math.abs(this.camera.fov - wantFov) > 0.05) { this.camera.fov += (wantFov - this.camera.fov) * Math.min(1, dt * 6); this.camera.updateProjectionMatrix(); }
      meV.g.visible = false;                                             // no floating torso
      this.hands.visible = !(meD.ar || meD.cb >= 0);
      this.setHandItem(meD.h, meD.xs);
    } else {
      this.hands.visible = false;
      if (meV) meV.g.visible = !(meD && meD.off);
      let target = meV ? meV.g.position : null;
      if (target) {
        this.camTgt.lerp(new THREE.Vector3(target.x * 0.9, 0, target.z * 0.88 + 0.3), Math.min(1, dt * 4.5));
        this.camPos.lerp(new THREE.Vector3(this.camTgt.x, 8.4, this.camTgt.z + 6.4), Math.min(1, dt * 4.5));
      } else {
        this.camTgt.lerp(new THREE.Vector3(0, 0, 0.5), dt);
        this.camPos.lerp(new THREE.Vector3(0, 15.5, 12), dt);
      }
      this.camera.position.copy(this.camPos);
      this.camera.rotation.set(0, 0, 0);
      this.camera.lookAt(this.camTgt.x, 0.4, this.camTgt.z);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / 0.45) * (this.shakeA || 0);
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * k;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    // the ceiling only exists for the first-person eye; from above it's a lid
    if (this.ceiling) this.ceiling.visible = firstPerson;
    // keep the shadow frustum centred on the action so texels stay dense
    this.sun.position.set(this.camera.position.x - 9, 13, this.camera.position.z + 6);
    this.sun.target.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.sun.target.updateMatrixWorld();
    if (this.signFlipT > 0) {
      this.signFlipT -= dt;
      this.signPlate.rotation.x = Math.max(0, this.signFlipT) / 0.7 * Math.PI * 2;
    }
    if (this.post) this.post.render(t); else this.renderer.render(this.scene, this.camera);
  }
}
function shortest(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
// hip + knee in one call; snap while walking, ease into a held pose otherwise
function setLegs(u, l, r, k, snap, knee = 0) {
  if (!u.legL) return;
  if (snap) { u.legL.rotation.x = l; u.legR.rotation.x = r; }
  else { u.legL.rotation.x += (l - u.legL.rotation.x) * k; u.legR.rotation.x += (r - u.legR.rotation.x) * k; }
  const kl = u.legL.userData.knee, kr = u.legR.userData.knee;
  if (kl) { const t = snap ? Math.max(0, -l) * 0.55 : knee; kl.rotation.x += (t - kl.rotation.x) * (snap ? 1 : k); }
  if (kr) { const t = snap ? Math.max(0, -r) * 0.55 : knee; kr.rotation.x += (t - kr.rotation.x) * (snap ? 1 : k); }
}
// eyes + brow: cheap, and in first person you are two feet from these faces
function face(head, opt = {}) {
  const eyeW = opt.w ?? 0.1, ey = opt.y ?? 0.02, ez = opt.z ?? 0.46;
  for (const s of [-1, 1]) {
    head.add(mesh(GEO.sph, M(PAL.white, { r: 0.4 }), s * 0.17, ey, ez, eyeW, eyeW * 1.15, eyeW * 0.7));
    head.add(mesh(GEO.sph, M(0x22222a, { r: 0.35 }), s * 0.17 + (opt.gaze || 0), ey, ez + 0.04, eyeW * 0.55, eyeW * 0.62, eyeW * 0.5));
    if (opt.brow) head.add(mesh(GEO.box, M(opt.brow), s * 0.17, ey + 0.13, ez, 0.14, 0.035, 0.05));
  }
  if (opt.mouth) head.add(mesh(GEO.box, M(0x8a4a44, { r: 0.5 }), 0, -0.17, ez - 0.02, opt.mouth, 0.035, 0.04));
}
function castAll(g) { g.traverse(o => { if (o.isMesh && o.material !== shadowMat) o.castShadow = true; }); return g; }
// ── the day arc ─────────────────────────────────────────────────────────────
// One entry per shift of the season: Friday MORNING, Saturday AFTERNOON,
// Sunday DUSK. A/B are the look at the open and at last call; everything
// between is a lerp, so the light moves the whole time you're working.
const DAY_ARC = [
  { // FRIDAY — cold early light, sun low in the east, long shadows west
    sunA: 0xffd9a8, sunB: 0xfff0d0, sunIA: 1.45, sunIB: 2.05,
    pA: [14, 6.5, 3], pB: [6, 12, 4],
    hemA: 1.0, hemB: 1.15, ambA: 0.5, ambB: 0.56,
    skyA: 0xb6d2ea, skyB: 0xd6e4ee,
  },
  { // SATURDAY — high flat noon sliding into the gold
    sunA: 0xfff4dc, sunB: 0xffcf94, sunIA: 2.1, sunIB: 1.75,
    pA: [2, 14.5, 5], pB: [-9, 8.5, 6],
    hemA: 1.15, hemB: 1.0, ambA: 0.56, ambB: 0.5,
    skyA: 0xbcd8ee, skyB: 0xf2cf9e,
  },
  { // SUNDAY — dusk to dark. The room stops being lit from outside at all.
    sunA: 0xff9a52, sunB: 0x6a5f8a, sunIA: 1.25, sunIB: 0.3,
    pA: [-12, 5.5, 6], pB: [-19, 1.2, 7],
    hemA: 0.9, hemB: 0.52, ambA: 0.5, ambB: 0.54,
    skyA: 0xefa06b, skyB: 0x2b3350,
  },
];
// where loaded items sit on a carried tray (flat triangle, not a vertical armload)
const TRAY_SPOTS = [[0, 0.07, 0.1], [-0.2, 0.07, -0.12], [0.2, 0.07, -0.12]];
// tiny solid-colour textures for billboard bars (patience under order bubbles)
const barCache = new Map();
function barTexture(color) {
  if (!barCache.has(color)) {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    const g = c.getContext('2d');
    g.fillStyle = '#' + color.toString(16).padStart(6, '0');
    g.fillRect(0, 0, 8, 8);
    barCache.set(color, new THREE.CanvasTexture(c));
  }
  return barCache.get(color);
}

// ---- the humanoid ----------------------------------------------------------
// One builder for cooks and customers: torso + hips + two-segment arms with
// hands + legs with shoes + a head that carries its own face. Each limb is a
// merged mesh under an animation pivot, so a whole person is ~7 draw calls.
const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0 });
function limb(parts, px, py, pz) {
  const g = new THREE.Group();
  const mg = new Merger(false);
  for (const p of parts) mg.add(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8] || 0, p[9] || 0, p[10] || 0);
  g.add(mg.build({ mat: charMat, cast: true }));
  g.position.set(px, py, pz);
  return g;
}
function human(o) {
  const g = new THREE.Group();
  const skin = o.skin ?? PAL.skin[0];
  const shirt = o.shirt ?? 0x9aa0a8, pants = o.pants ?? 0x4a5a6a, shoe = o.shoe ?? 0x3a2f28;
  const S = o.scale ?? 1;
  const G = o.girth ?? 1;   // per-person build: nobody is the same shape
  // ---- torso (static) ----
  const b = new Merger(false);
  b.add(GEO.box, pants, 0, 0.74, 0, 0.46 * G, 0.3, 0.34 * G);               // hips
  b.add(GEO.box, shirt, 0, 1.06, 0, 0.54 * G, 0.48, 0.38 * G);              // chest
  b.add(GEO.box, shirt, 0, 1.28, 0, 0.58 * G, 0.14, 0.4 * G);               // shoulders
  b.add(GEO.cyl, skin, 0, 1.38, 0, 0.19, 0.14, 0.19);                       // neck
  if (o.scarf) { b.add(GEO.box, o.scarf, 0, 1.33, 0, 0.5, 0.16, 0.42); b.add(GEO.box, o.scarf, 0.12, 1.16, 0.21, 0.13, 0.34, 0.06); }
  if (o.pack) { b.add(GEO.box, o.pack, 0, 1.06, -0.26, 0.42, 0.5, 0.18); b.add(GEO.box, 0x3a3630, 0, 1.2, -0.34, 0.3, 0.1, 0.06); }
  if (o.apron) {                                                            // cook's apron + straps
    b.add(GEO.box, o.apron, 0, 0.92, 0.21, 0.44, 0.78, 0.05);
    b.add(GEO.box, o.apron, -0.13, 1.24, 0.2, 0.09, 0.2, 0.05);
    b.add(GEO.box, o.apron, 0.13, 1.24, 0.2, 0.09, 0.2, 0.05);
    b.add(GEO.box, o.apron, 0, 0.92, -0.2, 0.5, 0.09, 0.04);                // waist tie
  }
  if (o.vest) {                                                             // puffer vest, quilted
    for (let i = 0; i < 3; i++) b.add(GEO.box, o.vest, 0, 0.92 + i * 0.19, 0, 0.6, 0.17, 0.45);
  }
  if (o.hoodie) {                                                           // hood bunched at the neck
    b.add(GEO.sph, o.hoodie, 0, 1.34, -0.16, 0.5, 0.36, 0.4);
    b.add(GEO.box, o.hoodie, 0, 1.1, 0.2, 0.5, 0.4, 0.06);
  }
  if (o.badge) b.add(GEO.box, PAL.white, 0.17, 1.14, 0.2, 0.13, 0.08, 0.03);
  const body = b.build({ mat: charMat, cast: true });
  g.add(body);
  // ---- head ----
  const head = new THREE.Group();
  const h = new Merger(false);
  h.add(GEO.sph, skin, 0, 0, 0, 0.58, 0.56, 0.56);
  if (o.hair) {
    h.add(GEO.sph, o.hair, 0, 0.16, -0.03, 0.6, 0.36, 0.58);
    if (o.pony) h.add(GEO.sph, o.hair, 0, 0.05, -0.34, 0.22, 0.4, 0.22);
    if (o.bun) h.add(GEO.sph, o.hair, 0, 0.3, -0.16, 0.26, 0.24, 0.26);
  }
  if (o.beard) h.add(GEO.box, o.beard, 0, -0.18, 0.16, 0.34, 0.12, 0.22);
  // eyes + brows, straight into the merged head
  // set flush into the skull — spheres proud of the surface read as googly eyes.
  // eye spacing / brow angle / mouth width vary per person: the cheapest way to
  // stop a room of tourists reading as one tourist copy-pasted.
  const eg = o.eyeGap ?? 0.14, bt = o.browTilt ?? 0;
  for (const s of [-1, 1]) {
    h.add(GEO.sph, PAL.white, s * eg, 0.02, 0.225, 0.085, 0.1, 0.05);
    h.add(GEO.sph, 0x22222a, s * eg, 0.02, 0.25, 0.05, 0.058, 0.035);
    if (o.brow) h.add(GEO.box, o.brow, s * eg, 0.125, 0.235, 0.12, 0.03, 0.04, 0, 0, s * bt);
  }
  if (o.mouth !== 0) h.add(GEO.box, 0x8a4a44, 0, -0.16, 0.25, o.mouth || 0.12, 0.03, 0.04);
  head.add(h.build({ mat: charMat, cast: true }));
  // eyelid: a skin-toned bar parked under the brow that drops over the eyes.
  // Blinking is the cheapest "this thing is alive" cue there is.
  const lids = mesh(GEO.box, M(skin), 0, 0.09, 0.247, 0.4, 0.13, 0.045);
  lids.scale.y = 0.02;
  head.add(lids);
  if (o.hat === 'paper') {                                                  // cook's folded cap
    head.add(mesh(GEO.cyl, M(PAL.white), 0, 0.3, 0, 0.5, 0.3, 0.5));
    head.add(mesh(GEO.box, M(PAL.white), 0, 0.2, 0, 0.56, 0.12, 0.5));
  } else if (o.hat === 'cowboy') {
    head.add(mesh(GEO.cyl, M(o.hatC || 0xd8bc8a), 0, 0.12, 0, 1.02, 0.06, 0.92));
    head.add(mesh(GEO.cyl, M(o.hatC || 0xd8bc8a), 0, 0.28, 0, 0.52, 0.3, 0.52));
    head.add(mesh(GEO.box, M(0x6b4f33), 0, 0.18, 0, 0.54, 0.06, 0.54));
  } else if (o.hat === 'cap') {
    head.add(mesh(GEO.sph, M(o.hatC || 0xc44536), 0, 0.16, 0, 0.62, 0.36, 0.6));
    head.add(mesh(GEO.box, M(o.hatC || 0xc44536), 0, 0.1, 0.3, 0.44, 0.06, 0.3));
  } else if (o.hat === 'beanie') {
    head.add(mesh(GEO.sph, M(o.hatC || 0x6a7a5a), 0, 0.16, 0, 0.62, 0.42, 0.6));
  } else if (o.hat === 'band') {
    head.add(mesh(GEO.box, M(o.hatC || 0xe8e2d6), 0, 0.16, 0, 0.6, 0.12, 0.58));
  }
  if (o.glasses) head.add(mesh(GEO.box, M(o.glasses, { r: 0.25, m: 0.3 }), 0, 0.02, 0.28, 0.36, 0.09, 0.05));
  head.position.y = 1.52; g.add(head);
  // ---- limbs ----
  const armParts = c => [
    [GEO.box, c, 0, -0.16, 0, 0.15, 0.32, 0.15],
    [GEO.box, o.sleeve ?? c, 0, -0.42, 0, 0.13, 0.26, 0.13],
    [GEO.sph, skin, 0, -0.58, 0, 0.17, 0.16, 0.16],
  ];
  const armL = limb(armParts(shirt), -0.34, 1.26, 0);
  const armR = limb(armParts(shirt), 0.34, 1.26, 0);
  // legs get a real knee: without one, a seated pose sticks both shins straight
  // out into the aisle
  const mkLeg = px => {
    const hip = limb([[GEO.box, pants, 0, -0.2, 0, 0.19, 0.4, 0.19]], px, 0.76, 0);
    const knee = new THREE.Group(); knee.position.y = -0.4;
    const s = new Merger(false);
    s.add(GEO.box, pants, 0, -0.14, 0, 0.17, 0.28, 0.17);
    s.add(GEO.box, shoe, 0, -0.31, 0.05, 0.21, 0.12, 0.3);
    knee.add(s.build({ mat: charMat, cast: true }));
    hip.add(knee); hip.userData.knee = knee;
    return hip;
  };
  const legL = mkLeg(-0.15), legR = mkLeg(0.15);
  g.add(armL, armR, legL, legR);
  const carry = new THREE.Group(); carry.position.set(0, 1.02, 0.46); g.add(carry);
  g.add(blob(0.44));
  if (S !== 1) g.scale.setScalar(S);
  g.userData = {
    head, armL, armR, legL, legR, carry, lids, body,
    ph: Math.random() * 6.28, blinkT: 1 + Math.random() * 4, blink: 0,
    breath: Math.random() * 6.28, reachT: 0, lookX: 0, lookY: 0,
  };
  return g;
}
// per-frame aliveness shared by cooks and customers: blinking, breathing and a
// head that actually points at whatever the character cares about
function alive(u, g, dt, k, lookAt) {
  u.blinkT -= dt;
  if (u.blinkT <= 0) { u.blink = 0.16; u.blinkT = 1.8 + Math.random() * 5; }
  if (u.blink > 0) u.blink -= dt;
  if (u.lids) u.lids.scale.y = u.blink > 0 ? 1 : 0.02;
  u.breath += dt * 1.15;
  if (u.body) { const b = 1 + Math.sin(u.breath) * 0.012; u.body.scale.set(b, 1, b); }
  let ty = 0, tx = 0;
  if (lookAt) {
    // yaw/pitch of the target in the character's own frame, clamped so nobody
    // snaps their head around like an owl
    const dx = lookAt.x - g.position.x, dz = lookAt.z - g.position.z;
    const want = shortest(0, Math.atan2(dx, dz) - g.rotation.y);
    // if it's behind them they give up rather than straining at the clamp forever
    if (Math.abs(want) < 1.15) {
      ty = Math.max(-0.85, Math.min(0.85, want));
      const d = Math.hypot(dx, dz);
      tx = Math.max(-0.4, Math.min(0.45, Math.atan2((lookAt.y ?? 1.5) - 1.52, Math.max(0.4, d))));
    }
  }
  u.lookY += (ty - u.lookY) * Math.min(1, k * 0.5);
  u.lookX += (tx - u.lookX) * Math.min(1, k * 0.5);
  u.head.rotation.y = u.lookY;
  u.head.rotation.x = u.lookX;
  if (u.reachT > 0) u.reachT -= dt;
}
// ⚠️ every item ships with a ground blob shadow; in the first-person hands rig
// that disc sits inches from the lens and reads as a black slab across frame
function stripBlob(g) {
  const kill = [];
  g.traverse(o => { if (o.isMesh && o.material === shadowMat) kill.push(o); });
  for (const o of kill) o.parent.remove(o);
  return g;
}
