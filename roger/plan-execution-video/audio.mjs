// Bande-son synthétisée (48 kHz, stéréo, 24 bits) du film « Plan d'exécution », calée sur cues.js.
// 96 BPM · ré mineur (la panne, les allers-retours) → fa majeur (le déclic, la méthode, la promesse). Crayon, règle, tampons, gomme, calque.
import fs from 'node:fs';
import C from './cues.js';

const SR = 48000, DUR = C.DUR, N = Math.round(SR * DUR);
const B = C.B, b = C.b;
const TAU = Math.PI * 2;
const clamp = (x, a, z) => Math.min(z, Math.max(a, x));

const mkBus = () => [new Float32Array(N), new Float32Array(N)];
const drums = mkBus(), music = mkBus(), fx = mkBus(), rev = mkBus();

let seed = 20260926;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const panGains = (p) => { const a = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Filtre à variables d'état (TPT) — stable avec une fréquence qui varie à chaque échantillon.
function svf(type) {
  let ic1 = 0, ic2 = 0;
  return (x, fc, q = 0.707) => {
    const g = Math.tan(Math.PI * clamp(fc, 10, SR * 0.45) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    if (type === 'lp') return v2;
    if (type === 'bp') return v1;
    return x - k * v1 - v2; // hp
  };
}
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function osc(type, phase = 0) {
  let ph = phase;
  return (f) => {
    const dt = f / SR; ph += dt; if (ph >= 1) ph -= 1;
    if (type === 'saw') return 2 * ph - 1 - blep(ph, dt);
    if (type === 'sq') return (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt);
    return Math.sin(TAU * ph);
  };
}

// Écrit un générateur mono dans un bus, avec panoramique (fixe ou mobile) et envoi réverbe.
function play(bus, t0, dur, gen, o = {}) {
  const gain = o.gain ?? 1, send = o.send ?? 0;
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR);
  let [gl, gr] = panGains(o.pan ?? 0);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i < 0) continue;
    if (i >= N) break;
    const t = k / SR;
    if (o.panFn) [gl, gr] = panGains(o.panFn(t));
    const v = gen(t) * gain;
    bus[0][i] += v * gl; bus[1][i] += v * gr;
    if (send) { rev[0][i] += v * gl * send; rev[1][i] += v * gr * send; }
  }
}
function playStereo(bus, t0, dur, genL, genR, o = {}) {
  const gain = o.gain ?? 1, send = o.send ?? 0;
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i < 0) continue;
    if (i >= N) break;
    const t = k / SR, l = genL(t) * gain, r = genR(t) * gain;
    bus[0][i] += l; bus[1][i] += r;
    if (send) { rev[0][i] += l * send; rev[1][i] += r * send; }
  }
}

// ------------------------------------------------------------------ instruments
const kickTimes = [];
function kick(t0, g = 1) {
  kickTimes.push(t0);
  let ph = 0;
  play(drums, t0, 0.55, (t) => {
    const f = 46 + 130 * Math.exp(-t * 40) + 18 * Math.exp(-t * 7);
    ph += TAU * f / SR;
    const env = Math.exp(-t * 6.5) * Math.min(1, t / 0.0015);
    const click = t < 0.005 ? noise() * (1 - t / 0.005) * 0.4 : 0;
    return Math.tanh(1.6 * (Math.sin(ph) * env + click)) * 0.9;
  }, { gain: g });
}
function thump(t0, g = 1) { // pulsation sourde, sans attaque
  let ph = 0;
  play(drums, t0, 0.5, (t) => { const f = 42 + 38 * Math.exp(-t * 18); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-t * 7) * Math.min(1, t / 0.006); }, { gain: g });
}
function clap(t0, g = 1, pan = 0) {
  const f1 = svf('bp'), f2 = svf('hp');
  play(drums, t0, 0.4, (t) => {
    let env = 0;
    for (const s of [0, 0.010, 0.021]) if (t >= s) env = Math.max(env, Math.exp(-(t - s) * 190));
    if (t > 0.021) env = Math.max(env, 0.55 * Math.exp(-(t - 0.021) * 15));
    const x = noise();
    return (f1(x, 1250, 1.1) * 1.7 + f2(x, 5000) * 0.25) * env;
  }, { gain: g, pan, send: 0.22 });
}
function snare(t0, g = 1) {
  const f1 = svf('hp'); let ph = 0;
  play(drums, t0, 0.22, (t) => {
    ph += TAU * (190 + 60 * Math.exp(-t * 40)) / SR;
    return (Math.sin(ph) * Math.exp(-t * 30) * 0.6 + f1(noise(), 1800) * Math.exp(-t * 22) * 0.9);
  }, { gain: g, send: 0.12 });
}
function hat(t0, g = 1, open = false, pan = 0.15) {
  const f1 = svf('hp'), f2 = svf('bp');
  play(drums, t0, open ? 0.32 : 0.07, (t) => {
    const x = noise();
    return (f1(x, 7800, 0.8) * 0.8 + f2(x, 10500, 2.2) * 0.45) * Math.exp(-t * (open ? 10 : 75));
  }, { gain: g, pan });
}
function crash(t0, g = 1, len = 2.2) {
  const hl = svf('hp'), hr = svf('hp'), bl = svf('bp'), br = svf('bp');
  const env = (t) => Math.exp(-t * (2.6 / len * 2.2)) * Math.min(1, t / 0.002);
  playStereo(drums, t0, len, (t) => (hl(noise(), 3800) * 0.7 + bl(noise(), 6800, 1.6) * 0.5) * env(t),
    (t) => (hr(noise(), 3800) * 0.7 + br(noise(), 6800, 1.6) * 0.5) * env(t), { gain: g, send: 0.3 });
}
function boom(t0, g = 1) { // sous-grave d'impact
  let ph = 0;
  play(drums, t0, 1.8, (t) => { const f = 30 + 52 * Math.exp(-t * 5.5); ph += TAU * f / SR; return Math.tanh(1.3 * Math.sin(ph)) * Math.exp(-t * 2.3) * Math.min(1, t / 0.004); }, { gain: g });
}
function impact(t0, g = 1) { kick(t0, 0.95 * g); boom(t0, 0.85 * g); crash(t0, 0.55 * g); }

function bell(t0, f, g = 1, pan = 0, o = {}) { // FM : cloche / notification
  let pc = 0, pm = 0;
  const ratio = o.ratio ?? 2, idx = o.idx ?? 1.4, dec = o.dec ?? 12;
  play(fx, t0, o.len ?? 0.7, (t) => {
    pm += TAU * f * ratio / SR; pc += TAU * f / SR;
    const I = idx * Math.exp(-t * 18);
    return Math.sin(pc + I * Math.sin(pm)) * Math.exp(-t * dec) * Math.min(1, t / 0.0015);
  }, { gain: g, pan, send: o.send ?? 0.25 });
}
function tick(t0, g = 1, f = 2600, pan = 0) {
  const hp = svf('hp'); let ph = 0;
  play(fx, t0, 0.03, (t) => { ph += TAU * f / SR; return (Math.sin(ph) * Math.exp(-t * 260) + hp(noise(), 4000) * Math.exp(-t * 700) * 0.5); }, { gain: g, pan });
}
function pop(t0, g = 1, f0 = 900, f1 = 420, pan = 0) {
  let ph = 0;
  play(fx, t0, 0.12, (t) => { const f = f1 + (f0 - f1) * Math.exp(-t * 60); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-t * 38) * Math.min(1, t / 0.001); }, { gain: g, pan, send: 0.12 });
}
function bloop(t0, g = 1, pan = 0) { // goutte d'eau
  let ph = 0;
  play(fx, t0, 0.3, (t) => { const f = 360 + 1450 * (1 - Math.exp(-t * 55)); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-t * 20) * Math.min(1, t / 0.0008); }, { gain: g, pan, send: 0.35 });
}
function whoosh(t0, dur, o = {}) {
  const f = svf('bp'), f0 = o.f0 ?? 250, f1 = o.f1 ?? 3500, q = o.q ?? 1.3;
  const p0 = o.p0 ?? 0, p1 = o.p1 ?? p0, shape = o.shape ?? 'bell';
  play(fx, t0, dur, (t) => {
    const u = t / dur;
    const env = shape === 'rise' ? Math.pow(u, 3) : shape === 'fall' ? Math.pow(1 - u, 2) : Math.pow(Math.sin(Math.PI * u), 1.6);
    return f(noise(), f0 * Math.pow(f1 / f0, u), q) * env * 2.4;
  }, { gain: o.gain ?? 1, panFn: (t) => p0 + (p1 - p0) * (t / dur), send: o.send ?? 0.18 });
}
function riser(t0, t1, g = 1) {
  const fn = svf('bp'), fl = svf('lp'), o1 = osc('saw'), o2 = osc('saw', 0.33);
  play(fx, t0, t1 - t0, (t) => {
    const u = t / (t1 - t0);
    const n = fn(noise(), 350 * Math.pow(9500 / 350, u), 1.4) * 1.3;
    const fo = 110 * Math.pow(8, u);
    const s = fl(o1(fo) + o2(fo * 1.007), 600 + 7000 * u * u, 1.1) * 0.22;
    return (n + s) * Math.pow(u, 2.4);
  }, { gain: g, send: 0.3 });
}
function reverseCymbal(t0, t1, g = 1) {
  const hl = svf('hp'), hr = svf('hp');
  const env = (t) => Math.pow(t / (t1 - t0), 4);
  playStereo(fx, t0, t1 - t0, (t) => hl(noise(), 4200) * env(t), (t) => hr(noise(), 4200) * env(t), { gain: g, send: 0.2 });
}
function buzz(t0, dur, g = 1, pan = 0) { // vibreur de téléphone
  const o1 = osc('saw'), lp = svf('lp');
  play(fx, t0, dur, (t) => {
    const am = 0.55 + 0.45 * Math.sign(Math.sin(TAU * 23 * t));
    const env = Math.min(1, t / 0.01) * Math.min(1, (dur - t) / 0.02);
    return lp(o1(148 + 6 * Math.sin(TAU * 7 * t)), 700, 0.9) * am * env;
  }, { gain: g, pan });
}
function slam(t0, g = 1) { // impact des mots
  let ph = 0;
  play(drums, t0, 0.35, (t) => { const f = 70 + 120 * Math.exp(-t * 26); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-t * 10); }, { gain: 0.8 * g });
  clap(t0, 0.65 * g);
}
function chatter(t0, dur, g = 1, rate = 34, pan = 0) { // décodage / QR : grêle de micro-clics
  const n = Math.round(dur * rate);
  for (let i = 0; i < n; i++) tick(t0 + (i + rnd() * 0.8) / rate, g * (0.5 + 0.5 * rnd()), 2600 + rnd() * 3800, pan + (rnd() - 0.5) * 0.5);
}

// Voix musicales (bus « music », passent dans le sidechain de la grosse caisse).
function padChord(t0, t1, notes, g = 1, o = {}) {
  const cut0 = o.cut0 ?? 900, cut1 = o.cut1 ?? cut0, rel = o.rel ?? 0.25, att = o.att ?? 0.04;
  notes.forEach((m, j) => {
    const f = mtof(m);
    [-1, 0, 1].forEach((d, v) => {
      const o1 = osc('saw', rnd()), lp = svf('lp');
      const det = Math.pow(2, d * 8 / 1200);
      const pan = (d * 0.55) + (j % 2 ? 0.1 : -0.1);
      const len = t1 - t0 + rel;
      play(music, t0, len, (t) => {
        const env = Math.min(1, t / att) * (t > t1 - t0 ? Math.exp(-(t - (t1 - t0)) / rel * 3) : 1);
        const cut = cut0 + (cut1 - cut0) * clamp(t / (t1 - t0), 0, 1);
        return lp(o1(f * det), cut, 0.8) * env;
      }, { gain: g * 0.1, pan, send: 0.3 });
    });
  });
}
function bassNote(t0, dur, m, g = 1) {
  const o1 = osc('saw'), o2 = osc('sin'), lp = svf('lp'), f = mtof(m);
  play(music, t0, dur + 0.03, (t) => {
    const env = Math.min(1, t / 0.004) * (t > dur ? Math.exp(-(t - dur) * 200) : 1) * (0.75 + 0.25 * Math.exp(-t * 12));
    const cut = 180 + 1500 * Math.exp(-t * 16);
    return (lp(o1(f), cut, 1.1) * 0.7 + o2(f) * 0.6) * env;
  }, { gain: g });
}
function pluck(t0, m, g = 1, pan = 0, echo = true) {
  const f = mtof(m);
  const one = (tt, gg, pp) => {
    const o1 = osc('saw', rnd()), o2 = osc('sq', rnd()), lp = svf('lp');
    play(music, tt, 0.5, (t) => {
      const cut = 350 + 5200 * Math.exp(-t * 24);
      return lp(o1(f) * 0.6 + o2(f * 2.0) * 0.18, cut, 1.2) * Math.exp(-t * 8) * Math.min(1, t / 0.002);
    }, { gain: gg, pan: pp, send: 0.28 });
  };
  one(t0, g * 0.16, pan);
  if (echo) { one(t0 + B * 0.75, g * 0.07, -pan - 0.4); one(t0 + B * 1.5, g * 0.035, pan + 0.4); }
}

function chime(t0, f, g = 1, pan = 0, len = 1.6) { // lame de carillon (sonnette, validations)
  const parts = [[1, 1, 2.6], [2.76, 0.32, 5], [5.4, 0.12, 9]];
  const ph = parts.map(() => 0);
  play(fx, t0, len, (t) => {
    let v = 0;
    parts.forEach(([r, a, d], i) => { ph[i] += TAU * f * r / SR; v += Math.sin(ph[i]) * a * Math.exp(-t * d); });
    return v * Math.min(1, t / 0.002);
  }, { gain: g, pan, send: 0.3 });
}
function doorbell(t0, g = 1, pan = 0) { chime(t0, mtof(76), g, pan, 1.2); chime(t0 + 0.3, mtof(72), g, pan, 1.8); }
function vroom(t0, t1, p0, p1, g = 1) { // la camionnette : moteur filtré qui passe
  const o1 = osc('saw'), o2 = osc('saw', 0.4), lp = svf('lp'), dur = t1 - t0;
  play(fx, t0, dur, (t) => {
    const u = t / dur, bell = Math.pow(Math.sin(Math.PI * u), 1.3);
    const f = 62 + 26 * bell + 4 * Math.sin(TAU * 11 * t);
    return lp(o1(f) + 0.6 * o2(f * 1.5), 260 + 1100 * bell, 1.4) * bell;
  }, { gain: g, panFn: (t) => p0 + (p1 - p0) * (t / dur), send: 0.08 });
}
function shutter(t0, g = 1, pan = 0) { // déclencheur photo
  const hp = svf('hp');
  play(fx, t0, 0.12, (t) => {
    const e1 = Math.exp(-t * 500), e2 = t > 0.055 ? Math.exp(-(t - 0.055) * 420) : 0;
    return hp(noise(), 2500, 0.9) * (e1 + 0.8 * e2);
  }, { gain: g, pan });
}
function clank(t0, f, g = 1, pan = 0) { // pièce métallique qui tombe dans la caisse
  const rs = [1, 2.13, 3.71, 5.24], ph = rs.map(() => 0), hp = svf('hp');
  play(fx, t0, 0.5, (t) => {
    let v = 0;
    rs.forEach((r, i) => { ph[i] += TAU * f * r / SR; v += Math.sin(ph[i]) * Math.exp(-t * (14 + i * 10)) / (i + 1); });
    return v + hp(noise(), 3000) * Math.exp(-t * 300) * 0.6;
  }, { gain: g, pan, send: 0.18 });
}
function ratchet(t0, dur, g = 1, pan = 0) { // clé à cliquet
  const n = Math.round(dur * 17);
  for (let i = 0; i < n; i++) tick(t0 + i / 17 + (rnd() - 0.5) * 0.008, g * (0.7 + 0.3 * rnd()), 1700 + rnd() * 600, pan);
}
function clunk(t0, g = 1, pan = 0) { // la pièce neuve se met en place
  let ph = 0;
  play(fx, t0, 0.25, (t) => { ph += TAU * (160 + 90 * Math.exp(-t * 40)) / SR; return Math.sin(ph) * Math.exp(-t * 22); }, { gain: g, pan });
  tick(t0 + 0.01, g * 0.8, 3200, pan);
}

// ------------------------------------------------------------------ bruitages du dossier technique
function felt(t0, m, g = 1, pan = 0) { // piano feutré
  const f = mtof(m), lp = svf('lp');
  let p1 = 0, p2 = 0, p3 = 0;
  play(music, t0, 1.8, (t) => {
    p1 += TAU * f / SR; p2 += TAU * f * 2.002 / SR; p3 += TAU * f * 3.004 / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 2.8), env2 = Math.exp(-t * 9);
    const hammer = t < 0.014 ? lp(noise(), 900) * (1 - t / 0.014) * 0.3 : 0;
    return Math.sin(p1) * env + 0.32 * Math.sin(p2) * env2 + 0.1 * Math.sin(p3) * env2 + hammer;
  }, { gain: g * 0.2, pan, send: 0.38 });
}
function pencil(t0, dur, g = 1, pan = 0) { // trait de crayon : grain du papier
  const bp = svf('bp'), hp = svf('hp');
  const rate = 28 + rnd() * 26, wob = rnd() * 6;
  play(fx, t0, dur, (t) => {
    const env = Math.min(1, t / 0.012) * Math.min(1, (dur - t) / 0.03);
    const grain = 0.55 + 0.45 * Math.abs(Math.sin(TAU * rate * t + Math.sin(TAU * 6 * t + wob) * 2));
    const x = noise();
    return (bp(x, 3000 + 900 * Math.sin(TAU * 2.5 * t + wob), 1.1) * 0.95 + hp(x, 6500) * 0.22) * env * grain;
  }, { gain: g * 0.34, pan, send: 0.04 });
}
function scribble(t0, t1, density, g = 1, pan = 0) { // traits qui se chevauchent pendant qu'un dessin se trace
  let t = t0;
  while (t < t1) { const d = 0.05 + rnd() * 0.16; pencil(t, d, g * (0.55 + 0.45 * rnd()), pan + (rnd() - 0.5) * 0.5); t += (d * (0.45 + rnd() * 0.5)) / density; }
}
function ruler(t0, g = 1, pan = 0) { // règle posée sur la feuille
  let ph = 0; const bp = svf('bp');
  play(fx, t0, 0.09, (t) => { ph += TAU * 1350 / SR; return Math.sin(ph) * Math.exp(-t * 85) * 0.55 + bp(noise(), 2300, 1.8) * Math.exp(-t * 150); }, { gain: g, pan, send: 0.1 });
}
function typing(t0, dur, n, g = 1, pan = 0) { // caractères qui s'impriment
  for (let i = 0; i < n; i++) tick(t0 + (i + rnd() * 0.5) * dur / n, g * (0.5 + 0.5 * rnd()), 2200 + rnd() * 1600, pan + (rnd() - 0.5) * 0.2);
}
function stamp(t0, g = 1, pan = 0) { // tampon : coup sourd, puis le papier claque
  let ph = 0; const lp = svf('lp'), bp = svf('bp');
  play(fx, t0, 0.32, (t) => { ph += TAU * (92 + 70 * Math.exp(-t * 34)) / SR; return Math.sin(ph) * Math.exp(-t * 17) * 0.95 + lp(noise(), 1600) * Math.exp(-t * 42) * 0.7; }, { gain: g, pan, send: 0.14 });
  play(fx, t0 + 0.004, 0.1, (t) => bp(noise(), 3400, 0.8) * Math.exp(-t * 65), { gain: g * 0.45, pan });
  thump(t0, 0.3 * g);
}
function paper(t0, dur, g = 1, p0 = 0, p1 = 0) { // feuille de calque qui glisse
  whoosh(t0, dur, { f0: 1600, f1: 5200, q: 0.7, gain: 0.2 * g, p0, p1, send: 0.1 });
  const lp = svf('lp');
  play(fx, t0, dur, (t) => lp(noise(), 650) * Math.pow(Math.sin((Math.PI * t) / dur), 2), { gain: 0.32 * g, panFn: (t) => p0 + ((p1 - p0) * t) / dur });
}
function eraser(t0, dur, g = 1) { // la gomme
  const bp = svf('bp'), lp = svf('lp');
  play(fx, t0, dur, (t) => {
    const am = 0.35 + 0.65 * Math.pow(Math.sin(TAU * 8.5 * t), 2);
    const env = Math.min(1, t / 0.03) * Math.min(1, (dur - t) / 0.06);
    const x = noise();
    return (bp(x, 1300, 0.9) * 0.85 + lp(x, 420) * 0.55) * am * env;
  }, { gain: g, send: 0.05 });
}
function drop(t0, g = 1, pan = 0) { bloop(t0, g, pan); }

// ------------------------------------------------------------------ partition
// 96 BPM · Dm (la panne, les allers-retours) → A (le constat) → F (le déclic)
//        · F | Dm | B♭ | C | F (la méthode) · B♭ | C | F (la promesse, IV–V–I) · F add9 (Roger)
const CH = {
  Dm: { pad: [50, 57, 62, 65, 69], bass: 38, arp: [74, 77, 81, 86] },
  Bb: { pad: [46, 53, 58, 62, 65], bass: 34, arp: [70, 74, 77, 82] },
  Gm: { pad: [43, 50, 55, 58, 62], bass: 43, arp: [67, 70, 74, 79] },
  A: { pad: [45, 52, 57, 61, 64], bass: 33, arp: [69, 73, 76, 81] },
  F: { pad: [41, 48, 53, 57, 60, 67], bass: 41, arp: [72, 77, 81, 84] },
  C: { pad: [48, 55, 60, 64, 67], bass: 36, arp: [72, 76, 79, 84] },
};

// 01 — La panne : le cadre se trace, l'immeuble se dessine au crayon.
padChord(0, b(6.3), [50, 57], 0.75, { cut0: 280, cut1: 620, att: 0.9 });
ruler(C.frame + 0.02, 0.28, -0.6); pencil(C.frame + 0.05, 0.75, 0.55, -0.2); ruler(C.frame + 0.62, 0.22, 0.6);
typing(C.frame + 0.3, 0.7, 30, 0.07, -0.6);
scribble(C.axo0, C.axo1 + 0.15, 1.7, 0.42, 0.3);
typing(C.stamp, 0.45, 22, 0.1, -0.45);
[[0.5, 74], [1.5, 77], [2.5, 81], [3.5, 79], [4.5, 77], [5.5, 76]].forEach(([q, m], i) => felt(b(q), m, 0.62 - i * 0.04, i % 2 ? 0.25 : -0.2));
whoosh(C.head1 - 0.1, 0.34, { f0: 900, f1: 4200, q: 1.5, gain: 0.13 });
paper(C.lift - 0.05, 0.8, 0.9, 0.2, 0.35); thump(C.lift + 0.62, 0.3);
pencil(C.leak, 0.42, 0.4, 0.35);
C.drips.forEach((t, i) => drop(t, 0.3 - i * 0.02, 0.3));
pop(C.leak + 0.5, 0.12, 900, 450, 0.45);
whoosh(C.head2 - 0.1, 0.34, { f0: 900, f1: 4200, q: 1.5, gain: 0.13 });
whoosh(C.zoomOut0 - 0.05, C.zoomOut1 - C.zoomOut0 + 0.12, { f0: 3600, f1: 280, q: 1.2, gain: 0.26, shape: 'fall' });

// 02 — Les allers-retours : pulsation sourde, la boucle tourne en rond.
scribble(C.map0, C.map0 + 1.05, 2.2, 0.32, -0.15);
for (let q = 7; q < 13; q++) { kick(b(q), 0.42); thump(b(q), 0.25); hat(b(q + 0.5), 0.07, false, -0.2); if (q % 2 === 1) snare(b(q), 0.12); }
[['Dm', 6, 9], ['Bb', 9, 11], ['Gm', 11, 12.75]].forEach(([c, a, z]) => {
  padChord(b(a), b(z), CH[c].pad.slice(0, 4), 0.7, { cut0: 600, cut1: 1000, att: 0.08, rel: 0.2 });
  for (let e = a; e < z; e += 0.5) bassNote(b(e), B * 0.28, CH[c].bass, 0.26);
  for (let s = 0; s < (z - a) * 2; s++) felt(b(a + s / 2), CH[c].arp[[0, 1, 2, 1][s % 4]], 0.45, s % 2 ? 0.3 : -0.3);
});
const PAN = { A: -0.6, L: 0, M: 0.55 };
const TR = [['A', 'L'], ['L', 'M'], ['M', 'L'], ['L', 'M'], ['M', 'L']];
C.trips.forEach(([t0, t1], i) => {
  const [a, z] = TR[i];
  vroom(t0, t1, PAN[a], PAN[z], 0.24);
  if (z === 'L') { doorbell(t1, 0.16, 0); tick(t1, 0.18, 2400, -0.4); }
});
C.msgs.forEach((t, i) => { pop(t, 0.1, 1100 + i * 60, 600, -0.55); typing(t + 0.05, 0.4, 16, 0.06, -0.55); });
C.ex.forEach((t) => tick(t, 0.12, 3000, -0.6));
// « Ce qui coûte, c'est de revenir. »
slam(C.key1, 1.05); boom(C.key1, 0.42); crash(C.key1, 0.2, 1.5);
slam(C.key2, 0.95); boom(C.key2, 0.32);
padChord(C.key1, b(16.6), CH.A.pad, 0.85, { cut0: 450, cut1: 2200, att: 0.3, rel: 0.1 });
bassNote(C.key1, b(16.5) - C.key1, 33, 0.3);
ruler(C.keyCote, 0.3, 0.2); pencil(C.keyCote + 0.04, 0.38, 0.45, 0.2);
for (let q = 13; q < 16.5; q += 0.5) hat(b(q), 0.06, false, 0.25);

// 03 — Le déclic : on efface, un seul trait, le dossier s'ouvre.
eraser(C.erase, 0.55, 0.5); chatter(C.erase + 0.05, 0.45, 0.07, 28, -0.4);
padChord(C.clean0 - 0.1, b(19.9), CH.F.pad, 0.8, { cut0: 700, cut1: 1500, att: 0.15, rel: 0.2 });
bassNote(C.clean0 - 0.1, 0.9, 29, 0.35);
ruler(C.clean0 - 0.04, 0.34, -0.3); pencil(C.clean0, C.clean1 - C.clean0, 0.5, -0.3);
chime(C.clean1, mtof(81), 0.11, -0.2, 1.2);
paper(C.cart - 0.05, 0.62, 1, 0.7, 0.45);
whoosh(C.tag - 0.05, 0.5, { f0: 2400, f1: 7000, q: 0.9, gain: 0.07 });
[[17.75, 72], [18.25, 77], [18.75, 81]].forEach(([q, m]) => felt(b(q), m, 0.5, 0.1));
pencil(C.callout, 0.42, 0.4, 0.1); pop(C.callout + 0.25, 0.12, 1200, 600, 0.2);
riser(C.callout, C.zoomIn1, 0.32);
whoosh(C.zoomIn0 - 0.05, C.zoomIn1 - C.zoomIn0 + 0.1, { f0: 300, f1: 5500, q: 1.2, gain: 0.3, shape: 'rise' });
kick(C.sc4, 0.8); boom(C.sc4, 0.4); crash(C.sc4, 0.18, 1.3);

// 04 — La méthode : la pulsation s'installe.
for (let q = 20; q < 40; q++) {
  kick(b(q), 0.62);
  if (q % 2 === 1) snare(b(q), 0.13);
  hat(b(q + 0.5), 0.11, false, -0.2);
  hat(b(q + 0.25), 0.035, false, 0.35); hat(b(q + 0.75), 0.04, false, 0.35);
}
[['F', 20, 24], ['Dm', 24, 28], ['Bb', 28, 32], ['C', 32, 36], ['F', 36, 40]].forEach(([c, a, z]) => {
  padChord(b(a), b(z), CH[c].pad, 0.8, { cut0: 900, cut1: 1400, att: 0.03 });
  for (let e = a; e < z; e += 0.5) { if (e % 1 === 0.5) bassNote(b(e), B * 0.4, CH[c].bass, 0.36); else if (e === a) bassNote(b(e), B * 0.3, CH[c].bass - 12, 0.3); }
  for (let s = 0; s < (z - a) * 2; s++) felt(b(a + s / 2), CH[c].arp[[0, 2, 1, 3][s % 4]] + (s % 4 === 3 ? 0 : 0), s % 4 === 0 ? 0.62 : 0.42, s % 2 ? 0.35 : -0.35);
});
C.pans.forEach((m) => paper(m - C.panDur / 2 - 0.04, C.panDur + 0.1, 1, 0.7, -0.7));
{ const S = C.st[0]; // Signaler : la fiche
  ruler(S + 0.04, 0.26, 0.3); pencil(S + 0.05, 0.4, 0.42, 0.3); typing(S + 0.3, 0.3, 14, 0.07, 0.5);
  [0, 1, 2].forEach((i) => typing(S + 0.4 + i * 0.13, 0.25, 10, 0.07, 0.3));
  shutter(S + 0.7, 0.26, 0.2); shutter(S + 0.85, 0.26, 0.45); scribble(S + 0.75, S + 1.2, 1.8, 0.28, 0.3);
  typing(S + 1.1, 0.5, 26, 0.08, 0.3); stamp(S + 1.75, 0.9, 0.35); }
{ const S = C.st[1]; // Comprendre : la coupe, le détail
  scribble(S + 0.08, S + 0.7, 2, 0.36, 0.3); ruler(S + 0.5, 0.26, 0.4);
  pencil(S + 0.6, 0.4, 0.42, 0.1); pop(S + 0.95, 0.14, 1000, 500, 0.1);
  whoosh(S + 1.02, 0.45, { f0: 700, f1: 4500, q: 3, gain: 0.12, p0: 0.1, p1: 0.6 }); shutter(S + 1.1, 0.22, 0.6);
  [0.2, 0.62, 1.0, 1.45].forEach((d) => typing(S + d, 0.35, 14, 0.07, -0.5));
  for (let k = 0; k < 4; k++) drop(S + 0.6 + 0.46 + k * 0.183 * 3, 0.14, 0.2);
  chime(S + 1.75, mtof(88), 0.1, -0.5, 1); chime(S + 1.82, mtof(93), 0.08, -0.5, 1.2); }
{ const S = C.st[2]; // Préparer : les pièces, la nomenclature, le prix
  [0, 1, 2, 3, 4].forEach((i) => clank(S + 0.08 + i * 0.03, [640, 900, 520, 1100, 470][i], 0.14, 0.3 + i * 0.05));
  whoosh(S + 0.3, 0.5, { f0: 500, f1: 2600, q: 1.2, gain: 0.16, p0: 0.3 });
  [0, 1, 2, 3, 4].forEach((i) => tick(S + 0.85 + i * 0.08, 0.14, 2800, 0.5));
  [0, 1, 2].forEach((i) => typing(S + 0.6 + i * 0.18, 0.28, 12, 0.07, -0.5));
  pop(S + 1.3, 0.12, 900, 450, -0.4); stamp(S + 1.75, 0.9, -0.3); }
{ const S = C.st[3]; // Intervenir : dépose, repose, serrage
  scribble(S + 0.06, S + 0.4, 2.2, 0.3, 0.3);
  for (let k = 0; k < 4; k++) drop(S + 0.3 + k * 0.28, 0.2, 0.25);
  pop(S + 0.4, 0.12, 700, 350, -0.3);
  clunk(S + 0.72, 0.3, 0.2); whoosh(S + 0.7, 0.4, { f0: 1800, f1: 250, q: 1.3, gain: 0.14, shape: 'fall', p0: 0.2 });
  whoosh(S + 0.95, 0.4, { f0: 300, f1: 1800, q: 1.3, gain: 0.12, p0: 0.2 }); clunk(S + 1.38, 0.42, 0.2);
  ratchet(S + 1.3, 0.3, 0.2, 0.2); stamp(S + 1.8, 0.9, 0.4); chime(S + 1.86, mtof(84), 0.1, 0.4, 1); chime(S + 1.94, mtof(91), 0.08, 0.4, 1.2); }
{ const S = C.st[4]; // Rendre compte : le rapport, transmis
  ruler(S + 0.04, 0.26, 0.3); pencil(S + 0.05, 0.4, 0.42, 0.3);
  [0.35, 0.55].forEach((d) => typing(S + d, 0.3, 14, 0.07, 0.3));
  shutter(S + 0.6, 0.22, 0.2); shutter(S + 0.72, 0.22, 0.45); pop(S + 1.05, 0.1, 1300, 700, 0.5);
  typing(S + 1.05, 0.4, 18, 0.07, 0.3); stamp(S + 1.55, 0.95, 0.3);
  chime(S + 1.8, mtof(88), 0.1, 0.65, 1); chime(S + 1.87, mtof(96), 0.08, 0.65, 1.3); }
// le tirage bleu : l'exposition
riser(C.blue0 - 0.35, C.blue1, 0.38);
whoosh(C.blue0 - 0.05, C.blue1 - C.blue0 + 0.1, { f0: 250, f1: 3200, q: 0.9, gain: 0.3, shape: 'rise', p0: 0.3, p1: -0.1 });

// 05 — La promesse : IV – V – I.
[['Bb', 0], ['C', 1], ['F', 2]].forEach(([c, i]) => {
  const t = C.prom[i];
  slam(t, 0.85); boom(t, 0.28);
  CH[c].arp.forEach((m, j) => felt(t + j * 0.012, m, 0.9, (j - 1.5) * 0.3));
  padChord(t, t + B * (i === 2 ? 1.9 : 1), CH[c].pad, 0.85, { cut0: 1700, cut1: 1300, att: 0.01, rel: 0.2 });
  bassNote(t, B * 0.9, CH[c].bass, 0.4);
  ruler(t + 0.2, 0.22, -0.2); pencil(t + 0.22, 0.3, 0.35, -0.2);
});
for (let q = 40; q < 43; q++) { kick(b(q), 0.6); hat(b(q + 0.5), 0.1, false, -0.2); }
crash(C.prom[0], 0.24, 1.6);
typing(C.nota, 0.45, 20, 0.06, -0.3); typing(C.nota + 0.3, 0.45, 20, 0.06, -0.3);
reverseCymbal(b(43), C.sc6, 0.26);

// 06 — Roger : le cartouche, le tampon, le « Roger beep ».
kick(C.sc6, 0.9); boom(C.sc6, 0.7); crash(C.sc6, 0.3, 2);
padChord(C.sc6, C.DUR - 0.9, [41, 48, 53, 57, 60, 67, 72], 1.15, { cut0: 3000, cut1: 900, att: 0.01, rel: 0.8 });
bassNote(C.sc6, 1.4, 29, 0.45);
[65, 69, 72, 77, 79, 84].forEach((m, i) => felt(C.sc6 + i * 0.05, m, 0.9, (i - 2.5) * 0.25));
pencil(C.sc6 + 0.02, 0.6, 0.5, 0); [0.25, 0.3, 0.35].forEach((d, i) => ruler(C.sc6 + d, 0.2, (i - 1) * 0.5));
whoosh(C.sc6 + 0.28, 0.5, { f0: 1500, f1: 6000, q: 0.9, gain: 0.09 });
typing(C.svc, 0.3, 12, 0.07, 0.3); typing(C.svc + 0.2, 0.3, 12, 0.07, 0.3);
whoosh(C.zone - 0.05, 0.6, { f0: 3000, f1: 8000, q: 0.9, gain: 0.05 });
stamp(C.seal, 1, 0.25);
{
  const beep = (t0, f, dur) => {
    const o1 = osc('sq'), bp = svf('bp');
    play(fx, t0, dur, (t) => bp(o1(f), f, 0.9) * Math.min(1, t / 0.003) * Math.min(1, (dur - t) / 0.004), { gain: 0.15, send: 0.15 });
  };
  beep(C.beep, 1175, 0.085);
  beep(C.beep + C.beepGap, 1568, 0.1);
  const bp = svf('bp');
  play(fx, C.beep + C.beepGap + 0.11, 0.12, (t) => bp(noise(), 1900, 0.8) * Math.exp(-t * 30), { gain: 0.09 });
}

// ------------------------------------------------------------------ mixage
// Sidechain : la musique respire sous la grosse caisse.
kickTimes.sort((x, y) => x - y);
{
  let k = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    while (k + 1 < kickTimes.length && kickTimes[k + 1] <= t) k++;
    let d = 1;
    if (kickTimes.length && kickTimes[k] <= t) d = 1 - 0.55 * Math.exp(-(t - kickTimes[k]) * 9);
    music[0][i] *= d; music[1][i] *= d;
  }
}
// Réverbe type Freeverb (8 filtres en peigne + 4 passe-tout par canal).
function freeverb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * SR / 44100)), i: 0, st: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * SR / 44100)), i: 0 }));
  const out = new Float32Array(N), fb = 0.84, damp = 0.28;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015;
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.st = o * (1 - damp) + c.st * damp;
      c.buf[c.i] = x + c.st * fb;
      if (++c.i >= c.buf.length) c.i = 0;
      y += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      a.buf[a.i] = y + o * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      y = o - y;
    }
    out[n] = y;
  }
  return out;
}
const rvL = freeverb(rev[0], 0), rvR = freeverb(rev[1], 23);

const L = new Float32Array(N), R = new Float32Array(N);
const hpL = svf('hp'), hpR = svf('hp');
for (let i = 0; i < N; i++) {
  L[i] = hpL(drums[0][i] * 0.9 + music[0][i] * 0.85 + fx[0][i] + rvL[i] * 1.1, 28);
  R[i] = hpR(drums[1][i] * 0.9 + music[1][i] * 0.85 + fx[1][i] + rvR[i] * 1.1, 28);
}
// Saturation douce + limiteur à anticipation.
function master(drive, ceiling) {
  const la = Math.round(0.004 * SR), rel = Math.exp(-1 / (0.09 * SR));
  const x0 = new Float32Array(N), x1 = new Float32Array(N), g = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    x0[i] = Math.tanh(L[i] * drive) / Math.tanh(drive);
    x1[i] = Math.tanh(R[i] * drive) / Math.tanh(drive);
    const p = Math.max(Math.abs(x0[i]), Math.abs(x1[i]));
    g[i] = p > ceiling ? ceiling / p : 1;
  }
  const gm = new Float32Array(N);
  for (let i = 0; i < N; i++) { let m = 1; for (let k = i; k < Math.min(N, i + la); k++) if (g[k] < m) m = g[k]; gm[i] = m; }
  let env = 1;
  for (let i = 0; i < N; i++) {
    env = gm[i] < env ? gm[i] : env + (1 - env) * (1 - rel);
    const fade = Math.min(1, i / (0.004 * SR)) * Math.min(1, (N - 1 - i) / (0.35 * SR));
    x0[i] *= env * fade; x1[i] *= env * fade;
  }
  return [x0, x1];
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const pre = 0.9 / peak;
for (let i = 0; i < N; i++) { L[i] *= pre * 1.25; R[i] *= pre * 1.25; }
const [oL, oR] = master(1.05, 0.8);

// WAV 24 bits.
const out = Buffer.alloc(44 + N * 6);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 6, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 6, 28); out.writeUInt16LE(6, 32); out.writeUInt16LE(24, 34);
out.write('data', 36); out.writeUInt32LE(N * 6, 40);
for (let i = 0; i < N; i++) {
  for (const [c, v] of [[0, oL[i]], [1, oR[i]]]) {
    const s = Math.round(clamp(v, -1, 1) * 8388607);
    out.writeIntLE(s, 44 + i * 6 + c * 3, 3);
  }
}
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./out/audio.wav', import.meta.url), out);
console.log('out/audio.wav', (N / SR).toFixed(3) + ' s', 'kicks:', kickTimes.length);
