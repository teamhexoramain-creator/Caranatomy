// Building blocks shared by every car's mechanical anatomy.
import * as THREE from 'three';
import { materials, makeFocusSet, focusMaterial } from './materials.js';
import { V, mesh, rbox, latheX, helix, alignY } from './geo.js';
import { canvasTexture } from './textures.js';

const PI = Math.PI;

/** a named anatomy system with its own focus set; M.<name> gives focus-patched materials */
export function system(name, color) {
  const g = new THREE.Group();
  g.name = name;
  const set = makeFocusSet(color);
  const M = new Proxy({}, { get: (_, k) => focusMaterial(materials()[k], set) });
  g.userData = { set, M, home: new THREE.Vector3() };
  return g;
}

/** engraved engine plaque: title line + small subtitle, with accent bars */
export function plaqueTexture(title, subtitle, accent = '#b3121b') {
  return canvasTexture(512, 160, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d9dbe0'); g.addColorStop(0.5, '#9a9ea6'); g.addColorStop(1, '#d0d3d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, w, 18); ctx.fillRect(0, h - 18, w, 18);
    ctx.fillStyle = '#16171a';
    ctx.font = 'bold italic 72px Inter, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, h / 2 - 8);
    ctx.font = '600 22px Inter, Arial';
    ctx.fillText(subtitle, w / 2, h / 2 + 46);
  });
}

export function turboUnit(M, s, pos = [0.97, 0.37, 0.37]) {
  const u = new THREE.Group();
  // shaft axis along X: turbine at the rear, compressor at the front
  const hot = M.hot;
  const scroll = new THREE.TorusGeometry(0.06, 0.034, 16, 40);
  u.add(mesh(scroll, hot, V(-0.05, 0, 0), [0, PI / 2, 0]));
  u.add(mesh(new THREE.CylinderGeometry(0.048, 0.05, 0.07, 32), hot, V(-0.05, 0, 0), [0, 0, PI / 2]));
  u.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 20), M.steel, V(0.01, 0, 0), [0, 0, PI / 2]));
  u.add(mesh(new THREE.TorusGeometry(0.066, 0.036, 16, 40), M.castAlu, V(0.07, 0, 0), [0, PI / 2, 0]));
  u.add(mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.07, 32), M.castAlu, V(0.11, 0, 0), [0, 0, PI / 2]));
  u.add(mesh(latheX([[0.044, 0.145], [0.05, 0.15], [0.05, 0.16], [0.044, 0.165]], 32), M.alu));
  // compressor wheel visible in the inlet
  for (let i = 0; i < 6; i++) {
    const b = mesh(new THREE.BoxGeometry(0.006, 0.07, 0.012), M.alu, V(0.14, 0, 0), [i * PI / 6, 0, 0.25]);
    u.add(b);
  }
  // gold foil heat shield over the turbine
  const shield = new THREE.CylinderGeometry(0.1, 0.1, 0.11, 32, 1, true, -PI * 0.1, PI * 1.1);
  u.add(mesh(shield, M.gold, V(-0.05, 0, 0), [0, 0, PI / 2]));
  u.children.forEach((c) => (c.material.side = THREE.DoubleSide));
  u.position.set(pos[0], pos[1], s * pos[2]);
  return u;
}

export function cvBoot(M, a, b) {
  const prof = [];
  for (let i = 0; i <= 12; i++) prof.push([0.024 + (i % 2) * 0.008 + (1 - i / 12) * 0.012, i * 0.007]);
  const boot = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20), M.rubber);
  boot.castShadow = true;
  return alignY(boot, a, b);
}

export function coilover(M, a, b, springFrom = 0.35) {
  const grp = new THREE.Group();
  const len = a.distanceTo(b);
  grp.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, len * 0.55, 20), M.darkMetal, V(0, len * 0.275, 0)));
  grp.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, len * 0.5, 12), M.chrome, V(0, len * 0.75, 0)));
  grp.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 28), M.darkMetal, V(0, len * springFrom, 0)));
  grp.add(mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 28), M.darkMetal, V(0, len * 0.97, 0)));
  const sp = helix(0.052, len * (0.97 - springFrom), 6.5, 0.0085, M.spring);
  sp.position.y = len * springFrom;
  grp.add(sp);
  grp.add(mesh(new THREE.TorusGeometry(0.018, 0.007, 8, 16), M.steel, V(0, 0, 0), [0, PI / 2, 0]));
  return alignY(grp, a, b);
}

export function seat(M, front, insert = M.leatherRed) {
  const s = new THREE.Group();
  const w = front ? 0.5 : 0.44;
  s.add(mesh(rbox(0.48, 0.1, w, 0.04), M.leather, V(0, 0, 0)));
  for (const z of [-1, 1]) s.add(mesh(rbox(0.46, 0.08, 0.07, 0.03), M.leather, V(0, 0.05, z * (w / 2 - 0.02))));
  const back = new THREE.Group();
  back.add(mesh(rbox(0.1, front ? 0.66 : 0.5, w, 0.04), M.leather, V(0, (front ? 0.33 : 0.25), 0)));
  back.add(mesh(rbox(0.02, front ? 0.42 : 0.3, w * 0.5, 0.008), insert, V(0.05, front ? 0.3 : 0.24, 0)));
  for (const z of [-1, 1]) back.add(mesh(rbox(0.12, front ? 0.45 : 0.3, 0.07, 0.03), M.leather, V(0.03, front ? 0.25 : 0.2, z * (w / 2 - 0.01))));
  back.position.set(-0.24, 0.03, 0);
  back.rotation.z = 0.24;
  s.add(back);
  return s;
}

export function steeringWheel(M) {
  const sw = new THREE.Group();
  sw.add(mesh(new THREE.TorusGeometry(0.18, 0.019, 16, 48), M.leather));
  sw.add(mesh(rbox(0.07, 0.03, 0.03, 0.01), M.alu, V(-0.11, 0, 0)));
  sw.add(mesh(rbox(0.07, 0.03, 0.03, 0.01), M.alu, V(0.11, 0, 0)));
  sw.add(mesh(rbox(0.03, 0.12, 0.03, 0.01), M.alu, V(0, -0.1, 0)));
  sw.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24), M.black, V(0, 0, 0), [PI / 2, 0, 0]));
  for (const s of [1, -1]) sw.add(mesh(rbox(0.05, 0.1, 0.008, 0.004), M.alu, V(s * 0.12, 0.05, 0.04)));
  return sw;
}
