// Final cinematic grade in linear HDR before tone mapping: vignette, gentle
// chromatic fringe at the edges and film grain (deterministic per frame).
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class GradePass extends ShaderPass {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVignette: { value: 0.55 },
        uGrain: { value: 0.035 },
        uFade: { value: 1.0 },
        uLift: { value: new THREE.Color(0x000000) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uGrain; uniform float uFade;
        uniform vec3 uLift;
        varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec2 c = vUv - 0.5;
          float r2 = dot(c, c);
          vec2 off = c * r2 * 0.006;
          vec3 col;
          col.r = texture2D(tDiffuse, vUv + off).r;
          col.g = texture2D(tDiffuse, vUv).g;
          col.b = texture2D(tDiffuse, vUv - off).b;
          float vig = 1.0 - uVignette * smoothstep(0.08, 0.55, r2 * 1.6);
          col *= vig;
          col += uLift;
          float n = hash(vUv * 1000.0 + fract(uTime * 7.31) * 100.0) - 0.5;
          col *= 1.0 + n * uGrain;
          gl_FragColor = vec4(col * uFade, 1.0);
        }`,
    });
  }
}
