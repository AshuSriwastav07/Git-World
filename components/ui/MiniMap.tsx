// MiniMap — 180×180 canvas overhead view of the city
'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { slotToWorld, getTier, getGroundSize, getTechParkWorldCenter, SV_CENTER, SV_HALF } from '@/lib/cityLayout';
import { langColor } from '@/lib/textureGenerator';

const MAP_SIZE = 180;

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const users = useCityStore((s) => s.users);
  const sortedLogins = useCityStore((s) => s.sortedLogins);
  const setFlyTarget = useCityStore((s) => s.setFlyTarget);

  const dots = useMemo(() => {
    return Array.from(users.values()).map((u) => {
      const pos = slotToWorld(u.citySlot);
      return { x: pos.x, z: pos.z, tier: getTier(u.cityRank), color: langColor(u.topLanguage) };
    });
  }, [users]);

  // Compute dynamic extent based on actual city size
  const halfExtent = useMemo(() => {
    const gs = getGroundSize(sortedLogins.length);
    return Math.max(gs / 2 + 10, 120);
  }, [sortedLogins.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    const scale = MAP_SIZE / (halfExtent * 2);

    // Draw green ground area
    const groundSize = getGroundSize(sortedLogins.length);
    const gPx = groundSize * scale;
    const gOff = (MAP_SIZE - gPx) / 2;
    ctx.fillStyle = '#1a3a12';
    ctx.fillRect(gOff, gOff, gPx, gPx);

    // Draw park area
    const park = getTechParkWorldCenter();
    const parkPx = 50 * scale;
    const parkX = (park.x + halfExtent) * scale - parkPx / 2;
    const parkZ = (park.z + halfExtent) * scale - parkPx / 2;
    ctx.fillStyle = '#2d6a1e';
    ctx.fillRect(parkX, parkZ, parkPx, parkPx);

    // Draw SV park rectangle
    const svX = (SV_CENTER.x - SV_HALF + halfExtent) * scale;
    const svZ = (SV_CENTER.z - SV_HALF + halfExtent) * scale;
    const svW = SV_HALF * 2 * scale;
    const svH = SV_HALF * 2 * scale;
    ctx.fillStyle = '#1e5a2d';
    ctx.fillRect(svX, svZ, svW, svH);
    ctx.strokeStyle = '#76b900';
    ctx.lineWidth = 1;
    ctx.strokeRect(svX, svZ, svW, svH);

    // ── SV park internal layout ──
    // Company zones at north (world z = SV_CENTER.z - 55)
    const companyZones = [
      { wx: SV_CENTER.x - 69, wz: SV_CENTER.z - 55, color: '#c0c0c0' }, // Apple
      { wx: SV_CENTER.x - 23, wz: SV_CENTER.z - 55, color: '#4285f4' }, // Google
      { wx: SV_CENTER.x + 23, wz: SV_CENTER.z - 55, color: '#76b900' }, // NVIDIA
      { wx: SV_CENTER.x + 69, wz: SV_CENTER.z - 55, color: '#0082fb' }, // Meta
    ];
    const czW = 36 * scale;
    const czH = 28 * scale;
    ctx.globalAlpha = 0.35;
    for (const cz of companyZones) {
      const cx = (cz.wx + halfExtent) * scale;
      const cy = (cz.wz + halfExtent) * scale;
      ctx.fillStyle = cz.color;
      ctx.fillRect(cx - czW / 2, cy - czH / 2, czW, czH);
    }
    ctx.globalAlpha = 1;

    // Language zones in 2×4 grid (south half)
    const langStartX = SV_CENTER.x - 69;
    const langStepX = 46;
    const langStartZ = SV_CENTER.z - 5;
    const langStepZ = 47;
    const lzW = 20 * scale;
    const lzH = 20 * scale;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#5599cc';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const lx = (langStartX + col * langStepX + halfExtent) * scale;
        const lz = (langStartZ + row * langStepZ + halfExtent) * scale;
        ctx.fillRect(lx - lzW / 2, lz - lzH / 2, lzW, lzH);
      }
    }
    ctx.globalAlpha = 1;

    // Roads
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    // Boulevard at SV_CENTER.z - 28
    const blvdZ = (SV_CENTER.z - 28 + halfExtent) * scale;
    ctx.beginPath();
    ctx.moveTo(svX, blvdZ);
    ctx.lineTo(svX + svW, blvdZ);
    ctx.stroke();
    // Central road at SV_CENTER.z + 17
    const crdZ = (SV_CENTER.z + 17 + halfExtent) * scale;
    ctx.beginPath();
    ctx.moveTo(svX, crdZ);
    ctx.lineTo(svX + svW, crdZ);
    ctx.stroke();

    // Burj Khalifa tower marker
    const towerX = (SV_CENTER.x + halfExtent) * scale;
    const towerZ = (SV_CENTER.z + 17 + halfExtent) * scale;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(towerX, towerZ, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw buildings as colored dots
    for (const b of dots) {
      const cx = (b.x + halfExtent) * scale;
      const cz = (b.z + halfExtent) * scale;
      ctx.fillStyle = b.color;
      const dotSize = b.tier <= 1 ? 4 : b.tier <= 2 ? 3 : b.tier <= 3 ? 2.5 : 2;
      ctx.fillRect(cx - dotSize / 2, cz - dotSize / 2, dotSize, dotSize);
    }

    // Draw border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace';
    ctx.fillText('MAP', 6, 14);
  }, [dots, halfExtent, sortedLogins.length]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const scale = MAP_SIZE / (halfExtent * 2);
      const worldX = x / scale - halfExtent;
      const worldZ = y / scale - halfExtent;

      setFlyTarget({ x: worldX, y: 0, z: worldZ });
    },
    [setFlyTarget, halfExtent]
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
