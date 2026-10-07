// Render single frames for previewing: node scripts/still.mjs out.png t=12.5 [view=side] [w=1080 h=1920]
import { startServer } from './server.mjs';
import { launch } from './browser.mjs';

const out = process.argv[2] || 'still.png';
const params = new URLSearchParams(process.argv.slice(3).join('&'));
const w = Number(params.get('w') || 1080), h = Number(params.get('h') || 1920);
const server = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?${params}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const ts = (params.get('t') || '0').split(',').map(Number);
for (let i = 0; i < ts.length; i++) {
  const t0 = Date.now();
  await page.evaluate((t) => window.__renderFrame(t), ts[i]);
  const file = ts.length > 1 ? out.replace(/(\.\w+)$/, `_${i}$1`) : out;
  await page.screenshot({ path: file });
  console.log(`t=${ts[i]} -> ${file} (${Date.now() - t0} ms)`);
}
await browser.close();
server.close();
