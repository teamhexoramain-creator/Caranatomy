// EP.02 — Nissan Skyline GT-R R34 (BNR34).
import car from '../cars/skyline-r34/car.js';
import { DEFAULT_T, segTimeFor, segmentCameraKeys, standardCues } from '../storyKit.js';

const T = { ...DEFAULT_T };
const DURATION = 50;

const SEGMENTS = [
  {
    sys: 'engine', idx: '01', title: 'RB26DETT', sub: '2.6L INLINE-SIX TWIN-TURBO',
    stats: [[280, 'PS'], [392, 'Nm'], [2568, 'cc']],
    note: 'Six individual throttle bodies, one per cylinder',
    si: 'සිලින්ඩර් හයටම වෙන වෙනම throttle body හයක්',
    pop: [1.5, 0.35, 1.6],
    cam: { tgt: [2.7, 2.05, 1.6], dist: 4.4, az: [28, 50], el: 22, fov: 32 },
  },
  {
    sys: 'turbos', idx: '02', title: 'TWIN TURBOS', sub: 'PARALLEL · THREE CYLINDERS EACH',
    stats: [[2, 'TURBOS'], [3, 'CYL. PER TURBO'], [6, 'CYLINDERS']],
    note: 'Front three cylinders spin one turbo, rear three the other',
    si: 'ඉස්සරහ සිලින්ඩර් තුනට එක ටර්බෝ එකක්, පිටිපස්සේ තුනට අනිත් එක',
    pop: [1.7, 0.4, 1.0],
    cam: { tgt: [2.88, 2.09, 1.55], dist: 3.1, az: [72, 88], el: 14, fov: 32 },
  },
  {
    sys: 'gearbox', idx: '03', title: 'GETRAG 6-SPEED', sub: 'MANUAL GEARBOX · AWD TRANSFER CASE',
    stats: [[6, 'SPEEDS'], ['MT', 'MANUAL'], [2, 'OUTPUT SHAFTS']],
    note: 'Transfer case sends drive forward to a second propeller shaft',
    si: 'අතින් මාරු කරන හය-ස්පීඩ් ගියර් පෙට්ටියක්',
    pop: [0.3, 0.35, 1.6],
    cam: { tgt: [0.44, 1.78, 1.6], dist: 3.6, az: [36, 58], el: 22, fov: 32 },
  },
  {
    sys: 'awd', idx: '04', title: 'ATTESA E-TS PRO', sub: 'AWD + ACTIVE REAR LSD (V-SPEC)',
    split: true,
    note: 'Active LSD shuffles torque between the rear wheels',
    si: 'ග්‍රිප් අඩු වෙද්දී ඉස්සරහ රෝදවලටත් බලය යවනවා',
    pop: [0.0, 0.35, 1.55],
    cam: { tgt: [-0.1, 1.73, 1.55], dist: 6.8, az: [50, 66], el: 36, fov: 32 },
  },
  {
    sys: 'brakes', idx: '05', title: 'BREMBO', sub: '4-PISTON FRONT · 2-PISTON REAR',
    stats: [[324, 'mm FRONT'], [300, 'mm REAR'], [4, 'PISTONS']],
    note: 'Ventilated discs on all four corners',
    si: 'ඉහළ වේගයෙන් වුණත් ඉක්මනින් නවත්වන්න',
    cam: { tgt: [1.33, 0.4, 1.16], dist: 2.6, az: [26, 42], el: 12, fov: 32 },
  },
  {
    sys: 'interior', idx: '06', title: 'MFD', sub: 'MULTI-FUNCTION DISPLAY · 5.8-INCH LCD',
    stats: [['5.8', 'INCH SCREEN'], [7, 'LIVE READOUTS']],
    note: 'Boost, oil & water temperature, throttle position and more',
    si: 'Boost, තෙල් සහ වතුර උෂ්ණත්වය live බලන්න පුළුවන්',
    pop: [0.25, 0.25, 1.7],
    cam: { tgt: [0.64, 3.32, 1.7], dist: 0.78, az: [162, 175], el: 17, fov: 32 },
  },
];

const segTime = segTimeFor(T);

const CAMERA_KEYS = [
  { t: 0.0, tgt: [1.1, 0.52, 0], dist: 6.0, az: 24, el: 3.5, fov: 30, shift: -0.13 },
  { t: 3.0, tgt: [0.55, 0.58, 0], dist: 7.4, az: 44, el: 6, fov: 30, shift: -0.12 },
  { t: 6.0, tgt: [0.0, 0.64, 0], dist: 15.0, az: 78, el: 10, fov: 30, shift: -0.07 },
  { t: 8.6, tgt: [0.0, 0.7, 0], dist: 15.5, az: 96, el: 14, fov: 30, shift: -0.07 },
  { t: 11.3, tgt: [0.1, 2.22, 0], dist: 15.8, az: 42, el: 17, fov: 30, shift: -0.1 },
  { t: 12.5, tgt: [0.1, 2.22, 0], dist: 15.6, az: 37, el: 17, fov: 30, shift: -0.1 },
  ...segmentCameraKeys(SEGMENTS, segTime),
  { t: T.reassemble + 0.9, tgt: [0.1, 2.22, 0], dist: 15.6, az: 30, el: 17, fov: 30, shift: -0.1 },
  { t: T.scanBack[0] + 0.2, tgt: [0.0, 0.72, 0], dist: 9.8, az: 52, el: 10, fov: 30, shift: -0.06 },
  { t: T.outro + 0.2, tgt: [0.1, 0.6, 0], dist: 9.0, az: 74, el: 7, fov: 30, shift: -0.02 },
  { t: 47.6, tgt: [-0.4, 0.6, 0], dist: 8.4, az: 152, el: 6, fov: 30, shift: -0.02 },
  { t: DURATION, tgt: [-0.5, 0.6, 0], dist: 8.8, az: 166, el: 5, fov: 30, shift: -0.02 },
];

export default {
  id: 'ep02',
  label: 'EP.02',
  car,
  fps: 30,
  duration: DURATION,
  T,
  segments: SEGMENTS,
  segTime,
  cameraKeys: CAMERA_KEYS,
  cues: () => standardCues(T, SEGMENTS, segTime),
  music: { seed: 34, transpose: -2 },
  text: {
    make: 'NISSAN SKYLINE',
    model: 'GT-R',
    badge: 'R34',
    nick: '“THE JDM LEGEND”',
    hook: 'R34 එක ඇතුළේ මොනවද තියෙන්නේ?',
    brand: 'SKYLINE GT-R <span>R34</span> · ANATOMY',
    outroSpecs: [['280', 'PS'], ['392', 'NM'], ['RB26', 'I6 TWIN-TURBO'], ['AWD', 'E-TS PRO']],
    disclaimer: 'Fan-made 3D illustration · not affiliated with Nissan · specs: Skyline GT-R R34 (1999–2002)',
  },
};
