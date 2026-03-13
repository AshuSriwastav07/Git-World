// ParkCharacter — Minecraft character figure with idle animation
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { SlimUser } from '@/lib/supabaseDb';
import { langColor } from '@/lib/textureGenerator';
import { useCityStore } from '@/lib/cityStore';

interface ParkCharacterProps {
  developer: SlimUser;
  position: [number, number, number];
}

export function ParkCharacter({ developer, position }: ParkCharacterProps) {
  const headRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const bodyColor = langColor(developer.topLanguage);

  useFrame((state) => {
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.15;
    }
    state.invalidate();
  });

  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelectedUser(developer);
  };

  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* Head */}
      <mesh ref={headRef} position={[0, 1.75, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>

      {/* Body */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.7, 0.9, 0.4]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.55, 1.0, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.25, 0.7, 0.25]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>

      {/* Right arm */}
      <mesh position={[0.55, 1.0, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.25, 0.7, 0.25]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.2, 0.35, 0]}>
        <boxGeometry args={[0.3, 0.7, 0.3]} />
        <meshLambertMaterial color="#3344aa" />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.2, 0.35, 0]}>
        <boxGeometry args={[0.3, 0.7, 0.3]} />
        <meshLambertMaterial color="#3344aa" />
      </mesh>

      {/* Username label — visible within 45 units */}
      <Html position={[0, 2.5, 0]} center distanceFactor={45} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: '#ffffff',
          background: 'rgba(0,0,0,0.7)',
          padding: '2px 4px',
          borderRadius: '2px',
          whiteSpace: 'nowrap',
        }}>
          @{developer.login}
        </div>
      </Html>
    </group>
  );
}
