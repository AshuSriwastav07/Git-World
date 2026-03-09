// LanguageDistrict — themed programming-language section inside SV park perimeter
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { DevCharacter, type BehaviorType } from './DevCharacter';

export interface LanguageDev {
  login: string;
  avatarUrl: string;
  topLanguage: string;
  citySlot?: number;
  cityRank?: number;
  totalScore?: number;
  estimatedCommits?: number;
  totalStars?: number;
  publicRepos?: number;
}

export interface LanguageDistrictProps {
  language: string;
  color: string;       // hex: district accent colour
  position: [number, number, number]; // relative to SV park center group
  developers: LanguageDev[];
}

/* ── canvas pixel logo text ── */
function createLanguageBannerTexture(language: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 508, 124);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(language.toUpperCase(), 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/* ── walk path templates ── */
const LANG_WALK_PATHS: [number, number, number][][] = [
  [[-3, 0, 2], [3, 0, 2], [-3, 0, 2]],
  [[0, 0, -3], [0, 0, 4], [0, 0, -3]],
  [[-2, 0, 3], [2, 0, -2], [-2, 0, 3]],
  [[2, 0, -2], [-2, 0, 3], [2, 0, -2]],
];

/* ── character slot generator ── */
function generateSlots(count: number) {
  const slots: { pos: [number, number, number]; rot: number; behavior: BehaviorType; walkPath?: [number, number, number][] }[] = [];
  const max = Math.min(count, 20);
  // 2 concentric rings within the 10-radius grass patch (10+10 = 20 max)
  const RINGS = [
    { radius: 3.5, count: 10 },
    { radius: 7, count: 10 },
  ];
  function langBehavior(pos: number): BehaviorType {
    if (pos <= 6) return 1;   // walking_laptop
    if (pos <= 12) return 6;  // sitting_bench
    if (pos <= 15) return 2;  // eating
    if (pos <= 17) return 4;  // pacing
    return 5;                 // standing_laptop
  }

  let placed = 0;
  for (const ring of RINGS) {
    if (placed >= max) break;
    const n = Math.min(ring.count, max - placed);
    const angleOffset = ring.radius === 5.5 ? Math.PI / n : 0;
    for (let j = 0; j < n; j++) {
      const behavior = langBehavior(placed);
      const angle = (j / n) * Math.PI * 2 + angleOffset;
      const pos: [number, number, number] = [
        Math.cos(angle) * ring.radius,
        0,
        Math.sin(angle) * ring.radius,
      ];

      let walkPath: [number, number, number][] | undefined;
      if (behavior === 1 || behavior === 4) {
        const wp = LANG_WALK_PATHS[placed % LANG_WALK_PATHS.length];
        walkPath = wp.map(p => [p[0] * 0.7, p[1], p[2] * 0.7] as [number, number, number]);
      }

      slots.push({ pos: walkPath ? walkPath[0] : pos, rot: angle + Math.PI, behavior, walkPath });
      placed++;
    }
  }
  return slots;
}

export function LanguageDistrict({ language, color, position, developers }: LanguageDistrictProps) {
  const isNight = useCityStore(s => s.isNight);
  const slots = useMemo(() => generateSlots(developers.length), [developers.length]);

  const bannerTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createLanguageBannerTexture(language, color);
  }, [language, color]);

  return (
    <group position={position}>
      {/* ── Tinted grass patch (16×16 area) ── */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[10, 24]} />
        <meshLambertMaterial
          color={color}
          transparent
          opacity={0.15}
          emissive={isNight ? color : '#000000'}
          emissiveIntensity={isNight ? 0.15 : 0}
        />
      </mesh>

      {/* ── Language banner arch ── */}
      {/* Left pole */}
      <mesh position={[-4, 2, 0]}>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Right pole */}
      <mesh position={[4, 2, 0]}>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Banner face */}
      <mesh position={[0, 4.2, 0]}>
        <planeGeometry args={[8, 1.2]} />
        <meshBasicMaterial map={bannerTex} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Lamp posts — language colour ── */}
      {[-6, 6].map((x, i) => (
        <group key={`lamp-${i}`} position={[x, 0, -3]}>
          {/* Post */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.15, 3, 0.15]} />
            <meshLambertMaterial color="#555" />
          </mesh>
          {/* Lamp head */}
          <mesh position={[0, 3.2, 0]}>
            <boxGeometry args={[0.6, 0.3, 0.6]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.5, 0]} color={color} intensity={2} distance={12} />
          )}
        </group>
      ))}

      {/* ── Benches ── */}
      {[-3, 3].map((x, i) => (
        <group key={`bench-${i}`} position={[x, 0, 5]}>
          {/* Seat */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.8, 0.15, 0.6]} />
            <meshLambertMaterial color="#8B5E3C" />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.7, 0.2, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshLambertMaterial color="#555" />
          </mesh>
          <mesh position={[0.7, 0.2, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshLambertMaterial color="#555" />
          </mesh>
        </group>
      ))}

      {/* ── Developer characters ── */}
      {developers.slice(0, 20).map((dev, i) => {
        const slot = slots[i];
        if (!slot) return null;
        return (
          <DevCharacter
            key={dev.login}
            login={dev.login}
            avatarUrl={dev.avatarUrl}
            topLanguage={dev.topLanguage}
            position={slot.pos}
            rotation={slot.rot}
            behavior={slot.behavior}
            walkPath={slot.walkPath}
            walkSpeed={0.4}
            containmentRadius={5}
            citySlot={dev.citySlot}
            cityRank={dev.cityRank}
            totalScore={dev.totalScore}
            estimatedCommits={dev.estimatedCommits}
            totalStars={dev.totalStars}
            publicRepos={dev.publicRepos}
          />
        );
      })}
    </group>
  );
}
