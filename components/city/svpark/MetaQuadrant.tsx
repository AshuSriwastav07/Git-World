// MetaQuadrant — Meta HQ glass box building + contributors
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

const WALK_PATHS: [number, number, number][][] = [
  [[-8, 0, 8], [8, 0, 8], [-8, 0, 8]],
  [[0, 0, 7], [0, 0, 15], [0, 0, 7]],
  [[-6, 0, 13], [6, 0, 9], [-6, 0, 13]],
  [[4, 0, 7], [-4, 0, 14], [4, 0, 7]],
];

function companyBehavior(pos: number): BehaviorType {
  if (pos <= 9) return 1;   // walking_laptop
  if (pos <= 16) return 6;  // sitting_bench
  if (pos <= 20) return 2;  // eating
  if (pos <= 23) return 4;  // pacing
  if (pos <= 26) return 5;  // standing_laptop
  return 3;                 // chatting
}

function generateCharacterSlots(count: number) {
  const slots: { pos: [number, number, number]; rot: number; behavior: BehaviorType; walkPath?: [number, number, number][] }[] = [];
  const max = Math.min(count, 30);
  // 3 rows × 10 in front of Meta HQ, all within campus
  const ROWS = [
    { z: 7, xRange: 9 },
    { z: 10.5, xRange: 10 },
    { z: 14, xRange: 9 },
  ];
  let placed = 0;
  for (const row of ROWS) {
    if (placed >= max) break;
    const n = Math.min(10, max - placed);
    for (let i = 0; i < n; i++) {
      const behavior = companyBehavior(placed);
      const x = n === 1 ? 0 : -row.xRange + (i / (n - 1)) * row.xRange * 2;
      const pos: [number, number, number] = [x, 0, row.z];
      let walkPath: [number, number, number][] | undefined;
      if (behavior === 1 || behavior === 4) {
        const wp = WALK_PATHS[placed % WALK_PATHS.length];
        walkPath = wp.map(p => [p[0] * 0.8, p[1], p[2]] as [number, number, number]);
      }
      slots.push({ pos: walkPath ? walkPath[0] : pos, rot: Math.PI, behavior, walkPath });
      placed++;
    }
  }
  return slots;
}

export function MetaQuadrant({ contributors }: { contributors: Contributor[] }) {
  const isNight = useCityStore(s => s.isNight);
  const slots = useMemo(() => generateCharacterSlots(contributors.length), [contributors.length]);

  return (
    <group>
      {/* ── Concrete base ── */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[22, 1.5, 10]} />
        <meshLambertMaterial color="#050a12" />
      </mesh>

      {/* ── Main glass body ── */}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[22, 7, 10]} />
        <meshLambertMaterial
          color="#0a1628"
          transparent
          opacity={0.75}
          emissive={isNight ? '#0a1628' : '#000'}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>

      {/* Glass panel grid on front */}
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 10 }).map((_, col) => (
          <mesh key={`gp-${row}-${col}`} position={[-9.5 + col * 2.1, 2.5 + row * 1.3, 5.02]}>
            <boxGeometry args={[1.8, 1, 0.02]} />
            <meshLambertMaterial
              color="#2266aa"
              transparent
              opacity={0.4}
              emissive={isNight ? '#3388dd' : '#000'}
              emissiveIntensity={isNight ? 0.5 : 0}
            />
          </mesh>
        ))
      )}

      {/* LED strip along top */}
      <mesh position={[0, 8.55, 0]}>
        <boxGeometry args={[22.2, 0.1, 10.2]} />
        <meshLambertMaterial
          color="#0082fb"
          emissive="#0082fb"
          emissiveIntensity={isNight ? 1.2 : 0.3}
        />
      </mesh>
      {isNight && (
        <pointLight position={[0, 9, 0]} color="#0082fb" intensity={2} distance={15} />
      )}

      {/* Meta infinity symbol — stylized twin loops */}
      <group position={[0, 6, 5.1]}>
        {/* Left loop */}
        <mesh position={[-1.2, 0, 0]}>
          <torusGeometry args={[1, 0.25, 8, 16]} />
          <meshLambertMaterial
            color="#0082fb"
            emissive="#0082fb"
            emissiveIntensity={isNight ? 1.5 : 0.5}
          />
        </mesh>
        {/* Right loop */}
        <mesh position={[1.2, 0, 0]}>
          <torusGeometry args={[1, 0.25, 8, 16]} />
          <meshLambertMaterial
            color="#0082fb"
            emissive="#0082fb"
            emissiveIntensity={isNight ? 1.5 : 0.5}
          />
        </mesh>
        {isNight && (
          <pointLight position={[0, 0, 1]} color="#0082fb" intensity={5} distance={12} />
        )}
      </group>

      {/* "META" text boxes on front */}
      {['M', 'E', 'T', 'A'].map((_, i) => (
        <mesh key={`meta-${i}`} position={[-2 + i * 1.3, 3, 5.08]}>
          <boxGeometry args={[1, 1.2, 0.05]} />
          <meshLambertMaterial
            color="#ffffff"
            emissive={isNight ? '#ffffff' : '#888'}
            emissiveIntensity={isNight ? 0.8 : 0.1}
          />
        </mesh>
      ))}

      {/* Ground logo */}
      <mesh position={[0, 0.06, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 16]} />
        <meshLambertMaterial
          color="#0082fb"
          emissive={isNight ? '#0082fb' : '#000'}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>

      {/* Uniform perimeter trees */}
      {[
        [-16, 0, -7], [-10, 0, -7], [-4, 0, -7], [4, 0, -7], [10, 0, -7], [16, 0, -7],
        [-16, 0, 7], [16, 0, 7],
        [-16, 0, 15], [-6, 0, 15], [6, 0, 15], [16, 0, 15],
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.5, 2, 0.5]} />
            <meshLambertMaterial color="#5c3a1a" />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <boxGeometry args={[3, 3, 3]} />
            <meshLambertMaterial color="#2d7a2d" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Benches */}
      {[
        [14, 0.15, 12], [-14, 0.15, 12],
        [14, 0.15, -6], [-14, 0.15, -6],
        [0, 0.15, 20], [8, 0.15, 20],
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
        [-20, 0, 0], [20, 0, 0], [-20, 0, 15], [20, 0, 15], [0, 0, -12],
      ].map((pos, i) => (
        <group key={`lamp-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.15, 3, 0.15]} />
            <meshLambertMaterial color="#555" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshLambertMaterial
              color="#0082fb"
              emissive={isNight ? '#0082fb' : '#000'}
              emissiveIntensity={isNight ? 1.2 : 0}
            />
          </mesh>
          {isNight && (
            <pointLight position={[0, 3.2, 0]} color="#0082fb" intensity={3} distance={12} />
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
            containmentRadius={5}
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
