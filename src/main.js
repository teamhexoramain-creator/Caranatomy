import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { buildStudioEnvironment } from './env.js';
import { loadBodyGeometry, makeBodyMaterials, makeBody, bodyUniforms, setCutEnabled } from './body.js';
import { makeCorner } from './wheels.js';
import { radialShadowTexture } from './textures.js';
import { GradePass } from './grade.js';
import { makeFocusSet, focusMaterial } from './materials.js';
import { offsetFor } from './layout.js';
import { CAMERA_KEYS, SEGMENTS, segTime, T, DURATION, FPS, cues, CAR } from './story.js';
import { multiTrack, clamp01, smooth, window01, range, lerp, easeInOut } from './anim.js';
import { Overlay } from './overlay.js';

const params = new URLSearchParams(location.search);
const W = window.innerWidth, H = window.innerHeight;
const PR = Number(params.get('pr') || 1); // render scale (0.5 for quick previews)
const DEG = Math.PI / 180;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(PR);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050608);
scene.environment = buildStudioEnvironment(renderer);

const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);

// ---------------------------------------------------------------- stage
const floorMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.35 });
floorMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
    .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb *= 1.0 - smoothstep(3.5, 11.0, length(vWP.xz));');
};
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 96), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(1.5, 9, 2.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 20 });
key.shadow.radius = 6;
key.shadow.bias = -0.0004;
scene.add(key);
// extra lights that only come up while the mechanicals are on show
const anatomyKey = new THREE.DirectionalLight(0xfff1e6, 0);
anatomyKey.position.set(6, 8, 7);
const anatomyRim = new THREE.DirectionalLight(0x9fd0ff, 0);
anatomyRim.position.set(-7, 4, -5);
scene.add(anatomyKey, anatomyRim);

// ---------------------------------------------------------------- car
const car = new THREE.Group();
scene.add(car);
const contact = new THREE.Mesh(
  new THREE.PlaneGeometry(...CAR.contactShadow),
  new THREE.MeshBasicMaterial({ map: radialShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }),
);
contact.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
contact.position.y = 0.002;
car.add(contact);

const bodyGeo = await loadBodyGeometry(CAR.bodyAsset);
const body = makeBody(bodyGeo, makeBodyMaterials(Number(params.get('paint') || CAR.paint), CAR.masks, CAR.paintOpts), CAR.masks);
car.add(body);

const corners = {};
for (const [name, x, front] of [['fl', CAR.axles.front, true], ['fr', CAR.axles.front, true], ['rl', CAR.axles.rear, false], ['rr', CAR.axles.rear, false]]) {
  const side = name.endsWith('r') ? 1 : -1;
  const c = makeCorner({ front, side, spec: CAR.wheels });
  c.position.set(x, CAR.wheelY, side * ((front ? CAR.track.front : CAR.track.rear) / 2));
  c.userData.home = c.position.clone();
  c.userData.side = side;
  car.add(c);
  corners[name] = c;
}

// ---------------------------------------------------------------- anatomy
const systems = CAR.buildAnatomy();
for (const s of Object.values(systems)) car.add(s);
const brakesSet = makeFocusSet(0xff7a1a), wheelsSet = makeFocusSet(0xffffff), rotorSet = makeFocusSet(0x000000);
brakesSet.uGlowColor.value.multiplyScalar(0.5);
for (const c of Object.values(corners)) {
  c.traverse((o) => {
    if (!o.isMesh) return;
    const set = o === c.userData.caliper ? brakesSet : o.parent === c.userData.brake ? rotorSet : wheelsSet;
    o.material = focusMaterial(o.material, set);
  });
}
const focusSets = { brakes: brakesSet, wheels: wheelsSet, rotors: rotorSet };
for (const [n, s] of Object.entries(systems)) focusSets[n] = s.userData.set;

// torque-flow pulses for the ATTESA segment
const pulseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 3.6, 6.0), toneMapped: true });
const pulseGeo = new THREE.SphereGeometry(0.026, 16, 10);
const flows = (systems.awd?.userData.flows || []).map((f) => {
  const curve = new THREE.CatmullRomCurve3(f.pts);
  const balls = Array.from({ length: Math.max(3, Math.round(curve.getLength() * 3)) }, () => {
    const m = new THREE.Mesh(pulseGeo, pulseMat);
    m.visible = false;
    systems.awd.add(m);
    return m;
  });
  return { ...f, curve, balls };
});

function anchorOf(name) {
  if (name === 'brakes') {
    const c = corners.fr;
    return c.position.clone().add(new THREE.Vector3(...CAR.brakeAnchor));
  }
  const s = systems[name];
  return s.userData.anchor.clone().add(s.position);
}

// ---------------------------------------------------------------- post
const rt = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: Number(params.get('samples') ?? 0) });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(PR);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.38, 0.5, 0.95);
composer.addPass(bloom);
const grade = new GradePass();
composer.addPass(grade);
composer.addPass(new OutputPass());
const smaa = new SMAAPass();
composer.addPass(smaa);

if (params.get('noshadow')) renderer.shadowMap.enabled = false;
if (params.get('nobloom')) bloom.enabled = false;
if (params.get('nosmaa')) smaa.enabled = false;
const overlay = new Overlay(document.getElementById('overlay'));
if (params.get('nooverlay')) document.getElementById('overlay').style.display = 'none';

// ---------------------------------------------------------------- director
const cam = multiTrack(CAMERA_KEYS, ['tgt', 'dist', 'az', 'el', 'fov', 'shift']);
const tmp = new THREE.Vector3();

function setCamera(t) {
  const c = cam(t);
  const az = c.az * DEG, el = c.el * DEG;
  camera.position.set(
    c.tgt[0] + c.dist * Math.cos(el) * Math.cos(az),
    c.tgt[1] + c.dist * Math.sin(el),
    c.tgt[2] + c.dist * Math.cos(el) * Math.sin(az),
  );
  camera.lookAt(c.tgt[0], c.tgt[1], c.tgt[2]);
  camera.fov = c.fov;
  // shift the frame so the subject sits above the spec card
  camera.setViewOffset(W, H, 0, H * c.shift, W, H);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function explodeK(name, t) {
  const i = Math.max(0, CAR.explodeOrder.indexOf(name));
  const n = CAR.explodeOrder.length;
  const out = range(t, T.explode + i * 0.13, T.explode + i * 0.13 + 1.7);
  const back = range(t, T.reassemble + 0.5 + (n - 1 - i) * 0.12, T.reassemble + 0.5 + (n - 1 - i) * 0.12 + 1.6);
  return out * (1 - back);
}

function applyScene(t) {
  setCamera(t);

  // exposure / fades
  grade.uniforms.uFade.value = smooth(0.0, 1.1, t) * (1 - smooth(DURATION - 0.7, DURATION, t));
  grade.uniforms.uTime.value = t;

  // lamps: quick double flicker as the car "wakes up", again at the outro
  const flick = (t0) => (t < t0 ? 0 : t < t0 + 0.07 ? 1 : t < t0 + 0.14 ? 0.15 : t < t0 + 0.2 ? 1 : 1);
  bodyUniforms.uHead.value = flick(T.lightsOn) * (1 - 0.6 * window01(t, T.scan[0], T.outro, 0.5, 0.5));
  bodyUniforms.uTail.value = flick(T.lightsOn + 0.1);

  // x-ray scan front -> rear, and back again
  const s1 = range(t, T.scan[0], T.scan[1]);
  const s2 = range(t, T.scanBack[0], T.scanBack[1]);
  let cut = 99;
  if (t >= T.scan[0] && t < T.scanBack[0]) cut = lerp(2.6, -2.6, s1);
  else if (t >= T.scanBack[0] && t < T.scanBack[1]) cut = lerp(-2.6, 2.6, s2);
  bodyUniforms.uCut.value = cut;
  bodyUniforms.uScanGlow.value = window01(t, T.scan[0], T.scan[1], 0.2, 0.25) + window01(t, T.scanBack[0], T.scanBack[1], 0.2, 0.25);

  // focus tour weights
  const w = {};
  let anyFocus = 0;
  SEGMENTS.forEach((s, i) => {
    const [a, b] = segTime(i);
    w[s.sys] = window01(t, a + 0.35, b + 0.05, 0.55, 0.5);
    anyFocus = Math.max(anyFocus, w[s.sys]);
  });
  const xrayOn = t >= T.scan[0] && t < T.scanBack[1];
  bodyUniforms.uXray.value = xrayOn ? 1 - 0.7 * anyFocus : 0;
  body.userData.xray.visible = xrayOn;
  const paintOn = cut > -2.55;
  body.userData.paint.visible = body.userData.border.visible = body.userData.glass.visible = paintOn;
  body.userData.shell.visible = cut > 50;
  setCutEnabled(body.userData.mats, paintOn && cut < 50);

  // explode / reassemble
  for (const [name, s] of Object.entries(systems)) {
    s.position.copy(offsetFor(CAR.explode, name, explodeK(name, t)));
    // the system in focus slides out of the stack towards the camera
    const seg = SEGMENTS.find((g) => g.sys === name && g.pop);
    if (seg) s.position.addScaledVector(tmp.set(...seg.pop), easeInOut(clamp01(w[name] || 0)));
  }
  body.position.copy(offsetFor(CAR.explode, 'body', explodeK('body', t)));
  const kw = explodeK('wheels', t);
  for (const c of Object.values(corners)) {
    c.position.copy(c.userData.home).add(offsetFor(CAR.explode, 'wheels', kw, c.userData.side));
    // slide the wheel off the hub to reveal the brake
    c.userData.wheel.position.z = 0.95 * easeInOut(clamp01(w.brakes || 0));
  }

  // glow / dim per system
  for (const [name, set] of Object.entries(focusSets)) {
    const own = (name === 'rotors' ? w.brakes : w[name]) || 0;
    set.uGlow.value = own * (0.32 + 0.08 * Math.sin(t * 4.0));
    set.uDim.value = Math.max(0, anyFocus - own) * 0.85;
  }
  focusSets.wheels.uDim.value = Math.max(focusSets.wheels.uDim.value, (w.brakes || 0) * 0.5);
  const hot = systems.turbos?.userData.hot;
  if (hot) hot.emissiveIntensity = 0.15 + 2.6 * (w.turbos || 0) * (0.85 + 0.15 * Math.sin(t * 9));
  CAR.animate?.({ t, w, systems, corners });

  // torque-flow pulses
  const [aw] = segTime(SEGMENTS.findIndex((s) => s.sys === 'awd'));
  const u = t - (aw + 0.9);
  for (const f of flows) {
    const local = u - f.start * 0.45;
    f.balls.forEach((b, j) => {
      const ph = local * (1.1 / f.len) - j / f.balls.length;
      const on = (w.awd || 0) > 0.02 && local > 0 && ph > 0;
      b.visible = on;
      if (!on) return;
      const frac = ph % 1;
      f.curve.getPointAt(frac, tmp);
      b.position.copy(tmp);
      const s = Math.sin(Math.PI * frac) * (w.awd || 0);
      b.scale.setScalar(0.4 + s);
    });
  }

  // lights for the mechanicals
  const mech = window01(t, T.scan[0], T.scanBack[1], 1.0, 1.0);
  anatomyKey.intensity = 1.1 * mech;
  anatomyRim.intensity = 1.5 * mech;
  bloom.strength = 0.38 + 0.12 * mech;

  // overlay
  overlay.update(t, (name) => {
    tmp.copy(anchorOf(name)).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, visible: tmp.z < 1 };
  });
}

// ---------------------------------------------------------------- debug views
const VIEWS = {
  threeq: { pos: [6.2, 1.45, 5.4], target: [0.1, 0.55, 0] },
  side: { pos: [0, 0.75, 9.5], target: [0, 0.65, 0] },
  front: { pos: [9, 0.8, 0], target: [0, 0.6, 0] },
  rear: { pos: [-9, 1.0, 0], target: [0, 0.65, 0] },
  rear3q: { pos: [-6.0, 1.6, 5.2], target: [-0.2, 0.6, 0] },
  front3q: { pos: [5.5, 1.0, 3.2], target: [0.6, 0.55, 0] },
};

window.__renderFrame = (t) => {
  applyScene(t);
  const v = VIEWS[params.get('view')];
  if (v) {
    camera.clearViewOffset();
    camera.position.set(...v.pos);
    camera.lookAt(...v.target);
    camera.fov = Number(params.get('fov') || 30);
    camera.updateProjectionMatrix();
  }
  composer.render();
};
window.__meta = { fps: FPS, duration: DURATION, cues: cues(), ep: params.get('ep') || 'ep01' };
window.__ready = true;

// interactive preview when opened in a normal browser: ?play=1
if (params.get('play')) {
  const t0 = performance.now();
  const loop = () => { window.__renderFrame(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  loop();
}
