// RepoProfilePanel — Side panel (desktop) / Bottom sheet (mobile) for trending repository details
'use client';

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useTrendingStore, type TrendingRepo } from '@/lib/trendingStore';
import { useCityStore } from '@/lib/cityStore';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';

const FONT = "'Press Start 2P', monospace";
const SWIPE_THRESHOLD = 80;

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

// Simple sparkline bar chart rendered on a canvas
function WeeklySparkline({ dailyStars, color }: { dailyStars: { date: string; count: number }[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const data = dailyStars.length > 0 ? dailyStars : [{ date: '', count: 0 }];
    const maxVal = Math.max(1, ...data.map(d => d.count));
    const barW = Math.floor(W / 7) - 2;

    data.forEach((d, i) => {
      const barH = Math.max(2, (d.count / maxVal) * (H - 10));
      const x = i * (barW + 2) + 2;
      const y = H - barH;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);
    });
  }, [dailyStars, color]);

  return <canvas ref={canvasRef} width={200} height={60} style={{ width: '100%', height: '60px', imageRendering: 'pixelated' }} />;
}

export function RepoProfilePanel() {
  const selectedRepo = useTrendingStore(s => s.selectedRepo);
  const closeRepoPanel = useTrendingStore(s => s.closeRepoPanel);
  const repoPanelOpen = useTrendingStore(s => s.repoPanelOpen);
  const selectUser = useCityStore(s => s.selectUser);
  const getUserByLogin = useCityStore(s => s.getUserByLogin);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);

  const close = useCallback(() => closeRepoPanel(), [closeRepoPanel]);

  // Swipe-to-close (mobile: swipe down)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDelta.current = 0;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - touchStartY.current;
    touchDelta.current = Math.max(0, dy);
    if (panelRef.current && isMobile) {
      panelRef.current.style.transform = `translateY(${touchDelta.current}px)`;
      panelRef.current.style.transition = 'none';
    }
  }, [isMobile]);
  const handleTouchEnd = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
      panelRef.current.style.transform = '';
    }
    if (isMobile && touchDelta.current > SWIPE_THRESHOLD) close();
    touchDelta.current = 0;
  }, [isMobile, close]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && repoPanelOpen) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close, repoPanelOpen]);

  const repo = selectedRepo;
  const langColor = useMemo(
    () => repo ? (LANGUAGE_COLORS[repo.primary_language] ?? LANGUAGE_COLORS.default) : '#9b72cf',
    [repo]
  );

  // Find owner in city
  const ownerInCity = useMemo(
    () => repo?.owner_type === 'User' ? getUserByLogin(repo.owner_login) : undefined,
    [repo, getUserByLogin]
  );

  // Find highest-ranked contributor in city
  const topContributorInCity = useMemo(() => {
    if (!repo) return undefined;
    for (const c of repo.top_contributors) {
      if (c.city_rank !== null) {
        const u = getUserByLogin(c.login);
        if (u) return u;
      }
    }
    return undefined;
  }, [repo, getUserByLogin]);

  return (
    <>
      {/* SIDE PANEL (desktop) / BOTTOM SHEET (mobile) */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
        position: 'fixed',
        ...(isMobile
          ? { bottom: 0, left: 0, width: '100%', height: '75vh', borderRadius: '16px 16px 0 0', borderTop: `2px solid ${langColor}`,
              transform: repoPanelOpen ? 'translateY(0)' : 'translateY(100%)' }
          : { top: 0, right: 0, width: '380px', height: '100vh', borderLeft: `2px solid ${langColor}`,
              transform: repoPanelOpen ? 'translateX(0)' : 'translateX(100%)' }
        ),
        background: 'rgba(8, 5, 20, 0.97)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1001,
        overflowY: 'auto',
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#555' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${langColor}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: langColor, fontSize: '10px', letterSpacing: '0.1em' }}>
            REPO PROFILE
          </span>
          <button onClick={close} style={{ background: 'none', border: 'none', color: langColor, cursor: 'pointer',
            fontSize: '20px', fontFamily: 'monospace',
            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            x
          </button>
        </div>

        {repo && (
          <div style={{ padding: '16px', flex: 1 }}>
            {/* ── Repo identity ── */}
            <div style={{ color: '#fbbf24', fontSize: '11px', marginBottom: '6px', lineHeight: 1.6, wordBreak: 'break-all' }}>
              {repo.repo_full_name}
            </div>

            {repo.description && (
              <div style={{ color: '#ccc', fontSize: '7px', lineHeight: 1.8, marginBottom: '12px' }}>
                {repo.description}
              </div>
            )}

            {/* Language badge + Trending badge */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{ background: `${langColor}22`, border: `1px solid ${langColor}`, color: langColor, padding: '3px 8px', fontSize: '7px' }}>
                {repo.primary_language}
              </span>
              <span style={{ background: 'rgba(255,100,0,0.15)', border: '1px solid #ff6400', color: '#ff6400', padding: '3px 8px', fontSize: '7px' }}>
                TRENDING #{repo.trending_rank}
              </span>
            </div>

            {/* ── Stats grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'TOTAL STARS', value: formatNum(repo.total_stars), icon: '★' },
                { label: 'STARS /WK', value: `+${formatNum(repo.weekly_stars)}`, icon: '▲' },
                { label: 'FORKS', value: formatNum(repo.forks), icon: '⑂' },
                { label: 'ISSUES', value: formatNum(repo.open_issues), icon: '◉' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #333', padding: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '6px', marginBottom: '4px' }}>{icon} {label}</div>
                  <div style={{ color: '#fff', fontSize: '9px' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* ── Owner section ── */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', padding: '10px', marginBottom: '14px' }}>
              <div style={{ color: '#888', fontSize: '7px', marginBottom: '8px' }}>OWNER</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://github.com/${encodeURIComponent(repo.owner_login)}.png?size=48`}
                  alt={repo.owner_login}
                  width={40}
                  height={40}
                  style={{ borderRadius: '50%', border: '1px solid #444', imageRendering: 'pixelated' }}
                />
                <div>
                  <div style={{ color: '#fff', fontSize: '8px' }}>{repo.owner_login}</div>
                  <div style={{ color: '#666', fontSize: '6px', marginTop: '2px' }}>
                    {repo.owner_type === 'Organization' ? 'Organization' : (
                      ownerInCity ? `City Rank: #${ownerInCity.cityRank}` : 'Not in city'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Top contributors ── */}
            {repo.top_contributors.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ color: '#888', fontSize: '7px', marginBottom: '8px' }}>TOP CONTRIBUTORS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {repo.top_contributors.slice(0, 5).map((c) => {
                    const cityUser = getUserByLogin(c.login);
                    return (
                      <div
                        key={c.login}
                        onClick={() => {
                          if (cityUser) {
                            closeRepoPanel();
                            selectUser(cityUser);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: 'rgba(255,255,255,0.03)', border: '1px solid #222',
                          padding: '6px 8px', cursor: cityUser ? 'pointer' : 'default',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.avatarUrl || `https://github.com/${encodeURIComponent(c.login)}.png?size=32`}
                          alt={c.login}
                          width={28}
                          height={28}
                          style={{ borderRadius: '50%', border: '1px solid #333', imageRendering: 'pixelated' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#ddd', fontSize: '7px' }}>{c.login}</div>
                          <div style={{ color: '#666', fontSize: '6px' }}>
                            {c.contributions} commits
                            {c.city_rank !== null ? ` · Rank #${c.city_rank}` : ' · NOT IN CITY'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <a
                href={repo.github_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center', background: langColor,
                  color: '#000', padding: '8px', fontSize: '7px', textDecoration: 'none',
                  letterSpacing: '0.1em', fontFamily: FONT,
                }}
              >
                VIEW ON GITHUB
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(repo.github_url); }}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid #444',
                  color: '#ccc', padding: '8px', fontSize: '7px', cursor: 'pointer',
                  fontFamily: FONT, letterSpacing: '0.1em',
                }}
              >
                COPY REPO LINK
              </button>
              {ownerInCity && (
                <button
                  onClick={() => { closeRepoPanel(); selectUser(ownerInCity); }}
                  style={{
                    background: 'rgba(245,197,24,0.15)', border: '1px solid #fbbf24',
                    color: '#fbbf24', padding: '8px', fontSize: '7px', cursor: 'pointer',
                    fontFamily: FONT, letterSpacing: '0.1em',
                  }}
                >
                  FIND OWNER BUILDING
                </button>
              )}
              {topContributorInCity && (
                <button
                  onClick={() => { closeRepoPanel(); selectUser(topContributorInCity); }}
                  style={{
                    background: 'rgba(100,200,255,0.1)', border: '1px solid #4cc9f0',
                    color: '#4cc9f0', padding: '8px', fontSize: '7px', cursor: 'pointer',
                    fontFamily: FONT, letterSpacing: '0.1em',
                  }}
                >
                  FIND TOP CONTRIBUTOR
                </button>
              )}
            </div>

            {/* ── Weekly trend sparkline ── */}
            {repo.daily_stars.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ color: '#888', fontSize: '7px', marginBottom: '6px' }}>STARS / DAY (7D)</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', padding: '8px' }}>
                  <WeeklySparkline dailyStars={repo.daily_stars} color={langColor} />
                </div>
              </div>
            )}

            {/* ── Topics/tags ── */}
            {repo.topics.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ color: '#888', fontSize: '7px', marginBottom: '8px' }}>TOPICS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {repo.topics.slice(0, 6).map((topic) => (
                    <span
                      key={topic}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${langColor}66`,
                        color: '#aaa',
                        padding: '3px 6px',
                        fontSize: '6px',
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dark overlay */}
      {repoPanelOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0,
            ...(isMobile ? {} : { right: '380px' }),
            background: 'rgba(0,0,0,0.25)',
            zIndex: 1000,
          }}
        />
      )}
    </>
  );
}
