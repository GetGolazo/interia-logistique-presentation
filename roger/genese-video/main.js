/* ROGER — « Un passage. Un prix. Un rapport. » Film de 30 s d'après la Genèse v2 (prototype interne, à valider).
   16:9 (1920×1080) ou 9:16 (1080×1920 avec ?format=9x16). window.seek(t) rend l'image exacte à l'instant t. */
(function () {
  'use strict';
  const C = window.CUES;
  const b = C.b;
  gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin);

  const V = new URLSearchParams(location.search).get('format') === '9x16';
  const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
  const CX = W / 2, CY = H / 2;
  document.documentElement.style.setProperty('--W', W + 'px');
  document.documentElement.style.setProperty('--H', H + 'px');
  if (V) document.documentElement.classList.add('v');

  const INK = '#0B0D12', CREAM = '#F2EEE6', BLUE = '#2F4BFF', YELLOW = '#FFD43B', CORAL = '#FF5A3C', GREEN = '#1FB86B';
  const WATER = '#6E9EFF', PIPE = '#AEB5C0', PIPE2 = '#8D95A2', CAB = '#E6DED0';

  // ---------------------------------------------------------------- mises en page
  const LAND = {
    s1: { box: [150, 236, 660], stamp: { x: 886, y: 356, center: false }, head: { x: 880, tops: [398, 548], size: 130, lh: 150, center: false } },
    map: {
      nodes: { log: [900, 330], art: [300, 640], mag: [900, 850], ges: [1450, 262] },
      ctr: { x: 130, y: 140, dx: 310, dy: 0 },
      feed: { pos: [[1262, 484], [1262, 566], [1262, 648], [1262, 730], [1262, 812], [1262, 894]], align: 'left' },
      key: { tops: [330, 520], size: 150, maxW: 1700 },
    },
    logo: { size: 330, ringY: 452, tag: { lines: ['Comprendre avant de venir.'], top: 668, size: 50, lh: 64 } },
    st: { numX: 166, numY: 312, titleX: 150, titleY: 344, titleMaxW: 860, descX: 162, descMaxW: 850, descSize: 38,
      illX: 1060, illY: 170, illScale: 1, prog: { x: 160, y: 924, w: 1600, names: true } },
    prom: { x: 150, tops: [210, 420, 630], size: 150, lh: 180, lab: { x: 1090, dy: 88, below: false } },
    end: { size: 250, ringY: 380, svc: { lines: ['Roger Dépanne · Roger Répare'], top: 548, size: 52, lh: 66 },
      tag: { lines: ['Un passage. Un prix. Un rapport.'], top: 636, size: 30, lh: 40 },
      zone: { lines: ['Gestion locative · Paris 12<sup>e</sup> et 13<sup>e</sup> · Vincennes · Saint-Mandé'], top: 706, lh: 34 } },
  };
  const VERT = {
    s1: { box: [150, 290, 780], stamp: { x: 540, y: 232, center: true }, head: { x: 540, tops: [1030, 1170], size: 122, lh: 140, center: true } },
    map: {
      nodes: { log: [540, 650], art: [210, 985], mag: [870, 985], ges: [140, 1300] },
      ctr: { x: 90, y: 232, dx: 470, dy: 0 },
      feed: { pos: [[252, 1172], [252, 1242], [252, 1312], [252, 1382], [252, 1452], [252, 1522]], align: 'left' },
      key: { tops: [830, 980], size: 140, maxW: 960 },
    },
    logo: { size: 270, ringY: 860, tag: { lines: ['Comprendre avant de venir.'], top: 1030, size: 54, lh: 70 } },
    st: { numX: 92, numY: 250, titleX: 76, titleY: 282, titleMaxW: 900, descX: 88, descMaxW: 900, descSize: 40,
      illX: 190, illY: 720, illScale: 1.18, prog: { x: 90, y: 1500, w: 900, names: false } },
    prom: { x: 80, tops: [360, 650, 940], size: 150, lh: 180, lab: { x: 86, dy: 190, below: true } },
    end: { size: 230, ringY: 720, svc: { lines: ['Roger Dépanne', 'Roger Répare'], top: 840, size: 58, lh: 72 },
      tag: { lines: ['Un passage. Un prix. Un rapport.'], top: 1012, size: 34, lh: 44 },
      zone: { lines: ['Gestion locative', 'Paris 12<sup>e</sup> et 13<sup>e</sup> · Vincennes · Saint-Mandé'], top: 1080, lh: 40 } },
  };
  const L = V ? VERT : LAND;

  const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
  const proc = [];
  const $ = (q) => document.querySelector(q);
  const clamp = (x, a = 0, c = 1) => Math.min(c, Math.max(a, x));

  // ---------------------------------------------------------------- helpers
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'style') Object.assign(el.style, v);
      else if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const k of kids) el.append(k);
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }
  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
  }
  function splitChars(el) {
    const text = el.textContent; el.textContent = '';
    const out = [];
    for (const c of text) { const sp = h('span', { class: 'ch' }); sp.textContent = c === ' ' ? ' ' : c; el.append(sp); out.push(sp); }
    return out;
  }
  function splitWords(el) {
    const words = el.textContent.split(' '); el.textContent = '';
    const out = [];
    words.forEach((w, i) => {
      const sp = h('span', { class: 'ch' }); sp.textContent = w; el.append(sp); out.push(sp);
      if (i < words.length - 1) el.append(document.createTextNode(' '));
    });
    return out;
  }
  function textWidth(text, css) {
    const e = h('span', { style: Object.assign({ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', left: '0', top: '0' }, css) });
    e.textContent = text; document.body.append(e);
    const w = e.getBoundingClientRect().width; e.remove(); return w;
  }
  const briCSS = (size, w = 800) => ({ fontFamily: 'Brico', fontSize: size + 'px', fontVariationSettings: `'wght' ${w}, 'wdth' 100` });
  function capH(size) {
    const c = document.createElement('canvas').getContext('2d');
    c.font = `800 ${size}px Brico`;
    return c.measureText('H').actualBoundingBoxAscent;
  }
  const ICON = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    store: '<path d="M3 9l1.6-5h14.8L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/>',
    briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    pkg: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>',
  };
  const icon = (name, size, color, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${ICON[name]}</svg>`;

  // Lettres qui montent dans un masque, graisse variable ; entrée puis sortie optionnelle sans chevauchement.
  function chars(list, tIn, tOut, oi = {}, oo = {}) {
    const st = oi.stagger ?? 0.02, dur = oi.dur ?? 0.5, sto = oo.stagger ?? 0.01, duro = oo.dur ?? 0.22;
    list.forEach((c, i) => {
      const a = tIn + i * st;
      const z = tOut == null ? Infinity : tOut + i * sto;
      const d = Math.max(0.04, Math.min(dur, z - a - 0.004));
      tl.fromTo(c, { yPercent: oi.from ?? 112, '--w': oi.w0 ?? 360 },
        { yPercent: 0, '--w': oi.w1 ?? 800, duration: d, ease: oi.ease ?? 'expo.out' }, a);
      if (tOut != null) tl.fromTo(c, { yPercent: 0 }, { yPercent: oo.to ?? -112, duration: duro, ease: 'expo.in' }, Math.max(z, a + d + 0.002));
    });
  }
  // Bloc de lignes en Bricolage (masquées) ; renvoie les caractères de chaque ligne.
  function lineBlock(parent, lines, o) {
    return lines.map((txt, i) => {
      const e = h('div', { class: 'abs mask brico ' + (o.cls || ''), style: { top: o.tops[i] + 'px', fontSize: o.size + 'px', lineHeight: o.lh + 'px', height: o.lh + 'px' } });
      e.textContent = txt; parent.append(e);
      const cs = splitChars(e);
      const w = e.getBoundingClientRect().width;
      e.style.left = (o.center ? o.x - w / 2 : o.x) + 'px';
      gsap.set(cs, { yPercent: 112 });
      return { e, cs, w };
    });
  }
  function fitSize(lines, base, maxW, wght = 800) {
    const w = Math.max(...lines.map((t) => textWidth(t, briCSS(base, wght))));
    return Math.min(base, Math.floor(base * maxW / w));
  }

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+=<>';
  function scramble(el, text, t0, dur, seed) {
    const cs = [...text];
    let last = null;
    proc.push((t) => {
      const p = clamp((t - t0) / dur);
      const rev = Math.floor(p * cs.length + 1e-6);
      const q = Math.round(t * C.FPS / 2);
      let out = '';
      for (let i = 0; i < cs.length; i++) {
        if (i < rev || cs[i] === ' ') out += cs[i];
        else if (p > 0 && i < rev + 7) out += GLYPHS[Math.floor(hash(i * 131 + q * 7 + seed) * GLYPHS.length)];
        else out += ' ';
      }
      if (out !== last) { el.textContent = out; last = out; }
    });
  }
  function pop(el, t, from = {}, o = {}) {
    gsap.set(el, Object.assign({ autoAlpha: 0 }, from));
    tl.fromTo(el, Object.assign({ autoAlpha: 0 }, from),
      Object.assign({ autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: o.rot ?? 0, duration: o.dur ?? 0.5, ease: o.ease ?? 'back.out(1.8)' }), t);
  }
  function center(el, x) { el.style.left = x - el.getBoundingClientRect().width / 2 + 'px'; }

  // Logotype R ⊙ G E R.
  const RING = { d: 1.06, sw: 0.25, dot: 0.155 };
  function wordmark(size, color = CREAM, dotColor = YELLOW) {
    const wrap = h('div', { class: 'abs wm brico', style: { fontSize: size + 'px', color } });
    const css = briCSS(size), cap = capH(size);
    const letter = (c) => { const e = h('span', { class: 'ch wl', style: { width: textWidth(c, css) + 'px' } }); e.textContent = c; return e; };
    const R1 = letter('R'), G = letter('G'), E = letter('E'), R2 = letter('R');
    const oW = textWidth('O', css);
    const D = cap * RING.d, SW = cap * RING.sw, DR = cap * RING.dot;
    const box = h('span', { class: 'ch wring', style: { width: oW + 'px', height: cap + 'px', verticalAlign: 'baseline' } });
    const svg = s('svg', { width: D, height: D, viewBox: `0 0 ${D} ${D}` });
    Object.assign(svg.style, { position: 'absolute', left: (oW - D) / 2 + 'px', top: (cap - D) / 2 + 'px', overflow: 'visible' });
    const ring = s('circle', { cx: D / 2, cy: D / 2, r: (D - SW) / 2, fill: 'none', stroke: color, 'stroke-width': SW, transform: `rotate(-90 ${D / 2} ${D / 2})` });
    const dot = s('circle', { cx: D / 2, cy: D / 2, r: DR, fill: dotColor });
    svg.append(ring, dot); box.append(svg);
    wrap.append(R1, box, G, E, R2);
    return { wrap, R1, G, E, R2, letters: [R1, G, E, R2], box, svg, ring, dot, cap, D, SW, DR };
  }
  function placeWordmark(WM, cx, ringCY) {
    const wr = WM.wrap.getBoundingClientRect(), rr = WM.svg.getBoundingClientRect();
    const offY = rr.top + rr.height / 2 - wr.top, left = cx - wr.width / 2;
    WM.wrap.style.left = left + 'px'; WM.wrap.style.top = (ringCY - offY) + 'px';
    WM.ox = rr.left + rr.width / 2 - wr.left; WM.oy = offY;
    WM.rcx = left + WM.ox; WM.rcy = ringCY;
  }
  function baseLines(parent, cfg) {
    return cfg.lines.map((txt, i) => {
      const e = h('div', { class: 'abs mask brico base', style: { top: cfg.top + i * cfg.lh + 'px', fontSize: cfg.size + 'px', lineHeight: cfg.lh + 'px', height: cfg.lh + 'px' } });
      e.textContent = txt; parent.append(e);
      const ws = splitWords(e);
      center(e, CX);
      return { e, ws };
    });
  }

  // ---------------------------------------------------------------- l'évier (fil rouge : fuite au siphon)
  const SINK_VB = [20, 90, 560, 510];
  const PHOTO_VB = [205, 350, 320, 240];
  const CLOSE_VB = [290, 392, 112, 84];
  function sink(vb, w, hgt, o = {}) {
    const svg = s('svg', { viewBox: vb.join(' '), width: w, height: hgt, preserveAspectRatio: 'xMidYMid slice' });
    svg.style.display = 'block';
    svg.innerHTML = `
      <rect x="80" y="236" width="440" height="340" rx="10" fill="${CAB}"/>
      <rect class="stain" x="200" y="552" width="300" height="20" rx="10" fill="#CDBEA3" opacity="0"/>
      <rect x="40" y="198" width="520" height="42" rx="10" fill="${INK}"/>
      <path d="M168 240 L184 318 Q188 336 206 336 L394 336 Q412 336 416 318 L432 240 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M300 198 L300 132 Q300 102 330 102 L370 102 Q394 102 394 126 L394 146" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="290" y="336" width="20" height="60" fill="${PIPE}" stroke="${INK}" stroke-width="5"/>
      <rect x="338" y="422" width="190" height="22" fill="${PIPE}" stroke="${INK}" stroke-width="5"/>
      <g class="trap">
        <rect x="264" y="392" width="72" height="120" rx="30" fill="#C9CED6" stroke="${INK}" stroke-width="6"/>
        <rect x="276" y="384" width="48" height="18" rx="6" fill="${PIPE2}" stroke="${INK}" stroke-width="5"/>
        <path d="M322 452 l-9 11 l8 6 l-7 11" fill="none" stroke="${CORAL}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g class="trap2" opacity="0">
        <rect x="264" y="392" width="72" height="120" rx="30" fill="#FFFFFF" stroke="${BLUE}" stroke-width="6"/>
        <rect x="276" y="384" width="48" height="18" rx="6" fill="${BLUE}" stroke="${INK}" stroke-width="5"/>
      </g>
      <rect class="joint" x="332" y="416" width="16" height="34" rx="5" fill="${PIPE2}" stroke="${INK}" stroke-width="5"/>
      <ellipse class="puddle" cx="344" cy="566" rx="66" ry="9" fill="${WATER}" opacity=".85"/>
      <rect x="80" y="236" width="440" height="340" rx="10" fill="none" stroke="${INK}" stroke-width="8"/>
      ${o.drop ? `<path d="M0 -9 C0 -9 -6 -1 -6 3 A6 6 0 0 0 6 3 C6 -1 0 -9 0 -9 Z" fill="${WATER}" transform="translate(340 ${o.drop}) scale(1.3)"/>` : ''}
      <g class="drops"></g>`;
    const q = (c) => svg.querySelector('.' + c);
    return { svg, trap: q('trap'), trap2: q('trap2'), joint: q('joint'), puddle: q('puddle'), stain: q('stain'), drops: q('drops') };
  }
  // Gouttes qui tombent du joint (physique simple, déterministe).
  function dripper(sk, times) {
    const x0 = 340, y0 = 452, y1 = 560, tf = 0.3, g2 = 2 * (y1 - y0 - 6) / (tf * tf);
    const items = times.map(() => {
      const d = s('path', { d: 'M0 -9 C0 -9 -6 -1 -6 3 A6 6 0 0 0 6 3 C6 -1 0 -9 0 -9 Z', fill: WATER, opacity: 0 });
      const sp = s('ellipse', { cx: x0, cy: y1 + 3, rx: 4, ry: 1.5, fill: 'none', stroke: WATER, 'stroke-width': 3, opacity: 0 });
      sk.drops.append(d, sp); return { d, sp };
    });
    proc.push((t) => {
      times.forEach((ti, i) => {
        const { d, sp } = items[i];
        const u = t - ti;
        if (u < 0 || u > 0.75) { d.setAttribute('opacity', 0); sp.setAttribute('opacity', 0); return; }
        if (u < 0.16) {
          const k = u / 0.16;
          d.setAttribute('transform', `translate(${x0} ${y0 + 6 * k}) scale(${(0.3 + 0.7 * k).toFixed(3)})`);
          d.setAttribute('opacity', 1); sp.setAttribute('opacity', 0);
        } else if (u < 0.16 + tf) {
          const v = u - 0.16;
          d.setAttribute('transform', `translate(${x0} ${Math.min(y0 + 6 + 0.5 * g2 * v * v, y1).toFixed(1)}) scale(1 1.15)`);
          d.setAttribute('opacity', 1); sp.setAttribute('opacity', 0);
        } else {
          const w = (u - 0.16 - tf) / 0.29;
          d.setAttribute('opacity', 0);
          sp.setAttribute('rx', (4 + 32 * w).toFixed(1)); sp.setAttribute('ry', (1.5 + 4 * w).toFixed(1));
          sp.setAttribute('opacity', ((1 - w) * 0.9).toFixed(3));
        }
      });
    });
  }

  // ---------------------------------------------------------------- HUD & caméra
  function buildHUD() {
    const tc = $('#hud-tr'), sec = $('#hud-bl'), br = $('#hud-br');
    const SECTIONS = [[0, '01 — La panne'], [C.map, '02 — Les allers-retours'], [C.rewind, '03 — Le déclic'],
      [C.sc4, '04 — La méthode'], [C.sc5, '05 — La promesse'], [C.sc6, '06 — Roger']];
    let lastTc = '', lastSec = '', lastBr = '';
    proc.push((t) => {
      const f = Math.min(Math.round(t * C.FPS), C.DUR * C.FPS - 1);
      const txt = `00:00:${String(Math.floor(f / C.FPS)).padStart(2, '0')}:${String(f % C.FPS).padStart(2, '0')}`;
      if (txt !== lastTc) { tc.textContent = txt; lastTc = txt; }
      const tq = f / C.FPS;
      let label = SECTIONS[0][1];
      for (const [t0, l] of SECTIONS) if (tq >= t0 - 1e-6) label = l;
      if (label !== lastSec) { sec.textContent = label; lastSec = label; }
      const note = tq >= C.sc5 - 1e-6 ? 'Genèse v2 · à valider' : 'Scénario de démonstration';
      if (note !== lastBr) { br.textContent = note; lastBr = note; }
    });
    tl.set('#hud', { '--hud': CREAM }, C.zoom0 + 0.3);
    tl.set('#hud', { '--hud': INK }, C.sc4);
    tl.set('#hud', { '--hud': CREAM }, C.sc5 - 0.06);

    const shake = $('#shake');
    const IMP = [[C.trips[0][1], 4], [C.trips[2][1], 4], [C.trips[4][1], 5], [C.key1, 10], [C.key2, 8], [C.drop, 16],
      [C.prom[0], 7], [C.prom[1], 6], [C.prom[2], 6], [C.sc6, 8]];
    proc.push((t) => {
      let x = 0, y = 0, r = 0;
      for (const [t0, A] of IMP) {
        const u = t - t0;
        if (u < 0 || u > 0.5) continue;
        const e = A * Math.exp(-u * 11);
        x += e * Math.sin(u * 2 * Math.PI * 13 + t0);
        y += e * 0.8 * Math.cos(u * 2 * Math.PI * 11 + t0 * 2);
        r += e * 0.035 * Math.sin(u * 2 * Math.PI * 7);
      }
      shake.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
    });
  }

  // ---------------------------------------------------------------- 01 — La panne
  function buildS1() {
    const sc = $('#sc1');
    gsap.set(sc, { autoAlpha: 1 });
    const S = L.s1;
    const content = h('div', { class: 'layer' });
    sc.append(content);
    content.append(h('div', { class: 'abs', style: { left: -W + 'px', top: -H + 'px', width: 3 * W + 'px', height: 3 * H + 'px', background: CREAM } }));

    const [bx, by, bw] = S.box, bh = bw * SINK_VB[3] / SINK_VB[2], k = bw / SINK_VB[2];
    const sk = sink(SINK_VB, bw, bh);
    const sw = h('div', { class: 'abs', style: { left: bx + 'px', top: by + 'px' } });
    sw.append(sk.svg); content.append(sw);
    dripper(sk, C.drips);
    // l'illustration se construit
    gsap.set(sw, { autoAlpha: 0, y: 40 });
    tl.fromTo(sw, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 0);

    // horodatage + titres
    const capTxt = 'MARDI · 08:15 · 75012 PARIS';
    const cap = h('div', { class: 'abs cap', style: { left: S.stamp.x + 'px', top: S.stamp.y + 'px' } });
    content.append(cap);
    if (S.stamp.center) { cap.textContent = capTxt; center(cap, S.stamp.x); cap.textContent = ''; }
    scramble(cap, capTxt, C.stamp, 0.5, 23);
    tl.to(cap, { autoAlpha: 0, duration: 0.2, ease: 'none' }, C.headOut);
    const HS = S.head;
    const h1 = lineBlock(content, ['Une fuite', 'sous l’évier.'], { x: HS.x, tops: HS.tops, size: HS.size, lh: HS.lh, center: HS.center, cls: 's1line' });
    const h2 = lineBlock(content, ['Une panne', 'simple ?'], { x: HS.x, tops: HS.tops, size: HS.size, lh: HS.lh, center: HS.center, cls: 's1line' });
    const c1 = h1.flatMap((l) => l.cs), c2 = h2.flatMap((l) => l.cs);
    chars(c1, C.head1, C.head2 - 0.12, { dur: 0.5, stagger: 0.022, w0: 380 }, { stagger: 0.008 });
    chars(c2, C.head2, C.headOut, { dur: 0.5, stagger: 0.022, w0: 380 }, { stagger: 0.008 });

    // Travelling arrière : l'appartement devient une pastille sur la carte.
    const Fx = bx + (300 - SINK_VB[0]) * k, Fy = by + (408 - SINK_VB[1]) * k;
    const [Nx, Ny] = L.map.nodes.log;
    const kz = 118 / (440 * k);
    const R0 = Math.hypot(Math.max(Fx, W - Fx), Math.max(Fy, H - Fy)) + 40;
    const dz = C.zoom1 - C.zoom0;
    tl.fromTo(content, { x: 0, y: 0, scale: 1 }, { x: Nx - Fx, y: Ny - Fy, scale: kz, duration: dz, ease: 'expo.inOut', transformOrigin: `${Fx}px ${Fy}px` }, C.zoom0);
    tl.fromTo(sc, { clipPath: `circle(${R0}px at ${Fx}px ${Fy}px)` }, { clipPath: `circle(72px at ${Nx}px ${Ny}px)`, duration: dz, ease: 'expo.inOut' }, C.zoom0);
    tl.set('#stage', { backgroundColor: INK }, C.zoom1);
    return { sk };
  }

  // ---------------------------------------------------------------- 02 — Les allers-retours
  const map = {};
  function arcD(A, B, bend) {
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
    return `M${A[0]} ${A[1]} Q${(mx - dy / len * bend).toFixed(1)} ${(my + dx / len * bend).toFixed(1)} ${B[0]} ${B[1]}`;
  }
  function buildS2() {
    const base = $('#sc2'), top = $('#sc2t');
    tl.set([base, top], { autoAlpha: 1 }, C.zoom0 - 0.001);
    base.append(h('div', { class: 'layer', style: { background: INK } }));
    base.append(h('div', { class: 'layer grid-d' }));
    const svg = s('svg', { width: W, height: H, class: 'layer' });
    base.append(svg);
    const M = L.map, N = M.nodes;

    // pastilles
    const nodes = {};
    [['art', 'truck', 'ARTISAN'], ['log', null, 'LOGEMENT'], ['mag', 'store', 'MAGASIN'], ['ges', 'briefcase', 'GESTIONNAIRE']].forEach(([key, ic, lb], i) => {
      const [x, y] = N[key];
      let el = null;
      if (ic) {
        el = h('div', { class: 'abs node', style: { left: x - 72 + 'px', top: y - 72 + 'px' } });
        el.innerHTML = icon(ic, 60, INK, 1.9);
        top.append(el);
        pop(el, C.map + 0.12 + i * 0.09, { scale: 0.2 }, { dur: 0.55, ease: 'back.out(2)' });
      }
      const l = h('div', { class: 'abs node-l', style: { top: y + 94 + 'px' } });
      l.textContent = lb; top.append(l); center(l, x);
      pop(l, C.map + 0.3 + i * 0.09, { y: 10 }, { dur: 0.4, ease: 'expo.out' });
      nodes[key] = { el, l };
    });
    map.nodes = nodes;

    // compteurs
    const ctr = (lbl, col, dx, dy) => {
      const w = h('div', { class: 'abs', style: { left: M.ctr.x + dx + 'px', top: M.ctr.y + dy + 'px' } });
      w.innerHTML = `<div class="ctr-l">${lbl}</div><div class="ctr-n" style="color:${col}">0</div>`;
      top.append(w);
      pop(w, C.map + 0.2 + dx / 3000, { y: 16 }, { dur: 0.45, ease: 'expo.out' });
      return { w, n: w.querySelector('.ctr-n') };
    };
    const cP = ctr('PASSAGES', YELLOW, 0, 0), cE = ctr('ÉCHANGES', CORAL, M.ctr.dx, M.ctr.dy);
    map.ctr = [cP, cE];

    // trajets
    const TRIPS = [
      { a: 'art', z: 'log', bend: -130, col: YELLOW, label: 'PASSAGE 1 · CONSTAT' },
      { a: 'log', z: 'mag', bend: 120, col: CORAL, label: 'IL MANQUE UNE PIÈCE' },
      { a: 'mag', z: 'log', bend: 190, col: CORAL, label: 'PASSAGE 2' },
      { a: 'log', z: 'mag', bend: -95, col: CORAL, label: 'PAS LA BONNE PIÈCE' },
      { a: 'mag', z: 'log', bend: 270, col: CORAL, label: 'PASSAGE 3' },
    ];
    const paths = [], chips = [];
    TRIPS.forEach((tr, i) => {
      const [t0, t1] = C.trips[i];
      const A = N[tr.a], Z = N[tr.z];
      const p = s('path', { d: arcD(A, Z, tr.bend), fill: 'none', stroke: tr.col, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.95 });
      svg.append(p);
      gsap.set(p, { drawSVG: '0%' });
      tl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: t1 - t0, ease: 'power1.inOut' }, t0);
      paths.push(p);
      // étiquette au milieu du trajet
      const len = p.getTotalLength(), mid = p.getPointAtLength(len / 2);
      const side = Math.sign(tr.bend) || 1;
      const dx = Z[0] - A[0], dy = Z[1] - A[1], ln = Math.hypot(dx, dy);
      const ox = -dy / ln * side * 34, oy = dx / ln * side * 34;
      const chip = h('div', { class: 'abs tchip' });
      chip.innerHTML = `<i style="background:${tr.col}"></i>${tr.label}`;
      top.append(chip);
      const cw = chip.getBoundingClientRect().width, chh = chip.getBoundingClientRect().height;
      Object.assign(chip.style, { left: mid.x + ox - cw / 2 + 'px', top: mid.y + oy - chh / 2 + 'px' });
      pop(chip, t0 + 0.2, { scale: 0.6 }, { dur: 0.4, ease: 'back.out(2.5)' });
      const tEnd = i < TRIPS.length - 1 ? C.trips[i + 1][0] + 0.1 : C.dim;
      tl.to(chip, { autoAlpha: 0, scale: 0.85, duration: 0.25, ease: 'power2.in' }, tEnd);
      chips.push(chip);
    });
    map.paths = paths; map.chips = chips;

    // camionnette
    const van = h('div', { class: 'abs van', style: { left: '-25px', top: '-25px' } });
    van.innerHTML = icon('truck', 26, INK, 2.2);
    top.append(van);
    const E = gsap.parseEase('power1.inOut'), E2 = gsap.parseEase('power2.inOut');
    const lens = paths.map((p) => p.getTotalLength());
    let cleanPath = null, cleanLen = 0;
    map.setClean = (p) => { cleanPath = p; cleanLen = p.getTotalLength(); };
    proc.push((t) => {
      let pt = null, op = 0;
      for (let i = 0; i < paths.length; i++) {
        const [t0, t1] = C.trips[i];
        if (t >= t0 && t <= t1) {
          pt = paths[i].getPointAtLength(lens[i] * E(clamp((t - t0) / (t1 - t0))));
          op = Math.min(1, (t - t0) / 0.08, (t1 - t) / 0.08);
        }
      }
      if (cleanPath && t >= C.clean0 && t <= C.clean1 + 0.1) {
        pt = cleanPath.getPointAtLength(cleanLen * E2(clamp((t - C.clean0) / (C.clean1 - C.clean0))));
        op = Math.min(1, (t - C.clean0) / 0.08, (C.clean1 + 0.1 - t) / 0.08);
      }
      if (!pt) { van.style.opacity = '0'; return; }
      van.style.opacity = op.toFixed(3);
      van.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
    });

    // sonnette à chaque arrivée au logement
    const rs = s('svg', { width: W, height: H, class: 'layer' });
    rs.style.overflow = 'visible';
    top.insertBefore(rs, top.firstChild);
    const [lx, ly] = N.log;
    [0, 2, 4].forEach((i, n) => {
      const t1 = C.trips[i][1];
      const c = s('circle', { cx: lx, cy: ly, r: 72, fill: 'none', stroke: CORAL, 'stroke-width': 6 });
      rs.append(c);
      gsap.set(c, { autoAlpha: 0 });
      tl.fromTo(c, { attr: { r: 72, 'stroke-width': 7 }, autoAlpha: 0.9 }, { attr: { r: 170, 'stroke-width': 1 }, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, t1);
      const bell = h('div', { class: 'abs', style: { left: lx + 44 + 'px', top: ly - 108 + 'px', width: '52px', height: '52px', borderRadius: '50%', background: CORAL, display: 'grid', placeItems: 'center' } });
      bell.innerHTML = icon('bell', 28, '#fff', 2.2);
      top.append(bell);
      pop(bell, t1, { scale: 0.3, rotation: -25 }, { dur: 0.45, ease: 'back.out(3)' });
      tl.to(bell, { autoAlpha: 0, scale: 0.6, duration: 0.2, ease: 'power2.in' }, t1 + 0.55 + n * 0.02);
    });

    // messages et relances
    const BUBS = [
      ['LOCATAIRE', GREEN, 'Ça goutte toujours.'],
      ['ARTISAN', YELLOW, 'Il me faut une pièce.'],
      ['PROPRIÉTAIRE', BLUE, 'Quel devis ?'],
      ['LOCATAIRE', GREEN, 'Vous repassez quand ?'],
      ['GESTIONNAIRE', CORAL, 'Relance : un créneau ?'],
      ['ARTISAN', YELLOW, 'Pas la bonne référence.'],
    ];
    const bubs = BUBS.map(([who, col, txt], i) => {
      const e = h('div', { class: 'abs bub' });
      e.innerHTML = `<div class="bub-s"><i style="background:${col}"></i>${who}</div><div class="bub-t">${txt}</div>`;
      top.append(e);
      const [x, y] = M.feed.pos[i];
      const r = e.getBoundingClientRect();
      Object.assign(e.style, { left: (M.feed.align === 'left' ? x : x - r.width / 2) + 'px', top: y - r.height / 2 + 'px' });
      pop(e, C.bubbles[i], { scale: 0.6, y: 18, rotation: i % 2 ? 4 : -4 }, { dur: 0.45, ease: 'back.out(2.2)', rot: i % 2 ? 1.2 : -1.2 });
      return e;
    });
    map.bubs = bubs;

    // compteurs : passages (arrivées au logement) et échanges (messages, appels, relances)
    const arrivals = [C.trips[0][1], C.trips[2][1], C.trips[4][1]];
    arrivals.forEach((t) => tl.fromTo(cP.n, { scale: 1.3 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '0% 70%' }, t));
    C.ex.forEach((t) => tl.fromTo(cE.n, { scale: 1.22 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', transformOrigin: '0% 70%' }, t));
    let lastP = '', lastE = '';
    proc.push((t) => {
      let p = arrivals.filter((a) => a <= t + 1e-6).length;
      let e = C.ex.filter((a) => a <= t + 1e-6).length;
      const r = clamp((t - C.rewind) / 0.6);
      if (r > 0) { p = Math.round(p * (1 - r)); e = Math.round(e * (1 - r)); }
      const sp = String(p), se = String(e);
      if (sp !== lastP) { cP.n.textContent = sp; lastP = sp; }
      if (se !== lastE) { cE.n.textContent = se; lastE = se; }
    });

    // « Ce qui coûte, c'est de revenir. »
    const dim = h('div', { class: 'layer', style: { background: 'rgba(11,13,18,.78)' } });
    top.append(dim);
    gsap.set(dim, { autoAlpha: 0 });
    tl.fromTo(dim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' }, C.dim);
    const K = M.key, l1 = 'Ce qui coûte,', l2 = 'c’est de revenir.';
    const ks = fitSize([l1, l2], K.size, K.maxW);
    const kl = lineBlock(top, [l1, l2], { x: CX, tops: K.tops, size: ks, lh: Math.round(ks * 1.24), center: true, cls: 'keyl' });
    kl[1].cs.slice(9).forEach((c) => { c.style.color = CORAL; });
    chars(kl[0].cs, C.key1, C.keyOut, { dur: 0.55, stagger: 0.025, w0: 300 }, { stagger: 0.008 });
    chars(kl[1].cs, C.key2, C.keyOut, { dur: 0.55, stagger: 0.025, w0: 300 }, { stagger: 0.008 });
    map.dim = dim;
  }

  // ---------------------------------------------------------------- 03 — Le déclic
  function buildS3() {
    const top = $('#sc2t'), base = $('#sc2');
    const N = L.map.nodes;
    // Rembobinage : les trajets se défont, les compteurs retombent.
    tl.to(map.dim, { autoAlpha: 0, duration: 0.3, ease: 'none' }, C.rewind);
    map.paths.slice().reverse().forEach((p, i) => tl.fromTo(p, { drawSVG: '0% 100%' }, { drawSVG: '0% 0%', duration: 0.36, ease: 'power2.in' }, C.rewind + i * 0.07));
    tl.to(map.chips, { autoAlpha: 0, duration: 0.2, ease: 'none' }, C.rewind);
    map.bubs.slice().reverse().forEach((e, i) => tl.to(e, { scale: 0.4, autoAlpha: 0, duration: 0.25, ease: 'back.in(2)' }, C.rewind + i * 0.04));
    tl.to(map.ctr.map((c) => c.w), { autoAlpha: 0, y: -12, duration: 0.25, ease: 'power2.in' }, C.rewind + 0.6);
    [map.nodes.mag, map.nodes.ges].forEach((n, i) => {
      tl.to(n.el, { scale: 0, autoAlpha: 0, duration: 0.3, ease: 'back.in(2)' }, C.rewind + 0.28 + i * 0.05);
      tl.to(n.l, { autoAlpha: 0, duration: 0.2, ease: 'none' }, C.rewind + 0.28);
    });
    // Un seul trajet, propre.
    const svg = base.querySelector('svg');
    const clean = s('path', { d: `M${N.art[0]} ${N.art[1]} L${N.log[0]} ${N.log[1]}`, fill: 'none', stroke: CREAM, 'stroke-width': 6, 'stroke-linecap': 'round' });
    svg.append(clean);
    gsap.set(clean, { drawSVG: '0%' });
    tl.fromTo(clean, { drawSVG: '0%' }, { drawSVG: '100%', duration: C.clean1 - C.clean0, ease: 'power2.inOut' }, C.clean0);
    map.setClean(clean);

    // Le logo.
    const sc = $('#sc3');
    const [lx, ly] = N.log;
    const R = Math.hypot(Math.max(lx, W - lx), Math.max(ly, H - ly)) + 60;
    const wipe = h('div', { class: 'abs', style: { left: lx - R + 'px', top: ly - R + 'px', width: 2 * R + 'px', height: 2 * R + 'px', borderRadius: '50%', background: BLUE } });
    const shock = s('svg', { width: W, height: H, class: 'layer' });
    shock.style.overflow = 'visible';
    const sring = s('circle', { cx: lx, cy: ly, r: 80, fill: 'none', stroke: CREAM, 'stroke-width': 40 });
    shock.append(sring);
    sc.append(wipe, shock);
    gsap.set(wipe, { scale: 0.04 });
    gsap.set(sring, { autoAlpha: 0 });
    tl.set(sc, { autoAlpha: 1 }, C.drop - 0.001);
    tl.fromTo(wipe, { scale: 0.04 }, { scale: 1, duration: 0.6, ease: 'expo.out' }, C.drop);
    tl.fromTo(sring, { attr: { r: 80, 'stroke-width': 44 }, autoAlpha: 0.85 }, { attr: { r: R, 'stroke-width': 2 }, autoAlpha: 0, duration: 0.75, ease: 'expo.out' }, C.drop);
    tl.set(['#sc1', '#sc2', '#sc2t'], { autoAlpha: 0 }, C.drop + 0.5);
    tl.set('#stage', { backgroundColor: BLUE }, C.drop + 0.5);

    const LG = L.logo;
    const WM = wordmark(LG.size);
    sc.append(WM.wrap);
    placeWordmark(WM, CX, LG.ringY);
    WM.wrap.style.overflow = 'hidden';
    const order = [[WM.R1, 0.02], [WM.G, 0.02], [WM.E, 0.08], [WM.R2, 0.14]];
    gsap.set(WM.letters, { yPercent: 105 });
    order.forEach(([el, d]) => tl.fromTo(el, { yPercent: 105, '--w': 250 }, { yPercent: 0, '--w': 800, duration: 0.75, ease: 'expo.out' }, C.drop + d));
    gsap.set(WM.ring, { drawSVG: '0%' });
    gsap.set(WM.dot, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(WM.ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.7, ease: 'expo.out' }, C.drop);
    tl.fromTo(WM.svg, { scale: 0.45, rotation: -140 }, { scale: 1, rotation: 0, duration: 0.85, ease: 'expo.out' }, C.drop);
    tl.fromTo(WM.dot, { scale: 0 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, .35)' }, C.dotPop);
    const dRip = s('circle', { cx: WM.D / 2, cy: WM.D / 2, r: WM.DR, fill: 'none', stroke: YELLOW, 'stroke-width': 4 });
    WM.svg.insertBefore(dRip, WM.dot);
    gsap.set(dRip, { autoAlpha: 0 });
    tl.fromTo(dRip, { attr: { r: WM.DR, 'stroke-width': 8 }, autoAlpha: 1 }, { attr: { r: WM.DR * 3.2, 'stroke-width': 1 }, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, C.dotPop + 0.02);
    tl.fromTo(WM.wrap, { scale: 0.955 }, { scale: 1, duration: C.zoomPrep - C.drop, ease: 'power1.out' }, C.drop);

    const tag = baseLines(sc, LG.tag);
    const words = tag.flatMap((x) => x.ws);
    gsap.set(words, { yPercent: 110 });
    tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06 }, C.tag);

    // Plongée dans le « O ».
    tl.to(tag.map((x) => x.e), { autoAlpha: 0, duration: 0.16, ease: 'none' }, C.zoomStart + 0.08);
    const counterR = (WM.D - 2 * WM.SW) / 2 + 1;
    tl.fromTo(WM.dot, { scale: 1 }, { scale: counterR / WM.DR, duration: 0.3, ease: 'expo.inOut' }, C.zoomPrep);
    tl.to(WM.dot, { fill: CREAM, duration: 0.18, ease: 'none' }, C.zoomPrep + 0.06);
    tl.fromTo(WM.wrap, { scale: 1 }, { scale: 46, duration: C.sc4 - C.zoomStart, ease: 'expo.in', transformOrigin: `${WM.ox}px ${WM.oy}px` }, C.zoomStart);
  }

  // ---------------------------------------------------------------- 04 — La méthode : illustrations (boîte 700 × 640)
  function photoCard(inner, vb, extra = '') {
    const e = h('div', { class: 'abs photoCard' });
    const sk = sink(vb, inner[0], inner[1], { drop: 505 });
    e.append(sk.svg);
    if (extra) e.insertAdjacentHTML('beforeend', extra);
    return { e, sk };
  }

  function illSignal(ill, S) {
    const phone = h('div', { class: 'abs phone', style: { left: '60px', top: '30px', width: '300px', height: '570px' } });
    const scr = h('div', { class: 'abs', style: { left: '14px', top: '14px', right: '14px', bottom: '14px', borderRadius: '36px', background: '#FBF9F5', overflow: 'hidden' } });
    phone.append(scr); ill.append(phone);
    scr.append(h('div', { class: 'abs', style: { left: '50%', top: '14px', width: '90px', height: '22px', marginLeft: '-45px', borderRadius: '11px', background: INK } }));
    const lab = h('div', { class: 'abs lbl', style: { left: '22px', top: '58px' } }); lab.textContent = 'SIGNALEMENT';
    scr.append(lab);
    const th = [0, 1].map((i) => {
      const t = h('div', { class: 'abs thumb', style: { left: 22 + i * 124 + 'px', top: '92px' } });
      t.append(sink(i ? CLOSE_VB : PHOTO_VB, 106, 80, { drop: 505 }).svg);
      scr.append(t); return t;
    });
    const msg = h('div', { class: 'abs msg', style: { left: '22px', top: '216px', width: '228px' } });
    msg.textContent = 'Ça goutte sous l’évier depuis ce matin.';
    scr.append(msg);
    const send = h('div', { class: 'abs', style: { right: '22px', bottom: '26px', width: '60px', height: '60px', borderRadius: '50%', background: BLUE, display: 'grid', placeItems: 'center' } });
    send.innerHTML = icon('send', 28, CREAM, 2.2);
    scr.append(send);

    const fold = h('div', { class: 'abs panel', style: { left: '420px', top: '170px', width: '240px', height: '260px' } });
    fold.innerHTML = `<div class="abs" style="left:0;right:0;top:34px;display:grid;place-items:center">${icon('folder', 96, BLUE, 1.7)}</div>
      <div class="abs t-s" style="left:0;right:0;top:152px;text-align:center;color:${INK};font-weight:700">Dossier du logement</div>
      <div class="abs lbl" style="left:0;right:0;top:190px;text-align:center">2 PHOTOS · 1 MESSAGE</div>`;
    ill.append(fold);
    const cap = h('div', { class: 'abs cap2', style: { left: '60px', top: '612px' } });
    cap.textContent = 'Le gestionnaire peut aussi signaler.';
    ill.append(cap);

    gsap.set(phone, { autoAlpha: 0 });
    tl.fromTo(phone, { y: 90, rotation: -7, autoAlpha: 0 }, { y: 0, rotation: -2, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.1);
    pop(th[0], S + 0.3, { scale: 0.5 }, { ease: 'back.out(2.5)', dur: 0.45 });
    pop(th[1], S + 0.5, { scale: 0.5 }, { ease: 'back.out(2.5)', dur: 0.45 });
    pop(msg, S + 0.72, { y: 20, scale: 0.9 }, { ease: 'back.out(2)', dur: 0.45 });
    tl.fromTo(send, { scale: 1 }, { scale: 0.82, duration: 0.1, ease: 'power2.in', yoyo: true, repeat: 1 }, S + 1.05);
    pop(fold, S + 0.25, { x: 40 }, { ease: 'expo.out', dur: 0.6 });
    // copies qui volent du téléphone vers le dossier
    const fx = 540, fy = 300;
    [[88, 150], [212, 150], [150, 290]].forEach(([x, y], i) => {
      const f = h('div', { class: 'abs', style: { left: x - 34 + 'px', top: y - 26 + 'px', width: '68px', height: '52px', borderRadius: '10px', background: i < 2 ? '#fff' : '#ECE7DE', boxShadow: '0 10px 20px -8px rgba(11,13,18,.4)' } });
      ill.append(f);
      gsap.set(f, { autoAlpha: 0 });
      tl.fromTo(f, { x: 0, y: 0, scale: 1, autoAlpha: 1 }, { x: fx - x, y: fy - y, scale: 0.3, duration: 0.42, ease: 'power2.inOut' }, S + 1.12 + i * 0.06);
      tl.to(f, { autoAlpha: 0, duration: 0.06, ease: 'none' }, S + 1.5 + i * 0.06);
    });
    tl.fromTo(fold, { scale: 1 }, { scale: 1.07, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, S + 1.62);
    pop(cap, S + 1.75, { y: 10 }, { ease: 'expo.out', dur: 0.4 });
  }

  function illComprendre(ill, S) {
    const pc = photoCard([480, 360], PHOTO_VB);
    Object.assign(pc.e.style, { left: '80px', top: '40px' });
    ill.append(pc.e);
    const ov = s('svg', { width: 508, height: 388 });
    Object.assign(ov.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
    const jx = 14 + (340 - PHOTO_VB[0]) * 1.5, jy = 14 + (433 - PHOTO_VB[1]) * 1.5;
    const ring = s('circle', { cx: jx, cy: jy, r: 46, fill: 'none', stroke: CORAL, 'stroke-width': 6, transform: `rotate(-90 ${jx} ${jy})` });
    ov.append(ring); pc.e.append(ov);
    const scan = h('div', { class: 'abs', style: { left: '14px', top: '14px', width: '480px', height: '5px', background: BLUE, boxShadow: '0 0 22px 6px rgba(47,75,255,.45)', borderRadius: '3px' } });
    pc.e.append(scan);
    const a1 = h('div', { class: 'abs anno', style: { left: 80 + jx + 60 + 'px', top: 40 + jy - 24 + 'px', background: CORAL } });
    a1.textContent = 'Fuite au joint du siphon ?';
    const a2 = h('div', { class: 'abs anno', style: { left: 80 + jx + 60 + 'px', top: 40 + jy - 24 + 'px', background: BLUE } });
    a2.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px">${icon('check', 18, '#fff', 3)}Joint usé, siphon fissuré</span>`;
    ill.append(a1, a2);
    const q = h('div', { class: 'abs msg', style: { left: '300px', top: '472px', width: '330px', background: BLUE, color: CREAM, borderRadius: '18px 18px 6px 18px' } });
    q.textContent = 'Une photo du joint, de plus près ?';
    ill.append(q);
    const cu = h('div', { class: 'abs thumb', style: { left: '90px', top: '460px' } });
    cu.append(sink(CLOSE_VB, 176, 132).svg);
    ill.append(cu);

    gsap.set(pc.e, { autoAlpha: 0 });
    tl.fromTo(pc.e, { y: 90, rotation: 5, autoAlpha: 0 }, { y: 0, rotation: -1.5, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.1);
    gsap.set(scan, { autoAlpha: 0 });
    tl.fromTo(scan, { y: 0, autoAlpha: 1 }, { y: 356, duration: 0.55, ease: 'sine.inOut' }, S + 0.3);
    tl.to(scan, { autoAlpha: 0, duration: 0.1, ease: 'none' }, S + 0.82);
    gsap.set(ring, { drawSVG: '0%' });
    tl.fromTo(ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out' }, S + 0.88);
    pop(a1, S + 0.98, { x: -16, scale: 0.8 }, { ease: 'back.out(2)', dur: 0.4 });
    pop(q, S + 1.2, { y: 20, scale: 0.9 }, { ease: 'back.out(2)', dur: 0.45 });
    pop(cu, S + 1.5, { scale: 0.4, rotation: -10 }, { ease: 'back.out(2)', dur: 0.5, rot: -4 });
    gsap.set(a2, { autoAlpha: 0 });
    tl.to(a1, { scaleY: 0, duration: 0.1, ease: 'power2.in' }, S + 1.78);
    tl.fromTo(a2, { scaleY: 0, autoAlpha: 1 }, { scaleY: 1, duration: 0.35, ease: 'back.out(2.5)' }, S + 1.88);
    tl.to(ring, { attr: { stroke: BLUE }, duration: 0.2, ease: 'none' }, S + 1.88);
  }

  function illPreparer(ill, S) {
    const sv = s('svg', { width: 700, height: 640, viewBox: '0 0 700 640' });
    Object.assign(sv.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
    sv.innerHTML = `<path d="M170 440 L530 440 L520 600 L180 600 Z" fill="#D9A800"/>`;
    ill.append(sv);
    const items = [];
    const it = (x, inner, w, hgt) => {
      const g = s('svg', { width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}` });
      Object.assign(g.style, { position: 'absolute', left: x - w / 2 + 'px', top: 470 - hgt + 30 + 'px', overflow: 'visible' });
      g.innerHTML = inner; ill.append(g); items.push(g); return g;
    };
    it(245, `<rect x="4" y="18" width="62" height="104" rx="26" fill="#fff" stroke="${BLUE}" stroke-width="6"/><rect x="14" y="8" width="42" height="16" rx="5" fill="${BLUE}" stroke="${INK}" stroke-width="4"/>`, 70, 126);
    it(355, `<circle cx="40" cy="58" r="26" fill="none" stroke="${BLUE}" stroke-width="9"/><circle cx="62" cy="80" r="20" fill="none" stroke="${INK}" stroke-width="8"/>`, 100, 110);
    it(465, `<circle cx="36" cy="66" r="30" fill="#fff" stroke="${INK}" stroke-width="6"/><circle cx="36" cy="66" r="11" fill="#D9A800" stroke="${INK}" stroke-width="5"/><path d="M84 28 L84 92 M76 28 L92 28" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M108 40 L108 96 M100 40 L116 40" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`, 124, 110);
    const front = s('svg', { width: 700, height: 640, viewBox: '0 0 700 640' });
    Object.assign(front.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
    front.innerHTML = `<path d="M140 478 L560 478 L532 612 L168 612 Z" fill="${YELLOW}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <text x="350" y="560" text-anchor="middle" font-family="JBM" font-weight="700" font-size="20" letter-spacing="4" fill="${INK}">VÉHICULE</text>`;
    ill.append(front);
    const labels = [['Siphon', 245], ['Joints', 355], ['Pièces courantes', 465]].map(([txt, x], i) => {
      const e = h('div', { class: 'abs itm-l', style: { top: 290 + (i % 2) * 44 + 'px' } });
      e.textContent = txt; ill.append(e); center(e, x); return e;
    });
    const tag = h('div', { class: 'abs panel', style: { left: '392px', top: '30px', width: '284px', height: '176px', borderRadius: '26px' } });
    tag.innerHTML = `<div class="abs" style="left:26px;top:26px;width:52px;height:52px;border-radius:14px;background:${CORAL};display:grid;place-items:center">${icon('tag', 30, '#fff', 2.2)}</div>
      <div class="abs t-h" style="left:94px;top:32px;font-size:26px">Prix annoncé</div>
      <div class="abs t-s" style="left:26px;top:100px;line-height:1.35;white-space:normal;width:236px">au gestionnaire, avant l’intervention</div>`;
    ill.append(tag);
    const S0 = S + 0.3;
    items.forEach((g, i) => {
      gsap.set(g, { autoAlpha: 0 });
      tl.fromTo(g, { y: -330, autoAlpha: 1, rotation: [-20, 15, -10][i] }, { y: 0, rotation: 0, duration: 0.55, ease: 'bounce.out' }, S0 + i * 0.25);
      pop(labels[i], S0 + i * 0.25 + 0.3, { y: 12, scale: 0.8 }, { ease: 'back.out(2.5)', dur: 0.4 });
    });
    gsap.set([sv, front], { autoAlpha: 0 });
    tl.fromTo([sv, front], { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' }, S - 0.1);
    pop(tag, S + 1.25, { x: 60, rotation: 8 }, { ease: 'back.out(1.8)', dur: 0.55, rot: 2 });
  }

  function illIntervenir(ill, S) {
    const bw = 600, bh = bw * SINK_VB[3] / SINK_VB[2], k = bw / SINK_VB[2];
    const sk = sink(SINK_VB, bw, bh);
    const wrap = h('div', { class: 'abs', style: { left: '50px', top: '10px' } });
    wrap.append(sk.svg); ill.append(wrap);
    dripper(sk, [S - 0.05, S + 0.28, S + 0.6]);
    const nx = 50 + (300 - SINK_VB[0]) * k, ny = 10 + (393 - SINK_VB[1]) * k;
    const wr = h('div', { class: 'abs', style: { left: nx - 118 + 'px', top: ny - 20 + 'px', width: '116px', height: '116px' } });
    wr.innerHTML = icon('wrench', 116, INK, 2.2);
    ill.append(wr);
    const ok = h('div', { class: 'abs anno', style: { left: '430px', top: '96px', background: BLUE } });
    ok.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px">${icon('check', 18, '#fff', 3)}Fuite réparée</span>`;
    ill.append(ok);
    const cap = h('div', { class: 'abs cap2', style: { left: '56px', top: '600px' } });
    cap.innerHTML = '<b style="color:#0B0D12">Sinon</b> : sécuriser, documenter, indiquer la suite.';
    ill.append(cap);

    gsap.set(wrap, { autoAlpha: 0 });
    tl.fromTo(wrap, { y: 80, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' }, S - 0.12);
    pop(wr, S + 0.25, { scale: 0.4, rotation: -60 }, { ease: 'back.out(2)', dur: 0.35, rot: -25 });
    tl.to(wr, { rotation: 18, duration: 0.14, ease: 'power2.inOut', yoyo: true, repeat: 3, transformOrigin: '85% 20%' }, S + 0.32);
    tl.to(wr, { autoAlpha: 0, x: -40, duration: 0.2, ease: 'power2.in' }, S + 0.95);
    tl.to(sk.trap, { y: 170, rotation: 8, autoAlpha: 0, duration: 0.3, ease: 'power2.in', svgOrigin: '300 450' }, S + 0.78);
    tl.fromTo(sk.trap2, { y: 170, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: 'back.out(1.6)', svgOrigin: '300 450' }, S + 1.0);
    tl.to(sk.joint, { attr: { fill: BLUE }, duration: 0.15, ease: 'none' }, S + 1.22);
    tl.fromTo(sk.joint, { scale: 1.35 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', svgOrigin: '340 433' }, S + 1.22);
    tl.to(sk.stain, { opacity: 1, duration: 0.4, ease: 'none' }, S + 1.1);
    pop(ok, S + 1.42, { scale: 0.6, y: 12 }, { ease: 'back.out(2.5)', dur: 0.45 });
    pop(cap, S + 1.7, { y: 10 }, { ease: 'expo.out', dur: 0.4 });
  }

  function illRapport(ill, S) {
    const doc = h('div', { class: 'abs panel', style: { left: '30px', top: '30px', width: '470px', height: '560px', borderRadius: '26px' } });
    ill.append(doc);
    doc.innerHTML = `<div class="abs t-h" style="left:36px;top:38px">Rapport d’intervention</div>
      <div class="abs lbl" style="left:36px;top:82px">APPT 3B · FUITE SOUS ÉVIER</div>
      <div class="abs" style="left:36px;right:36px;top:118px;height:1.5px;background:rgba(11,13,18,.08)"></div>`;
    const ROWS = [
      ['wrench', INK, 'Cause : joint du siphon'],
      ['pkg', INK, 'Pièces : siphon, joints'],
      ['camera', INK, 'Photos avant / après'],
      ['clock', CORAL, 'À prévoir : remise en état du meuble, sur devis'],
    ];
    const rows = ROWS.map(([ic, col, txt], i) => {
      const r = h('div', { class: 'abs row2', style: { left: '36px', top: 146 + i * 84 + 'px', width: '400px' } });
      r.innerHTML = `<span style="flex:none;margin-top:1px">${icon(ic, 28, col, 2.1)}</span><span style="white-space:normal${col === CORAL ? ';color:' + CORAL : ''}">${txt}</span>`;
      doc.append(r); return r;
    });
    const gx = 600, gy = 280;
    const badge = h('div', { class: 'abs node', style: { left: gx - 72 + 'px', top: gy - 72 + 'px', boxShadow: '0 30px 60px -30px rgba(11,13,18,.5)', background: '#fff' } });
    badge.innerHTML = icon('briefcase', 60, INK, 1.9);
    const bl = h('div', { class: 'abs lbl', style: { top: gy + 92 + 'px' } }); bl.textContent = 'GESTIONNAIRE';
    const rc = h('div', { class: 'abs anno', style: { top: gy + 126 + 'px', background: BLUE } });
    rc.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px">${icon('check', 18, '#fff', 3)}Reçu</span>`;
    ill.append(badge, bl, rc);
    center(bl, gx); center(rc, gx);
    const mini = h('div', { class: 'abs', style: { left: '380px', top: '420px', width: '64px', height: '80px', borderRadius: '10px', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 14px 26px -12px rgba(11,13,18,.5)' } });
    mini.innerHTML = icon('file', 38, BLUE, 2);
    ill.append(mini);

    gsap.set(doc, { autoAlpha: 0 });
    tl.fromTo(doc, { y: 90, rotation: 4, autoAlpha: 0 }, { y: 0, rotation: -1.5, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.1);
    rows.forEach((r, i) => pop(r, S + 0.2 + i * 0.2, { x: 40 }, { ease: 'expo.out', dur: 0.45 }));
    pop(badge, S + 0.3, { scale: 0.3 }, { ease: 'back.out(2)', dur: 0.5 });
    pop(bl, S + 0.4, { y: 8 }, { ease: 'expo.out', dur: 0.4 });
    gsap.set(mini, { autoAlpha: 0 });
    tl.fromTo(mini, { x: 0, y: 0, scale: 0.6, autoAlpha: 1 }, { x: gx - 412, y: gy - 460, scale: 0.35, duration: 0.45, ease: 'power2.inOut' }, S + 1.3);
    tl.to(mini, { autoAlpha: 0, duration: 0.06, ease: 'none' }, S + 1.72);
    tl.fromTo(badge, { scale: 1 }, { scale: 1.1, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, S + 1.74);
    pop(rc, S + 1.8, { scale: 0.6, y: 10 }, { ease: 'back.out(2.5)', dur: 0.45 });
  }

  function buildS4() {
    const sc = $('#sc4');
    sc.append(h('div', { class: 'layer', style: { background: CREAM } }));
    const grid = h('div', { class: 'layer grid' });
    sc.append(grid);
    const track = h('div', { class: 'abs', style: { left: '0px', top: '0px', width: W * 5 + 'px', height: H + 'px' } });
    sc.append(track);
    tl.set(sc, { autoAlpha: 1 }, C.sc4 - 0.001);
    tl.set('#sc3', { autoAlpha: 0 }, C.sc4);
    tl.set('#stage', { backgroundColor: CREAM }, C.sc4);

    const STEPS = [
      { t: 'Signaler', d: ['Le locataire décrit la panne, photos à l’appui.'], dv: ['Le locataire décrit la panne,', 'photos à l’appui.'], ill: illSignal },
      { t: 'Comprendre', d: ['Un diagnostic avant de se déplacer.'], dv: ['Un diagnostic', 'avant de se déplacer.'], ill: illComprendre },
      { t: 'Préparer', d: ['Les bonnes pièces. Le prix annoncé.'], dv: ['Les bonnes pièces.', 'Le prix annoncé.'], ill: illPreparer },
      { t: 'Intervenir', d: ['La technologie prépare, le technicien répare.'], dv: ['La technologie prépare,', 'le technicien répare.'], ill: illIntervenir },
      { t: 'Rendre compte', d: ['Ce qui a été fait, et ce qui reste à prévoir.'], dv: ['Ce qui a été fait,', 'et ce qui reste à prévoir.'], ill: illRapport },
    ];
    const T = L.st;
    const maxW = Math.max(...STEPS.map((st) => textWidth(st.t, briCSS(100)))) * 1.02;
    const F = Math.min(176, Math.floor(100 * T.titleMaxW / maxW));
    const descs = STEPS.map((st) => (V ? st.dv : st.d));
    const dW = Math.max(...descs.flat().map((d) => textWidth(d, { fontFamily: 'Inter', fontWeight: 500, fontSize: '100px', letterSpacing: '-.015em' })));
    const DS = Math.min(T.descSize, Math.floor(100 * T.descMaxW / dW)), DLH = Math.round(DS * 1.36);
    const titles = [], ills = [];
    STEPS.forEach((st, i) => {
      const S = C.st[i];
      const sec = h('div', { class: 'abs', style: { left: i * W + 'px', top: '0px', width: W + 'px', height: H + 'px' } });
      track.append(sec);
      const num = h('div', { class: 'abs st-num', style: { left: T.numX + 'px', top: T.numY + 'px' } });
      num.innerHTML = `<i></i>ÉTAPE 0${i + 1} / 05`;
      const title = h('div', { class: 'abs mask brico st-title', style: { left: T.titleX + 'px', top: T.titleY + 'px', fontSize: F + 'px', lineHeight: Math.round(F * 1.2) + 'px', height: Math.round(F * 1.2) + 'px' } });
      title.textContent = st.t;
      const ill = h('div', { class: 'abs ill', style: { left: T.illX + 'px', top: T.illY + 'px' } });
      sec.append(num, title, ill);
      titles.push(title); ills.push(ill);
      const tc = splitChars(title);
      gsap.set(tc, { yPercent: 112 });
      chars(tc, S - 0.04, null, { dur: 0.6, stagger: 0.028, w0: 300 });
      descs[i].forEach((d, j) => {
        const desc = h('div', { class: 'abs mask st-desc', style: { left: T.descX + 'px', top: T.titleY + Math.round(F * 1.2) + 12 + j * DLH + 'px', fontSize: DS + 'px', lineHeight: DLH + 'px', height: DLH + 4 + 'px' } });
        desc.textContent = d; sec.append(desc);
        const dw = splitWords(desc);
        gsap.set(dw, { yPercent: 110 });
        tl.fromTo(dw, { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: 'expo.out', stagger: 0.035 }, S + 0.14 + j * 0.1);
      });
      gsap.set(num, { autoAlpha: 0 });
      tl.fromTo(num, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'expo.out' }, S - 0.06);
      st.ill(ill, S);
    });

    // Travellings entre les étapes (+ traînée de parallaxe).
    const IS = T.illScale !== 1 ? ` scale(${T.illScale})` : '';
    C.pans.forEach((m, k) => tl.fromTo(track, { x: -W * k }, { x: -W * (k + 1), duration: C.panDur, ease: 'expo.inOut' }, m - C.panDur / 2));
    proc.push((t) => {
      const x = gsap.getProperty(track, 'x');
      grid.style.backgroundPosition = `${(x * 0.35).toFixed(1)}px 0px`;
      let bump = 0;
      for (const m of C.pans) {
        const u = (t - (m - C.panDur / 2)) / C.panDur;
        if (u > 0 && u < 1) bump += Math.pow(Math.sin(Math.PI * u), 2);
      }
      const ib = (bump * 110).toFixed(1), tb = (-bump * 36).toFixed(1);
      for (const e of ills) e.style.transform = `translateX(${ib}px)${IS}`;
      for (const e of titles) e.style.transform = `translateX(${tb}px)`;
    });

    // Barre de progression (5 étapes).
    const PG = T.prog;
    const prog = h('div', { class: 'abs', style: { left: PG.x + 'px', top: PG.y + 'px', width: PG.w + 'px', height: '60px' } });
    sc.append(prog);
    prog.append(h('div', { class: 'abs', style: { left: '0px', top: '7px', width: PG.w + 'px', height: '2px', background: 'rgba(11,13,18,.13)' } }));
    const fill = h('div', { class: 'abs', style: { left: '0px', top: '6px', width: PG.w + 'px', height: '4px', borderRadius: '2px', background: BLUE, transformOrigin: '0% 50%' } });
    prog.append(fill);
    gsap.set(fill, { scaleX: 0 });
    const NAMES = ['01 Signaler', '02 Comprendre', '03 Préparer', '04 Intervenir', '05 Rendre compte'];
    const dots = NAMES.map((nm, i) => {
      const x = (PG.w / 4) * i;
      const d = h('div', { class: 'abs', style: { left: x - 9 + 'px', top: '-1px', width: '18px', height: '18px', borderRadius: '50%', background: CREAM, border: '2.5px solid rgba(11,13,18,.25)' } });
      const lb = h('div', { class: 'abs prog-l', style: { left: x + 'px', top: '30px' } });
      lb.textContent = PG.names ? nm : nm.slice(0, 2);
      prog.append(d, lb);
      const lw = lb.getBoundingClientRect().width;
      lb.style.left = (i === 0 ? x - 9 : i === 4 ? x + 9 - lw : x - lw / 2) + 'px';
      return { d, lb };
    });
    gsap.set(prog, { autoAlpha: 0, y: 20 });
    tl.fromTo(prog, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' }, C.sc4 + 0.1);
    C.st.forEach((S, i) => {
      if (i > 0) tl.fromTo(fill, { scaleX: (i - 1) / 4 }, { scaleX: i / 4, duration: C.panDur, ease: 'expo.inOut' }, C.pans[i - 1] - C.panDur / 2);
      const at = i === 0 ? S + 0.15 : C.pans[i - 1];
      tl.to(dots[i].d, { backgroundColor: BLUE, borderColor: BLUE, duration: 0.1, ease: 'none' }, at);
      tl.fromTo(dots[i].d, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, at);
      tl.to(dots[i].lb, { color: INK, duration: 0.15, ease: 'none' }, at);
    });
  }

  // ---------------------------------------------------------------- 05 — La promesse
  function buildS5() {
    const sc = $('#sc5');
    const slab = h('div', { class: 'abs', style: { left: '-200px', top: '0px', width: W + 400 + 'px', height: H + 320 + 'px', background: INK } });
    sc.append(slab);
    gsap.set(slab, { y: H + 220, skewY: -6 });
    tl.set(sc, { autoAlpha: 1 }, C.slab - 0.001);
    tl.fromTo(slab, { y: H + 220, skewY: -6 }, { y: -160, skewY: 0, duration: 0.42, ease: 'expo.inOut' }, C.slab);
    tl.set('#sc4', { autoAlpha: 0 }, C.sc5 + 0.12);
    tl.set('#stage', { backgroundColor: INK }, C.sc5 + 0.12);

    const P = L.prom;
    const PROM = [
      ['Un passage.', '<b>OBJECTIF</b> : RÉPARER DÈS LA PREMIÈRE VISITE'],
      ['Un prix.', 'ANNONCÉ AVANT L’INTERVENTION'],
      ['Un rapport.', 'TRANSMIS AU GESTIONNAIRE'],
    ];
    const lines = lineBlock(sc, PROM.map((p) => p[0]), { x: P.x, tops: P.tops, size: P.size, lh: P.lh, center: false, cls: 'promline' });
    lines.forEach((ln, i) => {
      chars(ln.cs, C.prom[i], null, { dur: 0.55, stagger: 0.025, w0: 300 });
      const lab = h('div', { class: 'abs prom-l', style: { left: P.lab.x + 'px', top: P.tops[i] + P.lab.dy - (P.lab.below ? 0 : 13) + 'px' } });
      lab.innerHTML = PROM[i][1]; sc.append(lab);
      pop(lab, C.prom[i] + 0.22, { x: -24 }, { ease: 'expo.out', dur: 0.5 });
      tl.to([ln.e, lab], { autoAlpha: 0, y: -30, duration: 0.25, ease: 'power2.in' }, C.sc6 - 0.3 + i * 0.03);
    });
  }

  // ---------------------------------------------------------------- 06 — Roger
  function buildS6() {
    const sc = $('#sc6');
    const g6 = h('div', { class: 'layer' });
    const E6 = L.end;
    const WM = wordmark(E6.size);
    g6.append(WM.wrap);
    sc.append(g6);
    placeWordmark(WM, CX, E6.ringY);
    const R = Math.hypot(Math.max(WM.rcx, W - WM.rcx), Math.max(WM.rcy, H - WM.rcy)) + 60;
    const wipe = h('div', { class: 'abs', style: { left: WM.rcx - R + 'px', top: WM.rcy - R + 'px', width: 2 * R + 'px', height: 2 * R + 'px', borderRadius: '50%', background: BLUE } });
    sc.insertBefore(wipe, g6);
    gsap.set(wipe, { scale: 0 });
    tl.set(sc, { autoAlpha: 1 }, C.sc6 - 0.001);
    tl.fromTo(wipe, { scale: 0.02 }, { scale: 1, duration: 0.7, ease: 'expo.out' }, C.sc6);
    tl.set('#sc5', { autoAlpha: 0 }, C.sc6 + 0.5);
    tl.set('#stage', { backgroundColor: BLUE }, C.sc6 + 0.5);

    gsap.set(WM.svg, { autoAlpha: 0 });
    tl.set(WM.svg, { autoAlpha: 1 }, C.sc6);
    gsap.set(WM.ring, { drawSVG: '0%' });
    tl.fromTo(WM.ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'expo.out' }, C.sc6);
    tl.fromTo(WM.svg, { scale: 0.4, rotation: -120 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'expo.out' }, C.sc6);
    WM.letters.forEach((el) => {
      const r = el.getBoundingClientRect();
      const dx = WM.rcx - (r.left + r.width / 2);
      gsap.set(el, { autoAlpha: 0 });
      tl.fromTo(el, { x: dx * 0.75, scale: 0.55, autoAlpha: 0, '--w': 300 },
        { x: 0, scale: 1, autoAlpha: 1, '--w': 800, duration: 0.75, ease: 'expo.out' }, C.sc6 + 0.08 + Math.abs(dx) / 4000);
    });

    const svc = baseLines(g6, E6.svc).flatMap((x) => x.ws);
    gsap.set(svc, { yPercent: 110 });
    tl.fromTo(svc, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06 }, C.svc);
    const tg = baseLines(g6, E6.tag);
    tg.forEach((x) => { x.e.style.color = YELLOW; x.e.style.setProperty('--w', 700); });
    const tw = tg.flatMap((x) => x.ws);
    gsap.set(tw, { yPercent: 110 });
    tl.fromTo(tw, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: 'expo.out', stagger: 0.05 }, C.tagEnd);
    E6.zone.lines.forEach((html, i) => {
      const z = h('div', { class: 'abs zone', style: { top: E6.zone.top + i * E6.zone.lh + 'px' } });
      z.innerHTML = html; g6.append(z); center(z, CX);
      pop(z, C.zone + i * 0.1, { y: 16 }, { ease: 'expo.out', dur: 0.55 });
    });

    // Double « bip » du point (clin d'œil au « Roger beep » des radios).
    [0, C.beepGap].forEach((dt, i) => {
      const rp = s('circle', { cx: WM.D / 2, cy: WM.D / 2, r: WM.DR, fill: 'none', stroke: YELLOW, 'stroke-width': 5 });
      WM.svg.insertBefore(rp, WM.dot);
      gsap.set(rp, { autoAlpha: 0 });
      tl.fromTo(rp, { attr: { r: WM.DR, 'stroke-width': 7 }, autoAlpha: 1 }, { attr: { r: WM.DR * (4.6 - i), 'stroke-width': 1 }, autoAlpha: 0, duration: 0.9, ease: 'power2.out' }, C.beep + dt);
      tl.fromTo(WM.dot, { scale: 1.45 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '50% 50%' }, C.beep + dt);
    });
    gsap.set(WM.dot, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(WM.dot, { scale: 0 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, .4)' }, C.sc6 + 0.35);
    tl.fromTo(g6, { scale: 1 }, { scale: 1.03, duration: C.DUR - C.sc6, ease: 'power1.out', transformOrigin: `${WM.rcx}px ${WM.rcy}px` }, C.sc6);
  }

  // ---------------------------------------------------------------- montage
  function build() {
    buildHUD();
    buildS1();
    buildS2();
    buildS3();
    buildS4();
    buildS5();
    buildS6();
    tl.set({}, {}, C.DUR);
  }

  window.seek = function (t) {
    tl.time(t, true);
    for (const f of proc) f(t);
  };
  window.__timeline = tl;

  Promise.all([
    document.fonts.load('800 100px Brico'),
    document.fonts.load('500 20px Inter'),
    document.fonts.load('700 20px Inter'),
    document.fonts.load('500 20px JBM'),
  ]).then(() => document.fonts.ready).then(() => {
    build();
    window.seek(0);
    window.__ready = true;
    if (new URLSearchParams(location.search).has('play')) preview();
  });

  // Aperçu temps réel (index.html?play) : clic pour lancer, calé sur l'audio.
  function preview() {
    const stage = $('#stage');
    const fit = () => {
      const k = Math.min(innerWidth / W, innerHeight / H);
      Object.assign(stage.style, { transformOrigin: '0 0', transform: `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})` });
    };
    fit(); addEventListener('resize', fit);
    document.body.style.overflow = 'hidden';
    const audio = new Audio('out/audio.wav');
    const loop = () => {
      if (!audio.paused) window.seek(Math.min(audio.currentTime, C.DUR - 1e-3));
      requestAnimationFrame(loop);
    };
    addEventListener('click', () => { if (audio.paused) { if (audio.ended || audio.currentTime >= C.DUR - 0.05) audio.currentTime = 0; audio.play(); } else audio.pause(); });
    requestAnimationFrame(loop);
  }
})();
