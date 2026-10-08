// Nissan GT-R R35 (MY2017+): geometry, finish and anatomy used by EP.01.
import * as masks from './masks.js';
import { buildAnatomy } from './parts.js';

export default {
  id: 'gtr-r35',
  bodyAsset: 'public/assets/gtr-r35.bin',
  paint: 0x8a9097, // Ultimate Metal Silver
  paintOpts: {},
  masks: { id: 'gtr-r35', GLSL: masks.BODY_MASKS_GLSL, glassDistance: masks.glassDistance },
  axles: { front: 1.39, rear: -1.39 },
  wheelY: 0.355,
  track: { front: 1.59, rear: 1.6 },
  wheels: {
    rimR: 0.254, tyreR: 0.356, spokes: 6, split: [0.05, 0.135],
    rimColor: 0x24262a, caliperColor: 0xb3121b,
    front: { width: 0.255, discR: 0.195, discT: 0.034, calSpan: 1.2, calDepth: 0.085 },
    rear: { width: 0.285, discR: 0.19, discT: 0.03, calSpan: 1.0, calDepth: 0.07 },
  },
  contactShadow: [2.5, 5.4],
  brakeAnchor: [-0.17, 0.12, -0.03],
  buildAnatomy,
  // exploded-view layer offsets; wheels move outwards (z is applied with the side sign)
  explode: {
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
    wheels: [0, 0, 0.42],
  },
  explodeOrder: ['body', 'interior', 'chassis', 'cooling', 'engine', 'turbos', 'transaxle', 'awd', 'exhaust', 'wheels'],
};
