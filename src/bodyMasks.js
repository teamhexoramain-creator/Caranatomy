// Per-pixel material regions of the GT-R shell, evaluated from object-space
// position and normal. Every region is a signed distance in metres
// (negative = inside) so the shader can anti-alias the edges with fwidth().
const polyFn = (N) => /* glsl */`
float sdPoly${N}(vec2 p, vec2 v[${N}]) {
  float d = dot(p - v[0], p - v[0]); float s = 1.0;
  for (int i = 0, j = ${N - 1}; i < ${N}; j = i, i++) {
    vec2 e = v[j] - v[i]; vec2 w = p - v[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
  }
  return s * sqrt(d);
}`;

export const BODY_MASKS_GLSL = /* glsl */`
const float ARCH_R = 0.392;
const vec2 DLO[8] = vec2[8](vec2(0.545, 0.978), vec2(-0.06, 1.252), vec2(-0.93, 1.262), vec2(-1.13, 1.205),
  vec2(-1.305, 1.075), vec2(-1.33, 1.035), vec2(-0.62, 1.0), vec2(0.2, 0.985));
const vec2 WS[4] = vec2[4](vec2(0.585, -0.70), vec2(0.585, 0.70), vec2(-0.165, 0.575), vec2(-0.165, -0.575));
const vec2 RS[4] = vec2[4](vec2(-1.03, -0.50), vec2(-1.03, 0.50), vec2(-1.66, 0.45), vec2(-1.66, -0.45));
const vec2 DOOR[5] = vec2[5](vec2(0.655, 0.98), vec2(0.69, 0.40), vec2(0.62, 0.235), vec2(-0.60, 0.235), vec2(-0.64, 1.005));
const vec2 HL[10] = vec2[10](vec2(2.43, 0.40), vec2(2.39, 0.62), vec2(2.26, 0.84), vec2(2.10, 0.945), vec2(1.90, 0.995),
  vec2(1.87, 0.925), vec2(1.99, 0.865), vec2(2.13, 0.745), vec2(2.23, 0.585), vec2(2.27, 0.40));

${[4, 5, 8, 10].map(polyFn).join('\n')}

float sdRRect(vec2 p, vec2 c, vec2 h, float r) {
  vec2 q = abs(p - c) - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

struct BodyMask { float glass; float trim; float gap; float head; float tail; float tailOk; float mesh; float chrome; float drl; };

// Orientation conditions are folded into the distances with max() instead of
// branching, so every region edge stays anti-aliased and free of jaggies.
#define NK 0.08
float max3(float a, float b, float c) { return max(a, max(b, c)); }
float max4(float a, float b, float c, float d) { return max(max(a, b), max(c, d)); }

BodyMask bodyMasks(vec3 p, vec3 n) {
  BodyMask m;
  float x = p.x, y = p.y, z = p.z, az = abs(p.z);
  float anz = abs(n.z);
  // glass
  float dlo = sdPoly8(vec2(x, y), DLO);
  float gSide = max3(dlo, NK * (0.45 - anz), 0.9 - y);
  float gWs = max4(sdPoly4(vec2(x, z), WS), NK * (0.25 - n.y), NK * (0.12 - n.x), 0.93 - y);
  float gRs = max4(sdPoly4(vec2(x, z), RS), NK * (0.25 - n.y), NK * (n.x + 0.05), 1.0 - y);
  float bpil = max(abs(x + 0.64) - 0.028, NK * (0.45 - anz));
  m.glass = max(min(min(gSide, gWs), gRs), -bpil);
  // satin black trim
  float gy = abs(y - 0.45) - 0.17;
  float gw = 0.33 + 0.30 * (y - 0.28);
  float grille = max(max(az - gw, gy) - 0.004, 2.15 - x);
  float intake = max(max(abs(az - 0.655) - 0.145 + (y - 0.335) * 0.25, abs(y - 0.335) - 0.125) - 0.004, 1.95 - x);
  float gill = max4(max(abs(x - 0.905 + (y - 0.61) * 0.35) - 0.07, abs(y - 0.61) - 0.105) - 0.004, NK * (0.5 - anz), 0.7 - x, x - 1.1);
  float t = max3(dlo - 0.016, NK * (0.4 - anz), 0.9 - y);
  t = min(t, max3(bpil, 0.95 - y, y - 1.27));
  t = min(t, max3(y - 0.215, NK * (0.35 - anz), abs(x) - 1.0));
  t = min(t, max3(y - 0.175, NK * (0.2 - n.x), 2.0 - x));
  t = min(t, max3(y - 0.36, NK * (n.x + 0.25), x + 2.0));
  t = min(t, min(grille, min(intake, gill)));
  float well = max(min(length(vec2(x - 1.39, y - 0.355)), length(vec2(x + 1.39, y - 0.355))) - ARCH_R - 0.01, az - 0.535);
  t = min(t, well);
  t = min(t, NK * (n.y + 0.5));
  m.trim = t;
  m.mesh = min(grille + 0.012, min(intake + 0.01, gill + 0.004));
  m.chrome = max3(abs(max(az - gw, gy)) - 0.014, 2.15 - x, -NK * n.x);
  // panel gaps: unsigned distance to the nearest panel outline
  float g = max3(abs(sdRRect(vec2(x, az), vec2(1.52, 0.0), vec2(0.80, 0.695), 0.10)), NK * (0.45 - n.y), 0.6 - x);
  g = min(g, max4(abs(sdPoly5(vec2(x, y), DOOR)), NK * (0.6 - anz), y - 0.975, abs(x) - 0.9));
  g = min(g, max3(abs(sdRRect(vec2(x, az), vec2(-2.03, 0.0), vec2(0.30, 0.64), 0.06)), NK * (0.4 - n.y), x + 1.6));
  g = min(g, max4(abs(sdRRect(vec2(x, y), vec2(-1.86, 0.80), vec2(0.085, 0.07), 0.025)), z + 0.6, NK * (0.6 - anz), max(x + 1.6, -2.1 - x)));
  m.gap = g;
  // lamps
  m.head = max4(sdPoly10(vec2(x, az), HL), 0.668 - y, y - 0.86, NK * (-0.3 - n.y));
  m.drl = max3(max(abs(az - 0.832 + (y - 0.335) * 0.25) - 0.007, abs(y - 0.35) - 0.10), NK * (0.15 - n.x), 1.95 - x);
  m.tail = min(length(vec2(az - 0.505, y - 0.875)), length(vec2(az - 0.715, y - 0.875)));
  m.tailOk = max(NK * (n.x + 0.3), x + 2.0);
  return m;
}
`;
