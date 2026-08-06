// SHORT STAFFED — post stack: HDR scene → bright-pass bloom → composite with
// vignette, warm grade and film grain. Pure view.
//
// ⚠️ THREE COLOUR RULES THIS DEPENDS ON (learned the hard way on Age of Toys):
//  1. toneMapping is only applied by three when rendering to the CANVAS, so the
//     scene lands in the RT as linear; the composite shader (which does draw to
//     the canvas) owns <tonemapping_fragment> + <colorspace_fragment>.
//  2. sceneRT.samples = 4 or post silently costs you the canvas MSAA.
//  3. The bloom threshold is LINEAR and this is a BRIGHT room — gate at 1.0 and
//     let only genuinely emissive things (lamps, fire, windows) through. Do NOT
//     "fix" weak bloom by lowering it; brighten the source instead.
import * as THREE from '../vendor/three.module.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT = `
uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  float k = max(0.0, l - threshold) / max(l, 0.0001);
  gl_FragColor = vec4(c.rgb * k, 1.0);
}`;

const BLUR = `
uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 s = texture2D(tDiffuse, vUv) * 0.227;
  s += texture2D(tDiffuse, vUv + dir * 1.3846) * 0.316;
  s += texture2D(tDiffuse, vUv - dir * 1.3846) * 0.316;
  s += texture2D(tDiffuse, vUv + dir * 3.2308) * 0.0702;
  s += texture2D(tDiffuse, vUv - dir * 3.2308) * 0.0702;
  gl_FragColor = s;
}`;

const COMP = `
uniform sampler2D tDiffuse; uniform sampler2D tBloom;
uniform float bloom, vignette, grain, contrast, sat, time;
uniform vec3 tint;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  col += texture2D(tBloom, vUv).rgb * bloom;
  col *= tint;
  // soft filmic shoulder — keeps highlights from clipping flat white
  col = col / (col + vec3(1.15)) * 1.86;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, sat);
  col = (col - 0.5) * contrast + 0.5;
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * vignette;
  col += (hash(vUv * 900.0 + time) - 0.5) * grain;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function quad(frag, uniforms) {
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  m.toneMapped = false;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return new THREE.Mesh(g, m);
}

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.available = renderer.capabilities.isWebGL2;
    this.enabled = this.available;
    this.p = { bloom: 0.55, threshold: 1.0, vignette: 0.38, grain: 0.018, contrast: 1.05, sat: 1.12, tint: [1.02, 1.0, 0.97] };
    if (!this.available) return;
    const rtOpt = { type: THREE.HalfFloatType, depthBuffer: true };
    this.sceneRT = new THREE.WebGLRenderTarget(2, 2, rtOpt);
    this.sceneRT.samples = 4;                       // rule 2
    this.brightRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    this.blurRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
    this.uBright = { tDiffuse: { value: this.sceneRT.texture }, threshold: { value: this.p.threshold } };
    this.uBlur = { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } };
    this.uComp = {
      tDiffuse: { value: this.sceneRT.texture }, tBloom: { value: this.blurRT.texture },
      bloom: { value: this.p.bloom }, vignette: { value: this.p.vignette }, grain: { value: this.p.grain },
      contrast: { value: this.p.contrast }, sat: { value: this.p.sat }, time: { value: 0 },
      tint: { value: new THREE.Vector3(...this.p.tint) },
    };
    this.qBright = quad(BRIGHT, this.uBright);
    this.qBlur = quad(BLUR, this.uBlur);
    this.qComp = quad(COMP, this.uComp);
    this.qComp.material.toneMapped = true;          // rule 1: composite owns the includes
    this.fsScene = new THREE.Scene();
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) {
    if (!this.available) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const W = Math.max(2, Math.floor(w * dpr)), H = Math.max(2, Math.floor(h * dpr));
    this.sceneRT.setSize(W, H);
    this.brightRT.setSize(Math.max(2, W >> 1), Math.max(2, H >> 1));
    this.blurRT.setSize(Math.max(2, W >> 1), Math.max(2, H >> 1));
    this.w = W; this.h = H;
  }
  draw(mesh, target) {
    this.fsScene.clear(); this.fsScene.add(mesh);
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.fsCam);
  }
  render(t) {
    const r = this.renderer;
    if (!this.available || !this.enabled) { r.setRenderTarget(null); r.render(this.scene, this.camera); return; }
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(this.scene, this.camera);
    this.uBright.threshold.value = this.p.threshold;
    this.draw(this.qBright, this.brightRT);
    this.uBlur.tDiffuse.value = this.brightRT.texture;
    this.uBlur.dir.value.set(1.4 / (this.w >> 1), 0);
    this.draw(this.qBlur, this.blurRT);
    this.uBlur.tDiffuse.value = this.blurRT.texture;
    this.uBlur.dir.value.set(0, 1.4 / (this.h >> 1));
    this.draw(this.qBlur, this.brightRT);
    this.uComp.tBloom.value = this.brightRT.texture;
    this.uComp.bloom.value = this.p.bloom;
    this.uComp.vignette.value = this.p.vignette;
    this.uComp.grain.value = this.p.grain;
    this.uComp.contrast.value = this.p.contrast;
    this.uComp.sat.value = this.p.sat;
    this.uComp.time.value = (t || 0) % 100;
    this.uComp.tint.value.set(...this.p.tint);
    this.draw(this.qComp, null);
  }
}
