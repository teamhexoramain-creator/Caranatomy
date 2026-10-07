// Deterministic animation helpers: easing, clamped ranges and monotone cubic
// keyframe tracks (no overshoot between holds).
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
/** 0 -> 1 over [a, a+fadeIn], 1 -> 0 over [b-fadeOut, b] */
export const window01 = (t, a, b, fadeIn = 0.35, fadeOut = 0.35) => Math.min(smooth(a, a + fadeIn, t), 1 - smooth(b - fadeOut, b, t));
export const range = (t, a, b, ease = easeInOut) => ease(clamp01((t - a) / (b - a)));

/** Fritsch-Carlson monotone cubic interpolation over [[t, v], ...] */
export function track(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0] ?? 0; m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const s = 3 / Math.sqrt(h); m[i] = s * a * d[i]; m[i + 1] = s * b * d[i]; }
  }
  return (t) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}

/** keys: [{t, ...numbers or arrays}] -> fn(t) returning the same shape */
export function multiTrack(keys, fields) {
  const tracks = {};
  for (const f of fields) {
    const sample = keys[0][f];
    if (Array.isArray(sample)) tracks[f] = sample.map((_, j) => track(keys.map((k) => [k.t, k[f][j]])));
    else tracks[f] = track(keys.map((k) => [k.t, k[f]]));
  }
  return (t) => {
    const out = {};
    for (const f of fields) out[f] = Array.isArray(tracks[f]) ? tracks[f].map((tr) => tr(t)) : tracks[f](t);
    return out;
  };
}
