// SkyEnvironment — Day/Night sky: dome, sun, moon, clouds, stars, aurora, lighting
// All animation runs via GPU shaders + minimal per-frame uniform updates
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

/* ═══════════════════════════════════════════════════════════════════════════
   SHADERS
   ═══════════════════════════════════════════════════════════════════════════ */

const SKY_VERT = /* glsl */ `
varying float vY;
void main() {
  vY = normalize(position).y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = /* glsl */ `
uniform float uIsDay;
varying float vY;
void main() {
  float t = clamp(vY, 0.0, 1.0);
  // Day
  vec3 dayZenith  = vec3(0.10, 0.32, 0.82);
  vec3 dayMid     = vec3(0.28, 0.56, 0.95);
  vec3 dayHorizon = vec3(0.72, 0.87, 0.98);
  vec3 daySunGlow = vec3(0.98, 0.80, 0.50);
  vec3 dayColor;
  if (t < 0.08) { dayColor = mix(daySunGlow, dayHorizon, t / 0.08); }
  else if (t < 0.35) { dayColor = mix(dayHorizon, dayMid, (t - 0.08) / 0.27); }
  else { dayColor = mix(dayMid, dayZenith, (t - 0.35) / 0.65); }
  // Night
  vec3 nightZenith  = vec3(0.01, 0.01, 0.06);
  vec3 nightMid     = vec3(0.02, 0.03, 0.10);
  vec3 nightHorizon = vec3(0.05, 0.05, 0.12);
  vec3 nightColor;
  if (t < 0.1) { nightColor = mix(nightHorizon * 1.5, nightHorizon, t / 0.1); }
  else { nightColor = mix(nightHorizon, nightZenith, (t - 0.1) / 0.9); }
  gl_FragColor = vec4(mix(nightColor, dayColor, uIsDay), 1.0);
}`;

const AURORA_VERT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vUv = uv;
  float wave1 = sin(position.x * 0.008 + uTime * 0.3) * 40.0;
  float wave2 = sin(position.x * 0.012 - uTime * 0.2 + 1.5) * 25.0;
  float wave3 = sin(position.x * 0.005 + uTime * 0.15 + 3.0) * 30.0;
  float waveStrength = uv.y;
  vec3 pos = position;
  pos.y += (wave1 + wave2 + wave3) * waveStrength;
  vAlpha = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const AURORA_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vec3 green  = vec3(0.0,  0.95, 0.3);
  vec3 teal   = vec3(0.0,  0.85, 0.65);
  vec3 pink   = vec3(0.85, 0.15, 0.5);
  vec3 purple = vec3(0.5,  0.1,  0.8);
  float cx = vUv.x + uTime * 0.04;
  float cn1 = sin(cx * 2.1 + uTime * 0.1) * 0.5 + 0.5;
  float cn2 = sin(cx * 3.7 - uTime * 0.08 + 2.0) * 0.5 + 0.5;
  vec3 bottomColor = mix(green, teal, cn1);
  vec3 topColor    = mix(pink, purple, cn2);
  vec3 auroraColor = mix(bottomColor, topColor, vUv.y * 0.6);
  float ray1 = sin(vUv.x * 8.0 * 3.14 + uTime * 0.25) * 0.5 + 0.5;
  float ray2 = sin(vUv.x * 8.0 * 5.28 - uTime * 0.18 + 1.2) * 0.5 + 0.5;
  float rayPattern = pow(ray1 * ray2, 0.7);
  float pulse = sin(uTime * 0.8) * 0.12 + 0.88;
  float alpha = vAlpha * rayPattern * pulse * 0.65;
  float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  alpha *= edgeFade;
  gl_FragColor = vec4(auroraColor, alpha);
}`;

/* ═══════════════════════════════════════════════════════════════════════════
   MOON TEXTURE (canvas)
   ═══════════════════════════════════════════════════════════════════════════ */

function createMoonTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d8dce0'; ctx.fillRect(0, 0, 256, 256);
  // Maria
  ctx.fillStyle = '#9aa0a6';
  ctx.beginPath(); ctx.ellipse(90, 95, 42, 38, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(140, 80, 28, 25, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(148, 115, 32, 22, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a9098';
  ctx.beginPath(); ctx.ellipse(75, 135, 35, 50, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#959ca2';
  ctx.beginPath(); ctx.ellipse(110, 165, 25, 20, -0.2, 0, Math.PI * 2); ctx.fill();
  // Craters
  const craters = [
    { x: 190, y: 60, r: 14 }, { x: 45, y: 180, r: 10 }, { x: 200, y: 170, r: 8 },
    { x: 130, y: 200, r: 12 }, { x: 170, y: 130, r: 6 }, { x: 60, y: 60, r: 7 },
    { x: 220, y: 110, r: 9 }, { x: 40, y: 130, r: 5 }, { x: 180, y: 210, r: 6 },
    { x: 100, y: 40, r: 5 },
  ];
  for (const cr of craters) {
    ctx.fillStyle = '#6a7078'; ctx.beginPath(); ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0c6cc'; ctx.beginPath(); ctx.arc(cr.x, cr.y, cr.r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8ecf0'; ctx.beginPath(); ctx.arc(cr.x - 1, cr.y - 1, cr.r * 0.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLOUD DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const CLOUD_CONFIGS = [
  { pos: [-300, 160, -200] as const, sc: 1.0, speed: 0.8, dir: 1 },
  { pos: [200, 180, -350] as const, sc: 0.7, speed: 0.5, dir: -1 },
  { pos: [-100, 145, 300] as const, sc: 1.2, speed: 0.7, dir: 1 },
  { pos: [400, 170, 100] as const, sc: 0.9, speed: 0.6, dir: -1 },
  { pos: [-400, 190, 50] as const, sc: 1.1, speed: 0.9, dir: 1 },
  { pos: [150, 155, 400] as const, sc: 0.8, speed: 0.4, dir: -1 },
  { pos: [-250, 200, -100] as const, sc: 0.6, speed: 0.55, dir: 1 },
  { pos: [300, 165, -50] as const, sc: 1.3, speed: 0.65, dir: -1 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function SkyEnvironment() {
  const isNight = useCityStore(s => s.isNight);
  const isDay = !isNight;

  // ── Refs (pre-allocated, reused per-frame) ──
  const skyMatRef = useRef<THREE.ShaderMaterial>(null!);
  const sunOuterRef = useRef<THREE.Mesh>(null!);
  const ambLightRef = useRef<THREE.AmbientLight>(null!);
  const sunLightRef = useRef<THREE.DirectionalLight>(null!);
  const moonLightRef = useRef<THREE.DirectionalLight>(null!);
  const starsRef = useRef<THREE.Points>(null!);
  const auroraMatRef = useRef<THREE.ShaderMaterial>(null!);
  const auroraMatRef2 = useRef<THREE.ShaderMaterial>(null!);
  const cloudRefs = useRef<(THREE.Group | null)[]>([]);
  const elapsedRef = useRef(0);

  // ── Sky dome material ──
  const skyMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uIsDay: { value: isDay ? 1.0 : 0.0 } },
    side: THREE.BackSide,
    depthWrite: false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Star geometry ──
  const starGeo = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 750;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const roll = Math.random();
      sizes[i] = roll < 0.75 ? 0.8 : roll < 0.95 ? 1.5 : 2.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  // ── Moon texture ──
  const moonTex = useMemo(createMoonTexture, []);

  // ── Aurora materials ──
  const auroraMat1 = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  const auroraMat2 = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  // ── Cloud material (shared) ──
  const cloudMat = useMemo(() => new THREE.MeshLambertMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  }), []);

  // ── useFrame: all sky animation ──
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    elapsedRef.current += dt;
    const e = elapsedRef.current;

    // Sky dome transition
    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uIsDay.value = THREE.MathUtils.lerp(
        skyMatRef.current.uniforms.uIsDay.value, isDay ? 1.0 : 0.0, dt * 0.8
      );
    }

    // Sun pulse (day)
    if (isDay && sunOuterRef.current) {
      const s = 1.0 + Math.sin(e * 0.4) * 0.03;
      sunOuterRef.current.scale.setScalar(s);
    }

    // Cloud drift (day)
    if (isDay) {
      for (let i = 0; i < cloudRefs.current.length; i++) {
        const c = cloudRefs.current[i];
        if (!c) continue;
        c.position.x += CLOUD_CONFIGS[i].speed * CLOUD_CONFIGS[i].dir * dt;
        if (c.position.x > 650) c.position.x = -650;
        if (c.position.x < -650) c.position.x = 650;
      }
    }

    // Aurora time (night)
    if (!isDay) {
      if (auroraMatRef.current) auroraMatRef.current.uniforms.uTime.value = e;
      if (auroraMatRef2.current) auroraMatRef2.current.uniforms.uTime.value = e + 2.5;
    }

    // Star twinkle (night)
    if (!isDay && starsRef.current) {
      (starsRef.current.material as THREE.PointsMaterial).opacity =
        0.85 + Math.sin(e * 0.3) * 0.05;
    }

    // Lighting transition
    if (ambLightRef.current) {
      ambLightRef.current.intensity = THREE.MathUtils.lerp(
        ambLightRef.current.intensity, isDay ? 0.7 : 0.4, dt * 0.6
      );
    }
    if (sunLightRef.current) {
      sunLightRef.current.intensity = THREE.MathUtils.lerp(
        sunLightRef.current.intensity, isDay ? 1.8 : 0.0, dt * 0.6
      );
    }
    if (moonLightRef.current) {
      moonLightRef.current.intensity = THREE.MathUtils.lerp(
        moonLightRef.current.intensity, isDay ? 0.0 : 0.3, dt * 0.6
      );
    }
  });

  return (
    <group>
      {/* ═══ SKY DOME ═══ */}
      <mesh renderOrder={-999}>
        <sphereGeometry args={[800, 24, 16]} />
        <primitive object={skyMat} ref={skyMatRef} attach="material" />
      </mesh>

      {/* ═══ LIGHTING ═══ */}
      <ambientLight ref={ambLightRef} color="#ffffff" intensity={isDay ? 0.7 : 0.4} />
      <directionalLight ref={sunLightRef} color="#fff4c2" intensity={isDay ? 1.8 : 0.0}
        position={[500, 200, -100]} />
      <directionalLight ref={moonLightRef} color="#8aa8d0" intensity={isDay ? 0.0 : 0.3}
        position={[-400, 280, -200]} />

      {/* ═══ SUN (day) ═══ */}
      <group position={[500, 200, -100]} visible={isDay}>
        {/* Outer corona */}
        <mesh ref={sunOuterRef}>
          <sphereGeometry args={[22, 12, 12]} />
          <meshBasicMaterial color="#fff4c2" transparent opacity={0.06} depthWrite={false} />
        </mesh>
        {/* Inner corona */}
        <mesh>
          <sphereGeometry args={[16, 12, 12]} />
          <meshBasicMaterial color="#ffe066" transparent opacity={0.18} depthWrite={false} />
        </mesh>
        {/* Sun disc */}
        <mesh>
          <sphereGeometry args={[10, 16, 16]} />
          <meshBasicMaterial color="#fffbe6" depthWrite={false} />
        </mesh>
        {/* Bright center */}
        <mesh>
          <sphereGeometry args={[6, 12, 12]} />
          <meshBasicMaterial color="#ffffff" depthWrite={false} />
        </mesh>
        {/* Lens flare sprites */}
        <mesh position={[-15, -8, 5]}>
          <circleGeometry args={[4, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-30, -16, 10]}>
          <circleGeometry args={[6, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-50, -26, 18]}>
          <circleGeometry args={[3, 8]} />
          <meshBasicMaterial color="#ffe8a0" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ═══ CLOUDS (day) ═══ */}
      <group visible={isDay}>
        {CLOUD_CONFIGS.map((cfg, i) => (
          <group
            key={i}
            ref={(el) => { cloudRefs.current[i] = el; }}
            position={[cfg.pos[0], cfg.pos[1], cfg.pos[2]]}
            scale={cfg.sc}
          >
            <mesh material={cloudMat}><sphereGeometry args={[18, 6, 4]} /></mesh>
            <mesh material={cloudMat} position={[20, -3, 0]}><sphereGeometry args={[14, 6, 4]} /></mesh>
            <mesh material={cloudMat} position={[-18, -4, 0]}><sphereGeometry args={[12, 6, 4]} /></mesh>
          </group>
        ))}
      </group>

      {/* ═══ STARS (night) ═══ */}
      <points ref={starsRef} geometry={starGeo} visible={!isDay}>
        <pointsMaterial
          color="#ffffff"
          size={1.5}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>

      {/* ═══ MOON (night) ═══ */}
      <group position={[-400, 280, -200]} visible={!isDay}>
        {/* Outer halo */}
        <mesh>
          <sphereGeometry args={[28, 12, 12]} />
          <meshBasicMaterial color="#c8d8f0" transparent opacity={0.06} depthWrite={false} />
        </mesh>
        {/* Glow ring */}
        <mesh>
          <sphereGeometry args={[20, 12, 12]} />
          <meshBasicMaterial color="#dde8f5" transparent opacity={0.15} depthWrite={false} />
        </mesh>
        {/* Moon disc */}
        <mesh>
          <sphereGeometry args={[14, 24, 24]} />
          <meshBasicMaterial map={moonTex} color="#f0f4f8" depthWrite={false} />
        </mesh>
      </group>

      {/* ═══ AURORA BOREALIS (night) ═══ */}
      <group visible={!isDay}>
        <mesh position={[0, 350, -600]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[1400, 400, 60, 20]} />
          <primitive object={auroraMat1} ref={auroraMatRef} attach="material" />
        </mesh>
        <mesh position={[100, 320, -550]} rotation={[-0.2, 0, 0]} scale={[0.8, 1.1, 1.0]}>
          <planeGeometry args={[1400, 400, 60, 20]} />
          <primitive object={auroraMat2} ref={auroraMatRef2} attach="material" />
        </mesh>
      </group>

      {/* ═══ FOG ═══ */}
      {isDay ? (
        <fog attach="fog" args={['#c9e8ff', 300, 1000]} />
      ) : (
        <fog attach="fog" args={['#0d0818', 200, 800]} />
      )}
    </group>
  );
}
