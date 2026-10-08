// Nissan Skyline GT-R R34 (BNR34 V-spec): geometry, finish and anatomy used by EP.02.
import * as masks from './masks.js';
import { buildAnatomy, animate } from './parts.js';

export default {
  id: 'skyline-r34',
  bodyAsset: 'public/assets/skyline-r34.bin',
  paint: 0x1b4fb8, // Bayside Blue
  paintOpts: { metalness: 0.5, roughness: 0.3 },
  masks: { id: 'skyline-r34', GLSL: masks.BODY_MASKS_GLSL, glassDistance: masks.glassDistance },
  axles: { front: 1.3325, rear: -1.3325 },
  wheelY: 0.3265,
  track: { front: 1.48, rear: 1.49 },
  wheels: {
    rimR: 0.2286, tyreR: 0.3265, spokes: 5, split: [0.06, 0.17],
    rimColor: 0x3a3e45, caliperColor: 0xc9a227, caliperMetal: 0.6, drilled: false,
    front: { width: 0.245, discR: 0.162, discT: 0.032, discInner: 0.104, calSpan: 1.05, calDepth: 0.075 },
    rear: { width: 0.245, discR: 0.15, discT: 0.022, discInner: 0.096, calSpan: 0.85, calDepth: 0.06 },
  },
  contactShadow: [2.35, 5.2],
  brakeAnchor: [-0.14, 0.11, -0.03],
  buildAnatomy,
  animate,
  explode: {
    body: [0, 3.4, 0],
    interior: [0, 2.12, 0],
    chassis: [0, 2.05, 0],
    cooling: [0.35, 1.25, 0],
    engine: [0, 1.25, 0],
    turbos: [0, 1.25, 0.22],
    gearbox: [-0.18, 1.05, 0],
    awd: [0, 1.05, 0],
    exhaust: [0, 0.7, 0],
    suspension: [0, 0, 0],
    wheels: [0, 0, 0.42],
  },
  explodeOrder: ['body', 'interior', 'chassis', 'cooling', 'engine', 'turbos', 'gearbox', 'awd', 'exhaust', 'wheels'],
};
