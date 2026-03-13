// HUD — Minimal top bar (36px) + persistent overlays
'use client';

import { Suspense, lazy } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { SearchBar } from './SearchBar';
import { MiniMap } from './MiniMap';
import { TopFiveWidget } from './TopFiveWidget';
import { LiveFeed } from './LiveFeed';
import { AirplaneHUD } from './AirplaneHUD';
import { Controls } from './Controls';
import { GitHubStars } from './GitHubStars';
import { JoinToast } from './JoinToast';

const ProfileModal = lazy(() => import('./ProfileModal').then(m => ({ default: m.ProfileModal })));
const RepoProfilePanel = lazy(() => import('./RepoProfilePanel').then(m => ({ default: m.RepoProfilePanel })));
const LeaderboardPanel = lazy(() => import('./LeaderboardPanel').then(m => ({ default: m.LeaderboardPanel })));

const FONT = "'Press Start 2P', monospace";

const MODE_LABELS: Record<string, string> = {
  explore: 'EXPLORE',
  fly: 'FLY MODE',
  trending: 'TRENDING',
  search: 'SEARCH',
  leaderboard: 'RANKINGS',
  menu: 'MENU',
};

export function HUD() {
  const users = useCityStore((s) => s.users);
  const isNight = useCityStore((s) => s.isNight);
  const toggleNight = useCityStore((s) => s.toggleNight);
  const introStage = useCityStore((s) => s.introStage);
  const activeMode = useCityStore((s) => s.activeMode);
  const flightMode = useCityStore((s) => s.flightMode);
  const setActiveMode = useCityStore((s) => s.setActiveMode);

  const showUI = introStage === 'done' && activeMode !== 'menu' && !flightMode;

  return (
    <>
      {/* Always-mounted overlays (lazy-loaded) */}
      <Suspense fallback={null}>
        <ProfileModal />
        <RepoProfilePanel />
        <LeaderboardPanel />
      </Suspense>
      <AirplaneHUD />
      <JoinToast />

      {/* ── Minimal 36px top bar ── */}
      {showUI && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            height: 36,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            background: 'rgba(6,4,12,0.7)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(245,197,24,0.15)',
            fontFamily: FONT,
            userSelect: 'none',
          }}
        >
          {/* Left: Logo + dev count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: '#f5c518', letterSpacing: '0.1em', textShadow: '0 0 12px rgba(245,197,24,0.3)' }}>
              GIT WORLD
            </span>
            <span style={{ width: 1, height: 14, background: 'rgba(245,197,24,0.15)' }} />
            <span style={{ fontSize: 7, color: '#888', letterSpacing: '0.05em' }}>
              {users.size.toLocaleString()} devs
            </span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#cc342d', boxShadow: '0 0 6px #cc342d', animation: 'pulse 2s ease-in-out infinite' }} />
          </div>

          {/* Right: mode name + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 7,
              color: 'rgba(245,197,24,0.6)',
              letterSpacing: '0.08em',
            }}>
              {MODE_LABELS[activeMode] || activeMode.toUpperCase()}
            </span>
            <GitHubStars />
            <button
              onClick={toggleNight}
              style={{
                background: 'none',
                border: '1px solid rgba(245,197,24,0.12)',
                borderRadius: 4,
                width: 28,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 12,
                transition: 'border-color 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(245,197,24,0.12)'}
              title={isNight ? 'Switch to Day' : 'Switch to Night'}
            >
              {isNight ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setActiveMode('menu')}
              style={{
                background: 'rgba(245,197,24,0.08)',
                border: '1px solid rgba(245,197,24,0.2)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 7,
                color: '#f5c518',
                fontFamily: FONT,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                transition: 'background 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.15)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.2)'; }}
            >
              MENU
            </button>
          </div>
        </div>
      )}

      {/* Bottom-left: minimap + controls */}
      {showUI && (
        <div className="fixed bottom-16 left-3 z-20 flex flex-col gap-2 select-none">
          <div className="relative">
            <Controls />
          </div>
          <MiniMap />
        </div>
      )}

      {/* Bottom-right: top 5 */}
      {showUI && (
        <div className="fixed bottom-16 right-3 z-20 select-none">
          <TopFiveWidget />
        </div>
      )}

      {/* Bottom center: search */}
      {showUI && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
          <SearchBar />
        </div>
      )}

      {/* Live feed ticker */}
      {showUI && (
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <LiveFeed />
        </div>
      )}

      {/* Credit */}
      <a
        href="https://github.com/Ashusriwastav07"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-1 right-1 z-30 text-[6px] text-[#555] hover:text-[#888] transition-colors"
        style={{ fontFamily: FONT }}
      >
        Built by Ashusriwastav07 🐱
      </a>
    </>
  );
}
