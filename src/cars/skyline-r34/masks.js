// Per-pixel material regions of the Skyline GT-R R34 shell (see maskKit.js).
import { polygonsGLSL, MASK_COMMON_GLSL, sdPolyJS } from '../../maskKit.js';

// Outlines in car space: DLO/DOOR in side view (x, y); WS/RS in top view (x, z); HL in top view (x, |z|).
export const POLY = {
  DLO: [[0.6, 0.975], [-0.07, 1.236], [-0.86, 1.244], [-1.05, 1.19], [-1.26, 1.06], [-1.28, 1.022], [-0.62, 0.998], [0.25, 0.98]],
  WS: [[0.655, -0.655], [0.655, 0.655], [-0.03, 0.55], [-0.03, -0.55]],
  RS: [[-1.0, -0.47], [-1.0, 0.47], [-1.6, 0.42], [-1.6, -0.42]],
  DOOR: [[0.70, 0.975], [0.73, 0.42], [0.66, 0.235], [-0.58, 0.235], [-0.62, 1.0]],
  HL: [[2.36, 0.33], [2.345, 0.60], [2.26, 0.79], [2.12, 0.885], [2.03, 0.895], [2.02, 0.835], [2.12, 0.77], [2.19, 0.60], [2.215, 0.33]],
};

/** CPU twin of the glass term in bodyMasks() (without the B-pillar cut). */
export function glassDistance(x, y, z, nx, ny, nz) {
  const NK = 0.08, anz = Math.abs(nz);
  const side = Math.max(sdPolyJS(x, y, POLY.DLO), NK * (0.45 - anz), 0.9 - y);
  const ws = Math.max(sdPolyJS(x, z, POLY.WS), NK * (0.25 - ny), NK * (0.12 - nx), 0.93 - y);
  const rs = Math.max(sdPolyJS(x, z, POLY.RS), NK * (0.25 - ny), NK * (nx + 0.05), 1.0 - y);
  return Math.min(side, ws, rs);
}

export const BODY_MASKS_GLSL = /* glsl */`
const float ARCH_R = 0.362;
const float AXLE = 1.3325;
const float WHEEL_Y = 0.3265;
${polygonsGLSL(POLY)}
${MASK_COMMON_GLSL}
BodyMask bodyMasks(vec3 p, vec3 n) {
  BodyMask m;
  float x = p.x, y = p.y, z = p.z, az = abs(p.z);
  float anz = abs(n.z);
  // glass: frameless door glass + small quarter light, upright screen, raked rear screen
  float dlo = sdPoly8(vec2(x, y), DLO);
  float gSide = max3(dlo, NK * (0.45 - anz), 0.9 - y);
  float gWs = max4(sdPoly4(vec2(x, z), WS), NK * (0.25 - n.y), NK * (0.12 - n.x), 0.93 - y);
  float gRs = max4(sdPoly4(vec2(x, z), RS), NK * (0.25 - n.y), NK * (n.x + 0.05), 1.0 - y);
  float bpil = max(abs(x + 0.62) - 0.03, NK * (0.45 - anz));
  m.glass = max(min(min(gSide, gWs), gRs), -bpil);
  // satin black trim: window surround, B pillar, side skirts, front lip, rear diffuser, openings
  float upper = max(max(az - 0.30, abs(y - 0.66) - 0.035) - 0.004, 2.1 - x);
  float iw = 0.40 + 0.08 * (y - 0.22) / 0.28;
  float low = max(max(az - iw, abs(y - 0.36) - 0.14) - 0.004, 2.0 - x);
  float duct = max(max(abs(az - 0.68) - 0.10, abs(y - 0.30) - 0.065) - 0.004, 1.95 - x);
  float t = max3(dlo - 0.016, NK * (0.4 - anz), 0.9 - y);
  t = min(t, max3(bpil, 0.95 - y, y - 1.26));
  t = min(t, max3(y - 0.20, NK * (0.35 - anz), abs(x) - 0.95));
  t = min(t, max3(y - 0.16, NK * (0.2 - n.x), 2.0 - x));
  t = min(t, max3(y - 0.31, NK * (n.x + 0.25), x + 1.95));
  t = min(t, min(upper, min(low, duct)));
  float well = max(min(length(vec2(x - AXLE, y - WHEEL_Y)), length(vec2(x + AXLE, y - WHEEL_Y))) - ARCH_R - 0.01, az - 0.515);
  t = min(t, well);
  t = min(t, NK * (n.y + 0.5));
  m.trim = t;
  // mesh / intercooler face inside the openings
  m.mesh = min(upper + 0.008, min(low + 0.014, duct + 0.01));
  // red GT-R badge stripe in the upper grille
  m.chrome = max3(max(abs(z) - 0.055, abs(y - 0.66) - 0.012), 2.1 - x, -NK * n.x);
  // panel gaps
  float g = max3(abs(sdRRect(vec2(x, az), vec2(1.47, 0.0), vec2(0.75, 0.66), 0.08)), NK * (0.45 - n.y), 0.66 - x);
  g = min(g, max4(abs(sdPoly5(vec2(x, y), DOOR)), NK * (0.6 - anz), y - 0.97, abs(x) - 0.95));
  g = min(g, max3(abs(sdRRect(vec2(x, az), vec2(-1.945, 0.0), vec2(0.325, 0.62), 0.05)), NK * (0.4 - n.y), x + 1.62));
  g = min(g, max4(abs(sdRRect(vec2(x, y), vec2(-1.80, 0.79), vec2(0.075, 0.065), 0.02)), -z + 0.6, NK * (0.6 - anz), max(x + 1.6, -2.05 - x)));
  m.gap = g;
  // angular "squinting" headlamps: top-view outline + a lower edge that rises outboard
  float hlLow = 0.632 + 0.05 * clamp((az - 0.33) / 0.55, 0.0, 1.0);
  m.head = max4(sdPoly9(vec2(x, az), HL), hlLow - y, y - 0.80, NK * (-0.3 - n.y));
  m.drl = FAR;
  // four round tail lamps
  m.tail = min(length(vec2(az - 0.475, y - 0.875)), length(vec2(az - 0.69, y - 0.875)));
  m.tailOk = max(NK * (n.x + 0.3), x + 1.95);
  return m;
}
`;
