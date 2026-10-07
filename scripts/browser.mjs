// Shared headless-Chromium launcher (software WebGL2 via SwiftShader).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

export async function launch() {
  return pw.chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
           '--disable-gpu-sandbox', '--force-color-profile=srgb'],
  });
}
