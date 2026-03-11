// TeslaBuilding — Inspired by Tesla Gigafactory / Design Studio
// Angular dark factory with red accents, solar panels, charging stations
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface TeslaBuildingProps {
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

export function TeslaBuilding({ position = [0, 0, 0], scale = 1 }: TeslaBuildingProps) {
  const isNight = useCityStore(s => s.isNight);

  const signTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createSignTexture('TESLA', '#E31937', '#0f0f0f');
  }, []);

  return (
    <group position={position} scale={scale}>
      {/* Main factory body */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[28, 5, 18]} />
        <meshStandardMaterial
          color="#1a1a1f"
          roughness={0.6}
          emissive={isNight ? '#0a0a0f' : '#000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Angled roof section (wedge effect via slight Z rotation) */}
      <mesh position={[0, 5.5, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[28, 3, 18]} />
        <meshStandardMaterial
          color="#1a1a1f"
          roughness={0.6}
          emissive={isNight ? '#0a0a0f' : '#000'}
          emissiveIntensity={isNight ? 0.2 : 0}
        />
      </mesh>

      {/* Red accent stripe along front face */}
      <mesh position={[0, 3.5, 9.05]}>
        <boxGeometry args={[28.1, 0.4, 0.1]} />
        <meshStandardMaterial
          color="#E31937"
          emissive="#E31937"
          emissiveIntensity={isNight ? 0.6 : 0.2}
        />
      </mesh>

      {/* Solar panels on roof */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`solar-${i}`} position={[-10 + i * 4.5, 7.2, 0]}>
          <boxGeometry args={[4, 0.1, 3]} />
          <meshStandardMaterial
            color="#1a2a4a"
            roughness={0.3}
            metalness={0.4}
            emissive={isNight ? '#0a1a3a' : '#000'}
            emissiveIntensity={isNight ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* Charging station canopies */}
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={`charger-${i}`} position={[-7.5 + i * 5, 0, 14]}>
          {/* Canopy */}
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[4, 0.15, 5]} />
            <meshStandardMaterial color="#1a1a1f" roughness={0.6} />
          </mesh>
          {/* Support columns */}
          <mesh position={[-1.5, 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 4, 6]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[1.5, 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 4, 6]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          {/* Charging connector (glowing red) */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.4, 0.6, 0.4]} />
            <meshStandardMaterial
              color="#E31937"
              emissive="#ff2222"
              emissiveIntensity={isNight ? 0.8 : 0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Glass entrance */}
      <mesh position={[0, 2, 9.25]}>
        <boxGeometry args={[6, 4, 0.5]} />
        <meshStandardMaterial
          color="#aaccdd"
          transparent
          opacity={0.6}
          emissive={isNight ? '#4488aa' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Sign on front wall */}
      <mesh position={[0, 5, 9.1]}>
        <boxGeometry args={[10, 2, 0.1]} />
        <meshBasicMaterial map={signTex} />
      </mesh>

      {/* Red accent stripe on side walls */}
      <mesh position={[14.05, 3.5, 0]}>
        <boxGeometry args={[0.1, 0.4, 18.1]} />
        <meshStandardMaterial
          color="#E31937"
          emissive="#E31937"
          emissiveIntensity={isNight ? 0.4 : 0.1}
        />
      </mesh>
      <mesh position={[-14.05, 3.5, 0]}>
        <boxGeometry args={[0.1, 0.4, 18.1]} />
        <meshStandardMaterial
          color="#E31937"
          emissive="#E31937"
          emissiveIntensity={isNight ? 0.4 : 0.1}
        />
      </mesh>

      {isNight && (
        <>
          <pointLight position={[0, 5, 9]} color="#E31937" intensity={2} distance={15} />
          <pointLight position={[0, 7, 0]} color="#ffffff" intensity={1} distance={20} />
        </>
      )}
    </group>
  );
}
