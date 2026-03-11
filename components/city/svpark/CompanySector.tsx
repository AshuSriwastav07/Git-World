// CompanySector — Generic company campus wrapper
// Renders a building + developer characters at the group origin.
// Parent <group position={...}> handles world positioning.
// Generates EXACTLY developers.length character slots (never drops devs).
'use client';

import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { DevCharacter, type BehaviorType } from './DevCharacter';

export interface SectorContributor {
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

export interface CompanyConfig {
  name: string;
  brandColor: string;
  bgColor: string;
  building: ReactNode;
}

interface CompanySectorProps {
  config: CompanyConfig;
  developers: SectorContributor[];
}

// ── Position generator: arranges devs in 3 concentric rings around the building ──

function generateCharacterSlots(count: number) {
  const slots: { pos: [number, number, number]; rot: number; behavior: BehaviorType; walkPath?: [number, number, number][] }[] = [];
  const max = Math.min(count, 30);
  for (let i = 0; i < max; i++) {
    const behavior = companyBehavior(i);
    const ring = Math.floor(i / 10);
    const idx = i % 10;
    const r = 16 + ring * 3.5;
    const angle = (idx / 10) * Math.PI * 2 + ring * 0.3;
    const pos: [number, number, number] = [Math.cos(angle) * r, 0, Math.sin(angle) * r];
    let walkPath: [number, number, number][] | undefined;
    if (behavior === 1 || behavior === 4) {
      walkPath = WALK_PATHS[i % WALK_PATHS.length].map(p =>
        [pos[0] + p[0] * 0.6, 0, pos[2] + p[2] * 0.6] as [number, number, number]
      );
    }
    slots.push({ pos: walkPath ? walkPath[0] : pos, rot: angle + Math.PI, behavior, walkPath });
  }
  return slots;
}

function companyBehavior(pos: number): BehaviorType {
  if (pos <= 9) return 1;   // walking_laptop
  if (pos <= 16) return 6;  // sitting_bench
  if (pos <= 20) return 2;  // eating
  if (pos <= 23) return 4;  // pacing
  if (pos <= 26) return 5;  // standing_laptop
  return 3;                 // chatting
}

const WALK_PATHS: [number, number, number][][] = [
  [[3, 0, 4], [6, 0, -2], [-3, 0, 3], [3, 0, 4]],
  [[-4, 0, 3], [2, 0, 6], [-5, 0, -2], [-4, 0, 3]],
  [[-3, 0, -4], [4, 0, -3], [2, 0, 5], [-3, 0, -4]],
  [[5, 0, 2], [-2, 0, -5], [-4, 0, 4], [5, 0, 2]],
];

export function CompanySector({ config, developers }: CompanySectorProps) {
  const isNight = useCityStore(s => s.isNight);
  const slots = useMemo(() => generateCharacterSlots(developers.length), [developers.length]);

  return (
    <group>
      {/* ── Company building at origin ── */}
      {config.building}

      {/* ── Developer characters — one for every dev ── */}
      {developers.map((dev, i) => {
        const s = slots[i];
        if (!s) return null;
        return (
          <DevCharacter
            key={dev.login}
            login={dev.login}
            avatarUrl={dev.avatarUrl}
            topLanguage={dev.topLanguage}
            position={s.pos}
            rotation={s.rot}
            behavior={s.behavior}
            walkPath={s.walkPath}
            walkSpeed={0.5}
            containmentRadius={15}
            citySlot={dev.citySlot}
            cityRank={dev.cityRank}
            totalScore={dev.totalScore}
            estimatedCommits={dev.estimatedCommits}
            totalStars={dev.totalStars}
            publicRepos={dev.publicRepos}
          />
        );
      })}

      {/* ── Night lighting ── */}
      {isNight && (
        <pointLight position={[0, 8, 0]} color={config.brandColor} intensity={2} distance={35} />
      )}
    </group>
  );
}
