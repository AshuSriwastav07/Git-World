// SiliconValleyPark — Rectangular 220×220 park
// North 60%: 8 company campuses in two rows of 4 (wide spacing)
// Middle: Main boulevard + Burj Khalifa
// South 40%: 8 language districts in 2 rows × 4
'use client';

import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { SV_CENTER, SV_HALF } from '@/lib/cityLayout';
import { BurjKhalifaTower } from './svpark/BurjKhalifaTower';
import { LanguageDistrict, type LanguageDev } from './svpark/LanguageDistrict';
import { LanguageMonument } from './svpark/LanguageMonument';
import { AppleQuadrant } from './svpark/AppleQuadrant';
import { GoogleQuadrant } from './svpark/GoogleQuadrant';
import { NvidiaQuadrant } from './svpark/NvidiaQuadrant';
import { MetaQuadrant } from './svpark/MetaQuadrant';
import { CompanySector } from './svpark/CompanySector';
import { AmazonBuilding } from './svpark/buildings/AmazonBuilding';
import { MicrosoftBuilding } from './svpark/buildings/MicrosoftBuilding';
import { OpenAIBuilding } from './svpark/buildings/OpenAIBuilding';
import { NetflixBuilding } from './svpark/buildings/NetflixBuilding';

export interface SVContributor {
  login: string;
  avatarUrl: string;
  topLanguage: string;
  citySlot: number;
  cityRank: number;
  totalScore: number;
  estimatedCommits: number;
  totalStars: number;
  publicRepos: number;
}

type CompanyKey = 'apple' | 'google' | 'nvidia' | 'meta' | 'amazon' | 'microsoft' | 'openai' | 'netflix';

function useFetchAllSVData() {
  const [companies, setCompanies] = useState<Record<CompanyKey, SVContributor[]>>({
    apple: [], google: [], nvidia: [], meta: [],
    amazon: [], microsoft: [], openai: [], netflix: [],
  });
  const [languageDevs, setLanguageDevs] = useState<Record<string, LanguageDev[]>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/silicon-valley/contributors')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.companies) {
          setCompanies(data.companies as Record<CompanyKey, SVContributor[]>);
        }
        if (data.languages) {
          setLanguageDevs(data.languages);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return { companies, languageDevs };
}

/* ── Language District definitions (south half 2×4 grid) ── */
const LANGUAGE_DISTRICTS: { language: string; color: string; gridX: number; gridZ: number }[] = [
  { language: 'Python',     color: '#3776ab', gridX: 0, gridZ: 0 },
  { language: 'JavaScript', color: '#f7df1e', gridX: 1, gridZ: 0 },
  { language: 'TypeScript', color: '#3178c6', gridX: 2, gridZ: 0 },
  { language: 'Java',       color: '#ed8b00', gridX: 3, gridZ: 0 },
  { language: 'Rust',       color: '#dea584', gridX: 0, gridZ: 1 },
  { language: 'Go',         color: '#00add8', gridX: 1, gridZ: 1 },
  { language: 'C++',        color: '#00599c', gridX: 2, gridZ: 1 },
  { language: 'Kotlin',     color: '#7f52ff', gridX: 3, gridZ: 1 },
];

// Rectangular perimeter fence with hedge
function RectFence({ halfW, halfH, gapPositions }: {
  halfW: number;
  halfH: number;
  gapPositions: { side: 'n' | 's' | 'e' | 'w'; offset: number }[];
}) {
  const posts = useMemo(() => {
    const result: { pos: [number, number, number]; rot: number }[] = [];
    const SPACING = 5;

    // Build all four sides
    const sides: { start: [number, number]; end: [number, number]; rot: number; side: 'n' | 's' | 'e' | 'w' }[] = [
      { start: [-halfW, -halfH], end: [halfW, -halfH], rot: 0, side: 's' },
      { start: [halfW, -halfH], end: [halfW, halfH], rot: Math.PI / 2, side: 'e' },
      { start: [halfW, halfH], end: [-halfW, halfH], rot: Math.PI, side: 'n' },
      { start: [-halfW, halfH], end: [-halfW, -halfH], rot: -Math.PI / 2, side: 'w' },
    ];

    for (const s of sides) {
      const dx = s.end[0] - s.start[0];
      const dz = s.end[1] - s.start[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const count = Math.floor(len / SPACING);

      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = s.start[0] + dx * t;
        const z = s.start[1] + dz * t;

        // Check if near a gap
        const isGap = gapPositions.some(g => {
          if (g.side !== s.side) return false;
          if (s.side === 'n' || s.side === 's') return Math.abs(x - g.offset) < 4;
          return Math.abs(z - g.offset) < 4;
        });
        if (isGap) continue;

        result.push({ pos: [x, 0, z], rot: s.rot });
      }
    }
    return result;
  }, [halfW, halfH, gapPositions]);

  return (
    <group>
      {posts.map((p, i) => (
        <group key={i}>
          <mesh position={[p.pos[0], 1.0, p.pos[2]]}>
            <boxGeometry args={[0.3, 2.0, 0.3]} />
            <meshLambertMaterial color="#3a5a2a" />
          </mesh>
          <mesh position={[p.pos[0], 0.5, p.pos[2]]} rotation={[0, p.rot, 0]}>
            <boxGeometry args={[5, 1.0, 0.8]} />
            <meshLambertMaterial color="#2d5a27" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ReferenceTopHeader() {
  const headerTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f8d500';
    ctx.fillRect(0, 0, 1024, 180);
    ctx.strokeStyle = '#1a1a1a';
    ctx.setLineDash([18, 10]);
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 1004, 160);
    ctx.setLineDash([]);
    ctx.fillStyle = '#121212';
    ctx.font = 'bold 82px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SILICON VALLEY', 512, 95);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group>
      <mesh position={[0, 14, -102]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[82, 13]} />
        <meshBasicMaterial map={headerTex ?? undefined} color={headerTex ? '#ffffff' : '#f8d500'} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT CONSTANTS — 220×220 park
// North 60%: 8 company campuses in two rows of 4 (z = -75 back, z = -10 front)
// Middle: Main boulevard + Burj Khalifa (z = 26)
// South 40%: 8 language districts 2×4 grid (z = 50 row1, z = 90 row2)
// ═══════════════════════════════════════════════════════════════════════════════

const PARK_HALF = SV_HALF; // 110 units from center to edge

// Company campus positions — two rows, spacing ~50 units between centers
const COMPANY_POSITIONS: Record<CompanyKey, [number, number, number]> = {
  apple:  [-75, 0, -10],
  google: [-25, 0, -10],
  nvidia: [25, 0, -10],
  meta:   [75, 0, -10],
  amazon:    [-75, 0, -75],
  microsoft: [-25, 0, -75],
  openai:    [25, 0, -75],
  netflix:   [75, 0, -75],
};

// Language district grid — 2 rows × 4 columns (south 40%)
const LANG_GRID_START_X = -75;
const LANG_GRID_STEP_X  = 50;
const LANG_GRID_START_Z = 50;
const LANG_GRID_STEP_Z  = 40;

export function SiliconValleyPark() {
  const isNight = useCityStore(s => s.isNight);
  const { companies, languageDevs } = useFetchAllSVData();

  return (
    <group position={[SV_CENTER.x, 0, SV_CENTER.z]}>
      {/* ── Rectangular grass ground ── */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PARK_HALF * 2, PARK_HALF * 2]} />
        <meshLambertMaterial
          color="#9fd63a"
          emissive={isNight ? '#1a4a0a' : '#000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>

      <ReferenceTopHeader />

      {/* ── Rectangular perimeter fence ── */}
      <RectFence
        halfW={PARK_HALF - 1}
        halfH={PARK_HALF - 1}
        gapPositions={[
          { side: 'w', offset: 0 },  // west entrance (main, from city)
          { side: 'e', offset: 0 },  // east entrance
          { side: 'n', offset: 0 },  // north entrance
          { side: 's', offset: 0 },  // south entrance
        ]}
      />

      {/* ── Main entrance pillars (west) ── */}
      <group position={[-(PARK_HALF - 1), 0, 0]}>
        <mesh position={[0, 1.5, -2]}>
          <boxGeometry args={[0.6, 3, 0.6]} />
          <meshLambertMaterial color="#555" />
        </mesh>
        <mesh position={[0, 1.5, 2]}>
          <boxGeometry args={[0.6, 3, 0.6]} />
          <meshLambertMaterial color="#555" />
        </mesh>
      </group>

      {/* ── Burj Khalifa Tower (central plaza, no road inside park) ── */}
      <group position={[0, 0, 26]}>
        <BurjKhalifaTower />
      </group>

      {/* ═══ NORTH — COMPANY CAMPUSES (single row) ═══ */}

      {/* Four company quadrants (row 1) */}
      <group position={COMPANY_POSITIONS.apple}>
        <AppleQuadrant contributors={companies.apple} />
      </group>
      <group position={COMPANY_POSITIONS.google}>
        <GoogleQuadrant contributors={companies.google} />
      </group>
      <group position={COMPANY_POSITIONS.nvidia}>
        <NvidiaQuadrant contributors={companies.nvidia} />
      </group>
      <group position={COMPANY_POSITIONS.meta}>
        <MetaQuadrant contributors={companies.meta} />
      </group>

      {/* Four new company campuses (row 2) */}
      <group position={COMPANY_POSITIONS.amazon}>
        <CompanySector
          config={{ name: 'Amazon', brandColor: '#FF9900', bgColor: '#232F3E', building: <AmazonBuilding position={[0, 0, 0]} scale={1} /> }}
          developers={companies.amazon}
        />
      </group>
      <group position={COMPANY_POSITIONS.microsoft}>
        <CompanySector
          config={{ name: 'Microsoft', brandColor: '#00a4ef', bgColor: '#f3f3f3', building: <MicrosoftBuilding position={[0, 0, 0]} scale={1} /> }}
          developers={companies.microsoft}
        />
      </group>
      <group position={COMPANY_POSITIONS.openai}>
        <CompanySector
          config={{ name: 'OpenAI', brandColor: '#10a37f', bgColor: '#ffffff', building: <OpenAIBuilding position={[0, 0, 0]} scale={1} /> }}
          developers={companies.openai}
        />
      </group>
      <group position={COMPANY_POSITIONS.netflix}>
        <CompanySector
          config={{ name: 'Netflix', brandColor: '#E50914', bgColor: '#221f1f', building: <NetflixBuilding position={[0, 0, 0]} scale={1} /> }}
          developers={companies.netflix}
        />
      </group>

      {/* ═══ SOUTH — LANGUAGE DISTRICTS (2 rows × 4) ═══ */}

      {LANGUAGE_DISTRICTS.map(ld => {
        const x = LANG_GRID_START_X + ld.gridX * LANG_GRID_STEP_X;
        const z = LANG_GRID_START_Z + ld.gridZ * LANG_GRID_STEP_Z;
        return (
          <group key={ld.language}>
            {/* Language monument */}
            <group position={[x, 0, z - 6]}>
              <LanguageMonument language={ld.language} color={ld.color} />
            </group>
            {/* Language district (devs + banner) */}
            <LanguageDistrict
              language={ld.language}
              color={ld.color}
              position={[x, 0, z]}
              developers={languageDevs[ld.language] ?? []}
            />
          </group>
        );
      })}

      {/* ── Park ambient lighting (night) ── */}
      {isNight && (
        <>
          {/* Central plaza glow */}
          <pointLight position={[0, 8, 26]} color="#ffe8b0" intensity={3} distance={PARK_HALF * 1.2} decay={1.5} />
          {/* Company zone lights */}
          <pointLight position={COMPANY_POSITIONS.apple} color="#c0c0c0" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.google} color="#4285f4" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.nvidia} color="#76b900" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.meta} color="#0082fb" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.amazon} color="#FF9900" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.microsoft} color="#00a4ef" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.openai} color="#10a37f" intensity={1.5} distance={40} />
          <pointLight position={COMPANY_POSITIONS.netflix} color="#E50914" intensity={1.5} distance={40} />
          {/* Language district glow */}
          <pointLight position={[0, 8, 60]} color="#ffe8b0" intensity={2} distance={60} />
        </>
      )}

      {/* ═══ TREES ═══ */}

      {/* Trees between company campuses (border columns, rows 1 & 2) */}
      {[-50, 0, 50].map((x, gi) =>
        Array.from({ length: 8 }).map((_, j) => (
          <group key={`btree-${gi}-${j}`} position={[x, 0, -100 + j * 12]}>
            <mesh position={[0, 1.2, 0]}>
              <boxGeometry args={[0.5, 2.4, 0.5]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <boxGeometry args={[3, 3, 3]} />
              <meshLambertMaterial color="#2d8a2d" emissive={isNight ? '#0d1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
            </mesh>
          </group>
        ))
      )}

      {/* Trees along west perimeter */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={`ptw-${i}`} position={[-105, 0, -100 + i * 22]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[4, 3.5, 4]} />
            <meshLambertMaterial color="#228B22" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Trees along east perimeter */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={`pte-${i}`} position={[105, 0, -100 + i * 22]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[4, 3.5, 4]} />
            <meshLambertMaterial color="#228B22" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Southern garden grove */}
      {Array.from({ length: 5 }).map((_, i) =>
        Array.from({ length: 2 }).map((_, j) => (
          <group key={`gtree-${i}-${j}`} position={[-80 + i * 40, 0, 98 + j * 10]}>
            <mesh position={[0, 1.5, 0]}>
              <boxGeometry args={[0.6, 3, 0.6]} />
              <meshLambertMaterial color="#6B4226" />
            </mesh>
            <mesh position={[0, 4.2, 0]}>
              <boxGeometry args={[4.5, 4, 4.5]} />
              <meshLambertMaterial color="#1a8a1a" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
            </mesh>
          </group>
        ))
      )}

      {/* North perimeter trees */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={`ptn-${i}`} position={[-100 + i * 22, 0, -105]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[4, 3.5, 4]} />
            <meshLambertMaterial color="#228B22" emissive={isNight ? '#0a1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}

      {/* Decorative trees flanking main boulevard */}
      {[-80, -50, 50, 80].map((x, i) => (
        <group key={`rtree-${i}`} position={[x, 0, 26]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.5, 2.4, 0.5]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <boxGeometry args={[3, 2.5, 3]} />
            <meshLambertMaterial color="#2d8a2d" emissive={isNight ? '#0d1f0a' : '#000'} emissiveIntensity={isNight ? 0.3 : 0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
