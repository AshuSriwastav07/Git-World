// SiliconValleyPark — Round park embedded in city at SV_CENTER
// Four quadrants: Apple (north/+Z), Google (east/+X), NVIDIA (south/-Z), Meta (west/-X)
'use client';

import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { SV_CENTER, SV_RADIUS } from '@/lib/cityLayout';
import { BurjKhalifaTower } from './svpark/BurjKhalifaTower';
import { FlyingBanners } from './svpark/FlyingBanners';
import { LanguageDistrict, type LanguageDev } from './svpark/LanguageDistrict';
import { AppleQuadrant } from './svpark/AppleQuadrant';
import { GoogleQuadrant } from './svpark/GoogleQuadrant';
import { NvidiaQuadrant } from './svpark/NvidiaQuadrant';
import { MetaQuadrant } from './svpark/MetaQuadrant';

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

type CompanyKey = 'apple' | 'google' | 'nvidia' | 'meta';

function useFetchAllSVData() {
  const [companies, setCompanies] = useState<Record<CompanyKey, SVContributor[]>>({
    apple: [], google: [], nvidia: [], meta: [],
  });
  const [languageDevs, setLanguageDevs] = useState<Record<string, LanguageDev[]>>({});

  useEffect(() => {
    let cancelled = false;
    // Single call — no company param fetches all companies + language devs
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

/* ── Language District definitions ── */
const LANGUAGE_DISTRICTS: { language: string; color: string; angle: number }[] = [
  { language: 'Python',     color: '#3776ab', angle: Math.PI * 0.25 },   // NE
  { language: 'JavaScript', color: '#f7df1e', angle: Math.PI * 0.75 },   // NW
  { language: 'TypeScript', color: '#3178c6', angle: -Math.PI * 0.25 },  // SE
  { language: 'Java',       color: '#ed8b00', angle: -Math.PI * 0.75 },  // SW
  { language: 'Rust',       color: '#dea584', angle: Math.PI * 0.125 },  // ENE
  { language: 'Go',         color: '#00add8', angle: Math.PI * 0.875 },  // WNW
  { language: 'C++',        color: '#00599c', angle: -Math.PI * 0.125 }, // ESE
  { language: 'Kotlin',     color: '#7f52ff', angle: -Math.PI * 0.875 }, // WSW
];

// Canvas-texture banner factory — MeshBasicMaterial so it's visible day & night
function createBannerTexture(text: string, bgColor: string, textColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);

  // Border
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 124);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Banner component — always readable day & night
function CompanyBanner({ text, bgColor, textColor, position, rotation }: {
  text: string;
  bgColor: string;
  textColor: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const tex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBannerTexture(text, bgColor, textColor);
  }, [text, bgColor, textColor]);

  return (
    <group position={position} rotation={rotation}>
      {/* Banner poles */}
      <mesh position={[-2.5, -1.5, 0]}>
        <boxGeometry args={[0.15, 3, 0.15]} />
        <meshLambertMaterial color="#888" />
      </mesh>
      <mesh position={[2.5, -1.5, 0]}>
        <boxGeometry args={[0.15, 3, 0.15]} />
        <meshLambertMaterial color="#888" />
      </mesh>
      {/* Banner face — MeshBasicMaterial = always visible */}
      <mesh>
        <planeGeometry args={[5, 1.25]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Fence post ring — round perimeter with hedge connections
function RoundFence({ radius, gaps }: { radius: number; gaps: number[] }) {
  const posts = useMemo(() => {
    const result: { pos: [number, number, number]; angle: number }[] = [];
    const COUNT = 72;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      // Skip posts near gap angles (entrances)
      const inGap = gaps.some(g => Math.abs(((angle - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.14);
      if (inGap) continue;
      result.push({
        pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        angle,
      });
    }
    return result;
  }, [radius, gaps]);

  return (
    <group>
      {posts.map((p, i) => (
        <group key={i}>
          {/* Fence post */}
          <mesh position={[p.pos[0], 1.0, p.pos[2]]}>
            <boxGeometry args={[0.3, 2.0, 0.3]} />
            <meshLambertMaterial color="#3a5a2a" />
          </mesh>
          {/* Dense hedge between posts */}
          <mesh position={[p.pos[0], 0.5, p.pos[2]]} rotation={[0, p.angle, 0]}>
            <boxGeometry args={[1.2, 1.0, 3.0]} />
            <meshLambertMaterial color="#2d5a27" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function SiliconValleyPark() {
  const isNight = useCityStore(s => s.isNight);

  const { companies, languageDevs } = useFetchAllSVData();

  // Quadrant offset — spacious layout for radius 80 park
  const Q_OFFSET = 40;

  return (
    <group position={[SV_CENTER.x, 0, SV_CENTER.z]}>
      {/* ── Round grass overlay (sits just above city ground) ── */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[SV_RADIUS, 48]} />
        <meshLambertMaterial
          color="#5a9e28"
          emissive={isNight ? '#1a4a0a' : '#000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>

      {/* ── Round perimeter fence with entrance gaps ── */}
      <RoundFence
        radius={SV_RADIUS - 1}
        gaps={[
          Math.PI,            // west entrance (from city center)
          0,                  // east
          Math.PI / 2,        // north
          -Math.PI / 2,       // south
        ]}
      />

      {/* ── Entrance pillars (west — faces city center) ── */}
      <group position={[-(SV_RADIUS - 1), 0, 0]}>
        <mesh position={[0, 1.5, -2]}>
          <boxGeometry args={[0.6, 3, 0.6]} />
          <meshLambertMaterial color="#555" />
        </mesh>
        <mesh position={[0, 1.5, 2]}>
          <boxGeometry args={[0.6, 3, 0.6]} />
          <meshLambertMaterial color="#555" />
        </mesh>
      </group>

      {/* ── Main entrance banner (west) ── */}
      <CompanyBanner
        text="SILICON VALLEY"
        bgColor="#1a1a2e"
        textColor="#d4a017"
        position={[-(SV_RADIUS - 1), 4, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
      {isNight && (
        <pointLight position={[-(SV_RADIUS - 1), 4, 0]} color="#d4a017" intensity={3} distance={12} />
      )}

      {/* ── Cross paths from center to each quadrant ── */}
      {/* North */}
      <mesh position={[0, 0.06, Q_OFFSET / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, Q_OFFSET]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
      {/* South */}
      <mesh position={[0, 0.06, -Q_OFFSET / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, Q_OFFSET]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
      {/* East */}
      <mesh position={[Q_OFFSET / 2, 0.06, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[2.5, Q_OFFSET]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
      {/* West — entrance path */}
      <mesh position={[-Q_OFFSET / 2, 0.06, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[2.5, Q_OFFSET]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>

      {/* ── Central Burj Khalifa Tower + Flying Banners ── */}
      <BurjKhalifaTower />
      <FlyingBanners />

      {/* ── Company Banners at each quadrant entrance ── */}
      <CompanyBanner text="APPLE" bgColor="#f5f5f7" textColor="#333333" position={[0, 4, Q_OFFSET - 4]} rotation={[0, 0, 0]} />
      <CompanyBanner text="GOOGLE" bgColor="#ffffff" textColor="#4285f4" position={[Q_OFFSET - 4, 4, 0]} rotation={[0, Math.PI / 2, 0]} />
      <CompanyBanner text="NVIDIA" bgColor="#1a1a1a" textColor="#76b900" position={[0, 4, -(Q_OFFSET - 4)]} rotation={[0, 0, 0]} />
      <CompanyBanner text="META" bgColor="#0a1628" textColor="#0082fb" position={[-(Q_OFFSET - 4), 4, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* ── Four Quadrants (compact) ── */}
      <group position={[0, 0, Q_OFFSET]}>
        <AppleQuadrant contributors={companies.apple} />
      </group>
      <group position={[Q_OFFSET, 0, 0]}>
        <GoogleQuadrant contributors={companies.google} />
      </group>
      <group position={[0, 0, -Q_OFFSET]}>
        <NvidiaQuadrant contributors={companies.nvidia} />
      </group>
      <group position={[-Q_OFFSET, 0, 0]}>
        <MetaQuadrant contributors={companies.meta} />
      </group>

      {/* ── Language Districts (between quadrant corners) ── */}
      {LANGUAGE_DISTRICTS.map(ld => {
        const distR = SV_RADIUS * 0.65; // place along perimeter between quadrants
        return (
          <LanguageDistrict
            key={ld.language}
            language={ld.language}
            color={ld.color}
            position={[Math.cos(ld.angle) * distR, 0, Math.sin(ld.angle) * distR]}
            developers={languageDevs[ld.language] ?? []}
          />
        );
      })}

      {/* ── Park ambient lighting (night) ── */}
      {isNight && (
        <>
          <pointLight position={[0, 6, 0]} color="#ffe8b0" intensity={3} distance={SV_RADIUS * 1.2} decay={1.5} />
          <pointLight position={[Q_OFFSET, 3, 0]} color="#4285f4" intensity={1.5} distance={35} />
          <pointLight position={[-Q_OFFSET, 3, 0]} color="#0082fb" intensity={1.5} distance={35} />
          <pointLight position={[0, 3, Q_OFFSET]} color="#c0c0c0" intensity={1.5} distance={35} />
          <pointLight position={[0, 3, -Q_OFFSET]} color="#76b900" intensity={1.5} distance={35} />
        </>
      )}
    </group>
  );
}
