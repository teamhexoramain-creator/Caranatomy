// Renders the animation frame-by-frame in headless Chromium and encodes the MP4.
//   node scripts/render.mjs [--ep ep01] [--fps 30] [--pr 1] [--out build/<ep>/frames] [--from 0] [--to N] [--workers 1] [--encode out.mp4] [--audio wav]
// Frames that already exist are skipped, so an interrupted render can be resumed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startServer } from './server.mjs';
import { launch } from './browser.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const pr = Number(args.pr || 1);
const ep = args.ep || 'ep01';
const outDir = args.out || `build/${ep}/frames`;
const workers = Number(args.workers || 1);
const fmt = args.format || 'jpg';
fs.mkdirSync(outDir, { recursive: true });

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}/index.html?pr=${pr}&ep=${ep}`;
const browser = await launch();

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: pr });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const first = await openPage();
const meta = await first.evaluate(() => window.__meta);
const fps = Number(args.fps || meta.fps);
const total = Math.round(meta.duration * fps);
const from = Number(args.from || 0), to = Math.min(Number(args.to || total), total);
const todo = [];
for (let i = from; i < to; i++) if (!fs.existsSync(path.join(outDir, `f_${String(i).padStart(5, '0')}.${fmt}`))) todo.push(i);
console.log(`${todo.length} of ${to - from} frames to render @ ${fps} fps, pr=${pr}, workers=${workers}`);

const pages = [first];
for (let w = 1; w < workers; w++) pages.push(await openPage());
const t0 = Date.now();
let done = 0;
await Promise.all(pages.map(async (page, w) => {
  for (let k = w; k < todo.length; k += workers) {
    const i = todo[k];
    await page.evaluate((t) => window.__renderFrame(t), i / fps);
    const file = path.join(outDir, `f_${String(i).padStart(5, '0')}.${fmt}`);
    await page.screenshot({ path: file + '.tmp', type: fmt === 'png' ? 'png' : 'jpeg', ...(fmt === 'png' ? {} : { quality: 95 }) });
    fs.renameSync(file + '.tmp', file);
    done++;
    if (done % 10 === 0 || done === todo.length) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${todo.length}  ${(el / done).toFixed(2)} s/frame  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
    }
  }
}));
await browser.close();
server.close();

if (args.encode) {
  const audio = args.audio || `build/${ep}/soundtrack.wav`;
  const ff = ['-y', '-framerate', String(fps), '-i', path.join(outDir, `f_%05d.${fmt}`)];
  if (fs.existsSync(audio)) ff.push('-i', audio);
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-r', String(fps), '-movflags', '+faststart');
  if (fs.existsSync(audio)) ff.push('-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest');
  ff.push(args.encode);
  console.log('ffmpeg', ff.join(' '));
  execFileSync('ffmpeg', ff, { stdio: 'inherit' });
}
