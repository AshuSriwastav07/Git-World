// Window Texture Atlas — centralized window texture generation
// Single-tile textures for current InstancedMesh, multi-tile atlas for Fix 3 custom shader.
import * as THREE from 'three';

const TILE = 32;
const VARIANTS = 4;

let _dayTex: THREE.CanvasTexture | null = null;
let _nightTex: THREE.CanvasTexture | null = null;
let _dayAtlas: THREE.CanvasTexture | null = null;
let _nightAtlas: THREE.CanvasTexture | null = null;

function makeRng(seed: number) {
  let s = seed;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}

function paintTile(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  night: boolean, seed: number,
) {
  const rng = makeRng(seed);
  ctx.fillStyle = '#000000';
  ctx.fillRect(ox, oy, TILE, TILE);

  const WIN = 6, GAP = 1, MARGIN = 2, STEP = WIN + GAP;
  const COLS = Math.floor((TILE - MARGIN * 2) / STEP);
  const ROWS = Math.floor((TILE - MARGIN * 2) / STEP);
  const WOX = Math.floor((TILE - COLS * STEP - GAP) / 2);
  const WOY = Math.floor((TILE - ROWS * STEP - GAP) / 2);
  const litRatio = night ? 0.92 : 0.82;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const wx = ox + WOX + col * STEP;
      const wy = oy + WOY + row * STEP;
      if (rng() < litRatio) {
        const b = Math.round((night ? 0.85 + rng() * 0.15 : 0.55 + rng() * 0.45) * 255);
        ctx.fillStyle = `rgb(${b},${b},${b})`;
        ctx.fillRect(wx, wy, WIN, WIN);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(wx + 2, wy + 2, 2, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(wx, wy, WIN, 1);
        ctx.fillRect(wx, wy, 1, WIN);
      } else {
        const d = Math.round((night ? 0.15 : 0.06) * 255);
        ctx.fillStyle = `rgb(${d},${d},${d})`;
        ctx.fillRect(wx, wy, WIN, WIN);
      }
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 8; y < TILE; y += 8) ctx.fillRect(ox, oy + y, TILE, 1);

  const grad = ctx.createLinearGradient(ox + TILE * 0.55, oy, ox + TILE, oy);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(ox, oy, TILE, TILE);
}

function buildTex(night: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TILE; canvas.height = TILE;
  const ctx = canvas.getContext('2d')!;
  paintTile(ctx, 0, 0, night, 42069);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.needsUpdate = true;
  return tex;
}

function buildAtlas(night: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TILE * VARIANTS; canvas.height = TILE;
  const ctx = canvas.getContext('2d')!;
  for (let v = 0; v < VARIANTS; v++) paintTile(ctx, v * TILE, 0, night, 42069 + v * 7919);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.needsUpdate = true;
  return tex;
}

/** Single 32x32 window texture — drop-in for CityGrid's createWindowTexture */
export function getWindowTexture(night: boolean): THREE.CanvasTexture {
  if (night) { if (!_nightTex) _nightTex = buildTex(true); return _nightTex; }
  if (!_dayTex) _dayTex = buildTex(false);
  return _dayTex;
}

/** 128x32 atlas with 4 window pattern variants — for Fix 3 custom shader */
export function getWindowAtlas(night: boolean): THREE.CanvasTexture {
  if (night) { if (!_nightAtlas) _nightAtlas = buildAtlas(true); return _nightAtlas; }
  if (!_dayAtlas) _dayAtlas = buildAtlas(false);
  return _dayAtlas;
}

export const ATLAS_VARIANTS = VARIANTS;
export const ATLAS_TILE_SIZE = TILE;

export function disposeWindowAtlas(): void {
  [_dayTex, _nightTex, _dayAtlas, _nightAtlas].forEach(t => t?.dispose());
  _dayTex = _nightTex = _dayAtlas = _nightAtlas = null;
}
