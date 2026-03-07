import * as THREE from 'three';

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript:  '#f5d020',
  TypeScript:  '#00b4d8',
  Python:      '#4cc9f0',
  Rust:        '#ff6b35',
  Go:          '#00f5d4',
  Ruby:        '#ff006e',
  Java:        '#ffbe0b',
  'C++':       '#ff48c4',
  'C#':        '#a855f7',
  Swift:       '#ff7c43',
  Kotlin:      '#c77dff',
  PHP:         '#8338ec',
  Shell:       '#06d6a0',
  HTML:        '#ef233c',
  CSS:         '#4361ee',
  Vue:         '#2dc653',
  Dart:        '#00b4d8',
  default:     '#9b72cf',
};

export function langColor(language: string): string {
  return LANGUAGE_COLORS[language] ?? LANGUAGE_COLORS.default;
}

const ACCENT_POOL = [
  '#ff006e', '#00f5d4', '#ff6b35', '#4cc9f0',
  '#a855f7', '#06d6a0', '#f5d020', '#ff48c4',
  '#00b4d8', '#ef233c', '#c77dff', '#ffbe0b',
  '#ff4444', '#44ff44', '#ffff44', '#ff88cc',
  '#ff1493', '#00ff88', '#ffa500', '#ff69b4',
  '#7fff00', '#00ced1', '#dc143c', '#9400d3',
];

const cache = new Map<string, THREE.CanvasTexture>();

export interface TextureOpts {
  langColor:      string;
  totalStars:     number;
  recentActivity: number;
  username:       string;
  isNight:        boolean;
}

export function generateTexture(opts: TextureOpts): THREE.CanvasTexture {
  const sb = Math.min(Math.floor(opts.totalStars / 500), 8);
  const ab = Math.floor(opts.recentActivity / 20);
  const key = `${opts.langColor}_${sb}_${ab}_${opts.isNight ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key)!;

  const S = 32;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0712';
  ctx.fillRect(0, 0, S, S);

  const seed = hashStr(opts.username);
  const rng = makeRng(seed);

  for (let i = 0; i < 60; i++) {
    const px = Math.floor(rng() * S);
    const py = Math.floor(rng() * S);
    const v  = Math.floor(rng() * 12);
    ctx.fillStyle = `rgba(255,255,255,${v / 120})`;
    ctx.fillRect(px, py, 1, 1);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  for (let y = 8; y < S; y += 8) ctx.fillRect(0, y, S, 1);

  const WIN = 6, GAP = 1, MARGIN = 2;
  const STEP = WIN + GAP;
  const COLS = Math.floor((S - MARGIN * 2) / STEP);
  const ROWS = Math.floor((S - MARGIN * 2) / STEP);
  const OX   = Math.floor((S - COLS * STEP - GAP) / 2);
  const OY   = Math.floor((S - ROWS * STEP - GAP) / 2);

  const baseLit = opts.isNight ? 0.94 : 0.85;
  const litRatio = Math.min(
    baseLit + (opts.recentActivity / 100) * 0.08 + (opts.totalStars / 3000) * 0.06,
    0.98
  );

  const [pR, pG, pB] = hexToRgb(opts.langColor);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const wx  = OX + col * STEP;
      const wy  = OY + row * STEP;
      const isLit = rng() < litRatio;

      if (!isLit) {
        // Even unlit windows get a faint color tint instead of pure dark
        const dimIdx = Math.floor(rng() * ACCENT_POOL.length);
        const [dR, dG, dB] = hexToRgb(ACCENT_POOL[dimIdx]);
        const dim = opts.isNight ? 0.25 : 0.12;
        ctx.fillStyle = `rgb(${Math.round(dR * dim)},${Math.round(dG * dim)},${Math.round(dB * dim)})`;
        ctx.fillRect(wx, wy, WIN, WIN);
        continue;
      }

      let wR: number, wG: number, wB: number;
      // 45% language-themed, 55% random accent — vivid mosaic look
      const langChance = opts.isNight ? 0.45 : 0.45;
      if (rng() < langChance) {
        [wR, wG, wB] = [pR, pG, pB];
      } else {
        const accentIdx = Math.floor(rng() * ACCENT_POOL.length);
        [wR, wG, wB] = hexToRgb(ACCENT_POOL[accentIdx]);
      }

      const boost = opts.isNight ? 1.6 : 1.3;
      wR = Math.min(Math.round(wR * boost), 255);
      wG = Math.min(Math.round(wG * boost), 255);
      wB = Math.min(Math.round(wB * boost), 255);

      ctx.fillStyle = `rgb(${wR},${wG},${wB})`;
      ctx.fillRect(wx, wy, WIN, WIN);

      ctx.fillStyle = `rgba(255,255,255,0.6)`;
      ctx.fillRect(wx + 2, wy + 2, 2, 2);

      ctx.fillStyle = `rgba(255,255,255,0.3)`;
      ctx.fillRect(wx, wy, WIN, 1);
      ctx.fillRect(wx, wy, 1, WIN);
    }
  }

  const grad = ctx.createLinearGradient(S * 0.55, 0, S, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS     = THREE.RepeatWrapping;
  tex.wrapT     = THREE.RepeatWrapping;
  tex.needsUpdate = true;

  cache.set(key, tex);
  return tex;
}

export function clearTextureCache(): void {
  cache.forEach(t => t.dispose());
  cache.clear();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return ((s >>> 0) / 0xffffffff);
  };
}
