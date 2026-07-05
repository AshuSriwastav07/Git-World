// BurjKhalifaTower — Massive 104-unit Burj Khalifa landmark at park center
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

// Canvas-texture for the GIT WORLD logo panels on the tower
function createLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#07050f';
  ctx.fillRect(0, 0, 512, 256);

  // Gold border
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 248);

  // GIT in gold
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5c518';
  ctx.fillText('GIT', 180, 128);

  // WORLD in white
  ctx.fillStyle = '#ffffff';
  ctx.fillText('WORLD', 370, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Tri-petal base (Y-shape) — 3 rectangular volumes 120° apart
function TriPetalBase() {
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  return (
    <group>
      {angles.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 1.5, 4, Math.sin(a) * 1.5]} rotation={[0, a, 0]}>
          <boxGeometry args={[6, 8, 4]} />
          <meshLambertMaterial color="#c8c8c8" />
        </mesh>
      ))}
    </group>
  );
}

// Horizontal banding lines every N units
function HorizontalBands({ y, height, width, spacing, color }: {
  y: number; height: number; width: number; spacing: number; color: string;
}) {
  const bands = [];
  for (let h = 0; h < height; h += spacing) {
    bands.push(
      <mesh key={h} position={[0, y + h, 0]}>
        <boxGeometry args={[width + 0.1, 0.12, width + 0.1]} />
        <meshLambertMaterial color={color} />
      </mesh>
    );
  }
  return <>{bands}</>;
}

// Spire — series of diminishing boxes from 1.2 down to 0.2
function Spire() {
  const segments = [];
  let size = 1.2;
  let y = 72;
  while (size > 0.2 && y < 100) {
    segments.push(
      <mesh key={y} position={[0, y + 1, 0]}>
        <boxGeometry args={[size, 2, size]} />
        <meshLambertMaterial color="#e8e8ff" />
      </mesh>
    );
    y += 2;
    size -= 0.1;
  }
  // Final needle tip
  segments.push(
    <mesh key="tip" position={[0, 102, 0]}>
      <boxGeometry args={[0.15, 4, 0.15]} />
      <meshStandardMaterial color="#fffff0" emissive="#fffff0" emissiveIntensity={0.6} />
    </mesh>
  );
  return <>{segments}</>;
}

export function BurjKhalifaTower() {
  const isNight = useCityStore(s => s.isNight);
  const tipLightRef = useRef<THREE.PointLight>(null);

  const logoTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createLogoTexture();
  }, []);

  // Blinking red aviation light at tip
  useFrame((state) => {
    if (tipLightRef.current) {
      const t = state.clock.getElapsedTime();
      tipLightRef.current.intensity = 0.5 + Math.sin(t * Math.PI) * 0.5;
    }
    state.invalidate();
  });

  return (
    <group>
      {/* ── Layer 1: Tri-petal base 0-8 ── */}
      <TriPetalBase />

      {/* ── Layer 2: First tier 8-20, ~9 wide tapering to 7 ── */}
      <mesh position={[0, 14, 0]}>
        <boxGeometry args={[9, 12, 9]} />
        <meshLambertMaterial color="#b8b8c0" />
      </mesh>
      {/* Taper cap */}
      <mesh position={[0, 20, 0]}>
        <boxGeometry args={[7, 1, 7]} />
        <meshLambertMaterial color="#b0b0b8" />
      </mesh>

      {/* ── Layer 3: Middle section 20-40, 5→3.5 with horizontal banding ── */}
      <mesh position={[0, 30, 0]}>
        <boxGeometry args={[5, 20, 5]} />
        <meshLambertMaterial color="#a8a8b8" />
      </mesh>
      <mesh position={[0, 40, 0]}>
        <boxGeometry args={[3.5, 1, 3.5]} />
        <meshLambertMaterial color="#a0a0b0" />
      </mesh>
      <HorizontalBands y={20} height={20} width={5.2} spacing={2} color="#9090a0" />

      {/* ── Layer 4: Upper tower 40-60, 3→2 ── */}
      <mesh position={[0, 50, 0]}>
        <boxGeometry args={[3, 20, 3]} />
        <meshLambertMaterial color="#c0c0d0" />
      </mesh>
      <mesh position={[0, 60, 0]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshLambertMaterial color="#b8b8c8" />
      </mesh>
      <HorizontalBands y={40} height={20} width={3.2} spacing={1.5} color="#a0a0b0" />

      {/* ── Layer 5: Spire base 60-72 ── */}
      <mesh position={[0, 66, 0]}>
        <boxGeometry args={[1.5, 12, 1.5]} />
        <meshLambertMaterial color="#d0d0e0" />
      </mesh>

      {/* ── Layer 6-7: Spire 72-104 ── */}
      <Spire />

      {/* ── Four GIT WORLD logo panels at height ~78 ── */}
      {logoTex && [
        { rot: [0, 0, 0] as [number, number, number], pos: [0, 78, 1.2] as [number, number, number] },
        { rot: [0, Math.PI, 0] as [number, number, number], pos: [0, 78, -1.2] as [number, number, number] },
        { rot: [0, Math.PI / 2, 0] as [number, number, number], pos: [1.2, 78, 0] as [number, number, number] },
        { rot: [0, -Math.PI / 2, 0] as [number, number, number], pos: [-1.2, 78, 0] as [number, number, number] },
      ].map((p, i) => (
        <mesh key={`logo-${i}`} position={p.pos} rotation={p.rot}>
          <planeGeometry args={[4, 2]} />
          <meshBasicMaterial map={logoTex} side={THREE.DoubleSide} transparent />
        </mesh>
      ))}

      {/* ── Tower illumination lights ── */}
      <pointLight position={[5, 10, 5]} intensity={3} distance={30} color="#aaaaff" />
      <pointLight position={[-4, 40, 4]} intensity={2} distance={25} color="#8888cc" />
      <pointLight position={[3, 70, -3]} intensity={2} distance={20} color="#aaaaff" />
      <pointLight position={[0, 95, 0]} intensity={1} distance={10} color="#ffffe0" />

      {/* ── Blinking red aviation tip light ── */}
      {isNight && (
        <pointLight ref={tipLightRef} position={[0, 104, 0]} intensity={1} distance={15} color="#ff2200" />
      )}

      {/* ── Base glow cylinder ── */}
      {isNight && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[18, 32]} />
          <meshBasicMaterial color="#aaaacc" transparent opacity={0.06} depthWrite={false} />
        </mesh>
      )}

      {/* ── Raised circular platform (replaces CentralPlaza platform) ── */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshLambertMaterial color="#4a4a4a" emissive={isNight ? '#222' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>
    </group>
  );
}
