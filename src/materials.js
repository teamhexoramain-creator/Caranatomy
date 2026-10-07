// Shared PBR material library for the mechanical parts, plus a per-system
// "focus" patch (fresnel glow + dimming) used by the anatomy timeline.
import * as THREE from 'three';
import { canvasTexture } from './textures.js';

function noiseTexture(size, scale, contrast) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = 128 + (Math.random() - 0.5) * 255 * contrast;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (scale > 1) { ctx.filter = `blur(${scale}px)`; ctx.drawImage(ctx.canvas, 0, 0); }
  }, { srgb: false });
}

function carbonTexture() {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    const n = 8, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const horiz = ((i + j) >> 1) % 2 === 0;
      const g = horiz ? ctx.createLinearGradient(i * s, j * s, i * s, (j + 1) * s) : ctx.createLinearGradient(i * s, j * s, (i + 1) * s, j * s);
      g.addColorStop(0, '#0b0b0c'); g.addColorStop(0.5, '#3a3b3f'); g.addColorStop(1, '#0b0b0c');
      ctx.fillStyle = g; ctx.fillRect(i * s, j * s, s, s);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function finTexture() {
  const t = canvasTexture(64, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6d7075'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b1c1f';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let LIB = null;
export function materials() {
  if (LIB) return LIB;
  const crinkle = noiseTexture(256, 1, 0.9);
  crinkle.wrapS = crinkle.wrapT = THREE.RepeatWrapping;
  crinkle.repeat.set(6, 6);
  const carbon = carbonTexture();
  carbon.repeat.set(1, 18);
  const fins = finTexture();
  fins.repeat.set(30, 1);
  LIB = {
    alu: new THREE.MeshPhysicalMaterial({ color: 0xaeb2b8, metalness: 1, roughness: 0.4, envMapIntensity: 0.8 }),
    castAlu: new THREE.MeshStandardMaterial({ color: 0x9da0a6, metalness: 1, roughness: 0.52, bumpMap: crinkle, bumpScale: 0.6 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x2e3034, metalness: 0.9, roughness: 0.42 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x5e6268, metalness: 1, roughness: 0.42, envMapIntensity: 0.85 }),
    chassis: new THREE.MeshStandardMaterial({ color: 0x4a4f57, metalness: 0.75, roughness: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, metalness: 0, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0, roughness: 0.92 }),
    crinkleBlack: new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.3, roughness: 0.6, bumpMap: crinkle, bumpScale: 1.2 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xb3121b, metalness: 0.2, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.3, bumpMap: crinkle, bumpScale: 2.0 }),
    titanium: new THREE.MeshPhysicalMaterial({ color: 0xa9adb4, metalness: 1, roughness: 0.24, iridescence: 0.45, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 420] }),
    hot: new THREE.MeshStandardMaterial({ color: 0x3b2d27, metalness: 0.8, roughness: 0.5, emissive: 0xff3c0a, emissiveIntensity: 0.0 }),
    spring: new THREE.MeshPhysicalMaterial({ color: 0x1d1f23, metalness: 0.7, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 1, roughness: 0.12, envMapIntensity: 0.8 }),
    carbon: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: carbon, metalness: 0.4, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 }),
    leather: new THREE.MeshPhysicalMaterial({ color: 0x141416, metalness: 0, roughness: 0.62, sheen: 0.6, sheenColor: 0x3a3a40, sheenRoughness: 0.5 }),
    leatherRed: new THREE.MeshPhysicalMaterial({ color: 0x5a0d10, metalness: 0, roughness: 0.6, sheen: 0.5, sheenColor: 0x8a2a2a, sheenRoughness: 0.5 }),
    fins: new THREE.MeshStandardMaterial({ color: 0xffffff, map: fins, metalness: 0.9, roughness: 0.45 }),
    hdpe: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, metalness: 0, roughness: 0.75 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x050608, emissive: 0x3a7bd5, emissiveIntensity: 0.6, roughness: 0.2 }),
  };
  return LIB;
}

/**
 * A focus set is shared by every mesh of one anatomy system: `glow` adds an
 * accent fresnel rim + fill, `dim` darkens the system when another is in focus.
 */
export function makeFocusSet(color = 0xff7a1a) {
  return {
    uGlow: { value: 0 },
    uDim: { value: 0 },
    uGlowColor: { value: new THREE.Color(color) },
    cache: new Map(),
  };
}

export function focusMaterial(base, set) {
  if (set.cache.has(base)) return set.cache.get(base);
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = set.uGlow;
    sh.uniforms.uDim = set.uDim;
    sh.uniforms.uGlowColor = set.uGlowColor;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow; uniform float uDim; uniform vec3 uGlowColor;')
      .replace('#include <opaque_fragment>', `
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        outgoingLight *= 1.0 - uDim * 0.8;
        outgoingLight += uGlowColor * uGlow * (0.03 + fr * 0.85);
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'focus-' + base.type + (base.map ? '-map' : '') + (base.bumpMap ? '-bump' : '');
  set.cache.set(base, m);
  return m;
}
