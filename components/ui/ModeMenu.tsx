// ModeMenu — Vertical side rail (56px) with pixel icons and gold hover
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { ActiveMode } from '@/lib/cityStore';

const FONT_PIXEL = "'Press Start 2P', monospace";

interface ModeButton {
  mode: ActiveMode;
  name: string;
  icon: string;
  tooltip: string;
}

const MODES: ModeButton[] = [
  { mode: 'explore', name: 'EXPLORE', icon: '🏙️', tooltip: 'Explore City' },
  { mode: 'fly', name: 'FLY', icon: '✈️', tooltip: 'Fly Over City' },
  { mode: 'trending', name: 'TRENDING', icon: '📊', tooltip: 'Trending Repos' },
  { mode: 'search', name: 'SEARCH', icon: '🔍', tooltip: 'Find Building' },
  { mode: 'leaderboard', name: 'RANKS', icon: '🏆', tooltip: 'Leaderboard' },
];

function RailButton({ item, onSelect }: { item: ModeButton; onSelect: (mode: ActiveMode) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => onSelect(item.mode)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered ? 'rgba(245,197,24,0.12)' : 'transparent',
          border: '1px solid',
          borderColor: hovered ? 'rgba(245,197,24,0.4)' : 'rgba(245,197,24,0.08)',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 18,
          transition: 'all 150ms ease',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {item.icon}
      </button>
      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: 54,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(6,4,12,0.95)',
            border: '1px solid rgba(245,197,24,0.25)',
            borderRadius: 4,
            padding: '6px 10px',
            whiteSpace: 'nowrap',
            fontFamily: FONT_PIXEL,
            fontSize: 7,
            color: '#f5c518',
            letterSpacing: '0.06em',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            zIndex: 60,
          }}
        >
          {item.tooltip}
        </div>
      )}
    </div>
  );
}

interface ModeMenuProps {
  visible: boolean;
  onSelect: (mode: ActiveMode) => void;
}

export function ModeMenu({ visible, onSelect }: ModeMenuProps) {
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
    <>
      {/* Subtle dark vignette behind rail */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 49,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,5,15,0.4) 100%)',
          animation: 'modeMenuFadeIn 0.3s ease-out',
          pointerEvents: 'auto',
        }}
        onClick={() => onSelect('explore')}
      />

      {/* Side rail */}
      <div
        style={{
          position: 'fixed',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          width: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '14px 6px',
          background: 'rgba(6,4,12,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(245,197,24,0.12)',
          borderRadius: 10,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          animation: 'modeRailSlideIn 0.35s ease-out',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            fontFamily: FONT_PIXEL,
            fontSize: 7,
            color: '#f5c518',
            letterSpacing: '0.05em',
            marginBottom: 4,
            textShadow: '0 0 8px rgba(245,197,24,0.3)',
          }}
        >
          GW
        </div>

        {/* Separator */}
        <div style={{
          width: 28,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(245,197,24,0.2), transparent)',
          marginBottom: 4,
        }} />

        {/* Mode buttons */}
        {MODES.map((m) => (
          <RailButton key={m.mode} item={m} onSelect={handleClick} />
        ))}
      </div>

      <style>{`
        @keyframes modeMenuFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modeRailSlideIn {
          from { opacity: 0; transform: translate(-20px, -50%); }
          to { opacity: 1; transform: translate(0, -50%); }
        }
      `}</style>
    </>
  );
}
