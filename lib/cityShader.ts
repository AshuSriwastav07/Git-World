// City building ShaderMaterial — custom vertex/fragment for the instanced building body mesh.
// Features: uDayFactor uniform for smooth day/night blend, dual atlas textures,
// distance fog discard, instanceColor tinting, Bayer dithered transparency.

import * as THREE from 'three';
import { getWindowTexture } from './windowAtlas';

/* ── Vertex Shader ── */
const CITY_VERT = /* glsl */ `
  attribute vec3 instanceColor;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFogDist;

  void main() {
    vUv = uv;
    vColor = instanceColor;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vFogDist = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/* ── Fragment Shader ── */
const CITY_FRAG = /* glsl */ `
  uniform sampler2D uDayTex;
  uniform sampler2D uNightTex;
  uniform float uDayFactor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uFogColor;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFogDist;

  // 4×4 Bayer matrix for ordered dithering
  float bayer4(vec2 p) {
    ivec2 ip = ivec2(mod(p, 4.0));
    int idx = ip.x + ip.y * 4;
    // Bayer matrix values / 16
    float m[16];
    m[0]  =  0.0/16.0; m[1]  =  8.0/16.0; m[2]  =  2.0/16.0; m[3]  = 10.0/16.0;
    m[4]  = 12.0/16.0; m[5]  =  4.0/16.0; m[6]  = 14.0/16.0; m[7]  =  6.0/16.0;
    m[8]  =  3.0/16.0; m[9]  = 11.0/16.0; m[10] =  1.0/16.0; m[11] =  9.0/16.0;
    m[12] = 15.0/16.0; m[13] =  7.0/16.0; m[14] = 13.0/16.0; m[15] =  5.0/16.0;
    return m[idx];
  }

  void main() {
    // Sample both day and night textures, lerp by uDayFactor
    vec4 dayCol  = texture2D(uDayTex, vUv);
    vec4 nightCol = texture2D(uNightTex, vUv);
    vec4 texCol = mix(nightCol, dayCol, uDayFactor);

    // Tint by instance color
    vec3 color = texCol.rgb * vColor;

    // Night emissive boost
    float nightFactor = 1.0 - uDayFactor;
    vec3 emissive = vec3(1.0, 0.8, 0.4) * nightFactor * 0.18;
    color += emissive * texCol.rgb;

    // Simple Lambert-like shading: use a cheap directional light approximation
    // (the actual scene lights will still contribute via the ambient)
    color = color * (0.6 + 0.4 * uDayFactor);

    // Distance fog
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);

    // Bayer dithered discard at far distances
    if (fogFactor > 0.95) {
      float threshold = bayer4(gl_FragCoord.xy);
      if (fogFactor > 0.95 + threshold * 0.05) discard;
    }

    color = mix(color, uFogColor, fogFactor * 0.7);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Create the custom city building ShaderMaterial.
 * Call once in useMemo — uniforms are updated per-frame via `updateCityMaterial`.
 */
export function createCityMaterial(): THREE.ShaderMaterial {
  const dayTex = getWindowTexture(false);
  const nightTex = getWindowTexture(true);

  return new THREE.ShaderMaterial({
    vertexShader: CITY_VERT,
    fragmentShader: CITY_FRAG,
    uniforms: {
      uDayTex: { value: dayTex },
      uNightTex: { value: nightTex },
      uDayFactor: { value: 1.0 },
      uFogNear: { value: 300.0 },
      uFogFar: { value: 700.0 },
      uFogColor: { value: new THREE.Color('#87ceeb') },
    },
  });
}

const _dayFog = new THREE.Color('#87ceeb');
const _nightFog = new THREE.Color('#0a0a1a');

/**
 * Update per-frame uniforms. Called from useFrame.
 */
export function updateCityMaterial(
  mat: THREE.ShaderMaterial,
  dayFactor: number,
): void {
  mat.uniforms.uDayFactor.value = dayFactor;
  // Adjust fog color for day/night
  const fogColor = mat.uniforms.uFogColor.value as THREE.Color;
  fogColor.copy(_nightFog).lerp(_dayFog, dayFactor);
}
