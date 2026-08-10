// SHORT STAFFED — client boot, input (keyboard/touch/gamepad), prediction,
// HUD/DOM overlays, and the ?local=1 offline practice mode.
import { Sim, C, LAYOUT, SOLIDS, UPGRADES } from './sim.js';
import { World } from './world.js';
import { STR } from './strings.js';
import { Net } from './net.js';
import { Voice } from './rtc.js';
import { audioInit, sfx, beds, banjoLoop, setListener } from './audio.js';

const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const LOCAL = qs.has('local');
const DEV = qs.has('dev');

// ---- room code ----------------------------------------------------------------
function genCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
let ROOM = (qs.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
if (!ROOM && !LOCAL) {
  ROOM = genCode();
  const u = new URL(location.href); u.searchParams.set('room', ROOM);
  history.replaceState(null, '', u);
}
function pid() {
  let p = sessionStorage.getItem('ss-pid');
  if (!p) { p = (crypto.randomUUID ? crypto.randomUUID() : 'p' + Math.random().toString(36).slice(2)); sessionStorage.setItem('ss-pid', p); }
  return p;
}

// ---- state ----------------------------------------------------------------------
let world = null, net = null, localSim = null, localAcc = 0, localTick = 0, voice = null;
let mySeat = -2, lastSnap = null, joined = false, overShown = false, countLast = -1, howtoShown = false;
const evLog = [];
const input = { x: 0, z: 0, fx: 0, fz: -1, a: 0, th: 0, ah: false, sp: false };
const pred = { x: 0, z: 0, vx: 0, vz: 0, fx: 0, fz: -1, mv: 0, has: false };

// ---- boot UI ----------------------------------------------------------------------
document.title = STR.title;
$('t-title').textContent = STR.title;
$('t-tag').textContent = STR.tagline;
$('name').placeholder = STR.namePh;
$('name').value = localStorage.getItem('ss-name') || '';
$('t-apron').textContent = STR.pickApron;
$('join').textContent = LOCAL ? STR.practice : STR.join;
$('t-controls').innerHTML = ('ontouchstart' in window) ? STR.controlsTouch
  : STR.controls.split(' · ').map(s2 => s2.replace(/^(\S+)/, '<b>$1</b>')).join(' &nbsp;·&nbsp; ') + '<br>' + STR.motto;
let myColor = +(localStorage.getItem('ss-color') || 0);
document.querySelectorAll('.swatch').forEach((el, i) => {
  // never render a blank card: if a cached strings.js predates the cast,
  // the names still show (Pages caches assets ~10 min across deploys)
  const emp = (STR.employees && STR.employees[i])
    || { n: ['HAZEL', 'BUCK', 'JUNE', 'REED'][i], role: '', ab: 'Special', d: 'ability on Q.', stake: '' };
  el.innerHTML = `<b>${emp.n}</b><i>${emp.role}</i><s>Q: ${emp.ab} — ${emp.d.replace('Q: ', '')}</s><em>${emp.stake}</em><span class="sw" style="background:${el.dataset.c}"></span>`;
  el.classList.toggle('sel', i === myColor);
  el.onclick = () => { myColor = i; localStorage.setItem('ss-color', i); document.querySelectorAll('.swatch').forEach((e2, j) => e2.classList.toggle('sel', j === i)); sfx('click'); };
});
$('join').onclick = () => { audioInit(); doJoin(); };
$('copy').textContent = STR.copy;
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('copy').textContent = STR.copied; setTimeout(() => $('copy').textContent = STR.copy, 1400); } catch {}
};
$('again').textContent = STR.again;
$('again').onclick = () => { audioInit(); if (LOCAL) localSim.again(); else net.again(); $('endcard').style.display = 'none'; overShown = false; };
if (DEV) $('dev').style.display = 'block';

function doJoin() {
  const name = ($('name').value || 'Cook').slice(0, 16);
  localStorage.setItem('ss-name', name);
  $('joinrow').classList.add('joined'); // collapse the picker; the panel stays for hint + invite
  world = new World($('c'));
  world.fp = fpMode; world.look = look;
  setTimeout(lockPointer, 60);
  if (LOCAL) {
    localSim = new Sim((Date.now() / 1000 | 0) % 100000);
    mySeat = localSim.join('me', name, myColor);
    joined = true;
    $('invite').style.display = 'none';
    $('hint').textContent = STR.waiting;
    banjoLoop(true);
  } else {
    $('hint').textContent = STR.connecting;
    net = new Net({
      hello(m) {
        mySeat = m.you; joined = true;
        $('roomchip').textContent = STR.roomChip + ': ' + m.room;
        $('invite').style.display = 'flex';
        $('t-invite').textContent = STR.invite;
        $('hint').textContent = mySeat < 0 ? STR.spectating : STR.waiting;
        applySnap(m.snap);
        banjoLoop(true);
        if (mySeat >= 0) $('mic').style.display = '';
      },
      snap(s) { applySnap(s); },
      ev(e) { onEvent(e); },
      rtc(m) { if (voice) voice.onSignal(m); },
      status(s) { if (!lastSnap || lastSnap.ph === 'lobby') $('hint').textContent = s === 'connecting' ? STR.connecting : STR.reconnecting; },
    });
    net.connect(ROOM, { pid: pid(), name, color: myColor });
    voice = new Voice(net, () => mySeat, () => lastSnap);
    voice.onstate = st => {
      $('mic').textContent = st === 'on' ? STR.vcOn : st === 'err' ? STR.vcErr : st === 'conn' ? STR.vcConn : STR.vcOff;
      $('mic').classList.toggle('live', st === 'on');
    };
    $('mic').textContent = STR.vcOff;
    $('mic').onclick = () => { audioInit(); voice.toggle(); };
  }
}

// ---- first-person look ---------------------------------------------------------------
const look = { yaw: 0, pitch: 0 };
const MAXP = 1.25, SENS = 0.0023;
let fpMode = true, locked = false;
function lockPointer() {
  const c = $('c');
  if (fpMode && c.requestPointerLock && !locked) { try { c.requestPointerLock(); } catch {} }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === $('c');
  $('lockhint').style.display = (fpMode && !locked && joined && lastSnap && lastSnap.ph !== 'over') ? 'flex' : 'none';
});
addEventListener('mousemove', e => {
  if (!locked) return;
  look.yaw -= e.movementX * SENS;
  look.pitch -= e.movementY * SENS;
  look.pitch = Math.max(-MAXP, Math.min(MAXP, look.pitch));
});
$('c').addEventListener('click', () => { audioInit(); lockPointer(); });

// ---- input: keyboard ---------------------------------------------------------------
const held = new Set();
let sprintKey = false;
const KB = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', e => {
  if ($('howto').style.display === 'flex') $('howto').style.display = 'none';
  if (e.repeat) return;
  audioInit();
  if (KB[e.code]) { held.add(KB[e.code]); e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { sprintKey = true; e.preventDefault(); }
  if (e.code === 'KeyE' || e.code === 'Enter') { input.a++; input.ah = true; e.preventDefault(); }
  if (e.code === 'Space') { input.th++; e.preventDefault(); }
  if (e.code === 'KeyC') { input.co = (input.co || 0) + 1; e.preventDefault(); }
  if (e.code === 'KeyQ') { input.ab = (input.ab || 0) + 1; e.preventDefault(); }
  if (e.code === 'KeyF') { input.gn = (input.gn || 0) + 1; e.preventDefault(); }
  if (e.code === 'KeyV') {
    fpMode = !fpMode;
    if (world) world.fp = fpMode;
    if (!fpMode && document.exitPointerLock) document.exitPointerLock();
    else lockPointer();
    $('lockhint').style.display = 'none';
  }
});
addEventListener('keyup', e => {
  if (KB[e.code]) held.delete(KB[e.code]);
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprintKey = false;
  if (e.code === 'KeyE' || e.code === 'Enter') input.ah = false;
});
addEventListener('blur', () => { held.clear(); input.ah = false; sprintKey = false; });

// ---- input: touch -------------------------------------------------------------------
const touch = { on: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const lookT = { on: false, id: null, lx: 0, ly: 0 };
const stickEl = $('stick'), nubEl = $('nub');
addEventListener('pointerdown', e => {
  audioInit();
  if (e.pointerType !== 'touch') return;
  if (e.clientX < innerWidth * 0.5 && e.clientY > innerHeight * 0.3) {
    touch.on = true; touch.id = e.pointerId; touch.ox = e.clientX; touch.oy = e.clientY; touch.dx = touch.dy = 0;
    stickEl.style.display = 'block';
    stickEl.style.left = (e.clientX - 55) + 'px'; stickEl.style.top = (e.clientY - 55) + 'px';
  } else if (e.clientX >= innerWidth * 0.5) {
    lookT.on = true; lookT.id = e.pointerId; lookT.lx = e.clientX; lookT.ly = e.clientY;
  }
});
addEventListener('pointermove', e => {
  if (touch.on && e.pointerId === touch.id) {
    touch.dx = (e.clientX - touch.ox) / 45; touch.dy = (e.clientY - touch.oy) / 45;
    const l = Math.hypot(touch.dx, touch.dy) || 1, cl = Math.min(1, l);
    nubEl.style.transform = `translate(${touch.dx / l * cl * 34}px,${touch.dy / l * cl * 34}px)`;
  } else if (lookT.on && e.pointerId === lookT.id) {
    look.yaw -= (e.clientX - lookT.lx) * 0.005;
    look.pitch = Math.max(-MAXP, Math.min(MAXP, look.pitch - (e.clientY - lookT.ly) * 0.004));
    lookT.lx = e.clientX; lookT.ly = e.clientY;
  }
});
function endTouch(e) {
  if (touch.on && e.pointerId === touch.id) { touch.on = false; touch.dx = touch.dy = 0; stickEl.style.display = 'none'; nubEl.style.transform = ''; }
  if (lookT.on && e.pointerId === lookT.id) lookT.on = false;
}
addEventListener('pointerup', endTouch); addEventListener('pointercancel', endTouch);
$('btnA').addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); input.a++; input.ah = true; }, { passive: false });
$('btnA').addEventListener('pointerup', () => input.ah = false);
$('btnA').addEventListener('pointercancel', () => input.ah = false);
$('btnB').addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); input.th++; }, { passive: false });

// ---- input: gamepad ------------------------------------------------------------------
const pad = { a: false, b: false };
let padSprint = false;
function pollPad() {
  for (const gp of navigator.getGamepads?.() || []) {
    if (!gp) continue;
    const ax = Math.abs(gp.axes[0]) > 0.25 ? gp.axes[0] : 0;
    const ay = Math.abs(gp.axes[1]) > 0.25 ? gp.axes[1] : 0;
    if (ax || ay) { padVec.x = ax; padVec.z = ay; } else { padVec.x = 0; padVec.z = 0; }
    const rx = Math.abs(gp.axes[2] || 0) > 0.2 ? gp.axes[2] : 0;
    const ry = Math.abs(gp.axes[3] || 0) > 0.2 ? gp.axes[3] : 0;
    if (rx || ry) { look.yaw -= rx * 0.045; look.pitch = Math.max(-MAXP, Math.min(MAXP, look.pitch - ry * 0.035)); }
    const a = gp.buttons[0]?.pressed, b = (gp.buttons[2]?.pressed || gp.buttons[7]?.pressed);
    padSprint = !!gp.buttons[1]?.pressed;
    if (a && !pad.a) { input.a++; }
    input.ah = input.ah || a;
    if (b && !pad.b) input.th++;
    pad.a = a; pad.b = b;
  }
}
const padVec = { x: 0, z: 0 };

// ---- prediction ----------------------------------------------------------------------
function collideLocal(o, r) {
  for (const s of SOLIDS) {
    const px = Math.max(s.x - s.hx, Math.min(o.x, s.x + s.hx)), pz = Math.max(s.z - s.hz, Math.min(o.z, s.z + s.hz));
    let rx = o.x - px, rz = o.z - pz; const rd = Math.hypot(rx, rz);
    if (rd < r && rd > 0.0001) { o.x = px + (rx / rd) * r; o.z = pz + (rz / rd) * r; }
  }
  o.x = Math.max(-C.ROOM_X + C.COOK_R, Math.min(C.ROOM_X - C.COOK_R, o.x));
  const yard = lastSnap && (lastSnap.ph === 'supply' || lastSnap.ph === 'prep');
  if (yard) {
    if (Math.abs(o.x - LAYOUT.door.x) < LAYOUT.door.gap) o.z = Math.max(-C.ROOM_Z + C.COOK_R, Math.min(C.YARD_Z - C.COOK_R, o.z));
    else if (o.z < C.ROOM_Z) o.z = Math.max(-C.ROOM_Z + C.COOK_R, Math.min(C.ROOM_Z - C.COOK_R, o.z));
    else o.z = Math.max(C.ROOM_Z + C.COOK_R, Math.min(C.YARD_Z - C.COOK_R, o.z));
    return;
  }
  const outDoor = o.z > C.ROOM_Z - 0.1 && Math.abs(o.x - LAYOUT.door.x) < LAYOUT.door.gap;
  if (!outDoor) o.z = Math.max(-C.ROOM_Z + C.COOK_R, Math.min(C.ROOM_Z - C.COOK_R, o.z));
  else o.z = Math.min(C.ROOM_Z + 0.6, o.z);
}
function stepPred(dt) {
  if (!joined || mySeat < 0 || !lastSnap) return;
  const me = lastSnap.pl.find(p => p.i === mySeat);
  if (!me) return;
  if (!pred.has) { pred.x = me.x; pred.z = me.z; pred.vx = 0; pred.vz = 0; pred.has = true; }
  // server-owned states (stunned / carried / airborne / busy): ride the authority
  if (me.sn || me.ar || (me.cb != null && me.cb >= 0) || me.b) {
    pred.x = me.x; pred.z = me.z; pred.vx = 0; pred.vz = 0; pred.mv = 0;
    pred.fx = input.fx; pred.fz = input.fz;
    return;
  }
  let mult = 1;
  if (me.dc) mult *= C.DRAG_MULT;
  if (me.so) mult *= C.SOAK_MULT;
  const sprint = input.sp;
  if (sprint) mult *= C.SPRINT_MULT;
  const tx = input.x * C.COOK_SPEED * mult, tz = input.z * C.COOK_SPEED * mult;
  let kk = sprint ? C.SPRINT_ACCEL : 18;
  if (!sprint && Math.hypot(pred.vx, pred.vz) > C.COOK_SPEED + 0.2) kk = 3.5;
  const k = Math.min(1, kk * dt);
  pred.vx += (tx - pred.vx) * k; pred.vz += (tz - pred.vz) * k;
  pred.x += pred.vx * dt; pred.z += pred.vz * dt;
  collideLocal(pred, C.COOK_R);
  pred.fx = input.fx; pred.fz = input.fz;
  pred.mv = Math.hypot(input.x, input.z) > 0.1 ? 1 : 0;
}
function reconcile(me) {
  if (!pred.has) return;
  const dx = me.x - pred.x, dz = me.z - pred.z, d = Math.hypot(dx, dz);
  if (d > 1.8) { pred.x = me.x; pred.z = me.z; }
  else { pred.x += dx * 0.22; pred.z += dz * 0.22; }
}

// ---- snapshot / HUD -------------------------------------------------------------------
let railKey = '', hudKey = '';
function applySnap(s) {
  lastSnap = s;
  if (mySeat >= 0) { const me = s.pl.find(p => p.i === mySeat); if (me) reconcile(me); }
  world && world.applySnap(s, mySeat);
  // beds
  const cooking = s.st.gr.filter(Boolean).length + s.st.pn.filter(Boolean).length;
  const burning = [...s.st.gr, ...s.st.pn].filter(x => x && (x.s === 'burning' || x.s === 'burnt')).length;
  beds({ sizzle: cooking + burning * 1.5, crowd: s.cu.length, fire: s.fi.length });
  // phase UI
  if (s.ph === 'lobby') { $('lobby').style.display = 'flex'; if (joined) $('hint').textContent = mySeat < 0 ? STR.spectating : STR.waiting; }
  else $('lobby').style.display = 'none';
  if (s.ph === 'count') { const c = Math.ceil(s.cd); if (c !== countLast) { countLast = c; $('count').textContent = c; $('count').style.display = 'block'; sfx('count'); } }
  else { $('count').style.display = 'none'; countLast = -1; }
  if (s.ph === 'over' && s.ec && !overShown) { overShown = true; showEndcard(s.ec); }
  if (s.ph !== 'over' && overShown) { overShown = false; $('endcard').style.display = 'none'; }
  // banjo: front porch in calm phases; gentrifies into lo-fi past 50 🏙️
  const wantBanjo = ['lobby', 'prep', 'over'].includes(s.ph);
  const style = (s.gn | 0) >= 50 ? 'lofi' : 'banjo';
  if (wantBanjo !== banjoOn || (wantBanjo && style !== banjoStyle)) { banjoOn = wantBanjo; banjoStyle = style; banjoLoop(wantBanjo, style); }
  // prep (specials draft + the wish list)
  if (s.ph === 'prep' && s.pr) renderPrep(s); else { $('prep').style.display = 'none'; prepKey = ''; }
  // fire vignette
  $('firevig').style.opacity = s.fi.length ? 0.55 : 0;
  // HUD
  const hk = [s.rent.e, s.rent.tg, Math.floor(s.t), s.st.sk.sh, s.ph, s.dy, s.cr, s.gn, Math.floor(s.sy || 0), s.sk2 ? s.sk2.t + '.' + s.sk2.h : ''].join('|');
  if (hk !== hudKey) {
    hudKey = hk;
    $('rent').innerHTML = `<b>${STR.rent}</b> $${s.rent.e} <span class="dim">/ $${s.rent.tg}</span>`;
    $('rent').className = s.rent.e >= s.rent.tg ? 'chip good' : 'chip';
    const left = Math.max(0, C.SHIFT_LEN - s.t);
    const mmss = v => `${String(Math.floor(v / 60))}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
    $('clock').textContent = s.ph === 'lobby' ? STR.closedSign : s.ph === 'over' ? '—'
      : s.ph === 'supply' ? `${STR.supplyChip} ${mmss(Math.max(0, s.sy))}` : mmss(left);
    $('clock').classList.toggle('low', s.ph === 'shift' && left < 60);
    $('plates').textContent = `🍽 ${s.st.sk.sh}`;
    $('day').textContent = `${STR.days[Math.min(2, s.dy - 1)]} · ${s.dy}/${s.dys}`;
    $('cred').innerHTML = `${STR.credChip}<span class="bar"><i style="width:${s.cr}%"></i></span>`;
    $('gent').innerHTML = `${STR.gentChip}<span class="bar"><i style="width:${s.gn}%;background:#ff8a4d"></i></span>`;
    const st2 = s.sk2 || { t: 0, h: 0 };
    $('stock').textContent = `🐟 ${st2.t} · 🫐 ${st2.h}`;
    $('stock').style.display = (st2.t + st2.h > 0 || s.ph === 'supply') ? '' : 'none';
  }
  // your ability chip (outside hudKey — the cooldown ticks every second)
  const meP = mySeat >= 0 && s.pl.find(q => q.i === mySeat);
  if (meP && meP.h && meP.h.k === 'gun') {
    $('gunchip').style.display = '';
    $('gunchip').textContent = `🔫 ${'●'.repeat(s.gsh || 0)}${'○'.repeat(Math.max(0, C.GUN_SHELLS - (s.gsh || 0)))} F fires`;
  } else $('gunchip').style.display = 'none';
  if (meP && (s.ph === 'shift' || s.ph === 'count' || s.ph === 'close')) {
    const emp = STR.employees[myColor % 4];
    $('abchip').style.display = '';
    if (meP.bf) { $('abchip').className = 'chip buff'; $('abchip').textContent = `💪 ${emp.ab}!`; }
    else if (meP.at > 0) { $('abchip').className = 'chip'; $('abchip').textContent = `${emp.ab} · ${meP.at}${STR.abWait}`; }
    else { $('abchip').className = 'chip ready'; $('abchip').textContent = `${STR.abReady}${emp.ab}`; }
  } else $('abchip').style.display = 'none';
  // rail
  const rk = JSON.stringify(s.tk);
  if (rk !== railKey) {
    railKey = rk;
    const grew = s.tk.length > prevTkCount; prevTkCount = s.tk.length;
    $('rail').innerHTML = s.tk.map((t, ix) => {
      const who = t.ins ? STR.inspTag : t.kl ? STR.kaleTag : t.sq ? STR.seqTag : t.dale ? STR.daleTag : t.tb != null ? `${STR.tableTag} ${t.tb + 1}` : STR.stoolTag;
      const lines = t.ln.map(l => `<span class="ln ${l.ok ? 'done' : ''}">${l.d === '?' ? '❓' : STR.dishIcons[l.d]}</span>`).join('');
      // names under the icons: reading the order off the picture alone was too hard
      const names = t.ln.filter(l => !l.ok).map(l => l.d === '?' ? '???' : STR.dishShort[l.d]).join(' · ');
      const nmRow = names ? `<div class="dnames">${names}</div>` : '';
      const riddle = t.kl && STR.riddles[t.rd] ? `<div class="riddle">${STR.riddles[t.rd]}</div>` : '';
      const pc = Math.round(t.pa * 100);
      const cls = (grew && ix === s.tk.length - 1 ? ' new' : '') + (pc < 25 ? ' urgent' : '') + (t.kl ? ' kale' : '') + (t.sq ? ' seq' : '');
      return `<div class="tkt${cls}"><div class="who">${who}</div><div class="lns">${lines}</div>${nmRow}${riddle}<div class="pat"><i style="width:${pc}%;background:${pc > 50 ? '#5c9e4f' : pc > 25 ? '#e8b53a' : '#d94f38'}"></i></div></div>`;
    }).join('');
  }
}
let banjoOn = false, banjoStyle = 'banjo', prepKey = '', prevTkCount = 0;
function renderPrep(s) {
  const pr = s.pr, dy = s.dy, ug = s.ug || [], bank = s.cy | 0;
  $('prep').style.display = 'flex';
  const key = pr.off.join(',') + '|' + pr.pk + '|' + dy + '|' + bank + '|' + ug.join(',');
  if (key !== prepKey) {
    prepKey = key;
    const sum = pr.sum;
    $('p-title').textContent = `${STR.days[Math.min(2, sum.day - 1)]} ${STR.prepTitle}`;
    $('p-sum').innerHTML = [
      [STR.prepEarnedLbl, '$' + sum.earned], [STR.prepRentLbl, '$' + sum.target], [STR.prepCarryLbl, '$' + sum.carry],
    ].map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    $('p-pick').textContent = STR.prepPick;
    $('p-cards').innerHTML = pr.off.map((id, i) => {
      const sp = STR.specials[id] || { n: id, d: '' };
      return `<button class="spcard${pr.pk === i ? ' picked' : ''}" data-i="${i}"><b>${sp.n}</b><span>${sp.d}</span></button>`;
    }).join('');
    document.querySelectorAll('.spcard').forEach(el => {
      el.onclick = () => { audioInit(); sfx('click'); const i = +el.dataset.i; if (LOCAL) localSim.pick(i); else net.send({ t: 'pick', i }); };
    });
    $('p-wishhead').innerHTML = `${STR.wishHead} <span class="dim">· ${STR.wishBank}: $${bank}</span>`;
    $('p-wish').innerHTML = Object.keys(UPGRADES).map(id => {
      const u = STR.upgrades[id] || { n: id, d: '' };
      const owned = ug.includes(id), afford = bank >= UPGRADES[id].price;
      return `<button class="upcard${owned ? ' own' : afford ? '' : ' dim'}" data-u="${id}" ${owned ? 'disabled' : ''} title="${u.d}">
        <b>${owned ? '✓ ' : ''}${u.n}</b><span>${owned ? u.d : '$' + UPGRADES[id].price + ' — ' + u.d}</span></button>`;
    }).join('');
    document.querySelectorAll('.upcard:not(.own)').forEach(el => {
      el.onclick = () => { audioInit(); sfx('click'); const u = el.dataset.u; if (LOCAL) localSim.buy(u); else net.send({ t: 'buy', u }); };
    });
  }
  $('p-count').style.width = Math.max(0, Math.min(100, pr.t / C.PREP_LEN * 100)) + '%';
  $('p-auto').textContent = `${STR.prepAuto} ${Math.max(0, Math.ceil(pr.t))}s`;
}

// station labels (manifest row ui-station-labels): DOM chips projected each frame
const LBL_POINTS = [
  { key: 'griddle', x: -8, y: 2.0, z: -6.1, when: 'work' }, { key: 'pan', x: -5.5, y: 1.9, z: -6.1, when: 'work' },
  { key: 'taps', x: -2.5, y: 2.1, z: -6.1, when: 'work' }, { key: 'sink', x: 1.5, y: 1.9, z: -6.1, when: 'work' },
  { key: 'shelf', x: -10.6, y: 1.9, z: -6.1, when: 'work' }, { key: 'pantry', x: -10.3, y: 1.35, z: -4.3, when: 'work' },
  { key: 'bin', x: 3.1, y: 1.6, z: -6.35, when: 'work' }, { key: 'ext', x: 4.4, y: 1.95, z: -6.3, when: 'work' },
  { sKey: 'river', x: 2, y: 1.4, z: 19.6, when: 'supply' }, { sKey: 'berries', x: -8.5, y: 1.9, z: 15.2, when: 'supply' },
  { sKey: 'truck', x: 7.5, y: 2.4, z: 11.5, when: 'supply' }, { sKey: 'phone', x: 11, y: 2.3, z: 9.5, when: 'supply' },
];
let labelEls = null;
function ensureLabels() {
  if (labelEls) return;
  labelEls = LBL_POINTS.map(p => {
    const el = document.createElement('div');
    el.className = 'stlabel'; el.textContent = p.sKey ? STR.supplyLabels[p.sKey] : STR.stations[p.key];
    document.body.appendChild(el);
    return { el, p };
  });
}
const _sc = { sx: 0, sy: 0, vis: false };
function updateLabels() {
  if (!world || !labelEls) return;
  const ph = lastSnap && lastSnap.ph;
  for (const { el, p } of labelEls) {
    const show = p.when === 'supply' ? ph === 'supply' : (ph === 'shift' || ph === 'close' || ph === 'count');
    if (!show) { el.style.display = 'none'; continue; }
    world.toScreen(p.x, p.y, p.z, _sc);
    if (!_sc.vis) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.left = _sc.sx + 'px'; el.style.top = _sc.sy + 'px';
  }
}

function confetti() {
  const host = $('endcard');
  for (let i = 0; i < 36; i++) {
    const d = document.createElement('div');
    d.className = 'conf';
    d.style.left = (2 + Math.random() * 96) + '%';
    d.style.background = ['#fff6e8', '#8fb8ad', '#e8b53a', '#d94f38'][i % 4];
    d.style.animationDelay = (Math.random() * 0.9) + 's';
    d.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
    d.style.transform = 'rotate(' + (Math.random() * 360 | 0) + 'deg)';
    host.appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }
}

function showEndcard(ec) {
  $('endcard').style.display = 'flex';
  if (ec.win) confetti();
  $('e-title').textContent = ec.win ? STR.endWin : STR.endLose;
  $('e-title').className = ec.win ? 'win' : 'lose';
  $('e-sub').textContent = ec.win ? STR.endWinSub : STR.endLoseSub;
  $('e-rows').innerHTML = [
    [`${STR.shiftN}`, `${ec.day} ${STR.ofN} ${C.SEASON_SHIFTS}`],
    [STR.earned, '$' + ec.earned], [STR.target, '$' + ec.target], [STR.served, ec.served],
    [STR.broken, ec.broken], [STR.fires, ec.fires], [STR.yeets, ec.yeets], [STR.lost, ec.lost],
    [STR.credChip, ec.cred + '%'], [STR.gentChip, ec.gent + '%'],
  ].map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  const revs = (ec.reviews || []).map(k => STR.reviews[k]).filter(Boolean);
  $('e-yowl').innerHTML = revs.length ? `<div class="yhead">${STR.yowlHead}</div>` + revs.map(r =>
    `<div class="rev"><span class="stars">${'★'.repeat(r.s)}${'☆'.repeat(5 - r.s)}</span>${r.t}</div>`).join('') : '';
  // the blame card
  if (ec.crew && ec.crew.length) {
    const top = f => { let b = null; for (const c of ec.crew) { const v = f(c); if (v > 0 && (!b || v > f(b))) b = c; } return b; };
    const lines = [];
    const mvp = top(c => c.sv); if (mvp) lines.push([STR.bl_mvp, mvp.name, mvp.sv, STR.bl_mvp_d]);
    const men = top(c => c.br + c.fi + c.sl); if (men) lines.push([STR.bl_menace, men.name, men.br + men.fi + men.sl, STR.bl_menace_d]);
    const bou = top(c => c.yt + c.fy); if (bou) lines.push([STR.bl_bouncer, bou.name, bou.yt + bou.fy, STR.bl_bouncer_d]);
    const ang = top(c => c.ca); if (ang) lines.push([STR.bl_angler, ang.name, ang.ca, STR.bl_angler_d]);
    $('e-blame').innerHTML = lines.map(l => `<div class="brow"><span>${l[0]}</span><b>${l[1]}</b><i>${l[2]} · ${l[3]}</i></div>`).join('');
  } else $('e-blame').innerHTML = '';
  sfx('over');
}

// ---- events ------------------------------------------------------------------------------
function toast(txt, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls; el.textContent = txt;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 4200);
}
const nameOf = s => (lastSnap && lastSnap.pl.find(p => p.i === s)?.n) || 'Somebody';
function onEvent(e) {
  evLog.push(e); if (evLog.length > 200) evLog.shift();
  sfx(e.k, e.x, e.z);
  world && world.onEvent(e);
  // blame has a name on it
  const blKey = e.k === 'break' ? 'break_' : e.k;
  if (STR.blame[blKey] && (e.s != null || e.v != null)) {
    toast(STR.blame[blKey].replace('{N}', nameOf(e.s)).replace('{M}', nameOf(e.v != null ? e.v : e.s)), e.k === 'ignite' ? 'fire' : '');
    if (e.k === 'ignite' || e.k === 'break') { /* named toast replaces the generic one */ }
  } else if (e.k === 'break') toast(STR.evToasts.break_);
  if (e.k === 'open' && lastSnap && lastSnap.dy === 1 && !howtoShown) {
    howtoShown = true;
    $('h-title').textContent = STR.howtoTitle;
    $('h-lines').innerHTML = STR.howtoLines.map(l => `<div>${l}</div>`).join('');
    $('howto').style.display = 'flex';
    setTimeout(() => $('howto').style.display = 'none', 9000);
  }
  if (e.k === 'text' && STR.texts[e.s]) toast(STR.texts[e.s], e.s.startsWith('ll_') || e.s === 'zillow_out' ? 'll' : '');
  if (e.k === 'tg' && STR.telegraphs[e.s]) toast(STR.telegraphs[e.s], 'tg');
  if (e.k === 'callout' && STR.callouts[e.w]) toast('📣 ' + nameOf(e.s) + ': ' + STR.callouts[e.w], 'tg');
  if (e.k === 'ability' && STR.abilityLines[e.e]) toast(STR.abilityLines[e.e].replace('{N}', nameOf(e.s)), 'money');
  if (e.k === 'tip') toast(`tip +$${e.a}`, 'money');
  if (e.k === 'picked' && STR.specials[e.s]) toast(STR.pickedToast + STR.specials[e.s].n, 'll');
  if (e.k === 'bought' && STR.upgrades[e.u]) toast(STR.boughtToast + STR.upgrades[e.u].n, 'money');
  if (e.k === 'plateup' && lastSnap && lastSnap.ug && lastSnap.ug.includes('bell')) sfx('bellding', e.x, e.z);
  if (e.k === 'bite' && e.i === mySeat) {
    $('bite').style.display = 'block';
    setTimeout(() => $('bite').style.display = 'none', 950);
    if (world && pred.has) world.emote('❗', pred.x, pred.z);
  }
  if (e.k === 'ignite') { $('firevig').style.opacity = 0.9; setTimeout(() => { if (lastSnap && !lastSnap.fi.length) $('firevig').style.opacity = 0; }, 700); }
  if (e.k === 'cha' || e.k === 'tip') { $('rent').classList.add('flash'); setTimeout(() => $('rent').classList.remove('flash'), 550); }
  if (STR.evToasts[e.k] && !(e.k === 'ignite' && e.s != null)) toast(STR.evToasts[e.k], e.k === 'ignite' ? 'fire' : '');
}

// ---- highlight (interact affordance) -------------------------------------------------------
function updateHighlight() {
  if (!world || !lastSnap || mySeat < 0) { world && world.setHighlight(0, 0, false); return; }
  const px = pred.has ? pred.x : 0, pz = pred.has ? pred.z : 0;
  const cands = [];
  if (lastSnap.ph === 'lobby') cands.push([LAYOUT.sign.x, LAYOUT.sign.z, 1.9]);
  if (lastSnap.ph === 'supply') {
    for (const f of LAYOUT.fishSpots) cands.push([f.x, f.z, 1.9]);
    LAYOUT.huckBushes.forEach((b2, i) => { if (lastSnap.bu && lastSnap.bu[i] > 0) cands.push([b2.x, b2.z, C.REACH]); });
    cands.push([LAYOUT.truck.x, LAYOUT.truck.z, 2.6], [LAYOUT.payphone.x, LAYOUT.payphone.z, 1.7]);
  }
  else for (const sp of [...LAYOUT.griddle.slots, ...LAYOUT.pan.slots, ...LAYOUT.taps, LAYOUT.sink, LAYOUT.bin, LAYOUT.shelf, ...LAYOUT.crates, LAYOUT.extHook, LAYOUT.trayRack, LAYOUT.mopHook, LAYOUT.gunSpot]) cands.push([sp.x, sp.z, C.REACH]);
  if (lastSnap.gt) cands.push([LAYOUT.pigGate.x, LAYOUT.pigGate.z, C.REACH]);
  if (lastSnap.pg) for (const q of lastSnap.pg) if (q.st === 'loose') cands.push([q.x, q.z, 1.2]);
  for (const it of lastSnap.it) if (it.k !== 'shard') cands.push([it.x, it.z, C.REACH]);
  for (const cu of lastSnap.cu) if (cu.ty === 'squatter' && ['squat', 'reseat', 'sit', 'wait'].includes(cu.st)) cands.push([cu.x, cu.z, C.REACH]);
  for (const t of lastSnap.tk) { const pos = t.tb != null ? LAYOUT.tables[t.tb] : LAYOUT.stools[t.sl]; if (pos) cands.push([pos.x, pos.z, t.tb != null ? 2.3 : C.REACH]); }
  let best = null, bd = 1e9;
  for (const [x, z, r] of cands) { const d = (x - px) ** 2 + (z - pz) ** 2; if (d < r * r && d < bd) { bd = d; best = [x, z]; } }
  if (best) world.setHighlight(best[0], best[1], true); else world.setHighlight(0, 0, false);
}

// ---- main loop -------------------------------------------------------------------------------
let last = performance.now(), acc = 0, fps = 0, frames = 0, fpsAt = last;
const STEP = 1 / 60;
function computeInput() {
  // stick space first: +fwd is "away from the camera", +rt is "camera right"
  let fwd = 0, rt = 0;
  if (held.has('up')) fwd += 1; if (held.has('down')) fwd -= 1;
  if (held.has('right')) rt += 1; if (held.has('left')) rt -= 1;
  let touchMag = 0;
  if (touch.on) { rt += touch.dx; fwd -= touch.dy; touchMag = Math.hypot(touch.dx, touch.dy); }
  rt += padVec.x; fwd -= padVec.z;
  let x, z;
  if (fpMode) {
    // camera-relative: three's camera looks down -Z at yaw 0
    const sy = Math.sin(look.yaw), cy = Math.cos(look.yaw);
    x = fwd * -sy + rt * cy;
    z = fwd * -cy + rt * -sy;
    input.fx = -sy; input.fz = -cy;          // you face where you look
  } else {
    x = rt; z = -fwd;
    const l0 = Math.hypot(x, z);
    if (l0 > 0.15) { input.fx = x / l0; input.fz = z / l0; }
  }
  const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
  input.x = x; input.z = z;
  input.sp = sprintKey || padSprint || touchMag > 1.35;
  if (world) { world.look = look; world.sprinting = input.sp && l > 0.1; }
  if (net) { net.input.x = input.x; net.input.z = input.z; net.input.fx = input.fx; net.input.fz = input.fz; net.input.a = input.a; net.input.th = input.th; net.input.ah = input.ah; net.input.sp = input.sp; net.input.co = input.co; net.input.ab = input.ab; net.input.gn = input.gn; }
}
function stepLocal(dt) {
  if (!LOCAL || !localSim) return;
  localAcc += dt;
  while (localAcc >= C.TICK) {
    localAcc -= C.TICK;
    localSim.input('me', { x: input.x, z: input.z, fx: input.fx, fz: input.fz, a: input.a, th: input.th, ah: input.ah, sp: input.sp, co: input.co, ab: input.ab, gn: input.gn });
    const evs = localSim.tick(C.TICK);
    for (const e of evs) onEvent(e);
    if (++localTick % 2 === 0) applySnap(localSim.snapshot());
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  pollPad(); computeInput();
  acc += dt;
  while (acc >= STEP) { stepPred(STEP); acc -= STEP; }
  stepLocal(dt);
  updateHighlight();
  if (world) {
    setListener(pred.has ? pred.x : 0, pred.has ? pred.z : 0);
    if (voice) { voice.updateSpatial(pred.has ? pred : { x: 0, z: 0 }, lastSnap); world.speakSet = voice.speaking; }
    world.render(dt, pred.has ? pred : null);
    ensureLabels(); updateLabels();
    const playing = lastSnap && ['shift', 'close', 'count', 'supply', 'lobby'].includes(lastSnap.ph);
    $('cross').classList.toggle('on', !!(fpMode && joined && mySeat >= 0 && playing));
    const wantHint = fpMode && joined && mySeat >= 0 && !locked && playing && !('ontouchstart' in window);
    const hintEl = $('lockhint');
    if ((hintEl.style.display === 'flex') !== wantHint) hintEl.style.display = wantHint ? 'flex' : 'none';
  }
  if (DEV && (frames++, now - fpsAt >= 500)) {
    fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now;
    const info = world ? world.renderer.info : { render: {} };
    $('dev').textContent = `${fps}fps calls:${info.render.calls} tris:${(info.render.triangles / 1000 | 0)}k rtt:${net ? net.rtt : 0}ms snapAge:${net ? ((performance.now() - net.lastSnapAt) | 0) : 0}ms ents:${lastSnap ? lastSnap.cu.length + lastSnap.it.length : 0}`;
  }
}
requestAnimationFrame(frame);
// hidden-tab fallback: keep local sim + prediction + outbound inputs alive
setInterval(() => {
  if (!document.hidden) return;
  pollPad(); computeInput();
  stepPred(0.1); stepLocal(0.1);
}, 100);
addEventListener('resize', () => world && world.resize());

// ---- test hooks -------------------------------------------------------------------------------
window.__ss = {
  join: () => $('join').click(),
  state: () => lastSnap, ev: evLog, seat: () => mySeat, room: ROOM, vec: padVec, pred,
  input: o => { Object.assign(input, o); if (o.a === '+') input.a++; if (o.th === '+') input.th++; },
  press: () => { input.a++; },
  yeet: () => { input.th++; },
  net: () => net, sim: () => localSim, world: () => world,
};
