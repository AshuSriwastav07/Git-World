// CentralPlaza — circular meeting point at center of Silicon Valley Park
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

const COMPANY_COLORS = ['#c0c0c0', '#4285f4', '#76b900', '#0082fb']; // Apple, Google, NVIDIA, Meta

// Pre-allocated color objects to avoid GC in useFrame
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

export function CentralPlaza() {
  const isNight = useCityStore(s => s.isNight);
  const orbRef = useRef<THREE.Mesh>(null);
  const orbLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const idx = Math.floor((t * 0.3) % 4);
    const nextIdx = (idx + 1) % 4;
    const blend = (t * 0.3) % 1;

    _c1.set(COMPANY_COLORS[idx]);
    _c2.set(COMPANY_COLORS[nextIdx]);
    const blended = _c1.lerp(_c2, blend);

    if (orbRef.current) {
      (orbRef.current.material as THREE.MeshStandardMaterial).emissive.copy(blended);
      (orbRef.current.material as THREE.MeshStandardMaterial).color.copy(blended);
    }
    if (orbLightRef.current) {
      orbLightRef.current.color.copy(blended);
    }
    state.invalidate();
  });

  return (
    <group>
      {/* Raised circular platform */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshLambertMaterial color="#4a4a4a" emissive={isNight ? '#222' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>

      {/* Inner ring pattern */}
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9, 10, 32]} />
        <meshLambertMaterial color="#666" emissive={isNight ? '#333' : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
      </mesh>

      {/* Glowing central orb */}
      <mesh ref={orbRef} position={[0, 3, 0]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#fff"
          emissiveIntensity={1.2}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Orb pedestal */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 2, 8]} />
        <meshLambertMaterial color="#555" emissive={isNight ? '#333' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>

      {/* Orb glow sphere */}
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[3.5, 16, 16]} />
        <meshBasicMaterial color="#fff" transparent opacity={isNight ? 0.08 : 0.03} depthWrite={false} />
      </mesh>

      {/* Point light from orb */}
      {isNight && (
        <pointLight ref={orbLightRef} position={[0, 3, 0]} intensity={4} distance={25} color="#fff" />
      )}

      {/* Four curved benches facing outward */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <group key={i} position={[Math.cos(angle) * 8, 0.15, Math.sin(angle) * 8]} rotation={[0, -angle + Math.PI, 0]}>
          {/* Bench seat */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[3, 0.25, 0.8]} />
            <meshLambertMaterial color="#5c3d1a" emissive={isNight ? '#3a2510' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
          {/* Bench supports */}
          <mesh position={[-1, 0.2, 0]}>
            <boxGeometry args={[0.25, 0.4, 0.6]} />
            <meshLambertMaterial color="#4a3018" />
          </mesh>
          <mesh position={[1, 0.2, 0]}>
            <boxGeometry args={[0.25, 0.4, 0.6]} />
            <meshLambertMaterial color="#4a3018" />
          </mesh>
        </group>
      ))}

      {/* Ring of colored accent lights around platform edge */}
      {isNight && Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const color = COMPANY_COLORS[i % 4];
        return (
          <group key={`light-${i}`}>
            <mesh position={[Math.cos(a) * 11, 0.3, Math.sin(a) * 11]}>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <pointLight
              position={[Math.cos(a) * 11, 0.5, Math.sin(a) * 11]}
              color={color}
              intensity={1}
              distance={5}
            />
          </group>
        );
      })}
    </group>
  );
}
