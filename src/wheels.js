// Forged twin-spoke wheels, tyres, cross-drilled two-piece rotors and monobloc
// calipers. Sizes come from the car's wheel spec (see src/cars/*/car.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture } from './textures.js';

function tyreGeometry(width, RIM_R, TYRE_R) {
  const h = width / 2;
  const pts = [];
  const prof = [
    [RIM_R + 0.006, -h + 0.014], [RIM_R + 0.025, -h - 0.002], [RIM_R + 0.055, -h - 0.008],
    [TYRE_R - 0.044, -h - 0.007], [TYRE_R - 0.022, -h + 0.002], [TYRE_R - 0.008, -h + 0.014], [TYRE_R - 0.0015, -h + 0.03],
  ];
  // tread with four circumferential grooves
  const grooves = [-0.37, -0.12, 0.12, 0.37].map((g) => g * width);
  const tread = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const a = -h + 0.03 + (i / n) * (width - 0.06);
    let r = TYRE_R;
    for (const g of grooves) if (Math.abs(a - g) < 0.0055) r = TYRE_R - 0.0075;
    tread.push([r, a]);
  }
  const all = [...prof, ...tread, ...prof.slice().reverse().map(([r, a]) => [r, -a])];
  for (const [r, a] of all) pts.push(new THREE.Vector2(r, a));
  const g = new THREE.LatheGeometry(pts, 160);
  g.rotateX(Math.PI / 2); // axis -> Z
  return g;
}

function taperedBar(p0, p1, w0, w1, d0, d1, segs = 6) {
  // bar from p0 to p1 (Vector3) in the wheel plane; width across, depth along Z
  const g = new THREE.BoxGeometry(1, 1, 1, segs, 1, 1);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  dir.normalize();
  const side = new THREE.Vector3(-dir.y, dir.x, 0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = v.x + 0.5;
    const w = THREE.MathUtils.lerp(w0, w1, t);
    const dz = THREE.MathUtils.lerp(d0, d1, t);
    const base = new THREE.Vector3().copy(p0).addScaledVector(dir, t * len);
    base.addScaledVector(side, v.y * w);
    base.z = THREE.MathUtils.lerp(p0.z, p1.z, t) + v.z * dz;
    pos.setXYZ(i, base.x, base.y, base.z);
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function rimGeometry(width, RIM_R, spokes, split) {
  const h = width / 2;
  // barrel + lips
  const prof = [
    [RIM_R + 0.004, -h + 0.002], [RIM_R + 0.012, -h + 0.006], [RIM_R - 0.004, -h + 0.016],
    [RIM_R - 0.018, -h + 0.03], [RIM_R - 0.022, h - 0.05], [RIM_R - 0.014, h - 0.03],
    [RIM_R + 0.002, h - 0.016], [RIM_R + 0.014, h - 0.004], [RIM_R + 0.012, h + 0.004],
    [RIM_R - 0.006, h + 0.002],
  ].map(([r, a]) => new THREE.Vector2(r, a));
  const barrel = new THREE.LatheGeometry(prof, 128);
  barrel.rotateX(Math.PI / 2);
  const parts = [barrel.toNonIndexed()];
  const face = h - 0.008;
  const dish = 0.055;
  for (let k = 0; k < spokes; k++) {
    const base = (k / spokes) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const aIn = base + s * split[0], aOut = base + s * split[1];
      const p0 = new THREE.Vector3(Math.cos(aIn) * 0.072, Math.sin(aIn) * 0.072, face - dish);
      const p1 = new THREE.Vector3(Math.cos(aOut) * (RIM_R - 0.012), Math.sin(aOut) * (RIM_R - 0.012), face - 0.004);
      parts.push(taperedBar(p0, p1, 0.026, 0.019, 0.034, 0.022));
    }
  }
  // hub
  const hub = new THREE.CylinderGeometry(0.084, 0.09, 0.04, 48, 1);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, 0, face - dish - 0.004);
  parts.push(hub.toNonIndexed());
  return mergeGeometries(parts, false);
}

function lugGeometry(width) {
  const face = width / 2 - 0.008 - 0.055;
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const n = new THREE.CylinderGeometry(0.0115, 0.0115, 0.026, 6);
    n.rotateX(Math.PI / 2);
    n.translate(Math.cos(a) * 0.0572, Math.sin(a) * 0.0572, face + 0.024);
    parts.push(n.toNonIndexed());
  }
  const cap = new THREE.CylinderGeometry(0.03, 0.032, 0.02, 40);
  cap.rotateX(Math.PI / 2);
  cap.translate(0, 0, face + 0.018);
  parts.push(cap.toNonIndexed());
  return mergeGeometries(parts, false);
}

function discGeometry(radius, thick, inner = 0.125) {
  const prof = [
    [inner, -thick / 2], [radius, -thick / 2], [radius, thick / 2], [inner, thick / 2],
  ].map(([r, a]) => new THREE.Vector2(r, a));
  const g = new THREE.LatheGeometry([...prof, prof[0]], 96);
  g.rotateX(Math.PI / 2);
  return g;
}

function hatGeometry(depth, k = 1) {
  const prof = [[0.126 * k, 0], [0.122 * k, 0.006], [0.10 * k, 0.012], [0.095 * k, depth], [0.04 * k, depth + 0.004], [0.0, depth + 0.004]]
    .map(([r, a]) => new THREE.Vector2(r, a));
  const g = new THREE.LatheGeometry(prof, 64);
  g.rotateX(Math.PI / 2);
  return g;
}

function caliperGeometry(discR, span, depth) {
  const shape = new THREE.Shape();
  const r0 = discR - 0.085, r1 = discR + 0.024;
  const a0 = -span / 2, a1 = span / 2;
  shape.absarc(0, 0, r1, a0, a1, false);
  shape.absarc(0, 0, r0, a1, a0, true);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4, curveSegments: 32,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

const matCache = new Map();
export function wheelMaterials(spec) {
  if (matCache.has(spec)) return matCache.get(spec);
  const tread = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#303030'; ctx.lineWidth = 3;
    for (let i = 0; i < 96; i++) {
      const x = (i / 96) * w;
      ctx.beginPath(); ctx.moveTo(x, h * 0.42); ctx.lineTo(x + 7, h * 0.47); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, h * 0.58); ctx.lineTo(x - 7, h * 0.53); ctx.stroke();
    }
  });
  tread.wrapS = THREE.RepeatWrapping;
  tread.repeat.set(4, 1);
  const drilled = canvasTexture(1024, 1024, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    g.addColorStop(0, '#5a5a5a'); g.addColorStop(1, '#9a9a9a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let r = 300; r < 512; r += 3) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#111';
    for (let k = 0; k < (spec.drilled === false ? 0 : 48); k++) {
      const a = (k / 48) * Math.PI * 2;
      for (let j = 0; j < 3; j++) {
        const r = 360 + j * 46;
        const aa = a + j * 0.045;
        ctx.beginPath(); ctx.arc(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r, 7.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
  const mats = {
    tyre: new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.82, metalness: 0, bumpMap: tread, bumpScale: 1.5, sheen: 0.3, sheenRoughness: 0.8, sheenColor: 0x222222 }),
    rim: new THREE.MeshPhysicalMaterial({ color: spec.rimColor, roughness: 0.28, metalness: 1.0, clearcoat: 1, clearcoatRoughness: 0.08 }),
    lug: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.2, metalness: 1.0 }),
    disc: new THREE.MeshStandardMaterial({ color: 0xd0d2d6, map: drilled, roughness: 0.48, metalness: 0.55 }),
    hat: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.9 }),
    caliper: new THREE.MeshPhysicalMaterial({ color: spec.caliperColor, roughness: 0.35, metalness: spec.caliperMetal ?? 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1 }),
  };
  matCache.set(spec, mats);
  return mats;
}

/**
 * One corner: returns { group, tyre, rim, brake } with the wheel axis along Z.
 * side = +1 for the right-hand wheels (outer face towards +Z), -1 for the left.
 */
export function makeCorner({ front, side, spec }) {
  const m = wheelMaterials(spec);
  const axle = front ? spec.front : spec.rear;
  const { width, discR } = axle;
  const group = new THREE.Group();
  const wheel = new THREE.Group();
  const tyre = new THREE.Mesh(tyreGeometry(width, spec.rimR, spec.tyreR), m.tyre);
  const rim = new THREE.Mesh(rimGeometry(width, spec.rimR, spec.spokes, spec.split), m.rim);
  const lugs = new THREE.Mesh(lugGeometry(width), m.lug);
  wheel.add(tyre, rim, lugs);
  const brake = new THREE.Group();
  const inner = axle.discInner ?? 0.125;
  const disc = new THREE.Mesh(discGeometry(discR, axle.discT, inner), m.disc);
  // planar UVs for the drilled pattern
  const dp = disc.geometry.attributes.position;
  const uv = new Float32Array(dp.count * 2);
  for (let i = 0; i < dp.count; i++) { uv[i * 2] = dp.getX(i) / (2 * discR) + 0.5; uv[i * 2 + 1] = dp.getY(i) / (2 * discR) + 0.5; }
  disc.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const hat = new THREE.Mesh(hatGeometry(0.045, inner / 0.125), m.hat);
  hat.position.z = 0.012;
  const cal = new THREE.Mesh(caliperGeometry(discR, axle.calSpan, axle.calDepth), m.caliper);
  cal.rotation.z = side > 0 ? Math.PI * 0.86 : Math.PI * 0.14;
  brake.add(disc, hat, cal);
  brake.position.z = -0.035;
  group.add(wheel, brake);
  for (const o of [tyre, rim, lugs, disc, hat, cal]) { o.castShadow = true; }
  if (side < 0) group.rotation.y = Math.PI;
  group.userData = { wheel, brake, tyre, rim, disc, caliper: cal };
  return group;
}
