// Small geometry helpers used to assemble the mechanical parts.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function mesh(geo, mat, pos, rot) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0, rot[3] || 'XYZ');
  m.castShadow = true;
  return m;
}

export function rbox(w, h, d, r = 0.01, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
}

/** cylinder between two points */
export function rod(a, b, r0, r1 = r0, seg = 20, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  return m;
}

export function tube(points, r, mat, { seg = 64, radial = 16, tension = 0.5, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', tension);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, radial, closed), mat);
  m.castShadow = true;
  m.userData.curve = curve;
  return m;
}

/** lathe around the X axis from [radius, x] pairs */
export function latheX(profile, seg = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

export function helix(radius, height, turns, wire, mat) {
  const pts = [];
  const n = Math.ceil(turns * 40);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, n * 2, wire, 10), mat);
  m.castShadow = true;
  return m;
}

/** place a Y-up object so its +Y axis runs from a to b */
export function alignY(obj, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  obj.position.copy(a);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return obj;
}
