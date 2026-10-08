// Mechanical anatomy of the Skyline GT-R R34 (BNR34), built from primitives at
// real-world positions (car space: +X front, +Y up, +Z right, metres).
// Front axle x = +1.3325, rear axle x = -1.3325, wheel centre y = 0.3265.
import * as THREE from 'three';
import { focusMaterial } from '../../materials.js';
import { V, mesh, rbox, rod, tube, latheX } from '../../geo.js';
import { system, plaqueTexture, turboUnit, cvBoot, coilover, seat, steeringWheel } from '../../partsKit.js';

const PI = Math.PI;
const AF = 1.3325, AR = -1.3325, WY = 0.3265;

// ------------------------------------------------------------------ RB26DETT
function buildEngine() {
  const g = system('engine', 0xff7a1a);
  const { M } = g.userData;
  const X0 = 0.9, X1 = 1.52; // block length along the crank (inline six)
  const cx = (X0 + X1) / 2;
  g.add(mesh(rbox(X1 - X0, 0.3, 0.3, 0.03), M.darkMetal, V(cx, 0.39, 0)));             // iron block
  g.add(mesh(rbox(0.56, 0.12, 0.26, 0.025), M.castAlu, V(cx - 0.02, 0.185, 0)));        // sump
  for (let i = 0; i < 6; i++) g.add(mesh(rbox(0.5, 0.012, 0.012, 0.004), M.castAlu, V(cx - 0.02, 0.13, -0.1 + i * 0.04)));
  g.add(mesh(rbox(X1 - X0 + 0.02, 0.13, 0.3, 0.025), M.castAlu, V(cx, 0.6, 0)));        // alloy head
  // twin cam covers in red crinkle with black ribs, coil-pack cover between them
  for (const s of [1, -1]) {
    g.add(mesh(rbox(0.6, 0.075, 0.115, 0.03), M.crinkleRed, V(cx, 0.705, s * 0.075)));
    for (let i = 0; i < 5; i++) g.add(mesh(rbox(0.012, 0.012, 0.1, 0.004), M.black, V(X0 + 0.1 + i * 0.105, 0.746, s * 0.075)));
  }
  g.add(mesh(rbox(0.46, 0.035, 0.05, 0.012), M.black, V(cx, 0.75, 0)));
  // six individual throttle bodies feeding a long plenum on the left
  g.add(mesh(rbox(0.6, 0.11, 0.13, 0.04), M.alu, V(cx, 0.69, -0.29)));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.075), focusMaterial(new THREE.MeshStandardMaterial({ map: plaqueTexture('RB26DETT', 'TWIN CAM 24 VALVE'), metalness: 0.6, roughness: 0.35 }), g.userData.set));
  plaque.rotation.set(-PI / 2, 0, PI);
  plaque.position.set(cx, 0.7465, -0.29);
  g.add(plaque);
  for (let i = 0; i < 6; i++) {
    const x = X0 + 0.07 + i * 0.096;
    g.add(rod(V(x, 0.6, -0.14), V(x, 0.66, -0.235), 0.026, 0.026, 18, M.castAlu));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 18), M.darkMetal, V(x, 0.635, -0.19), [PI / 4, 0, 0]));
  }
  g.add(rod(V(X0 + 0.04, 0.635, -0.19), V(X1 - 0.02, 0.635, -0.19), 0.006, 0.006, 8, M.steel));   // throttle shaft
  // exhaust manifolds on the right: front three and rear three cylinders, one per turbo
  for (let i = 0; i < 6; i++) {
    const x = X0 + 0.07 + i * 0.096;
    const tx = i < 3 ? 1.02 : 1.33;
    g.add(tube([V(x, 0.56, 0.15), V(x, 0.52, 0.21), V((x + tx) / 2, 0.48, 0.25), V(tx, 0.46, 0.27)], 0.017, M.steel, { seg: 24, radial: 10 }));
  }
  // timing belt cover, pulleys and accessory belt
  g.add(mesh(rbox(0.05, 0.42, 0.3, 0.02), M.black, V(X1 + 0.03, 0.47, 0)));
  const pulleys = [[V(X1 + 0.07, 0.34, 0), 0.08], [V(X1 + 0.07, 0.6, 0.17), 0.05], [V(X1 + 0.07, 0.26, -0.18), 0.055], [V(X1 + 0.07, 0.52, -0.06), 0.035]];
  for (const [p, r] of pulleys) {
    g.add(mesh(new THREE.CylinderGeometry(r, r, 0.035, 36), M.steel, p, [0, 0, PI / 2]));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.04, 16), M.darkMetal, p, [0, 0, PI / 2]));
  }
  g.add(mesh(rbox(0.15, 0.12, 0.12, 0.03), M.castAlu, V(X1 - 0.02, 0.6, 0.21)));          // alternator
  g.add(tube([V(X1 + 0.07, 0.42, 0.02), V(X1 + 0.07, 0.64, 0.2), V(X1 + 0.07, 0.57, -0.07), V(X1 + 0.07, 0.3, -0.23), V(X1 + 0.07, 0.24, -0.15), V(X1 + 0.07, 0.27, 0.05)], 0.007, M.rubber, { closed: true, seg: 80, radial: 6 }));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 48), M.castAlu, V(X0 - 0.025, 0.4, 0), [0, 0, PI / 2]));  // flywheel housing flange
  g.userData.anchor = V(cx, 0.76, 0);
  return g;
}

// ------------------------------------------------------------------ twin parallel turbos (right side)
function buildTurbos() {
  const g = system('turbos', 0xff7a1a);
  const { M } = g.userData;
  g.userData.hot = M.hot;
  g.add(turboUnit(M, 1, [1.02, 0.44, 0.33]));
  g.add(turboUnit(M, 1, [1.33, 0.44, 0.33]));
  g.userData.anchor = V(1.18, 0.55, 0.33);
  return g;
}

// ------------------------------------------------------------------ front-mount intercooler + radiator
function buildCooling() {
  const g = system('cooling', 0xff7a1a);
  const { M } = g.userData;
  const ic = new THREE.Group();                                          // big FMIC behind the bumper intake
  ic.add(mesh(rbox(0.07, 0.22, 1.06, 0.006), M.fins));
  ic.add(mesh(rbox(0.09, 0.25, 0.08, 0.02), M.alu, V(0, 0, 0.57)));
  ic.add(mesh(rbox(0.09, 0.25, 0.08, 0.02), M.alu, V(0, 0, -0.57)));
  ic.position.set(2.16, 0.34, 0);
  g.add(ic);
  const rad = new THREE.Group();
  rad.add(mesh(rbox(0.04, 0.36, 0.7, 0.004), M.fins));
  rad.add(mesh(rbox(0.05, 0.38, 0.05, 0.01), M.black, V(0, 0, 0.375)));
  rad.add(mesh(rbox(0.05, 0.38, 0.05, 0.01), M.black, V(0, 0, -0.375)));
  rad.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 40, 1, true), M.black, V(-0.05, 0, 0), [0, 0, PI / 2]));
  for (let i = 0; i < 7; i++) rad.add(mesh(new THREE.BoxGeometry(0.012, 0.15, 0.05), M.black, V(-0.055, 0, 0), [i * 2 * PI / 7, 0, 0]));
  rad.position.set(1.98, 0.5, 0);
  rad.rotation.z = 0.18;
  g.add(rad);
  // hot side: both compressors -> FMIC right end; cold side: FMIC left end -> plenum
  g.add(tube([V(1.19, 0.44, 0.33), V(1.3, 0.3, 0.46), V(1.7, 0.27, 0.56), V(2.08, 0.32, 0.6)], 0.03, M.alu, { seg: 48 }));
  g.add(tube([V(1.5, 0.44, 0.33), V(1.62, 0.34, 0.45), V(1.75, 0.29, 0.53)], 0.026, M.alu, { seg: 32 }));
  g.add(tube([V(2.08, 0.36, -0.6), V(1.92, 0.42, -0.52), V(1.74, 0.6, -0.36), V(1.55, 0.69, -0.29)], 0.035, M.alu, { seg: 48 }));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 20), M.black, V(1.84, 0.5, -0.45), [0.5, 0, 0.9]));
  // air box feeding both turbo inlets
  g.add(mesh(rbox(0.26, 0.14, 0.2, 0.03), M.hdpe, V(1.76, 0.58, 0.55)));
  g.add(tube([V(1.64, 0.56, 0.52), V(1.52, 0.5, 0.42), V(1.5, 0.45, 0.36)], 0.035, M.black, { seg: 30 }));
  g.add(tube([V(1.64, 0.6, 0.5), V(1.35, 0.56, 0.44), V(1.21, 0.46, 0.36)], 0.035, M.black, { seg: 30 }));
  g.userData.anchor = V(2.16, 0.47, 0);
  return g;
}

// ------------------------------------------------------------------ Getrag 6-speed + transfer case
function buildGearbox() {
  const g = system('gearbox', 0xff7a1a);
  const { M } = g.userData;
  g.add(mesh(latheX([[0.0, 0.66], [0.13, 0.66], [0.18, 0.74], [0.2, 0.84], [0.19, 0.875]], 48), M.castAlu, V(0, 0.38, 0)));
  g.add(mesh(rbox(0.5, 0.24, 0.24, 0.06), M.castAlu, V(0.4, 0.36, 0)));
  for (let i = 0; i < 6; i++) g.add(mesh(rbox(0.012, 0.22, 0.26, 0.004), M.castAlu, V(0.2 + i * 0.07, 0.36, 0)));
  g.add(mesh(rbox(0.26, 0.2, 0.3, 0.05), M.darkMetal, V(0.04, 0.33, 0.04)));             // transfer case
  g.add(mesh(rbox(0.12, 0.04, 0.16, 0.01), M.red, V(0.04, 0.45, 0.04)));
  g.add(rod(V(0.3, 0.48, 0), V(0.25, 0.68, 0), 0.012, 0.01, 12, M.steel));                // shift lever
  g.add(mesh(new THREE.SphereGeometry(0.03, 20, 14), M.black, V(0.245, 0.7, 0)));
  g.userData.anchor = V(0.32, 0.5, 0);
  return g;
}

// ------------------------------------------------------------------ ATTESA E-TS Pro driveline + Active LSD
function buildAWD() {
  const g = system('awd', 0x4fb0ff);
  const { M } = g.userData;
  g.add(rod(V(-0.08, 0.33, 0), V(-1.17, 0.33, 0), 0.036, 0.036, 28, M.steel));          // rear propshaft
  g.add(mesh(rbox(0.06, 0.07, 0.1, 0.015), M.black, V(-0.6, 0.31, 0)));                 // centre bearing
  g.add(rod(V(0.1, 0.27, 0.15), V(1.24, 0.29, 0.16), 0.024, 0.024, 20, M.steel));       // front propshaft
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 36), M.castAlu, V(AF, 0.3, 0.16), [PI / 2, 0, 0]));  // front diff
  // rear final drive with the Active LSD housing
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 48), M.castAlu, V(AR, WY, 0), [PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 40), M.darkMetal, V(AR - 0.12, WY, 0), [0, 0, PI / 2]));
  for (let i = 0; i < 5; i++) g.add(mesh(rbox(0.01, 0.2, 0.012, 0.003), M.darkMetal, V(AR - 0.15, WY, -0.08 + i * 0.04)));
  g.add(mesh(rbox(0.1, 0.06, 0.14, 0.015), M.red, V(AR + 0.02, WY + 0.15, 0)));
  const shafts = [
    [V(AF, 0.31, 0.04), V(AF, WY, -0.6)], [V(AF, 0.31, 0.26), V(AF, WY, 0.6)],
    [V(AR, WY, -0.17), V(AR, WY, -0.6)], [V(AR, WY, 0.17), V(AR, WY, 0.6)],
  ];
  for (const [a, b] of shafts) {
    g.add(rod(a, b, 0.016, 0.016, 16, M.steel));
    const d = new THREE.Vector3().subVectors(b, a).normalize();
    g.add(cvBoot(M, a.clone().addScaledVector(d, 0.02), a.clone().addScaledVector(d, 0.1)));
    g.add(cvBoot(M, b.clone().addScaledVector(d, -0.03), b.clone().addScaledVector(d, -0.12)));
  }
  g.userData.flows = [
    { pts: [V(0.9, 0.4, 0), V(0.05, 0.34, 0), V(-1.17, 0.33, 0)], start: 0, len: 1 },
    { pts: [V(AR, WY, 0.05), V(AR, WY, 0.64)], start: 1, len: 0.4 },
    { pts: [V(AR, WY, -0.05), V(AR, WY, -0.64)], start: 1, len: 0.4 },
    { pts: [V(0.1, 0.27, 0.15), V(1.24, 0.29, 0.16), V(AF, 0.3, 0.16)], start: 1, len: 0.9 },
    { pts: [V(AF, 0.31, 0.16), V(AF, WY, 0.64)], start: 2, len: 0.35 },
    { pts: [V(AF, 0.31, 0.16), V(AF, WY, -0.64)], start: 2, len: 0.45 },
  ];
  g.userData.anchor = V(-0.3, 0.42, 0);
  return g;
}

// ------------------------------------------------------------------ multi-link suspension
function buildSuspension() {
  const g = system('suspension', 0xff7a1a);
  const { M } = g.userData;
  for (const s of [1, -1]) {
    for (const [ax, front] of [[AF, true], [AR, false]]) {
      g.add(mesh(rbox(0.07, 0.36, 0.07, 0.02), M.castAlu, V(ax, 0.37, s * 0.6)));
      for (const dx of [-0.2, 0.19]) g.add(rod(V(ax + dx, 0.18, s * 0.3), V(ax, 0.17, s * 0.6), 0.015, 0.013, 14, M.alu));
      for (const dx of [-0.11, 0.11]) g.add(rod(V(ax + dx, 0.62, s * 0.4), V(ax, 0.58, s * 0.58), 0.012, 0.011, 12, M.alu));
      g.add(rod(V(ax + (front ? 0.17 : -0.2), 0.27, s * 0.24), V(ax + (front ? 0.12 : -0.13), 0.28, s * 0.58), 0.009, 0.009, 10, M.steel));
      g.add(coilover(M, V(ax + (front ? -0.08 : -0.13), 0.2, s * 0.54), V(ax + (front ? -0.1 : -0.15), 0.74, s * 0.47)));
    }
  }
  g.add(tube([V(1.25, 0.19, -0.52), V(1.55, 0.22, -0.45), V(1.57, 0.23, 0), V(1.55, 0.22, 0.45), V(1.25, 0.19, 0.52)], 0.012, M.spring, { seg: 60 }));
  g.add(tube([V(-1.2, 0.23, -0.5), V(-1.58, 0.25, -0.43), V(-1.6, 0.26, 0), V(-1.58, 0.25, 0.43), V(-1.2, 0.23, 0.5)], 0.011, M.spring, { seg: 60 }));
  g.userData.anchor = V(1.23, 0.75, 0.47);
  return g;
}

// ------------------------------------------------------------------ exhaust: single large tip on the left
function buildExhaust() {
  const g = system('exhaust', 0xff7a1a);
  const { M } = g.userData;
  for (const x of [0.96, 1.27]) g.add(tube([V(x, 0.42, 0.33), V(x - 0.08, 0.3, 0.3), V(0.78, 0.2, 0.22)], 0.03, M.steel, { seg: 30 }));
  g.add(tube([V(0.78, 0.2, 0.22), V(0.3, 0.165, 0.2), V(-0.6, 0.165, 0.16), V(-0.98, 0.18, -0.05),
    V(-1.15, 0.2, -0.3), V(-1.55, 0.23, -0.42), V(-1.68, 0.26, -0.45)], 0.034, M.steel, { seg: 140 }));
  g.add(mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.34, 28), M.titanium, V(0.25, 0.165, 0.2), [0, 0, PI / 2]));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 28), M.titanium, V(-0.45, 0.17, 0.17), [0, 0, PI / 2]));
  g.add(mesh(rbox(0.46, 0.2, 0.5, 0.07), M.titanium, V(-1.86, 0.27, -0.42)));
  g.add(rod(V(-2.05, 0.265, -0.55), V(-2.27, 0.26, -0.55), 0.052, 0.058, 32, M.titanium));
  g.add(mesh(latheX([[0.058, 0], [0.062, 0.004], [0.062, 0.014], [0.054, 0.014], [0.054, -0.02]], 32), M.titanium, V(-2.28, 0.26, -0.55), [0, PI, 0]));
  M.titanium.side = THREE.DoubleSide;
  g.userData.anchor = V(-1.86, 0.38, -0.42);
  return g;
}

// ------------------------------------------------------------------ monocoque + safety cell
function buildChassis() {
  const g = system('chassis', 0xff7a1a);
  const { M } = g.userData;
  g.add(mesh(rbox(1.85, 0.025, 1.46, 0.01), M.chassis, V(-0.13, 0.15, 0)));
  const tunnel = new THREE.CylinderGeometry(0.16, 0.16, 1.85, 32, 1, true, -PI / 2, PI);
  g.add(mesh(tunnel, M.chassis, V(-0.12, 0.25, 0), [0, 0, PI / 2]));
  g.children[g.children.length - 1].material.side = THREE.DoubleSide;
  for (const s of [1, -1]) {
    g.add(mesh(rbox(1.9, 0.15, 0.12, 0.03), M.chassis, V(-0.1, 0.23, s * 0.76)));
    g.add(mesh(rbox(1.4, 0.11, 0.08, 0.02), M.chassis, V(1.5, 0.34, s * 0.46)));
    g.add(mesh(rbox(1.1, 0.1, 0.08, 0.02), M.chassis, V(-1.65, 0.45, s * 0.53)));
    g.add(mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.22, 32), M.castAlu, V(1.24, 0.66, s * 0.47)));
    const cage = [V(0.72, 0.3, s * 0.77), V(0.67, 0.95, s * 0.73), V(-0.02, 1.3, s * 0.6), V(-0.86, 1.32, s * 0.59), V(-1.62, 1.07, s * 0.66)];
    g.add(tube(cage, 0.025, M.chassis, { seg: 80, tension: 0.2 }));
    g.add(tube([V(-0.62, 0.3, s * 0.77), V(-0.62, 0.98, s * 0.77), V(-0.62, 1.3, s * 0.6)], 0.025, M.chassis, { seg: 30 }));
    g.add(tube([V(-1.62, 1.07, s * 0.66), V(-1.95, 1.02, s * 0.66), V(-2.12, 0.55, s * 0.6)], 0.021, M.chassis, { seg: 30 }));
    g.add(mesh(rbox(0.32, 0.2, 0.4, 0.05), M.hdpe, V(-0.88, 0.29, s * 0.38)));
  }
  g.add(rod(V(1.24, 0.76, -0.47), V(1.24, 0.76, 0.47), 0.017, 0.017, 16, M.alu));
  g.add(rod(V(-0.02, 1.3, -0.6), V(-0.02, 1.3, 0.6), 0.023, 0.023, 16, M.chassis));
  g.add(rod(V(-0.86, 1.32, -0.59), V(-0.86, 1.32, 0.59), 0.023, 0.023, 16, M.chassis));
  g.add(mesh(rbox(0.03, 0.6, 1.34, 0.01), M.chassis, V(0.8, 0.5, 0)));
  g.add(mesh(rbox(0.09, 0.1, 1.3, 0.03), M.alu, V(2.24, 0.42, 0)));
  g.add(mesh(rbox(0.08, 0.1, 1.25, 0.03), M.alu, V(-2.2, 0.45, 0)));
  g.add(mesh(rbox(1.1, 0.02, 1.2, 0.01), M.chassis, V(-1.68, 0.55, 0)));
  g.add(rod(V(1.12, 0.18, -0.34), V(1.12, 0.18, 0.34), 0.024, 0.024, 14, M.castAlu));
  g.add(rod(V(1.56, 0.19, -0.34), V(1.56, 0.19, 0.34), 0.024, 0.024, 14, M.castAlu));
  g.add(mesh(rbox(0.25, 0.18, 0.17, 0.015), M.black, V(-1.98, 0.65, 0.45)));             // boot-mounted battery
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), M.red, V(-1.91, 0.75, 0.4)));
  g.userData.anchor = V(-0.6, 1.32, 0.59);
  return g;
}

// ------------------------------------------------------------------ interior + multi-function display
const MFD_W = 512, MFD_H = 300;
function drawMFD(ctx, t) {
  const boost = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.2));     // bar
  const oil = 92 + 4 * Math.sin(t * 0.7), water = 84 + 2 * Math.sin(t * 0.5 + 1);
  const thr = Math.round(40 + 55 * (0.5 + 0.5 * Math.sin(t * 2.2 + 0.4)));
  const g = ctx.createLinearGradient(0, 0, 0, MFD_H);
  g.addColorStop(0, '#071a2c'); g.addColorStop(1, '#020812');
  ctx.fillStyle = g; ctx.fillRect(0, 0, MFD_W, MFD_H);
  ctx.strokeStyle = 'rgba(80,190,255,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(6, 6, MFD_W - 12, MFD_H - 12);
  // boost gauge
  const cx = 150, cy = 190, r = 110;
  ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(80,190,255,0.18)';
  ctx.beginPath(); ctx.arc(cx, cy, r, PI, 2 * PI); ctx.stroke();
  ctx.strokeStyle = '#56c8ff'; ctx.shadowColor = '#56c8ff'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(cx, cy, r, PI, PI + PI * Math.min(1, boost / 1.2)); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8f6ff'; ctx.font = 'bold 54px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText(boost.toFixed(2), cx, cy - 18);
  ctx.font = '600 20px "JetBrains Mono", monospace'; ctx.fillStyle = '#56c8ff';
  ctx.fillText('BOOST  bar', cx, cy + 18);
  // readouts
  ctx.textAlign = 'left';
  const rows = [['OIL', `${oil.toFixed(0)}°C`], ['WATER', `${water.toFixed(0)}°C`], ['THROTTLE', `${thr}%`]];
  rows.forEach(([k, v], i) => {
    const y = 72 + i * 72;
    ctx.fillStyle = '#56c8ff'; ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.fillText(k, 300, y);
    ctx.fillStyle = '#e8f6ff'; ctx.font = 'bold 36px "JetBrains Mono", monospace'; ctx.fillText(v, 300, y + 36);
  });
}

function buildInterior() {
  const g = system('interior', 0xff7a1a);
  const { M } = g.userData;
  g.userData.set.uGlowColor.value.multiplyScalar(0.3); // big flat trim panels would over-glow
  for (const z of [0.36, -0.36]) {
    const fs = seat(M, true, M.fabric); fs.position.set(-0.2, 0.29, z); g.add(fs);
    const rs = seat(M, false, M.fabric); rs.position.set(-0.98, 0.34, z * 0.95); g.add(rs);
  }
  g.add(mesh(rbox(0.36, 0.2, 1.4, 0.05), M.black, V(0.52, 0.82, 0)));                   // dash
  g.add(mesh(rbox(0.14, 0.12, 0.4, 0.04), M.black, V(0.38, 0.94, 0.36)));               // binnacle
  // MFD: 5.8-inch screen on top of the centre stack
  const canvas = document.createElement('canvas');
  canvas.width = MFD_W; canvas.height = MFD_H;
  const ctx = canvas.getContext('2d');
  drawMFD(ctx, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mfdMat = focusMaterial(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.4, roughness: 0.25 }), g.userData.set);
  const mfd = new THREE.Mesh(new THREE.PlaneGeometry(0.128, 0.075), mfdMat);
  mfd.rotation.set(0, -PI / 2, 0);
  mfd.position.set(0.386, 0.96, 0);
  g.add(mfd);
  g.add(mesh(rbox(0.02, 0.095, 0.15, 0.008), M.black, V(0.4, 0.96, 0)));                // bezel
  g.add(mesh(rbox(0.06, 0.02, 0.16, 0.008), M.black, V(0.41, 1.012, 0)));               // sun hood
  g.add(mesh(rbox(0.95, 0.19, 0.2, 0.04), M.black, V(-0.05, 0.41, 0)));                 // console
  const sw = steeringWheel(M);
  sw.position.set(0.18, 0.85, 0.36);
  sw.rotation.set(0, PI / 2, 0);
  sw.rotateX(-0.3);
  g.add(sw);
  g.add(rod(V(0.2, 0.84, 0.36), V(0.44, 0.92, 0.36), 0.025, 0.03, 16, M.black));
  g.userData.mfd = { ctx, tex };
  g.userData.anchor = V(0.386, 0.96, 0);
  return g;
}

export function buildAnatomy() {
  return {
    engine: buildEngine(),
    turbos: buildTurbos(),
    cooling: buildCooling(),
    gearbox: buildGearbox(),
    awd: buildAWD(),
    suspension: buildSuspension(),
    exhaust: buildExhaust(),
    chassis: buildChassis(),
    interior: buildInterior(),
  };
}

/** per-frame extras: live MFD readouts while the screen is in focus */
export function animate({ t, systems }) {
  const { ctx, tex } = systems.interior.userData.mfd;
  drawMFD(ctx, t);
  tex.needsUpdate = true;
}
