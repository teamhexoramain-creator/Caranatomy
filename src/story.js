// Loads the episode chosen with ?ep= (browser) or EP=… (node) and exposes its
// storyboard. Everything is a pure function of time t, so any frame can be
// rendered independently and the soundtrack is generated from the same cues.
export const PAGE = 'AUTO ANATOMY AI'; // Facebook page shown in the intro tag and the outro

const epId = (globalThis.location ? new URLSearchParams(globalThis.location.search).get('ep') : globalThis.process?.env?.EP) || 'ep01';
if (!/^ep\d\d$/.test(epId)) throw new Error(`unknown episode ${epId}`);
export const EP = (await import(`./episodes/${epId}.js`)).default;

export const CAR = EP.car;
export const FPS = EP.fps;
export const DURATION = EP.duration;
export const T = EP.T;
export const SEGMENTS = EP.segments;
export const segTime = EP.segTime;
export const CAMERA_KEYS = EP.cameraKeys;
export const cues = EP.cues;
