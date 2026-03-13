// TrendingDistrict — 3D zone for top 20 trending GitHub repos
'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { TRENDING_CENTER, TRENDING_HALF } from '@/lib/cityLayout';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import { useTrendingStore } from '@/lib/trendingStore';
import { RepoBuilding } from './trending/RepoBuilding';
import { getSupabaseBrowser } from '@/lib/supabase';

const ZONE_SIZE = TRENDING_HALF * 2; // 100
const GRID_COLS = 5;
const GRID_ROWS = 4;
const SPACING = 15;

// Calculate grid slot position within the district (local coords)
function districtSlotPosition(slot: number): [number, number, number] {
  const col = slot % GRID_COLS;
  const row = Math.floor(slot / GRID_COLS);
  const gridWidth = (GRID_COLS - 1) * SPACING;
  const gridDepth = (GRID_ROWS - 1) * SPACING;
  const x = col * SPACING - gridWidth / 2;
  const z = row * SPACING - gridDepth / 2;
  return [x, 0, z];
}

// Canvas texture for entrance sign
function createEntranceTexture(totalWeeklyStars: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a3a0a';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 184);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 30px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TRENDING REPOS', 256, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px "Press Start 2P", monospace';
  ctx.fillText('LAST 7 DAYS', 256, 100);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '14px "Press Start 2P", monospace';
  const formattedStars = totalWeeklyStars >= 1000
    ? `${(totalWeeklyStars / 1000).toFixed(1)}k`
    : String(totalWeeklyStars);
  ctx.fillText(`★ ${formattedStars} stars this week`, 256, 145);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Billboard banner texture — "This Week Famous Repos"
function createBillboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark green bg matching the park theme
  ctx.fillStyle = '#1a3a0a';
  ctx.fillRect(0, 0, 1024, 256);

  // Gold double border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 1012, 244);
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 996, 228);

  // Main text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.fillText('⭐ This Week Famous Repos ⭐', 512, 90);

  // Sub text
  ctx.fillStyle = '#ffffff';
  ctx.font = '26px Arial, sans-serif';
  ctx.fillText('Top 20 Trending on GitHub', 512, 160);

  // Bottom accent line
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(100, 200, 824, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Static billboard sign on two posts
function BillboardSign() {
  const billboardTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBillboardTexture();
  }, []);

  const BOARD_WIDTH = 16;
  const BOARD_HEIGHT = 4;
  const BOARD_Y = 12;

  return (
    <group position={[0, 0, 36]}>
      {/* Left post */}
      <mesh position={[-BOARD_WIDTH / 2 + 0.5, BOARD_Y / 2, 0]}>
        <boxGeometry args={[0.5, BOARD_Y, 0.5]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>
      {/* Right post */}
      <mesh position={[BOARD_WIDTH / 2 - 0.5, BOARD_Y / 2, 0]}>
        <boxGeometry args={[0.5, BOARD_Y, 0.5]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>
      {/* Billboard board — front */}
      <mesh position={[0, BOARD_Y + BOARD_HEIGHT / 2 - 1, 0.15]}>
        <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
        <meshBasicMaterial map={billboardTex} />
      </mesh>
      {/* Billboard board — back */}
      <mesh position={[0, BOARD_Y + BOARD_HEIGHT / 2 - 1, -0.15]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
        <meshBasicMaterial map={billboardTex} />
      </mesh>
      {/* Board backing */}
      <mesh position={[0, BOARD_Y + BOARD_HEIGHT / 2 - 1, 0]}>
        <boxGeometry args={[BOARD_WIDTH + 0.3, BOARD_HEIGHT + 0.3, 0.25]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>
      {/* Spotlights illuminating the sign */}
      <pointLight color="#fbbf24" intensity={3} distance={12} position={[-4, BOARD_Y + BOARD_HEIGHT + 1, 2]} decay={2} />
      <pointLight color="#fbbf24" intensity={3} distance={12} position={[4, BOARD_Y + BOARD_HEIGHT + 1, 2]} decay={2} />
    </group>
  );
}

// Perimeter posts with glowing accents
function DistrictBorder() {
  const posts = useMemo(() => {
    const result: { pos: [number, number, number]; hasGlow: boolean; glowColor: string }[] = [];
    const langColors = Object.values(LANGUAGE_COLORS);
    const HALF = TRENDING_HALF;
    const POST_SPACING = 5;

    const sides: [number, number, number, number][] = [
      [-HALF, -HALF, HALF, -HALF],
      [HALF, -HALF, HALF, HALF],
      [HALF, HALF, -HALF, HALF],
      [-HALF, HALF, -HALF, -HALF],
    ];

    let colorIdx = 0;
    sides.forEach(([x1, z1, x2, z2]) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const count = Math.floor(len / POST_SPACING);

      for (let i = 0; i <= count; i++) {
        const t = count > 0 ? i / count : 0;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        const hasGlow = i % 3 === 0;
        result.push({
          pos: [px, 0, pz],
          hasGlow,
          glowColor: langColors[colorIdx % langColors.length],
        });
        colorIdx++;
      }
    });

    return result;
  }, []);

  return (
    <group>
      {posts.map((p, i) => (
        <group key={i}>
          <mesh position={[p.pos[0], 1, p.pos[2]]}>
            <boxGeometry args={[0.4, 2, 0.4]} />
            <meshLambertMaterial color="#555566" />
          </mesh>
          {p.hasGlow && (
            <pointLight
              color={p.glowColor}
              intensity={1.5}
              distance={8}
              position={[p.pos[0], 2.2, p.pos[2]]}
              decay={2}
            />
          )}
        </group>
      ))}
    </group>
  );
}

// Entrance pillars with gold light strips
function EntrancePillars() {
  return (
    <group position={[0, 0, TRENDING_HALF - 3]}>
      <group position={[-3, 0, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.6, 3, 0.6]} />
          <meshLambertMaterial color="#444455" />
        </mesh>
        <mesh position={[0.31, 1.5, 0]}>
          <boxGeometry args={[0.05, 2.8, 0.2]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[-0.31, 1.5, 0]}>
          <boxGeometry args={[0.05, 2.8, 0.2]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>
      <group position={[3, 0, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.6, 3, 0.6]} />
          <meshLambertMaterial color="#444455" />
        </mesh>
        <mesh position={[0.31, 1.5, 0]}>
          <boxGeometry args={[0.05, 2.8, 0.2]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[-0.31, 1.5, 0]}>
          <boxGeometry args={[0.05, 2.8, 0.2]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>
    </group>
  );
}

// Illuminated pathways between building rows
function Pathways() {
  const paths = useMemo(() => {
    const result: { z: number }[] = [];
    const gridDepth = (GRID_ROWS - 1) * SPACING;
    for (let row = 0; row < GRID_ROWS - 1; row++) {
      const z = row * SPACING - gridDepth / 2 + SPACING / 2;
      result.push({ z });
    }
    return result;
  }, []);

  return (
    <group>
      {paths.map((p, i) => (
        <group key={i}>
          {/* Pathway strip — subtle dark path */}
          <mesh position={[0, 0.06, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[ZONE_SIZE * 0.8, 2]} />
            <meshBasicMaterial color="#3a6a1a" transparent opacity={0.5} />
          </mesh>
          {/* Lamp posts along pathway */}
          {[-30, -15, 0, 15, 30].map((x, j) => (
            <group key={`lamp-${j}`} position={[x, 0, p.z]}>
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[0.15, 3, 0.15]} />
                <meshLambertMaterial color="#333344" />
              </mesh>
              <pointLight
                color={Object.values(LANGUAGE_COLORS)[(i * 5 + j) % Object.values(LANGUAGE_COLORS).length]}
                intensity={1}
                distance={10}
                position={[0, 3.2, 0]}
                decay={2}
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function ReferenceTrendingBoard() {
  const boardTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 520;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f3aa00';
    ctx.fillRect(0, 0, 1100, 520);
    ctx.strokeStyle = '#141414';
    ctx.setLineDash([24, 12]);
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 1072, 492);
    ctx.setLineDash([]);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 96px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Trending Repos', 550, 260);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh position={[0, 8, 36]} rotation={[-0.06, Math.PI, 0]}>
      <planeGeometry args={[74, 32]} />
      <meshBasicMaterial map={boardTex ?? undefined} color={boardTex ? '#ffffff' : '#f3aa00'} toneMapped={false} />
    </mesh>
  );
}

export function TrendingDistrict() {
  const isNight = useCityStore(s => s.isNight);
  const trendingRepos = useTrendingStore(s => s.trendingRepos);
  const setTrendingRepos = useTrendingStore(s => s.setTrendingRepos);

  // Fetch trending repos on mount + subscribe to realtime updates
  useEffect(() => {
    let cancelled = false;

    // Initial fetch
    fetch('/api/trending')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.repos) setTrendingRepos(data.repos);
      })
      .catch(() => {});

    // Realtime subscription — update buildings live when data changes
    const sb = getSupabaseBrowser();
    const channel = sb
      .channel('trending_repos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trending_repos' },
        () => {
          // Re-fetch all active repos on any change
          if (cancelled) return;
          fetch('/api/trending')
            .then(r => r.json())
            .then(data => {
              if (!cancelled && data.repos) setTrendingRepos(data.repos);
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [setTrendingRepos]);

  const totalWeeklyStars = useMemo(
    () => trendingRepos.reduce((sum, r) => sum + r.weekly_stars, 0),
    [trendingRepos]
  );

  const entranceTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createEntranceTexture(totalWeeklyStars);
  }, [totalWeeklyStars]);

  return (
    <group position={[TRENDING_CENTER.x, 0, TRENDING_CENTER.z]}>
      {/* ── Ground overlay — green like Tech Park ── */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ZONE_SIZE, ZONE_SIZE]} />
        <meshLambertMaterial
          color="#9fd63a"
          emissive={isNight ? '#1a4a0a' : '#000000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>

      <ReferenceTrendingBoard />

      {/* ── District border ── */}
      <DistrictBorder />

      {/* ── Entrance pillars ── */}
      <EntrancePillars />

      {/* ── Entrance sign arch ── */}
      {entranceTexture && (
        <mesh position={[0, 4.5, TRENDING_HALF - 2]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[10, 3.75]} />
          <meshBasicMaterial map={entranceTexture} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── Illuminated pathways ── */}
      <Pathways />

      {/* ── Billboard — "This Week Famous Repos" ── */}
      <BillboardSign />

      {/* ── Repository buildings (20) ── */}
      {trendingRepos.map((repo) => {
        const localPos = districtSlotPosition(repo.district_slot);
        return (
          <RepoBuilding
            key={repo.repo_full_name}
            repo={repo}
            position={localPos}
          />
        );
      })}
    </group>
  );
}
