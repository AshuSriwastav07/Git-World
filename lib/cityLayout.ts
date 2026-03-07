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

// Slot → THREE.js world (x, z)
export function slotToWorld(slot: number): { x: number; z: number } {
  const [gx, gz] = spiralCoords(slot);
  return { x: gx * SLOT_PITCH, z: gz * SLOT_PITCH };
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

// Ground plane size — tight for dense city feel
export function getGroundSize(userCount: number): number {
  const radius = Math.ceil(Math.sqrt(userCount)) * SLOT_PITCH * 0.6;
  // Tighter multiplier: city fills the ground, minimal border
  const dynamic = radius * 2.0 + Math.sqrt(userCount) * 1.8;
  // Cover the park area at (-55, 55) but keep tight
  return Math.max(dynamic, 160);
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

// Tech park world center — positioned adjacent to the spiral city
export function getTechParkWorldCenter(): { x: number; z: number } {
  return { x: -50, z: 50 };
}

// Park occupies a 50×50 region; check if a world position falls inside
const PARK_HALF = 25;
export function isInsidePark(wx: number, wz: number): boolean {
  const pc = getTechParkWorldCenter();
  return (
    wx >= pc.x - PARK_HALF && wx <= pc.x + PARK_HALF &&
    wz >= pc.z - PARK_HALF && wz <= pc.z + PARK_HALF
  );
}
