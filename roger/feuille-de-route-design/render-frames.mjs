// Rend les images-clés (style frames) des trois pistes avec Chromium headless.
//   node render-frames.mjs            → toutes les images dans images/
//   node render-frames.mjs p1-comprendre p2-preparer   → seulement celles-ci
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FRAMES_DIR = path.join(ROOT, 'frames');
const OUT = path.join(ROOT, 'images');

// nom → [page, image, largeur, hauteur]
const FRAMES = {
  'p1-comprendre': ['plan.html', 'comprendre', 1920, 1080],
  'p1-promesse': ['plan.html', 'promesse', 1920, 1080],
  'p1-preparer-9x16': ['plan.html', 'preparer', 1080, 1920],
  'p2-preparer': ['etabli.html', 'preparer', 1920, 1080],
  'p2-allers-9x16': ['etabli.html', 'allers', 1080, 1920],
  'p3-allers': ['maquette.html', 'allers', 1920, 1080],
  'p3-panne-9x16': ['maquette.html', 'panne', 1080, 1920],
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const f = path.join(FRAMES_DIR, p);
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(FRAMES);
fs.mkdirSync(OUT, { recursive: true });
const srv = await startServer();
const port = srv.address().port;
const browser = await chromium.launch();
try {
  for (const name of names) {
    const [file, f, w, h] = FRAMES[name];
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error(`[${name}] pageerror`, e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[${name}] console`, m.text()); });
    await page.goto(`http://127.0.0.1:${port}/${file}?f=${f}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 88 });
    console.log(`images/${name}.png`);
    await page.close();
  }
} finally {
  await browser.close();
  srv.close();
}
