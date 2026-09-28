// Bande-son synthétisée (48 kHz, stéréo, 24 bits) du film « Un passage. Un prix. Un rapport. », calée sur cues.js.
// 96 BPM · Am (la panne, les allers-retours) → C (le déclic) → Am | F | C | G | F (la méthode) → C (la promesse).
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

// ------------------------------------------------------------------ bruitages propres à ce film
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
function rewindFx(t0, dur, g = 1) { // bande qu'on rembobine
  const o1 = osc('saw'), bp = svf('bp'), bn = svf('bp');
  play(fx, t0, dur, (t) => {
    const u = t / dur, f = 260 + 2600 * u * u;
    const am = 0.55 + 0.45 * Math.sign(Math.sin(TAU * (26 + 30 * u) * t));
    return (bp(o1(f), f * 1.5, 2.2) * 0.9 + bn(noise(), 1200 + 5000 * u, 1.5) * 0.7) * am * Math.sin(Math.PI * Math.min(1, u * 1.05));
  }, { gain: g, send: 0.15 });
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
function bloopAt(ti, g, pan) { bloop(ti + 0.46, g, pan); } // la goutte touche le fond du meuble

// ------------------------------------------------------------------ partition
// 96 BPM · Am (la panne, les allers-retours) → C (le déclic) · Am | F | C | G | F (la méthode) · C | F | G → C (la promesse)
const CH = {
  Am: { pad: [45, 52, 57, 60, 64], bass: 33, arp: [69, 72, 76, 79] },
  Dm: { pad: [50, 57, 62, 65, 69], bass: 38, arp: [74, 77, 81, 84] },
  C: { pad: [48, 55, 60, 64, 74], bass: 36, arp: [72, 76, 79, 84] },
  F: { pad: [41, 48, 57, 60, 64], bass: 41, arp: [69, 72, 77, 81] },
  G: { pad: [43, 50, 55, 59, 69], bass: 43, arp: [67, 71, 74, 79] },
};
const PAN = { art: -0.7, log: 0, mag: 0.05, ges: 0.7 };

// 01 — La panne : une goutte qui tombe, régulière.
padChord(0, b(4), [45, 52], 0.9, { cut0: 320, cut1: 700, att: 0.5 });
for (let q = 0; q < 4; q++) hat(b(q + 0.5), 0.08, false, 0.3);
C.drips.forEach((ti) => bloopAt(ti, ti < C.zoom0 ? 0.42 : 0.16, ti < C.zoom0 ? -0.35 : 0));
whoosh(C.head1 - 0.12, 0.3, { f0: 900, f1: 4500, q: 1.6, gain: 0.18 });
whoosh(C.head2 - 0.12, 0.3, { f0: 900, f1: 4500, q: 1.6, gain: 0.18 });
bell(C.head2 + 0.2, mtof(76), 0.07, 0.3, { dec: 8 }); bell(C.head2 + 0.42, mtof(79), 0.07, 0.3, { dec: 6 });
whoosh(C.zoom0 - 0.05, C.zoom1 - C.zoom0 + 0.1, { f0: 4000, f1: 300, q: 1.2, gain: 0.3, shape: 'fall' });
pop(C.zoom1, 0.22, 800, 380);

// 02 — Les allers-retours : la boucle qui tourne en rond.
for (let q = 5; q < 12; q++) { kick(b(q), 0.6); hat(b(q + 0.5), 0.12, false, -0.2); if (q % 2 === 0) clap(b(q), 0.35, 0.1); }
for (let q = 4; q < 12; q++) hat(b(q), 0.05, false, 0.3);
[['Am', 4, 8], ['Dm', 8, 11.75]].forEach(([c, a, z]) => {
  padChord(b(a), b(z), CH[c].pad.slice(0, 3), 0.8, { cut0: 700, cut1: 1100, att: 0.1, rel: 0.2 });
  for (let e = a; e < z; e += 0.5) bassNote(b(e), B * 0.3, CH[c].bass, 0.3);
  for (let s = 0; s < (z - a) * 2; s++) pluck(b(a + s / 2), CH[c].arp[[0, 1, 2, 1][s % 4]], 0.55, s % 2 ? 0.3 : -0.3, false);
});
const TRIPS = [['art', 'log'], ['log', 'mag'], ['mag', 'log'], ['log', 'mag'], ['mag', 'log']];
C.trips.forEach(([t0, t1], i) => {
  const [a, z] = TRIPS[i];
  vroom(t0, t1, PAN[a], PAN[z], 0.28);
  if (z === 'log') { doorbell(t1, 0.2, 0); tick(t1, 0.2, 2400, -0.5); }
});
C.bubbles.forEach((t, i) => bell(t, mtof([88, 91, 86, 93, 89, 95][i]), 0.1, 0.65, { dec: 14, idx: 1.1, len: 0.45 }));
C.ex.filter((t) => !C.bubbles.includes(t)).forEach((t, i) => (i % 3 === 1 ? buzz(t, 0.28, 0.06, 0.5) : tick(t, 0.16, 2600, 0.5)));
// « Ce qui coûte, c'est de revenir. »
slam(C.key1, 1.1); boom(C.key1, 0.45); crash(C.key1, 0.25, 1.6);
slam(C.key2, 1); boom(C.key2, 0.35);
padChord(C.key1, b(15.9), [45, 52, 57, 58], 0.9, { cut0: 500, cut1: 2400, att: 0.3, rel: 0.1 });
for (let q = 12; q < 16; q++) hat(b(q), 0.1, false, 0.2);
riser(b(14), b(15.9), 0.45);

// 03 — Le déclic.
rewindFx(C.rewind, 0.72, 0.42);
vroom(C.clean0, C.clean1, PAN.art, PAN.log, 0.24);
chime(C.clean1, mtof(84), 0.12, 0, 1.2);
reverseCymbal(b(16.2), C.drop, 0.3);
impact(C.drop, 1.1);
bell(C.dotPop, mtof(96), 0.16, -0.1, { dec: 6 }); pop(C.dotPop, 0.2, 1300, 700);
whoosh(C.tag - 0.05, 0.6, { f0: 2500, f1: 7000, q: 0.9, gain: 0.08 });
riser(C.zoomPrep - 0.1, C.sc4, 0.45);
whoosh(C.zoomStart - 0.05, C.sc4 - C.zoomStart + 0.08, { f0: 300, f1: 6000, q: 1.2, gain: 0.35, shape: 'rise' });
crash(C.sc4, 0.28, 1.4);

// Groove du déclic à la fin de la méthode.
for (let q = 17; q < 40; q++) {
  kick(b(q), q === 19 ? 0.6 : 0.85);
  if (q % 2 === 0) clap(b(q), 0.5, 0.05);
  hat(b(q + 0.5), 0.15, q % 4 === 3, -0.2);
  if (q >= 20) { hat(b(q + 0.25), 0.05, false, 0.35); hat(b(q + 0.75), 0.06, false, 0.35); }
}
const prog = [['C', 17, 20], ['Am', 20, 24], ['F', 24, 28], ['C', 28, 32], ['G', 32, 36], ['F', 36, 40]];
prog.forEach(([c, a, z]) => {
  padChord(b(a), b(z), CH[c].pad, 1, { cut0: 1100, cut1: 1600, att: 0.02 });
  for (let e = a; e < z; e += 0.5) {
    if (e % 1 === 0.5) bassNote(b(e), B * 0.42, CH[c].bass, 0.42);
    else if (e === a) bassNote(b(e), B * 0.3, CH[c].bass - 12, 0.3);
  }
  if (a >= 20) for (let s = 0; s < (z - a) * 4; s++) pluck(b(a + s / 4), CH[c].arp[[0, 2, 1, 3][s % 4]] + (s % 8 >= 4 ? 12 : 0), s % 4 === 0 ? 1 : 0.7, (s % 2 ? 0.35 : -0.35), s % 2 === 0);
});

// 04 — La méthode : bruitages de chaque étape.
C.pans.forEach((m) => whoosh(m - C.panDur / 2 - 0.05, C.panDur + 0.12, { f0: 280, f1: 2600, q: 1.1, gain: 0.32, p0: 0.7, p1: -0.7 }));
{ const S = C.st[0]; // Signaler
  shutter(S + 0.3, 0.3, 0.3); shutter(S + 0.5, 0.3, 0.35); pop(S + 0.3, 0.12, 1200, 600, 0.3); pop(S + 0.5, 0.12, 1300, 650, 0.35);
  pop(S + 0.72, 0.2, 900, 450, 0.3); tick(S + 1.05, 0.25, 2600, 0.3);
  whoosh(S + 1.1, 0.5, { f0: 1500, f1: 6000, q: 1.4, gain: 0.14, p0: 0.2, p1: 0.6 });
  chime(S + 1.62, mtof(84), 0.1, 0.6, 1); pop(S + 1.75, 0.08, 900, 500, 0.3); }
{ const S = C.st[1]; // Comprendre
  whoosh(S + 0.3, 0.55, { f0: 900, f1: 4200, q: 4, gain: 0.12, p0: 0.4 });
  whoosh(S + 0.86, 0.3, { f0: 600, f1: 5000, q: 5, gain: 0.1, p0: 0.4 }); pop(S + 0.98, 0.18, 1000, 500, 0.5);
  pop(S + 1.2, 0.18, 900, 450, 0.5); shutter(S + 1.5, 0.28, 0.2); pop(S + 1.52, 0.14, 1200, 600, 0.2);
  tick(S + 1.78, 0.25, 3000, 0.5); chime(S + 1.88, mtof(88), 0.1, 0.5, 1); }
{ const S = C.st[2]; // Préparer
  [0, 1, 2].forEach((i) => { clank(S + 0.3 + i * 0.25 + 0.2, [620, 880, 520][i], 0.24, 0.2 + i * 0.15); pop(S + 0.6 + i * 0.25, 0.12, 1000 + i * 150, 500, 0.3); });
  chime(S + 1.25, mtof(88), 0.12, 0.6, 1); chime(S + 1.33, mtof(95), 0.1, 0.6, 1.2); }
{ const S = C.st[3]; // Intervenir
  [S - 0.05, S + 0.28, S + 0.6].forEach((ti) => bloopAt(ti, 0.35, 0.2));
  pop(S + 0.25, 0.14, 700, 350, 0.1); ratchet(S + 0.32, 0.58, 0.22, 0.1);
  whoosh(S + 0.76, 0.34, { f0: 2000, f1: 300, q: 1.3, gain: 0.18, shape: 'fall', p0: 0.2 });
  clunk(S + 1.12, 0.45, 0.2); tick(S + 1.22, 0.3, 3200, 0.2);
  chime(S + 1.42, mtof(84), 0.12, 0.4, 1); chime(S + 1.5, mtof(91), 0.1, 0.4, 1.3); }
{ const S = C.st[4]; // Rendre compte
  [0, 1, 2, 3].forEach((i) => tick(S + 0.2 + i * 0.2, 0.2, 2600 + i * 200, -0.2)); pop(S + 0.3, 0.16, 800, 400, 0.6);
  whoosh(S + 1.3, 0.46, { f0: 1200, f1: 5000, q: 1.4, gain: 0.14, p0: -0.1, p1: 0.6 });
  chime(S + 1.8, mtof(88), 0.12, 0.6, 1); chime(S + 1.88, mtof(96), 0.1, 0.6, 1.4); }

// 05 — La promesse.
whoosh(C.slab, C.sc5 - C.slab + 0.04, { f0: 200, f1: 3000, q: 1, gain: 0.35, shape: 'rise', p0: 0.2, p1: -0.1 });
[['C', 0], ['F', 1], ['G', 2]].forEach(([c, i]) => {
  const t = C.prom[i];
  slam(t, 0.9); boom(t, 0.3);
  CH[c].arp.forEach((m, j) => pluck(t + j * 0.01, m, 1.1, (j - 1.5) * 0.3, false));
  padChord(t, t + B * (i === 2 ? 1.9 : 1), CH[c].pad, 0.9, { cut0: 1800, cut1: 1400, att: 0.01, rel: 0.2 });
});
for (let q = 40; q < 43; q++) { kick(b(q), 0.7); hat(b(q + 0.5), 0.14, false, -0.2); }
crash(C.prom[0], 0.3, 1.8);
reverseCymbal(b(43), C.sc6, 0.3);

// 06 — Roger : accord final et « Roger beep ».
impact(C.sc6, 1.15);
padChord(C.sc6, C.DUR - 0.9, [48, 55, 60, 64, 67, 74], 1.25, { cut0: 3200, cut1: 900, att: 0.01, rel: 0.8 });
bassNote(C.sc6, 1.4, 36, 0.5);
[72, 76, 79, 84, 88].forEach((m, i) => pluck(C.sc6 + i * 0.012, m, 1.3, (i - 2) * 0.3, false));
bell(C.sc6, mtof(96), 0.16, 0, { dec: 2.2, len: 1.8 }); bell(C.sc6, mtof(103), 0.08, 0.3, { dec: 2.6, len: 1.8 });
whoosh(C.svc - 0.05, 0.7, { f0: 2500, f1: 8000, q: 0.9, gain: 0.07 });
whoosh(C.tagEnd - 0.05, 0.6, { f0: 3000, f1: 8000, q: 0.9, gain: 0.05 });
{
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
for (let i = 0; i < N; i++) { L[i] *= pre * 1.46; R[i] *= pre * 1.46; }
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
