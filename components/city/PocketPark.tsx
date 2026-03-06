// PocketPark — small green space embedded inside city blocks
'use client';
import * as THREE from 'three';

interface PocketParkProps {
  x: number;
  z: number;
}

const grassMat = new THREE.MeshLambertMaterial({ color: '#4a8c1c' });
const woodMat  = new THREE.MeshLambertMaterial({ color: '#5c3d1e' });
const leafMat  = new THREE.MeshLambertMaterial({ color: '#2d6e1e' });
const benchMat = new THREE.MeshLambertMaterial({ color: '#8b7355' });

export default function PocketPark({ x, z }: PocketParkProps) {
  return (
    <group position={[x, 0, z]}>
      {/* Grass pad */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[4, 0.1, 4]} />
        <primitive object={grassMat} />
      </mesh>
      {/* Tree trunk */}
      <mesh position={[-1, 1, -1]}>
        <boxGeometry args={[0.4, 2, 0.4]} />
        <primitive object={woodMat} />
      </mesh>
      {/* Tree leaves */}
      <mesh position={[-1, 2.8, -1]}>
        <boxGeometry args={[1.8, 1.6, 1.8]} />
        <primitive object={leafMat} />
      </mesh>
      {/* Bench seat */}
      <mesh position={[0.8, 0.45, 0]}>
        <boxGeometry args={[1.4, 0.1, 0.5]} />
        <primitive object={benchMat} />
      </mesh>
      {/* Bench legs */}
      <mesh position={[0.3, 0.2, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.5]} />
        <primitive object={benchMat} />
      </mesh>
      <mesh position={[1.3, 0.2, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.5]} />
        <primitive object={benchMat} />
      </mesh>
    </group>
  );
}
