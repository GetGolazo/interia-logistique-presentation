// Rendu image par image de index.html (window.seek(t)) avec Chromium headless.
//   node render.mjs stills 0.5 1.2 3.3          → out/stills/t_0.500.png …
//   node render.mjs video --samples 6 --workers 4 --out out/roger.mp4 [--audio out/audio.wav]
// Flou de bouger : chaque image = moyenne de N sous-images réparties sur un obturateur à 180°.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const W = 1920, H = 1080, FPS = 60, DUR = 15;
const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}

async function shot(pg, t) {
  await pg.page.evaluate((t) => window.seek(t), t);
  const { data } = await pg.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  return Buffer.from(data, 'base64');
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} exited ${c}`))));
  });
}

async function renderChunk(port, f0, f1, samples, shutter, file, id) {
  const browser = await chromium.launch();
  const pg = await openPage(browser, port);
  // Préchauffage : on rejoue la timeline dans l'ordre jusqu'au début du segment.
  for (let f = 0; f < f0; f++) await pg.page.evaluate((t) => window.seek(t), f / FPS);
  const vf = samples > 1 ? ['-vf', `tmix=frames=${samples},select='eq(mod(n\\,${samples})\\,${samples - 1})',setpts=N/${FPS}/TB`] : [];
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS * samples), '-i', '-',
    ...vf, '-r', String(FPS), '-c:v', 'ffv1', '-pix_fmt', 'bgr0', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    for (let k = 0; k < samples; k++) {
      const off = samples > 1 ? ((k + 0.5) / samples - 0.5) * shutter : 0;
      const t = Math.min(DUR - 1e-4, Math.max(0, (f + off) / FPS));
      const png = await shot(pg, t);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    if ((f - f0) % 60 === 59) console.log(`[w${id}] ${f + 1 - f0}/${f1 - f0} images (${((Date.now() - t0) / (f + 1 - f0)).toFixed(0)} ms/img)`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
}

const srv = await startServer();
const port = srv.address().port;
try {
  if (mode === 'stills') {
    const dir = path.join(ROOT, 'out', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const browser = await chromium.launch();
    const pg = await openPage(browser, port);
    const times = argv.slice(1).filter((a) => !a.startsWith('--')).map(Number).sort((a, b) => a - b);
    let f = 0;
    for (const t of times) {
      // rejoue la timeline image par image jusqu'à t (état identique au rendu vidéo)
      for (; f / FPS < t; f++) await pg.page.evaluate((x) => window.seek(x), f / FPS);
      const png = await shot(pg, t);
      const file = path.join(dir, `t_${t.toFixed(3)}.png`);
      fs.writeFileSync(file, png);
      console.log(file);
    }
    await browser.close();
  } else if (mode === 'video') {
    const samples = Number(opt('samples', '1'));
    const shutter = Number(opt('shutter', '0.5'));
    const workers = Number(opt('workers', '4'));
    const from = Number(opt('from', '0')), to = Number(opt('to', String(FPS * DUR)));
    const out = path.resolve(ROOT, opt('out', 'out/roger.mp4'));
    const audio = opt('audio', null);
    const tmp = path.join(ROOT, 'out', 'chunks');
    fs.mkdirSync(tmp, { recursive: true });
    const n = to - from, per = Math.ceil(n / workers);
    const chunks = [];
    for (let i = 0; i < workers; i++) {
      const a = from + i * per, z = Math.min(to, a + per);
      if (a < z) chunks.push({ a, z, file: path.join(tmp, `c${i}.mkv`), id: i });
    }
    const t0 = Date.now();
    await Promise.all(chunks.map((c) => renderChunk(port, c.a, c.z, samples, shutter, c.file, c.id)));
    console.log(`rendu : ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, chunks.map((c) => `file '${c.file}'`).join('\n'));
    const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
    if (audio) args.push('-i', path.resolve(ROOT, audio));
    args.push('-map', '0:v');
    if (audio) args.push('-map', '1:a', '-c:a', 'aac', '-b:a', '256k');
    args.push('-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '14'), '-tune', 'animation',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-r', String(FPS), '-movflags', '+faststart', out);
    await run(FFMPEG, args);
    console.log(out);
  } else {
    console.log('usage: node render.mjs stills <t…> | video [--samples N] [--workers W] [--out f] [--audio f]');
  }
} finally {
  srv.close();
}
