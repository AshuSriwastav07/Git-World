// MiniMap — 180×180 canvas overhead view of the city
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { SLOT_PITCH } from '@/lib/cityLayout';
import { GRID_SIZE } from '@/types';

const MAP_SIZE = 180;
// World extent: spiral can reach ±(GRID_SIZE/2 * SLOT_PITCH)
const HALF_EXTENT = Math.ceil(Math.sqrt(GRID_SIZE / Math.PI)) * SLOT_PITCH + 20;

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buildings = useCityStore((s) => s.buildings);
  const setFlyToTarget = useCityStore((s) => s.setFlyToTarget);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    const scale = MAP_SIZE / (HALF_EXTENT * 2);

    for (const b of buildings) {
      // worldX/worldZ are centered on (0,0), map to canvas
      const cx = (b.worldX + HALF_EXTENT) * scale;
      const cz = (b.worldZ + HALF_EXTENT) * scale;
      ctx.fillStyle = b.color;
      const dotSize = Math.max(1, Math.min(b.tier <= 2 ? 3 : b.tier <= 3 ? 2 : 1, 3));
      ctx.fillRect(cx - dotSize / 2, cz - dotSize / 2, dotSize, dotSize);
    }

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
  }, [buildings]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const scale = MAP_SIZE / (HALF_EXTENT * 2);
      const worldX = x / scale - HALF_EXTENT;
      const worldZ = y / scale - HALF_EXTENT;

      setFlyToTarget({ x: worldX, y: 0, z: worldZ });
    },
    [setFlyToTarget]
  );

  return (
    <canvas
      ref={canvasRef}
      width={MAP_SIZE}
      height={MAP_SIZE}
      onClick={handleClick}
      className="cursor-crosshair"
      style={{
        width: MAP_SIZE,
        height: MAP_SIZE,
        imageRendering: 'pixelated',
      }}
    />
  );
}
