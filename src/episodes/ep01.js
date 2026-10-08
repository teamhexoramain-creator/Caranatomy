// EP.01 — Nissan GT-R R35 "Godzilla".
import car from '../cars/gtr-r35/car.js';
import { DEFAULT_T, segTimeFor, segmentCameraKeys, standardCues } from '../storyKit.js';

const T = { ...DEFAULT_T };
const DURATION = 50;

const SEGMENTS = [
  {
    sys: 'engine', idx: '01', title: 'VR38DETT', sub: '3.8L TWIN-TURBO V6',
    stats: [[570, 'PS'], [637, 'Nm'], [3799, 'cc']],
    note: 'Hand-assembled by a single Takumi craftsman',
    si: 'හැම එන්ජිමක්ම එකම ශිල්පියෙක් අතින් එකලස් කරනවා',
    pop: [1.5, 0.35, 1.6],
    cam: { tgt: [2.72, 2.06, 1.6], dist: 4.4, az: [28, 50], el: 22, fov: 32 },
  },
  {
    sys: 'turbos', idx: '02', title: 'TWIN TURBOS', sub: 'IHI · ONE PER CYLINDER BANK',
    stats: [[2, 'TURBOS'], [6, 'CYLINDERS'], ['60°', 'V-ANGLE']],
    note: 'Gold-foil heat shields wrap the red-hot turbine housings',
    si: 'සිලින්ඩර් පේළි දෙකට වෙන වෙනම ටර්බෝ දෙකක්',
    pop: [2.0, 0.42, 0.7],
    cam: { tgt: [2.78, 2.02, 0.7], dist: 2.9, az: [16, 34], el: 14, fov: 32 },
  },
  {
    sys: 'transaxle', idx: '03', title: 'GR6 TRANSAXLE', sub: '6-SPEED DUAL-CLUTCH · REAR-MOUNTED',
    stats: [[6, 'SPEEDS'], [2, 'CLUTCHES'], ['REAR', 'MOUNTED']],
    note: "World's first independent rear-transaxle AWD layout",
    si: 'ගියර් පෙට්ටිය පිටුපසට දාලා බර සමබර කරලා',
    pop: [-1.4, 0.35, 1.25],
    cam: { tgt: [-2.78, 1.8, 1.25], dist: 3.7, az: [146, 122], el: 24, fov: 32 },
  },
  {
    sys: 'awd', idx: '04', title: 'ATTESA E-TS', sub: 'INTELLIGENT ALL-WHEEL DRIVE',
    split: true,
    note: 'Carbon-fibre main propeller shaft',
    si: 'ග්‍රිප් අඩු වෙද්දී ඉස්සරහ රෝදවලටත් බලය යවනවා',
    pop: [0.0, 0.35, 1.55],
    cam: { tgt: [0.05, 1.72, 1.6], dist: 7.0, az: [50, 66], el: 36, fov: 32 },
  },
  {
    sys: 'brakes', idx: '05', title: 'BREMBO MONOBLOC', sub: '6-PISTON FRONT · 4-PISTON REAR',
    stats: [[390, 'mm FRONT'], [380, 'mm REAR'], [6, 'PISTONS']],
    note: 'Two-piece cross-drilled floating rotors',
    si: 'ඉහළ වේගයෙන් වුණත් ඉක්මනින් නවත්වන්න',
    cam: { tgt: [1.39, 0.42, 1.24], dist: 2.9, az: [26, 42], el: 12, fov: 32 },
  },
  {
    sys: 'suspension', idx: '06', title: 'DAMPTRONIC', sub: 'BILSTEIN ADAPTIVE DAMPERS',
    stats: [[3, 'DRIVE MODES'], [4, 'ADAPTIVE DAMPERS']],
    note: 'Double-wishbone front · multi-link rear',
    si: 'පාරට ගැලපෙන්න ඩැම්පර් තදකම ස්වයංක්‍රීයව මාරු වෙනවා',
    pop: [1.6, 0.3, 0.45],
    cam: { tgt: [2.96, 0.76, 0.86], dist: 3.6, az: [14, 34], el: 14, fov: 32 },
  },
];

const segTime = segTimeFor(T);

// Camera: orbit parameters around a target, with a vertical view shift so the
// subject sits above the spec card. az is measured from +X (front) towards +Z.
const CAMERA_KEYS = [
  { t: 0.0, tgt: [1.15, 0.55, 0], dist: 6.2, az: 24, el: 3.5, fov: 30, shift: -0.13 },
  { t: 3.0, tgt: [0.6, 0.6, 0], dist: 7.6, az: 44, el: 6, fov: 30, shift: -0.12 },
  { t: 6.0, tgt: [0.0, 0.66, 0], dist: 15.4, az: 78, el: 10, fov: 30, shift: -0.07 },
  { t: 8.6, tgt: [0.0, 0.72, 0], dist: 15.9, az: 96, el: 14, fov: 30, shift: -0.07 },
  { t: 11.3, tgt: [0.1, 2.25, 0], dist: 16.0, az: 42, el: 17, fov: 30, shift: -0.1 },
  { t: 12.5, tgt: [0.1, 2.25, 0], dist: 15.8, az: 37, el: 17, fov: 30, shift: -0.1 },
  ...segmentCameraKeys(SEGMENTS, segTime),
  { t: T.reassemble + 0.9, tgt: [0.1, 2.25, 0], dist: 15.8, az: 30, el: 17, fov: 30, shift: -0.1 },
  { t: T.scanBack[0] + 0.2, tgt: [0.0, 0.75, 0], dist: 10.0, az: 52, el: 10, fov: 30, shift: -0.06 },
  { t: T.outro + 0.2, tgt: [0.1, 0.62, 0], dist: 9.2, az: 74, el: 7, fov: 30, shift: -0.02 },
  { t: 47.6, tgt: [-0.4, 0.62, 0], dist: 8.6, az: 152, el: 6, fov: 30, shift: -0.02 },
  { t: DURATION, tgt: [-0.5, 0.62, 0], dist: 9.0, az: 166, el: 5, fov: 30, shift: -0.02 },
];

export default {
  id: 'ep01',
  label: 'EP.01',
  car,
  fps: 30,
  duration: DURATION,
  T,
  segments: SEGMENTS,
  segTime,
  cameraKeys: CAMERA_KEYS,
  cues: () => standardCues(T, SEGMENTS, segTime),
  music: { seed: 35, transpose: 0 },
  text: {
    make: 'NISSAN',
    model: 'GT-R',
    badge: 'R35',
    nick: '“GODZILLA”',
    hook: 'කාර් එකක් ඇතුළේ මොනවද තියෙන්නේ?',
    brand: 'GT-R <span>R35</span> · ANATOMY',
    outroSpecs: [['570', 'PS'], ['637', 'NM'], ['315', 'KM/H'], ['AWD', 'ATTESA']],
    disclaimer: 'Fan-made 3D illustration · not affiliated with Nissan · specs: GT-R R35 MY2017+',
  },
};
