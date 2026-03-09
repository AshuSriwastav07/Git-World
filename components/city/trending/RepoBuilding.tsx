// RepoBuilding — Layered stepped architecture for trending repositories
// New design: stepped body, glowing screen panels, orange windows, rooftop ornaments, neon strips, rank badges
'use client';

import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import type { TrendingRepo } from '@/lib/trendingStore';
import { useTrendingStore } from '@/lib/trendingStore';

interface RepoBuildingProps {
  repo: TrendingRepo;
  position: [number, number, number];
}

// Fixed height-by-rank table
const RANK_HEIGHTS = [72, 66, 61, 56, 52, 48, 44, 40, 37, 34, 31, 29, 27, 25, 24, 22, 20, 18, 17, 16];

function getHeight(rank: number): number {
  return RANK_HEIGHTS[Math.min(rank - 1, RANK_HEIGHTS.length - 1)] ?? 16;
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Create a canvas texture for the glowing screen panel
function createScreenTexture(repo: TrendingRepo, langColor: string): THREE.CanvasTexture {
  const W = 128, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, W, H);

  // Border glow
  ctx.strokeStyle = langColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Repo name (truncated)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  const name = repo.repo_name.length > 14 ? repo.repo_name.slice(0, 13) + '…' : repo.repo_name;
  ctx.fillText(name, W / 2, 24);

  // Language bar
  ctx.fillStyle = langColor;
  ctx.fillRect(10, 34, W - 20, 3);

  // Stars
  ctx.fillStyle = '#fbbf24';
  ctx.font = '10px monospace';
  ctx.fillText(`★ ${formatStars(repo.total_stars)}`, W / 2, 56);

  // Forks
  ctx.fillStyle = '#88ccff';
  ctx.font = '9px monospace';
  ctx.fillText(`⑂ ${formatStars(repo.forks)}`, W / 2, 72);

  // Fake code lines
  ctx.font = '7px monospace';
  const codeColors = ['#88cc88', '#cc8888', '#8888cc', '#cccc88', '#88cccc'];
  for (let i = 0; i < 16; i++) {
    const y = 90 + i * 10;
    if (y > H - 20) break;
    const indent = Math.floor(Math.random() * 4) * 8;
    const lineLen = 30 + Math.floor(Math.random() * 60);
    ctx.fillStyle = codeColors[i % codeColors.length];
    ctx.globalAlpha = 0.4 + Math.random() * 0.4;
    ctx.fillRect(8 + indent, y, lineLen, 5);
  }
  ctx.globalAlpha = 1;

  // Owner at bottom
  ctx.fillStyle = '#888888';
  ctx.font = '8px monospace';
  ctx.fillText(repo.owner_login, W / 2, H - 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

// Create rank badge canvas texture
function createBadgeTexture(rank: number): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Background circle
  const bgColor = rank <= 3 ? '#fbbf24' : rank <= 10 ? '#94a3b8' : '#475569';
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = rank <= 3 ? '#f59e0b' : '#64748b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rank number
  ctx.fillStyle = rank <= 3 ? '#000000' : '#ffffff';
  ctx.font = `bold ${rank < 10 ? 28 : 22}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${rank}`, S / 2, S / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Rooftop ornament: satellite dish (rank%3==0), glowing orb (rank%3==1), antenna cluster (rank%3==2)
function RooftopOrnament({ rank, height, langColor }: { rank: number; height: number; langColor: string }) {
  const type = rank % 3;
  const y = height;

  if (type === 0) {
    // Satellite dish
    return (
      <group position={[0, y, 0]}>
        {/* Dish base */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.5, 0.8, 0.5]} />
          <meshLambertMaterial color="#666666" />
        </mesh>
        {/* Dish arm */}
        <mesh position={[0.3, 1.2, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshLambertMaterial color="#888888" />
        </mesh>
        {/* Dish */}
        <mesh position={[0.8, 1.8, 0]}>
          <boxGeometry args={[1.2, 0.15, 1.2]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Signal glow */}
        <mesh position={[0.8, 2.2, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color={langColor} />
        </mesh>
      </group>
    );
  }

  if (type === 1) {
    // Glowing orb
    return (
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.4]} />
          <meshLambertMaterial color="#555555" />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <sphereGeometry args={[0.7, 8, 8]} />
          <meshBasicMaterial color={langColor} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <sphereGeometry args={[1.2, 8, 8]} />
          <meshBasicMaterial color={langColor} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // Antenna cluster (type === 2)
  return (
    <group position={[0, y, 0]}>
      {/* Central tall antenna */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 0.1]} />
        <meshLambertMaterial color="#999999" />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {/* Side antennas */}
      {[-0.5, 0.5].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 1, 0]}>
            <boxGeometry args={[0.08, 2, 0.08]} />
            <meshLambertMaterial color="#888888" />
          </mesh>
          <mesh position={[x, 2.1, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshBasicMaterial color={langColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT — Layered stepped building
   ═══════════════════════════════════════════════════════════════════ */
export function RepoBuilding({ repo, position }: RepoBuildingProps) {
  const selectRepo = useTrendingStore(s => s.selectRepo);
  const langColor = LANGUAGE_COLORS[repo.primary_language] ?? LANGUAGE_COLORS.default;
  const rank = repo.trending_rank;
  const height = getHeight(rank);
  const baseWidth = 5;
  const bodyColor = '#0d0d1a';

  const onClick = () => selectRepo(repo);

  // Textures
  const screenTexRef = useRef<THREE.CanvasTexture | null>(null);
  const badgeTexRef = useRef<THREE.CanvasTexture | null>(null);

  const screenTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const t = createScreenTexture(repo, langColor);
    screenTexRef.current = t;
    return t;
  }, [repo.repo_full_name, langColor]);

  const badgeTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const t = createBadgeTexture(rank);
    badgeTexRef.current = t;
    return t;
  }, [rank]);

  // Dispose textures on unmount
  useEffect(() => {
    return () => {
      screenTexRef.current?.dispose();
      badgeTexRef.current?.dispose();
    };
  }, []);

  // Build stepped layers: 3-5 layers narrowing upward with ledge plates
  const layers = useMemo(() => {
    const LAYER_COUNT = rank <= 5 ? 5 : rank <= 10 ? 4 : 3;
    const result: { y: number; w: number; d: number; h: number }[] = [];
    let currentY = 0;

    for (let i = 0; i < LAYER_COUNT; i++) {
      const t = i / LAYER_COUNT;
      const layerH = height / LAYER_COUNT;
      const taper = 1 - t * 0.25; // Each layer narrows by ~25% of the taper
      const w = baseWidth * taper;
      const d = baseWidth * taper * 0.85;
      result.push({ y: currentY + layerH / 2, w, h: layerH, d });
      currentY += layerH;
    }
    return result;
  }, [height, rank, baseWidth]);

  // Screen panel dimensions: 50-70% of front face on the tallest (base) layer
  const screenH = layers[0].h * 0.65;
  const screenW = layers[0].w * 0.6;

  return (
    <group position={position}>
      {/* ── Stepped body layers ── */}
      {layers.map((layer, i) => (
        <group key={`layer-${i}`}>
          {/* Main body */}
          <mesh
            position={[0, layer.y, 0]}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <boxGeometry args={[layer.w, layer.h, layer.d]} />
            <meshStandardMaterial
              color={bodyColor}
              roughness={0.4}
              metalness={0.6}
              emissive={langColor}
              emissiveIntensity={0.03}
            />
          </mesh>

          {/* Ledge plate between layers */}
          {i < layers.length - 1 && (
            <mesh position={[0, layer.y + layer.h / 2, 0]}>
              <boxGeometry args={[layer.w + 0.3, 0.15, layer.d + 0.3]} />
              <meshStandardMaterial
                color="#1a1a2e"
                emissive={langColor}
                emissiveIntensity={0.4}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          )}

          {/* Orange interior windows on non-screen faces (side + back) — base layer only */}
          {i === 0 && (
            <>
              {/* Left face windows */}
              {Array.from({ length: Math.floor(layer.h / 3) }, (_, row) => (
                <group key={`lw-${row}`}>
                  {Array.from({ length: 3 }, (_, col) => (
                    <mesh
                      key={`lw-${row}-${col}`}
                      position={[
                        -(layer.w / 2 + 0.01),
                        layer.y - layer.h / 2 + 1.5 + row * 3,
                        -layer.d * 0.3 + col * (layer.d * 0.3),
                      ]}
                      rotation={[0, -Math.PI / 2, 0]}
                    >
                      <planeGeometry args={[0.8, 1.2]} />
                      <meshBasicMaterial color="#ff8c00" transparent opacity={0.7} />
                    </mesh>
                  ))}
                </group>
              ))}
              {/* Right face windows */}
              {Array.from({ length: Math.floor(layer.h / 3) }, (_, row) => (
                <group key={`rw-${row}`}>
                  {Array.from({ length: 3 }, (_, col) => (
                    <mesh
                      key={`rw-${row}-${col}`}
                      position={[
                        layer.w / 2 + 0.01,
                        layer.y - layer.h / 2 + 1.5 + row * 3,
                        -layer.d * 0.3 + col * (layer.d * 0.3),
                      ]}
                      rotation={[0, Math.PI / 2, 0]}
                    >
                      <planeGeometry args={[0.8, 1.2]} />
                      <meshBasicMaterial color="#ff8c00" transparent opacity={0.7} />
                    </mesh>
                  ))}
                </group>
              ))}
              {/* Back face windows */}
              {Array.from({ length: Math.floor(layer.h / 3) }, (_, row) => (
                <group key={`bw-${row}`}>
                  {Array.from({ length: 3 }, (_, col) => (
                    <mesh
                      key={`bw-${row}-${col}`}
                      position={[
                        -layer.w * 0.3 + col * (layer.w * 0.3),
                        layer.y - layer.h / 2 + 1.5 + row * 3,
                        -(layer.d / 2 + 0.01),
                      ]}
                    >
                      <planeGeometry args={[0.8, 1.2]} />
                      <meshBasicMaterial color="#ff8c00" transparent opacity={0.7} />
                    </mesh>
                  ))}
                </group>
              ))}
            </>
          )}
        </group>
      ))}

      {/* ── Large glowing screen panel on front face ── */}
      {screenTex && (
        <>
          <mesh position={[0, layers[0].h * 0.4, layers[0].d / 2 + 0.02]}>
            <planeGeometry args={[screenW, screenH]} />
            <meshBasicMaterial map={screenTex} transparent opacity={0.95} />
          </mesh>
          {/* Screen glow */}
          <mesh position={[0, layers[0].h * 0.4, layers[0].d / 2 + 0.05]}>
            <planeGeometry args={[screenW + 0.3, screenH + 0.3]} />
            <meshBasicMaterial color={langColor} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* ── Neon edge accent strips at vertical corners ── */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh
          key={`neon-${i}`}
          position={[sx * (baseWidth / 2 + 0.04), height / 2, sz * (baseWidth * 0.85 / 2 + 0.04)]}
        >
          <boxGeometry args={[0.08, height, 0.08]} />
          <meshBasicMaterial color={langColor} transparent opacity={0.8} />
        </mesh>
      ))}

      {/* ── Horizontal ledge glow strips (emissive underside) ── */}
      {layers.slice(0, -1).map((layer, i) => (
        <mesh key={`lglow-${i}`} position={[0, layer.y + layer.h / 2 - 0.1, 0]}>
          <boxGeometry args={[layer.w + 0.1, 0.06, layer.d + 0.1]} />
          <meshBasicMaterial color={langColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}

      {/* ── Rooftop ornament ── */}
      <RooftopOrnament rank={rank} height={height} langColor={langColor} />

      {/* ── Glow halo ── */}
      <mesh position={[0, height / 2, 0]}>
        <sphereGeometry args={[baseWidth * 1.2, 12, 12]} />
        <meshBasicMaterial color={langColor} transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Floating name label ── */}
      <Billboard position={[0, height + 4, 0]}>
        <mesh>
          <planeGeometry args={[Math.max(6, repo.repo_full_name.length * 0.35), 2.2]} />
          <meshBasicMaterial color="#0a0614" transparent opacity={0.85} />
        </mesh>
        <Text
          position={[0, 0.35, 0.01]}
          fontSize={0.55}
          color="#ffffff"
          font="/fonts/PressStart2P-Regular.ttf"
          anchorX="center"
          anchorY="middle"
          maxWidth={12}
        >
          {repo.repo_full_name}
        </Text>
        <Text
          position={[0, -0.4, 0.01]}
          fontSize={0.4}
          color="#fbbf24"
          font="/fonts/PressStart2P-Regular.ttf"
          anchorX="center"
          anchorY="middle"
        >
          {`★ ${formatStars(repo.total_stars)}`}
        </Text>
      </Billboard>

      {/* ── Large rank badge ── */}
      <Billboard position={[-(baseWidth / 2 + 2), height * 0.75, 0]}>
        {badgeTex && (
          <mesh>
            <planeGeometry args={[rank <= 3 ? 3.2 : 2.5, rank <= 3 ? 3.2 : 2.5]} />
            <meshBasicMaterial map={badgeTex} transparent />
          </mesh>
        )}
      </Billboard>
    </group>
  );
}
