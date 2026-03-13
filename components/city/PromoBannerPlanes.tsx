// PromoBannerPlanes — Auto-flying planes with trailing promotional banners
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface PromoPlaneConfig {
  label: string;
  url: string;
  color: string;
  bannerColor: string;
  altitude: number;
  radius: number;
  speed: number;
  offset: number;    // radians offset in orbit
}

const PLANES: PromoPlaneConfig[] = [
  {
    label: 'github.com/Ashusriwastav07',
    url: 'https://github.com/Ashusriwastav07',
    color: '#ffffff',
    bannerColor: '#24292e',
    altitude: 75,
    radius: 120,
    speed: 0.15,
    offset: 0,
  },
  {
    label: 'linkedin.com/in/ashu-sriwastav-949b09272',
    url: 'https://linkedin.com/in/ashu-sriwastav-949b09272',
    color: '#ffffff',
    bannerColor: '#0a66c2',
    altitude: 85,
    radius: 140,
    speed: 0.12,
    offset: Math.PI,
  },
];

function PromoPlane({ config }: { config: PromoPlaneConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Mesh>(null);
  const isNight = useCityStore((s) => s.isNight);

  const openLink = () => { window.open(config.url, '_blank', 'noopener,noreferrer'); };
  const onOver = () => { document.body.style.cursor = 'pointer'; };
  const onOut = () => { document.body.style.cursor = 'auto'; };

  // Build banner text canvas
  const bannerTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = config.bannerColor;
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.label, 256, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [config.label, config.bannerColor]);

  useFrame((state, delta) => {
    const _dt = Math.min(delta, 0.05);
    void _dt;
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() * config.speed + config.offset;
    const x = Math.cos(t) * config.radius;
    const z = Math.sin(t) * config.radius;
    groupRef.current.position.set(x, config.altitude, z);
    // Face direction of travel
    groupRef.current.rotation.y = -t + Math.PI / 2;

    if (propRef.current) {
      propRef.current.rotation.z += 0.4;
    }
    state.invalidate();
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh>
        <boxGeometry args={[1.5, 1.0, 4]} />
        <meshLambertMaterial color={config.color} />
      </mesh>
      {/* Wings */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[7, 0.2, 1.2]} />
        <meshLambertMaterial color={config.color} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.7, 1.8]}>
        <boxGeometry args={[0.2, 1.4, 1.2]} />
        <meshLambertMaterial color={config.color} />
      </mesh>
      {/* Horizontal stabilizer */}
      <mesh position={[0, 0.2, 1.8]}>
        <boxGeometry args={[2.5, 0.15, 0.5]} />
        <meshLambertMaterial color={config.color} />
      </mesh>
      {/* Propeller */}
      <mesh ref={propRef} position={[0, 0, -2.2]}>
        <boxGeometry args={[2.5, 0.15, 0.15]} />
        <meshLambertMaterial color="#666666" />
      </mesh>
      {/* Tow line */}
      <mesh position={[0, -0.3, 6]}>
        <boxGeometry args={[0.05, 0.05, 8]} />
        <meshLambertMaterial color="#888888" />
      </mesh>
      {/* Banner */}
      <mesh position={[0, -1.5, 12]} onClick={openLink} onPointerOver={onOver} onPointerOut={onOut}>
        <planeGeometry args={[16, 2.5]} />
        <meshLambertMaterial
          map={bannerTex ?? undefined}
          color={bannerTex ? '#ffffff' : config.bannerColor}
          side={THREE.DoubleSide}
          emissive={isNight ? config.bannerColor : '#000000'}
          emissiveIntensity={isNight ? 0.6 : 0}
        />
      </mesh>
      {/* Back side */}
      <mesh position={[0, -1.5, 12]} rotation={[0, Math.PI, 0]} onClick={openLink} onPointerOver={onOver} onPointerOut={onOut}>
        <planeGeometry args={[16, 2.5]} />
        <meshLambertMaterial
          map={bannerTex ?? undefined}
          color={bannerTex ? '#ffffff' : config.bannerColor}
          side={THREE.DoubleSide}
          emissive={isNight ? config.bannerColor : '#000000'}
          emissiveIntensity={isNight ? 0.6 : 0}
        />
      </mesh>
      {/* Night nav glow — emissive cubes instead of pointLights */}
      {isNight && (
        <>
          <mesh position={[3.5, 0, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshBasicMaterial color="red" />
          </mesh>
          <mesh position={[-3.5, 0, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshBasicMaterial color="green" />
          </mesh>
        </>
      )}
    </group>
  );
}

export function PromoBannerPlanes() {
  return (
    <group>
      {PLANES.map((config, i) => (
        <PromoPlane key={i} config={config} />
      ))}
    </group>
  );
}
