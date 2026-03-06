// CityGrid — InstancedMesh renderer: one draw call per height bucket
'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { useCityStore } from '@/lib/cityStore';
import { slotToWorld, getBuildingDimensions } from '@/lib/cityLayout';
import { getLanguageColor } from '@/types';
import type { CityDeveloper, BuildingTier } from '@/types';
import WindowSparkleLayer from './WindowSparkleLayer';
import type { BuildingInfo } from './WindowSparkleLayer';
import BuildingSpotlight from './BuildingSpotlight';
import FireworkSystem from './FireworkSystem';

// ---- Height buckets for InstancedMesh grouping ----
const HEIGHT_BUCKETS = [2, 3, 4, 5, 7, 9, 12, 16, 20, 25, 30, 40, 55, 70, 80];
const MAX_PER_BUCKET = 2000;

function getNearestBucket(h: number): number {
  let best = HEIGHT_BUCKETS[0];
  let bestDist = Math.abs(h - best);
  for (let i = 1; i < HEIGHT_BUCKETS.length; i++) {
    const d = Math.abs(h - HEIGHT_BUCKETS[i]);
    if (d < bestDist) { best = HEIGHT_BUCKETS[i]; bestDist = d; }
  }
  return best;
}

interface BuildingEntry {
  user: CityDeveloper;
  rank: number;
  slot: number;
  pos: { x: number; z: number };
  dims: { height: number; width: number; depth: number; tier: BuildingTier };
  color: string;
  bucket: number;
}

const DUMMY = new THREE.Object3D();
const tempColor = new THREE.Color();

export function CityGrid() {
  const users = useCityStore(s => s.users);
  const sortedLogins = useCityStore(s => s.sortedLogins);
  const selectedUser = useCityStore(s => s.selectedUser);
  const selectUser = useCityStore(s => s.selectUser);
  const isNightMode = useCityStore(s => s.isNightMode);
  const { invalidate } = useThree();

  const meshRefs = useRef(new Map<number, THREE.InstancedMesh>());

  // Build all building entries
  const allBuildings = useMemo(() => {
    const result: BuildingEntry[] = [];
    sortedLogins.forEach((login, index) => {
      const user = users.get(login);
      if (!user) return;
      const slot = user.citySlot ?? index;
      const pos = slotToWorld(slot);
      const rank = index + 1;
      const dims = getBuildingDimensions(rank, slot, user);
      const color = getLanguageColor(user.topLanguage);
      const bucket = getNearestBucket(dims.height);
      result.push({ user, rank, slot, pos, dims, color, bucket });
    });
    return result;
  }, [users, sortedLogins]);

  // Group by bucket
  const byBucket = useMemo(() => {
    const map = new Map<number, BuildingEntry[]>();
    for (const b of allBuildings) {
      const arr = map.get(b.bucket) ?? [];
      arr.push(b);
      map.set(b.bucket, arr);
    }
    return map;
  }, [allBuildings]);

  // WindowSparkleLayer data
  const windowBuildings: BuildingInfo[] = useMemo(() =>
    allBuildings.map(b => ({
      pos: b.pos,
      dims: b.dims,
      color: b.color,
      user: { login: b.user.login, recentActivity: b.user.recentActivity },
    })),
    [allBuildings],
  );

  // Update instance matrices + colors when buildings or selection change
  useEffect(() => {
    const hasSelection = !!selectedUser;

    for (const [bucket, buildings] of byBucket.entries()) {
      const mesh = meshRefs.current.get(bucket);
      if (!mesh) continue;

      const count = Math.min(buildings.length, MAX_PER_BUCKET);
      mesh.count = count;

      for (let i = 0; i < count; i++) {
        const b = buildings[i];
        // Position: center Y at bucket/2, scale X/Z to footprint
        DUMMY.position.set(b.pos.x, bucket / 2, b.pos.z);
        DUMMY.scale.set(b.dims.width, 1, b.dims.depth);
        DUMMY.rotation.set(0, 0, 0);
        DUMMY.updateMatrix();
        mesh.setMatrixAt(i, DUMMY.matrix);

        // DARK body — buildings are NOT colored, WINDOWS are colored
        tempColor.set(b.color);
        const lr = tempColor.r, lg = tempColor.g, lb = tempColor.b;
        tempColor.setRGB(lr * 0.15 + 0.06, lg * 0.15 + 0.06, lb * 0.15 + 0.06);
        if (hasSelection) {
          if (selectedUser.login !== b.user.login) {
            tempColor.multiplyScalar(0.4);
          } else {
            tempColor.multiplyScalar(2.5);
          }
        }
        mesh.setColorAt(i, tempColor);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // Force shader recompile so instanceColor is included
      (mesh.material as THREE.Material).needsUpdate = true;
    }
    invalidate();
  }, [byBucket, selectedUser, invalidate]);

  // Click handler — find which bucket + instance was clicked
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.InstancedMesh;
    const instanceId = e.instanceId;
    if (instanceId === undefined) { selectUser(null); return; }

    const bucket = [...meshRefs.current.entries()]
      .find(([, m]) => m === mesh)?.[0];
    if (bucket === undefined) return;

    const buildings = byBucket.get(bucket) ?? [];
    const building = buildings[instanceId];
    if (building) selectUser(building.user);
  };

  return (
    <group>
      {/* Ground plane — dark navy base */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial color="#0a0a1a" />
      </mesh>

      {/* Neon grid overlay */}
      <Grid
        position={[0, 0.01, 0]}
        infiniteGrid
        cellSize={5}
        cellColor={isNightMode ? '#1a1a5a' : '#8888bb'}
        sectionSize={25}
        sectionColor={isNightMode ? '#4444cc' : '#9999dd'}
        fadeDistance={600}
        fadeStrength={1}
        cellThickness={0.6}
        sectionThickness={1.5}
      />

      {/* One InstancedMesh per height bucket */}
      {HEIGHT_BUCKETS.map(bucket => {
        const count = (byBucket.get(bucket) ?? []).length;
        if (count === 0) return null;
        return (
          <instancedMesh
            key={bucket}
            ref={el => {
              if (el) {
                meshRefs.current.set(bucket, el);
                // Pre-init instanceColor so shader compiles with instance color support
                if (!el.instanceColor) {
                  const c = new Float32Array(MAX_PER_BUCKET * 3);
                  for (let j = 0; j < c.length; j++) c[j] = 0.1;
                  el.instanceColor = new THREE.InstancedBufferAttribute(c, 3);
                }
              }
            }}
            args={[undefined, undefined, MAX_PER_BUCKET]}
            frustumCulled={false}
            onClick={handleClick}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            <boxGeometry args={[1, bucket, 1]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </instancedMesh>
        );
      })}

      {/* Glowing window quads on building faces */}
      <WindowSparkleLayer buildings={windowBuildings} isNight={isNightMode} />

      {/* Selection spotlight beam + ring */}
      {selectedUser && <BuildingSpotlight user={selectedUser} />}

      {/* Firework particle bursts in the sky */}
      <FireworkSystem />
    </group>
  );
}
