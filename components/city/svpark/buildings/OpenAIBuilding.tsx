// OpenAIBuilding — Inspired by OpenAI HQ / minimalist AI research lab
// Clean white modernist building with green-teal accents
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface OpenAIBuildingProps {
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

export function OpenAIBuilding({ position = [0, 0, 0], scale = 1 }: OpenAIBuildingProps) {
  const isNight = useCityStore(s => s.isNight);

  const signTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createSignTexture('OPENAI', '#10a37f', '#ffffff');
  }, []);

  return (
    <group position={position} scale={scale}>
      {/* Main building body — clean white */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[26, 6, 18]} />
        <meshStandardMaterial
          color="#f5f5f5"
          roughness={0.4}
          emissive={isNight ? '#222222' : '#000'}
          emissiveIntensity={isNight ? 0.15 : 0}
        />
      </mesh>

      {/* Upper floor — slightly narrower */}
      <mesh position={[0, 7, 0]}>
        <boxGeometry args={[24, 2, 16]} />
        <meshStandardMaterial
          color="#eeeeee"
          roughness={0.4}
          emissive={isNight ? '#1a1a1a' : '#000'}
          emissiveIntensity={isNight ? 0.15 : 0}
        />
      </mesh>

      {/* Teal accent band along top */}
      <mesh position={[0, 6.05, 9.05]}>
        <boxGeometry args={[26.1, 0.5, 0.1]} />
        <meshStandardMaterial
          color="#10a37f"
          emissive="#10a37f"
          emissiveIntensity={isNight ? 0.6 : 0.2}
        />
      </mesh>

      {/* Side teal accent bands */}
      <mesh position={[13.05, 6.05, 0]}>
        <boxGeometry args={[0.1, 0.5, 18.1]} />
        <meshStandardMaterial
          color="#10a37f"
          emissive="#10a37f"
          emissiveIntensity={isNight ? 0.4 : 0.1}
        />
      </mesh>
      <mesh position={[-13.05, 6.05, 0]}>
        <boxGeometry args={[0.1, 0.5, 18.1]} />
        <meshStandardMaterial
          color="#10a37f"
          emissive="#10a37f"
          emissiveIntensity={isNight ? 0.4 : 0.1}
        />
      </mesh>

      {/* Large glass windows on front */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`window-${i}`} position={[-9 + i * 4.5, 3, 9.15]}>
          <boxGeometry args={[3, 4, 0.1]} />
          <meshStandardMaterial
            color="#88cccc"
            transparent
            opacity={0.5}
            emissive={isNight ? '#10a37f' : '#000'}
            emissiveIntensity={isNight ? 0.4 : 0}
          />
        </mesh>
      ))}

      {/* Glass entrance */}
      <mesh position={[0, 2, 9.25]}>
        <boxGeometry args={[6, 4, 0.5]} />
        <meshStandardMaterial
          color="#aadddd"
          transparent
          opacity={0.6}
          emissive={isNight ? '#10a37f' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Sign on front */}
      <mesh position={[0, 7, 9.1]}>
        <boxGeometry args={[10, 2, 0.1]} />
        <meshBasicMaterial map={signTex} />
      </mesh>

      {/* Rooftop server/antenna structures */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`server-${i}`} position={[-6 + i * 6, 8.5, 0]}>
          <boxGeometry args={[2, 1, 2]} />
          <meshStandardMaterial
            color="#999999"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      ))}

      {isNight && (
        <>
          <pointLight position={[0, 7, 9]} color="#10a37f" intensity={2} distance={15} />
          <pointLight position={[0, 9, 0]} color="#ffffff" intensity={1} distance={20} />
        </>
      )}
    </group>
  );
}
