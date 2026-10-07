// Exploded-view layout: every system lifts into its own layer so the whole car
// reads top-to-bottom in a vertical (9:16) frame.
import * as THREE from 'three';

export const EXPLODE = {
  body: [0, 3.45, 0],
  interior: [0, 2.12, 0],
  chassis: [0, 2.05, 0],
  cooling: [0.35, 1.25, 0],
  engine: [0, 1.25, 0],
  turbos: [-0.22, 1.25, 0],
  transaxle: [-0.1, 1.05, 0],
  awd: [0, 1.05, 0],
  exhaust: [0, 0.72, 0],
  suspension: [0, 0, 0],
  brakes: [0, 0, 0],
  wheels: [0, 0, 0.42], // applied with the side sign
};

// order in which systems leave the car (seconds of stagger in explode())
export const EXPLODE_ORDER = ['body', 'interior', 'chassis', 'cooling', 'engine', 'turbos', 'transaxle', 'awd', 'exhaust', 'wheels'];

export function offsetFor(name, k, side = 1) {
  const o = EXPLODE[name] || [0, 0, 0];
  return new THREE.Vector3(o[0] * k, o[1] * k, o[2] * k * side);
}
