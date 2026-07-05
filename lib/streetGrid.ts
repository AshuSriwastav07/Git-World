// lib/streetGrid.ts — Street-corridor math for Spider-Man traversal.
// Derived entirely from the reverse grid index (lib/cityIndex.ts), which is
// the same data used to place building instances — a single source of truth.
// All queries are O(1)-ish (a handful of Map lookups), never O(buildings).

import * as THREE from 'three';
import { SLOT_PITCH } from './cityLayout';
import { getBuildingsNear, type CellBuilding } from './cityIndex';

/** Margin kept between the character and building faces */
const WALL_MARGIN = 0.35;
/** How far below the LOWEST flanking rooftop the ceiling sits */
const ROOF_MARGIN = 0.75;
/** Ceiling in open plazas / parks (no flanking buildings) — low skyline cap */
const OPEN_AREA_CEILING = 14;
/** Radius used to find flanking buildings for ceiling/wall checks */
const FLANK_RADIUS = SLOT_PITCH * 1.4; // ~7 units: current cell + neighbors

export interface ClampResult {
  /** True if position was pushed out of a wall this frame */
  hitWall: boolean;
  /** True if position was clamped to the corridor ceiling */
  hitCeiling: boolean;
  /** True if position was clamped to the ground */
  hitGround: boolean;
  /** Corridor ceiling at this position (world Y) */
  ceiling: number;
}

const _near: CellBuilding[] = [];

/**
 * Hard-clamps `pos` (mutated in place) to the street corridor:
 * - pushed out of building AABBs in XZ,
 * - Y capped below the lowest flanking rooftop (or the open-area ceiling),
 * - Y floored at `groundY`.
 * `vel` (optional, mutated) has the offending component zeroed so physics
 * doesn't keep pushing into the constraint.
 */
export function clampToCorridor(
  pos: THREE.Vector3,
  vel: THREE.Vector3 | null,
  radius: number,
  groundY: number
): ClampResult {
  const res: ClampResult = { hitWall: false, hitCeiling: false, hitGround: false, ceiling: OPEN_AREA_CEILING };

  _near.length = 0;
  for (const b of getBuildingsNear(pos.x, pos.z, FLANK_RADIUS)) _near.push(b);

  // ── Ceiling: min flanking rooftop − margin; open plazas get a fixed low cap ──
  let ceiling = OPEN_AREA_CEILING;
  if (_near.length > 0) {
    let minRoof = Infinity;
    for (const b of _near) if (b.height < minRoof) minRoof = b.height;
    // Never let a degenerate tiny building (h≈2) crush the corridor below jump height
    ceiling = Math.max(minRoof - ROOF_MARGIN, 3.5);
  }
  res.ceiling = ceiling;

  // ── Wall push-out: axis of least penetration per building AABB ──
  for (const b of _near) {
    const hw = b.width / 2 + WALL_MARGIN + radius;
    const hd = b.depth / 2 + WALL_MARGIN + radius;
    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    if (Math.abs(dx) >= hw || Math.abs(dz) >= hd) continue; // outside XZ footprint
    if (pos.y > b.height + radius) continue;                // above this building — ceiling clamp handles it

    const penX = hw - Math.abs(dx);
    const penZ = hd - Math.abs(dz);
    if (penX < penZ) {
      pos.x = b.x + Math.sign(dx || 1) * hw;
      if (vel && Math.sign(vel.x) !== Math.sign(dx || 1)) vel.x *= -0.15; // soft bounce
    } else {
      pos.z = b.z + Math.sign(dz || 1) * hd;
      if (vel && Math.sign(vel.z) !== Math.sign(dz || 1)) vel.z *= -0.15;
    }
    res.hitWall = true;
  }

  // ── Ceiling clamp (structurally cannot fly over rooftops) ──
  if (pos.y > ceiling) {
    pos.y = ceiling;
    if (vel && vel.y > 0) vel.y = 0;
    res.hitCeiling = true;
  }

  // ── Ground clamp ──
  if (pos.y < groundY) {
    pos.y = groundY;
    if (vel && vel.y < 0) vel.y = 0;
    res.hitGround = true;
  }

  return res;
}

export interface WebAnchor {
  point: THREE.Vector3;
  building: CellBuilding;
}

const MAX_WEB_RANGE = 20;
const MIN_ANCHOR_HEIGHT = 5; // don't web to bungalows

/**
 * Finds the best web anchor: nearest sufficiently-tall building roughly in
 * the aim direction within web range. Scans only nearby grid cells (≤ ~50
 * Map lookups). Returns null when nothing suitable is in range.
 */
export function findAnchor(
  pos: THREE.Vector3,
  aimDir: THREE.Vector3 // normalized XZ heading
): WebAnchor | null {
  let best: CellBuilding | null = null;
  let bestScore = -Infinity;

  for (const b of getBuildingsNear(pos.x, pos.z, MAX_WEB_RANGE)) {
    if (b.height < MIN_ANCHOR_HEIGHT) continue;
    if (b.height <= pos.y + 2) continue; // anchor must be meaningfully above us
    const dx = b.x - pos.x;
    const dz = b.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1.5 || dist > MAX_WEB_RANGE) continue;
    const dot = (dx / dist) * aimDir.x + (dz / dist) * aimDir.z;
    if (dot < 0.25) continue; // outside aim cone
    // Prefer aligned + close + tall-enough anchors
    const score = dot * 2 - dist / MAX_WEB_RANGE + Math.min(b.height, 30) / 60;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }

  if (!best) return null;

  // Anchor at the top corner of the building face nearest the player
  const dx = pos.x - best.x;
  const dz = pos.z - best.z;
  const point = new THREE.Vector3(
    best.x + Math.sign(dx || 1) * (best.width / 2),
    best.height,
    best.z + Math.sign(dz || 1) * (best.depth / 2)
  );
  return { point, building: best };
}
