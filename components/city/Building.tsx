// Building — dark textured body with neon windows + selection spotlight
'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, invalidate } from '@react-three/fiber';
import * as THREE from 'three';
import type { CityDeveloper, BuildingTier } from '@/types';
import { getLanguageColor } from '@/types';
import { useCityStore } from '@/lib/cityStore';
import { generateBuildingTexture } from '@/lib/textureGenerator';

interface BuildingProps {
  user: CityDeveloper;
  rank: number;
  position: [number, number, number];
  height: number;
  width: number;
  depth: number;
  tier: BuildingTier;
  animateIn?: boolean;
  animateDelay?: number;
}

export default function Building({ user, rank, position, height, width, depth, tier, animateIn, animateDelay = 0 }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [scaleY, setScaleY] = useState(animateIn ? 0.001 : 1);
  const delayRef = useRef(animateDelay / 1000); // convert ms to seconds
  const selectUser = useCityStore((s) => s.selectUser);
  const selectedUser = useCityStore((s) => s.selectedUser);

  const isSelected = selectedUser?.login === user.login;
  const hasSelected = selectedUser !== null;

  // Rise animation
  useFrame((_, delta) => {
    if (scaleY >= 1) return;
    if (delayRef.current > 0) {
      delayRef.current -= delta;
      return;
    }
    const next = Math.min(scaleY + delta * 1.5, 1);
    setScaleY(next);
    if (groupRef.current) {
      groupRef.current.scale.y = easeOutCubic(next);
    }
    invalidate();
  });

  // Generate 4 face textures
  const texOpts = useMemo(() => ({
    language: user.topLanguage,
    login: user.login,
    stars: user.totalStars ?? 0,
    activity: user.recentActivity ?? 0,
  }), [user.topLanguage, user.login, user.totalStars, user.recentActivity]);

  const faceMaterials = useMemo(() => {
    const color = getLanguageColor(user.topLanguage);
    return [0, 1, 2, 3].map(i => {
      const tex = generateBuildingTexture({ ...texOpts, faceIndex: i });
      return new THREE.MeshLambertMaterial({
        map: tex,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.05,
        transparent: true,
        opacity: 1,
      });
    });
  }, [texOpts, user.topLanguage]);

  // Top/bottom dark material
  const capMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#0d0d12' }), []);

  // 6-face material array: +x, -x, +y, -y, +z, -z
  const materials = useMemo(
    () => [faceMaterials[0], faceMaterials[1], capMat, capMat, faceMaterials[2], faceMaterials[3]],
    [faceMaterials, capMat]
  );

  // Fade/grey non-selected buildings when one is selected
  useMemo(() => {
    faceMaterials.forEach(m => {
      if (isSelected) {
        m.opacity = 1;
        m.emissiveIntensity = 0.15;
      } else if (hasSelected) {
        m.opacity = 0.35;
        m.emissiveIntensity = 0.02;
      } else {
        m.opacity = 1;
        m.emissiveIntensity = 0.05;
      }
    });
  }, [isSelected, hasSelected, faceMaterials]);

  const bw = width;
  const bh = height;
  const bd = depth;

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    selectUser(user);
  }, [selectUser, user]);

  const showDecorations = scaleY > 0.95;
  const langColor = getLanguageColor(user.topLanguage);

  return (
    <group
      ref={groupRef}
      position={[position[0], 0, position[2]]}
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
      userData={{ login: user.login }}
    >
      {/* Main body */}
      <mesh position={[0, bh / 2, 0]} material={materials}>
        <boxGeometry args={[bw, bh, bd]} />
      </mesh>

      {/* Tier 1 — tapered crown + gold beacon + antenna */}
      {showDecorations && tier === 1 && (
        <>
          <mesh position={[0, bh + 2, 0]} material={materials}>
            <boxGeometry args={[bw * 0.75, 4, bd * 0.75]} />
          </mesh>
          <mesh position={[0, bh + 6, 0]} material={materials}>
            <boxGeometry args={[bw * 0.5, 4, bd * 0.5]} />
          </mesh>
          <mesh position={[0, bh + 11, 0]}>
            <boxGeometry args={[0.6, 1.2, 0.6]} />
            <meshLambertMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1.5} />
          </mesh>
          <mesh position={[0, bh + 15, 0]}>
            <boxGeometry args={[0.15, 6, 0.15]} />
            <meshLambertMaterial color="#aaaaaa" />
          </mesh>
        </>
      )}

      {/* Tier 2 — helipad on roof */}
      {showDecorations && tier === 2 && (
        <mesh position={[0, bh + 0.1, 0]}>
          <cylinderGeometry args={[bw * 0.4, bw * 0.4, 0.2, 8]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      )}

      {/* Tier 3 — roof parapet */}
      {showDecorations && tier === 3 && (
        <mesh position={[0, bh + 0.3, 0]} material={materials}>
          <boxGeometry args={[bw * 1.08, 0.6, bd * 1.08]} />
        </mesh>
      )}

      {/* Selection spotlight: gold ring + vertical beam + point light */}
      {isSelected && (
        <>
          {/* Gold ring at base */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[bw * 0.8, bw * 0.95, 24]} />
            <meshBasicMaterial color="#d4af37" transparent opacity={0.7} />
          </mesh>
          {/* Vertical beam */}
          <mesh position={[0, bh + 20, 0]}>
            <cylinderGeometry args={[0.3, bw * 0.4, 40, 8]} />
            <meshBasicMaterial color={langColor} transparent opacity={0.12} />
          </mesh>
          {/* Point light */}
          <pointLight position={[0, bh + 5, 0]} color={langColor} intensity={3} distance={30} />
        </>
      )}
    </group>
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
