// ModeMenu — Post-intro mode selection overlay
'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { ActiveMode } from '@/lib/cityStore';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO = "var(--font-mono, 'Space Mono', monospace)";

interface ModeButton {
  mode: ActiveMode;
  name: string;
  description: string;
  accentColor: string;
  icon: string; // emoji fallback — 16×16 pixel icons would be canvas-drawn in production
}

const MODES: ModeButton[] = [
  {
    mode: 'explore',
    name: 'EXPLORE CITY',
    description: 'Orbit · Zoom · Pan · Click buildings',
    accentColor: '#f5c518',
    icon: '🏙️',
  },
  {
    mode: 'fly',
    name: 'FLY OVER CITY',
    description: '3rd person · WASD + arrows · Esc to exit',
    accentColor: '#38bdf8',
    icon: '✈️',
  },
  {
    mode: 'trending',
    name: 'TRENDING REPOS',
    description: 'Last 7 days · Top 20 this week',
    accentColor: '#fb923c',
    icon: '📊',
  },
  {
    mode: 'search',
    name: 'FIND MY BUILDING',
    description: 'Search GitHub username',
    accentColor: '#34d399',
    icon: '🔍',
  },
  {
    mode: 'leaderboard',
    name: 'LEADERBOARD',
    description: 'Top 100 developers · All time',
    accentColor: '#c084fc',
    icon: '🏆',
  },
];

interface ModeMenuProps {
  visible: boolean;
  onSelect: (mode: ActiveMode) => void;
}

export function ModeMenu({ visible, onSelect }: ModeMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape key closes menu → default to explore
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelect('explore');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onSelect]);

  const handleClick = useCallback((mode: ActiveMode) => {
    onSelect(mode);
  }, [onSelect]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Subtle dark vignette
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(7,5,15,0.5) 100%)',
        animation: 'modeMenuFadeIn 0.4s ease-out',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 420,
          maxWidth: '92vw',
          animation: 'modeMenuSlideUp 0.5s ease-out',
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: FONT_PIXEL,
            fontSize: 'clamp(18px, 3.5vw, 28px)',
            color: '#fbbf24',
            letterSpacing: '0.08em',
            textShadow: '0 0 40px rgba(251,191,36,0.3)',
            marginBottom: 8,
          }}
        >
          GIT WORLD
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: '#a8a8b8',
            marginBottom: 28,
          }}
        >
          Choose your mode to begin
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => handleClick(m.mode)}
              style={{
                position: 'relative',
                width: '100%',
                height: 64,
                background: 'rgba(7,5,15,0.85)',
                border: '1px solid rgba(245,197,24,0.3)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 150ms ease, background 150ms ease, transform 150ms ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'rgba(245,197,24,0.8)';
                el.style.background = 'rgba(245,197,24,0.08)';
                el.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'rgba(245,197,24,0.3)';
                el.style.background = 'rgba(7,5,15,0.85)';
                el.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.background = 'rgba(245,197,24,0.2)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.background = 'rgba(245,197,24,0.08)';
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: m.accentColor,
                  opacity: 0.6,
                  borderRadius: '6px 0 0 6px',
                  transition: 'opacity 150ms ease',
                }}
                className="mode-accent"
              />

              {/* Icon */}
              <span style={{ fontSize: 16, marginRight: 14, flexShrink: 0 }}>{m.icon}</span>

              {/* Name */}
              <span
                style={{
                  fontFamily: FONT_PIXEL,
                  fontSize: 11,
                  color: '#fff',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {m.name}
              </span>

              {/* Spacer */}
              <span style={{ flex: 1 }} />

              {/* Description */}
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: '#a8a8b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {m.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes modeMenuFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modeMenuSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
