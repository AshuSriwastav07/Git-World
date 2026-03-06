// Airplane — Minecraft block airplane with flight physics
'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

const MIN_ALTITUDE = 15;
const MAX_ALTITUDE = 400;

export function Airplane() {
  const groupRef = useRef<THREE.Group>(null);
  const propellerRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const isNight = useCityStore((s) => s.isNightMode);

  const state = useRef({
    throttle: 0,
    speed: 8,
    yaw: 0,
    pitch: 0,
    roll: 0,
    position: new THREE.Vector3(0, 80, 0),
    direction: new THREE.Euler(0, 0, 0),
    keys: new Set<string>(),
    blinkTimer: 0,
    blinkOn: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      state.current.keys.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      state.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const s = state.current;
    const keys = s.keys;

    // Throttle
    if (keys.has('w')) s.throttle = Math.min(s.throttle + delta * 1.5, 1);
    else if (keys.has('s')) s.throttle = Math.max(s.throttle - delta * 1.5, 0);

    // Speed
    const targetSpeed = 8 + s.throttle * 42;
    const boost = keys.has('shift') ? 2 : 1;
    s.speed += (targetSpeed * boost - s.speed) * delta * 3;

    // Yaw (turn)
    if (keys.has('a')) s.yaw += 1.2 * delta;
    if (keys.has('d')) s.yaw -= 1.2 * delta;

    // Pitch
    if (keys.has('q')) s.pitch = Math.max(s.pitch - 0.8 * delta, -0.6);
    if (keys.has('e')) s.pitch = Math.min(s.pitch + 0.8 * delta, 0.6);

    // Banking roll
    const targetRoll = keys.has('a') ? 0.35 : keys.has('d') ? -0.35 : 0;
    s.roll += (targetRoll - s.roll) * delta * 5;

    // Update direction
    s.direction.y += s.yaw * delta;
    s.yaw *= 0.92; // Damping

    // Move forward
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(s.direction);
    forward.y = Math.sin(s.pitch) * 0.5;
    forward.normalize();
    s.position.addScaledVector(forward, s.speed * delta);

    // Clamp altitude
    s.position.y = Math.max(MIN_ALTITUDE, Math.min(MAX_ALTITUDE, s.position.y));
    s.pitch *= 0.95; // Return to level

    // Update airplane mesh
    if (groupRef.current) {
      groupRef.current.position.copy(s.position);
      groupRef.current.rotation.set(s.pitch, s.direction.y, s.roll);
    }

    // Propeller spin
    if (propellerRef.current) {
      propellerRef.current.rotation.x += delta * (8 + s.throttle * 22);
    }

    // Camera follow — 22 behind, 9 above
    const cameraOffset = new THREE.Vector3(0, 9, 22);
    cameraOffset.applyEuler(new THREE.Euler(0, s.direction.y, 0));
    const targetCamPos = s.position.clone().add(cameraOffset);
    camera.position.lerp(targetCamPos, 0.07);
    camera.lookAt(s.position);

    // Blink timer for tail light
    s.blinkTimer += delta;
    if (s.blinkTimer > 0.8) {
      s.blinkTimer = 0;
      s.blinkOn = !s.blinkOn;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh>
        <boxGeometry args={[7, 2.2, 2.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Cockpit */}
      <mesh position={[2.5, 0.9, 0]}>
        <boxGeometry args={[2, 1.4, 2]} />
        <meshLambertMaterial color="#66ccff" transparent opacity={0.7} />
      </mesh>

      {/* Left wing */}
      <mesh position={[0, -0.2, 4.5]}>
        <boxGeometry args={[1.2, 0.4, 9]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Right wing */}
      <mesh position={[0, -0.2, -4.5]}>
        <boxGeometry args={[1.2, 0.4, 9]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Vertical tail fin */}
      <mesh position={[-3, 1.5, 0]}>
        <boxGeometry args={[2.2, 2.2, 0.4]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Left horizontal stabilizer */}
      <mesh position={[-3, 0.2, 1.6]}>
        <boxGeometry args={[0.4, 0.3, 3.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Right horizontal stabilizer */}
      <mesh position={[-3, 0.2, -1.6]}>
        <boxGeometry args={[0.4, 0.3, 3.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Engine nacelle */}
      <mesh position={[3.8, -0.2, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshLambertMaterial color="#888888" />
      </mesh>

      {/* Propeller */}
      <group ref={propellerRef} position={[4.6, -0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 4.5, 0.2]} />
          <meshLambertMaterial color="#444444" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.3, 4.5, 0.2]} />
          <meshLambertMaterial color="#444444" />
        </mesh>
      </group>

      {/* Banner */}
      <mesh position={[-1, -1.3, 0]}>
        <boxGeometry args={[5, 0.6, 0.1]} />
        <meshLambertMaterial color="#ff4444" />
      </mesh>

      {/* Night mode lights */}
      {isNight && (
        <>
          <pointLight position={[0, -0.2, 5]} color="red" intensity={2} distance={15} />
          <pointLight position={[0, -0.2, -5]} color="green" intensity={2} distance={15} />
          <pointLight position={[-3, 2.5, 0]} color="white" intensity={1.5} distance={20} />
        </>
      )}
    </group>
  );
}
