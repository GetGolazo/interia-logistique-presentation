// Rendu image par image de index.html (window.seek(t)) avec Chromium headless.
//   node render.mjs stills 0.5 1.2 3.3          → out/stills/t_0.500.png …
//   node render.mjs video --samples 6 --workers 4 --out out/roger.mp4 [--audio out/audio.wav]
//   --format 9x16 : version verticale 1080×1920 (même animation, mise en page recomposée)
// Flou de bouger : chaque image = moyenne de N sous-images réparties sur un obturateur à 180°.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import C from './cues.js';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const VERT = opt('format', '16x9') === '9x16';
const W = VERT ? 1080 : 1920, H = VERT ? 1920 : 1080, FPS = C.FPS, DUR = C.DUR;

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
  await page.goto(`http://127.0.0.1:${port}/index.html${VERT ? '?format=9x16' : ''}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}

// Capture vérifiée : PNG complet (signature, bloc IEND) et en RVB 8 bits.
// Sous charge, Chromium rend parfois une capture en RVBA : ce changement de format réinitialise
// le filtre de flou de bouger d'ffmpeg, qui perd alors des images sans message d'erreur.
const pngOk = (buf) => buf.length > 64 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString('latin1', buf.length - 8, buf.length - 4) === 'IEND';
const pngRGB = (buf) => buf[24] === 8 && buf[25] === 2;
async function shot(pg, t) {
  await pg.page.evaluate((t) => window.seek(t), t);
  let last = null;
  for (let k = 0; k < 4; k++) {
    const { data } = await pg.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    const buf = Buffer.from(data, 'base64');
    if (!pngOk(buf)) { console.error(`capture invalide à t=${t.toFixed(4)}, nouvel essai`); continue; }
    if (pngRGB(buf)) return buf;
    last = buf;
  }
  if (last) return last; // converti en RVB avant l'assemblage (voir renderChunk)
  throw new Error(`capture impossible à t=${t}`);
}
// Nombre d'images réellement écrites dans un morceau.
function countFrames(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file, '-map', '0:v', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr || '').matchAll(/frame=\s*(\d+)/g)];
  return m.length ? Number(m[m.length - 1][1]) : 0;
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
  // Les sous-images sont écrites en fichiers séparés : plus robuste qu'un flux PNG continu,
  // que le découpeur d'ffmpeg peut mal séparer (images perdues sans message d'erreur).
  const dir = file.replace(/\.mkv$/, '_png');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  let k = 0;
  for (let f = f0; f < f1; f++) {
    for (let s = 0; s < samples; s++) {
      const off = samples > 1 ? ((s + 0.5) / samples - 0.5) * shutter : 0;
      const t = Math.min(DUR - 1e-4, Math.max(0, (f + off) / FPS));
      fs.writeFileSync(path.join(dir, String(k++).padStart(6, '0') + '.png'), await shot(pg, t));
    }
    if ((f - f0) % 60 === 59) console.log(`[w${id}] ${f + 1 - f0}/${f1 - f0} images (${((Date.now() - t0) / (f + 1 - f0)).toFixed(0)} ms/img)`);
  }
  await browser.close();
  // les rares captures restées en RVBA sont converties en RVB, pour un format constant
  for (const name of fs.readdirSync(dir)) {
    const f = path.join(dir, name);
    const head = Buffer.alloc(26);
    const fd = fs.openSync(f, 'r'); fs.readSync(fd, head, 0, 26, 0); fs.closeSync(fd);
    if (!pngRGB(head)) { await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', f, '-pix_fmt', 'rgb24', f + '.tmp.png']); fs.renameSync(f + '.tmp.png', f); }
  }
  const vf = samples > 1 ? ['-vf', `tmix=frames=${samples},select='eq(mod(n\\,${samples})\\,${samples - 1})',setpts=N/${FPS}/TB`] : [];
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS * samples), '-i', path.join(dir, '%06d.png'), ...vf, '-r', String(FPS), '-c:v', 'ffv1', '-pix_fmt', 'bgr0', file]);
  fs.rmSync(dir, { recursive: true, force: true });
  const n = countFrames(file);
  if (n !== f1 - f0) throw new Error(`morceau ${id} incomplet : ${n}/${f1 - f0} images`);
}
// Un morceau incomplet est refait (une fois).
async function renderChunkChecked(...a) {
  try { await renderChunk(...a); } catch (e) { console.error(String(e.message || e), '— nouvel essai'); await renderChunk(...a); }
}

const srv = await startServer();
const port = srv.address().port;
try {
  if (mode === 'stills') {
    const dir = path.join(ROOT, 'out', VERT ? 'stills_9x16' : 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const browser = await chromium.launch();
    const pg = await openPage(browser, port);
    const times = argv.slice(1).filter((a, i, arr) => !a.startsWith('--') && !(arr[i - 1] || '').startsWith('--')).map(Number).sort((a, b) => a - b);
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
    const out = path.resolve(ROOT, opt('out', VERT ? 'out/roger_plan_9x16.mp4' : 'out/roger_plan.mp4'));
    const audio = opt('audio', null);
    const tmp = path.resolve(ROOT, opt('tmp', path.join('out', VERT ? 'chunks_9x16' : 'chunks')));
    fs.mkdirSync(tmp, { recursive: true });
    const n = to - from, per = Math.ceil(n / workers);
    const chunks = [];
    for (let i = 0; i < workers; i++) {
      const a = from + i * per, z = Math.min(to, a + per);
      if (a < z) chunks.push({ a, z, file: path.join(tmp, `c${i}.mkv`), id: i });
    }
    const t0 = Date.now();
    await Promise.all(chunks.map((c) => renderChunkChecked(port, c.a, c.z, samples, shutter, c.file, c.id)));
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
