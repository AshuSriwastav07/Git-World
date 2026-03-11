// LeaderboardPanel — Top 50 developers, CMD aesthetic, slides from left
'use client';

import { useCityStore } from '@/lib/cityStore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import type { SlimUser } from '@/lib/supabaseDb';

const MONO = "'Courier New', 'Consolas', 'Monaco', monospace";
const GOLD = '#f5c518';
const BG = '#0a0a0f';

function rankBadge(rank: number): { color: string; label: string } {
  if (rank === 1) return { color: '#ffd700', label: '👑' };
  if (rank === 2) return { color: '#c0c0c0', label: '🥈' };
  if (rank === 3) return { color: '#cd7f32', label: '🥉' };
  return { color: GOLD, label: `#${rank}` };
}

export function LeaderboardPanel() {
  const activeMode = useCityStore((s) => s.activeMode);
  const setActiveMode = useCityStore((s) => s.setActiveMode);
  const selectUser = useCityStore((s) => s.selectUser);
  const [slideIn, setSlideIn] = useState(false);
  const [filter, setFilter] = useState('');

  const isOpen = activeMode === 'leaderboard';

  // Animate slide
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setSlideIn(true));
    } else {
      setSlideIn(false);
    }
  }, [isOpen]);

  const close = useCallback(() => {
    setSlideIn(false);
    setTimeout(() => setActiveMode('explore'), 250);
  }, [setActiveMode]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Top 50 from store
  const top50 = useMemo(() => {
    if (!isOpen) return [];
    return useCityStore.getState().getTopUsers(50);
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!filter) return top50;
    const q = filter.toLowerCase();
    return top50.filter(u => u.login.toLowerCase().includes(q));
  }, [top50, filter]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0,
          background: slideIn ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
          zIndex: 999,
          transition: 'background 250ms ease',
        }}
      />

      {/* Panel — slide from left */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 'min(420px, 92vw)',
          background: BG,
          borderRight: `1px solid ${GOLD}33`,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: slideIn
            ? `0 0 60px rgba(245,197,24,0.06), 4px 0 20px rgba(0,0,0,0.6)`
            : 'none',
          overflow: 'hidden',
          transform: slideIn ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Scan line overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,197,24,0.01) 2px, rgba(245,197,24,0.01) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: '#111118',
          borderBottom: `1px solid ${GOLD}22`,
          userSelect: 'none',
          position: 'relative', zIndex: 3,
        }}>
          <button
            onClick={close}
            style={{
              width: 13, height: 13, borderRadius: '50%',
              background: '#ff5f57', border: 'none',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: 'transparent', lineHeight: 1,
              transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#4a0000'}
            onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
          >×</button>
          <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#28c840' }} />
          <span style={{
            flex: 1, textAlign: 'center',
            fontFamily: MONO, fontSize: 11, color: GOLD + 'cc',
            letterSpacing: '0.08em',
          }}>
            🏆 TOP 50 — LEADERBOARD
          </span>
        </div>

        {/* Search filter */}
        <div style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${GOLD}11`,
          position: 'relative', zIndex: 3,
        }}>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="$ grep username..."
            style={{
              width: '100%',
              background: 'rgba(245,197,24,0.04)',
              border: `1px solid ${GOLD}22`,
              borderRadius: 4,
              padding: '6px 10px',
              fontFamily: MONO,
              fontSize: 12,
              color: GOLD,
              outline: 'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = GOLD + '66'}
            onBlur={e => e.currentTarget.style.borderColor = GOLD + '22'}
          />
        </div>

        {/* List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 0',
          fontFamily: MONO, fontSize: 12,
          position: 'relative', zIndex: 1,
        }}>
          {filtered.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
              No matching developers found
            </div>
          )}
          {filtered.map((user) => (
            <LeaderboardRow
              key={user.login}
              user={user}
              onSelect={() => {
                selectUser(user);
                close();
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${GOLD}11`,
          fontFamily: MONO, fontSize: 10, color: '#555',
          textAlign: 'center',
          position: 'relative', zIndex: 3,
        }}>
          {top50.length} developers ranked by total score
        </div>
      </div>
    </>
  );
}

function LeaderboardRow({ user, onSelect }: { user: SlimUser; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const badge = rankBadge(user.cityRank);
  const isTop3 = user.cityRank <= 3;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 14px',
        background: hovered ? `${GOLD}08` : 'transparent',
        border: 'none', borderBottom: `1px solid ${GOLD}08`,
        cursor: 'pointer',
        fontFamily: MONO, fontSize: 12,
        color: GOLD,
        textAlign: 'left',
        transition: 'background 120ms',
      }}
    >
      {/* Rank */}
      <span style={{
        width: 36, textAlign: 'right', flexShrink: 0,
        fontSize: isTop3 ? 16 : 12,
        color: badge.color,
        fontWeight: isTop3 ? 'bold' : 'normal',
      }}>
        {badge.label}
      </span>

      {/* Avatar */}
      {user.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.login}
          width={28}
          height={28}
          style={{
            imageRendering: 'pixelated',
            borderRadius: 3,
            border: `1px solid ${isTop3 ? badge.color : GOLD + '33'}`,
            flexShrink: 0,
          }}
        />
      )}

      {/* Name + language */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: isTop3 ? badge.color : '#ccc',
          fontWeight: isTop3 ? 'bold' : 'normal',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user.login}
        </div>
        {user.topLanguage && (
          <div style={{ fontSize: 10, color: LANGUAGE_COLORS[user.topLanguage] ?? '#666', marginTop: 1 }}>
            {user.topLanguage}
          </div>
        )}
      </div>

      {/* Score */}
      <span style={{
        color: isTop3 ? badge.color : '#888',
        fontSize: 11, flexShrink: 0,
      }}>
        {user.totalScore.toLocaleString()}
      </span>
    </button>
  );
}
