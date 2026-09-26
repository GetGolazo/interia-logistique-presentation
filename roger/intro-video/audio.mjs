// Bande-son synthétisée (48 kHz, stéréo, 24 bits), calée sur la même partition que l'image (cues.js).
// 128 BPM · La mineur (le problème) → Do majeur (la réponse) · C | Am | F | G | F G | C
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

// ------------------------------------------------------------------ partition
const CH = {
  Am: { pad: [45, 52, 57, 60, 64], bass: 33, arp: [69, 72, 76, 79] },
  C: { pad: [48, 55, 60, 64, 74], bass: 36, arp: [72, 76, 79, 84] },
  F: { pad: [41, 48, 57, 60, 64], bass: 41, arp: [69, 72, 77, 81] },
  G: { pad: [43, 50, 55, 59, 69], bass: 43, arp: [67, 71, 74, 79] },
};

// 01 — Le problème : tic-tac, pulsations, goutte.
for (let s = 0; s < 8; s++) hat(b(s * 0.5), s % 2 ? 0.08 : 0.12, false, 0.35);
bloop(0.02, 0.18, -0.25);
whoosh(0.12, C.impact - 0.12, { f0: 1800, f1: 500, q: 2, gain: 0.12, shape: 'rise', p0: -0.3, p1: -0.3 });
bloop(C.impact, 0.55, -0.3); thump(C.impact, 0.7); pop(C.impact + 0.01, 0.25, 1500, 700, -0.3);
[C.swap2, C.swap3].forEach((t, i) => { thump(t, 0.6); tick(t - 0.1, 0.25, 3200); whoosh(t - 0.12, 0.26, { f0: 900, f1: 5000, q: 1.8, gain: 0.25 }); bell(t, mtof(i ? 76 : 72), 0.08, 0.2, { dec: 16 }); });
padChord(0, b(4), [45, 52], 0.9, { cut0: 350, cut1: 700, att: 0.4 });
hat(b(3.5), 0.14); hat(b(3.75), 0.16);

// 02 — Le chaos : notifications, vibreurs, questions, montée.
impact(C.chaos, 0.8);
kick(b(5), 0.75); kick(b(6), 0.8);
for (let s = 0; s < 9; s++) hat(b(4 + s * 0.25), 0.1 + 0.04 * (s % 2), false, 0.3);
const pingNotes = [88, 91, 86, 93, 88, 95, 89, 91, 96, 86, 93, 90, 95, 88];
C.cardPops.forEach((t, i) => {
  bell(t, mtof(pingNotes[i]), 0.1, ((i * 7) % 11) / 5.5 - 1, { dec: 16, idx: 1.1, len: 0.45 });
  if ([0, 5, 10].includes(i)) buzz(t, 0.34, 0.07, ((i * 7) % 11) / 5.5 - 1);
});
slam(C.q1, 1); slam(C.q2, 1);
padChord(b(4), b(7.5), [45, 52, 57, 58], 0.9, { cut0: 500, cut1: 2600, att: 0.05 });
riser(b(5), b(7.75), 0.55);
whoosh(C.collapse, 0.5, { f0: 5000, f1: 300, q: 1.2, gain: 0.35, shape: 'rise' });
pop(C.bubbleIn, 0.35, 700, 300); bell(C.bubbleChecks, mtof(88), 0.14, 0.1, { dec: 9 }); bell(C.bubbleChecks + 0.08, mtof(95), 0.14, 0.1, { dec: 7 });
reverseCymbal(b(7), C.drop, 0.35);

// 03 — La réponse : le drop.
impact(C.drop, 1.1);
bell(C.dotPop, mtof(96), 0.16, -0.1, { dec: 6 }); pop(C.dotPop, 0.2, 1300, 700);
whoosh(C.base1 - 0.05, 0.6, { f0: 2500, f1: 7000, q: 0.9, gain: 0.08 });
riser(C.zoomPrep - 0.15, C.sc4, 0.45);
whoosh(C.zoomStart, C.sc4 - C.zoomStart + 0.05, { f0: 300, f1: 6000, q: 1.2, gain: 0.35, shape: 'rise' });
crash(C.sc4, 0.28, 1.4);

// Groove b8 → b24.
for (let q = 8; q < 24; q++) {
  if (q > 8) kick(b(q), q === 11 ? 0.6 : 0.85);
  if (q % 2 === 1) clap(b(q), 0.55, 0.05);
  hat(b(q + 0.5), 0.16, q % 4 === 3, -0.2);
  if (q >= 12) { hat(b(q + 0.25), 0.05, false, 0.35); hat(b(q + 0.75), 0.06, false, 0.35); }
}
const prog = [['C', 8, 12], ['Am', 12, 16], ['F', 16, 20], ['G', 20, 24], ['F', 24, 26], ['G', 26, 28]];
prog.forEach(([c, a, z]) => {
  padChord(b(a), b(z), CH[c].pad, 1, { cut0: 1100, cut1: 1600, att: 0.02 });
  for (let e = a; e < z; e += 0.5) {
    if (e % 1 === 0.5) bassNote(b(e), B * 0.42, CH[c].bass, 0.42);
    else if (e === a) bassNote(b(e), B * 0.3, CH[c].bass - 12, 0.3);
  }
  if (a >= 12 && a < 24) for (let s = 0; s < (z - a) * 4; s++) pluck(b(a + s / 4), CH[c].arp[[0, 2, 1, 3][s % 4]] + (s % 8 >= 4 ? 12 : 0), s % 4 === 0 ? 1 : 0.7, (s % 2 ? 0.35 : -0.35), s % 2 === 0);
});

// 04 — Méthode : bruitages d'interface.
chatter(C.qr0, C.qr1 - C.qr0, 0.07, 60, 0.45);
whoosh(C.scan0, C.scan1 - C.scan0, { f0: 900, f1: 4200, q: 4, gain: 0.12, p0: 0.4 });
[0, 1, 2].forEach((i) => { pop(C.photos + i * 0.07, 0.18, 1100 + i * 150, 500, 0.5); whoosh(C.photos + i * 0.07 - 0.03, 0.18, { f0: 2500, f1: 6000, gain: 0.07, p0: 0.5 }); });
pop(C.chip1, 0.18, 1000, 520, 0.2);
C.pans.forEach((m) => whoosh(m - C.panDur / 2 - 0.05, C.panDur + 0.12, { f0: 280, f1: 2600, q: 1.1, gain: 0.34, p0: 0.7, p1: -0.7 }));
whoosh(C.gauge, 0.28, { f0: 600, f1: 5000, q: 5, gain: 0.1, p0: 0.3 }); tick(C.gauge + 0.3, 0.3, 2400, 0.3);
C.chips2.forEach((t, i) => pop(t + 0.12, 0.2, 1000 + i * 120, 480, 0.4));
tick(C.flip2, 0.3, 3000, 0.4); bell(C.flip2 + 0.1, mtof(91), 0.1, 0.4, { dec: 10 });
{
  const o1 = osc('saw'), lp = svf('lp'), dur = C.route1 - C.route0;
  play(fx, C.route0, dur, (t) => { const u = t / dur; return lp(o1(92 + 50 * u + 3 * Math.sin(TAU * 9 * t)), 500 + 1200 * u, 1.5) * Math.sin(Math.PI * u); }, { gain: 0.13, panFn: (t) => -0.2 + 0.7 * (t / dur) });
}
bell(C.route1, mtof(91), 0.16, 0.45, { dec: 7 }); pop(C.route1, 0.15, 1200, 600, 0.45);
C.chips3.forEach((t, i) => pop(t, 0.18, 950 + i * 180, 480, 0.2));
C.checks.forEach((t, i) => { tick(t, 0.3, 2800, 0.35); bell(t + 0.02, mtof([84, 88, 91][i]), 0.12, 0.35, { dec: 9 }); });
[84, 88, 91, 96].forEach((m, i) => bell(C.resolved + i * 0.035, mtof(m), 0.1, 0.35, { dec: 5, len: 1.2 }));
pop(C.folder, 0.15, 900, 450, 0.3);

// 05 — La promesse.
whoosh(C.slab, C.sc5 - C.slab + 0.04, { f0: 200, f1: 3000, q: 1, gain: 0.35, shape: 'rise', p0: 0.2, p1: -0.1 });
slam(C.sc5, 1.1); crash(C.sc5, 0.35, 1.6); boom(C.sc5, 0.4);
for (let q = 25; q < 28; q++) { kick(b(q), 0.85); if (q % 2 === 1) clap(b(q), 0.55); }
for (let q = 24; q < 27; q++) hat(b(q + 0.5), 0.16, false, -0.2);
for (let k = 1; k <= 12; k++) tick(C.count0 + (k - 0.5) / 12 * (C.count1 - C.count0), 0.22, 2900 - k * 60, 0.55);
pop(C.count1 + 0.05, 0.25, 700, 250, 0.55);
slam(C.line2, 1);
{
  const o1 = osc('sin'), dur = C.ringFull - C.ring0;
  play(fx, C.ring0, dur, (t) => { const u = t / dur; return o1(mtof(72 + 24 * u * u)) * 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.2)); }, { gain: 0.12, pan: 0.5, send: 0.3 });
}
bell(C.ringFull, mtof(96), 0.2, 0.5, { dec: 6 });
for (let s = 0; s < 12; s++) snare(b(27 + s / 16), 0.12 + 0.5 * (s / 12));
whoosh(C.ringFly, C.sc6 - C.ringFly + 0.03, { f0: 400, f1: 7000, q: 1.2, gain: 0.3, shape: 'rise', p0: 0.5, p1: 0 });
reverseCymbal(b(27), C.sc6, 0.3);

// 06 — Roger : accord final + « Roger beep ».
impact(C.sc6, 1.15);
padChord(C.sc6, C.DUR - 0.9, [48, 55, 60, 64, 67, 74], 1.25, { cut0: 3200, cut1: 900, att: 0.01, rel: 0.8 });
bassNote(C.sc6, 1.4, 36, 0.5);
[72, 76, 79, 84, 88].forEach((m, i) => pluck(C.sc6 + i * 0.012, m, 1.3, (i - 2) * 0.3, false));
bell(C.sc6, mtof(96), 0.16, 0, { dec: 2.2, len: 1.8 }); bell(C.sc6, mtof(103), 0.08, 0.3, { dec: 2.6, len: 1.8 });
whoosh(C.base2 - 0.05, 0.7, { f0: 2500, f1: 8000, q: 0.9, gain: 0.07 });
chatter(C.mono2, 0.7, 0.05, 40, 0);
{
  // Deux tonalités + souffle de squelch, comme en fin de transmission radio.
  const beep = (t0, f, dur) => {
    const o1 = osc('sq'), bp = svf('bp');
    play(fx, t0, dur, (t) => bp(o1(f), f, 0.9) * Math.min(1, t / 0.003) * Math.min(1, (dur - t) / 0.004), { gain: 0.16, send: 0.15 });
  };
  beep(C.beep, 1175, 0.085);
  beep(C.beep + C.beepGap, 1568, 0.1);
  const bp = svf('bp');
  play(fx, C.beep + C.beepGap + 0.11, 0.12, (t) => bp(noise(), 1900, 0.8) * Math.exp(-t * 30), { gain: 0.1 });
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
for (let i = 0; i < N; i++) { L[i] *= pre * 1.2; R[i] *= pre * 1.2; }
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
