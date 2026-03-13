// lib/cityLayout.ts — Dense spiral grid centered on (0,0)

export const SLOT_PITCH = 5;
export const BUILDING_SIZE = 3;
export const GAP = 2;
export const GRID_SIZE = 145;

export type BuildingTier = 1 | 2 | 3 | 4 | 5;

// Deterministic pseudo-random based on slot number
export function sr(seed: number): number {
  let h = (seed * 2654435761) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

// Slot → spiral grid (gx, gz) coordinates
function spiralCoords(slot: number): [number, number] {
  if (slot === 0) return [0, 0];
  let x = 0, z = 0, dx = 1, dz = 0, steps = 1, stepCount = 0, turns = 0;
  for (let i = 0; i < slot; i++) {
    x += dx; z += dz; stepCount++;
    if (stepCount === steps) {
      stepCount = 0; turns++;
      const tmp = dx; dx = -dz; dz = tmp;
      if (turns % 2 === 0) steps++;
    }
  }
  return [x, z];
}

// ── Park-aware slot mapping cache ──
// Builds a list of valid (non-park) world positions in spiral order so that
// every citySlot index maps to a position outside both Tech Park and SV Park.
const _validWorldPos: { x: number; z: number }[] = [];
let _validPosProbe = 0;

function ensureValidPositions(needed: number) {
  while (_validWorldPos.length < needed && _validPosProbe < 20000) {
    const [gx, gz] = spiralCoords(_validPosProbe);
    const wx = gx * SLOT_PITCH;
    const wz = gz * SLOT_PITCH;
    if (!isInsidePark(wx, wz) && !isOnConnectorRoad(wx, wz, 1.5)) {
      _validWorldPos.push({ x: wx, z: wz });
    }
    _validPosProbe++;
  }
}

// Slot → THREE.js world (x, z), skipping positions inside parks
export function slotToWorld(slot: number): { x: number; z: number } {
  if (slot < 0) return { x: 0, z: 0 };
  ensureValidPositions(slot + 1);
  return _validWorldPos[slot] ?? { x: 0, z: 0 };
}

// Building height, width, depth, tier
export function getBuildingDimensions(
  rank: number,
  slot: number,
  user: { estimatedCommits?: number; publicRepos?: number; totalStars?: number }
): { height: number; width: number; depth: number; tier: BuildingTier } {
  const r1 = sr(slot * 7 + 1);
  const r2 = sr(slot * 13 + 2);
  const r3 = sr(slot * 17 + 3);

  const commits = user.estimatedCommits ?? 100;
  const commitFactor = Math.log10(Math.max(commits, 10)) / Math.log10(50000);

  let height: number, width: number, depth: number, tier: BuildingTier;

  if (rank === 1) {
    tier = 1; height = 78; width = 2.4; depth = 2.4;
  } else if (rank <= 10) {
    tier = 2;
    height = Math.round(38 + r1 * 18 + commitFactor * 5);
    width  = 1.7 + r2 * 0.7;
    depth  = 1.6 + r3 * 0.7;
  } else if (rank <= 200) {
    tier = 3;
    height = Math.round(14 + r1 * 16 + commitFactor * 6);
    width  = 1.3 + r2 * 1.1;
    depth  = 1.2 + r3 * 1.1;
  } else if (rank <= 5000) {
    tier = 4;
    height = Math.round(4 + r1 * 9 + commitFactor * 3);
    width  = 0.9 + r2 * 1.3;
    depth  = 0.8 + r3 * 1.3;
  } else {
    tier = 5;
    height = Math.round(2 + r1 * 3);
    width  = 0.7 + r2 * 0.9;
    depth  = 0.6 + r3 * 0.9;
  }

  return {
    height,
    width: Math.min(width, 2.5),
    depth: Math.min(depth, 2.5),
    tier,
  };
}

// Ground plane size — slightly larger for growing city
export function getGroundSize(userCount: number): number {
  const radius = Math.ceil(Math.sqrt(userCount)) * SLOT_PITCH * 0.6;
  const dynamic = radius * 2.2 + Math.sqrt(userCount) * 2.0;
  return Math.max(dynamic, 200);
}

// Score calculation
export function calculateScore(dev: {
  estimatedCommits: number;
  totalStars: number;
  followers: number;
  publicRepos: number;
  recentActivity: number;
}): number {
  return (
    (dev.estimatedCommits * 3) +
    (dev.totalStars * 2) +
    (dev.followers * 1) +
    (dev.publicRepos * 0.5) +
    (dev.recentActivity * 10)
  );
}

// Building tier from rank
export function getTier(rank: number): BuildingTier {
  if (rank === 1) return 1;
  if (rank <= 10) return 2;
  if (rank <= 200) return 3;
  if (rank <= 5000) return 4;
  return 5;
}

// Tech park world center — middle hub (between Silicon Valley and Trending)
export function getTechParkWorldCenter(): { x: number; z: number } {
  return { x: 0, z: 0 };
}

// Connector-road geometry (base-only roads between parks, never inside parks)
export const CONNECTOR_ROAD_HALF_WIDTH = 5;

// Park occupies a 50×50 region; check if a world position falls inside
const PARK_HALF = 25;

// Silicon Valley Park — top district in the stacked city layout
export const SV_CENTER = { x: 0, z: -165 };
export const SV_RADIUS = 80; // kept for backward compat
export const SV_HALF = 110;   // half-extent of 220×220 rectangular park (8 company campuses)

// Trending Repositories District — bottom district in the stacked city layout
export const TRENDING_CENTER = { x: 0, z: 165 };
export const TRENDING_HALF = 50; // 100×100 zone

export function isOnConnectorRoad(wx: number, wz: number, margin = 0): boolean {
  const half = CONNECTOR_ROAD_HALF_WIDTH + margin;
  const onSpine = Math.abs(wx) <= half && (
    (wz >= -54 && wz <= -25) || // between Silicon Valley and Tech Park
    (wz >= 25 && wz <= 114)     // between Tech Park and Trending District
  );

  // Short gate connectors at park edges
  const onTopGate = Math.abs(wz + 54) <= (1 + margin) && wx >= -18 - margin && wx <= 18 + margin;
  const onBottomGate = Math.abs(wz - 114) <= (1 + margin) && wx >= -18 - margin && wx <= 18 + margin;

  return onSpine || onTopGate || onBottomGate;
}

export function isInsidePark(wx: number, wz: number): boolean {
  const pc = getTechParkWorldCenter();
  const inTechPark =
    wx >= pc.x - PARK_HALF && wx <= pc.x + PARK_HALF &&
    wz >= pc.z - PARK_HALF && wz <= pc.z + PARK_HALF;
  // Rectangle check for SV park (200×200)
  const inSVPark =
    wx >= SV_CENTER.x - SV_HALF - 2 && wx <= SV_CENTER.x + SV_HALF + 2 &&
    wz >= SV_CENTER.z - SV_HALF - 2 && wz <= SV_CENTER.z + SV_HALF + 2;
  // Rectangle check for Trending District
  const inTrending =
    wx >= TRENDING_CENTER.x - TRENDING_HALF && wx <= TRENDING_CENTER.x + TRENDING_HALF &&
    wz >= TRENDING_CENTER.z - TRENDING_HALF && wz <= TRENDING_CENTER.z + TRENDING_HALF;
  return inTechPark || inSVPark || inTrending;
}
