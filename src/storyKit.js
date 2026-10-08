// Shared storyboard helpers used by every episode module.

/** standard section timings for a ~50 s episode with six focus segments */
export const DEFAULT_T = {
  lightsOn: 0.7,
  scan: [6.2, 8.3],
  explode: 8.9,
  tour: 12.9,
  seg: 4.3,
  reassemble: 38.9,
  scanBack: [41.6, 43.4],
  outro: 43.6,
};

export const segTimeFor = (T) => (i) => [T.tour + i * T.seg, T.tour + (i + 1) * T.seg];

/** two camera keys per focus segment: arrive, then a slow orbit/push-in */
export function segmentCameraKeys(segments, segTime) {
  const k = [];
  segments.forEach((s, i) => {
    const [a, b] = segTime(i);
    const c = s.cam;
    k.push({ t: a + 1.0, tgt: c.tgt, dist: c.dist, az: c.az[0], el: c.el, fov: c.fov, shift: 0.12 });
    k.push({ t: b - 0.15, tgt: c.tgt, dist: c.dist * 0.94, az: c.az[1], el: c.el + 2, fov: c.fov, shift: 0.12 });
  });
  return k;
}

/** audio cue list (consumed by scripts/soundtrack.py) */
export function standardCues(T, segments, segTime) {
  const c = [
    { t: 0.0, type: 'rise' },
    { t: T.lightsOn, type: 'lights' },
    { t: 1.5, type: 'impact' },
    { t: T.scan[0], type: 'scan', dur: T.scan[1] - T.scan[0] },
    { t: T.explode, type: 'whoosh' },
    { t: T.explode + 0.6, type: 'impact' },
  ];
  segments.forEach((s, i) => {
    const [a] = segTime(i);
    c.push({ t: a + 0.1, type: 'whoosh-small' });
    c.push({ t: a + 1.0, type: 'blip' });
    if (s.sys === 'turbos') c.push({ t: a + 1.2, type: 'turbo' });
  });
  c.push({ t: T.reassemble + 0.4, type: 'whoosh' });
  c.push({ t: T.reassemble + 2.4, type: 'impact' });
  c.push({ t: T.scanBack[0], type: 'scan', dur: T.scanBack[1] - T.scanBack[0] });
  c.push({ t: T.outro, type: 'rev' });
  c.push({ t: T.outro + 0.4, type: 'impact' });
  return c;
}
