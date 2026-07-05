// RepoCrown — Rotating crystal ornament at top of repo buildings
// Uses shared clock from parent useFrame instead of individual useFrame per instance
'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RepoCrownProps {
  color: string;
  y: number;
}

// Single shared rotation ref across all RepoCrown instances
let _sharedRotation = 0;
let _lastFrameId = -1;

export function RepoCrown({ color, y }: RepoCrownProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    // Only compute rotation once per frame across all instances
    const frameId = Math.floor(state.clock.elapsedTime * 1000);
    if (frameId !== _lastFrameId) {
      _sharedRotation = state.clock.elapsedTime * Math.PI;
      _lastFrameId = frameId;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = _sharedRotation;
    }
    state.invalidate();
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
