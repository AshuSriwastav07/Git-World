// NetflixBuilding — Inspired by Netflix HQ (Los Gatos)
// S-curve stacked slab tower with red N branding
'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface NetflixBuildingProps {
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
  ctx.font = 'bold 40px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function createNLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 256);
  // Draw Netflix N
  ctx.fillStyle = '#E50914';
  ctx.fillRect(40, 30, 30, 196);   // left bar
  ctx.fillRect(186, 30, 30, 196);  // right bar
  // Diagonal
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(40, 30);
  ctx.lineTo(70, 30);
  ctx.lineTo(216, 226);
  ctx.lineTo(186, 226);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

// Tower slab configuration for S-curve silhouette
const SLABS = [
  { w: 14, h: 4, d: 10, y: 2,    x: 0 },
  { w: 13, h: 4, d: 9.5, y: 6,   x: 0.5 },
  { w: 12, h: 4, d: 9,  y: 10,   x: 0.8 },
  { w: 11, h: 4, d: 8.5, y: 14,  x: 0.4 },
  { w: 10, h: 4, d: 8,  y: 18,   x: 0 },
  { w: 9,  h: 3, d: 7.5, y: 21.5, x: -0.3 },
];

export function NetflixBuilding({ position = [0, 0, 0], scale = 1 }: NetflixBuildingProps) {
  const isNight = useCityStore(s => s.isNight);
  const antennaLightRef = useRef<THREE.Mesh>(null);

  const signTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createSignTexture('NETFLIX', '#E50914', '#141414');
  }, []);

  const nLogoTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createNLogoTexture();
  }, []);

  // Blink the antenna light
  useFrame((state) => {
    if (antennaLightRef.current) {
      const t = state.clock.getElapsedTime();
      const blink = Math.sin(t * 3) > 0;
      (antennaLightRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = blink ? 1.5 : 0.2;
    }
    state.invalidate();
  });

  return (
    <group position={position} scale={scale}>
      {/* Tower slabs — stacked with S-curve offset */}
      {SLABS.map((slab, i) => (
        <group key={`slab-${i}`}>
          <mesh position={[slab.x, slab.y, 0]}>
            <boxGeometry args={[slab.w, slab.h, slab.d]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.4}
              emissive={isNight ? '#0a0a0a' : '#000'}
              emissiveIntensity={isNight ? 0.2 : 0}
            />
          </mesh>
          {/* Glass curtain wall stripe on each slab (front face) */}
          <mesh position={[slab.x, slab.y, slab.d / 2 + 0.02]}>
            <boxGeometry args={[slab.w * 0.95, slab.h * 0.6, 0.02]} />
            <meshStandardMaterial
              color="#334455"
              transparent
              opacity={0.5}
              emissive={isNight ? '#223344' : '#000'}
              emissiveIntensity={isNight ? 0.5 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Netflix N logo panel on slab 3 (front face) */}
      <mesh position={[SLABS[2].x, SLABS[2].y, SLABS[2].d / 2 + 0.05]}>
        <boxGeometry args={[4, 4, 0.1]} />
        <meshBasicMaterial map={nLogoTex} />
      </mesh>

      {/* NETFLIX sign on slab 2 */}
      <mesh position={[SLABS[1].x, SLABS[1].y, SLABS[1].d / 2 + 0.05]}>
        <boxGeometry args={[10, 1.5, 0.1]} />
        <meshBasicMaterial map={signTex} />
      </mesh>

      {/* Red carpet ground feature */}
      <mesh position={[0, 0.25, 8]}>
        <boxGeometry args={[4, 0.5, 10]} />
        <meshStandardMaterial
          color="#E50914"
          emissive="#E50914"
          emissiveIntensity={isNight ? 0.4 : 0.15}
        />
      </mesh>

      {/* Roof antenna */}
      <mesh position={[SLABS[5].x, 24, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Blinking red light at antenna tip */}
      <mesh ref={antennaLightRef} position={[SLABS[5].x, 27, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial
          color="#E50914"
          emissive="#ff0000"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Glass lobby at base */}
      <mesh position={[0, 2.5, 6]}>
        <boxGeometry args={[8, 5, 5]} />
        <meshStandardMaterial
          color="#aaaaaa"
          transparent
          opacity={0.5}
          emissive={isNight ? '#444444' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {isNight && (
        <>
          <pointLight position={[0, 10, 5]} color="#E50914" intensity={3} distance={20} />
          <pointLight position={[0, 20, 0]} color="#ffffff" intensity={1.5} distance={15} />
          <pointLight position={[SLABS[5].x, 27, 0]} color="#E50914" intensity={2} distance={10} />
        </>
      )}
    </group>
  );
}
