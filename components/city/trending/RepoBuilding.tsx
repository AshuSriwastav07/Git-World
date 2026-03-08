// RepoBuilding — Stepped ziggurat building for trending repositories
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { RepoCrown } from './RepoCrown';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import type { TrendingRepo } from '@/lib/trendingStore';
import { useTrendingStore } from '@/lib/trendingStore';

interface RepoBuildingProps {
  repo: TrendingRepo;
  position: [number, number, number];
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function RepoBuilding({ repo, position }: RepoBuildingProps) {
  const selectRepo = useTrendingStore(s => s.selectRepo);
  const langColor = LANGUAGE_COLORS[repo.primary_language] ?? LANGUAGE_COLORS.default;
  const height = repo.building_height;
  const baseWidth = repo.building_width;

  // Build ziggurat steps — wider at base, narrowing toward top
  const steps = useMemo(() => {
    const STEP_COUNT = Math.max(3, Math.min(8, Math.round(height / 8)));
    const stepHeight = height / STEP_COUNT;
    const result: { y: number; w: number; h: number }[] = [];

    for (let i = 0; i < STEP_COUNT; i++) {
      const t = i / STEP_COUNT;
      const w = baseWidth * (1 - t * 0.5); // narrows to 50% at top
      result.push({
        y: i * stepHeight + stepHeight / 2,
        w,
        h: stepHeight,
      });
    }
    return result;
  }, [height, baseWidth]);

  // Band ring positions — one glowing ring at each step boundary
  const bandPositions = useMemo(() => {
    return steps.map((step, i) => ({
      y: step.y + step.h / 2,
      w: step.w,
      isTop: i === steps.length - 1,
    })).slice(0, -1); // skip last (crown sits there)
  }, [steps]);

  return (
    <group position={position}>
      {/* Stepped ziggurat body */}
      {steps.map((step, i) => (
        <mesh
          key={`step-${i}`}
          position={[0, step.y, 0]}
          onClick={(e) => { e.stopPropagation(); selectRepo(repo); }}
        >
          <boxGeometry args={[step.w, step.h, step.w]} />
          <meshStandardMaterial
            color={langColor}
            emissive={langColor}
            emissiveIntensity={0.3}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Glowing horizontal band rings at step boundaries */}
      {bandPositions.map((band, i) => (
        <mesh key={`band-${i}`} position={[0, band.y, 0]}>
          <boxGeometry args={[band.w + 0.15, 0.15, band.w + 0.15]} />
          <meshBasicMaterial color={langColor} transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Glow halo — additive blending sphere */}
      <mesh position={[0, height / 2, 0]}>
        <sphereGeometry args={[baseWidth * 1.2, 16, 16]} />
        <meshBasicMaterial
          color={langColor}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Point light for local illumination */}
      <pointLight
        color={langColor}
        intensity={2}
        distance={baseWidth * 6}
        position={[0, height / 2, 0]}
        decay={2}
      />

      {/* Rotating crystal crown at top */}
      <RepoCrown color={langColor} y={height} />

      {/* Floating name label — billboard (always faces camera) */}
      <Billboard position={[0, height + 3, 0]}>
        {/* Dark background panel */}
        <mesh>
          <planeGeometry args={[Math.max(6, repo.repo_full_name.length * 0.35), 2.2]} />
          <meshBasicMaterial color="#0a0614" transparent opacity={0.85} />
        </mesh>
        <Text
          position={[0, 0.35, 0.01]}
          fontSize={0.55}
          color="#ffffff"
          font="/fonts/PressStart2P-Regular.ttf"
          anchorX="center"
          anchorY="middle"
          maxWidth={12}
        >
          {repo.repo_full_name}
        </Text>
        <Text
          position={[0, -0.4, 0.01]}
          fontSize={0.4}
          color="#fbbf24"
          font="/fonts/PressStart2P-Regular.ttf"
          anchorX="center"
          anchorY="middle"
        >
          {`★ ${formatStars(repo.total_stars)}`}
        </Text>
      </Billboard>

      {/* Trending rank number */}
      <Billboard position={[-(baseWidth / 2 + 1.2), height * 0.7, 0]}>
        <Text
          fontSize={repo.trending_rank <= 3 ? 1.8 : 1.2}
          color="#fbbf24"
          font="/fonts/PressStart2P-Regular.ttf"
          anchorX="center"
          anchorY="middle"
        >
          {`#${repo.trending_rank}`}
        </Text>
      </Billboard>
    </group>
  );
}
