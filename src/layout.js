// Exploded-view helper: every system lifts into its own layer (per-car offsets
// in src/cars/*/car.js) so the whole car reads top-to-bottom in a 9:16 frame.
import * as THREE from 'three';

export function offsetFor(explode, name, k, side = 1) {
  const o = explode[name] || [0, 0, 0];
  return new THREE.Vector3(o[0] * k, o[1] * k, o[2] * k * side);
}
