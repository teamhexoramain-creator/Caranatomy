// Procedural HDR photo-studio: long softboxes and strip lights that give the
// paint its characteristic flowing reflection lines.
import * as THREE from 'three';

function panel(scene, w, h, intensity, color, pos, lookAt) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
  );
  m.position.copy(pos);
  m.lookAt(lookAt);
  scene.add(m);
  return m;
}

export function buildStudioEnvironment(renderer) {
  const env = new THREE.Scene();
  // dark room shell with a faint vertical gradient
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(30, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vP; void main(){
        float h = normalize(vP).y;
        vec3 c = mix(vec3(0.010,0.011,0.013), vec3(0.045,0.05,0.06), smoothstep(-0.2, 0.9, h));
        c = mix(c, vec3(0.004), smoothstep(0.0,-0.4,h));
        gl_FragColor = vec4(c,1.); }`,
    }),
  );
  env.add(shell);
  const o = new THREE.Vector3(0, 0.6, 0);
  // big overhead softbox (hood/roof highlight)
  panel(env, 9, 2.6, 2.0, 0xf2f5ff, new THREE.Vector3(0, 7, 0), o);
  // long side strips -> crisp horizontal lines along the flanks
  panel(env, 12, 0.35, 6.0, 0xffffff, new THREE.Vector3(0, 2.4, 6), o);
  panel(env, 12, 0.35, 6.0, 0xffffff, new THREE.Vector3(0, 2.4, -6), o);
  panel(env, 12, 0.18, 6.0, 0xdfe8ff, new THREE.Vector3(0, 0.9, 7), o);
  panel(env, 12, 0.18, 6.0, 0xdfe8ff, new THREE.Vector3(0, 0.9, -7), o);
  // front / rear verticals
  panel(env, 1.2, 5, 4.0, 0xfff4ea, new THREE.Vector3(9, 2.5, 3), o);
  panel(env, 1.2, 5, 3.0, 0xeaf2ff, new THREE.Vector3(-9, 2.5, -3), o);
  // warm and cool kickers
  panel(env, 4, 1.4, 2.2, 0xffb070, new THREE.Vector3(-6, 3.5, 6), o);
  panel(env, 4, 1.4, 2.0, 0x70a8ff, new THREE.Vector3(6, 3.5, -6), o);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.015);
  pmrem.dispose();
  return rt.texture;
}
