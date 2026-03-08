// GoogleQuadrant — Googleplex-style glass block + wing buildings + contributors
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

const GOOGLE_COLORS = [
  { letter: 'G', color: '#4285f4' },
  { letter: 'o', color: '#ea4335' },
  { letter: 'o', color: '#fbbc04' },
  { letter: 'g', color: '#4285f4' },
  { letter: 'l', color: '#34a853' },
  { letter: 'e', color: '#ea4335' },
];

const WALK_PATHS: [number, number, number][][] = [
  [[-10, 0, 8], [10, 0, 8], [-10, 0, 8]],
  [[12, 0, 5], [12, 0, 20], [12, 0, 5]],
  [[-12, 0, 15], [8, 0, 18], [-12, 0, 15]],
];

function generateCharacterSlots(count: number) {
  const slots: { pos: [number, number, number]; rot: number; behavior: BehaviorType; walkPath?: [number, number, number][] }[] = [];
  for (let i = 0; i < count; i++) {
    const behavior = (i % 7) as BehaviorType;
    const row = Math.floor(i / 6);
    const col = i % 6;
    const pos: [number, number, number] = [-8 + col * 3, 0, 12 + row * 5];
    const walkPath = (behavior === 1 || behavior === 4) ? WALK_PATHS[i % WALK_PATHS.length] : undefined;
    slots.push({ pos: walkPath ? walkPath[0] : pos, rot: 0, behavior, walkPath });
  }
  return slots;
}

export function GoogleQuadrant({ contributors }: { contributors: Contributor[] }) {
  const isNight = useCityStore(s => s.isNight);
  const slots = useMemo(() => generateCharacterSlots(contributors.length), [contributors.length]);

  return (
    <group>
      {/* ── Main Building: dark glass box 18×6×12 ── */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[18, 6, 12]} />
        <meshLambertMaterial
          color="#1a2a3a"
          transparent
          opacity={0.85}
          emissive={isNight ? '#1a3050' : '#000'}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>

      {/* Glass panel grid on front face */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <mesh key={`gp-${row}-${col}`} position={[-7.5 + col * 2.1, 1.5 + row * 1.3, 6.02]}>
            <boxGeometry args={[1.8, 1, 0.02]} />
            <meshLambertMaterial
              color="#3388aa"
              transparent
              opacity={0.5}
              emissive={isNight ? '#4499cc' : '#000'}
              emissiveIntensity={isNight ? 0.6 : 0}
            />
          </mesh>
        ))
      )}

      {/* West wing */}
      <mesh position={[-14, 2, 0]}>
        <boxGeometry args={[8, 4, 6]} />
        <meshLambertMaterial
          color="#1e3040"
          transparent
          opacity={0.8}
          emissive={isNight ? '#152535' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* East wing */}
      <mesh position={[14, 2, 0]}>
        <boxGeometry args={[8, 4, 6]} />
        <meshLambertMaterial
          color="#1e3040"
          transparent
          opacity={0.8}
          emissive={isNight ? '#152535' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Google wordmark — emissive colored boxes */}
      {GOOGLE_COLORS.map((g, i) => (
        <mesh key={`gl-${i}`} position={[-3.5 + i * 1.4, 7, 0]}>
          <boxGeometry args={[1, 1.5, 0.5]} />
          <meshLambertMaterial
            color={g.color}
            emissive={g.color}
            emissiveIntensity={isNight ? 1 : 0.3}
          />
        </mesh>
      ))}
      {isNight && (
        <pointLight position={[0, 7, 2]} color="#4285f4" intensity={3} distance={15} />
      )}

      {/* Ground logo */}
      <mesh position={[0, 0.06, 15]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 16]} />
        <meshLambertMaterial
          color="#4285f4"
          emissive={isNight ? '#4285f4' : '#000'}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>

      {/* Tall narrow trees */}
      {[
        [-20, 0, -8], [-20, 0, 8], [20, 0, -8], [20, 0, 8],
        [-12, 0, 12], [12, 0, 12],
        [-8, 0, -10], [8, 0, -10],
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.4, 3, 0.4]} />
            <meshLambertMaterial color="#6B4226" />
          </mesh>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[2, 4, 2]} />
            <meshLambertMaterial color="#228B22" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Benches */}
      {[
        [10, 0.15, 12], [-10, 0.15, 12],
        [18, 0.15, 8], [-18, 0.15, 8],
        [0, 0.15, -10], [12, 0.15, -10],
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
        [-18, 0, 15], [18, 0, 15], [0, 0, -12], [-18, 0, -8], [18, 0, -8],
      ].map((pos, i) => (
        <group key={`lamp-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.15, 3, 0.15]} />
            <meshLambertMaterial color="#555" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshLambertMaterial
              color="#ffcc55"
              emissive={isNight ? '#ffcc55' : '#000'}
              emissiveIntensity={isNight ? 1.5 : 0}
            />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.2, 0]} color="#ffaa33" intensity={3} distance={12} />
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
