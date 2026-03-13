'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import type { BuildingTier } from '@/lib/cityLayout';
import type { SlimUser } from '@/lib/supabaseDb';
import { generateTexture, LANGUAGE_COLORS } from '@/lib/textureGenerator';
import { useCityStore } from '@/lib/cityStore';

interface BuildingProps {
  user: SlimUser;
  rank: number;
  position: [number, number, number];
  height: number;
  width:  number;
  depth:  number;
  tier:   BuildingTier;
  animateIn?:    boolean;
  animateDelay?: number;
}

export default function Building({
  user, rank, position, height, width, depth, tier,
  animateIn = false, animateDelay = 0,
}: BuildingProps) {
  const selectedUser = useCityStore(s => s.selectedUser);
  const selectUser   = useCityStore(s => s.selectUser);
  const isNight      = useCityStore(s => s.isNight);
  const isSelected   = selectedUser?.login === user.login;
  const hasSelected  = selectedUser !== null;

  // Rise animation
  const [scaleY, setScaleY] = useState(animateIn ? 0.001 : 1.0);
  const rising   = useRef(false);
  const canRise  = useRef(!animateIn);

  useEffect(() => {
    if (!animateIn) return;
    const t = setTimeout(() => { canRise.current = true; rising.current = true; }, animateDelay);
    return () => clearTimeout(t);
  }, [animateIn, animateDelay]);

  useFrame((state, dt) => {
    if (!rising.current || !canRise.current) return;
    setScaleY(p => { const n = Math.min(p + dt * 4, 1); if (n >= 1) rising.current = false; return n; });
    state.invalidate();
  });

  // Texture
  const langColor = LANGUAGE_COLORS[user.topLanguage] ?? LANGUAGE_COLORS.default;
  const texture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const base = generateTexture({
      langColor,
      totalStars:     user.totalStars     ?? 0,
      recentActivity: user.recentActivity ?? 40,
      username:       user.login          ?? 'unknown',
      isNight,
    });
    const t = base.clone();
    t.repeat.set(1, Math.max(1, Math.ceil(height / 5)));
    t.needsUpdate = true;
    return t;
  }, [langColor, user.totalStars, user.recentActivity, user.login, isNight, height]);

  // Materials
  const bodyMat = useMemo(() => new THREE.MeshLambertMaterial({
    map:         texture ?? undefined,
    color:       texture ? '#ffffff' : langColor,
    transparent: hasSelected && !isSelected,
    opacity:     hasSelected && !isSelected ? 0.35 : 1.0,
    emissive:    isNight ? new THREE.Color(langColor) : new THREE.Color('#000000'),
    emissiveIntensity: isNight ? 0.2 : 0,
  }), [texture, langColor, hasSelected, isSelected, isNight]);

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       new THREE.Color(langColor),
    transparent: true,
    opacity:     isNight ? (hasSelected && !isSelected ? 0.1 : 0.4) : 0.06,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.BackSide,
  }), [langColor, isNight, hasSelected, isSelected]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectUser(user);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  const halfH = (height / 2) * scaleY;

  return (
    <group
      position={[position[0], halfH, position[2]]}
      scale={[1, scaleY, 1]}
    >
      {/* GLOW SHELL */}
      <mesh renderOrder={0}>
        <boxGeometry args={[width + 0.35, height + 0.1, depth + 0.35]} />
        <primitive object={glowMat} attach="material" />
      </mesh>

      {/* MAIN BODY */}
      <mesh
        renderOrder={1}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[width, height, depth]} />
        <primitive object={bodyMat} attach="material" />
      </mesh>

      {/* SELECTED: pulsing gold ring at base */}
      {isSelected && <SelectionRing width={width} depth={depth} height={height} />}

      {/* TIER 1: crown, beacon, antenna */}
      {tier === 1 && <SkyscraperCrown width={width} depth={depth} height={height} bodyMat={bodyMat} />}

      {/* TIER 2: helipad + corner LED strips */}
      {tier === 2 && <T2Helipad w={width} d={depth} h={height} color={langColor} />}

      {/* TIER 3: parapet */}
      {tier === 3 && (
        <mesh position={[0, height / 2 + 0.3, 0]}>
          <boxGeometry args={[width + 0.15, 0.6, depth + 0.15]} />
          <primitive object={bodyMat} attach="material" />
        </mesh>
      )}

      {/* TIER 4: flat roof cap */}
      {tier === 4 && (
        <mesh position={[0, height / 2 + 0.2, 0]}>
          <boxGeometry args={[width + 0.1, 0.4, depth + 0.1]} />
          <primitive object={bodyMat} attach="material" />
        </mesh>
      )}
    </group>
  );
}

// Pulsing selection ring
function SelectionRing({ width, depth, height }: { width: number; depth: number; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.scale.setScalar(1 + 0.15 * Math.sin(t * 4));
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.35 * Math.sin(t * 4);
    state.invalidate();
  });
  return (
    <>
      <mesh ref={meshRef} position={[0, -height / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(width, depth) * 0.9, Math.max(width, depth) * 1.9, 32]} />
        <meshBasicMaterial color="#f5c518" transparent opacity={0.6}
          side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight color="#f5c518" intensity={8} distance={55} decay={1.5}
        position={[0, height / 4, 0]} />
    </>
  );
}

// Tier 2 helipad + corner LED strips
function T2Helipad({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  return (
    <>
      <mesh position={[0, h / 2 + 0.4, 0]}>
        <cylinderGeometry args={[w * 0.5, w * 0.5, 0.2, 8]} />
        <meshBasicMaterial color="#cccccc" />
      </mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 + 0.07), 0, sz * (d / 2 + 0.07)]}>
          <boxGeometry args={[0.07, h * 0.98, 0.07]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}

// Tier 1 crown
function SkyscraperCrown({ width, depth, height, bodyMat }: {
  width: number; depth: number; height: number; bodyMat: THREE.MeshLambertMaterial;
}) {
  return (
    <>
      {([[0.75, 10], [0.50, 8], [0.30, 6]] as const).map(([s, h], i) => {
        const yBase = height / 2 + 10 * i;
        return (
          <mesh key={i} position={[0, yBase + h / 2, 0]}>
            <boxGeometry args={[width * s, h, depth * s]} />
            <primitive object={bodyMat} attach="material" />
          </mesh>
        );
      })}
      {/* Beacon */}
      <mesh position={[0, height / 2 + 33, 0]}>
        <boxGeometry args={[0.5, 1.5, 0.5]} />
        <meshBasicMaterial color="#ffd700" />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, height / 2 + 43, 0]}>
        <boxGeometry args={[0.1, 18, 0.1]} />
        <meshBasicMaterial color="#aaaaaa" />
      </mesh>
      <pointLight color="#ffd700" intensity={8} distance={150} decay={1}
        position={[0, height / 2 + 33, 0]} />
      {/* Corner gold strips */}
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (width / 2 + 0.08), 0, sz * (depth / 2 + 0.08)]}>
          <boxGeometry args={[0.08, height, 0.08]} />
          <meshBasicMaterial color="#ffd700" />
        </mesh>
      ))}
    </>
  );
}
