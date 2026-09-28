/* ROGER — « Plan d'exécution ». Film 3 de 30 s d'après la Genèse v2 (prototype interne, à valider).
   Le film est un dossier technique qui se dessine : axonométrie, plan de situation, coupes, nomenclature, tirage.
   16:9 (1920×1080) ou 9:16 (1080×1920 avec ?format=9x16). window.seek(t) rend l'image exacte à l'instant t. */
(function () {
  'use strict';
  const C = window.CUES;
  const b = C.b;
  gsap.registerPlugin(DrawSVGPlugin);

  const V = new URLSearchParams(location.search).get('format') === '9x16';
  const W = V ? 1080 : 1920, H = V ? 1920 : 1080;

  const PAPER = '#F3F4F1', INK = '#1C2127', GREY = '#7D8791', BLUE = '#1F4FA6', TIRAGE = '#163A70', ORANGE = '#F0641E', LINE = '#F4F6FA';
  const TINT = 'rgba(31,79,166,.08)', GLASS = '#E2E8EE';
  const COND = 'Barlow Condensed', SANS = 'Barlow', MONO = 'IBM Plex Mono';
  const AXIS = '30 6 4 6';

  const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
  const proc = [];
  const clamp = (x, a = 0, c = 1) => Math.min(c, Math.max(a, x));
  const lerp = (a, c, u) => a + (c - a) * u;
  const eio = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const eo = (u) => 1 - Math.pow(1 - u, 3);
  const q = (t) => Math.round(t * C.FPS) / C.FPS; // temps quantifié à l'image (textes qui changent)

  // ---------------------------------------------------------------- mises en page
  const LAND = {
    frame: { cols: 8, rows: 5 },
    note: [84, 98], tc: [W - 84, 98], sec: [84, H - 80],
    cart: { x: 1330, y: 874, w: 534, h: 150, logoW: 172, cells: [250, 100, 184], phaseW: 250, off: [620, 0] },
    axo: { S: 23, OX: 1360, OY: 742, eyebrow: [110, 214], head: { x: 104, base: [412, 566], size: 156, maxW: 800 }, label: [1614, 452] },
    map: { x: 712, y: 118, s: 0.96, ctr: [[110, 176], [330, 176]], ctrY: 318, ctrSize: 128, obs: { x: 112, y: 428, w: 560, row: 70 } },
    key: { cx: W / 2, base: [468, 660], size: 178, maxW: 1560 },
    tag: { x: 108, base: [540, 666], size: 124, maxW: 560 },
    ph: { eyebrow: [112, 148], title: [104, 300, 152, 600], sub: [110, 356, 34, 590, 42] },
    prom: { x: 150, base: [356, 570, 784], size: 176, labDy: -150, nota: [150, 928, 954] },
    fin: { x: 440, y: 290, w: 1040, h: 420 },
  };
  const VERT = {
    frame: { cols: 4, rows: 8 },
    note: [84, 102], tc: [W - 84, 102], sec: [84, 1690],
    cart: { x: 56, y: 1720, w: 968, h: 144, logoW: 190, cells: [360, 200, 408], phaseW: 360, off: [0, 220] },
    axo: { S: 29, OX: 560, OY: 1262, eyebrow: [84, 160], head: { x: 76, base: [300, 430], size: 136, maxW: 900 }, label: [724, 1552] },
    map: { x: 70, y: 420, s: 0.94, ctr: [[92, 150], [560, 150]], ctrY: 300, ctrSize: 132, obs: { x: 92, y: 1150, w: 896, row: 80 } },
    key: { cx: W / 2, base: [860, 1010], size: 132, maxW: 900 },
    tag: { x: 92, base: [1300, 1418], size: 110, maxW: 880 },
    ph: { eyebrow: [92, 150], title: [84, 300, 152, 900], sub: [90, 364, 40, 900, 50] },
    prom: { x: 120, base: [520, 820, 1120], size: 150, labDy: -128, nota: [120, 1300, 1330, 1360] },
    fin: { x: 90, y: 560, w: 900, h: 720 },
  };
  const L = V ? VERT : LAND;

  // ---------------------------------------------------------------- outils SVG
  const NS = 'http://www.w3.org/2000/svg';
  let uidN = 0;
  const uid = (p) => `${p}${++uidN}`;
  function S(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null) continue;
      if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v; else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  const cvs = document.createElement('canvas').getContext('2d');
  const fontCSS = (ff, w, size) => `${w} ${size}px "${ff}"`;
  function measure(str, ff, w, size, ls = 0) { cvs.font = fontCSS(ff, w, size); return cvs.measureText(str).width + ls * Math.max(0, [...str].length - 1); }
  function T(p, x, y, str, o = {}) {
    const t = S('text', {
      x, y, fill: o.fill || 'currentColor', 'font-family': o.ff || SANS, 'font-size': o.size || 20, 'font-weight': o.w || 500,
      'text-anchor': o.anchor, 'letter-spacing': o.ls || 0, opacity: o.op, 'dominant-baseline': o.db,
    }, p);
    if (o.html) t.innerHTML = str; else t.textContent = str;
    if (o.maxW) { const w0 = t.getComputedTextLength(); if (w0 > o.maxW) t.setAttribute('font-size', ((o.size || 20) * o.maxW / w0).toFixed(2)); }
    return t;
  }
  const mono = (p, x, y, str, o = {}) => T(p, x, y, str, Object.assign({ ff: MONO, size: 14, w: 500, ls: 1.4, fill: GREY }, o));
  const line = (p, x1, y1, x2, y2, o = {}) => S('line', { x1, y1, x2, y2, stroke: o.stroke || 'currentColor', 'stroke-width': o.sw || 1, 'stroke-dasharray': o.dash, opacity: o.op, 'stroke-linecap': o.cap || 'butt' }, p);
  const rect = (p, x, y, w, h, o = {}) => S('rect', { x, y, width: w, height: h, fill: o.fill || 'none', stroke: o.stroke, 'stroke-width': o.sw, opacity: o.op, rx: o.rx }, p);
  const path = (p, d, o = {}) => S('path', { d, fill: o.fill || 'none', stroke: o.stroke || 'currentColor', 'stroke-width': o.sw || 1.4, 'stroke-linejoin': 'round', 'stroke-linecap': o.cap || 'round', 'stroke-dasharray': o.dash, opacity: o.op }, p);
  const circle = (p, cx, cy, r, o = {}) => S('circle', { cx, cy, r, fill: o.fill || 'none', stroke: o.stroke, 'stroke-width': o.sw, opacity: o.op }, p);
  function hatch(defs, { angle = 45, gap = 6, color = INK, width = 0.9 } = {}) {
    const id = uid('h');
    const pt = S('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap, patternTransform: `rotate(${angle})` }, defs);
    S('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: color, 'stroke-width': width }, pt);
    return `url(#${id})`;
  }
  function cloudPath(cx, cy, rx, ry, n = 13, bulge = 0.56) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) { const r = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * bulge; d += ` A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`; }
    return d;
  }
  const dropD = (x, y, s) => `M${x},${y - 11 * s} C${x + 7 * s},${y - 2 * s} ${x + 6 * s},${y + 5 * s} ${x},${y + 5 * s} C${x - 6 * s},${y + 5 * s} ${x - 7 * s},${y - 2 * s} ${x},${y - 11 * s}Z`;

  // ---------------------------------------------------------------- animations élémentaires
  function drawIn(els, t0, dur = 0.5, o = {}) {
    const list = [].concat(els).filter(Boolean);
    if (!list.length) return;
    gsap.set(list, { drawSVG: '0% 0%' });
    const st = o.stagger ?? 0;
    list.forEach((e, i) => tl.fromTo(e, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: dur, ease: o.ease || 'power2.inOut' }, t0 + i * st));
  }
  // les remplissages suivent le trait (sinon les surfaces apparaissent avant d'être dessinées)
  function fillIn(els, t0, dur = 0.5, o = {}) {
    const list = [].concat(els).filter(Boolean);
    gsap.set(list, { attr: { 'fill-opacity': 0 } });
    const st = o.stagger ?? 0;
    list.forEach((e, i) => tl.fromTo(e, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': 1 }, duration: 0.25, ease: 'power1.out' }, t0 + i * st + dur * 0.65));
  }
  function drawOut(els, t0, dur = 0.3, o = {}) {
    const list = [].concat(els).filter(Boolean);
    const st = o.stagger ?? 0;
    list.forEach((e, i) => tl.fromTo(e, { drawSVG: '0% 100%' }, { drawSVG: '100% 100%', duration: dur, ease: o.ease || 'power2.in' }, t0 + i * st));
  }
  function fadeIn(els, t0, dur = 0.3, o = {}) {
    const list = [].concat(els).filter(Boolean);
    gsap.set(list, { opacity: 0 });
    list.forEach((e, i) => tl.fromTo(e, { opacity: 0 }, { opacity: o.to ?? 1, duration: dur, ease: o.ease || 'power1.out' }, t0 + i * (o.stagger ?? 0)));
  }
  function fadeOut(els, t0, dur = 0.25, o = {}) {
    [].concat(els).filter(Boolean).forEach((e, i) => tl.to(e, { opacity: 0, duration: dur, ease: 'power1.in' }, t0 + i * (o.stagger ?? 0)));
  }
  function pop(el, t0, o = {}) {
    gsap.set(el, { opacity: 0, scale: o.from ?? 0.4, transformOrigin: '50% 50%' });
    tl.fromTo(el, { opacity: 0, scale: o.from ?? 0.4 }, { opacity: 1, scale: 1, duration: o.dur ?? 0.45, ease: o.ease || 'back.out(2.2)', transformOrigin: '50% 50%' }, t0);
  }
  // tampon : arrive grand et de travers, s'écrase
  function stampIn(el, t0, rot) {
    gsap.set(el, { opacity: 0, scale: 1.9, rotation: rot - 10, transformOrigin: '50% 50%' });
    tl.fromTo(el, { opacity: 0, scale: 1.9, rotation: rot - 10 }, { opacity: 0.92, scale: 1, rotation: rot, duration: 0.2, ease: 'power4.in', transformOrigin: '50% 50%' }, t0 - 0.2);
  }
  // texte qui se tape (mono) : révélé caractère par caractère
  function typeOn(el, str, t0, dur, o = {}) {
    const n = [...str].length, chars = [...str];
    let last = null;
    el.textContent = '';
    proc.push((t) => {
      const u = clamp((q(t) - t0) / dur);
      let k = Math.floor(u * n + 1e-6);
      if (o.until !== undefined && q(t) >= o.until) k = 0;
      const s = chars.slice(0, k).join('') + (u > 0 && u < 1 && o.cursor !== false ? '_' : '');
      if (s !== last) { el.textContent = s; last = s; }
    });
  }
  // grand titre : lettres qui montent dans un masque (entrée puis sortie)
  function rise(p, x, y, str, o = {}) {
    const ff = o.ff || COND, w = o.w || 700;
    let size = o.size || 150;
    const ls = (o.ls ?? -0.012) * size;
    const full = measure(str, ff, w, size, ls);
    if (o.maxW && full > o.maxW) size = size * o.maxW / full;
    const lsz = (o.ls ?? -0.012) * size;
    const total = measure(str, ff, w, size, lsz);
    const x0 = o.anchor === 'middle' ? x - total / 2 : x;
    const cid = uid('c');
    const cp = S('clipPath', { id: cid }, defs);
    rect(cp, x0 - size * 0.2, y - size * 1.0, total + size * 0.4, size * 1.3, { fill: '#fff' });
    const g = S('g', { 'clip-path': `url(#${cid})` }, p);
    const cs = [];
    [...str].forEach((ch, i) => {
      const cx = x0 + measure(str.slice(0, [...str].slice(0, i).join('').length), ff, w, size, 0) + lsz * i;
      const cg = S('g', {}, g);
      S('text', { x: cx, y, 'font-family': ff, 'font-weight': w, 'font-size': size, fill: o.fill || 'currentColor', text: ch }, cg);
      cs.push(cg);
    });
    gsap.set(cs, { y: size * 1.36 });
    return { g, cs, size, width: total, x0 };
  }
  function riseIn(r, t0, o = {}) {
    const st = o.stagger ?? 0.022, dur = o.dur ?? 0.55;
    r.cs.forEach((c, i) => {
      const a = t0 + i * st;
      const z = o.out == null ? Infinity : o.out + i * (o.stOut ?? 0.01);
      const d = Math.max(0.05, Math.min(dur, z - a - 0.004));
      tl.fromTo(c, { y: r.size * 1.36 }, { y: 0, duration: d, ease: 'expo.out' }, a);
      if (o.out != null) tl.fromTo(c, { y: 0 }, { y: -r.size * 1.32, duration: 0.24, ease: 'expo.in' }, Math.max(z, a + d + 0.002));
    });
  }

  // ---------------------------------------------------------------- racine, papier, quadrillage, cadre
  const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: `color:${INK}` }, document.getElementById('stage'));
  const defs = S('defs', {}, svg);
  rect(svg, 0, 0, W, H, { fill: PAPER });
  const scenes = S('g', {}, svg);
  const texture = S('image', { x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none', opacity: 0.55 }, svg);
  const gridInk = S('g', {}, svg), gridLine = S('g', { opacity: 0 }, svg);
  const hud = S('g', { style: `color:${INK}` }, svg);

  function paperTexture() {
    const cv = document.createElement('canvas'); cv.width = W / 2; cv.height = H / 2;
    const cx = cv.getContext('2d'), img = cx.createImageData(cv.width, cv.height);
    for (let i = 0; i < cv.width * cv.height; i++) {
      const n = Math.random();
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = n < 0.5 ? 30 : 255;
      img.data[i * 4 + 3] = Math.floor(Math.abs(n - 0.5) * 2 * 22);
    }
    cx.putImageData(img, 0, 0);
    texture.setAttribute('href', cv.toDataURL());
  }
  function grids() {
    for (const [g, col1, col2] of [[gridInk, 'rgba(38,78,110,.07)', 'rgba(38,78,110,.13)'], [gridLine, 'rgba(244,246,250,.06)', 'rgba(244,246,250,.11)']]) {
      const a = uid('g'), bId = uid('g');
      const pm = S('pattern', { id: a, width: 10, height: 10, patternUnits: 'userSpaceOnUse', x: 56, y: 56 }, defs);
      S('path', { d: 'M10 0H0V10', fill: 'none', stroke: col1, 'stroke-width': 0.7 }, pm);
      const pM = S('pattern', { id: bId, width: 50, height: 50, patternUnits: 'userSpaceOnUse', x: 56, y: 56 }, defs);
      S('path', { d: 'M50 0H0V50', fill: 'none', stroke: col2, 'stroke-width': 1 }, pM);
      rect(g, 56, 56, W - 112, H - 112, { fill: `url(#${a})` });
      rect(g, 56, 56, W - 112, H - 112, { fill: `url(#${bId})` });
    }
  }

  // ---------------------------------------------------------------- HUD : cadre de planche, repères, notes, cartouche
  let cart = null, cartBg = null;
  function buildHUD() {
    const g = S('g', {}, hud);
    const outer = rect(g, 24, 24, W - 48, H - 48, { stroke: 'currentColor', sw: 1, op: 0.45 });
    const inner = rect(g, 56, 56, W - 112, H - 112, { stroke: 'currentColor', sw: 2.2 });
    drawIn([inner, outer], C.frame, 0.8, { ease: 'power3.inOut', stagger: 0.08 });
    const { cols, rows } = L.frame;
    const cw = (W - 112) / cols, rh = (H - 112) / rows;
    const refs = [];
    for (let i = 0; i < cols; i++) {
      const cx = 56 + cw * (i + 0.5);
      refs.push(mono(g, cx, 41, String(i + 1), { anchor: 'middle', db: 'central', size: 13, fill: 'currentColor', op: 0.6 }));
      refs.push(mono(g, cx, H - 39, String(i + 1), { anchor: 'middle', db: 'central', size: 13, fill: 'currentColor', op: 0.6 }));
      if (i) { const x = 56 + cw * i; refs.push(line(g, x, 24, x, 56, { op: 0.45 }), line(g, x, H - 56, x, H - 24, { op: 0.45 })); }
    }
    for (let j = 0; j < rows; j++) {
      const cy = 56 + rh * (j + 0.5), Lt = String.fromCharCode(65 + j);
      refs.push(mono(g, 40, cy, Lt, { anchor: 'middle', db: 'central', size: 13, fill: 'currentColor', op: 0.6 }));
      refs.push(mono(g, W - 40, cy, Lt, { anchor: 'middle', db: 'central', size: 13, fill: 'currentColor', op: 0.6 }));
      if (j) { const y = 56 + rh * j; refs.push(line(g, 24, y, 56, y, { op: 0.45 }), line(g, W - 56, y, W - 24, y, { op: 0.45 })); }
    }
    refs.forEach((r) => { r.dataset.op = r.getAttribute('opacity') || 1; });
    gsap.set(refs, { opacity: 0 });
    refs.forEach((r, i) => tl.fromTo(r, { opacity: 0 }, { opacity: +r.dataset.op, duration: 0.2 }, C.frame + 0.25 + (i % 16) * 0.025));
    const tri = (pts) => S('polygon', { points: pts, fill: 'currentColor' }, g);
    const tris = [tri(`${W / 2 - 9},56 ${W / 2 + 9},56 ${W / 2},70`), tri(`${W / 2 - 9},${H - 56} ${W / 2 + 9},${H - 56} ${W / 2},${H - 70}`),
      tri(`56,${H / 2 - 9} 56,${H / 2 + 9} 70,${H / 2}`), tri(`${W - 56},${H / 2 - 9} ${W - 56},${H / 2 + 9} ${W - 70},${H / 2}`)];
    fadeIn(tris, C.frame + 0.6, 0.2);
    // notes : prototype, timecode, séquence
    const note = mono(g, L.note[0], L.note[1], '', { size: 15, fill: 'currentColor', op: 0.75, ls: 2 });
    typeOn(note, 'ROGER · PROTOTYPE INTERNE — NE PAS DIFFUSER', C.frame + 0.3, 0.7, { cursor: false });
    const tc = mono(g, L.tc[0], L.tc[1], '00:00:00:00', { size: 15, fill: 'currentColor', op: 0.75, ls: 2, anchor: 'end' });
    const sec = mono(g, L.sec[0], L.sec[1], '', { size: 15, fill: 'currentColor', op: 0.75, ls: 2 });
    const SECTIONS = [[0, '01 — LA PANNE'], [C.map0, '02 — LES ALLERS-RETOURS'], [C.erase, '03 — LE DÉCLIC'], [C.sc4, '04 — LA MÉTHODE'], [C.sc5, '05 — LA PROMESSE'], [C.sc6, '06 — ROGER']];
    let lt = '', ls = '';
    proc.push((t) => {
      const f = Math.min(Math.round(t * C.FPS), C.DUR * C.FPS - 1);
      const txt = `00:00:${String(Math.floor(f / C.FPS)).padStart(2, '0')}:${String(f % C.FPS).padStart(2, '0')}`;
      if (txt !== lt) { tc.textContent = txt; lt = txt; }
      const tq = f / C.FPS;
      let s = SECTIONS[0][1];
      for (const [t0, l] of SECTIONS) if (tq >= t0 - 1e-6) s = l;
      if (tq < C.frame + 0.5) s = '';
      if (s !== ls) { sec.textContent = s; ls = s; }
    });
    // en 9:16 le cartouche recouvre la note de séquence : on la cache quand il arrive
    if (V) tl.to(sec, { opacity: 0, duration: 0.2 }, C.cart);
    cart = buildCartouche();
  }

  function buildCartouche() {
    const c = L.cart;
    const g = S('g', {}, hud);
    const off = S('g', {}, g);
    const bg = rect(off, c.x, c.y, c.w, c.h, { stroke: 'currentColor', sw: 2 });
    bg.setAttribute('fill', PAPER);
    cartBg = bg;
    const r1 = c.y + c.h * 0.4, r2 = c.y + c.h * 0.7;
    line(off, c.x, r1, c.x + c.w, r1); line(off, c.x, r2, c.x + c.w, r2);
    line(off, c.x + c.logoW, c.y, c.x + c.logoW, r1);
    T(off, c.x + 16, r1 - 16, 'ROGER', { ff: COND, w: 800, size: 44, ls: 1.5 });
    mono(off, c.x + c.logoW + 14, c.y + 20, 'DOSSIER', { size: 11, fill: 'currentColor', op: 0.6 });
    T(off, c.x + c.logoW + 14, r1 - 14, 'Appt 3B — Fuite sous évier', { ff: SANS, w: 600, size: 22, maxW: c.w - c.logoW - 28 });
    let cx = c.x;
    const vals = [];
    [['PHASE', ''], ['ÉCHELLE', ''], ['INDICE', 'A · à valider']].forEach(([k, v], i) => {
      if (i) line(off, cx, r1, cx, r2);
      mono(off, cx + 12, r1 + 16, k, { size: 10.5, fill: 'currentColor', op: 0.6 });
      vals.push(T(off, cx + 12, r2 - 9, v, { ff: SANS, w: 600, size: 17, maxW: c.cells[i] - 22 }));
      cx += c.cells[i];
    });
    const cellW = c.phaseW / 5, cells = [];
    for (let i = 0; i < 5; i++) {
      const px = c.x + i * cellW;
      cells.push(rect(off, px, r2, cellW, c.y + c.h - r2, { fill: BLUE, op: 0 }));
      if (i) line(off, px, r2, px, c.y + c.h);
    }
    const nums = [];
    for (let i = 0; i < 5; i++) nums.push(mono(off, c.x + (i + 0.5) * cellW, (r2 + c.y + c.h) / 2, `0${i + 1}`, { anchor: 'middle', db: 'central', size: 12, w: 600, fill: 'currentColor' }));
    line(off, c.x + c.phaseW, r2, c.x + c.phaseW, c.y + c.h);
    mono(off, c.x + c.phaseW + 12, (r2 + c.y + c.h) / 2, 'Scénario de démonstration', { db: 'central', size: 11, maxW: c.w - c.phaseW - 22, fill: 'currentColor', op: 0.6 });
    // contenu selon le moment
    const PH = [[C.cart, 'Ouverture du dossier', '1:2000', 0], [C.st[0], '01 · Signaler', 'Sans', 1], [C.st[1], '02 · Comprendre', '1:10', 2], [C.st[2], '03 · Préparer', 'Sans', 3],
      [C.st[3], '04 · Intervenir', '1:10', 4], [C.st[4], '05 · Rendre compte', 'Sans', 5], [C.sc5, 'La promesse', 'Sans', 5]];
    let last = '';
    proc.push((t) => {
      const tq = q(t);
      let cur = PH[0];
      for (const p of PH) if (tq >= p[0] - 1e-6) cur = p;
      const key = cur[1] + cur[3];
      if (key === last) return;
      last = key;
      vals[0].textContent = cur[1]; vals[1].textContent = cur[2];
      cells.forEach((r, i) => r.setAttribute('opacity', i < cur[3] ? (i === cur[3] - 1 ? 1 : 0.25) : 0));
      nums.forEach((n, i) => n.setAttribute('fill', i === cur[3] - 1 ? '#fff' : 'currentColor'));
    });
    // entrée (glisse depuis le bord) et sortie à la signature
    gsap.set(g, { x: c.off[0], y: c.off[1], opacity: 1 });
    tl.fromTo(g, { x: c.off[0], y: c.off[1] }, { x: 0, y: 0, duration: 0.55, ease: 'power3.out' }, C.cart);
    tl.to(g, { x: c.off[0], y: c.off[1], duration: 0.4, ease: 'power3.in' }, C.blue0 + 0.05);
    return { g };
  }

  // ---------------------------------------------------------------- axonométrie (01)
  let isoS = 24, isoX = 0, isoY = 0;
  const P = (x, y, z) => [isoX + (x - y) * 0.8660254 * isoS, isoY + (x + y) * 0.5 * isoS - z * isoS];
  const pts = (arr) => arr.map((p) => P(...p).map((v) => v.toFixed(1)).join(',')).join(' ');
  const poly = (p, arr, o = {}) => S('polygon', { points: pts(arr), fill: o.fill || PAPER, stroke: o.stroke || 'currentColor', 'stroke-width': o.sw ?? 1.2, 'stroke-linejoin': 'round' }, p);
  const seg3 = (p, a, c, o = {}) => { const [x1, y1] = P(...a), [x2, y2] = P(...c); return line(p, x1, y1, x2, y2, o); };

  function buildAxo() {
    const A = L.axo;
    isoS = A.S; isoX = A.OX; isoY = A.OY;
    const fcId = uid('fc');
    rect(S('clipPath', { id: fcId }, defs), 57, 57, W - 114, H - 114, { fill: '#fff' });
    const root = S('g', {}, S('g', { 'clip-path': `url(#${fcId})` }, scenes));
    const ctx = S('g', { style: `color:${GREY}` }, root);
    const lower = S('g', {}, root), f3full = S('g', {}, root), f3cut = S('g', {}, root), rappel = S('g', {}, root), upper = S('g', {}, root);
    const lines = { ctx: [], lower: [], f3: [], upper: [] };
    const B = 11, RDC = 4.2, FL = 3.1, zF = (n) => RDC + (n - 1) * FL;
    const box = (g, arr, x0, y0, z0, x1, y1, z1, o = {}) => {
      if (!o.noLeft) arr.push(poly(g, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], o));
      if (!o.noRight) arr.push(poly(g, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], o));
      if (!o.noTop) arr.push(poly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], Object.assign({}, o, { fill: o.top || o.fill })));
    };
    const winY = (g, arr, y, xa, xb, za, zb, fill = GLASS) => arr.push(poly(g, [[xa, y, za], [xb, y, za], [xb, y, zb], [xa, y, zb]], { fill, sw: 0.8 }));
    const winX = (g, arr, x, ya, yb, za, zb, fill = GLASS) => arr.push(poly(g, [[x, ya, za], [x, yb, za], [x, yb, zb], [x, ya, zb]], { fill, sw: 0.8 }));
    const floorWin = (g, arr, z, h, french) => {
      for (let i = 0; i < 4; i++) {
        const c = (B * (i + 0.5)) / 4;
        winY(g, arr, B, c - 0.55, c + 0.55, z + (french ? 0.05 : 0.7), z + h - 0.55);
        winX(g, arr, B, c - 0.55, c + 0.55, z + (french ? 0.05 : 0.7), z + h - 0.55);
      }
    };
    const balcony = (g, arr, z) => {
      arr.push(seg3(g, [0.3, B + 0.45, z + 0.95], [B - 0.3, B + 0.45, z + 0.95], { sw: 1.3 }));
      arr.push(seg3(g, [B + 0.45, 0.3, z + 0.95], [B + 0.45, B - 0.3, z + 0.95], { sw: 1.3 }));
      arr.push(seg3(g, [0.3, B + 0.45, z], [B - 0.3, B + 0.45, z], { sw: 1 }));
      arr.push(seg3(g, [B + 0.45, 0.3, z], [B + 0.45, B - 0.3, z], { sw: 1 }));
      for (let x = 0.5; x < B - 0.3; x += 0.42) arr.push(seg3(g, [x, B + 0.45, z], [x, B + 0.45, z + 0.95], { sw: 0.6 }));
      for (let y = 0.5; y < B - 0.3; y += 0.42) arr.push(seg3(g, [B + 0.45, y, z], [B + 0.45, y, z + 0.95], { sw: 0.6 }));
    };
    // sol et voisins (contexte, en gris)
    lines.ctx.push(poly(ctx, [[-13, -13, 0], [B + 2.2, -13, 0], [B + 2.2, B + 2.2, 0], [-13, B + 2.2, 0]], { fill: 'none', sw: 1 }));
    box(ctx, lines.ctx, -12, 0.2, 0, -0.2, B, 19.2, { sw: 1, noRight: true });
    for (let n = 0; n < 5; n++) for (let i = 0; i < 4; i++) { const c = -12 + (12 * (i + 0.5)) / 4; winY(ctx, lines.ctx, B, c - 0.5, c + 0.5, 4.9 + n * FL, 6.7 + n * FL, PAPER); }
    box(ctx, lines.ctx, 0.2, -12, 0, B, -0.2, 18.4, { sw: 1, noLeft: true });
    for (let n = 0; n < 5; n++) for (let i = 0; i < 4; i++) { const c = -12 + (12 * (i + 0.5)) / 4; winX(ctx, lines.ctx, B, c - 0.5, c + 0.5, 4.9 + n * FL, 6.7 + n * FL, PAPER); }
    // bas de l'immeuble : RDC (vitrines) + étages 1 et 2
    box(lower, lines.lower, 0, 0, 0, B, B, RDC, { noTop: true });
    for (let i = 0; i < 4; i++) { const c = (B * (i + 0.5)) / 4; winY(lower, lines.lower, B, c - 0.95, c + 0.95, 0.25, RDC - 0.7, '#D5DEE7'); winX(lower, lines.lower, B, c - 0.95, c + 0.95, 0.25, RDC - 0.7, '#D5DEE7'); }
    for (let n = 1; n <= 2; n++) { box(lower, lines.lower, 0, 0, zF(n), B, B, zF(n) + FL, { noTop: true }); floorWin(lower, lines.lower, zF(n), FL, n === 2); }
    balcony(lower, lines.lower, zF(2));
    // étage 3 entier (avant la coupe)
    const f3l = [];
    box(f3full, f3l, 0, 0, zF(3), B, B, zF(3) + FL, { noTop: true });
    floorWin(f3full, f3l, zF(3), FL, false);
    lines.lower.push(...f3l);
    // étage 3 coupé à 1,10 m : plancher, murs en poché, mobilier, évier
    const z0 = zF(3), z1 = z0 + 1.1, t = 0.38;
    poly(f3cut, [[0, 0, z0], [B, 0, z0], [B, B, z0], [0, B, z0]], { fill: '#ECE8E0', sw: 1 });
    for (let k = 1; k < 22; k++) seg3(f3cut, [k * 0.5, 0, z0], [k * 0.5, B, z0], { sw: 0.5, stroke: '#CFC7B8' });
    const walls = [];
    const holes = []; for (let i = 0; i < 4; i++) { const c = (B * (i + 0.5)) / 4; holes.push([c - 0.6, c + 0.6]); }
    const run = (a, z, hs, mk) => { let s = a; for (const [h0, h1] of hs) { if (h0 > s) mk(s, h0); s = h1; } if (z > s) mk(s, z); };
    walls.push([0, 0, B, t], [0, 0, t, B]);
    run(0, B, holes, (s, e) => walls.push([s, B - t, e, B]));
    run(0, B, holes, (s, e) => walls.push([B - t, s, B, e]));
    walls.push([5.4, t, 5.6, 3.4], [3.6, 3.4, 7.4, 3.6], [5.4, 3.6, 5.6, B - t], [5.6, 6.2, 7.6, 6.4], [8.8, 6.2, B - t, 6.4], [t, 6.2, 2.2, 6.4], [3.4, 6.2, 5.4, 6.4]);
    const furn = [[6.0, 0.45, 10.55, 1.05, 0.9], [0.6, 0.45, 3.2, 1.3, 0.45], [7.0, 2.6, 8.6, 3.6, 0.75], [1.2, 7.4, 3.2, 9.6, 0.5], [8.2, 7.6, 10.2, 9.8, 0.5]];
    const items = walls.map((w) => ({ w, d: w[0] + w[1] + w[2] + w[3] })).concat(furn.map((f) => ({ f, d: f[0] + f[1] + f[2] + f[3] })));
    items.sort((a, c) => a.d - c.d);
    const junk = [];
    for (const it of items) {
      if (it.w) { const [x0, y0, x1, y1] = it.w; box(f3cut, junk, x0, y0, z0, x1, y1, z1, { top: INK, sw: 0.7 }); }
      else { const [x0, y0, x1, y1, h] = it.f; box(f3cut, junk, x0, y0, z0, x1, y1, z0 + h, { sw: 0.8 }); if (x0 === 6.0) { poly(f3cut, [[8.0, 0.55, z0 + h], [9.0, 0.55, z0 + h], [9.0, 0.95, z0 + h], [8.0, 0.95, z0 + h]], { fill: '#C9D3DC', sw: 0.7 }); } }
    }
    gsap.set(f3cut, { opacity: 0 });
    // haut de l'immeuble : étage 4, corniche, toit à la Mansart
    const zb = zF(4);
    box(upper, lines.upper, 0, 0, zb, B, B, zb + FL, { noTop: true });
    floorWin(upper, lines.upper, zb, FL, true);
    balcony(upper, lines.upper, zb);
    box(upper, lines.upper, -0.2, -0.2, zb + FL, B + 0.2, B + 0.2, zb + FL + 0.35, { sw: 1 });
    const zr = zb + FL + 0.35, hR = 3.6, i1 = 1.6, zt = zr + hR;
    lines.upper.push(poly(upper, [[0, B, zr], [B, B, zr], [B - i1, B - i1, zt], [i1, B - i1, zt]], { fill: '#E1E5EA' }));
    lines.upper.push(poly(upper, [[B, 0, zr], [B, B, zr], [B - i1, B - i1, zt], [B - i1, i1, zt]], { fill: '#D3D9DF' }));
    lines.upper.push(poly(upper, [[i1, i1, zt], [B - i1, i1, zt], [B - i1, B - i1, zt], [i1, B - i1, zt]], { fill: '#EDF0F2' }));
    for (let k = 1; k < 12; k++) {
      lines.upper.push(seg3(upper, [(B * k) / 12, B, zr], [i1 + ((B - 2 * i1) * k) / 12, B - i1, zt], { sw: 0.5, op: 0.6 }));
      lines.upper.push(seg3(upper, [B, (B * k) / 12, zr], [B - i1, i1 + ((B - 2 * i1) * k) / 12, zt], { sw: 0.5, op: 0.6 }));
    }
    for (let k = 0; k < 3; k++) {
      const cx = (B * (k + 0.5)) / 3, yy = B - i1 * 0.45;
      box(upper, lines.upper, cx - 0.55, yy - 0.7, zr + 0.35, cx + 0.55, yy, zr + hR * 0.62, { sw: 0.9 });
      winY(upper, lines.upper, yy, cx - 0.33, cx + 0.33, zr + 0.55, zr + hR * 0.55);
      const cy = (B * (k + 0.5)) / 3, xx = B - i1 * 0.45;
      box(upper, lines.upper, xx - 0.7, cy - 0.55, zr + 0.35, xx, cy + 0.55, zr + hR * 0.62, { sw: 0.9 });
      winX(upper, lines.upper, xx, cy - 0.33, cy + 0.33, zr + 0.55, zr + hR * 0.55);
    }
    for (const [cx, cy] of [[2.2, i1 + 0.2], [6.2, i1 + 0.2]]) {
      box(upper, lines.upper, cx, cy, zt, cx + 1.6, cy + 0.6, zt + 1.3, { sw: 0.9 });
      for (let k = 0; k < 4; k++) box(upper, lines.upper, cx + 0.15 + k * 0.38, cy + 0.15, zt + 1.3, cx + 0.4 + k * 0.38, cy + 0.42, zt + 1.62, { sw: 0.6 });
    }
    // lignes de rappel de l'éclatement
    const lift = 5.4;
    const rp = [[0, B], [B, B], [B, 0]].map(([x, y]) => seg3(rappel, [x, y, z1], [x, y, zb + lift], { sw: 1.1, dash: '6 6', stroke: GREY }));

    // tracé progressif : contexte, puis l'immeuble de bas en haut
    drawIn(lines.ctx, C.axo0, 0.5, { stagger: 0.004 });
    fillIn(lines.ctx, C.axo0, 0.5, { stagger: 0.004 });
    const all = lines.lower.concat(lines.upper);
    const stA = (C.axo1 - C.axo0 - 0.6) / all.length;
    drawIn(all, C.axo0 + 0.15, 0.45, { stagger: stA });
    fillIn(all, C.axo0 + 0.15, 0.45, { stagger: stA });
    // la coupe : l'étage 3 s'ouvre, le haut se soulève
    tl.to(f3full, { opacity: 0, duration: 0.3, ease: 'power1.in' }, C.lift);
    tl.fromTo(f3cut, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' }, C.lift + 0.1);
    gsap.set(upper, { y: 0 });
    tl.fromTo(upper, { y: 0 }, { y: -lift * isoS, duration: 0.7, ease: 'power3.inOut' }, C.lift);
    drawIn(rp, C.lift + 0.35, 0.4, { stagger: 0.05 });

    // la fuite : nuage de révision, goutte, étiquette
    const [sx, sy] = P(8.5, 0.75, z0 + 0.9);
    const fx = S('g', {}, root);
    const cl = path(fx, cloudPath(sx, sy + 4, 46, 28, 12), { stroke: ORANGE, sw: 2.2 });
    drawIn(cl, C.leak, 0.45);
    const dr = S('path', { d: dropD(sx, sy - 34, 1.8), fill: ORANGE }, fx);
    pop(dr, C.leak + 0.15);
    const [lx, ly] = A.label;
    const ld = path(fx, `M${sx + 30},${sy - 20} L${lx - 24},${ly + 44} L${lx},${ly + 44}`, { stroke: 'currentColor', sw: 1.3 });
    drawIn(ld, C.leak + 0.3, 0.3);
    const card = S('g', {}, fx);
    rect(card, lx, ly, 250, 124, { fill: '#fff', stroke: 'currentColor', sw: 1.3 });
    rect(card, lx, ly, 250, 32, { fill: INK });
    mono(card, lx + 14, ly + 21, '', { fill: '#fff', size: 12.5, html: true }).innerHTML = 'APPT 3B · 3<tspan baseline-shift="super" font-size="8.5">E</tspan> ÉTAGE';
    T(card, lx + 14, ly + 70, 'Fuite sous l’évier', { size: 25, w: 600 });
    mono(card, lx + 14, ly + 102, 'MARDI · 08:15', { size: 12.5, fill: ORANGE });
    pop(card, C.leak + 0.5, { from: 0.85, dur: 0.35, ease: 'power3.out' });
    // textes
    const eb = mono(root, A.eyebrow[0], A.eyebrow[1], '', { size: V ? 20 : 19, fill: 'currentColor', ls: 3 });
    typeOn(eb, 'MARDI · 08:15 · PARIS 12E', C.stamp, 0.45, { until: C.head2Out + 0.2 });
    const hd = A.head;
    const h1 = [rise(root, hd.x, hd.base[0], 'Une fuite', { size: hd.size, maxW: hd.maxW }), rise(root, hd.x, hd.base[1], 'sous l’évier.', { size: hd.size, maxW: hd.maxW })];
    riseIn(h1[0], C.head1, { out: C.head1Out }); riseIn(h1[1], C.head1 + 0.12, { out: C.head1Out + 0.06 });
    const h2 = [rise(root, hd.x, hd.base[0], 'Une panne', { size: hd.size, maxW: hd.maxW }), rise(root, hd.x, hd.base[1], 'simple ?', { size: hd.size, maxW: hd.maxW })];
    riseIn(h2[0], C.head2, { out: C.head2Out }); riseIn(h2[1], C.head2 + 0.12, { out: C.head2Out + 0.06 });

    // sortie : tout rétrécit vers le « logement » du plan de situation
    const [ax, ay] = P(5.5, 5.5, 0);
    const zo = { tx: ax, ty: ay, s: 1 };
    const tgt = mapPoint(LOG.x, LOG.y);
    tl.fromTo(zo, { tx: ax, ty: ay, s: 1 }, { tx: tgt[0], ty: tgt[1], s: 0.2, duration: C.zoomOut1 - C.zoomOut0, ease: 'power3.inOut' }, C.zoomOut0);
    tl.to([ctx, fx], { opacity: 0, duration: 0.3 }, C.zoomOut0 - 0.1);
    tl.to(root, { opacity: 0, duration: 0.25 }, C.zoomOut1 - 0.2);
    proc.push(() => root.setAttribute('transform', `translate(${zo.tx.toFixed(2)} ${zo.ty.toFixed(2)}) scale(${zo.s.toFixed(4)}) translate(${-ax} ${-ay})`));
  }

  // ---------------------------------------------------------------- plan de situation (02, 03)
  // coordonnées du plan : 1000 × 760 unités, posées selon le format
  const LOG = { x: 500, y: 405 };
  const mapPoint = (x, y) => [L.map.x + x * L.map.s, L.map.y + y * L.map.s];
  let mapRoot = null;
  function buildMap() {
    const M = L.map;
    const root = S('g', {}, scenes);
    const plan = S('g', { transform: `translate(${M.x} ${M.y}) scale(${M.s})` }, root);
    mapRoot = root;
    const hl = hatch(defs, { gap: 9, color: 'rgba(28,33,39,.22)', width: 1 });
    const lines = [];
    // îlots à pans coupés
    const xs = [[0, 278], [322, 678], [722, 1000]], ys = [[0, 228], [272, 538], [582, 760]];
    const blocks = [];
    xs.forEach(([x0, x1], i) => ys.forEach(([y0, y1], j) => {
      const c = 16;
      const cut = (edgeL, edgeT, edgeR, edgeB) => [edgeL, edgeT, edgeR, edgeB];
      const [l, tp, r, bt] = cut(i > 0, j > 0, i < 2, j < 2);
      const d = `M${x0 + (l && tp ? c : 0)},${y0} L${x1 - (r && tp ? c : 0)},${y0} ${r && tp ? `L${x1},${y0 + c}` : ''} L${x1},${y1 - (r && bt ? c : 0)} ${r && bt ? `L${x1 - c},${y1}` : ''} L${x0 + (l && bt ? c : 0)},${y1} ${l && bt ? `L${x0},${y1 - c}` : ''} L${x0},${y0 + (l && tp ? c : 0)} Z`;
      const fill = S('path', { d, fill: hl, stroke: 'none' }, plan);
      const out = path(plan, d, { sw: 1.3 });
      blocks.push({ fill, out });
      lines.push(out);
      // découpage des parcelles
      const n = 2 + ((i * 3 + j) % 3);
      for (let k = 1; k < n; k++) {
        const x = x0 + ((x1 - x0) * k) / n + (((i + j + k) % 2) ? 14 : -10);
        lines.push(line(plan, x, y0 + 8, x, y1 - 8, { sw: 0.8, op: 0.55 }));
      }
      lines.push(line(plan, x0 + 8, (y0 + y1) / 2 + (j - 1) * 12, x1 - 8, (y0 + y1) / 2 + (j - 1) * 12, { sw: 0.8, op: 0.55 }));
    }));
    // axes de rue
    for (const y of [250, 560]) lines.push(line(plan, 0, y, 1000, y, { sw: 0.8, dash: '14 10', op: 0.45 }));
    for (const x of [300, 700]) lines.push(line(plan, x, 0, x, 760, { sw: 0.8, dash: '14 10', op: 0.45 }));
    // lieux
    const place = (x, y, w, h, name, lx, ly, anchor = 'start') => {
      const g = S('g', {}, plan);
      const r = rect(g, x, y, w, h, { fill: PAPER, stroke: 'currentColor', sw: 2.2 });
      const hh = rect(g, x + 6, y + 6, w - 12, h - 12, { fill: hatch(defs, { gap: 5, color: INK, width: 1 }) });
      const tag = S('g', {}, g);
      const tw = measure(name, MONO, 600, 13, 2) + 22;
      const tx = anchor === 'end' ? lx - tw : lx;
      rect(tag, tx, ly - 15, tw, 26, { fill: INK, rx: 3 });
      mono(tag, tx + 11, ly + 3, name, { size: 13, w: 600, fill: '#fff', ls: 2 });
      return { g, r, hh, tag };
    };
    const P_LOG = place(450, 350, 100, 110, 'LOGEMENT', 452, 478);
    const P_ART = place(90, 620, 110, 80, 'ARTISAN', 92, 722);
    const P_MAG = place(800, 616, 120, 84, 'MAGASIN', 802, 722);
    const P_GES = place(810, 60, 110, 96, 'GESTIONNAIRE', 812, 178);
    // flèche du nord et échelle graphique
    const nx = 948, ny = 300;
    const north = S('g', {}, plan);
    circle(north, nx, ny, 24, { stroke: 'currentColor', sw: 1.2 });
    S('path', { d: `M${nx},${ny - 34} L${nx + 9},${ny + 10} L${nx},${ny + 3} L${nx - 9},${ny + 10} Z`, fill: 'currentColor' }, north);
    T(north, nx, ny - 42, 'N', { ff: COND, w: 700, size: 20, anchor: 'middle' });
    const sc = S('g', {}, plan);
    for (let k = 0; k < 4; k++) rect(sc, 360 + k * 50, 736, 50, 8, { fill: k % 2 ? PAPER : INK, stroke: 'currentColor', sw: 1 });
    ['0', '50', '100', '150', '200 m'].forEach((s, k) => mono(sc, 360 + k * 50, 728, s, { size: 11, anchor: k ? 'middle' : 'start', fill: 'currentColor' }));
    const ttl = mono(plan, 0, -14, 'PLAN DE SITUATION · ÉCH. 1:2000', { size: 14, fill: 'currentColor', ls: 2 });

    // tracé du plan : les îlots depuis le logement
    const order = lines.map((l, i) => ({ l, i })).sort((a, c) => a.i - c.i).map((o) => o.l);
    drawIn(order, C.map0, 0.55, { stagger: 0.012 });
    fadeIn(blocks.map((k) => k.fill), C.map0 + 0.4, 0.5, { stagger: 0.03 });
    for (const pl of [P_LOG, P_ART, P_MAG, P_GES]) { drawIn(pl.r, C.map0 + 0.3, 0.4); fadeIn(pl.hh, C.map0 + 0.6, 0.3); pop(pl.tag, C.map0 + 0.7, { from: 0.7, dur: 0.3, ease: 'power3.out' }); }
    fadeIn([north, sc, ttl], C.map0 + 0.8, 0.4);

    // ---------------- les allers-retours
    const DOOR = { A: [150, 582], L: [450, 405], M: [860, 616] };
    const route = (from, to, lane) => {
      const o = lane * 7;
      if (from === 'A') return [[150, 616], [150, 560 + o], [300 + o, 560 + o], [300 + o, 405 + o], [450, 405 + o]];
      const lm = [[450, 405 + o], [300 - o, 405 + o], [300 - o, 560 - o], [860 + o, 560 - o], [860 + o, 616]];
      return from === 'L' ? lm : lm.slice().reverse();
    };
    const trips = [route('A', 'L', 0), route('L', 'M', -1), route('M', 'L', 1), route('L', 'M', -2), route('M', 'L', 2)];
    const labels = ['PASSAGE 1 · CONSTAT', 'IL MANQUE UNE PIÈCE', 'PASSAGE 2', 'PAS LA BONNE RÉFÉRENCE', 'PASSAGE 3'];
    const tripG = S('g', {}, plan);
    const dashes = [];
    const van = S('g', {}, plan);
    circle(van, 0, 0, 13, { fill: ORANGE, stroke: '#fff', sw: 3 });
    gsap.set(van, { opacity: 0 });
    const vanPath = [];
    trips.forEach((pts, k) => {
      const [t0, t1] = C.trips[k];
      // longueur et tirets le long du trajet
      const segs = [];
      let Ltot = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], Ltot, l]); Ltot += l; }
      const at = (s) => { for (const [a, c, s0, l] of segs) if (s <= s0 + l + 1e-6) { const u = (s - s0) / l; return [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u]; } const e = pts[pts.length - 1]; return e; };
      const DL = 12, GAP = 8;
      const my = [];
      for (let s = 0; s < Ltot; s += DL + GAP) {
        const [x1, y1] = at(s), [x2, y2] = at(Math.min(Ltot, s + DL));
        const d = line(tripG, x1, y1, x2, y2, { stroke: ORANGE, sw: 3.6, cap: 'round' });
        d.style.visibility = 'hidden';
        my.push({ d, s: s / Ltot });
      }
      dashes.push(my);
      vanPath.push({ t0, t1, at, Ltot });
    });
    proc.push((t) => {
      // tirets : apparaissent derrière la camionnette, s'effacent au déclic (ordre inverse)
      const er = clamp((t - C.erase) / 0.45);
      dashes.forEach((my, k) => {
        const [t0, t1] = C.trips[k];
        const u = clamp((t - t0) / (t1 - t0));
        const keep = 1 - clamp(er * 5 - (4 - k));
        my.forEach(({ d, s }) => { const vis = u > 0 && s <= eio(u) && keep > 1e-6 && s <= keep && t < C.erase + 0.5; d.style.visibility = vis ? 'visible' : 'hidden'; });
      });
      let shown = false;
      for (const v of vanPath) {
        if (t >= v.t0 && t <= v.t1 + 0.15) {
          const u = eio(clamp((t - v.t0) / (v.t1 - v.t0)));
          const [x, y] = v.at(u * v.Ltot);
          van.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          shown = true;
        }
      }
      van.style.opacity = shown ? 1 : 0;
    });
    // puces : une seule visible à la fois
    const chipAt = [[190, 520], [560, 520], [560, 598], [560, 520], [560, 598]];
    labels.forEach((txt, k) => {
      const g = S('g', {}, plan);
      const w = measure(txt, MONO, 600, 13, 1.6) + 30;
      const [cx, cy] = chipAt[k];
      rect(g, cx, cy - 15, w, 30, { fill: '#fff', stroke: k ? ORANGE : ORANGE, sw: 1.8, rx: 4 });
      circle(g, cx + 12, cy, 5, { fill: ORANGE });
      mono(g, cx + 24, cy + 5, txt, { size: 13, w: 600, fill: INK, ls: 1.6 });
      const [t0] = C.trips[k];
      pop(g, t0 + 0.12, { from: 0.8, dur: 0.3, ease: 'power3.out' });
      const tEnd = k < 4 ? C.trips[k + 1][0] + 0.1 : C.dim;
      tl.to(g, { opacity: 0, duration: 0.15 }, tEnd);
    });
    // repères d'arrivée au logement (passages 1, 2, 3)
    const arr = [];
    [0, 2, 4].forEach((k, i) => {
      const g = S('g', {}, plan);
      const x = 420 - i * 44, y = 330;
      circle(g, x, y, 17, { fill: PAPER, stroke: ORANGE, sw: 2 });
      T(g, x, y + 6, String(i + 1), { ff: MONO, w: 600, size: 16, anchor: 'middle', fill: ORANGE });
      pop(g, C.trips[k][1], { from: 0.2, dur: 0.4 });
      arr.push(g);
    });
    tl.to(arr, { opacity: 0, scale: 0.4, duration: 0.25, stagger: 0.04, ease: 'power2.in', transformOrigin: '50% 50%' }, C.erase);

    // ---------------- compteurs
    const counters = S('g', {}, root);
    const mk = (i, lab, col) => {
      const [x, y] = M.ctr[i];
      mono(counters, x, y, lab, { size: V ? 17 : 15, fill: 'currentColor', ls: 3 });
      const n = T(counters, x - 4, M.ctrY, '0', { ff: COND, w: 700, size: M.ctrSize, fill: col });
      return n;
    };
    const nP = mk(0, 'PASSAGES', ORANGE), nE = mk(1, 'ÉCHANGES', INK);
    fadeIn(counters, C.map0 + 0.5, 0.35);
    const arrivals = [C.trips[0][1], C.trips[2][1], C.trips[4][1]];
    let lp = '', le = '';
    proc.push((t) => {
      let p = arrivals.filter((a) => a <= t + 1e-6).length, e = C.ex.filter((a) => a <= t + 1e-6).length;
      const r = clamp((t - C.erase) / 0.5);
      if (r > 0) { p = Math.round(p * (1 - r)); e = Math.round(e * (1 - r)); }
      if (String(p) !== lp) { nP.textContent = p; lp = String(p); }
      if (String(e) !== le) { nE.textContent = e; le = String(e); }
    });
    tl.to(counters, { opacity: 0, duration: 0.3 }, C.erase + 0.6);

    // ---------------- observations (les échanges)
    const O = M.obs;
    const obs = S('g', {}, root);
    mono(obs, O.x, O.y, 'OBSERVATIONS', { size: 14, fill: 'currentColor', ls: 3 });
    const obsLine = line(obs, O.x, O.y + 14, O.x + O.w, O.y + 14, { sw: 1.6 });
    fadeIn(obs, C.map0 + 0.6, 0.3);
    const MSG = [['LOCATAIRE', 'Ça goutte toujours.'], ['ARTISAN', 'Il me faut une pièce.'], ['PROPRIÉTAIRE', 'Quel devis ?'], ['LOCATAIRE', 'Vous repassez quand ?'], ['GESTIONNAIRE', 'Relance : un créneau ?'], ['ARTISAN', 'Pas la bonne référence.']];
    const rows = [];
    MSG.forEach(([who, txt], i) => {
      const y = O.y + 14 + (i + 1) * O.row;
      const g = S('g', {}, obs);
      mono(g, O.x, y - O.row + (V ? 34 : 30), who, { size: V ? 13.5 : 12.5, fill: GREY });
      const tt = T(g, O.x, y - (V ? 16 : 14), '', { ff: SANS, w: 500, size: V ? 30 : 25 });
      line(g, O.x, y, O.x + O.w, y, { sw: 0.8, op: 0.3 });
      gsap.set(g, { opacity: 0 });
      tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.15 }, C.msgs[i]);
      typeOn(tt, `« ${txt} »`.replace(' ?', ' ?').replace(' :', ' :'), C.msgs[i] + 0.05, 0.4, { cursor: false });
      rows.push(g);
    });
    tl.to(obs, { opacity: 0, duration: 0.3 }, C.erase + 0.1);

    // ---------------- « Ce qui coûte, c'est de revenir. »
    const dim = rect(root, 0, 0, W, H, { fill: PAPER });
    gsap.set(dim, { opacity: 0 });
    tl.fromTo(dim, { opacity: 0 }, { opacity: 0.9, duration: 0.3 }, C.dim);
    tl.to(dim, { opacity: 0, duration: 0.35 }, C.keyOut + 0.25);
    const K = L.key;
    const k1 = rise(root, K.cx, K.base[0], 'Ce qui coûte,', { size: K.size, maxW: K.maxW, anchor: 'middle' });
    const k2 = rise(root, K.cx, K.base[1], 'c’est de revenir.', { size: K.size, maxW: K.maxW, anchor: 'middle' });
    const rev = 'revenir.';
    k2.cs.slice(-rev.length).forEach((c) => c.querySelector('text').setAttribute('fill', ORANGE));
    riseIn(k1, C.key1, { out: C.keyOut, stagger: 0.025 });
    riseIn(k2, C.key2, { out: C.keyOut + 0.05, stagger: 0.025 });
    // une cote mesure « revenir. »
    const full = k2.width, x0 = k2.x0;
    const revW = measure(rev, COND, 700, k2.size, -0.012 * k2.size);
    const cx0 = x0 + full - revW, cx1 = x0 + full, cy = K.base[1] + k2.size * 0.28;
    const cg = S('g', { style: `color:${ORANGE}` }, root);
    const cl = [line(cg, cx0 - 14, cy, cx1 + 14, cy, { sw: 1.2 }), line(cg, cx0, cy - 18, cx0, cy + 8, { sw: 0.9 }), line(cg, cx1, cy - 18, cx1, cy + 8, { sw: 0.9 }),
      line(cg, cx0 - 7, cy + 7, cx0 + 7, cy - 7, { sw: 2.2 }), line(cg, cx1 - 7, cy + 7, cx1 + 7, cy - 7, { sw: 2.2 })];
    drawIn(cl, C.keyCote, 0.4, { stagger: 0.04 });
    const cm = mono(cg, (cx0 + cx1) / 2, cy + (V ? 36 : 32), '3 PASSAGES · 14 ÉCHANGES', { size: V ? 17 : 17, anchor: 'middle', fill: ORANGE, w: 600, ls: 2.2 });
    fadeIn(cm, C.keyCote + 0.25, 0.25);
    tl.to(cg, { opacity: 0, duration: 0.2 }, C.keyOut + 0.1);

    // ---------------- 03 — le déclic : un seul trajet, préparé
    const clean = path(plan, route('A', 'L', 0).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' '), { stroke: BLUE, sw: 4.5 });
    drawIn(clean, C.clean0, C.clean1 - C.clean0, { ease: 'power2.inOut' });
    const one = S('g', {}, plan);
    circle(one, 420, 330, 17, { fill: PAPER, stroke: BLUE, sw: 2.2 });
    T(one, 420, 336, '1', { ff: MONO, w: 600, size: 16, anchor: 'middle', fill: BLUE });
    pop(one, C.clean1 - 0.05, { from: 0.2 });
    const oc = S('g', {}, plan);
    const ow = measure('OBJECTIF · UN PASSAGE', MONO, 600, 13, 1.6) + 30;
    rect(oc, 190, 505, ow, 30, { fill: '#fff', stroke: BLUE, sw: 1.8, rx: 4 });
    circle(oc, 202, 520, 5, { fill: BLUE });
    mono(oc, 214, 525, 'OBJECTIF · UN PASSAGE', { size: 13, w: 600, fill: INK, ls: 1.6 });
    pop(oc, C.clean1, { from: 0.8, dur: 0.3, ease: 'power3.out' });
    const TG = L.tag;
    const t1 = rise(root, TG.x, TG.base[0], 'Comprendre', { size: TG.size, maxW: TG.maxW });
    const t2 = rise(root, TG.x, TG.base[1], 'avant de venir.', { size: TG.size, maxW: TG.maxW, fill: BLUE });
    riseIn(t1, C.tag, { out: C.zoomIn0 - 0.05 }); riseIn(t2, C.tag + 0.12, { out: C.zoomIn0 });
    // appel de détail sur le logement, puis plongée dedans
    const [lx, ly] = mapPoint(LOG.x, LOG.y);
    const call = S('g', {}, root);
    const cc = circle(call, lx, ly, 84, { stroke: BLUE, sw: 2.2 });
    drawIn(cc, C.callout, 0.4);
    const cb = S('g', {}, call);
    circle(cb, lx + 60, ly - 60, 17, { fill: PAPER, stroke: BLUE, sw: 2 });
    T(cb, lx + 60, ly - 54, 'A', { ff: COND, w: 700, size: 22, anchor: 'middle', fill: BLUE });
    pop(cb, C.callout + 0.25, { from: 0.3 });
    // la carte grossit et s'efface pendant la plongée
    const mz = { s: 1 };
    tl.fromTo(mz, { s: 1 }, { s: 5, duration: C.zoomIn1 - C.zoomIn0, ease: 'power3.in' }, C.zoomIn0);
    tl.to(root, { opacity: 0, duration: 0.2 }, C.zoomIn1 - 0.2);
    proc.push(() => { if (mz.s !== 1) root.setAttribute('transform', `translate(${lx} ${ly}) scale(${mz.s.toFixed(4)}) translate(${-lx} ${-ly})`); else root.removeAttribute('transform'); });
  }

  // ---------------------------------------------------------------- la coupe du meuble sous évier (réutilisée)
  function section(p, ox, oy, s, o = {}) {
    const X = (x) => ox + x * s, Y = (y) => oy - y * s;
    const col = o.ink || INK, lw = o.lw || 1;
    const g = S('g', {}, p);
    const cut = hatch(defs, { gap: 6, color: col, width: 0.9 * lw });
    const wallH = hatch(defs, { gap: 11, color: col, width: 0.8 * lw });
    const ground = hatch(defs, { gap: 7, color: col, width: 0.9 * lw });
    const lines = [], fills = [];
    const R = (x0, y0, x1, y1, fill, sw = 1.3, gg = g) => {
      if (fill) fills.push(rect(gg, X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s, { fill }));
      const r = rect(gg, X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s, { stroke: col, sw: sw * lw });
      lines.push(r); return r;
    };
    const PL = (arr, a = {}, gg = g) => { const e = S('polyline', { points: arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' '), fill: 'none', stroke: a.stroke || col, 'stroke-width': (a.sw || 1.4) * lw, 'stroke-dasharray': a.dash, 'stroke-linejoin': 'round' }, gg); if (!a.nodraw) lines.push(e); return e; };
    fills.push(rect(g, X(-140), Y(0), 920 * s, 22, { fill: ground }));
    PL([[-140, 0], [780, 0]], { sw: 2.4 });
    const wallPts = [[600, -30], [760, -30], [760, 1010], [680, 1010], [668, 990], [652, 1030], [640, 1010], [600, 1010]];
    fills.push(S('polygon', { points: wallPts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), fill: wallH }, g));
    PL([[600, 1010], [600, -30]], { sw: 1.6 }); PL([[760, 1010], [760, -30]], { sw: 1.6 });
    PL([[592, 1010], [640, 1010], [652, 1030], [668, 990], [680, 1010], [770, 1010]], { sw: 1.2 });
    R(-20, 870, 72, 900, cut); R(488, 870, 600, 900, cut);
    lines.push(path(g, `M${X(56)},${Y(902)} L${X(86)},${Y(902)} L${X(94)},${Y(718)} Q${X(96)},${Y(698)} ${X(116)},${Y(698)} L${X(264)},${Y(698)} M${X(296)},${Y(698)} L${X(444)},${Y(698)} Q${X(464)},${Y(698)} ${X(466)},${Y(718)} L${X(474)},${Y(902)} L${X(504)},${Y(902)}`, { stroke: col, sw: 3.2 * lw }));
    R(254, 690, 306, 700, col, 1);
    PL([[266, 690], [266, 572]]); PL([[294, 690], [294, 572]]);
    // évacuation (fixe) jusqu'au mur
    PL([[352, 522], [600, 522]], { sw: 1.6 }); PL([[352, 488], [600, 488]], { sw: 1.6 });
    PL([[600, 522], [700, 522]], { sw: 1, dash: '7 5', stroke: o.grey || GREY }); PL([[600, 488], [700, 488]], { sw: 1, dash: '7 5', stroke: o.grey || GREY });
    R(597, 480, 611, 530, col, 1);
    const axes = [PL([[280, 730], [280, 372]], { sw: 0.9, dash: AXIS, stroke: o.grey || GREY, nodraw: true }), PL([[296, 505], [720, 505]], { sw: 0.9, dash: AXIS, stroke: o.grey || GREY, nodraw: true })];
    R(0, 100, 19, 858, cut); R(0, 100, 588, 118, cut); R(46, 0, 64, 100, cut);
    // le siphon (déposable) : écrou haut, bouteille, culot, sortie, écrou et joint de sortie
    const siphonPart = (gg, c, cutF, tint) => {
      const ls = [], fs = [];
      const RR = (x0, y0, x1, y1, fill, sw = 1.3) => { if (fill) fs.push(rect(gg, X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s, { fill })); const r = rect(gg, X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s, { stroke: c, sw: sw * lw }); ls.push(r); };
      if (tint) fs.push(S('path', { d: `M${X(248)},${Y(548)} L${X(248)},${Y(430)} Q${X(248)},${Y(418)} ${X(260)},${Y(418)} L${X(300)},${Y(418)} Q${X(312)},${Y(418)} ${X(312)},${Y(430)} L${X(312)},${Y(548)} Z`, fill: tint }, gg));
      RR(254, 548, 306, 572, cutF);
      ls.push(path(gg, `M${X(248)},${Y(548)} L${X(248)},${Y(430)} Q${X(248)},${Y(418)} ${X(260)},${Y(418)} L${X(300)},${Y(418)} Q${X(312)},${Y(418)} ${X(312)},${Y(430)} L${X(312)},${Y(488)} M${X(312)},${Y(522)} L${X(312)},${Y(548)}`, { stroke: c, sw: 1.6 * lw }));
      RR(240, 392, 320, 420, cutF);
      ls.push(path(gg, `M${X(312)},${Y(522)} L${X(340)},${Y(522)} M${X(312)},${Y(488)} L${X(340)},${Y(488)}`, { stroke: c, sw: 1.4 * lw }));
      RR(318, 478, 346, 532, cutF);
      const joint = S('polygon', { points: `${X(336)},${Y(520)} ${X(345)},${Y(522)} ${X(345)},${Y(488)} ${X(336)},${Y(490)}`, fill: c }, gg);
      return { ls, fs, joint };
    };
    const sg = S('g', {}, g);
    const sp = siphonPart(sg, col, cut, null);
    lines.push(...sp.ls); fills.push(...sp.fs);
    return { g, X, Y, lines, fills, axes, siphonG: sg, joint: sp.joint, siphonPart, cut };
  }

  // ---------------------------------------------------------------- 04 — la méthode : cinq planches côte à côte
  let strip = null, zoomG = null, zoomClip = null;
  const phaseHead = (pg, i, title, sub, t0) => {
    const ph = L.ph;
    const eb = S('g', {}, pg);
    rect(eb, ph.eyebrow[0], ph.eyebrow[1] - 12, 12, 12, { fill: BLUE });
    const et = mono(eb, ph.eyebrow[0] + 24, ph.eyebrow[1] - 1, '', { size: V ? 21 : 17, fill: INK, ls: 2.6 });
    typeOn(et, `PHASE 0${i + 1} / 05`, t0 + 0.05, 0.3, { cursor: false });
    const [tx, tyy, ts, tmw] = ph.title;
    const tt = rise(pg, tx, tyy, title, { size: ts, maxW: tmw });
    riseIn(tt, t0 + 0.12, { stagger: 0.024 });
    const [sx, sy, ss, smw, slh] = ph.sub;
    const words = sub.split('|');
    words.forEach((w, k) => { const e = T(pg, sx, sy + k * slh, w, { ff: SANS, w: 500, size: ss, maxW: smw, fill: INK }); fadeIn(e, t0 + 0.4 + k * 0.1, 0.35); gsap.set(e, { opacity: 0 }); });
  };
  function buildMethod() {
    const zc = uid('zc');
    const cp = S('clipPath', { id: zc }, defs);
    zoomClip = circle(cp, 0, 0, 1, { fill: '#fff' });
    const clipG = S('g', { 'clip-path': `url(#${zc})` }, scenes);
    zoomG = S('g', {}, clipG);
    strip = S('g', {}, zoomG);
    const pgs = [];
    for (let i = 0; i < 5; i++) {
      const pg = S('g', { transform: `translate(${i * W} 0)` }, strip);
      rect(pg, 0, 0, W, H, { fill: PAPER });
      pgs.push(pg);
    }
    planSignaler(pgs[0], C.st[0]);
    planComprendre(pgs[1], C.st[1]);
    planPreparer(pgs[2], C.st[2]);
    planIntervenir(pgs[3], C.st[3]);
    planRendre(pgs[4], C.st[4]);
    // plongée depuis le plan de situation : le cercle s'ouvre, la planche grandit
    const [lx, ly] = mapPoint(LOG.x, LOG.y);
    const zs = { r: 84, s: 0.09 };
    gsap.set(clipG, { opacity: 0 });
    tl.set(clipG, { opacity: 1 }, C.zoomIn0);
    tl.fromTo(zs, { r: 84, s: 0.09 }, { r: Math.hypot(W, H), s: 1, duration: C.zoomIn1 - C.zoomIn0, ease: 'power3.in' }, C.zoomIn0);
    proc.push(() => {
      zoomClip.setAttribute('cx', lx); zoomClip.setAttribute('cy', ly); zoomClip.setAttribute('r', zs.r.toFixed(1));
      const tx = lerp(lx, W / 2, eio(clamp((zs.s - 0.09) / 0.91))), ty = lerp(ly, H / 2, eio(clamp((zs.s - 0.09) / 0.91)));
      zoomG.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${zs.s.toFixed(4)}) translate(${-W / 2} ${-H / 2})`);
    });
    // travellings d'une phase à l'autre
    gsap.set(strip, { x: 0 });
    C.pans.forEach((t, i) => tl.fromTo(strip, { x: -i * W }, { x: -(i + 1) * W, duration: C.panDur, ease: 'power3.inOut' }, t - C.panDur / 2));
  }

  // --- 01 · Signaler : la fiche de signalement
  function sketchPhoto(g, x, y, w, h, kind) {
    // photo = cadre + croquis au trait (vue d'ensemble ou détail sous l'évier)
    const cid = uid('ph');
    const cp = S('clipPath', { id: cid }, defs);
    rect(cp, x, y, w, h, { fill: '#fff' });
    const frame = rect(g, x, y, w, h, { fill: '#fff', stroke: INK, sw: 1.4 });
    const inner = S('g', { 'clip-path': `url(#${cid})` }, g);
    let sec;
    if (kind === 'ensemble') sec = section(inner, x + w * 0.14, y + h * 0.96, w / 860, { lw: 0.7 });
    else sec = section(inner, x + w * 0.5 - 332 * (w / 260), y + h * 0.5 + 470 * (w / 260), w / 260, { lw: 0.85 });
    const drops = [];
    const S2 = kind === 'ensemble' ? w / 860 : w / 260;
    for (const [dx, dy] of [[341, 464], [337, 418]]) drops.push(S('path', { d: dropD(sec.X(dx), sec.Y(dy), kind === 'ensemble' ? 0.9 : 1.6), fill: ORANGE }, inner));
    return { frame, lines: sec.lines, fills: sec.fills, drops };
  }
  function planSignaler(pg, t0) {
    phaseHead(pg, 0, 'Signaler', V ? 'Le locataire décrit la panne,|photos à l’appui.' : 'Le locataire décrit la panne,|photos à l’appui.', t0);
    const F = V ? { x: 90, y: 470, w: 900, h: 800 } : { x: 780, y: 118, w: 800, h: 640 };
    const g = S('g', {}, pg);
    const fr = rect(g, F.x, F.y, F.w, F.h, { fill: '#fff', stroke: INK, sw: 1.8 });
    drawIn(fr, t0 + 0.05, 0.4);
    gsap.set(fr, { attr: { fill: 'rgba(255,255,255,0)' } });
    tl.to(fr, { attr: { fill: 'rgba(255,255,255,1)' }, duration: 0.3 }, t0 + 0.2);
    const hdr = T(g, F.x + 32, F.y + 58, 'FICHE DE SIGNALEMENT', { ff: COND, w: 700, size: 38, ls: 1 });
    fadeIn(hdr, t0 + 0.25, 0.25);
    const rc = mono(g, F.x + F.w - 32, F.y + 56, '', { size: 14, anchor: 'end', fill: GREY });
    typeOn(rc, 'REÇUE MARDI · 08:15', t0 + 0.3, 0.3, { cursor: false });
    const hl = line(g, F.x + 32, F.y + 80, F.x + F.w - 32, F.y + 80, { sw: 1.6 });
    drawIn(hl, t0 + 0.25, 0.3);
    const fields = [['LOGEMENT', 'Appt 3B · 3e étage'], ['SIGNALÉ PAR', 'Locataire'], ['OBJET', 'Fuite sous l’évier']];
    const fy = F.y + 124, frow = V ? 50 : 44;
    fields.forEach(([k, v], i) => {
      mono(g, F.x + 32, fy + i * frow, k, { size: V ? 14 : 13, fill: GREY });
      const e = T(g, F.x + (V ? 250 : 220), fy + i * frow + 1, '', { ff: SANS, w: 600, size: V ? 28 : 24 });
      typeOn(e, v, t0 + 0.4 + i * 0.13, 0.25, { cursor: false });
      const ln = line(g, F.x + 32, fy + i * frow + 14, F.x + F.w - 32, fy + i * frow + 14, { sw: 0.8, op: 0.3 });
      fadeIn(ln, t0 + 0.35 + i * 0.13, 0.2);
    });
    // deux photos
    const py = fy + 3 * frow + 10, pw = (F.w - 64 - 24) / 2, phh = V ? 250 : 230;
    const ph1 = sketchPhoto(g, F.x + 32, py, pw, phh, 'ensemble');
    const ph2 = sketchPhoto(g, F.x + 32 + pw + 24, py, pw, phh, 'detail');
    for (const [k, ph] of [[0, ph1], [1, ph2]]) {
      pop(ph.frame, t0 + 0.7 + k * 0.15, { from: 0.9, dur: 0.25, ease: 'power3.out' });
      drawIn(ph.lines, t0 + 0.75 + k * 0.15, 0.4, { stagger: 0.006 });
      fadeIn(ph.fills, t0 + 0.95 + k * 0.15, 0.3);
      fadeIn(ph.drops, t0 + 1.05 + k * 0.15, 0.2);
      mono(g, F.x + 32 + k * (pw + 24), py + phh + 24, k ? 'PHOTO 2 · SOUS L’ÉVIER' : 'PHOTO 1 · VUE D’ENSEMBLE', { size: 12.5 });
    }
    // message du locataire
    const my = py + phh + 64;
    mono(g, F.x + 32, my, 'MESSAGE', { size: V ? 14 : 13 });
    const msg = T(g, F.x + 32, my + (V ? 50 : 44), '', { ff: SANS, w: 500, size: V ? 32 : 28 });
    typeOn(msg, '« Ça goutte sous l’évier depuis ce matin. »', t0 + 1.1, 0.5);
    // note et tampon
    const nx = V ? 92 : 112, ny = V ? 1368 : 470;
    const n1 = mono(pg, nx, ny, '', { size: V ? 17 : 15, fill: GREY, ls: 0.8 });
    typeOn(n1, 'NOTA — Le gestionnaire peut aussi signaler.', t0 + 0.6, 0.45, { cursor: false });
    const st = S('g', { transform: `translate(${F.x + F.w - 150} ${F.y + F.h - 70})` }, g);
    rect(st, -92, -34, 184, 68, { stroke: BLUE, sw: 3.2, rx: 6 });
    rect(st, -84, -26, 168, 52, { stroke: BLUE, sw: 1, rx: 4 });
    T(st, 0, 12, 'REÇU', { ff: COND, w: 800, size: 38, anchor: 'middle', fill: BLUE, ls: 4 });
    stampIn(st, t0 + 1.75, -8);
  }

  // --- 02 · Comprendre : coupe, nuage de révision, détail A, fiche de diagnostic
  function planComprendre(pg, t0) {
    phaseHead(pg, 1, 'Comprendre', 'Un diagnostic avant de se déplacer.', t0);
    const s = V ? 0.62 : 0.72, ox = V ? 132 : 872, oy = V ? 1170 : 872;
    const sec = section(pg, ox, oy, s);
    drawIn(sec.lines, t0 + 0.08, 0.35, { stagger: 0.016 });
    fadeIn(sec.fills, t0 + 0.4, 0.3);
    fadeIn(sec.axes, t0 + 0.45, 0.3);
    const X = sec.X, Y = sec.Y;
    // cotes
    const dim = S('g', {}, pg);
    const dh = (x1, x2, y, lab) => { line(dim, x1 - 14, y, x2 + 14, y); for (const x of [x1, x2]) { line(dim, x - 6, y + 6, x + 6, y - 6, { sw: 2 }); line(dim, x, y + 16, x, y - 8, { sw: 0.8 }); } mono(dim, (x1 + x2) / 2, y - 9, lab, { anchor: 'middle', size: 16, fill: INK, ls: 1 }); };
    dh(X(0), X(600), Y(900) - 42, '600');
    const vx = X(-20) - 52;
    line(dim, vx, Y(0) - 14, vx, Y(900) + 14); for (const y of [Y(0), Y(900)]) { line(dim, vx - 6, y + 6, vx + 6, y - 6, { sw: 2 }); line(dim, vx - 8, y, X(-20) - 6, y, { sw: 0.8 }); }
    const vt = mono(dim, vx - 10, (Y(0) + Y(900)) / 2, '900', { anchor: 'middle', size: 16, fill: INK, ls: 1 });
    vt.setAttribute('transform', `rotate(-90 ${vx - 10} ${(Y(0) + Y(900)) / 2})`);
    fadeIn(dim, t0 + 0.5, 0.3);
    // gouttes (tombent en boucle jusqu'au diagnostic)
    const drops = S('g', {}, pg);
    const dd = [0, 1, 2].map(() => S('path', { d: dropD(0, 0, 1.3), fill: ORANGE }, drops));
    const jx = X(338), jy = Y(478);
    proc.push((t) => {
      const on = t > t0 + 0.6 && t < C.st[4] + 1;
      dd.forEach((d, i) => {
        if (!on) { d.style.opacity = 0; return; }
        const u = ((t - t0 - 0.6) / 0.55 + i / 3) % 1;
        const y = jy + u * u * (Y(118) - jy - 6);
        d.setAttribute('transform', `translate(${jx.toFixed(1)} ${y.toFixed(1)})`);
        d.style.opacity = u < 0.92 ? 1 : 0;
      });
    });
    const pud = S('path', { d: `M${X(240)},${Y(118)} C${X(262)},${Y(126)} ${X(300)},${Y(127)} ${X(335)},${Y(126)} C${X(375)},${Y(127)} ${X(415)},${Y(125)} ${X(438)},${Y(118)} Z`, fill: 'rgba(240,100,30,.22)', stroke: ORANGE, 'stroke-width': 1.4 }, pg);
    fadeIn(pud, t0 + 0.8, 0.4);
    // nuage de révision sur le joint + repère A
    const jX = X(332), jY = Y(505);
    const cl = path(pg, cloudPath(jX, jY, 62 * s / 0.72, 52 * s / 0.72, 13), { stroke: ORANGE, sw: 2.2 });
    drawIn(cl, t0 + 0.6, 0.4);
    const ab = S('g', {}, pg);
    circle(ab, jX + 4, jY - 70 * s / 0.72, 17, { fill: PAPER, stroke: INK, sw: 1.5 });
    T(ab, jX + 4, jY - 70 * s / 0.72 + 7, 'A', { ff: COND, w: 700, size: 22, anchor: 'middle', fill: INK });
    pop(ab, t0 + 0.95, { from: 0.3 });
    // détail A (échelle 1:2) qui sort du joint
    const D = V ? { cx: 812, cy: 690, r: 170 } : { cx: 1648, cy: 372, r: 168 };
    const sd = V ? 4.1 : 4.1;
    const dx = (m) => D.cx + (m - 332) * sd, dy = (m) => D.cy - (m - 505) * sd;
    const ldr = line(pg, jX + 16, jY - 70 * s / 0.72 - 12, D.cx - D.r * 0.84, D.cy - D.r * 0.54, { sw: 1 });
    drawIn(ldr, t0 + 1.0, 0.25);
    const cid = uid('dA');
    const cpp = S('clipPath', { id: cid }, defs);
    circle(cpp, D.cx, D.cy, D.r, { fill: '#fff' });
    const dg = S('g', {}, pg);
    circle(dg, D.cx, D.cy, D.r, { fill: PAPER });
    const inner = S('g', { 'clip-path': `url(#${cid})` }, dg);
    const cutD = hatch(defs, { gap: 7, color: INK, width: 1 });
    const RD = (x0, y0, x1, y1, sw = 1.6) => rect(inner, dx(x0), dy(y1), (x1 - x0) * sd, (y1 - y0) * sd, { fill: cutD, stroke: INK, sw });
    RD(300, 430, 312, 580); RD(312, 519, 338, 523, 1.2); RD(312, 487, 338, 491, 1.2); RD(318, 523, 348, 534); RD(318, 476, 348, 487); RD(348, 519, 420, 523, 1.2); RD(348, 487, 420, 491, 1.2);
    S('polygon', { points: `${dx(338)},${dy(523)} ${dx(348)},${dy(523)} ${dx(348)},${dy(519)} ${dx(341)},${dy(518)}`, fill: INK }, inner);
    S('polygon', { points: `${dx(338)},${dy(487)} ${dx(348)},${dy(487)} ${dx(348)},${dy(491)} ${dx(343)},${dy(492)} ${dx(341)},${dy(489)}`, fill: INK }, inner);
    line(inner, dx(290), dy(505), dx(430), dy(505), { stroke: GREY, sw: 0.9, dash: AXIS });
    S('polyline', { points: [[312, 484], [316, 481], [314, 477], [319, 472], [317, 466]].map(([x, y]) => `${dx(x)},${dy(y)}`).join(' '), fill: 'none', stroke: ORANGE, 'stroke-width': 2.6 }, inner);
    S('polyline', { points: [[341, 489], [344, 485], [343, 481]].map(([x, y]) => `${dx(x)},${dy(y)}`).join(' '), fill: 'none', stroke: ORANGE, 'stroke-width': 2.6 }, inner);
    S('path', { d: dropD(dx(343), dy(468), 1.5), fill: ORANGE }, inner);
    circle(dg, D.cx, D.cy, D.r, { stroke: INK, sw: 2 });
    gsap.set(dg, { opacity: 0, scale: 0.12, x: jX - D.cx, y: jY - D.cy, transformOrigin: '50% 50%' });
    tl.fromTo(dg, { opacity: 0, scale: 0.12, x: jX - D.cx, y: jY - D.cy }, { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.5, ease: 'power3.out' }, t0 + 1.05);
    const dl = S('g', {}, pg);
    T(dl, D.cx, D.cy + D.r + 40, 'DÉTAIL A', { ff: COND, w: 700, size: 24, ls: 1.5, anchor: 'middle', fill: INK });
    mono(dl, D.cx, D.cy + D.r + 64, 'ÉCH. 1:2', { size: 14, anchor: 'middle' });
    fadeIn(dl, t0 + 1.4, 0.3);
    // fiche de diagnostic
    const fx = V ? 92 : 112, fyy = V ? 1250 : 470, fw = V ? 896 : 578;
    const fg = S('g', {}, pg);
    mono(fg, fx, fyy - 18, 'FICHE DE DIAGNOSTIC · DOSSIER APPT 3B', { size: 13 });
    const rows = [['SIGNALEMENT', '2 photos · 1 message du locataire', INK, 0.2], ['HYPOTHÈSE', 'Joint du siphon ?', INK, 0.62], ['PRÉCISION', 'Une photo du joint, de plus près', INK, 1.0], ['DIAGNOSTIC', 'Joint usé, siphon fissuré', BLUE, 1.45]];
    rows.forEach(([k, v, col, dt], i) => {
      const y = fyy + i * 62;
      const ln = line(fg, fx, y, fx + fw, y, { sw: i ? 0.8 : 1.6, op: i ? 0.35 : 1 });
      mono(fg, fx, y + 38, k, { size: 13, fill: GREY });
      const e = T(fg, fx + (V ? 240 : 178), y + 40, '', { ff: SANS, w: i === 3 ? 700 : 500, size: V ? 27 : 25, fill: col });
      typeOn(e, v.replace(' ?', ' ?'), t0 + dt, 0.35, { cursor: false });
      fadeIn(ln, t0 + dt - 0.05, 0.2);
    });
    const lnb = line(fg, fx, fyy + 248, fx + fw, fyy + 248, { sw: 1.6 });
    fadeIn(lnb, t0 + 1.5, 0.2);
    fadeIn(fg.firstChild, t0 + 0.15, 0.2);
    const ck = S('g', { transform: `translate(${fx + fw - 26} ${fyy + 3 * 62 + 31})` }, fg);
    circle(ck, 0, 0, 15, { fill: BLUE });
    path(ck, 'M-7,0 L-2,5 L7,-5', { stroke: '#fff', sw: 3 });
    pop(ck, t0 + 1.75, { from: 0.2 });
  }

  // --- 03 · Préparer : vue éclatée, nomenclature, prix
  function planPreparer(pg, t0) {
    phaseHead(pg, 2, 'Préparer', 'Les bonnes pièces.|Le prix annoncé.', t0);
    const ax = V ? 330 : 1094, top = V ? 540 : 150;
    const k = V ? 1 : 0.92;
    const g = S('g', {}, pg);
    const axis = line(g, ax, top - 20, ax, top + 640 * k, { stroke: GREY, sw: 1.1, dash: AXIS });
    fadeIn(axis, t0 + 0.2, 0.3);
    const part = (dy) => S('g', {}, g);
    const parts = [];
    // écrou
    const p1 = part(); rect(p1, ax - 52 * k, top, 104 * k, 46 * k, { fill: TINT, stroke: BLUE, sw: 2.2, rx: 3 }); line(p1, ax - 17 * k, top, ax - 17 * k, top + 46 * k, { stroke: BLUE, sw: 1.3 }); line(p1, ax + 17 * k, top, ax + 17 * k, top + 46 * k, { stroke: BLUE, sw: 1.3 });
    parts.push([p1, top + 23 * k, 1, 'Écrou de raccord', 'Ø40', ax + 52 * k, 150 * k]);
    const y2 = top + 76 * k;
    const p2 = part(); S('polygon', { points: `${ax - 40 * k},${y2} ${ax + 40 * k},${y2} ${ax + 28 * k},${y2 + 24 * k} ${ax - 28 * k},${y2 + 24 * k}`, fill: BLUE }, p2);
    parts.push([p2, y2 + 12 * k, 2, 'Joint conique', 'NEUF', ax + 40 * k, 105 * k]);
    const y3 = top + 150 * k;
    const p3 = part();
    S('path', { d: `M${ax - 30 * k},${y3} L${ax + 30 * k},${y3} L${ax + 30 * k},${y3 + 40 * k} L${ax + 62 * k},${y3 + 40 * k} Q${ax + 70 * k},${y3 + 40 * k} ${ax + 70 * k},${y3 + 50 * k} L${ax + 70 * k},${y3 + 216 * k} Q${ax + 70 * k},${y3 + 240 * k} ${ax + 46 * k},${y3 + 240 * k} L${ax - 46 * k},${y3 + 240 * k} Q${ax - 70 * k},${y3 + 240 * k} ${ax - 70 * k},${y3 + 216 * k} L${ax - 70 * k},${y3 + 50 * k} Q${ax - 70 * k},${y3 + 40 * k} ${ax - 62 * k},${y3 + 40 * k} L${ax - 30 * k},${y3 + 40 * k} Z`, fill: TINT, stroke: BLUE, 'stroke-width': 2.2 }, p3);
    rect(p3, ax + 70 * k, y3 + 86 * k, 92 * k, 50 * k, { fill: TINT, stroke: BLUE, sw: 2.2 });
    for (const xx of [118, 128, 138, 148]) line(p3, ax + xx * k, y3 + 86 * k, ax + (xx - 6) * k, y3 + 136 * k, { stroke: BLUE, sw: 1 });
    line(p3, ax - 40 * k, y3 + 55 * k, ax - 40 * k, y3 + 225 * k, { stroke: BLUE, sw: 1, op: 0.45 }); line(p3, ax + 40 * k, y3 + 55 * k, ax + 40 * k, y3 + 225 * k, { stroke: BLUE, sw: 1, op: 0.45 });
    parts.push([p3, y3 + 170 * k, 3, 'Corps de siphon', 'PVC · SORTIE Ø40', ax + 70 * k, 0]);
    const y4 = top + 450 * k;
    const p4 = part(); rect(p4, ax - 62 * k, y4, 124 * k, 12 * k, { fill: BLUE });
    parts.push([p4, y4 + 6 * k, 4, 'Joint plat', 'NEUF', ax + 62 * k, -120 * k]);
    const y5 = top + 510 * k;
    const p5 = part(); rect(p5, ax - 74 * k, y5, 148 * k, 70 * k, { fill: TINT, stroke: BLUE, sw: 2.2, rx: 6 });
    for (let i = 0; i < 9; i++) line(p5, ax + (-60 + i * 15) * k, y5 + 12 * k, ax + (-60 + i * 15) * k, y5 + 58 * k, { stroke: BLUE, sw: 1.1, op: 0.6 });
    parts.push([p5, y5 + 35 * k, 5, 'Culot démontable', 'NETTOYAGE', ax + 74 * k, -190 * k]);
    // les pièces arrivent assemblées puis s'écartent le long de l'axe
    parts.forEach(([pe, , , , , , gap], i) => {
      gsap.set(pe, { opacity: 0, y: gap });
      tl.fromTo(pe, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t0 + 0.08 + i * 0.03);
      tl.fromTo(pe, { y: gap }, { y: 0, duration: 0.5, ease: 'power3.inOut' }, t0 + 0.3);
    });
    // repères et désignations
    const bx = V ? 610 : 1334;
    parts.forEach(([, y, n, name, sub, ex], i) => {
      const lg = S('g', {}, g);
      const ld = line(lg, ex, y, bx - 20, y, { sw: 1.1 });
      circle(lg, ex, y, 3, { fill: INK });
      const bb = S('g', {}, lg);
      circle(bb, bx, y, 19, { fill: PAPER, stroke: INK, sw: 1.5 });
      T(bb, bx, y + 6, String(n), { ff: MONO, w: 600, size: 17, anchor: 'middle', fill: INK });
      const nm = T(lg, bx + 36, y + 9, name, { ff: SANS, w: 600, size: V ? 29 : 28 });
      const sb = mono(lg, bx + 36, y + 36, sub, { size: 13 });
      drawIn(ld, t0 + 0.75 + i * 0.08, 0.22);
      pop(bb, t0 + 0.85 + i * 0.08, { from: 0.3, dur: 0.35 });
      fadeIn([nm, sb], t0 + 0.9 + i * 0.08, 0.25);
    });
    // nomenclature
    const N = V ? { x: 110, y: 1200, w: 860, cols: [0, 76, 470, 560], rh: 58 } : { x: 112, y: 468, w: 578, cols: [0, 64, 330, 392], rh: 50 };
    const ng = S('g', {}, pg);
    T(ng, N.x, N.y, 'NOMENCLATURE', { ff: COND, w: 700, size: V ? 30 : 26, ls: 1.5, fill: INK });
    line(ng, N.x, N.y + 18, N.x + N.w, N.y + 18, { sw: 2 });
    ['REP.', 'DÉSIGNATION', 'QTÉ', 'ORIGINE'].forEach((k2, i) => mono(ng, N.x + N.cols[i], N.y + 44, k2, { size: 12 }));
    line(ng, N.x, N.y + 58, N.x + N.w, N.y + 58, { sw: 1 });
    fadeIn(ng, t0 + 0.45, 0.3);
    [['1–5', 'Siphon PVC Ø40, complet', '1', 'Identifié au dossier'], ['2, 4', 'Joints conique et plat', '2', 'Identifiés au dossier'], ['—', 'Pièces courantes', '—', 'Stock du véhicule']].forEach((r, i) => {
      const y = N.y + 58 + (i + 1) * N.rh;
      const rg = S('g', {}, pg);
      mono(rg, N.x + N.cols[0], y - 18, r[0], { size: 14, fill: INK, w: 600 });
      const d = T(rg, N.x + N.cols[1], y - 17, '', { ff: SANS, w: 500, size: V ? 25 : 22 });
      T(rg, N.x + N.cols[2], y - 17, r[2], { ff: SANS, w: 600, size: V ? 25 : 22 });
      T(rg, N.x + N.cols[3], y - 17, r[3], { ff: SANS, w: 500, size: V ? 23 : 20, fill: i < 2 ? BLUE : INK, maxW: N.w - N.cols[3] });
      line(rg, N.x, y, N.x + N.w, y, { sw: i === 2 ? 2 : 0.8, op: i === 2 ? 1 : 0.35 });
      fadeIn(rg, t0 + 0.6 + i * 0.18, 0.2);
      typeOn(d, r[1], t0 + 0.6 + i * 0.18, 0.28, { cursor: false });
    });
    // prix, tamponné « bordereau »
    const Pp = V ? { x: 110, y: 1512, w: 860, h: 150 } : { x: 112, y: 730, w: 578, h: 124 };
    const pgp = S('g', {}, pg);
    rect(pgp, Pp.x, Pp.y, Pp.w, Pp.h, { fill: PAPER, stroke: INK, sw: 1.6 });
    mono(pgp, Pp.x + 22, Pp.y + 32, 'PRIX', { size: 13 });
    T(pgp, Pp.x + 22, Pp.y + (V ? 80 : 70), 'Annoncé au gestionnaire,', { ff: SANS, w: 700, size: V ? 33 : 27 });
    T(pgp, Pp.x + 22, Pp.y + (V ? 120 : 104), 'avant l’intervention.', { ff: SANS, w: 700, size: V ? 33 : 27 });
    fadeIn(pgp, t0 + 1.3, 0.3);
    const st = S('g', { transform: `translate(${Pp.x + Pp.w - (V ? 150 : 118)} ${Pp.y + Pp.h / 2 + 2})` }, pg);
    const sw = V ? 208 : 176;
    rect(st, -sw / 2, -34, sw, 68, { stroke: BLUE, sw: 3, rx: 6 });
    rect(st, -sw / 2 + 8, -26, sw - 16, 52, { stroke: BLUE, sw: 1, rx: 4 });
    T(st, 0, 11, 'BORDEREAU', { ff: COND, w: 800, size: V ? 30 : 26, anchor: 'middle', fill: BLUE, ls: 3 });
    stampIn(st, t0 + 1.75, -8);
  }

  // --- 04 · Intervenir : l'ancien siphon sort, le neuf entre, la fuite s'arrête
  function planIntervenir(pg, t0) {
    phaseHead(pg, 3, 'Intervenir', 'La technologie prépare,|le technicien répare.', t0);
    const s = V ? 0.62 : 0.72, ox = V ? 132 : 900, oy = V ? 1170 : 872;
    const sec = section(pg, ox, oy, s);
    drawIn(sec.lines, t0 + 0.06, 0.28, { stagger: 0.01 });
    fadeIn(sec.fills, t0 + 0.25, 0.25);
    fadeIn(sec.axes, t0 + 0.3, 0.25);
    const X = sec.X, Y = sec.Y;
    // l'ancien siphon, repéré en orange, déposé
    sec.siphonG.style.color = ORANGE;
    tl.to(sec.siphonG.querySelectorAll('rect, path'), { attr: { stroke: ORANGE }, duration: 0.2 }, t0 + 0.35);
    tl.to(sec.joint, { attr: { fill: ORANGE }, duration: 0.2 }, t0 + 0.35);
    const tagOld = S('g', {}, pg);
    const tw = measure('À DÉPOSER', MONO, 600, 13, 1.6) + 24;
    rect(tagOld, X(-10) - tw, Y(470) - 15, tw, 30, { fill: '#fff', stroke: ORANGE, sw: 1.8, rx: 4 });
    mono(tagOld, X(-10) - tw + 12, Y(470) + 5, 'À DÉPOSER', { size: 13, w: 600, fill: ORANGE, ls: 1.6 });
    line(tagOld, X(-10), Y(470), X(240), Y(470), { stroke: ORANGE, sw: 1.1 });
    pop(tagOld, t0 + 0.4, { from: 0.8, dur: 0.3, ease: 'power3.out' });
    tl.to(tagOld, { opacity: 0, duration: 0.2 }, t0 + 0.85);
    tl.to(sec.siphonG, { y: 120, opacity: 0, duration: 0.4, ease: 'power2.in' }, t0 + 0.7);
    // le neuf descend et se verrouille
    const ng = S('g', {}, pg);
    const np = sec.siphonPart(ng, BLUE, hatch(defs, { gap: 6, color: BLUE, width: 0.9 }), TINT);
    gsap.set(ng, { y: -160, opacity: 0 });
    tl.fromTo(ng, { y: -160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, t0 + 0.95);
    // serrage de l'écrou de sortie : flèche de couple au trait
    const tq = S('g', { style: `color:${BLUE}` }, pg);
    const R0 = 46 * s / 0.72, cxq = X(332), cyq = Y(505);
    const arcD = `M${cxq + R0 * Math.cos(-2.4)},${cyq + R0 * Math.sin(-2.4)} A${R0},${R0} 0 1 1 ${cxq + R0 * Math.cos(1.9)},${cyq + R0 * Math.sin(1.9)}`;
    const arc = path(tq, arcD, { stroke: BLUE, sw: 2.6 });
    const ah = S('path', { d: `M0,-8 L12,0 L0,8 Z`, fill: BLUE, transform: `translate(${cxq + R0 * Math.cos(1.9)} ${cyq + R0 * Math.sin(1.9)}) rotate(${(1.9 * 180) / Math.PI + 90})` }, tq);
    drawIn(arc, t0 + 1.3, 0.3);
    pop(ah, t0 + 1.55, { from: 0.2, dur: 0.2 });
    const tqL = mono(tq, cxq + R0 + 14, cyq - R0 - 6, 'SERRAGE', { size: 13, w: 600, fill: BLUE, ls: 1.6 });
    fadeIn(tqL, t0 + 1.4, 0.2);
    // gouttes : jusqu'au serrage
    const drops = S('g', {}, pg);
    const dd = [0, 1].map(() => S('path', { d: dropD(0, 0, 1.3), fill: ORANGE }, drops));
    const jx = X(338), jy = Y(478);
    proc.push((t) => {
      const on = t > t0 && t < t0 + 1.3;
      dd.forEach((d, i) => {
        if (!on) { d.style.opacity = 0; return; }
        const u = ((t - t0) / 0.55 + i / 2) % 1;
        d.setAttribute('transform', `translate(${jx.toFixed(1)} ${(jy + u * u * (Y(118) - jy - 6)).toFixed(1)})`);
        d.style.opacity = u < 0.92 ? 1 : 0;
      });
    });
    const pud = S('path', { d: `M${X(240)},${Y(118)} C${X(262)},${Y(126)} ${X(300)},${Y(127)} ${X(335)},${Y(126)} C${X(375)},${Y(127)} ${X(415)},${Y(125)} ${X(438)},${Y(118)} Z`, fill: 'rgba(240,100,30,.22)', stroke: ORANGE, 'stroke-width': 1.4 }, pg);
    fadeIn(pud, t0 + 0.3, 0.2);
    tl.to(pud, { opacity: 0, duration: 0.35 }, t0 + 1.4);
    // tampon « fuite réparée »
    const stx = V ? 700 : 1560, sty = V ? 560 : 300;
    const st = S('g', { transform: `translate(${stx} ${sty})` }, pg);
    rect(st, -150, -40, 300, 80, { stroke: BLUE, sw: 3.2, rx: 6 });
    rect(st, -142, -32, 284, 64, { stroke: BLUE, sw: 1, rx: 4 });
    T(st, 0, 13, 'FUITE RÉPARÉE', { ff: COND, w: 800, size: 36, anchor: 'middle', fill: BLUE, ls: 3 });
    stampIn(st, t0 + 1.8, -7);
    // sinon…
    const nx = V ? 92 : 112, ny = V ? 1300 : 468;
    const nb = S('g', {}, pg);
    rect(nb, nx, ny, V ? 896 : 578, V ? 132 : 118, { fill: PAPER, stroke: INK, sw: 1.4 });
    mono(nb, nx + 20, ny + 32, 'NOTA · SI LA CAUSE DÉPASSE LE LOGEMENT', { size: V ? 14 : 12.5 });
    const n2 = T(nb, nx + 20, ny + (V ? 86 : 78), '', { ff: SANS, w: 600, size: V ? 30 : 25 });
    typeOn(n2, 'Sécuriser, documenter, indiquer la suite.', t0 + 0.55, 0.5, { cursor: false });
    fadeIn(nb, t0 + 0.4, 0.25);
  }

  // --- 05 · Rendre compte : le rapport, transmis au gestionnaire
  function planRendre(pg, t0) {
    phaseHead(pg, 4, 'Rendre compte', 'Ce qui a été fait,|et ce qui reste à prévoir.', t0);
    const F = V ? { x: 90, y: 470, w: 900, h: 860 } : { x: 780, y: 118, w: 800, h: 700 };
    const g = S('g', {}, pg);
    const fr = rect(g, F.x, F.y, F.w, F.h, { fill: '#fff', stroke: INK, sw: 1.8 });
    drawIn(fr, t0 + 0.05, 0.4);
    gsap.set(fr, { attr: { fill: 'rgba(255,255,255,0)' } });
    tl.to(fr, { attr: { fill: 'rgba(255,255,255,1)' }, duration: 0.3 }, t0 + 0.2);
    const hdr = T(g, F.x + 32, F.y + 58, 'RAPPORT D’INTERVENTION', { ff: COND, w: 700, size: 38, ls: 1 });
    fadeIn(hdr, t0 + 0.25, 0.25);
    const sub = mono(g, F.x + F.w - 32, F.y + 56, 'APPT 3B · FUITE SOUS ÉVIER', { size: 13, anchor: 'end' });
    fadeIn(sub, t0 + 0.3, 0.25);
    const hl = line(g, F.x + 32, F.y + 80, F.x + F.w - 32, F.y + 80, { sw: 1.6 });
    drawIn(hl, t0 + 0.25, 0.3);
    const rows = [['CAUSE', 'Joint usé, siphon fissuré', INK], ['TRAVAUX', 'Siphon Ø40 et joints remplacés', INK]];
    const ry = F.y + 126, rr = V ? 56 : 50;
    rows.forEach(([k, v, col], i) => {
      mono(g, F.x + 32, ry + i * rr, k, { size: V ? 14 : 13 });
      const e = T(g, F.x + (V ? 220 : 196), ry + i * rr + 1, '', { ff: SANS, w: 600, size: V ? 29 : 25, fill: col });
      typeOn(e, v, t0 + 0.35 + i * 0.2, 0.3, { cursor: false });
      const ln = line(g, F.x + 32, ry + i * rr + 16, F.x + F.w - 32, ry + i * rr + 16, { sw: 0.8, op: 0.3 });
      fadeIn(ln, t0 + 0.3 + i * 0.2, 0.2);
    });
    // photos avant / après
    const py = ry + 2 * rr + 18, pw = (F.w - 64 - 24) / 2, phh = V ? 250 : 210;
    mono(g, F.x + 32, py - 4, 'PHOTOS', { size: V ? 14 : 13 });
    const before = sketchPhoto(g, F.x + 32, py + 10, pw, phh, 'detail');
    const after = sketchPhoto(g, F.x + 32 + pw + 24, py + 10, pw, phh, 'detail');
    after.drops.forEach((d) => d.remove());
    for (const [k, ph] of [[0, before], [1, after]]) {
      pop(ph.frame, t0 + 0.6 + k * 0.12, { from: 0.9, dur: 0.25, ease: 'power3.out' });
      drawIn(ph.lines, t0 + 0.65 + k * 0.12, 0.3, { stagger: 0.005 });
      fadeIn(ph.fills, t0 + 0.8 + k * 0.12, 0.25);
      fadeIn(ph.drops, t0 + 0.9, 0.2);
      mono(g, F.x + 32 + k * (pw + 24), py + phh + 34, k ? 'APRÈS' : 'AVANT', { size: 12.5, fill: k ? BLUE : ORANGE, w: 600 });
    }
    const okc = S('g', { transform: `translate(${F.x + 32 + pw + 24 + pw - 30} ${py + 40})` }, g);
    circle(okc, 0, 0, 15, { fill: BLUE });
    path(okc, 'M-7,0 L-2,5 L7,-5', { stroke: '#fff', sw: 3 });
    pop(okc, t0 + 1.05, { from: 0.2 });
    // à prévoir : la remise en état, à part
    const ay = py + phh + 92;
    const ag = S('g', {}, g);
    rect(ag, F.x + 32, ay - 34, F.w - 64, V ? 96 : 86, { fill: 'rgba(240,100,30,.07)', stroke: ORANGE, sw: 1.6, rx: 4 });
    mono(ag, F.x + 50, ay - 6, 'À PRÉVOIR', { size: V ? 14 : 13, fill: ORANGE, w: 600 });
    const av = T(ag, F.x + 50, ay + (V ? 38 : 34), '', { ff: SANS, w: 600, size: V ? 29 : 25, fill: INK });
    typeOn(av, 'Remise en état du meuble, sur devis', t0 + 1.05, 0.4, { cursor: false });
    fadeIn(ag, t0 + 1.0, 0.2);
    // tampon « transmis » + gestionnaire
    const stx = F.x + F.w - 210, sty = F.y + F.h - 64;
    const st = S('g', { transform: `translate(${stx} ${sty})` }, g);
    rect(st, -186, -40, 372, 80, { stroke: BLUE, sw: 3.2, rx: 6 });
    rect(st, -178, -32, 356, 64, { stroke: BLUE, sw: 1, rx: 4 });
    T(st, 0, 13, 'TRANSMIS AU GESTIONNAIRE', { ff: COND, w: 800, size: 30, anchor: 'middle', fill: BLUE, ls: 2 });
    stampIn(st, t0 + 1.55, -6);
    blueOrigin = [stx, sty];
    const G = V ? { x: 90, y: 1400, w: 900 } : { x: 1610, y: 380, w: 230 };
    const gg = S('g', {}, pg);
    if (V) {
      rect(gg, G.x, G.y, G.w, 110, { fill: '#fff', stroke: INK, sw: 1.6 });
      mono(gg, G.x + 24, G.y + 38, 'GESTIONNAIRE', { size: 14 });
      T(gg, G.x + 24, G.y + 84, 'Rapport reçu', { ff: SANS, w: 700, size: 34 });
      const c2 = S('g', { transform: `translate(${G.x + G.w - 50} ${G.y + 55})` }, gg); circle(c2, 0, 0, 22, { fill: BLUE }); path(c2, 'M-10,0 L-3,7 L10,-7', { stroke: '#fff', sw: 4 });
    } else {
      rect(gg, G.x, G.y, G.w, 150, { fill: '#fff', stroke: INK, sw: 1.6 });
      mono(gg, G.x + 20, G.y + 36, 'GESTIONNAIRE', { size: 13 });
      T(gg, G.x + 20, G.y + 84, 'Rapport', { ff: SANS, w: 700, size: 30 });
      T(gg, G.x + 20, G.y + 118, 'reçu', { ff: SANS, w: 700, size: 30 });
      const c2 = S('g', { transform: `translate(${G.x + G.w - 40} ${G.y + 100})` }, gg); circle(c2, 0, 0, 20, { fill: BLUE }); path(c2, 'M-9,0 L-3,6 L9,-6', { stroke: '#fff', sw: 3.6 });
      const ar = path(pg, `M${F.x + F.w + 8},${G.y + 75} L${G.x - 12},${G.y + 75}`, { stroke: BLUE, sw: 2.2 });
      drawIn(ar, t0 + 1.7, 0.2);
    }
    pop(gg, t0 + 1.8, { from: 0.85, dur: 0.3, ease: 'power3.out' });
  }
  let blueOrigin = [W / 2, H / 2];

  // ---------------------------------------------------------------- 05 — la promesse, sur tirage bleu
  function buildPromise() {
    const root = S('g', {}, scenes);
    const cid = uid('bl');
    const cp = S('clipPath', { id: cid }, defs);
    const bc = circle(cp, 0, 0, 0, { fill: '#fff' });
    const blue = S('g', { 'clip-path': `url(#${cid})` }, root);
    rect(blue, 0, 0, W, H, { fill: TIRAGE });
    const rg = S('radialGradient', { id: 'vig', cx: '42%', cy: '40%', r: '75%' }, defs);
    S('stop', { offset: 0, 'stop-color': '#1D4786' }, rg); S('stop', { offset: 1, 'stop-color': '#12305E' }, rg);
    rect(blue, 0, 0, W, H, { fill: 'url(#vig)' });
    const br = { r: 0 };
    tl.fromTo(br, { r: 0 }, { r: Math.hypot(W, H) * 1.05, duration: C.blue1 - C.blue0, ease: 'power2.in' }, C.blue0);
    proc.push(() => { bc.setAttribute('cx', blueOrigin[0] + (strip ? 0 : 0)); bc.setAttribute('cy', blueOrigin[1]); bc.setAttribute('r', br.r.toFixed(1)); });
    // le cadre et le quadrillage passent en blanc
    tl.set(hud, { color: LINE }, C.blue1 - 0.02);
    tl.set(gridInk, { opacity: 0 }, C.blue1 - 0.02);
    tl.set(gridLine, { opacity: 1 }, C.blue1 - 0.02);
    tl.set(texture, { opacity: 0.35 }, C.blue1 - 0.02);
    // la coupe en fantôme
    const gh = S('g', { opacity: 0 }, root);
    const gcid = uid('gc');
    const gcp = S('clipPath', { id: gcid }, defs);
    rect(gcp, V ? 56 : 1130, V ? 1150 : 56, V ? W - 112 : W - 1186, V ? 540 : H - 112, { fill: '#fff' });
    const ghc = S('g', { 'clip-path': `url(#${gcid})` }, gh);
    section(ghc, V ? 330 : 1180, V ? 1900 : 930, V ? 0.72 : 0.9, { ink: LINE, grey: LINE, lw: 1.1 });
    tl.to(gh, { opacity: 0.15, duration: 0.6 }, C.sc5 + 0.1);
    // les trois lignes, chacune mesurée par sa cote
    const Pm = L.prom;
    const lines = [['Un passage.', '<tspan fill="#FF8A4C" font-weight="700">OBJECTIF</tspan> · RÉPARER DÈS LA PREMIÈRE VISITE'], ['Un prix.', 'ANNONCÉ AVANT L’INTERVENTION'], ['Un rapport.', 'TRANSMIS AU GESTIONNAIRE']];
    const content = S('g', { style: `color:${LINE}` }, root);
    lines.forEach(([big, lab], i) => {
      const base = Pm.base[i], t0 = C.prom[i];
      const r = rise(content, Pm.x, base, big, { size: Pm.size, fill: LINE });
      riseIn(r, t0, { stagger: 0.028 });
      const w = r.width, yC = base + Pm.labDy;
      const cg = S('g', {}, content);
      const cl = [line(cg, Pm.x - 14, yC, Pm.x + w + 14, yC, { sw: 1 }), line(cg, Pm.x, yC + 16, Pm.x, yC - 8, { sw: 0.9 }), line(cg, Pm.x + w, yC + 16, Pm.x + w, yC - 8, { sw: 0.9 }),
        line(cg, Pm.x - 6, yC + 6, Pm.x + 6, yC - 6, { sw: 2 }), line(cg, Pm.x + w - 6, yC + 6, Pm.x + w + 6, yC - 6, { sw: 2 })];
      drawIn(cl, t0 + 0.2, 0.35, { stagger: 0.03 });
      const lb = mono(content, Pm.x + 4, yC - 12, '', { size: V ? 18 : 17, fill: 'rgba(244,246,250,.85)', ls: 2.2, html: true });
      lb.innerHTML = lab;
      if (V && lb.getComputedTextLength() > W - Pm.x - 80) lb.setAttribute('font-size', (18 * (W - Pm.x - 80) / lb.getComputedTextLength()).toFixed(2));
      fadeIn(lb, t0 + 0.35, 0.3);
      const bb = S('g', {}, content);
      circle(bb, Pm.x - (V ? 50 : 52), base - Pm.size * 0.33, V ? 17 : 19, { fill: '#18407C', stroke: LINE, sw: 1.5 });
      T(bb, Pm.x - (V ? 50 : 52), base - Pm.size * 0.33 + 6, String(i + 1), { ff: MONO, w: 600, size: 16, anchor: 'middle', fill: LINE });
      pop(bb, t0 + 0.05, { from: 0.3 });
    });
    const nt = V ? ['NOTA 1 — « Un passage » est un objectif, mesuré', 'dossier par dossier : certaines pannes demandent', 'une pièce spécifique, un devis ou un second passage.'] : ['NOTA 1 — « Un passage » est un objectif, mesuré dossier par dossier :', 'certaines pannes demandent une pièce spécifique, un devis ou un second passage.'];
    nt.forEach((s, i) => { const e = mono(content, Pm.nota[0], Pm.nota[1 + i], '', { size: V ? 17 : 16, fill: 'rgba(244,246,250,.72)', ls: 0.8 }); typeOn(e, s.replace(' :', ' :'), C.nota + i * 0.3, 0.45, { cursor: false }); });
    // sortie vers la signature
    tl.to(content, { y: V ? -60 : -40, opacity: 0, duration: 0.4, ease: 'power2.in' }, C.sc6 - 0.35);
    tl.to(gh, { opacity: 0.08, duration: 0.4 }, C.sc6 - 0.3);
  }

  // ---------------------------------------------------------------- 06 — Roger : le grand cartouche
  function buildFinal() {
    const F = L.fin;
    const root = S('g', { style: `color:${LINE}` }, scenes);
    const push = S('g', {}, root);
    const g = S('g', {}, push);
    const r0 = rect(g, F.x, F.y, F.w, F.h, { stroke: LINE, sw: 3 });
    drawIn(r0, C.sc6, 0.6, { ease: 'power3.inOut' });
    const ls = [];
    let rows;
    if (!V) {
      const y1 = F.y + 220, y2 = F.y + 320, cx = F.x + 470;
      ls.push(line(g, F.x, y1, F.x + F.w, y1, { stroke: LINE, sw: 1.4 }), line(g, F.x, y2, F.x + F.w, y2, { stroke: LINE, sw: 1.4 }), line(g, cx, F.y, cx, y1, { stroke: LINE, sw: 1.4 }), line(g, F.x + 360, y1, F.x + 360, y2, { stroke: LINE, sw: 1.4 }));
      rows = { logo: [F.x + 34, F.y + 176, 176, 400], svc: [cx + 34, F.y + 58], s1: [cx + 34, F.y + 118], s2: [cx + 34, F.y + 170], k1: [F.x + 24, y1 + 32], v1: [F.x + 24, y1 + 74], k2: [F.x + 384, y1 + 32], v2: [F.x + 384, y1 + 74], pr: [F.x + 24, y2 + 64], st: [F.x + F.w - 170, y2 + 50] };
    } else {
      const y1 = F.y + 250, y2 = F.y + 440, y3 = F.y + 560;
      ls.push(line(g, F.x, y1, F.x + F.w, y1, { stroke: LINE, sw: 1.4 }), line(g, F.x, y2, F.x + F.w, y2, { stroke: LINE, sw: 1.4 }), line(g, F.x, y3, F.x + F.w, y3, { stroke: LINE, sw: 1.4 }));
      rows = { logo: [F.x + 34, F.y + 196, 200, 820], svc: [F.x + 34, y1 + 44], s1: [F.x + 34, y1 + 104], s2: [F.x + 34, y1 + 160], k1: [F.x + 34, y2 + 36], v1: [F.x + 34, y2 + 80], k2: [F.x + 480, y2 + 36], v2: [F.x + 480, y2 + 80], pr: [F.x + 34, y3 + 64], st: [F.x + F.w - 180, y3 + 106] };
    }
    drawIn(ls, C.sc6 + 0.25, 0.4, { stagger: 0.05 });
    const logo = rise(g, rows.logo[0], rows.logo[1], 'ROGER', { size: rows.logo[2], w: 800, fill: LINE, maxW: rows.logo[3], ls: 0.01 });
    riseIn(logo, C.sc6 + 0.3, { stagger: 0.04, dur: 0.6 });
    const k = mono(g, rows.svc[0], rows.svc[1], 'SERVICES', { size: 14, fill: 'rgba(244,246,250,.7)' });
    fadeIn(k, C.svc - 0.1, 0.2);
    const s1 = T(g, rows.s1[0], rows.s1[1], '', { ff: SANS, w: 600, size: V ? 44 : 42, fill: LINE });
    const s2 = T(g, rows.s2[0], rows.s2[1], '', { ff: SANS, w: 600, size: V ? 44 : 42, fill: LINE });
    typeOn(s1, 'Roger Dépanne', C.svc, 0.3, { cursor: false });
    typeOn(s2, 'Roger Répare', C.svc + 0.2, 0.3, { cursor: false });
    const kk1 = mono(g, rows.k1[0], rows.k1[1], 'CIBLE', { size: 13, fill: 'rgba(244,246,250,.7)' });
    const vv1 = T(g, rows.v1[0], rows.v1[1], 'Gestion locative', { ff: SANS, w: 600, size: V ? 30 : 28, fill: LINE });
    const kk2 = mono(g, rows.k2[0], rows.k2[1], 'ZONE', { size: 13, fill: 'rgba(244,246,250,.7)' });
    const vv2 = T(g, rows.v2[0], rows.v2[1], '', { ff: SANS, w: 600, size: V ? 26 : 28, fill: LINE, html: true });
    vv2.innerHTML = V ? 'Paris 12<tspan baseline-shift="super" font-size="17">e</tspan> et 13<tspan baseline-shift="super" font-size="17">e</tspan>' : 'Paris 12<tspan baseline-shift="super" font-size="18">e</tspan> et 13<tspan baseline-shift="super" font-size="18">e</tspan> · Vincennes · Saint-Mandé';
    fadeIn([kk1, vv1, kk2, vv2], C.zone, 0.3, { stagger: 0.06 });
    if (V) { const vv3 = T(g, rows.k2[0], rows.v2[1] + 40, 'Vincennes · Saint-Mandé', { ff: SANS, w: 600, size: 26, fill: LINE }); fadeIn(vv3, C.zone + 0.1, 0.3); }
    const pr = T(g, rows.pr[0], rows.pr[1], 'Un passage. Un prix. Un rapport.', { ff: COND, w: 700, size: V ? 44 : 46, fill: '#FF8A4C', maxW: V ? 820 : 640 });
    fadeIn(pr, C.zone + 0.25, 0.35);
    // tampon : proposition à valider
    const st = S('g', { transform: `translate(${rows.st[0]} ${rows.st[1]})` }, g);
    rect(st, -150, -34, 300, 68, { stroke: '#FF8A4C', sw: 3, rx: 6 });
    rect(st, -142, -26, 284, 52, { stroke: '#FF8A4C', sw: 1, rx: 4 });
    T(st, 0, 10, 'IND. A · À VALIDER', { ff: COND, w: 800, size: 28, anchor: 'middle', fill: '#FF8A4C', ls: 2 });
    stampIn(st, C.seal, -6);
    // « Roger beep » : le voyant du cartouche clignote deux fois
    const led = circle(g, F.x + F.w - 30, F.y + 30, 8, { fill: '#FF8A4C' });
    gsap.set(led, { opacity: 0 });
    [0, C.beepGap].forEach((d) => { tl.fromTo(led, { opacity: 1 }, { opacity: 0.15, duration: 0.12 }, C.beep + d); });
    tl.set(led, { opacity: 1 }, C.beep + C.beepGap + 0.14);
    gsap.set(push, { scale: 1, transformOrigin: `${F.x + F.w / 2}px ${F.y + F.h / 2}px` });
    tl.fromTo(push, { scale: 0.96 }, { scale: 1.02, duration: C.DUR - C.sc6, ease: 'none', transformOrigin: `${F.x + F.w / 2}px ${F.y + F.h / 2}px` }, C.sc6);
  }

  // ---------------------------------------------------------------- secousses discrètes (tampons, mots)
  function buildShake() {
    const IMP = [[C.key1, 6], [C.key2, 5], [C.st[0] + 2.35, 4], [C.st[2] + 2.45, 4], [C.st[3] + 2.4, 4], [C.st[4] + 2.35, 4], [C.prom[0], 5], [C.prom[1], 4], [C.prom[2], 4], [C.seal, 5]];
    proc.push((t) => {
      let x = 0, y = 0;
      for (const [t0, A] of IMP) { const u = t - t0; if (u < 0 || u > 0.45) continue; const e = A * Math.exp(-u * 12); x += e * Math.sin(u * 2 * Math.PI * 13 + t0); y += e * 0.8 * Math.cos(u * 2 * Math.PI * 11 + t0 * 2); }
      scenes.setAttribute('transform', x || y ? `translate(${x.toFixed(2)} ${y.toFixed(2)})` : '');
    });
  }

  // ---------------------------------------------------------------- montage
  function build() {
    paperTexture();
    grids();
    buildMap();
    buildAxo();
    buildMethod();
    buildPromise();
    buildFinal();
    buildHUD();
    buildShake();
    tl.set({}, {}, C.DUR);
  }

  window.seek = function (t) {
    tl.time(t, true);
    for (const f of proc) f(t);
  };
  window.__timeline = tl;

  Promise.all(['700 100px "Barlow Condensed"', '800 100px "Barlow Condensed"', '600 30px "Barlow Condensed"', '500 30px Barlow', '600 30px Barlow', '700 30px Barlow',
    '400 16px "IBM Plex Mono"', '500 16px "IBM Plex Mono"', '600 16px "IBM Plex Mono"'].map((f) => document.fonts.load(f)))
    .then(() => document.fonts.ready).then(() => {
      build();
      window.seek(0);
      window.__ready = true;
      if (new URLSearchParams(location.search).has('play')) preview();
    });

  // Aperçu temps réel (index.html?play) : clic pour lancer, calé sur l'audio.
  function preview() {
    const stage = document.getElementById('stage');
    const fit = () => { const k = Math.min(innerWidth / W, innerHeight / H); Object.assign(stage.style, { transformOrigin: '0 0', transform: `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})` }); };
    fit(); addEventListener('resize', fit);
    document.body.style.overflow = 'hidden';
    const audio = new Audio('out/audio.wav');
    const loop = () => { if (!audio.paused) window.seek(Math.min(audio.currentTime, C.DUR - 1e-3)); requestAnimationFrame(loop); };
    addEventListener('click', () => { if (audio.paused) { if (audio.ended || audio.currentTime >= C.DUR - 0.05) audio.currentTime = 0; audio.play(); } else audio.pause(); });
    requestAnimationFrame(loop);
  }
})();
