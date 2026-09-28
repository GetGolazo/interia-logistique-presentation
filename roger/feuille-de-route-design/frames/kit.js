// Petite boîte à outils commune aux images-clés (style frames) des trois pistes.
// Chaque page lit ?f=<nom> pour choisir l'image, construit la scène, puis pose window.__ready = true.
(function (g) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const params = new URLSearchParams(location.search);

  function el(tag, attrs, parent) {
    const svgTags = /^(svg|g|path|line|rect|circle|ellipse|polygon|polyline|text|tspan|defs|pattern|clipPath|mask|linearGradient|radialGradient|stop|filter|feTurbulence|feColorMatrix|feGaussianBlur|feOffset|feBlend|feComposite|feDisplacementMap|feMerge|feMergeNode|feFlood|use|symbol|marker)$/;
    const n = svgTags.test(tag) ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  // Motif de hachures (coupes, sols, murs).
  function hatch(defs, id, { angle = 45, gap = 8, color = '#000', width = 1, bg = null } = {}) {
    const p = el('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap, patternTransform: `rotate(${angle})` }, defs);
    if (bg) el('rect', { width: gap, height: gap, fill: bg }, p);
    el('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: color, 'stroke-width': width }, p);
    return `url(#${id})`;
  }

  // Nuage de révision autour d'une ellipse (convention des plans : zone modifiée / à reprendre).
  function cloudPath(cx, cy, rx, ry, n = 14, bulge = 0.55) {
    let d = '';
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    d += `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const r = Math.hypot(x1 - x0, y1 - y0) * bulge;
      d += ` A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    return d;
  }

  function ready() {
    const done = () => requestAnimationFrame(() => requestAnimationFrame(() => { g.__ready = true; }));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(done); else done();
  }

  g.KIT = { el, hatch, cloudPath, ready, frame: params.get('f') || '' };
})(window);
