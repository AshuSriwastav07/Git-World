// FlyingBanners — Three promotional banners orbiting the Burj Khalifa tower
'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

function createBannerTexture(
  lines: string[],
  bgColor: string,
  textColor: string,
  accentColor?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1024, 192);
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 1020, 188);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (lines.length === 1) {
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(lines[0], 512, 96);
  } else {
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(lines[0], 512, 72);
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = accentColor || textColor;
    ctx.fillText(lines[1], 512, 130);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

interface BannerConfig {
  orbitRadius: number;
  baseHeight: number;
  oscillationAmp: number;
  oscillationSpeed: number;
  orbitSpeed: number; // rad/s, negative = clockwise
}

const BANNER_CONFIGS: BannerConfig[] = [
  { orbitRadius: 14, baseHeight: 55, oscillationAmp: 3, oscillationSpeed: 0.42, orbitSpeed: (2 * Math.PI) / 30 },
  { orbitRadius: 12, baseHeight: 35, oscillationAmp: 3, oscillationSpeed: 0.35, orbitSpeed: -(2 * Math.PI) / 45 },
  { orbitRadius: 16, baseHeight: 75, oscillationAmp: 3, oscillationSpeed: 0.30, orbitSpeed: (2 * Math.PI) / 60 },
];

export function FlyingBanners() {
  const userCount = useCityStore(s => s.users.size);
  const { camera } = useThree();

  const group1Ref = useRef<THREE.Group>(null);
  const group2Ref = useRef<THREE.Group>(null);
  const group3Ref = useRef<THREE.Group>(null);
  const mesh1Ref = useRef<THREE.Mesh>(null);
  const mesh2Ref = useRef<THREE.Mesh>(null);
  const mesh3Ref = useRef<THREE.Mesh>(null);

  // Track last userCount for Banner 3 texture updates
  const [lastCount, setLastCount] = useState(0);

  // Banner 1: Git World promo — static texture
  const tex1 = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBannerTexture(
      ['GIT WORLD — Where Code Builds Cities'],
      '#090612', '#f5c518'
    );
  }, []);

  // Banner 2: Creator credit — static texture
  const tex2 = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBannerTexture(
      ['Built by Ashusriwastav07', 'github.com/Ashusriwastav07'],
      '#0a0a1a', '#ffffff', '#f5c518'
    );
  }, []);

  // Banner 3: Community count — regenerated when count changes by 10+
  const [tex3, setTex3] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (Math.abs(userCount - lastCount) >= 10 || lastCount === 0) {
      const t = createBannerTexture(
        [`${userCount.toLocaleString()} Developers. One City.`],
        '#1a0a0a', '#ffffff'
      );
      setTex3(t);
      setLastCount(userCount);
    }
  }, [userCount, lastCount]);

  // Single shared useFrame for all three banners
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const groups = [group1Ref, group2Ref, group3Ref];
    const meshes = [mesh1Ref, mesh2Ref, mesh3Ref];

    for (let i = 0; i < 3; i++) {
      const g = groups[i].current;
      const m = meshes[i].current;
      const cfg = BANNER_CONFIGS[i];
      if (!g || !m) continue;

      // Orbit rotation
      g.rotation.y = t * cfg.orbitSpeed;

      // Vertical oscillation
      m.position.y = cfg.baseHeight + Math.sin(t * cfg.oscillationSpeed) * cfg.oscillationAmp;

      // Face camera (billboard)
      const worldPos = new THREE.Vector3();
      m.getWorldPosition(worldPos);
      m.lookAt(camera.position);
    }
  });

  const handleCreatorClick = () => {
    window.open('https://github.com/Ashusriwastav07', '_blank', 'noopener,noreferrer');
  };

  return (
    <group>
      {/* Banner 1: Git World Promo */}
      <group ref={group1Ref}>
        <mesh ref={mesh1Ref} position={[BANNER_CONFIGS[0].orbitRadius, BANNER_CONFIGS[0].baseHeight, 0]}>
          <planeGeometry args={[8, 1.5]} />
          <meshBasicMaterial map={tex1} side={THREE.DoubleSide} transparent />
        </mesh>
      </group>

      {/* Banner 2: Creator Credit (clickable) */}
      <group ref={group2Ref}>
        <mesh
          ref={mesh2Ref}
          position={[BANNER_CONFIGS[1].orbitRadius, BANNER_CONFIGS[1].baseHeight, 0]}
          onClick={handleCreatorClick}
          onPointerOver={(e) => { (e.target as HTMLElement).style && (document.body.style.cursor = 'pointer'); }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <planeGeometry args={[8, 1.5]} />
          <meshBasicMaterial map={tex2} side={THREE.DoubleSide} transparent />
        </mesh>
      </group>

      {/* Banner 3: Community Count */}
      <group ref={group3Ref}>
        <mesh ref={mesh3Ref} position={[BANNER_CONFIGS[2].orbitRadius, BANNER_CONFIGS[2].baseHeight, 0]}>
          <planeGeometry args={[8, 1.5]} />
          <meshBasicMaterial map={tex3} side={THREE.DoubleSide} transparent />
        </mesh>
      </group>
    </group>
  );
}
