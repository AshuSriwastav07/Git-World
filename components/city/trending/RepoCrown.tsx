// RepoCrown — Rotating crystal ornament at top of repo buildings
'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RepoCrownProps {
  color: string; // language color tint
  y: number;     // height to place the crown
}

export function RepoCrown({ color, y }: RepoCrownProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * Math.PI; // 0.5 rotations/sec
    }
  });

  return (
    <group ref={groupRef} position={[0, y + 0.8, 0]}>
      {/* Central diamond */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.6} />
      </mesh>
      {/* Surrounding small crystals */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4]}
          rotation={[Math.PI / 4, angle, Math.PI / 4]}
        >
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
