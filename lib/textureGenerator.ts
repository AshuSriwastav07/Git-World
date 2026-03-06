// textureGenerator — canvas-based 64×64 building face textures
// Dark body + neon window grids, cached per key, NearestFilter

import * as THREE from 'three';
import { getLanguageColor } from '@/types';

const TEX_SIZE = 64;
const cache = new Map<string, THREE.CanvasTexture>();

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [74, 144, 217];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function lcg(seed: number) {
  let s = seed;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0xffffffff; };
}

interface TexOpts {
  language: string;
  login: string;
  stars: number;
  activity: number;
  faceIndex: number; // 0-3 for 4 sides
}

export function generateBuildingTexture(opts: TexOpts): THREE.CanvasTexture {
  const key = `${opts.login}_${opts.faceIndex}_${opts.language}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  const langColor = getLanguageColor(opts.language);
  const [r, g, b] = hexToRgb(langColor);

  // Base face with 50% language tint — visible under any lighting
  const baseR = Math.round(r * 0.5 + 20);
  const baseG = Math.round(g * 0.5 + 20);
  const baseB = Math.round(b * 0.5 + 20);
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Pixel noise (deterministic per face)
  const rng = lcg(hashStr(key));
  const imgData = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (rng() - 0.5) * 8;
    imgData.data[i] = clamp(Math.round(imgData.data[i] + n), 0, 255);
    imgData.data[i + 1] = clamp(Math.round(imgData.data[i + 1] + n), 0, 255);
    imgData.data[i + 2] = clamp(Math.round(imgData.data[i + 2] + n), 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);

  // Floor lines every 8px
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let y = 8; y < TEX_SIZE; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TEX_SIZE, y);
    ctx.stroke();
  }

  // Neon window grid
  const winW = 3, winH = 4, gapX = 3, gapY = 4;
  const startX = 4, startY = 4;
  const litRatio = Math.min(0.3 + (opts.stars / 500) * 0.3 + (opts.activity / 100) * 0.2, 0.85);

  for (let wy = startY; wy + winH < TEX_SIZE - 2; wy += winH + gapY) {
    for (let wx = startX; wx + winW < TEX_SIZE - 2; wx += winW + gapX) {
      if (rng() < litRatio) {
        // Glow aura
        const glowR = Math.min(255, r + 60);
        const glowG = Math.min(255, g + 60);
        const glowB = Math.min(255, b + 60);
        ctx.fillStyle = `rgba(${glowR},${glowG},${glowB},0.15)`;
        ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
        // Window core
        const bright = 0.6 + rng() * 0.4;
        ctx.fillStyle = `rgba(${clamp(Math.round(r * bright + 100), 0, 255)},${clamp(Math.round(g * bright + 100), 0, 255)},${clamp(Math.round(b * bright + 100), 0, 255)},0.9)`;
        ctx.fillRect(wx, wy, winW, winH);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

export function clearTextureCache(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
