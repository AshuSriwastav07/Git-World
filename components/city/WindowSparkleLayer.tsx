// WindowSparkleLayer — small Minecraft-style grid windows on all 4 building faces
'use client';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const DUMMY = new THREE.Object3D();
const MAX_WINDOWS = 80000;

interface WindowData {
  x: number; y: number; z: number;
  ry: number;
  r: number; g: number; b: number;
  phase: number;
  speed: number;
}

export interface BuildingInfo {
  pos: { x: number; z: number };
  dims: { height: number; width: number; depth: number };
  color: string;
  user: { login: string; recentActivity: number };
}

interface Props {
  buildings: BuildingInfo[];
  isNight: boolean;
}

export default function WindowSparkleLayer({ buildings, isNight }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

  const { windows, count } = useMemo(() => {
    const wins: WindowData[] = [];

    for (const b of buildings) {
      if (wins.length >= MAX_WINDOWS) break;

      const { pos, dims, color } = b;
      const H = dims.height;
      const W = dims.width;
      const D = dims.depth;

      if (H < 2) continue;

      const seed = hashStr(b.user.login);
      const litRatio = Math.min(0.3 + (b.user.recentActivity / 100) * 0.3, 0.55);

      // Extract bright language color for windows
      const tc = new THREE.Color(color);
      const cr = tc.r, cg = tc.g, cb = tc.b;

      // Window grid sizing — Minecraft style: few windows per face
      const colsW = Math.max(1, Math.min(3, Math.round(W / 0.9)));
      const colsD = Math.max(1, Math.min(3, Math.round(D / 0.9)));
      const rows = Math.max(1, Math.min(15, Math.round(H / 2.0)));

      // 4 faces: front(+Z), back(-Z), right(+X), left(-X)
      const faces = [
        { cols: colsW, offset: (c: number, r: number) => {
            const wx = pos.x - W / 2 + (c + 0.5) * (W / colsW);
            const wy = 1.2 + (r + 0.5) * ((H - 1.5) / rows);
            return { x: wx, y: wy, z: pos.z + D / 2 + 0.05 };
          }, ry: 0 },
        { cols: colsW, offset: (c: number, r: number) => {
            const wx = pos.x - W / 2 + (c + 0.5) * (W / colsW);
            const wy = 1.2 + (r + 0.5) * ((H - 1.5) / rows);
            return { x: wx, y: wy, z: pos.z - D / 2 - 0.05 };
          }, ry: Math.PI },
        { cols: colsD, offset: (c: number, r: number) => {
            const wz = pos.z - D / 2 + (c + 0.5) * (D / colsD);
            const wy = 1.2 + (r + 0.5) * ((H - 1.5) / rows);
            return { x: pos.x + W / 2 + 0.05, y: wy, z: wz };
          }, ry: Math.PI / 2 },
        { cols: colsD, offset: (c: number, r: number) => {
            const wz = pos.z - D / 2 + (c + 0.5) * (D / colsD);
            const wy = 1.2 + (r + 0.5) * ((H - 1.5) / rows);
            return { x: pos.x - W / 2 - 0.05, y: wy, z: wz };
          }, ry: -Math.PI / 2 },
      ];

      for (const face of faces) {
        for (let row = 0; row < rows && wins.length < MAX_WINDOWS; row++) {
          for (let c = 0; c < face.cols && wins.length < MAX_WINDOWS; c++) {
            const idx = row * face.cols + c;
            // Deterministic lit check
            if (((seed * (idx + 1) * 2654435761) >>> 0) % 100 >= litRatio * 100) continue;

            const p = face.offset(c, row);
            wins.push({
              x: p.x, y: p.y, z: p.z,
              ry: face.ry,
              r: cr, g: cg, b: cb,
              phase: (idx * 0.37 + (seed & 0xff) * 0.001) % (Math.PI * 2),
              speed: 0.4 + (((seed * idx) >>> 0) % 100) / 100 * 0.8,
            });
          }
        }
      }
    }

    return { windows: wins, count: wins.length };
  }, [buildings]);

  // Set matrices + initial colors; disable raycasting so clicks reach buildings
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    // Disable raycasting so clicks pass through to buildings
    mesh.raycast = () => {};

    const tempColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const w = windows[i];
      DUMMY.position.set(w.x, w.y, w.z);
      DUMMY.rotation.set(0, w.ry, 0);
      DUMMY.scale.set(0.18, 0.22, 1); // Small rectangular window squares
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);

      tempColor.setRGB(w.r, w.g, w.b);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = count;
  }, [windows, count]);

  // Animate: gentle pulse per window
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.instanceColor) return;
    timeRef.current += delta;
    const t = timeRef.current;

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const w = windows[i];
      const pulse = 0.85 + 0.15 * Math.sin(t * w.speed + w.phase);

      if (isNight) {
        // Night: bright language-colored glow
        tempColor.setRGB(w.r * pulse * 1.6, w.g * pulse * 1.6, w.b * pulse * 1.6);
      } else {
        // Day: subtle language tint
        tempColor.setRGB(w.r * pulse * 0.7, w.g * pulse * 0.7, w.b * pulse * 0.7);
      }

      // Rare bright spark
      if (Math.random() < 0.0003) {
        tempColor.setRGB(1.5, 1.4, 1.2);
      }

      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceColor.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.max(count, 1)]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        vertexColors
        transparent
        toneMapped={false}
        opacity={isNight ? 1.0 : 0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
