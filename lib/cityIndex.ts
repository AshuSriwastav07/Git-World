// lib/cityIndex.ts — Reverse grid index for the city.
// Built once per CityGrid instance rebuild; keyed by spiral grid cell
// ("gx,gz" where gx = round(x / SLOT_PITCH)). Gives O(1) lookups of
// "what building occupies this cell" — used for delta selection updates
// and Spider-Man corridor clamping.

import { SLOT_PITCH } from './cityLayout';

export interface CellBuilding {
  /** Instance index in the CityGrid InstancedMesh */
  instanceIndex: number;
  login: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

const _index = new Map<string, CellBuilding>();
let _maxHeight = 0;

export function cellKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

export function worldToCell(wx: number, wz: number): [number, number] {
  return [Math.round(wx / SLOT_PITCH), Math.round(wz / SLOT_PITCH)];
}

export function clearCityIndex() {
  _index.clear();
  _maxHeight = 0;
}

export function indexBuilding(b: CellBuilding) {
  const [gx, gz] = worldToCell(b.x, b.z);
  _index.set(cellKey(gx, gz), b);
  if (b.height > _maxHeight) _maxHeight = b.height;
}

/** Building occupying grid cell (gx,gz), if any */
export function getBuildingAtCell(gx: number, gz: number): CellBuilding | undefined {
  return _index.get(cellKey(gx, gz));
}

/** Building nearest a world position (checks that cell only) */
export function getBuildingAtWorld(wx: number, wz: number): CellBuilding | undefined {
  const [gx, gz] = worldToCell(wx, wz);
  return _index.get(cellKey(gx, gz));
}

/** All buildings within `radius` world units of (wx, wz). O(radius²/pitch²), small. */
export function getBuildingsNear(wx: number, wz: number, radius: number): CellBuilding[] {
  const cells = Math.ceil(radius / SLOT_PITCH);
  const [cgx, cgz] = worldToCell(wx, wz);
  const out: CellBuilding[] = [];
  for (let gx = cgx - cells; gx <= cgx + cells; gx++) {
    for (let gz = cgz - cells; gz <= cgz + cells; gz++) {
      const b = _index.get(cellKey(gx, gz));
      if (!b) continue;
      const dx = b.x - wx;
      const dz = b.z - wz;
      if (dx * dx + dz * dz <= radius * radius) out.push(b);
    }
  }
  return out;
}

/** Tallest building height in the city (for global altitude caps) */
export function getCityMaxHeight(): number {
  return _maxHeight;
}

export function getIndexSize(): number {
  return _index.size;
}
