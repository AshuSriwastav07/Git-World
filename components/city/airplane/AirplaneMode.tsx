// AirplaneMode — Complete flight system with procedural plane + 3rd-person camera
// All physics via refs — zero React state in the render loop.
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { FlightCamera } from './FlightCamera';

/* ── Constants ── */
const BASE_SPEED = 40;
const ALT_SPEED = 20;
const PITCH_RATE = 0.6;
const YAW_RATE = 0.7;
const MIN_ALT = 5;
const MAX_ALT = 300;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ── Persistent key state ── */
interface KeyState {
  w: boolean; s: boolean; a: boolean; d: boolean;
  arrowup: boolean; arrowdown: boolean; arrowleft: boolean; arrowright: boolean;
  q: boolean; e: boolean;
}
const defaultKeys = (): KeyState => ({
  w: false, s: false, a: false, d: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
  q: false, e: false,
});

/* ── Pre-allocated exit target ── */
const EXIT_TARGET = new THREE.Vector3(80, 55, 160);

/* ── Main AirplaneMode component ── */
export function AirplaneMode() {
  const planeRef = useRef<THREE.Group>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const hintsRef = useRef<HTMLDivElement>(null);
  const { camera } = useThree();

  // Flight state — all refs, no React state
  const pos = useRef(new THREE.Vector3(20, 60, 20));
  const pitch = useRef(0);
  const yaw = useRef(0);
  const rollSmooth = useRef(0);
  const keys = useRef<KeyState>(defaultKeys());
  const exitingRef = useRef(false);
  const exitProgress = useRef(0);

  // Pre-allocated math objects — reuse every frame
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const flightCam = useMemo(() => new FlightCamera(), []);

  const setFlightMode = useCityStore(s => s.setFlightMode);
  const setActiveMode = useCityStore(s => s.setActiveMode);

  // ── Fade out hints after 8s ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hintsRef.current) {
        hintsRef.current.style.transition = 'opacity 1s ease-out';
        hintsRef.current.style.opacity = '0';
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // ── Keyboard listeners ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys.current) (keys.current as Record<string, boolean>)[k] = true;
      if (k === 'escape' && !exitingRef.current) {
        exitingRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys.current) (keys.current as Record<string, boolean>)[k] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── HUD update at 10fps ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hudRef.current) return;
      const alt = Math.round(pos.current.y);
      const hdg = Math.round(((((-yaw.current * 180) / Math.PI) % 360) + 360) % 360);
      hudRef.current.innerHTML =
        `<span>ALT: ${alt}m</span><br/><span>HDG: ${hdg}°</span><br/><span>SPD: ${BASE_SPEED}</span>`;
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ── Physics + camera update every frame ──
  useFrame((_, rawDelta) => {
    if (!planeRef.current) return;
    const dt = Math.min(rawDelta, 0.05);

    // ── Exit animation ──
    if (exitingRef.current) {
      exitProgress.current += dt;
      planeRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (!mat.transparent) { mat.transparent = true; mat.needsUpdate = true; }
          mat.opacity = Math.max(0, 1 - exitProgress.current * 2);
        }
      });
      camera.position.lerp(EXIT_TARGET, 0.03);
      camera.lookAt(0, 5, 0);
      if (exitProgress.current >= 1.5) {
        setFlightMode(false);
        setActiveMode('menu');
      }
      return;
    }

    // ── Read inputs ──
    const k = keys.current;
    const pitchInput = ((k.w || k.arrowup) ? 1 : 0) - ((k.s || k.arrowdown) ? 1 : 0);
    const yawInput = ((k.a || k.arrowleft) ? 1 : 0) - ((k.d || k.arrowright) ? 1 : 0);
    const altInput = (k.q ? 1 : 0) - (k.e ? 1 : 0);

    // ── Update rotation ──
    pitch.current += pitchInput * PITCH_RATE * dt;
    pitch.current = clamp(pitch.current, -0.5, 0.5);
    pitch.current *= 0.97;

    yaw.current += yawInput * YAW_RATE * dt;

    const targetRoll = yawInput * 0.4;
    rollSmooth.current += (targetRoll - rollSmooth.current) * 0.1;

    euler.set(pitch.current, -yaw.current, rollSmooth.current, 'YXZ');
    quat.setFromEuler(euler);
    planeRef.current.quaternion.slerp(quat, 0.15);

    forward.set(0, 0, 1).applyQuaternion(planeRef.current.quaternion);
    pos.current.addScaledVector(forward, BASE_SPEED * dt);

    pos.current.y += altInput * ALT_SPEED * dt;
    pos.current.y = clamp(pos.current.y, MIN_ALT, MAX_ALT);

    planeRef.current.position.copy(pos.current);

    flightCam.updateFromPlane(pos.current, planeRef.current.quaternion, camera, dt);
  });

  // Plane materials — created once
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8e8f0', roughness: 0.3, metalness: 0.6 }), []);
  const engineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a3a', roughness: 0.5, metalness: 0.4 }), []);
  const cockpitMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7eceff', emissive: '#3a8fcc', emissiveIntensity: 0.4 }), []);
  const trailMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, emissive: '#ffffff', emissiveIntensity: 0.5 }), []);

  useEffect(() => {
    return () => { [bodyMat, engineMat, cockpitMat, trailMat].forEach(m => m.dispose()); };
  }, [bodyMat, engineMat, cockpitMat, trailMat]);

  return (
    <>
      <group ref={planeRef} position={[20, 60, 20]}>
        {/* Fuselage */}
        <mesh material={bodyMat}>
          <boxGeometry args={[0.4, 0.3, 3.0]} />
        </mesh>
        {/* Wings */}
        <mesh position={[-1.75, 0, 0.2]} material={bodyMat}>
          <boxGeometry args={[3.5, 0.08, 1.2]} />
        </mesh>
        <mesh position={[1.75, 0, 0.2]} material={bodyMat}>
          <boxGeometry args={[3.5, 0.08, 1.2]} />
        </mesh>
        {/* Tail fin vertical */}
        <mesh position={[0, 0.4, -1.3]} material={bodyMat}>
          <boxGeometry args={[0.06, 0.8, 0.6]} />
        </mesh>
        {/* Tail fins horizontal */}
        <mesh position={[-0.45, 0.3, -1.3]} material={bodyMat}>
          <boxGeometry args={[0.9, 0.06, 0.4]} />
        </mesh>
        <mesh position={[0.45, 0.3, -1.3]} material={bodyMat}>
          <boxGeometry args={[0.9, 0.06, 0.4]} />
        </mesh>
        {/* Engines */}
        <mesh position={[-1.2, -0.1, 0.4]} rotation={[0, 0, Math.PI / 2]} material={engineMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        </mesh>
        <mesh position={[1.2, -0.1, 0.4]} rotation={[0, 0, Math.PI / 2]} material={engineMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        </mesh>
        {/* Cockpit */}
        <mesh position={[0, 0.15, 1.1]} material={cockpitMat}>
          <boxGeometry args={[0.25, 0.15, 0.3]} />
        </mesh>
        {/* Wing tip trails */}
        <mesh position={[-1.75, 0, -0.8]} material={trailMat}>
          <boxGeometry args={[0.05, 0.05, 2.0]} />
        </mesh>
        <mesh position={[1.75, 0, -0.8]} material={trailMat}>
          <boxGeometry args={[0.05, 0.05, 2.0]} />
        </mesh>
        {/* Engine glow */}
        <pointLight position={[-1.2, -0.1, 0.4]} color="#ff6600" intensity={0.8} distance={8} />
        <pointLight position={[1.2, -0.1, 0.4]} color="#ff6600" intensity={0.8} distance={8} />
      </group>

      {/* Flight HUD — rendered via drei Html as fullscreen overlay */}
      <Html fullscreen zIndexRange={[40, 40]} style={{ pointerEvents: 'none' }}>
        <div
          ref={hudRef}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: '#fbbf24',
            lineHeight: '20px',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
          }}
        />
        <div
          ref={hintsRef}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            fontSize: 10,
            color: '#a8a8b8',
            whiteSpace: 'nowrap',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
          }}
        >
          W/S: Pitch · A/D: Turn · Q/E: Alt · ESC: Exit
        </div>
      </Html>
    </>
  );
}
