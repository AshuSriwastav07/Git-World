// AppleQuadrant — Apple Park ring building + contributors
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
  [[3, 0, 4], [6, 0, -2], [-3, 0, 3], [3, 0, 4]],
  [[-4, 0, 3], [2, 0, 6], [-5, 0, -2], [-4, 0, 3]],
  [[-3, 0, -4], [4, 0, -3], [2, 0, 5], [-3, 0, -4]],
  [[5, 0, 2], [-2, 0, -5], [-4, 0, 4], [5, 0, 2]],
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
  // Place in concentric rings inside the courtyard (radius 3–12)
  for (let i = 0; i < max; i++) {
    const behavior = companyBehavior(i);
    const ring = Math.floor(i / 10);
    const idx = i % 10;
    const r = 4 + ring * 3.5;
    const angle = (idx / 10) * Math.PI * 2 + ring * 0.3;
    const pos: [number, number, number] = [Math.cos(angle) * r, 0, Math.sin(angle) * r];
    // Walking devs get short contained paths
    let walkPath: [number, number, number][] | undefined;
    if (behavior === 1 || behavior === 4) {
      walkPath = WALK_PATHS[i % WALK_PATHS.length].map(p =>
        [p[0] * 0.8, 0, p[2] * 0.8] as [number, number, number]
      );
    }
    slots.push({ pos: walkPath ? walkPath[0] : pos, rot: angle + Math.PI, behavior, walkPath });
  }
  return slots;
}

export function AppleQuadrant({ contributors }: { contributors: Contributor[] }) {
  const isNight = useCityStore(s => s.isNight);
  const slots = useMemo(() => generateCharacterSlots(contributors.length), [contributors.length]);

  // Apple Park ring: 36 segments in a circle
  const ringSegments = useMemo(() => {
    const segs: { pos: [number, number, number]; rot: number }[] = [];
    const SEGMENTS = 36;
    const RADIUS = 18;
    for (let i = 0; i < SEGMENTS; i++) {
      // Leave a gap at the front (facing central plaza)
      if (i === 0) continue;
      const angle = (i / SEGMENTS) * Math.PI * 2;
      segs.push({
        pos: [Math.cos(angle) * RADIUS, 1.5, Math.sin(angle) * RADIUS],
        rot: angle,
      });
    }
    return segs;
  }, []);

  // Trees inside the courtyard
  const courtyardTrees = useMemo(() => {
    const trees: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 8 + (i % 3) * 3;
      trees.push([Math.cos(angle) * r, 0, Math.sin(angle) * r]);
    }
    return trees;
  }, []);

  // Perimeter trees
  const perimeterTrees = useMemo(() => {
    const trees: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      trees.push([Math.cos(angle) * 20, 0, Math.sin(angle) * 20]);
    }
    return trees;
  }, []);

  return (
    <group>
      {/* ── Apple Park Ring Building ── */}
      {ringSegments.map((seg, i) => (
        <group key={`ring-${i}`} position={seg.pos} rotation={[0, seg.rot, 0]}>
          {/* Building segment */}
          <mesh>
            <boxGeometry args={[3, 3, 5]} />
            <meshLambertMaterial
              color="#f0f0f0"
              emissive={isNight ? '#222222' : '#000000'}
              emissiveIntensity={isNight ? 0.3 : 0}
            />
          </mesh>
          {/* Inner glass strip */}
          <mesh position={[1.51, 0, 0]}>
            <boxGeometry args={[0.05, 2.5, 4.5]} />
            <meshLambertMaterial
              color="#88bbdd"
              transparent
              opacity={0.5}
              emissive={isNight ? '#335566' : '#000'}
              emissiveIntensity={isNight ? 0.5 : 0}
            />
          </mesh>
          {/* Outer glass strip */}
          <mesh position={[-1.51, 0, 0]}>
            <boxGeometry args={[0.05, 2.5, 4.5]} />
            <meshLambertMaterial
              color="#6699aa"
              transparent
              opacity={0.4}
              emissive={isNight ? '#223344' : '#000'}
              emissiveIntensity={isNight ? 0.4 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Entrance gap canopy */}
      <mesh position={[18, 2.5, 0]}>
        <boxGeometry args={[4, 0.2, 5]} />
        <meshLambertMaterial color="#e0e0e0" />
      </mesh>

      {/* Inner courtyard green disc */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 24]} />
        <meshLambertMaterial
          color="#4a8f3f"
          emissive={isNight ? '#0d1f0a' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

      {/* Center fountain */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2, 2.3, 0.6, 8]} />
        <meshLambertMaterial color="#888" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.3, 8]} />
        <meshLambertMaterial
          color="#4488cc"
          transparent
          opacity={0.7}
          emissive={isNight ? '#2266bb' : '#000'}
          emissiveIntensity={isNight ? 0.8 : 0}
        />
      </mesh>
      {isNight && (
        <pointLight position={[0, 1, 0]} color="#4488cc" intensity={2} distance={10} />
      )}

      {/* Apple logo on entrance face (simple flat white box) */}
      <mesh position={[19.5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.5, 1.5, 0.1]} />
        <meshLambertMaterial
          color="#ffffff"
          emissive={isNight ? '#ffffff' : '#888'}
          emissiveIntensity={isNight ? 0.6 : 0.1}
        />
      </mesh>

      {/* Courtyard trees — manicured, fuller */}
      {courtyardTrees.map((pos, i) => (
        <group key={`ct-${i}`} position={pos}>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[0.5, 1.6, 0.5]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[3, 2.5, 3]} />
            <meshLambertMaterial color="#2d8a2d" emissive={isNight ? '#0d1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Perimeter trees */}
      {perimeterTrees.map((pos, i) => (
        <group key={`pt-${i}`} position={pos}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.6, 2, 0.6]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <boxGeometry args={[4, 3, 4]} />
            <meshLambertMaterial color="#2d8a2d" emissive={isNight ? '#0d1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Benches */}
      {[
        [16, 0.15, 12] as [number, number, number],
        [16, 0.15, -12] as [number, number, number],
        [-16, 0.15, 12] as [number, number, number],
        [-16, 0.15, -12] as [number, number, number],
        [18, 0.15, 0] as [number, number, number],
      ].map((pos, i) => (
        <group key={`bench-${i}`} position={pos}>
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
        [18, 0, 10] as [number, number, number],
        [18, 0, -10] as [number, number, number],
        [-18, 0, 10] as [number, number, number],
        [-18, 0, 10] as [number, number, number],
      ].map((pos, i) => (
        <group key={`lamp-${i}`} position={pos}>
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

      {/* Ground logo — white Apple silhouette */}
      <mesh position={[0, 0.06, 18]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 16]} />
        <meshLambertMaterial
          color="#e0e0e0"
          emissive={isNight ? '#ffffff' : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>

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
            containmentRadius={12}
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
