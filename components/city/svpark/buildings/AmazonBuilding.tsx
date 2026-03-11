// AmazonBuilding — Inspired by The Spheres (Seattle HQ)
// Three glass sphere domes + steel frame + entry lobby
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface AmazonBuildingProps {
  position?: [number, number, number];
  scale?: number;
}

function createSignTexture(text: string, color: string, bgColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.font = 'bold 48px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function AmazonBuilding({ position = [0, 0, 0], scale = 1 }: AmazonBuildingProps) {
  const isNight = useCityStore(s => s.isNight);

  const signTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createSignTexture('AMAZON', '#FF9900', '#111111');
  }, []);

  return (
    <group position={position} scale={scale}>
      {/* Base platform connecting the three spheres */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[22, 1.5, 14]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>

      {/* Sphere 1 — Main center dome (top half) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#c8e8f0"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.7}
          emissive="#1a4a5a"
          emissiveIntensity={isNight ? 0.3 : 0.15}
        />
      </mesh>

      {/* Sphere 2 — Left dome */}
      <mesh position={[-7, 0, 0]}>
        <sphereGeometry args={[4.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#c8e8f0"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.7}
          emissive="#1a4a5a"
          emissiveIntensity={isNight ? 0.3 : 0.15}
        />
      </mesh>

      {/* Sphere 3 — Right dome */}
      <mesh position={[6, 0, 0]}>
        <sphereGeometry args={[4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#c8e8f0"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.7}
          emissive="#1a4a5a"
          emissiveIntensity={isNight ? 0.3 : 0.15}
        />
      </mesh>

      {/* Plants inside the spheres (visible through glass) */}
      {[
        [0, 1.5, 0], [-1.5, 1, 1], [1, 1.2, -1],
        [-7, 1, 0], [-8, 0.8, 1],
        [6, 0.8, 0], [5.5, 1, 0.8],
      ].map((pos, i) => (
        <mesh key={`plant-${i}`} position={pos as [number, number, number]}>
          <boxGeometry args={[0.8, 1.5 + (i % 3) * 0.5, 0.8]} />
          <meshStandardMaterial
            color="#2d8a2d"
            emissive={isNight ? '#1a5a1a' : '#000'}
            emissiveIntensity={isNight ? 0.4 : 0}
          />
        </mesh>
      ))}

      {/* Entry lobby connecting sphere 1 and 2 */}
      <mesh position={[-3.5, 2, 0]}>
        <boxGeometry args={[8, 4, 5]} />
        <meshStandardMaterial
          color="#4a4a5a"
          transparent
          opacity={0.6}
          emissive={isNight ? '#2a2a3a' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Steel frame grid lines on main sphere */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={`frame-v-${i}`} position={[Math.cos(angle) * 6.1, 3, Math.sin(angle) * 6.1]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.08, 6, 0.08]} />
            <meshStandardMaterial color="#2a3a3a" />
          </mesh>
        );
      })}

      {/* Horizontal frame rings */}
      {[2, 4].map((y, i) => (
        <mesh key={`frame-h-${i}`} position={[0, y, 0]}>
          <torusGeometry args={[Math.sqrt(36 - y * y), 0.04, 4, 16]} />
          <meshStandardMaterial color="#2a3a3a" />
        </mesh>
      ))}

      {/* Sign above main sphere */}
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[8, 2, 0.2]} />
        <meshBasicMaterial map={signTex} />
      </mesh>

      {isNight && (
        <>
          <pointLight position={[0, 4, 0]} color="#c8e8f0" intensity={2} distance={15} />
          <pointLight position={[-7, 3, 0]} color="#c8e8f0" intensity={1} distance={10} />
          <pointLight position={[6, 3, 0]} color="#c8e8f0" intensity={1} distance={10} />
        </>
      )}
    </group>
  );
}
