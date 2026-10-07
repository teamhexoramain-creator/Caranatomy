// GT-R body shell: loads the mesh baked by model/build_body.py and builds three
// materials on top of it (paint, glass, x-ray ghost). Material regions come
// from BODY_MASKS_GLSL and are resolved per pixel.
import * as THREE from 'three';
import { BODY_MASKS_GLSL } from './bodyMasks.js';

export const bodyUniforms = {
  uCut: { value: 99 },        // paint is drawn where x < uCut, x-ray where x > uCut
  uTail: { value: 1.0 },      // tail-lamp brightness
  uHead: { value: 1.0 },      // headlamp DRL brightness
  uXray: { value: 0.0 },      // x-ray ghost opacity
  uXrayColor: { value: new THREE.Color(0x4fc3ff) },
  uScanGlow: { value: 0.0 },
};

export async function loadBodyGeometry(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  const hlen = dv.getUint32(0, true);
  const hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hlen)));
  let off = 4 + hlen;
  const take = (n, T = Float32Array) => { const a = new T(buf, off, n); off += n * T.BYTES_PER_ELEMENT; return a; };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(take(hdr.verts * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(take(hdr.verts * 3), 3));
  g.setIndex(new THREE.BufferAttribute(take(hdr.tris * 3, Uint32Array), 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

const VERT_PARS = /* glsl */`
varying vec3 vOP;
varying vec3 vON;
`;
const VERT_MAIN = /* glsl */`
vOP = position; vON = normal;
`;

const FRAG_PARS = /* glsl */`
uniform float uCut;
uniform float uTail;
uniform float uHead;
varying vec3 vOP;
varying vec3 vON;
float inside(float d) { float w = max(fwidth(d) * 0.75, 1e-5); return 1.0 - smoothstep(-w, w, d); }
float band(float d, float a, float b) { return inside(a - d) * inside(d - b); }
float hexEdge(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  vec2 q = abs(g);
  return 0.5 - max(dot(q, r * 0.5), q.x); // 0 at the cell edge
}
${BODY_MASKS_GLSL}
`;

function paintFragMain(mode) {
  // mode 0 = opaque paint pass, mode 1 = glass pass
  return /* glsl */`
  if (vOP.x > uCut) discard;
  BodyMask bm = bodyMasks(vOP, normalize(vON));
  float isGlass = inside(bm.glass);
  ${mode === 0 ? 'if (isGlass > 0.5) discard;' : 'if (isGlass < 0.5 || !gl_FrontFacing) discard;'}
  float ccOut = clearcoat;
  vec3 emis = vec3(0.0);
  ${mode === 0 ? /* glsl */`
  vec3 col = diffuseColor.rgb;
  float rough = roughnessFactor, metal = metalnessFactor;
  // satin black trim
  float tr = inside(bm.trim);
  col = mix(col, vec3(0.010, 0.010, 0.011), tr);
  rough = mix(rough, 0.45, tr); metal = mix(metal, 0.0, tr); ccOut = mix(ccOut, 0.2, tr);
  // honeycomb mesh inside the intakes
  float me = inside(bm.mesh);
  float web = smoothstep(0.0, 0.09, hexEdge(vOP.zy * 48.0));
  col = mix(col, mix(vec3(0.045), vec3(0.0), web), me);
  rough = mix(rough, mix(0.35, 1.0, web), me); ccOut = mix(ccOut, 0.0, me);
  // dark chrome grille surround
  float chm = inside(bm.chrome) * (1.0 - me);
  col = mix(col, vec3(0.42, 0.43, 0.45), chm); metal = mix(metal, 1.0, chm); rough = mix(rough, 0.16, chm);
  // headlamps: smoked chrome reflector + LED signature along the lower edge
  float hl = inside(bm.head);
  col = mix(col, vec3(0.07, 0.075, 0.08), hl); metal = mix(metal, 1.0, hl); rough = mix(rough, 0.07, hl);
  ccOut = mix(ccOut, 1.0, hl);
  float led = band(bm.head, -0.011, -0.0075) * hl * smoothstep(0.66, 0.70, vOP.y);
  emis += vec3(0.85, 0.92, 1.0) * led * 2.2 * uHead;
  float drl = inside(bm.drl);
  col = mix(col, vec3(0.9), drl); metal = mix(metal, 0.0, drl);
  emis += vec3(0.8, 0.9, 1.0) * drl * 4.0 * uHead;
  // tail lamps: four rings
  float tok = inside(bm.tailOk);
  float tl = inside(bm.tail - 0.074) * tok;
  float ring = band(bm.tail, 0.046, 0.064) * tok;
  float core = inside(bm.tail - 0.030) * tok;
  col = mix(col, vec3(0.06, 0.004, 0.004), tl); metal = mix(metal, 0.0, tl); rough = mix(rough, 0.05, tl);
  col = mix(col, vec3(0.012), tl * band(bm.tail, 0.066, 0.074));
  emis += (vec3(1.0, 0.04, 0.02) * ring * 7.0 + vec3(0.6, 0.02, 0.01) * core * 1.5) * uTail;
  // panel gaps
  float gap = inside(bm.gap - 0.0016);
  float gapShade = 1.0 - (1.0 - smoothstep(0.0016, 0.006, bm.gap)) * 0.35;
  col *= mix(gapShade, 0.02, gap); ccOut *= 1.0 - gap * 0.9; rough = mix(rough, 0.8, gap);
  // inside of the shell
  if (!gl_FrontFacing) { col = vec3(0.012); rough = 0.85; metal = 0.0; ccOut = 0.0; emis = vec3(0.0); }
  diffuseColor.rgb = col; roughnessFactor = rough; metalnessFactor = metal;
  ` : ''}
  `;
}

function patchPaint(material, mode) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, bodyUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MAIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + paintFragMain(mode))
      .replace('material.clearcoat = clearcoat;', 'material.clearcoat = ccOut;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += emis;');
  };
  material.customProgramCacheKey = () => 'gtr-paint-' + mode;
}

export function makeBodyMaterials(paintColor = 0x8a9097) {
  const paint = new THREE.MeshPhysicalMaterial({
    color: paintColor, metalness: 0.55, roughness: 0.34,
    clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });
  patchPaint(paint, 0);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x020304, metalness: 0.0, roughness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.0,
    transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 2.2,
  });
  patchPaint(glass, 1);

  const xray = new THREE.ShaderMaterial({
    uniforms: bodyUniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vOP;
      void main() {
        vOP = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uCut; uniform float uXray; uniform vec3 uXrayColor; uniform float uScanGlow;
      varying vec3 vN; varying vec3 vV; varying vec3 vOP;
      float gridLine(float v) {
        float w = fwidth(v);
        return smoothstep(1.0 - 2.0 * w, 1.0, abs(fract(v) - 0.5) * 2.0);
      }
      void main() {
        float reveal = smoothstep(uCut - 0.002, uCut + 0.002, vOP.x);
        float a = reveal * uXray;
        float scan = exp(-abs(vOP.x - uCut) * 55.0) * uScanGlow;
        if (a < 0.002 && scan < 0.002) discard;
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float rim = pow(f, 2.6);
        float grid = max(gridLine(vOP.x * 10.0), gridLine(vOP.y * 10.0)) * 0.25;
        vec3 c = uXrayColor * (0.035 + rim * 1.1 + grid * (0.3 + rim)) * a;
        c += vec3(0.55, 0.85, 1.0) * scan * 3.0 * (0.3 + rim);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return { paint, glass, xray };
}

export function makeBody(geometry, mats) {
  const group = new THREE.Group();
  group.name = 'body';
  const paint = new THREE.Mesh(geometry, mats.paint);
  paint.castShadow = true;
  // the glass pass only needs the greenhouse triangles
  const pos = geometry.attributes.position.array, idx = geometry.index.array;
  const keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (pos[idx[i] * 3 + 1] > 0.9 || pos[idx[i + 1] * 3 + 1] > 0.9 || pos[idx[i + 2] * 3 + 1] > 0.9) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute('position', geometry.attributes.position);
  glassGeo.setAttribute('normal', geometry.attributes.normal);
  glassGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
  glassGeo.boundingSphere = geometry.boundingSphere;
  const glass = new THREE.Mesh(glassGeo, mats.glass);
  glass.renderOrder = 2;
  const xray = new THREE.Mesh(geometry, mats.xray);
  xray.renderOrder = 3;
  group.add(paint, glass, xray);
  group.userData = { paint, glass, xray };
  return group;
}
