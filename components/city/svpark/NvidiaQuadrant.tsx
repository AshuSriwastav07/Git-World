// NvidiaQuadrant — NVIDIA Endeavor wave-roof HQ + contributors
'use client';

import { useMemo } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { DevCharacter, type BehaviorType } from './DevCharacter';

interface Contributor {
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

const WAVE_HEIGHTS = [7, 6, 5, 3, 3, 4, 5, 6, 7, 8];

const WALK_PATHS: [number, number, number][][] = [
  [[-12, 0, 12], [12, 0, 12], [-12, 0, 12]],
  [[15, 0, 5], [15, 0, 20], [15, 0, 5]],
  [[-15, 0, 16], [0, 0, 8], [-15, 0, 16]],
];

function generateCharacterSlots(count: number) {
  const slots: { pos: [number, number, number]; rot: number; behavior: BehaviorType; walkPath?: [number, number, number][] }[] = [];
  for (let i = 0; i < count; i++) {
    const behavior = (i % 7) as BehaviorType;
    const row = Math.floor(i / 5);
    const col = i % 5;
    const pos: [number, number, number] = [-8 + col * 4, 0, 12 + row * 5];
    const walkPath = (behavior === 1 || behavior === 4) ? WALK_PATHS[i % WALK_PATHS.length] : undefined;
    slots.push({ pos: walkPath ? walkPath[0] : pos, rot: Math.PI, behavior, walkPath });
  }
  return slots;
}

export function NvidiaQuadrant({ contributors }: { contributors: Contributor[] }) {
  const isNight = useCityStore(s => s.isNight);
  const slots = useMemo(() => generateCharacterSlots(contributors.length), [contributors.length]);

  return (
    <group>
      {/* ── Base building block ── */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[20, 4, 14]} />
        <meshLambertMaterial
          color="#0f0f0f"
          emissive={isNight ? '#111' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Horizontal glass bands on front */}
      {Array.from({ length: 3 }).map((_, row) => (
        <mesh key={`glass-${row}`} position={[0, 1 + row * 1.2, 7.02]}>
          <boxGeometry args={[19, 0.6, 0.02]} />
          <meshLambertMaterial
            color="#76b900"
            transparent
            opacity={0.4}
            emissive={isNight ? '#76b900' : '#000'}
            emissiveIntensity={isNight ? 0.5 : 0}
          />
        </mesh>
      ))}

      {/* Wave roof segments */}
      {WAVE_HEIGHTS.map((h, i) => (
        <mesh key={`wave-${i}`} position={[-9 + i * 2, 4 + (h - 3) * 0.4, 0]}>
          <boxGeometry args={[2, 0.3, 14]} />
          <meshLambertMaterial
            color="#1a1a1a"
            emissive={isNight ? '#222' : '#000'}
            emissiveIntensity={isNight ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* NVIDIA Eye logo — green emissive on front */}
      <mesh position={[0, 3, 7.05]}>
        <boxGeometry args={[3, 1.5, 0.1]} />
        <meshLambertMaterial
          color="#76b900"
          emissive="#76b900"
          emissiveIntensity={isNight ? 1.5 : 0.4}
        />
      </mesh>
      {isNight && (
        <pointLight position={[0, 3, 9]} color="#76b900" intensity={4} distance={15} />
      )}

      {/* Ground logo */}
      <mesh position={[0, 0.06, 15]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[4, 4, 0.02]} />
        <meshLambertMaterial
          color="#76b900"
          emissive={isNight ? '#76b900' : '#000'}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>

      {/* Sparse wider-spaced trees */}
      {[
        [-22, 0, -10], [22, 0, -10], [-22, 0, 10], [22, 0, 10],
        [-16, 0, 18], [16, 0, 18], [0, 0, -14],
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.5, 2.4, 0.5]} />
            <meshLambertMaterial color="#5c3a1a" />
          </mesh>
          <mesh position={[0, 3.5, 0]}>
            <boxGeometry args={[3.5, 3, 3.5]} />
            <meshLambertMaterial color="#1a7a1a" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Benches */}
      {[
        [12, 0.15, 12], [-12, 0.15, 12],
        [12, 0.15, -10], [-12, 0.15, -10],
      ].map((pos, i) => (
        <group key={`bench-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.5, 0.25, 0.6]} />
            <meshLambertMaterial color="#5c3d1a" />
          </mesh>
          <mesh position={[-0.5, 0.2, 0]}>
            <boxGeometry args={[0.15, 0.4, 0.4]} />
            <meshLambertMaterial color="#4a3018" />
          </mesh>
          <mesh position={[0.5, 0.2, 0]}>
            <boxGeometry args={[0.15, 0.4, 0.4]} />
            <meshLambertMaterial color="#4a3018" />
          </mesh>
        </group>
      ))}

      {/* Lamp posts */}
      {[
        [-18, 0, 15], [18, 0, 15], [-18, 0, -12], [18, 0, -12],
      ].map((pos, i) => (
        <group key={`lamp-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.15, 3, 0.15]} />
            <meshLambertMaterial color="#555" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshLambertMaterial
              color="#76b900"
              emissive={isNight ? '#76b900' : '#000'}
              emissiveIntensity={isNight ? 1.2 : 0}
            />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.2, 0]} color="#76b900" intensity={3} distance={12} />
          )}
        </group>
      ))}

      {/* Developer characters */}
      {contributors.map((c, i) => {
        const s = slots[i];
        if (!s) return null;
        return (
          <DevCharacter
            key={c.login}
            login={c.login}
            avatarUrl={c.avatarUrl}
            topLanguage={c.topLanguage}
            position={s.pos}
            rotation={s.rot}
            behavior={s.behavior}
            walkPath={s.walkPath}
            walkSpeed={0.5}
            containmentRadius={28}
            citySlot={c.citySlot}
            cityRank={c.cityRank}
            totalScore={c.totalScore}
            estimatedCommits={c.estimatedCommits}
            totalStars={c.totalStars}
            publicRepos={c.publicRepos}
          />
        );
      })}
    </group>
  );
}
