// lib/cityLayout.ts — Dense spiral grid centered on (0,0)

import type { CityDeveloper, BuildingData, BuildingTier } from '@/types';
import { getLanguageColor, GRID_SIZE } from '@/types';

export const SLOT_PITCH = 5;    // world units per slot: 3 building + 2 gap
export const BUILDING_SIZE = 3;  // max building footprint in world units
export const GAP = 2;            // gap between buildings in world units

// Deterministic pseudo-random based on slot number
function seededRandom(seed: number): number {
  let h = (seed * 2654435761) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

/**
 * Convert flat slot index to spiral grid (gx, gz) coordinates.
 * Slot 0 = (0, 0). Spiral grows outward.
 */
export function slotToGridCoords(slot: number): [number, number] {
  if (slot === 0) return [0, 0];

  let x = 0, z = 0, dx = 0, dz = -1;
  for (let i = 1; i <= slot; i++) {
    if (x === z || (x < 0 && x === -z) || (x > 0 && x === 1 - z)) {
      const temp = dx;
      dx = -dz;
      dz = temp;
    }
    x += dx;
    z += dz;
  }
  return [x, z];
}

/**
 * Convert flat slot index to THREE.js world position.
 * Slot 0 = (0,0). Adjacent slots are SLOT_PITCH apart.
 */
export function slotToWorld(slot: number): { x: number; z: number } {
  const [gx, gz] = slotToGridCoords(slot);
  return {
    x: gx * SLOT_PITCH,
    z: gz * SLOT_PITCH,
  };
}

/**
 * Building dimensions — height and footprint size (in world units).
 * Width/depth are ALWAYS ≤ BUILDING_SIZE so buildings never overlap.
 */
export function getBuildingDimensions(
  rank: number,
  slot: number,
  user: { estimatedCommits: number; publicRepos: number; totalStars: number }
): { height: number; width: number; depth: number; tier: BuildingTier } {
  const r1 = seededRandom(slot * 7 + 1);
  const r2 = seededRandom(slot * 13 + 2);
  const r3 = seededRandom(slot * 17 + 3);

  const commitHeight = Math.log10(Math.max(user.estimatedCommits, 10)) * 4;

  let height: number, width: number, depth: number, tier: BuildingTier;

  if (rank === 1) {
    tier = 1;
    height = 70 + Math.round(r1 * 10);
    width = 2.5; depth = 2.5;
  } else if (rank <= 10) {
    tier = 2;
    height = Math.round(35 + r1 * 20 + commitHeight * 0.3);
    width = 1.8 + r2 * 1.0;
    depth = 1.8 + r3 * 1.0;
  } else if (rank <= 200) {
    tier = 3;
    height = Math.round(15 + r1 * 18 + commitHeight * 0.2);
    width = 1.2 + r2 * 1.5;
    depth = 1.2 + r3 * 1.5;
  } else if (rank <= 5000) {
    tier = 4;
    height = Math.round(4 + r1 * 8 + commitHeight * 0.15);
    height = Math.min(height, 14);
    width = 0.8 + r2 * 1.8;
    depth = 0.8 + r3 * 1.8;
  } else {
    tier = 5;
    height = Math.round(2 + r1 * 3);
    width = 0.6 + r2 * 1.4;
    depth = 0.6 + r3 * 1.4;
  }

  // Cap width/depth so buildings never overlap their slot
  const maxDim = BUILDING_SIZE - 0.3; // 2.7 max
  return {
    height,
    width: Math.min(width, maxDim),
    depth: Math.min(depth, maxDim),
    tier,
  };
}

/** Tech Park position — fixed offset from city center */
export function getTechParkWorldCenter(): { x: number; z: number } {
  return { x: 70, z: -70 };
}

export function isInTechPark(worldX: number, worldZ: number): boolean {
  const park = getTechParkWorldCenter();
  return Math.abs(worldX - park.x) < 25 && Math.abs(worldZ - park.z) < 25;
}

// ---- Score Calculation ----
export function calculateScore(dev: Omit<CityDeveloper, 'citySlot' | 'cityRank' | 'totalScore' | 'firstAddedAt' | 'lastUpdatedAt' | 'addedBy'>): number {
  return (
    (dev.estimatedCommits * 3) +
    (dev.totalStars * 2) +
    (dev.followers * 1) +
    (dev.publicRepos * 0.5) +
    (dev.recentActivity * 10)
  );
}

// ---- Building Tier ----
export function getTier(rank: number): BuildingTier {
  if (rank === 1) return 1;
  if (rank <= 10) return 2;
  if (rank <= 200) return 3;
  if (rank <= 5000) return 4;
  return 5;
}

// ---- Build BuildingData (for store compat) ----
export function buildBuildingData(dev: CityDeveloper, totalUsers: number): BuildingData {
  const pos = slotToWorld(dev.citySlot);
  const [gx, gz] = slotToGridCoords(dev.citySlot);
  const dims = getBuildingDimensions(dev.cityRank, dev.citySlot, dev);
  const color = getLanguageColor(dev.topLanguage);
  return {
    developer: dev,
    tier: dims.tier,
    height: dims.height,
    footprint: dims.width,
    gridX: gx,
    gridZ: gz,
    worldX: pos.x,
    worldZ: pos.z,
    color,
  };
}

// ---- Height bucket for InstancedMesh grouping ----
export function heightBucket(height: number): number {
  return Math.round(height / 2) * 2;
}
