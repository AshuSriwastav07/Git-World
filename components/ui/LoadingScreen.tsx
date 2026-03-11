// LoadingScreen — pure HTML/CSS loading overlay (no Three.js)
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

const SV_COMPANIES = [
  { name: 'Apple', color: '#a2aaad' },
  { name: 'Google', color: '#4285f4' },
  { name: 'NVIDIA', color: '#76b900' },
  { name: 'Meta', color: '#0668e1' },
  { name: 'Amazon', color: '#ff9900' },
  { name: 'Microsoft', color: '#00a4ef' },
  { name: 'Tesla', color: '#cc0000' },
  { name: 'Netflix', color: '#e50914' },
];

/** Tiny pixel-building icon drawn on a canvas */
function PixelBuilding() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);

    // Simple 3-building skyline
    ctx.fillStyle = '#f5c518';
    // Left building
    ctx.fillRect(4, 14, 6, 18);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(5, 16, 1, 2);
    ctx.fillRect(8, 16, 1, 2);
    ctx.fillRect(5, 20, 1, 2);
    ctx.fillRect(8, 20, 1, 2);

    // Center building (tallest)
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(12, 6, 8, 26);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(14, 8, 1, 2);
    ctx.fillRect(17, 8, 1, 2);
    ctx.fillRect(14, 12, 1, 2);
    ctx.fillRect(17, 12, 1, 2);
    ctx.fillRect(14, 16, 1, 2);
    ctx.fillRect(17, 16, 1, 2);
    ctx.fillRect(14, 20, 1, 2);
    ctx.fillRect(17, 20, 1, 2);

    // Right building
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(22, 18, 6, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(23, 20, 1, 2);
    ctx.fillRect(26, 20, 1, 2);
    ctx.fillRect(23, 24, 1, 2);
    ctx.fillRect(26, 24, 1, 2);
  }, []);

  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
    />
  );
}

interface LoadingScreenProps {
  visible: boolean;
  onFadeComplete?: () => void;
}

export function LoadingScreen({ visible, onFadeComplete }: LoadingScreenProps) {
  const users = useCityStore((s) => s.users);
  const loadingProgress = useCityStore((s) => s.loadingProgress);
  const loadingMessage = useCityStore((s) => s.loadingMessage);
  const [fadeOut, setFadeOut] = useState(false);

  // When visible goes from true→false, trigger fade-out
  const prevVisible = useRef(visible);
  useEffect(() => {
    if (prevVisible.current && !visible) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        onFadeComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
    if (visible) {
      setFadeOut(false);
    }
    prevVisible.current = visible;
  }, [visible, onFadeComplete]);

  if (!visible && !fadeOut) return null;

  const devCount = users.size;
  const progressClamped = Math.min(100, Math.max(0, loadingProgress));

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center select-none"
      style={{
        background: '#07050f',
        fontFamily: FONT,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Pixel building icon */}
      <div style={{ marginBottom: 16 }}>
        <PixelBuilding />
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 'clamp(16px, 4vw, 28px)',
          color: '#f5c518',
          letterSpacing: '6px',
          textShadow: '0 0 30px rgba(245,197,24,0.4)',
          marginBottom: 24,
        }}
      >
        GIT WORLD
      </h1>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: 'clamp(12px, 3vw, 32px)',
          marginBottom: 24,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <StatCard label="DEVELOPERS" value={devCount > 0 ? `${devCount.toLocaleString()}+` : '...'} />
        <StatCard label="COMPANIES" value={`${SV_COMPANIES.length}`} />
        <StatCard label="LANGUAGES" value="8+" />
      </div>

      {/* Separator */}
      <div
        style={{
          width: 'clamp(200px, 50vw, 400px)',
          height: 1,
          background: 'linear-gradient(90deg, transparent, #f5c51844, transparent)',
          marginBottom: 20,
        }}
      />

      {/* SV companies row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 24,
          maxWidth: 'clamp(280px, 60vw, 500px)',
        }}
      >
        {SV_COMPANIES.map((c) => (
          <span
            key={c.name}
            style={{
              fontSize: 7,
              color: c.color,
              letterSpacing: '1px',
              opacity: 0.8,
            }}
          >
            {c.name.toUpperCase()}
          </span>
        ))}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: 'clamp(200px, 50vw, 360px)',
          height: 8,
          background: '#1a1a2e',
          border: '1px solid #333',
          marginBottom: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressClamped}%`,
            background: progressClamped >= 100
              ? 'linear-gradient(90deg, #f5c518, #fbbf24)'
              : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            transition: 'width 0.3s ease-out, background 0.5s ease',
          }}
        />
      </div>

      {/* Progress text */}
      <p style={{ fontSize: 7, color: '#888', letterSpacing: '1px', marginBottom: 12 }}>
        {loadingMessage || `${progressClamped}%`}
      </p>

      {/* Blinking dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#f5c518',
              animation: `loadingDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes loadingDotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 16px',
        background: '#0d0d1a',
        border: '1px solid #222',
      }}
    >
      <span style={{ fontSize: 'clamp(12px, 2.5vw, 18px)', color: '#f5c518' }}>
        {value}
      </span>
      <span style={{ fontSize: 6, color: '#666', letterSpacing: '1px' }}>
        {label}
      </span>
    </div>
  );
}
