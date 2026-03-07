'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const DUMMY = new THREE.Object3D();
const MAX_WINDOWS = 90000;
const DARK_WINDOW = new THREE.Color('#1a1028');
const ACCENT_COLORS = [
  '#ff006e',
  '#00f5d4',
  '#ff6b35',
  '#4cc9f0',
  '#a855f7',
  '#06d6a0',
  '#f5d020',
  '#ff48c4',
  '#00b4d8',
  '#ef233c',
].map((hex) => new THREE.Color(hex));

interface WindowData {
  x: number;
  y: number;
  z: number;
  ry: number;
  sx: number;
  sy: number;
  lit: boolean;
  r: number;
  g: number;
  b: number;
  phase: number;
  speed: number;
}

export interface BuildingInfo {
  pos: { x: number; z: number };
  dims: { height: number; width: number; depth: number };
  color: string;
  user: { login: string; recentActivity: number; totalStars: number };
}

interface Props {
  buildings: BuildingInfo[];
  isNight: boolean;
}

export default function WindowSparkleLayer({ buildings, isNight }: Props) {
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

  const { windows, glows } = useMemo(() => {
    const wins: WindowData[] = [];
    const glowWins: WindowData[] = [];

    for (const b of buildings) {
      if (wins.length >= MAX_WINDOWS) break;

      const { pos, dims, color } = b;
      const H = dims.height;
      const W = dims.width;
      const D = dims.depth;

      if (H < 2) continue;

      const seed = hashStr(b.user.login);
      const litRatio = Math.min(
        0.55 + (b.user.recentActivity / 100) * 0.25 + (b.user.totalStars / 3000) * 0.15,
        0.95,
      );

      const primary = new THREE.Color(color);
      const colsW = Math.max(2, Math.min(4, Math.round(W / 0.55) + 1));
      const colsD = Math.max(2, Math.min(4, Math.round(D / 0.55) + 1));
      const rows = Math.max(2, Math.min(28, Math.round(H / 3.2)));
      const usableHeight = Math.max(H - 1.2, 1.2);

      const faces = [
        { cols: colsW, offset: (c: number, r: number) => {
            const stepX = W / colsW;
            const stepY = usableHeight / rows;
            const wx = pos.x - W / 2 + (c + 0.5) * stepX;
            const wy = 0.7 + (r + 0.5) * stepY;
            return { x: wx, y: wy, z: pos.z + D / 2 + 0.05 };
          }, ry: 0 },
        { cols: colsW, offset: (c: number, r: number) => {
            const stepX = W / colsW;
            const stepY = usableHeight / rows;
            const wx = pos.x - W / 2 + (c + 0.5) * stepX;
            const wy = 0.7 + (r + 0.5) * stepY;
            return { x: wx, y: wy, z: pos.z - D / 2 - 0.05 };
          }, ry: Math.PI },
        { cols: colsD, offset: (c: number, r: number) => {
            const stepX = D / colsD;
            const stepY = usableHeight / rows;
            const wz = pos.z - D / 2 + (c + 0.5) * stepX;
            const wy = 0.7 + (r + 0.5) * stepY;
            return { x: pos.x + W / 2 + 0.05, y: wy, z: wz };
          }, ry: Math.PI / 2 },
        { cols: colsD, offset: (c: number, r: number) => {
            const stepX = D / colsD;
            const stepY = usableHeight / rows;
            const wz = pos.z - D / 2 + (c + 0.5) * stepX;
            const wy = 0.7 + (r + 0.5) * stepY;
            return { x: pos.x - W / 2 - 0.05, y: wy, z: wz };
          }, ry: -Math.PI / 2 },
      ];

      for (const face of faces) {
        for (let row = 0; row < rows && wins.length < MAX_WINDOWS; row++) {
          for (let c = 0; c < face.cols && wins.length < MAX_WINDOWS; c++) {
            const idx = row * face.cols + c;
            const p = face.offset(c, row);
            const stepX = (face.ry === 0 || face.ry === Math.PI) ? W / face.cols : D / face.cols;
            const stepY = usableHeight / rows;
            const lit = hashNoise(seed, idx * 3) < litRatio;
            const accentRoll = hashNoise(seed, idx * 3 + 1);
            const accentIndex = Math.floor(hashNoise(seed, idx * 3 + 2) * ACCENT_COLORS.length);
            const chosen = accentRoll < 0.5 ? primary : ACCENT_COLORS[accentIndex];

            wins.push({
              x: p.x, y: p.y, z: p.z,
              ry: face.ry,
              sx: stepX * 0.9,
              sy: stepY * 0.84,
              lit,
              r: lit ? chosen.r : DARK_WINDOW.r,
              g: lit ? chosen.g : DARK_WINDOW.g,
              b: lit ? chosen.b : DARK_WINDOW.b,
              phase: (idx * 0.37 + (seed & 0xff) * 0.001) % (Math.PI * 2),
              speed: 0.4 + (hashNoise(seed, idx * 5 + 4) * 0.8),
            });

            if (lit) {
              glowWins.push({
                x: p.x,
                y: p.y,
                z: p.z,
                ry: face.ry,
                sx: stepX * 1.08,
                sy: stepY * 1.02,
                lit: true,
                r: chosen.r,
                g: chosen.g,
                b: chosen.b,
                phase: (idx * 0.37 + (seed & 0xff) * 0.001) % (Math.PI * 2),
                speed: 0.4 + (hashNoise(seed, idx * 5 + 4) * 0.8),
              });
            }
          }
        }
      }
    }

    return { windows: wins, glows: glowWins };
  }, [buildings]);

  useEffect(() => {
    const baseMesh = baseRef.current;
    const glowMesh = glowRef.current;
    if (!baseMesh || windows.length === 0) return;

    baseMesh.raycast = () => undefined;
    if (glowMesh) glowMesh.raycast = () => undefined;

    const temp = new THREE.Color();
    for (let index = 0; index < windows.length; index++) {
      const window = windows[index];
      DUMMY.position.set(window.x, window.y, window.z);
      DUMMY.rotation.set(0, window.ry, 0);
      DUMMY.scale.set(window.sx, window.sy, 1);
      DUMMY.updateMatrix();
      baseMesh.setMatrixAt(index, DUMMY.matrix);
      temp.setRGB(window.r, window.g, window.b);
      baseMesh.setColorAt(index, temp);
    }
    baseMesh.instanceMatrix.needsUpdate = true;
    if (baseMesh.instanceColor) baseMesh.instanceColor.needsUpdate = true;
    baseMesh.count = windows.length;

    if (!glowMesh) return;
    for (let index = 0; index < glows.length; index++) {
      const glow = glows[index];
      DUMMY.position.set(glow.x, glow.y, glow.z);
      DUMMY.rotation.set(0, glow.ry, 0);
      DUMMY.scale.set(glow.sx, glow.sy, 1);
      DUMMY.updateMatrix();
      glowMesh.setMatrixAt(index, DUMMY.matrix);
      temp.setRGB(glow.r, glow.g, glow.b);
      glowMesh.setColorAt(index, temp);
    }
    glowMesh.instanceMatrix.needsUpdate = true;
    if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
    glowMesh.count = glows.length;
  }, [glows, windows]);

  useFrame((_, delta) => {
    const baseMesh = baseRef.current;
    const glowMesh = glowRef.current;
    if (!baseMesh?.instanceColor) return;
    timeRef.current += delta;
    const elapsed = timeRef.current;
    const temp = new THREE.Color();

    for (let index = 0; index < windows.length; index++) {
      const window = windows[index];
      if (window.lit) {
        const pulse = 0.9 + 0.1 * Math.sin(elapsed * window.speed + window.phase);
        const boost = isNight ? 1.45 : 0.9;
        temp.setRGB(window.r * pulse * boost, window.g * pulse * boost, window.b * pulse * boost);
      } else {
        const dim = isNight ? 0.95 : 0.75;
        temp.setRGB(window.r * dim, window.g * dim, window.b * dim);
      }
      baseMesh.setColorAt(index, temp);
    }
    baseMesh.instanceColor.needsUpdate = true;

    if (!glowMesh?.instanceColor) return;
    for (let index = 0; index < glows.length; index++) {
      const glow = glows[index];
      const pulse = 1 + 0.22 * Math.sin(elapsed * glow.speed + glow.phase);
      const boost = isNight ? 1.85 : 0.7;
      temp.setRGB(glow.r * pulse * boost, glow.g * pulse * boost, glow.b * pulse * boost);
      glowMesh.setColorAt(index, temp);
    }
    glowMesh.instanceColor.needsUpdate = true;
  });

  if (windows.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={baseRef} args={[undefined, undefined, Math.max(windows.length, 1)]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          vertexColors
          transparent
          toneMapped={false}
          opacity={isNight ? 0.96 : 0.82}
          depthWrite={false}
          blending={THREE.NormalBlending}
          side={THREE.FrontSide}
        />
      </instancedMesh>

      <instancedMesh ref={glowRef} args={[undefined, undefined, Math.max(glows.length, 1)]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          vertexColors
          transparent
          toneMapped={false}
          opacity={isNight ? 0.65 : 0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </instancedMesh>
    </group>
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function hashNoise(seed: number, salt: number): number {
  let hash = (seed ^ Math.imul(salt + 1, 2246822519)) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 1540483477);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 0xffffffff;
}
