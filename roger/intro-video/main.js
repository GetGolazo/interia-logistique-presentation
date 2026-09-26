/* ROGER — film d'introduction (15 s, 1920×1080, 60 i/s).
   Une timeline GSAP en pause + des effets procéduraux : window.seek(t) rend l'image exacte à l'instant t. */
(function () {
  'use strict';
  const C = window.CUES;
  const b = C.b;
  gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin);

  const INK = '#0B0D12', CREAM = '#F2EEE6', BLUE = '#2F4BFF', YELLOW = '#FFD43B', CORAL = '#FF5A3C', GREEN = '#1FB86B';
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
  function s(tag, attrs = {}, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    for (const k of kids) el.append(k);
    return el;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    sms: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checks: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    depot: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  };
  const icon = (name, size, color, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${ICON[name]}</svg>`;

  // Déformation « caractère par caractère » : glissement dans un masque + graisse variable.
  // Entrée puis sortie optionnelle, sans jamais chevaucher les deux tweens d'une même lettre.
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

  // Texte « décodé » (monospace) : révélation gauche → droite avec caractères parasites.
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+=<>';
  function scramble(el, text, t0, dur, seed) {
    const chars = [...text];
    let last = null;
    proc.push((t) => {
      const p = clamp((t - t0) / dur);
      const rev = Math.floor(p * chars.length + 1e-6);
      const q = Math.round(t * C.FPS / 2);
      let out = '';
      for (let i = 0; i < chars.length; i++) {
        if (i < rev || chars[i] === ' ') out += chars[i];
        else if (p > 0 && i < rev + 7) out += GLYPHS[Math.floor(hash(i * 131 + q * 7 + seed) * GLYPHS.length)];
        else out += ' ';
      }
      if (out !== last) { el.textContent = out; last = out; }
    });
  }

  // Le logotype : R ⊙ G E R — le « O » est un anneau avec un point jaune (statut, cible, bouton radio).
  const RING = { d: 1.06, sw: 0.25, dot: 0.155 };
  function wordmark(size, color = CREAM, dotColor = YELLOW) {
    const wrap = h('div', { class: 'abs wm brico', style: { fontSize: size + 'px', color } });
    const css = briCSS(size);
    const cap = capH(size);
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
    return { wrap, R1, G, E, R2, letters: [R1, G, E, R2], box, svg, ring, dot, cap, D, SW, DR, size };
  }
  function placeWordmark(WM, cx, ringCY) {
    const wr = WM.wrap.getBoundingClientRect(), rr = WM.svg.getBoundingClientRect();
    const offY = rr.top + rr.height / 2 - wr.top;
    const left = cx - wr.width / 2;
    WM.wrap.style.left = left + 'px';
    WM.wrap.style.top = (ringCY - offY) + 'px';
    WM.ox = rr.left + rr.width / 2 - wr.left; WM.oy = offY;
    WM.rcx = left + WM.ox; WM.rcy = ringCY; WM.w = wr.width;
  }

  // ---------------------------------------------------------------- HUD & caméra
  function buildHUD() {
    const tc = $('#hud-tr'), sec = $('#hud-bl');
    const SECTIONS = [[0, '01 — Le problème'], [C.chaos, '02 — Le chaos'], [C.drop, '03 — La réponse'],
      [C.sc4, '04 — La méthode'], [C.sc5, '05 — La promesse'], [C.sc6, '06 — Roger']];
    let lastTc = '', lastSec = '';
    proc.push((t) => {
      const f = Math.min(Math.round(t * C.FPS), C.DUR * C.FPS - 1);
      const txt = `00:00:${String(Math.floor(f / C.FPS)).padStart(2, '0')}:${String(f % C.FPS).padStart(2, '0')}`;
      if (txt !== lastTc) { tc.textContent = txt; lastTc = txt; }
      const tq = f / C.FPS; // étiquette calée sur l'image entière (pas de fondu entre sous-images)
      let label = SECTIONS[0][1];
      for (const [t0, l] of SECTIONS) if (tq >= t0 - 1e-6) label = l;
      if (label !== lastSec) { sec.textContent = label; lastSec = label; }
    });
    tl.set('#hud', { '--hud': CREAM }, C.chaos + 0.06);
    tl.set('#hud', { '--hud': INK }, C.sc4);
    tl.set('#hud', { '--hud': CREAM }, C.sc5 - 0.06);

    // Secousses de caméra sur les impacts.
    const shake = $('#shake');
    const IMP = [[C.impact, 7], [C.chaos, 12], [C.q1, 7], [C.q2, 7], [C.drop, 16], [C.sc5, 9], [C.line2, 6], [C.sc6, 8]];
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

  // ---------------------------------------------------------------- 01 — Le problème
  const ICO_DROP = 'M50 19 C50 19 30 43 30 58 C30 69.5 39 78 50 78 C61 78 70 69.5 70 58 C70 43 50 19 50 19 Z';
  const ICO_KEY = 'M50 21 C58.8 21 66 28.2 66 37 C66 42.9 62.8 48.1 58 50.8 L62.5 78 L37.5 78 L42 50.8 C37.2 48.1 34 42.9 34 37 C34 28.2 41.2 21 50 21 Z';
  const ICO_BOLT = 'M57 18 L32 53 L48 53 L43 82 L68 45 L52 45 L57 18 Z';

  function buildSC1() {
    const sc = $('#sc1');
    gsap.set(sc, { autoAlpha: 1 });
    sc.append(h('div', { class: 'layer', style: { background: CREAM } }));
    const P = { x: 560, y: 540 };

    // Mire de visée + guide pointillé (clin d'œil « making-of »).
    const guide = s('svg', { width: 1920, height: 1080, class: 'layer' });
    const gline = s('line', { x1: P.x, y1: 120, x2: P.x, y2: P.y - 34, stroke: INK, 'stroke-opacity': 0.22, 'stroke-width': 1.5, 'stroke-dasharray': '6 8' });
    const xg = s('g', { stroke: INK, 'stroke-opacity': 0.5, 'stroke-width': 1.5, fill: 'none' });
    [[-34, 0, -14, 0], [14, 0, 34, 0], [0, -34, 0, -14], [0, 14, 0, 34]].forEach(([a, c, d, e]) =>
      xg.append(s('line', { x1: P.x + a, y1: P.y + c, x2: P.x + d, y2: P.y + e })));
    xg.append(s('circle', { cx: P.x, cy: P.y, r: 4 }));
    guide.append(gline, xg);
    sc.append(guide);
    const xl = h('div', { class: 'abs xhair-l', style: { left: P.x + 24 + 'px', top: P.y + 22 + 'px' } });
    xl.textContent = 'X 560 · Y 540';
    sc.append(xl);
    tl.fromTo(gline, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.3, ease: 'power2.out' }, 0);
    tl.to([guide, xl], { autoAlpha: 0, duration: 0.12, ease: 'none' }, C.impact - 0.02);

    // Ondes de choc.
    const rs = s('svg', { width: 1920, height: 1080, class: 'layer' });
    rs.style.overflow = 'visible';
    const mkRip = (col) => { const c = s('circle', { cx: P.x, cy: P.y, r: 95, fill: 'none', stroke: col, 'stroke-width': 6 }); rs.append(c); return c; };
    const rips = [mkRip(BLUE), mkRip(BLUE), mkRip(BLUE)];
    const rip2 = mkRip(YELLOW), rip3 = mkRip(CORAL);
    sc.append(rs);
    gsap.set([...rips, rip2, rip3], { autoAlpha: 0 });
    rips.forEach((c, i) => tl.fromTo(c, { attr: { r: 95, 'stroke-width': 7 }, autoAlpha: 0.9 },
      { attr: { r: 320 + i * 110, 'stroke-width': 1 }, autoAlpha: 0, duration: 0.95 + i * 0.12, ease: 'power2.out' }, C.impact + i * 0.08));
    [[rip2, C.swap2], [rip3, C.swap3]].forEach(([c, t0]) => tl.fromTo(c, { attr: { r: 95, 'stroke-width': 6 }, autoAlpha: 0.9 },
      { attr: { r: 250, 'stroke-width': 1 }, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, t0));

    // La goutte qui tombe.
    const fall = h('div', { class: 'abs', style: { left: P.x - 40 + 'px', top: '0px', width: '80px', height: '104px' } });
    fall.innerHTML = `<svg viewBox="0 0 100 130" width="80" height="104" style="overflow:visible"><path d="M50 3 C50 3 12 52 12 84 C12 106 29 124 50 124 C71 124 88 106 88 84 C88 52 50 3 50 3 Z" fill="${BLUE}"/><ellipse cx="33" cy="88" rx="7" ry="13" fill="#fff" opacity=".35"/></svg>`;
    sc.append(fall);
    gsap.set(fall, { y: 70, scale: 0.3, transformOrigin: '50% 0%' });
    tl.fromTo(fall, { scale: 0.3 }, { scale: 1, duration: 0.13, ease: 'back.out(3)' }, 0);
    tl.fromTo(fall, { y: 70 }, { y: P.y - 104 * 1.3, duration: C.impact - 0.12, ease: 'power3.in' }, 0.12);
    tl.fromTo(fall, { scaleX: 1, scaleY: 1 }, { scaleX: 0.8, scaleY: 1.3, duration: C.impact - 0.13, ease: 'power2.in' }, 0.13);
    tl.set(fall, { autoAlpha: 0 }, C.impact);

    // Pastille : goutte → serrure → éclair (morphing).
    const badge = h('div', { class: 'abs', style: { left: P.x - 95 + 'px', top: P.y - 95 + 'px', width: '190px', height: '190px', borderRadius: '50%', background: BLUE } });
    badge.innerHTML = `<svg viewBox="0 0 100 100" width="190" height="190"><path d="${ICO_DROP}" fill="${CREAM}"/></svg>`;
    sc.append(badge);
    const ico = badge.querySelector('path');
    gsap.set(badge, { scale: 0 });
    tl.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, C.impact);
    [[C.swap2, ICO_KEY, YELLOW, INK], [C.swap3, ICO_BOLT, CORAL, CREAM]].forEach(([t0, path, bg, fg]) => {
      tl.to(ico, { morphSVG: path, duration: 0.32, ease: 'expo.inOut' }, t0 - 0.12);
      tl.to(badge, { backgroundColor: bg, duration: 0.18, ease: 'none' }, t0 - 0.06);
      tl.to(ico, { fill: fg, duration: 0.18, ease: 'none' }, t0 - 0.06);
      tl.fromTo(badge, { scale: 0.84 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .5)' }, t0);
    });
    tl.fromTo(badge, { scale: 1 }, { scale: 0.8, duration: 0.14, ease: 'power2.in' }, C.chaos - 0.14);
    tl.fromTo(badge, { scale: 0.8, autoAlpha: 1 }, { scale: 2.4, autoAlpha: 0, duration: 0.3, ease: 'expo.out' }, C.chaos);

    // Horodatage.
    const cap = h('div', { class: 'abs cap', style: { left: '704px', top: '404px' } });
    sc.append(cap);
    scramble(cap, 'LUNDI · 07:42 · PARIS', C.capIn, 0.42, 17);

    // Titres.
    const phrases = ['Une fuite.', 'Une serrure.', 'Une panne.'];
    const ins = [C.impact + 0.03, C.swap2 - 0.01, C.swap3 - 0.01];
    const outs = [C.swap2 - 0.1, C.swap3 - 0.1, C.chaos + 0.02];
    phrases.forEach((p, i) => {
      const m = h('div', { class: 'abs mask brico s1line' });
      m.textContent = p; sc.append(m);
      const ch = splitChars(m);
      gsap.set(ch, { yPercent: 112 });
      chars(ch, ins[i], outs[i], { dur: 0.45, stagger: 0.016, w0: 380 });
    });

    // Gouttelettes (physique simple, déterministe).
    const R = rng(11);
    const drops = [];
    for (let i = 0; i < 12; i++) {
      const r = 4 + R() * 7;
      const d = h('div', { class: 'abs', style: { width: 2 * r + 'px', height: 2 * r + 'px', left: -r + 'px', top: -r + 'px', borderRadius: '50%', background: BLUE, visibility: 'hidden' } });
      sc.append(d);
      const th = (-172 + R() * 164) * Math.PI / 180, v = 420 + R() * 720;
      drops.push({ el: d, vx: Math.cos(th) * v, vy: Math.sin(th) * v - 160 });
    }
    proc.push((t) => {
      const u = t - C.impact;
      for (const d of drops) {
        if (u < 0 || u > 0.62) { d.el.style.visibility = 'hidden'; continue; }
        const x = P.x + d.vx * u, y = P.y - 30 + d.vy * u + 1300 * u * u;
        d.el.style.visibility = 'visible';
        d.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1 - u / 0.8).toFixed(3)})`;
        d.el.style.opacity = (1 - Math.pow(u / 0.62, 2)).toFixed(3);
      }
    });
  }

  // ---------------------------------------------------------------- 02 — Le chaos
  function buildSC2() {
    const sc = $('#sc2');
    const wipe = h('div', { class: 'abs', style: { left: 560 - 1650 + 'px', top: 540 - 1650 + 'px', width: '3300px', height: '3300px', borderRadius: '50%', background: INK } });
    sc.append(wipe);
    gsap.set(wipe, { scale: 0 });
    tl.set(sc, { autoAlpha: 1 }, C.chaos - 0.001);
    tl.fromTo(wipe, { scale: 0 }, { scale: 1, duration: 0.55, ease: 'expo.out' }, C.chaos);
    tl.set('#sc1', { autoAlpha: 0 }, C.chaos + 0.5);
    tl.set('#stage', { backgroundColor: INK }, C.chaos + 0.5);

    // Bandeaux typographiques en fond.
    const marq = (txt, top) => { const m = h('div', { class: 'abs marq brico', style: { top: top + 'px', left: '0px' } }); m.textContent = txt.repeat(3); sc.append(m); return m; };
    const m1 = marq('APPELS · E-MAILS · MESSAGES · RELANCES · ', 30);
    const m2 = marq('QUI VALIDE ? · QUI PASSE ? · QUAND ? · ', 800);
    gsap.set([m1, m2], { autoAlpha: 0 });
    tl.fromTo([m1, m2], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' }, C.chaos + 0.08);
    tl.to([m1, m2], { autoAlpha: 0, duration: 0.25, ease: 'none' }, C.collapse);
    proc.push((t) => {
      const u = t - C.chaos;
      m1.style.transform = `translateX(${(-300 - u * 280).toFixed(1)}px)`;
      m2.style.transform = `translateX(${(-1500 + u * 280).toFixed(1)}px)`;
    });

    // Notifications.
    const CARDS = [
      { k: 'phone', c: CORAL, meta: 'Appel manqué', time: 'maintenant', body: 'Locataire — Appt 3B', x: 330, y: 170, r: -7, n: 3 },
      { k: 'chat', c: GREEN, meta: 'Locataire 3B', time: '07:44', body: 'Il y a de l’eau partout !!', x: 1545, y: 150, r: 6 },
      { k: 'mail', c: BLUE, meta: 'E-mail', time: '07:44', body: 'RE: RE: Fuite cuisine', x: 945, y: 100, r: -3 },
      { k: 'chat', c: GREEN, meta: 'Locataire 3B', time: '07:45', body: 'Quelqu’un peut passer ?', x: 275, y: 470, r: 5 },
      { k: 'mail', c: BLUE, meta: 'Propriétaire', time: '07:46', body: 'Qui valide le devis ?', x: 1640, y: 430, r: -6 },
      { k: 'phone', c: CORAL, meta: 'Appel manqué', time: '07:46', body: 'Propriétaire', x: 385, y: 805, r: -4 },
      { k: 'sms', c: YELLOW, meta: 'SMS', time: '07:47', body: 'Vous avez les photos ?', x: 1500, y: 775, r: 7 },
      { k: 'chat', c: GREEN, meta: 'Artisan', time: '07:48', body: 'Pas dispo avant jeudi', x: 960, y: 975, r: -2 },
      { k: 'mail', c: BLUE, meta: 'E-mail', time: '07:49', body: 'TR: Devis plomberie.pdf', x: 690, y: 320, r: 9 },
      { k: 'chat', c: GREEN, meta: 'Locataire 3B', time: '07:51', body: 'On en est où ?', x: 1265, y: 315, r: -8 },
      { k: 'phone', c: CORAL, meta: 'Appel manqué', time: '07:52', body: 'Locataire — Appt 3B', x: 610, y: 655, r: 4, n: 5 },
      { k: 'sms', c: YELLOW, meta: 'SMS', time: '07:53', body: 'Toujours rien…', x: 1325, y: 630, r: -5 },
      { k: 'mail', c: BLUE, meta: 'Syndic', time: '07:55', body: 'URGENT — dégât des eaux', x: 1665, y: 990, r: 3 },
      { k: 'chat', c: GREEN, meta: 'Propriétaire', time: '07:58', body: 'C’est réparé ?', x: 240, y: 1000, r: -6 },
    ];
    const layer = h('div', { class: 'layer' }); sc.append(layer);
    const wraps = [], jits = [];
    CARDS.forEach((d) => {
      const w = h('div', { class: 'abs cardWrap', style: { left: d.x + 'px', top: d.y + 'px' } });
      const j = h('div');
      const fg = d.k === 'sms' ? INK : '#fff';
      j.innerHTML = `<div class="card"><div class="ic" style="background:${d.c}">${icon(d.k, 30, fg, 2.2)}</div>
        <div class="tx"><div class="meta"><b>${d.meta}</b><span>${d.time}</span></div><div class="body">${d.body}</div></div>
        ${d.n ? `<div class="cnt">${d.n}</div>` : ''}</div>`;
      w.append(j); layer.append(w); wraps.push(w); jits.push(j);
    });
    wraps.forEach((w, i) => {
      const d = CARDS[i], t0 = C.cardPops[i];
      gsap.set(w, { xPercent: -50, yPercent: -50, scale: 0.35, rotation: d.r - 14, autoAlpha: 0 });
      tl.fromTo(w, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, ease: 'none' }, t0);
      tl.fromTo(w, { scale: 0.35, rotation: d.r - 14, y: -34 }, { scale: 1, rotation: d.r, y: 0, duration: 0.36, ease: 'back.out(2.2)' }, t0);
      const delay = (i % 5) * 0.012;
      tl.fromTo(w, { x: 0, y: 0, scale: 1, rotation: d.r },
        { x: 960 - d.x, y: 540 - d.y, scale: 0.1, rotation: d.r + (d.x < 960 ? 30 : -30), duration: 0.5, ease: 'power3.in' }, C.collapse + delay);
      tl.to(w, { autoAlpha: 0, duration: 0.08, ease: 'none' }, C.collapse + delay + 0.43);
    });
    proc.push((t) => {
      for (let i = 0; i < wraps.length; i++) {
        const d = CARDS[i], j = jits[i], t0 = C.cardPops[i];
        if (t < t0 || t >= C.collapse) { if (j.style.transform) j.style.transform = ''; continue; }
        const ramp = clamp((t - t0) / 0.3) * (0.6 + 0.8 * clamp((t - C.chaos) / (C.collapse - C.chaos)));
        let x, y, r;
        if (d.k === 'phone') {
          x = ramp * 3.4 * Math.sin(t * 2 * Math.PI * 19 + i); y = ramp * 1.6 * Math.sin(t * 2 * Math.PI * 23 + 2 * i); r = ramp * 1.3 * Math.sin(t * 2 * Math.PI * 17 + i);
        } else {
          x = ramp * 7 * Math.sin(t * 2.1 + i * 1.7); y = ramp * 9 * Math.sin(t * 2.7 + i * 2.3); r = ramp * 1.4 * Math.sin(t * 1.9 + i);
        }
        j.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
      }
    });

    // Les questions (bandeau corail).
    const qbox = h('div', { class: 'layer' });
    const qbg = h('div', { class: 'abs', style: { background: CORAL, height: '214px', top: 540 - 107 + 'px', borderRadius: '8px' } });
    const q1 = h('div', { class: 'abs mask brico qline' }); q1.textContent = 'Qui valide ?';
    const q2 = h('div', { class: 'abs mask brico qline' }); q2.textContent = 'Qui intervient ?';
    qbox.append(qbg, q1, q2); sc.append(qbox);
    const c1 = splitChars(q1), c2 = splitChars(q2);
    const w1 = q1.getBoundingClientRect().width, w2 = q2.getBoundingClientRect().width;
    const pad = 58;
    q1.style.left = 960 - w1 / 2 + 'px'; q2.style.left = 960 - w2 / 2 + 'px';
    gsap.set(qbox, { rotation: -2, transformOrigin: '960px 540px' });
    gsap.set(qbg, { left: 960 - w1 / 2 - pad, width: w1 + 2 * pad, scaleX: 0, transformOrigin: '0% 50%' });
    gsap.set([...c1, ...c2], { yPercent: 112 });
    tl.fromTo(qbg, { scaleX: 0 }, { scaleX: 1, duration: 0.28, ease: 'expo.out' }, C.q1 - 0.03);
    tl.fromTo(qbox, { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'expo.out' }, C.q1);
    chars(c1, C.q1, C.q2 - 0.12, { dur: 0.36, stagger: 0.01, w0: 500 }, { stagger: 0.006 });
    tl.fromTo(qbg, { left: 960 - w1 / 2 - pad, width: w1 + 2 * pad }, { left: 960 - w2 / 2 - pad, width: w2 + 2 * pad, duration: 0.32, ease: 'expo.inOut' }, C.q2 - 0.14);
    tl.fromTo(qbox, { scale: 1.1 }, { scale: 1, duration: 0.4, ease: 'expo.out' }, C.q2);
    chars(c2, C.q2, C.qOut - 0.1, { dur: 0.36, stagger: 0.01, w0: 500 }, { stagger: 0.006 });
    tl.set(qbg, { transformOrigin: '100% 50%' }, C.qOut - 0.051);
    tl.fromTo(qbg, { scaleX: 1 }, { scaleX: 0, duration: 0.25, ease: 'expo.in' }, C.qOut - 0.05);

    // Caméra : poussée nerveuse puis retour au calme.
    tl.fromTo('#cam', { scale: 1, rotation: 0 }, { scale: 1.055, rotation: -1.2, duration: C.collapse - C.chaos, ease: 'sine.inOut' }, C.chaos);
    tl.fromTo('#cam', { scale: 1.055, rotation: -1.2 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'expo.inOut' }, C.collapse);

    // « Bien reçu. »
    const bub = h('div', { class: 'abs bubble' });
    bub.innerHTML = `<div class="btxt"><span>Bien reçu.</span><span class="ck">${icon('checks', 50, YELLOW, 2.6)}</span></div>`;
    sc.append(bub);
    const btxt = bub.querySelector('.btxt'), ckPaths = bub.querySelectorAll('.ck path');
    gsap.set(bub, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
    gsap.set(ckPaths, { drawSVG: '0%' });
    tl.fromTo(bub, { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(2.2)' }, C.bubbleIn);
    tl.fromTo(btxt, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'expo.out' }, C.bubbleIn + 0.06);
    tl.fromTo(ckPaths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.22, ease: 'power2.out', stagger: 0.08 }, C.bubbleChecks);
  }

  // ---------------------------------------------------------------- 03 — La réponse
  function buildSC3() {
    const sc = $('#sc3');
    const wipe = h('div', { class: 'abs', style: { left: 960 - 1200 + 'px', top: 540 - 1200 + 'px', width: '2400px', height: '2400px', borderRadius: '50%', background: BLUE } });
    const shock = s('svg', { width: 1920, height: 1080, class: 'layer' });
    shock.style.overflow = 'visible';
    const sring = s('circle', { cx: 960, cy: 540, r: 280, fill: 'none', stroke: CREAM, 'stroke-width': 40 });
    shock.append(sring);
    sc.append(wipe, shock);
    gsap.set(wipe, { scale: 0.22 });
    gsap.set(sring, { autoAlpha: 0 });
    tl.set(sc, { autoAlpha: 1 }, C.drop - 0.001);
    tl.fromTo(wipe, { scale: 0.22 }, { scale: 1, duration: 0.55, ease: 'expo.out' }, C.drop);
    tl.fromTo(sring, { attr: { r: 280, 'stroke-width': 44 }, autoAlpha: 0.85 }, { attr: { r: 1250, 'stroke-width': 2 }, autoAlpha: 0, duration: 0.7, ease: 'expo.out' }, C.drop);
    tl.set('#sc2', { autoAlpha: 0 }, C.drop + 0.45);
    tl.set('#stage', { backgroundColor: BLUE }, C.drop + 0.45);

    const WM = wordmark(330);
    sc.append(WM.wrap);
    placeWordmark(WM, 960, 452);
    WM.wrap.style.overflow = 'hidden';

    // Lettres : montée + graisse 250 → 800 ; l'anneau se trace.
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

    // Signature.
    const base = h('div', { class: 'abs mask brico base' });
    base.textContent = 'Dépannage & maintenance des logements';
    sc.append(base);
    const words = splitWords(base);
    const bw = base.getBoundingClientRect().width;
    Object.assign(base.style, { left: 960 - bw / 2 + 'px', top: '668px' });
    gsap.set(words, { yPercent: 110 });
    tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 }, C.base1);

    // Plongée dans le « O ».
    tl.to(base, { autoAlpha: 0, duration: 0.16, ease: 'none' }, C.zoomPrep);
    const counterR = (WM.D - 2 * WM.SW) / 2 + 1;
    tl.fromTo(WM.dot, { scale: 1 }, { scale: counterR / WM.DR, duration: 0.3, ease: 'expo.inOut' }, C.zoomPrep);
    tl.to(WM.dot, { fill: CREAM, duration: 0.18, ease: 'none' }, C.zoomPrep + 0.06);
    tl.fromTo(WM.wrap, { scale: 1 }, { scale: 42, duration: 0.4, ease: 'expo.in', transformOrigin: `${WM.ox}px ${WM.oy}px` }, C.zoomStart);
  }

  // ---------------------------------------------------------------- 04 — La méthode
  function buildQR(n, m, seed) {
    const R = rng(seed);
    const svg = s('svg', { width: n * m, height: n * m, viewBox: `0 0 ${n * m} ${n * m}` });
    svg.style.overflow = 'visible';
    const finders = [], mods = [];
    const inF = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    const inA = (x, y) => x >= n - 9 && x <= n - 5 && y >= n - 9 && y <= n - 5;
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([fx, fy]) => {
      const g = s('g');
      g.append(s('rect', { x: fx * m + m / 2, y: fy * m + m / 2, width: 6 * m, height: 6 * m, rx: m * 1.5, fill: 'none', stroke: INK, 'stroke-width': m }));
      g.append(s('rect', { x: (fx + 2) * m, y: (fy + 2) * m, width: 3 * m, height: 3 * m, rx: m * 0.8, fill: BLUE }));
      svg.append(g); finders.push(g);
    });
    const ag = s('g'), a = n - 9;
    ag.append(s('rect', { x: a * m + m / 2, y: a * m + m / 2, width: 4 * m, height: 4 * m, rx: m, fill: 'none', stroke: INK, 'stroke-width': m }));
    ag.append(s('rect', { x: (a + 2) * m, y: (a + 2) * m, width: m, height: m, rx: m * 0.3, fill: INK }));
    svg.append(ag); finders.push(ag);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (inF(x, y) || inA(x, y)) continue;
      const on = (y === 6 || x === 6) ? (x + y) % 2 === 0 : R() < 0.47;
      if (!on) continue;
      const r = s('rect', { x: x * m + 0.7, y: y * m + 0.7, width: m - 1.4, height: m - 1.4, rx: m * 0.3, fill: INK });
      svg.append(r); mods.push(r);
    }
    return { svg, finders, mods };
  }

  function pop(el, t, from = {}, o = {}) {
    gsap.set(el, Object.assign({ autoAlpha: 0 }, from));
    tl.fromTo(el, Object.assign({ autoAlpha: 0 }, from),
      Object.assign({ autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: o.rot ?? 0, duration: o.dur ?? 0.5, ease: o.ease ?? 'back.out(1.8)' }), t);
  }

  function ill1(ill, S) {
    const cx = 330, cy = 290;
    const photos = [
      { bg: '#DCE3FF', ic: 'droplet', col: BLUE, x: 262, y: -170, r: 11 },
      { bg: '#FFEFB0', ic: 'image', col: '#7A5C00', x: 318, y: 6, r: -7 },
      { bg: '#FFDCD3', ic: 'camera', col: CORAL, x: 252, y: 178, r: 14 },
    ];
    const ph = photos.map((p) => {
      const e = h('div', { class: 'abs photo', style: { left: cx - 82 + 'px', top: cy - 82 + 'px' } });
      e.innerHTML = `<div class="ph-in" style="background:${p.bg}">${icon(p.ic, 62, p.col, 2)}</div>`;
      ill.append(e); return e;
    });
    const st = h('div', { class: 'abs panel', style: { left: cx - 205 + 'px', top: cy - 250 + 'px', width: '410px', height: '500px', borderRadius: '40px' } });
    ill.append(st);
    const mini = wordmark(38, INK, YELLOW);
    st.append(mini.wrap);
    placeWordmark(mini, 205, 58);
    const tag = h('div', { class: 'abs lbl', style: { right: '36px', top: '50px' } }); tag.textContent = 'APPT 3B';
    st.append(tag);
    const qr = buildQR(25, 12, 42);
    Object.assign(qr.svg.style, { position: 'absolute', left: 205 - 150 + 'px', top: '105px' });
    st.append(qr.svg);
    const capt = h('div', { class: 'abs sticker-cap', style: { left: '0px', width: '410px', top: '432px' } });
    capt.textContent = 'Un problème ? Scannez-moi.';
    st.append(capt);
    // balayage
    const scan = h('div', { class: 'abs', style: { left: '42px', top: '105px', width: '326px', height: '5px', borderRadius: '3px', background: BLUE, boxShadow: '0 0 22px 6px rgba(47,75,255,.45)' } });
    const trail = h('div', { class: 'abs', style: { left: '42px', top: '45px', width: '326px', height: '60px', background: 'linear-gradient(to bottom, rgba(47,75,255,0), rgba(47,75,255,.16))' } });
    st.append(trail, scan);
    gsap.set([scan, trail], { autoAlpha: 0 });

    gsap.set(st, { autoAlpha: 0 });
    tl.fromTo(st, { y: 90, rotation: -8, autoAlpha: 0 }, { y: 0, rotation: -2, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.08);
    qr.finders.forEach((g) => gsap.set(g, { scale: 0, rotation: -90, transformOrigin: '50% 50%' }));
    tl.fromTo(qr.finders, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.05 }, S + 0.08);
    gsap.set(qr.mods, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(qr.mods, { scale: 0 }, { scale: 1, duration: 0.22, ease: 'back.out(3)', stagger: { amount: C.qr1 - C.qr0, from: 'random' } }, C.qr0);
    tl.fromTo([scan, trail], { y: 0, autoAlpha: 1 }, { y: 300, duration: C.scan1 - C.scan0, ease: 'sine.inOut' }, C.scan0);
    tl.to([scan, trail], { autoAlpha: 0, duration: 0.12, ease: 'none' }, C.scan1 - 0.06);
    ph.forEach((e, i) => {
      const p = photos[i];
      gsap.set(e, { autoAlpha: 0 });
      tl.fromTo(e, { x: 0, y: 0, rotation: 0, scale: 0.6, autoAlpha: 0 }, { x: p.x, y: p.y, rotation: p.r, scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.6)' }, C.photos + i * 0.07);
    });
    const chip = h('div', { class: 'abs chip', style: { left: cx - 150 + 'px', top: cy + 272 + 'px', background: INK, color: CREAM } });
    chip.innerHTML = `${icon('camera', 22, YELLOW, 2.2)}<span>3 photos · Cuisine</span>`;
    ill.append(chip);
    pop(chip, C.chip1, { y: 22, scale: 0.8 });
  }

  function ill2(ill, S) {
    const card = h('div', { class: 'abs panel', style: { left: '40px', top: '70px', width: '620px', height: '470px' } });
    ill.append(card);
    const head = h('div', { class: 'abs t-h', style: { left: '40px', top: '40px' } }); head.textContent = 'Demande n° 1042';
    const sub = h('div', { class: 'abs t-s', style: { left: '40px', top: '82px' } }); sub.textContent = 'Fuite sous évier · Appt 3B';
    const pillA = h('div', { class: 'abs pill', style: { right: '34px', top: '38px', background: YELLOW, color: INK } }); pillA.textContent = 'À qualifier';
    const pillB = h('div', { class: 'abs pill', style: { right: '34px', top: '38px', background: BLUE, color: CREAM } });
    pillB.innerHTML = `${icon('check', 18, CREAM, 3)}<span>Qualifiée</span>`;
    const hr = h('div', { class: 'abs', style: { left: '40px', right: '40px', top: '124px', height: '1.5px', background: 'rgba(11,13,18,.08)' } });
    card.append(head, sub, pillA, pillB, hr);

    // Jauge d'urgence.
    const gs = s('svg', { width: 260, height: 170, viewBox: '0 0 260 170' });
    Object.assign(gs.style, { position: 'absolute', left: '28px', top: '150px', overflow: 'visible' });
    const arc = (a0, a1, col) => {
      const r = 100, cx = 130, cy = 140;
      const p = (a) => [cx + r * Math.cos(Math.PI + a * Math.PI), cy + r * Math.sin(Math.PI + a * Math.PI)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      return s('path', { d: `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`, fill: 'none', stroke: col, 'stroke-width': 22, 'stroke-linecap': 'round' });
    };
    const arcs = [arc(0.02, 0.3, BLUE), arc(0.36, 0.64, YELLOW), arc(0.7, 0.98, CORAL)];
    const needle = s('g');
    needle.append(s('line', { x1: 130, y1: 140, x2: 130, y2: 58, stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }));
    needle.append(s('circle', { cx: 130, cy: 140, r: 13, fill: INK }));
    arcs.forEach((a) => gs.append(a)); gs.append(needle);
    card.append(gs);
    const gl = h('div', { class: 'abs lbl', style: { left: '68px', top: '334px' } }); gl.textContent = 'URGENCE';
    const gv = h('div', { class: 'abs t-h', style: { left: '68px', top: '362px', color: CORAL } }); gv.textContent = 'Élevée';
    card.append(gl, gv);

    // Étiquettes.
    const CH = [
      { txt: 'Plomberie', ic: 'wrench', bg: BLUE, fg: CREAM, dx: 260, dy: -40, r: 12 },
      { txt: 'Cuisine · évier', ic: 'home', bg: '#EFEBE3', fg: INK, dx: 220, dy: 60, r: -10 },
      { txt: '1 passage', ic: 'truck', bg: '#EFEBE3', fg: INK, dx: -160, dy: 120, r: 8 },
      { txt: 'Validation', ic: 'check', bg: YELLOW, fg: INK, dx: 60, dy: 180, r: -12 },
    ];
    CH.forEach((c, i) => {
      const e = h('div', { class: 'abs chip', style: { left: '330px', top: 160 + i * 66 + 'px', background: c.bg, color: c.fg } });
      e.innerHTML = `${icon(c.ic, 22, c.fg, 2.2)}<span>${c.txt}</span>`;
      card.append(e);
      pop(e, C.chips2[i], { x: c.dx, y: c.dy, rotation: c.r, scale: 0.7 }, { dur: 0.55 });
    });

    gsap.set(card, { autoAlpha: 0 });
    tl.fromTo(card, { y: 90, rotation: 6, autoAlpha: 0 }, { y: 0, rotation: 1.5, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.12);
    gsap.set(arcs, { drawSVG: '0%' });
    tl.fromTo(arcs, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out', stagger: 0.07 }, S + 0.02);
    gsap.set(needle, { rotation: -90, svgOrigin: '130 140' });
    tl.fromTo(needle, { rotation: -90 }, { rotation: 52, duration: 1.0, ease: 'elastic.out(1, .42)', svgOrigin: '130 140' }, C.gauge);
    pop(gv, C.gauge + 0.3, { y: 14 }, { dur: 0.35, ease: 'expo.out' });
    gsap.set(pillB, { scaleY: 0, autoAlpha: 1 });
    tl.fromTo(pillA, { scaleY: 1 }, { scaleY: 0, duration: 0.1, ease: 'power2.in' }, C.flip2);
    tl.fromTo(pillB, { scaleY: 0 }, { scaleY: 1, duration: 0.35, ease: 'back.out(2.5)' }, C.flip2 + 0.1);
  }

  function ill3(ill, S) {
    const card = h('div', { class: 'abs panel', style: { left: '40px', top: '50px', width: '620px', height: '450px', overflow: 'hidden', background: '#E9E4DA' } });
    ill.append(card);
    const ms = s('svg', { width: 620, height: 450, viewBox: '0 0 620 450' });
    Object.assign(ms.style, { position: 'absolute', left: '0', top: '0' });
    ms.innerHTML = `
      <rect x="360" y="250" width="170" height="120" rx="26" fill="#D3E4C8"/>
      <path d="M-30 150 C 90 110, 190 215, 320 190 S 520 105, 660 150" fill="none" stroke="#BCD0FA" stroke-width="30" stroke-linecap="round"/>
      <g fill="none" stroke="#fff" stroke-linecap="round">
        <path d="M-20 318 L 640 300" stroke-width="16"/>
        <path d="M180 -20 L 230 470" stroke-width="12"/>
        <path d="M420 -20 L 380 470" stroke-width="12"/>
        <path d="M-20 60 L 640 90" stroke-width="8"/>
        <path d="M-20 400 L 640 390" stroke-width="7"/>
        <path d="M80 -20 L 60 470" stroke-width="6"/>
        <path d="M540 -20 L 560 470" stroke-width="6"/>
        <path d="M300 -20 L 310 470" stroke-width="5"/>
      </g>`;
    card.append(ms);
    const RD = 'M92 392 C 92 350, 110 318, 160 316 L 222 312 C 250 310, 262 290, 258 262 L 252 200 C 249 170, 270 150, 300 152 L 402 160 C 430 162, 452 146, 456 118 L 462 96';
    const casing = s('path', { d: RD, fill: 'none', stroke: '#fff', 'stroke-width': 18, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const route = s('path', { d: RD, fill: 'none', stroke: BLUE, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    ms.append(casing, route);
    // repères
    const depot = h('div', { class: 'abs', style: { left: 92 - 26 + 'px', top: 392 - 26 + 'px', width: '52px', height: '52px', borderRadius: '16px', background: INK, display: 'grid', placeItems: 'center' } });
    depot.innerHTML = icon('depot', 28, CREAM, 2);
    const dl = h('div', { class: 'abs maplbl', style: { left: '130px', top: '370px' } }); dl.textContent = 'Dépôt · Gentilly';
    const pinW = h('div', { class: 'abs', style: { left: 462 - 30 + 'px', top: 96 - 62 + 'px', width: '60px', height: '66px' } });
    pinW.innerHTML = `<svg width="60" height="66" viewBox="0 0 60 66"><path d="M30 64 C30 64 6 40 6 26 A24 24 0 0 1 54 26 C54 40 30 64 30 64 Z" fill="${CORAL}"/><circle cx="30" cy="26" r="9" fill="#fff"/></svg>`;
    const pl = h('div', { class: 'abs maplbl', style: { left: '300px', top: '28px' } }); pl.textContent = 'Logement · Appt 3B';
    const van = h('div', { class: 'abs', style: { left: '-27px', top: '-27px', width: '54px', height: '54px', borderRadius: '50%', background: BLUE, display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px -8px rgba(47,75,255,.8), 0 0 0 5px #fff' } });
    van.innerHTML = icon('truck', 28, CREAM, 2.1);
    const arr = s('svg', { width: 620, height: 450, viewBox: '0 0 620 450' });
    Object.assign(arr.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
    const ripA = s('circle', { cx: 462, cy: 96, r: 20, fill: 'none', stroke: CORAL, 'stroke-width': 4 });
    arr.append(ripA);
    card.append(arr, depot, dl, pinW, pl, van);

    gsap.set(card, { autoAlpha: 0 });
    tl.fromTo(card, { y: 90, rotation: -5, autoAlpha: 0 }, { y: 0, rotation: -1.5, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.12);
    pop(depot, S + 0.02, { scale: 0.3 }, { dur: 0.45, ease: 'back.out(2.5)' });
    pop(dl, S + 0.1, { x: -20 }, { dur: 0.4, ease: 'expo.out' });
    pop(pinW, S + 0.18, { y: -60, scale: 0.6 }, { dur: 0.6, ease: 'bounce.out' });
    pop(pl, S + 0.3, { y: -14 }, { dur: 0.4, ease: 'expo.out' });
    gsap.set([route, casing], { drawSVG: '0%' });
    const dur = C.route1 - C.route0, E = gsap.parseEase('power2.inOut');
    tl.fromTo([route, casing], { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'power2.inOut' }, C.route0);
    const L = route.getTotalLength();
    gsap.set(van, { autoAlpha: 0 });
    tl.fromTo(van, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, C.route0);
    proc.push((t) => {
      const p = E(clamp((t - C.route0) / dur));
      const pt = route.getPointAtLength(L * p);
      van.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
    });
    gsap.set(ripA, { autoAlpha: 0 });
    tl.fromTo(ripA, { attr: { r: 20, 'stroke-width': 6 }, autoAlpha: 1 }, { attr: { r: 90, 'stroke-width': 1 }, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, C.route1);
    tl.fromTo(pinW, { scale: 1 }, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '50% 100%' }, C.route1);

    const chips = [
      { txt: 'Technicien polyvalent', ic: 'wrench', bg: INK, fg: CREAM, ic2: YELLOW },
      { txt: 'Pièces courantes à bord', ic: 'check', bg: YELLOW, fg: INK, ic2: INK },
    ];
    chips.forEach((c, i) => {
      const e = h('div', { class: 'abs chip', style: { left: 40 + i * 290 + 'px', top: '532px', background: c.bg, color: c.fg } });
      e.innerHTML = `${icon(c.ic, 22, c.ic2, 2.4)}<span>${c.txt}</span>`;
      ill.append(e);
      pop(e, C.chips3[i], { y: 24, scale: 0.8 });
    });
  }

  function ill4(ill, S) {
    const card = h('div', { class: 'abs panel', style: { left: '60px', top: '50px', width: '580px', height: '500px' } });
    ill.append(card);
    const head = h('div', { class: 'abs t-h', style: { left: '42px', top: '42px' } }); head.textContent = 'Compte rendu';
    const sub = h('div', { class: 'abs t-s', style: { left: '42px', top: '84px' } }); sub.textContent = 'Fuite sous évier · Appt 3B';
    const pillA = h('div', { class: 'abs pill', style: { right: '36px', top: '40px', background: YELLOW, color: INK } }); pillA.textContent = 'En cours';
    const pillB = h('div', { class: 'abs pill', style: { right: '36px', top: '40px', background: BLUE, color: CREAM } });
    pillB.innerHTML = `${icon('check', 18, CREAM, 3)}<span>Résolu</span>`;
    const hr = h('div', { class: 'abs', style: { left: '42px', right: '42px', top: '126px', height: '1.5px', background: 'rgba(11,13,18,.08)' } });
    card.append(head, sub, pillA, pillB, hr);
    const rows = ['Intervention réalisée', 'Fournitures renseignées', 'Photos avant / après'];
    const rEls = [];
    rows.forEach((txt, i) => {
      const r = h('div', { class: 'abs', style: { left: '42px', top: 158 + i * 76 + 'px', height: '44px', display: 'flex', alignItems: 'center', gap: '20px' } });
      const box = h('div', { style: { width: '44px', height: '44px', borderRadius: '13px', border: '2.5px solid rgba(11,13,18,.18)', display: 'grid', placeItems: 'center', flex: 'none' } });
      box.innerHTML = icon('check', 28, CREAM, 3.4);
      const tx = h('div', { class: 't-row' }); tx.textContent = txt;
      r.append(box, tx); card.append(r); rEls.push(r);
      gsap.set(r, { autoAlpha: 0 });
      tl.fromTo(r, { x: 50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' }, S + 0.04 + i * 0.08);
      const ck = box.querySelector('path');
      gsap.set(ck, { drawSVG: '0%' });
      tl.to(box, { backgroundColor: BLUE, borderColor: BLUE, duration: 0.12, ease: 'none' }, C.checks[i]);
      tl.fromTo(box, { scale: 0.8 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, C.checks[i]);
      tl.fromTo(ck, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.22, ease: 'power2.out' }, C.checks[i] + 0.04);
    });
    const hr2 = h('div', { class: 'abs', style: { left: '42px', right: '42px', top: '392px', height: '1.5px', background: 'rgba(11,13,18,.08)' } });
    const fold = h('div', { class: 'abs', style: { left: '42px', top: '420px', display: 'flex', alignItems: 'center', gap: '14px', font: '600 20px/1 Inter', color: 'rgba(11,13,18,.7)' } });
    fold.innerHTML = `${icon('folder', 26, BLUE, 2.2)}<span>Classé au dossier du logement</span>`;
    card.append(hr2, fold);
    pop(fold, C.folder, { x: -20 }, { dur: 0.45, ease: 'expo.out' });
    gsap.set(card, { autoAlpha: 0 });
    tl.fromTo(card, { y: 90, rotation: 5, autoAlpha: 0 }, { y: 0, rotation: 1.2, autoAlpha: 1, duration: 0.65, ease: 'expo.out' }, S - 0.12);
    gsap.set(pillB, { scaleY: 0, autoAlpha: 1 });
    tl.fromTo(pillA, { scaleY: 1 }, { scaleY: 0, duration: 0.1, ease: 'power2.in' }, C.resolved - 0.1);
    tl.fromTo(pillB, { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: 'back.out(2.5)' }, C.resolved);
  }

  function buildSC4() {
    const sc = $('#sc4');
    sc.append(h('div', { class: 'layer', style: { background: CREAM } }));
    const grid = h('div', { class: 'layer grid' });
    sc.append(grid);
    const track = h('div', { class: 'abs', style: { left: '0px', top: '0px', width: 1920 * 4 + 'px', height: '1080px' } });
    sc.append(track);
    tl.set(sc, { autoAlpha: 1 }, C.sc4 - 0.001);
    tl.set('#sc3', { autoAlpha: 0 }, C.sc4);
    tl.set('#stage', { backgroundColor: CREAM }, C.sc4);

    const STEPS = [
      { t: 'Signaler', d: 'Un QR code, quelques photos.', ill: ill1 },
      { t: 'Qualifier', d: 'Nature, urgence, validation.', ill: ill2 },
      { t: 'Intervenir', d: 'Le bon technicien, bien équipé.', ill: ill3 },
      { t: 'Suivre', d: 'Un compte rendu clair.', ill: ill4 },
    ];
    const maxW = Math.max(...STEPS.map((st) => textWidth(st.t, briCSS(100)))) * 1.02;
    const F = Math.min(176, Math.floor(100 * 860 / maxW));
    const titles = [], ills = [];
    STEPS.forEach((st, i) => {
      const S = C.st[i];
      const sec = h('div', { class: 'abs', style: { left: i * 1920 + 'px', top: '0px', width: '1920px', height: '1080px' } });
      track.append(sec);
      const num = h('div', { class: 'abs st-num', style: { left: '166px', top: '312px' } });
      num.innerHTML = `<i></i>ÉTAPE 0${i + 1} / 04`;
      const title = h('div', { class: 'abs mask brico st-title', style: { left: '150px', top: '344px', fontSize: F + 'px', lineHeight: Math.round(F * 1.2) + 'px', height: Math.round(F * 1.2) + 'px' } });
      title.textContent = st.t;
      const desc = h('div', { class: 'abs mask st-desc', style: { left: '162px', top: 344 + Math.round(F * 1.2) + 12 + 'px' } });
      desc.textContent = st.d;
      const ill = h('div', { class: 'abs ill', style: { left: '1060px', top: '170px' } });
      sec.append(num, title, desc, ill);
      titles.push(title); ills.push(ill);
      const tc = splitChars(title);
      gsap.set(tc, { yPercent: 112 });
      chars(tc, S - 0.04, null, { dur: 0.6, stagger: 0.028, w0: 300 });
      const dw = splitWords(desc);
      gsap.set(dw, { yPercent: 110 });
      tl.fromTo(dw, { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: 'expo.out', stagger: 0.035 }, S + 0.14);
      gsap.set(num, { autoAlpha: 0 });
      tl.fromTo(num, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'expo.out' }, S - 0.06);
      st.ill(ill, S);
    });

    // Travellings latéraux entre les étapes (+ traînée de parallaxe).
    C.pans.forEach((m, k) => tl.fromTo(track, { x: -1920 * k }, { x: -1920 * (k + 1), duration: C.panDur, ease: 'expo.inOut' }, m - C.panDur / 2));
    proc.push((t) => {
      const x = gsap.getProperty(track, 'x');
      grid.style.backgroundPosition = `${(x * 0.35).toFixed(1)}px 0px`;
      let bump = 0;
      for (const m of C.pans) {
        const u = (t - (m - C.panDur / 2)) / C.panDur;
        if (u > 0 && u < 1) bump += Math.pow(Math.sin(Math.PI * u), 2);
      }
      const ib = (bump * 110).toFixed(1), tb = (-bump * 36).toFixed(1);
      for (const e of ills) e.style.transform = `translateX(${ib}px)`;
      for (const e of titles) e.style.transform = `translateX(${tb}px)`;
    });

    // Barre de progression.
    const prog = h('div', { class: 'abs', style: { left: '160px', top: '924px', width: '1600px', height: '60px' } });
    sc.append(prog);
    const base = h('div', { class: 'abs', style: { left: '0px', top: '7px', width: '1600px', height: '2px', background: 'rgba(11,13,18,.13)' } });
    const fill = h('div', { class: 'abs', style: { left: '0px', top: '6px', width: '1600px', height: '4px', borderRadius: '2px', background: BLUE, transformOrigin: '0% 50%' } });
    prog.append(base, fill);
    gsap.set(fill, { scaleX: 0 });
    const labels = ['01 Signaler', '02 Qualifier', '03 Intervenir', '04 Suivre'];
    const dots = labels.map((l, i) => {
      const x = (1600 / 3) * i;
      const d = h('div', { class: 'abs', style: { left: x - 9 + 'px', top: '-1px', width: '18px', height: '18px', borderRadius: '50%', background: CREAM, border: '2.5px solid rgba(11,13,18,.25)' } });
      const lb = h('div', { class: 'abs prog-l', style: { left: x + 'px', top: '30px' } }); lb.textContent = l;
      prog.append(d, lb);
      const lw = lb.getBoundingClientRect().width;
      lb.style.left = (i === 0 ? x - 9 : i === 3 ? x + 9 - lw : x - lw / 2) + 'px';
      return { d, lb };
    });
    gsap.set(prog, { autoAlpha: 0, y: 20 });
    tl.fromTo(prog, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' }, C.sc4 + 0.1);
    C.st.forEach((S, i) => {
      const tt = i === 0 ? S + 0.15 : C.pans[i - 1] - C.panDur / 2;
      if (i > 0) tl.fromTo(fill, { scaleX: (i - 1) / 3 }, { scaleX: i / 3, duration: C.panDur, ease: 'expo.inOut' }, tt);
      const at = i === 0 ? S + 0.15 : C.pans[i - 1];
      tl.to(dots[i].d, { backgroundColor: BLUE, borderColor: BLUE, duration: 0.1, ease: 'none' }, at);
      tl.fromTo(dots[i].d, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, at);
      tl.to(dots[i].lb, { color: INK, duration: 0.15, ease: 'none' }, at);
    });
  }

  // ---------------------------------------------------------------- 06 — Roger (construit avant 05 : 05 vise son anneau)
  function buildSC6() {
    const sc = $('#sc6');
    const g6 = h('div', { class: 'layer' });
    const WM = wordmark(250);
    g6.append(WM.wrap);
    sc.append(g6);
    placeWordmark(WM, 960, 452);
    const wipe = h('div', { class: 'abs', style: { left: WM.rcx - 2300 + 'px', top: WM.rcy - 2300 + 'px', width: '4600px', height: '4600px', borderRadius: '50%', background: BLUE } });
    sc.insertBefore(wipe, g6);
    gsap.set(wipe, { scale: 0 });
    tl.set(sc, { autoAlpha: 1 }, C.sc6 - 0.001);
    tl.fromTo(wipe, { scale: 0.02 }, { scale: 1, duration: 0.7, ease: 'expo.out' }, C.sc6);
    tl.set('#sc5', { autoAlpha: 0 }, C.sc6 + 0.5);
    tl.set('#stage', { backgroundColor: BLUE }, C.sc6 + 0.5);

    // Les lettres naissent de l'anneau.
    WM.letters.forEach((el) => {
      const r = el.getBoundingClientRect();
      const dx = WM.rcx - (r.left + r.width / 2);
      const dist = Math.abs(dx);
      gsap.set(el, { autoAlpha: 0 });
      tl.fromTo(el, { x: dx * 0.75, scale: 0.55, autoAlpha: 0, '--w': 300 },
        { x: 0, scale: 1, autoAlpha: 1, '--w': 800, duration: 0.75, ease: 'expo.out' }, C.sc6 + 0.02 + dist / 4000);
    });
    gsap.set(WM.svg, { autoAlpha: 0 });
    tl.set(WM.svg, { autoAlpha: 1 }, C.sc6);

    const base = h('div', { class: 'abs mask brico base' });
    base.textContent = 'Dépannage & maintenance des logements';
    g6.append(base);
    const words = splitWords(base);
    const bw = base.getBoundingClientRect().width;
    Object.assign(base.style, { left: 960 - bw / 2 + 'px', top: '628px' });
    gsap.set(words, { yPercent: 110 });
    tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 }, C.base2);

    const monoTxt = 'POUR LES GESTIONNAIRES LOCATIFS · PARIS & ÎLE-DE-FRANCE';
    const mono = h('div', { class: 'abs mono' });
    mono.textContent = monoTxt;
    g6.append(mono);
    const mw = mono.getBoundingClientRect().width;
    Object.assign(mono.style, { left: 960 - mw / 2 + 'px', top: '724px' });
    mono.textContent = '';
    scramble(mono, monoTxt, C.mono2, 0.7, 91);

    // Double « bip » du point : un clin d'œil au « Roger beep » des radios.
    [0, C.beepGap].forEach((dt, i) => {
      const rp = s('circle', { cx: WM.D / 2, cy: WM.D / 2, r: WM.DR, fill: 'none', stroke: YELLOW, 'stroke-width': 5 });
      WM.svg.insertBefore(rp, WM.dot);
      gsap.set(rp, { autoAlpha: 0 });
      tl.fromTo(rp, { attr: { r: WM.DR, 'stroke-width': 7 }, autoAlpha: 1 }, { attr: { r: WM.DR * (4.6 - i), 'stroke-width': 1 }, autoAlpha: 0, duration: 0.9, ease: 'power2.out' }, C.beep + dt);
      tl.fromTo(WM.dot, { scale: 1.45 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', transformOrigin: '50% 50%' }, C.beep + dt);
    });
    tl.fromTo(g6, { scale: 1 }, { scale: 1.035, duration: C.DUR - C.sc6, ease: 'power1.out', transformOrigin: `${WM.rcx}px ${WM.rcy}px` }, C.sc6);
    return WM;
  }

  // ---------------------------------------------------------------- 05 — La promesse
  function buildSC5(WM6) {
    const sc = $('#sc5');
    const slab = h('div', { class: 'abs', style: { left: '-200px', top: '0px', width: '2320px', height: '1400px', background: INK } });
    sc.append(slab);
    gsap.set(slab, { y: 1300, skewY: -6 });
    tl.set(sc, { autoAlpha: 1 }, C.slab - 0.001);
    tl.fromTo(slab, { y: 1300, skewY: -6 }, { y: -160, skewY: 0, duration: 0.42, ease: 'expo.inOut' }, C.slab);
    tl.set('#sc4', { autoAlpha: 0 }, C.sc5 + 0.12);
    tl.set('#stage', { backgroundColor: INK }, C.sc5 + 0.12);

    const l1 = h('div', { class: 'abs mask brico s5line', style: { top: '268px' } }); l1.textContent = 'Moins d’appels.';
    const l2 = h('div', { class: 'abs mask brico s5line', style: { top: '486px' } }); l2.textContent = 'Plus de suivi.';
    sc.append(l1, l2);
    const c1 = splitChars(l1), c2 = splitChars(l2);
    c2.slice(8).forEach((e) => { e.style.color = YELLOW; });
    gsap.set([...c1, ...c2], { yPercent: 112 });
    chars(c1, C.sc5, null, { dur: 0.55, stagger: 0.022, w0: 300 });
    chars(c2, C.line2, null, { dur: 0.55, stagger: 0.022, w0: 300 });

    // Téléphone : le compteur redescend à zéro.
    const phone = h('div', { class: 'abs', style: { left: 1650 - 78 + 'px', top: 371 - 78 + 'px', width: '156px', height: '156px' } });
    phone.innerHTML = icon('phone', 156, CREAM, 1.5);
    const cnt = h('div', { class: 'abs cnt5', style: { left: 1650 + 26 + 'px', top: 371 - 116 + 'px' } }); cnt.textContent = '12';
    sc.append(phone, cnt);
    pop(phone, C.sc5 + 0.08, { scale: 0.4, rotation: -30 }, { dur: 0.6, ease: 'back.out(2)' });
    pop(cnt, C.sc5 + 0.2, { scale: 0 }, { dur: 0.45, ease: 'back.out(3)' });
    let lastN = '';
    proc.push((t) => {
      const n = String(12 - Math.round(clamp((t - C.count0) / (C.count1 - C.count0)) * 12));
      if (n !== lastN) { cnt.textContent = n; lastN = n; }
    });
    tl.fromTo(cnt, { scale: 1 }, { scale: 0, duration: 0.25, ease: 'back.in(2)' }, C.count1 + 0.05);
    tl.to(phone, { opacity: 0.35, duration: 0.3, ease: 'none' }, C.count1 + 0.05);

    // Anneau de progression → devient le « O » du logo.
    const SWu = 100 * RING.sw / RING.d, DRu = 100 * RING.dot / RING.d, Ru = (100 - SWu) / 2;
    const ring = s('svg', { width: 170, height: 170, viewBox: '0 0 100 100' });
    Object.assign(ring.style, { position: 'absolute', left: 1650 - 85 + 'px', top: 589 - 85 + 'px', overflow: 'visible' });
    const trk = s('circle', { cx: 50, cy: 50, r: Ru, fill: 'none', stroke: 'rgba(242,238,230,.14)', 'stroke-width': SWu });
    const prg = s('circle', { cx: 50, cy: 50, r: Ru, fill: 'none', stroke: YELLOW, 'stroke-width': SWu, 'stroke-linecap': 'round', transform: 'rotate(-90 50 50)' });
    const dot = s('circle', { cx: 50, cy: 50, r: DRu, fill: YELLOW });
    ring.append(trk, prg, dot);
    sc.append(ring);
    pop(ring, C.line2 + 0.02, { scale: 0.3 }, { dur: 0.5, ease: 'back.out(2)' });
    gsap.set(prg, { drawSVG: '0%' });
    tl.fromTo(prg, { drawSVG: '0%' }, { drawSVG: '100%', duration: C.ringFull - C.ring0, ease: 'power2.inOut' }, C.ring0);
    gsap.set(dot, { scale: 0, transformOrigin: '50% 50%' });
    tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .4)' }, C.ringFull);
    tl.to(prg, { attr: { 'stroke-linecap': 'butt' }, duration: 0.01 }, C.ringFull);

    // Vol vers le logo final.
    const fly = C.sc6 - C.ringFly;
    tl.to([l1, l2], { y: -40, autoAlpha: 0, duration: 0.2, ease: 'power2.in', stagger: 0.04 }, C.ringFly - 0.04);
    tl.to(phone, { y: -40, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, C.ringFly - 0.04);
    tl.fromTo(ring, { x: 0, y: 0, scale: 1 }, { x: WM6.rcx - 1650, y: WM6.rcy - 589, scale: WM6.D / 170, duration: fly, ease: 'expo.inOut' }, C.ringFly);
    tl.to(prg, { stroke: CREAM, duration: fly * 0.8, ease: 'none' }, C.ringFly);
    tl.to(trk, { autoAlpha: 0, duration: 0.15, ease: 'none' }, C.ringFly);
    tl.set(ring, { autoAlpha: 0 }, C.sc6 + 0.001);
  }

  // ---------------------------------------------------------------- montage
  function build() {
    buildHUD();
    buildSC1();
    buildSC2();
    buildSC3();
    buildSC4();
    const WM6 = buildSC6();
    buildSC5(WM6);
    tl.set({}, {}, C.DUR);
  }

  window.seek = function (t) {
    tl.time(t, true);
    for (const f of proc) f(t);
  };
  window.__timeline = tl;

  Promise.all([
    document.fonts.load("800 100px Brico"),
    document.fonts.load('500 20px Inter'),
    document.fonts.load('700 20px Inter'),
    document.fonts.load('500 20px JBM'),
  ]).then(() => document.fonts.ready).then(() => {
    build();
    window.seek(0);
    window.__ready = true;
    if (new URLSearchParams(location.search).has('play')) preview();
  });

  // Aperçu temps réel dans un navigateur (index.html?play) : clic pour lancer, calé sur l'audio.
  function preview() {
    const stage = $('#stage');
    const fit = () => {
      const k = Math.min(innerWidth / 1920, innerHeight / 1080);
      Object.assign(stage.style, { transformOrigin: '0 0', transform: `translate(${(innerWidth - 1920 * k) / 2}px, ${(innerHeight - 1080 * k) / 2}px) scale(${k})` });
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
