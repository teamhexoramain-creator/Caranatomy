import * as THREE from 'three';

export function canvasTexture(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function radialShadowTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x / w - 0.5) * 2, v = (y / h - 0.5) * 2;
      // rounded-rectangle falloff matching the car footprint
      const dx = Math.max(Math.abs(u) - 0.55, 0) / 0.45, dy = Math.max(Math.abs(v) - 0.72, 0) / 0.28;
      const d = Math.sqrt(dx * dx + dy * dy);
      const a = Math.pow(Math.max(0, 1 - d), 1.6);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 0; img.data[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false });
}
