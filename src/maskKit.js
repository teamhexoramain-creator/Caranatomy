// GLSL/JS building blocks for the per-car body mask modules (src/cars/*/masks.js).
// Each car provides a bodyMasks(p, n) GLSL function returning BodyMask, where
// every field is a signed distance in metres (negative = inside the region).

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

/** const vec2 arrays for every outline plus sdPolyN() for each distinct size */
export function polygonsGLSL(POLY) {
  const consts = Object.entries(POLY).map(([name, pts]) =>
    `const vec2 ${name}[${pts.length}] = vec2[${pts.length}](${pts.map(([a, b]) => `vec2(${a.toFixed(4)}, ${b.toFixed(4)})`).join(', ')});`);
  const sizes = [...new Set(Object.values(POLY).map((p) => p.length))].sort((a, b) => a - b);
  return `${consts.join('\n')}\n\n${sizes.map(polyFn).join('\n')}`;
}

export const MASK_COMMON_GLSL = /* glsl */`
float sdRRect(vec2 p, vec2 c, vec2 h, float r) {
  vec2 q = abs(p - c) - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

struct BodyMask { float glass; float trim; float gap; float head; float tail; float tailOk; float mesh; float chrome; float drl; };

// Orientation conditions are folded into the distances with max() instead of
// branching, so every region edge stays anti-aliased and free of jaggies.
#define NK 0.08
#define FAR 1.0
float max3(float a, float b, float c) { return max(a, max(b, c)); }
float max4(float a, float b, float c, float d) { return max(max(a, b), max(c, d)); }
`;

export function sdPolyJS(px, py, v) {
  let d = (px - v[0][0]) ** 2 + (py - v[0][1]) ** 2, s = 1;
  for (let i = 0, j = v.length - 1; i < v.length; j = i, i++) {
    const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1], wx = px - v[i][0], wy = py - v[i][1];
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, (wx - ex * t) ** 2 + (wy - ey * t) ** 2);
    const c1 = py >= v[i][1], c2 = py < v[j][1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}
