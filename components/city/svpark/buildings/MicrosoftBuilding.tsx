// MicrosoftBuilding — Inspired by Microsoft Campus (Redmond)
// Wide low glass-and-concrete building with wing extensions
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface MicrosoftBuildingProps {
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
  ctx.font = 'bold 36px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function MicrosoftBuilding({ position = [0, 0, 0], scale = 1 }: MicrosoftBuildingProps) {
  const isNight = useCityStore(s => s.isNight);

  const signTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createSignTexture('MICROSOFT', '#00a4ef', '#1a1a2e');
  }, []);

  return (
    <group position={position} scale={scale}>
      {/* Main building block — wide and low */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[24, 6, 14]} />
        <meshStandardMaterial
          color="#c8ccd0"
          roughness={0.7}
          emissive={isNight ? '#1a1a2a' : '#000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Horizontal glass band (windows) */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[24.1, 2, 14.1]} />
        <meshStandardMaterial
          color="#88aacc"
          roughness={0.05}
          transparent
          opacity={0.8}
          emissive={isNight ? '#3366aa' : '#000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>

      {/* Left wing extension */}
      <mesh position={[-16, 2.5, 0]}>
        <boxGeometry args={[8, 5, 10]} />
        <meshStandardMaterial
          color="#c8ccd0"
          roughness={0.7}
          emissive={isNight ? '#1a1a2a' : '#000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Right wing extension */}
      <mesh position={[16, 2.5, 0]}>
        <boxGeometry args={[8, 5, 10]} />
        <meshStandardMaterial
          color="#c8ccd0"
          roughness={0.7}
          emissive={isNight ? '#1a1a2a' : '#000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Roof HVAC units */}
      {[[-10, 6.75, -5], [10, 6.75, -5], [-10, 6.75, 5], [10, 6.75, 5]].map((pos, i) => (
        <mesh key={`hvac-${i}`} position={pos as [number, number, number]}>
          <boxGeometry args={[2, 1.5, 2]} />
          <meshStandardMaterial color="#888888" roughness={0.6} />
        </mesh>
      ))}

      {/* Entry canopy */}
      <mesh position={[0, 3, 9]}>
        <boxGeometry args={[12, 0.3, 4]} />
        <meshStandardMaterial color="#c8ccd0" roughness={0.7} />
      </mesh>

      {/* Canopy support columns */}
      {[-4.5, -1.5, 1.5, 4.5].map((x, i) => (
        <mesh key={`col-${i}`} position={[x, 1.5, 9]}>
          <cylinderGeometry args={[0.2, 0.2, 3, 8]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      ))}

      {/* Flag poles with Microsoft blue flags */}
      {[-8, 0, 8].map((x, i) => (
        <group key={`flag-${i}`} position={[x, 0, 11]}>
          <mesh position={[0, 4, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 8, 6]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
          <mesh position={[0.6, 7, 0]}>
            <boxGeometry args={[1.2, 0.8, 0.05]} />
            <meshStandardMaterial
              color="#00a4ef"
              emissive={isNight ? '#00a4ef' : '#000'}
              emissiveIntensity={isNight ? 0.5 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Sign on front facade */}
      <mesh position={[0, 4, 7.02]}>
        <boxGeometry args={[12, 2, 0.1]} />
        <meshBasicMaterial map={signTex} />
      </mesh>

      {/* Window panels on wings */}
      {[-16, 16].map((wx, wi) =>
        Array.from({ length: 3 }).map((_, row) => (
          <mesh key={`wing-glass-${wi}-${row}`} position={[wx, 1.5 + row * 1.3, 5.02]}>
            <boxGeometry args={[6, 1, 0.02]} />
            <meshStandardMaterial
              color="#88aacc"
              transparent
              opacity={0.5}
              emissive={isNight ? '#3366aa' : '#000'}
              emissiveIntensity={isNight ? 0.5 : 0}
            />
          </mesh>
        ))
      )}

      {isNight && (
        <>
          <pointLight position={[0, 4, 9]} color="#ffffff" intensity={2} distance={15} />
          <pointLight position={[0, 6, 0]} color="#88aacc" intensity={1.5} distance={20} />
        </>
      )}
    </group>
  );
}
