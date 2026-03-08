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

/* ── character slot generator ── */
function generateSlots(count: number) {
  const slots: { pos: [number, number, number]; rot: number; behavior: BehaviorType; walkPath?: [number, number, number][] }[] = [];
  const max = Math.min(count, 8);
  for (let i = 0; i < max; i++) {
    const behavior = (i % 7) as BehaviorType;
    // Semicircle layout inside district, radius 6-9
    const angle = (-Math.PI * 0.4) + (i / Math.max(max - 1, 1)) * Math.PI * 0.8;
    const r = 6 + (i % 3) * 1.5;
    const pos: [number, number, number] = [Math.cos(angle) * r, 0, Math.sin(angle) * r];

    let walkPath: [number, number, number][] | undefined;
    if (behavior === 1 || behavior === 4) {
      walkPath = [
        pos,
        [pos[0] + 4, 0, pos[2] + 2],
        [pos[0] - 2, 0, pos[2] - 3],
        pos,
      ];
    }

    slots.push({ pos: walkPath ? walkPath[0] : pos, rot: angle + Math.PI, behavior, walkPath });
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
      {developers.slice(0, 8).map((dev, i) => {
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
            containmentRadius={12}
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
