// Building geometry spec system — defines multi-part building shapes
// Used for future InstancedMesh decoration rendering.
// Each building emits multiple "mesh spec" boxes that compose its visual shape.
'use client';

import type { BuildingTier } from '@/types';

export interface BuildingMeshSpec {
  type: 'body' | 'setback' | 'crown' | 'ledStrip' | 'beacon' | 'antenna' | 'parapet';
  /** Offset from building base center */
  offsetY: number;
  /** Scale relative to building footprint (x,z) and absolute height (y) */
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  /** Color multiplier (1 = language color, <1 = darker, >1 = brighter) */
  colorMultiplier: number;
  /** Whether this part should have emissive glow */
  emissive: boolean;
}

/**
 * Returns an array of mesh specs for a building of given tier, height, and footprint.
 * The first spec is always the main body. Additional specs are decorations.
 */
export function getBuildingMeshSpecs(
  tier: BuildingTier,
  height: number,
  footprint: number,
): BuildingMeshSpec[] {
  const specs: BuildingMeshSpec[] = [];
  const fp = footprint;

  // Main body (always present)
  const bodyH = tier === 1 ? height - 15 : height;
  specs.push({
    type: 'body',
    offsetY: bodyH / 2,
    scaleX: fp, scaleY: bodyH, scaleZ: fp,
    colorMultiplier: 1.0,
    emissive: false,
  });

  if (tier === 1) {
    // Tapered crown — 3 setback levels
    const crownSizes = [fp * 0.8, fp * 0.6, fp * 0.35];
    const crownHeights = [6, 5, 4];
    let base = height - 15;
    for (let i = 0; i < 3; i++) {
      specs.push({
        type: 'setback',
        offsetY: base + crownHeights[i] / 2,
        scaleX: crownSizes[i], scaleY: crownHeights[i], scaleZ: crownSizes[i],
        colorMultiplier: 0.9 - i * 0.1,
        emissive: false,
      });
      base += crownHeights[i];
    }

    // Beacon at peak
    specs.push({
      type: 'beacon',
      offsetY: height + 0.6,
      scaleX: 1.2, scaleY: 1.2, scaleZ: 1.2,
      colorMultiplier: 2.0,
      emissive: true,
    });

    // Antenna
    specs.push({
      type: 'antenna',
      offsetY: height + 1.2 + 4,
      scaleX: 0.2, scaleY: 8, scaleZ: 0.2,
      colorMultiplier: 0.4,
      emissive: false,
    });

    // LED strips at 4 corners
    const half = fp / 2;
    for (const [px, pz] of [[half, half], [-half, half], [half, -half], [-half, -half]]) {
      specs.push({
        type: 'ledStrip',
        offsetY: height / 2,
        scaleX: 0.3, scaleY: height, scaleZ: 0.3,
        colorMultiplier: 1.5,
        emissive: true,
      });
    }
  } else if (tier === 2) {
    // Floor band at 60%
    specs.push({
      type: 'parapet',
      offsetY: height * 0.6,
      scaleX: fp + 0.4, scaleY: 0.6, scaleZ: fp + 0.4,
      colorMultiplier: 0.3,
      emissive: false,
    });

    // LED corner strips (shorter)
    const half = fp / 2;
    for (const [px, pz] of [[half, half], [-half, half], [half, -half], [-half, -half]]) {
      specs.push({
        type: 'ledStrip',
        offsetY: (height * 0.7) / 2,
        scaleX: 0.3, scaleY: height * 0.7, scaleZ: 0.3,
        colorMultiplier: 1.3,
        emissive: true,
      });
    }

    // Penthouse
    specs.push({
      type: 'crown',
      offsetY: height + 1,
      scaleX: 2, scaleY: 2, scaleZ: 2,
      colorMultiplier: 0.5,
      emissive: false,
    });
  } else if (tier === 3) {
    // Parapet
    specs.push({
      type: 'parapet',
      offsetY: height + 0.25,
      scaleX: fp + 0.3, scaleY: 0.5, scaleZ: fp + 0.3,
      colorMultiplier: 0.35,
      emissive: false,
    });
  }
  // Tier 4 and 5 are just the main body — no decorations

  return specs;
}
