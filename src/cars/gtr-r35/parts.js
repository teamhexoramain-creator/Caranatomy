// Mechanical anatomy of the R35, built from primitives at real-world positions
// (car space: +X front, +Y up, +Z right, metres). Each system is its own group
// with its own focus set so the timeline can explode, glow and dim it.
import * as THREE from 'three';
import { focusMaterial } from '../../materials.js';
import { V, mesh, rbox, rod, tube, latheX } from '../../geo.js';
import { system, plaqueTexture, turboUnit, cvBoot, coilover, seat, steeringWheel } from '../../partsKit.js';

const PI = Math.PI;

// ------------------------------------------------------------------ engine
function buildEngine() {
  const g = system('engine', 0xff7a1a);
  const { M } = g.userData;
  const crank = V(1.24, 0.42, 0);
  // crankcase + oil pan with cooling fins
  g.add(mesh(rbox(0.54, 0.2, 0.44, 0.03), M.castAlu, V(1.24, 0.34, 0)));
  g.add(mesh(rbox(0.46, 0.11, 0.34, 0.025), M.castAlu, V(1.22, 0.205, 0)));
  for (let i = 0; i < 7; i++) g.add(mesh(rbox(0.42, 0.012, 0.012, 0.004), M.castAlu, V(1.22, 0.152, -0.15 + i * 0.05)));
  for (const s of [1, -1]) {
    const rot = [s * PI / 6, 0, 0];
    const dir = V(0, Math.cos(PI / 6), s * Math.sin(PI / 6));
    const at = (d) => crank.clone().addScaledVector(dir, d);
    g.add(mesh(rbox(0.54, 0.22, 0.2, 0.02), M.castAlu, at(0.17), rot));         // cylinder bank
    g.add(mesh(rbox(0.56, 0.11, 0.22, 0.02), M.castAlu, at(0.335), rot));       // head
    g.add(mesh(rbox(0.55, 0.06, 0.205, 0.028), M.crinkleBlack, at(0.415), rot)); // cam cover
    g.add(mesh(rbox(0.5, 0.008, 0.02, 0.004), M.red, at(0.447).add(V(0, 0, -s * 0.07)), rot));
    for (let i = 0; i < 3; i++) {                                                // coil packs
      const p = at(0.455).add(V(1.06 + i * 0.13 - 1.24, 0, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.035, 16), M.black, p, rot));
    }
    // exhaust manifold: three runners into a collector at the rear of each bank
    const side = s * 0.30;
    for (let i = 0; i < 3; i++) {
      const x = 1.08 + i * 0.15;
      g.add(tube([V(x, 0.56, side), V(x - 0.02, 0.50, side + s * 0.06), V(x - 0.06, 0.42, side + s * 0.08), V(0.99, 0.38, s * 0.38)], 0.019, M.steel, { seg: 24, radial: 10 }));
    }
  }
  // intake plenum + plaque + throttle bodies
  g.add(mesh(rbox(0.5, 0.1, 0.27, 0.045), M.alu, V(1.24, 0.775, 0)));
  for (let i = 0; i < 6; i++) g.add(mesh(rbox(0.045, 0.05, 0.3, 0.015), M.alu, V(1.06 + i * 0.072, 0.735, 0)));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.0625), focusMaterial(new THREE.MeshStandardMaterial({ map: plaqueTexture('VR38DETT', 'HAND BUILT BY TAKUMI'), metalness: 0.6, roughness: 0.35 }), g.userData.set));
  plaque.rotation.set(-PI / 2, 0, PI / 2);
  plaque.position.set(1.24, 0.8265, 0);
  g.add(plaque);
  for (const s of [1, -1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.07, 28), M.alu, V(1.52, 0.765, s * 0.075), [0, 0, PI / 2]));
    g.add(mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.012, 28), M.darkMetal, V(1.555, 0.765, s * 0.075), [0, 0, PI / 2]));
  }
  // front: timing cover, accessory drive, belt
  g.add(mesh(rbox(0.05, 0.42, 0.46, 0.02), M.castAlu, V(1.535, 0.52, 0)));
  const pulleys = [[V(1.585, 0.38, 0), 0.085], [V(1.585, 0.66, 0.2), 0.055], [V(1.585, 0.3, -0.21), 0.06], [V(1.585, 0.62, -0.1), 0.04], [V(1.585, 0.53, 0.06), 0.035]];
  for (const [p, r] of pulleys) {
    g.add(mesh(new THREE.CylinderGeometry(r, r, 0.035, 36), M.steel, p, [0, 0, PI / 2]));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.04, 16), M.darkMetal, p, [0, 0, PI / 2]));
  }
  g.add(mesh(rbox(0.16, 0.12, 0.12, 0.03), M.castAlu, V(1.5, 0.66, 0.2)));   // alternator
  g.add(mesh(rbox(0.16, 0.13, 0.13, 0.03), M.castAlu, V(1.5, 0.3, -0.21)));  // a/c compressor
  const beltPts = [V(1.585, 0.47, 0.02), V(1.585, 0.7, 0.24), V(1.585, 0.66, 0.16), V(1.585, 0.66, -0.12), V(1.585, 0.36, -0.27), V(1.585, 0.24, -0.18), V(1.585, 0.3, 0.06)];
  g.add(tube(beltPts, 0.007, M.rubber, { closed: true, seg: 80, radial: 6 }));
  // bell housing flange
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 48), M.castAlu, V(0.965, 0.42, 0), [0, 0, PI / 2]));
  g.userData.anchor = V(1.24, 0.84, 0);
  return g;
}

// ------------------------------------------------------------------ turbos
function buildTurbos() {
  const g = system('turbos', 0xff7a1a);
  const { M } = g.userData;
  g.userData.hot = M.hot;
  for (const s of [1, -1]) g.add(turboUnit(M, s));
  g.userData.anchor = V(0.97, 0.47, 0.37);
  return g;
}

// ------------------------------------------------------------------ cooling + charge air
function buildCooling() {
  const g = system('cooling', 0xff7a1a);
  const { M } = g.userData;
  const rad = new THREE.Group();
  rad.add(mesh(rbox(0.04, 0.4, 0.74, 0.004), M.fins));
  rad.add(mesh(rbox(0.05, 0.42, 0.05, 0.01), M.black, V(0, 0, 0.395)));
  rad.add(mesh(rbox(0.05, 0.42, 0.05, 0.01), M.black, V(0, 0, -0.395)));
  rad.add(mesh(rbox(0.05, 0.03, 0.84, 0.01), M.black, V(0, 0.215, 0)));
  for (const s of [1, -1]) {
    rad.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 40, 1, true), M.black, V(-0.055, 0, s * 0.19), [0, 0, PI / 2]));
    for (let i = 0; i < 7; i++) rad.add(mesh(new THREE.BoxGeometry(0.012, 0.15, 0.05), M.black, V(-0.06, 0, s * 0.19), [i * 2 * PI / 7, 0, 0]));
  }
  rad.position.set(2.17, 0.46, 0);
  rad.rotation.z = 0.22;
  g.add(rad);
  for (const s of [1, -1]) {
    const ic = new THREE.Group();
    ic.add(mesh(rbox(0.06, 0.22, 0.28, 0.006), M.fins));
    ic.add(mesh(rbox(0.07, 0.24, 0.04, 0.012), M.alu, V(0, 0, 0.16)));
    ic.add(mesh(rbox(0.07, 0.24, 0.04, 0.012), M.alu, V(0, 0, -0.16)));
    ic.position.set(2.12, 0.33, s * 0.64);
    ic.rotation.y = s * 0.45;
    g.add(ic);
    // compressor outlet -> intercooler -> throttle body
    g.add(tube([V(1.06, 0.4, s * 0.43), V(1.25, 0.27, s * 0.47), V(1.7, 0.26, s * 0.55), V(2.02, 0.32, s * 0.72)], 0.032, M.alu, { seg: 48 }));
    g.add(tube([V(2.03, 0.36, s * 0.54), V(1.92, 0.52, s * 0.42), V(1.75, 0.7, s * 0.24), V(1.6, 0.765, s * 0.075)], 0.036, M.alu, { seg: 48 }));
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 20), M.black, V(1.88, 0.56, s * 0.39), [0.5 * s, 0, 0.9]));
    // air box + inlet to compressor
    g.add(mesh(rbox(0.26, 0.14, 0.2, 0.03), M.hdpe, V(1.82, 0.62, s * 0.62)));
    g.add(tube([V(1.7, 0.6, s * 0.6), V(1.4, 0.56, s * 0.56), V(1.2, 0.46, s * 0.47), V(1.13, 0.37, s * 0.37)], 0.04, M.black, { seg: 40 }));
  }
  g.userData.anchor = V(2.17, 0.68, 0);
  return g;
}

// ------------------------------------------------------------------ transaxle
function buildTransaxle() {
  const g = system('transaxle', 0xff7a1a);
  const { M } = g.userData;
  g.add(mesh(latheX([[0.0, -1.19], [0.16, -1.19], [0.18, -1.06], [0.17, -0.99], [0.06, -0.97]], 48), M.castAlu, V(0, 0.37, 0)));
  g.add(mesh(rbox(0.36, 0.3, 0.34, 0.05), M.castAlu, V(-1.3, 0.39, 0)));
  for (let i = 0; i < 5; i++) g.add(mesh(rbox(0.012, 0.28, 0.36, 0.004), M.castAlu, V(-1.19 - i * 0.055, 0.39, 0)));
  g.add(mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.42, 48), M.castAlu, V(-1.41, 0.355, 0), [PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 32), M.darkMetal, V(-1.41, 0.355, 0), [PI / 2, 0, 0]));
  g.add(mesh(rbox(0.2, 0.22, 0.3, 0.04), M.darkMetal, V(-1.62, 0.41, 0)));
  g.add(mesh(rbox(0.12, 0.05, 0.2, 0.01), M.red, V(-1.62, 0.53, 0)));
  g.add(mesh(rbox(0.22, 0.15, 0.13, 0.03), M.castAlu, V(-1.08, 0.27, 0.17)));   // transfer case
  g.add(tube([V(-1.5, 0.52, 0.1), V(-1.2, 0.58, 0.1), V(-0.98, 0.5, 0.15)], 0.007, M.steel, { seg: 20, radial: 6 }));
  g.add(tube([V(-1.5, 0.52, -0.1), V(-1.2, 0.58, -0.1), V(-0.98, 0.5, -0.15)], 0.007, M.steel, { seg: 20, radial: 6 }));
  g.userData.anchor = V(-1.3, 0.56, 0);
  return g;
}

// ------------------------------------------------------------------ AWD driveline
function buildAWD() {
  const g = system('awd', 0x4fb0ff);
  const { M } = g.userData;
  const main = rod(V(0.95, 0.42, 0), V(-0.97, 0.37, 0), 0.042, 0.042, 32, M.carbon);
  // stretch the weave along the shaft
  g.add(main);
  for (const p of [V(0.93, 0.42, 0), V(-0.95, 0.37, 0)]) g.add(mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 32), M.alu, p, [0, 0, PI / 2]));
  g.add(rod(V(-1.0, 0.27, 0.17), V(1.3, 0.3, 0.2), 0.026, 0.026, 20, M.steel));
  g.add(mesh(rbox(0.06, 0.06, 0.08, 0.015), M.black, V(0.15, 0.285, 0.185)));
  g.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.17, 36), M.castAlu, V(1.39, 0.33, 0.22), [PI / 2, 0, 0]));
  // half shafts with CV boots
  const shafts = [
    [V(1.39, 0.34, 0.05), V(1.39, 0.355, -0.66)], [V(1.39, 0.34, 0.31), V(1.39, 0.355, 0.66)],
    [V(-1.41, 0.355, -0.21), V(-1.39, 0.355, -0.66)], [V(-1.41, 0.355, 0.21), V(-1.39, 0.355, 0.66)],
  ];
  for (const [a, b] of shafts) {
    g.add(rod(a, b, 0.017, 0.017, 16, M.steel));
    const d = new THREE.Vector3().subVectors(b, a).normalize();
    g.add(cvBoot(M, a.clone().addScaledVector(d, 0.02), a.clone().addScaledVector(d, 0.1)));
    g.add(cvBoot(M, b.clone().addScaledVector(d, -0.03), b.clone().addScaledVector(d, -0.12)));
  }
  // torque-flow paths (used by the timeline for animated energy pulses)
  g.userData.flows = [
    { pts: [V(1.0, 0.42, 0), V(-0.97, 0.37, 0), V(-1.3, 0.38, 0)], start: 0, len: 1 },
    { pts: [V(-1.41, 0.355, 0.05), V(-1.39, 0.355, 0.7)], start: 1, len: 0.4 },
    { pts: [V(-1.41, 0.355, -0.05), V(-1.39, 0.355, -0.7)], start: 1, len: 0.4 },
    { pts: [V(-1.08, 0.27, 0.17), V(1.3, 0.3, 0.2), V(1.39, 0.33, 0.22)], start: 1, len: 1 },
    { pts: [V(1.39, 0.34, 0.22), V(1.39, 0.355, 0.7)], start: 2, len: 0.35 },
    { pts: [V(1.39, 0.34, 0.22), V(1.39, 0.355, -0.7)], start: 2, len: 0.45 },
  ];
  g.userData.anchor = V(0.0, 0.45, 0);
  return g;
}

// ------------------------------------------------------------------ suspension
function buildSuspension() {
  const g = system('suspension', 0xff7a1a);
  const { M } = g.userData;
  for (const s of [1, -1]) {
    // front: double wishbone
    const fx = 1.39;
    g.add(mesh(rbox(0.07, 0.38, 0.07, 0.02), M.castAlu, V(fx, 0.4, s * 0.65)));
    for (const dx of [-0.2, 0.2]) g.add(rod(V(fx + dx, 0.19, s * 0.34), V(fx, 0.19, s * 0.66), 0.016, 0.014, 14, M.alu));
    for (const dx of [-0.11, 0.11]) g.add(rod(V(fx + dx, 0.63, s * 0.46), V(fx, 0.6, s * 0.63), 0.013, 0.011, 14, M.alu));
    g.add(rod(V(1.56, 0.3, s * 0.24), V(1.5, 0.3, s * 0.64), 0.009, 0.009, 10, M.steel));
    g.add(coilover(M, V(1.27, 0.21, s * 0.6), V(1.25, 0.77, s * 0.5)));
    // rear: multi-link
    const rx = -1.39;
    g.add(mesh(rbox(0.07, 0.36, 0.07, 0.02), M.castAlu, V(rx, 0.4, s * 0.65)));
    for (const dx of [-0.22, 0.2]) g.add(rod(V(rx + dx, 0.2, s * 0.36), V(rx, 0.19, s * 0.66), 0.015, 0.013, 14, M.alu));
    for (const dx of [-0.13, 0.12]) g.add(rod(V(rx + dx, 0.62, s * 0.42), V(rx, 0.6, s * 0.63), 0.011, 0.01, 12, M.alu));
    g.add(rod(V(-1.6, 0.28, s * 0.33), V(-1.53, 0.29, s * 0.64), 0.009, 0.009, 10, M.steel));
    g.add(coilover(M, V(-1.52, 0.21, s * 0.6), V(-1.55, 0.77, s * 0.52)));
  }
  // anti-roll bars
  g.add(tube([V(1.3, 0.2, -0.58), V(1.6, 0.23, -0.5), V(1.62, 0.24, 0), V(1.6, 0.23, 0.5), V(1.3, 0.2, 0.58)], 0.013, M.spring, { seg: 60 }));
  g.add(tube([V(-1.25, 0.24, -0.56), V(-1.66, 0.26, -0.48), V(-1.68, 0.27, 0), V(-1.66, 0.26, 0.48), V(-1.25, 0.24, 0.56)], 0.011, M.spring, { seg: 60 }));
  g.userData.anchor = V(1.26, 0.78, 0.5);
  return g;
}

// ------------------------------------------------------------------ exhaust
function buildExhaust() {
  const g = system('exhaust', 0xff7a1a);
  const { M } = g.userData;
  for (const s of [1, -1]) {
    const path = [V(0.92, 0.34, s * 0.38), V(0.82, 0.2, s * 0.3), V(0.6, 0.165, s * 0.21), V(-0.2, 0.165, s * 0.21),
      V(-0.85, 0.17, s * 0.22), V(-1.1, 0.2, s * 0.3), V(-1.6, 0.235, s * 0.4), V(-1.86, 0.27, s * 0.45)];
    g.add(tube(path, 0.031, M.steel, { seg: 120 }));
    g.add(mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.32, 28), M.titanium, V(0.25, 0.165, s * 0.21), [0, 0, PI / 2]));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 28), M.titanium, V(-0.55, 0.168, s * 0.215), [0, 0, PI / 2]));
    for (const z of [0.535, 0.675]) {
      g.add(rod(V(-2.05, 0.29, s * z), V(-2.3, 0.295, s * z), 0.045, 0.05, 28, M.titanium));
      g.add(mesh(latheX([[0.05, 0], [0.054, 0.004], [0.054, 0.012], [0.046, 0.012], [0.046, -0.02]], 32), M.titanium, V(-2.31, 0.295, s * z), [0, PI, 0]));
    }
  }
  g.add(mesh(rbox(0.26, 0.17, 1.3, 0.06), M.titanium, V(-1.97, 0.285, 0)));
  M.titanium.side = THREE.DoubleSide;
  g.userData.anchor = V(-1.97, 0.37, 0);
  return g;
}

// ------------------------------------------------------------------ chassis (PM platform)
function buildChassis() {
  const g = system('chassis', 0xff7a1a);
  const { M } = g.userData;
  g.add(mesh(rbox(1.9, 0.025, 1.52, 0.01), M.chassis, V(-0.13, 0.16, 0)));
  const tunnel = new THREE.CylinderGeometry(0.17, 0.17, 1.85, 32, 1, true, -PI / 2, PI);
  g.add(mesh(tunnel, M.chassis, V(-0.12, 0.27, 0), [0, 0, PI / 2]));
  g.children[g.children.length - 1].material.side = THREE.DoubleSide;
  for (const s of [1, -1]) {
    g.add(mesh(rbox(1.95, 0.16, 0.12, 0.03), M.chassis, V(-0.12, 0.245, s * 0.79)));     // sills
    g.add(mesh(rbox(1.45, 0.11, 0.08, 0.02), M.chassis, V(1.52, 0.36, s * 0.5)));        // front rails
    g.add(mesh(rbox(1.15, 0.1, 0.08, 0.02), M.chassis, V(-1.68, 0.47, s * 0.56)));       // rear rails
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.24, 32), M.castAlu, V(1.25, 0.7, s * 0.5)));  // strut towers
    // safety cell: hinge pillar, A pillar, roof rail, B and C pillars
    const cage = [V(0.68, 0.3, s * 0.8), V(0.63, 0.95, s * 0.77), V(-0.16, 1.31, s * 0.6), V(-0.95, 1.33, s * 0.6), V(-1.75, 1.04, s * 0.68)];
    g.add(tube(cage, 0.026, M.chassis, { seg: 80, tension: 0.2 }));
    g.add(tube([V(-0.64, 0.3, s * 0.8), V(-0.64, 1.0, s * 0.8), V(-0.64, 1.31, s * 0.62)], 0.026, M.chassis, { seg: 30 }));
    g.add(tube([V(-1.75, 1.04, s * 0.68), V(-2.0, 1.0, s * 0.7), V(-2.2, 0.55, s * 0.62)], 0.022, M.chassis, { seg: 30 }));
    // fuel tank halves (saddle tank under the rear seat)
    g.add(mesh(rbox(0.34, 0.2, 0.42, 0.05), M.hdpe, V(-0.9, 0.3, s * 0.4)));
  }
  g.add(rod(V(1.25, 0.8, -0.5), V(1.25, 0.8, 0.5), 0.018, 0.018, 16, M.alu));            // strut brace
  g.add(rod(V(-0.16, 1.31, -0.6), V(-0.16, 1.31, 0.6), 0.024, 0.024, 16, M.chassis));    // header
  g.add(rod(V(-0.95, 1.33, -0.6), V(-0.95, 1.33, 0.6), 0.024, 0.024, 16, M.chassis));
  g.add(mesh(rbox(0.03, 0.62, 1.4, 0.01), M.chassis, V(0.78, 0.52, 0)));                 // bulkhead
  g.add(mesh(rbox(0.09, 0.1, 1.36, 0.03), M.alu, V(2.27, 0.42, 0)));                     // crash beams
  g.add(mesh(rbox(0.08, 0.1, 1.3, 0.03), M.alu, V(-2.24, 0.47, 0)));
  g.add(mesh(rbox(1.15, 0.02, 1.25, 0.01), M.chassis, V(-1.7, 0.57, 0)));                 // boot floor
  // front sub-frame
  g.add(rod(V(1.15, 0.19, -0.36), V(1.15, 0.19, 0.36), 0.025, 0.025, 14, M.castAlu));
  g.add(rod(V(1.62, 0.2, -0.36), V(1.62, 0.2, 0.36), 0.025, 0.025, 14, M.castAlu));
  // battery in the boot
  g.add(mesh(rbox(0.25, 0.18, 0.17, 0.015), M.black, V(-2.0, 0.67, 0.48)));
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), M.red, V(-1.93, 0.77, 0.43)));
  g.userData.anchor = V(-0.6, 1.33, 0.6);
  return g;
}

// ------------------------------------------------------------------ interior
function buildInterior() {
  const g = system('interior', 0xff7a1a);
  const { M } = g.userData;
  for (const z of [0.38, -0.38]) {
    const fs = seat(M, true); fs.position.set(-0.22, 0.3, z); g.add(fs);
    const rs = seat(M, false); rs.position.set(-1.0, 0.36, z * 0.95); g.add(rs);
  }
  g.add(mesh(rbox(0.36, 0.2, 1.46, 0.06), M.leather, V(0.5, 0.83, 0)));
  g.add(mesh(rbox(0.14, 0.12, 0.42, 0.04), M.black, V(0.36, 0.95, 0.38)));
  const scr = mesh(new THREE.PlaneGeometry(0.2, 0.12), M.screen, V(0.4, 0.88, 0), [0, -PI / 2, 0]);
  scr.rotation.order = 'YXZ'; scr.rotation.set(-0.35, -PI / 2, 0);
  g.add(scr);
  g.add(mesh(rbox(0.95, 0.2, 0.22, 0.04), M.leather, V(-0.05, 0.42, 0)));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 10), M.chrome, V(0.12, 0.56, 0)));
  // RHD steering wheel + column + paddles
  const sw = steeringWheel(M);
  sw.position.set(0.16, 0.86, 0.38);
  sw.rotation.set(0, PI / 2, 0);
  sw.rotateX(-0.35);
  g.add(sw);
  g.add(rod(V(0.18, 0.85, 0.38), V(0.42, 0.93, 0.38), 0.025, 0.03, 16, M.black));
  g.userData.anchor = V(-0.35, 1.12, 0.38);
  return g;
}

export function buildAnatomy() {
  const systems = {
    engine: buildEngine(),
    turbos: buildTurbos(),
    cooling: buildCooling(),
    transaxle: buildTransaxle(),
    awd: buildAWD(),
    suspension: buildSuspension(),
    exhaust: buildExhaust(),
    chassis: buildChassis(),
    interior: buildInterior(),
  };
  return systems;
}
