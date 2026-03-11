// ProfileModal — Premium CMD/Terminal panel: slide-in from right, two-phase render
'use client';

import { useCityStore } from '@/lib/cityStore';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import { useEffect, useCallback, useState, useRef } from 'react';
import { slotToWorld, getBuildingDimensions, getTier } from '@/lib/cityLayout';
import { loadUserProfile } from '@/lib/supabaseDb';
import type { SlimUser, CityUser } from '@/lib/supabaseDb';

const MONO = "'Courier New', 'Consolas', 'Monaco', monospace";
const GREEN = '#00ff41';
const BG = '#0a0f0a';
const BG_LIGHT = '#111a11';

// Profile cache — avoids re-fetching
const profileCache = new Map<string, CityUser>();

/** Preload a profile into cache (called on hover from CityGrid) */
export function preloadProfile(login: string) {
  if (profileCache.has(login.toLowerCase())) return;
  loadUserProfile(login).then(stored => {
    if (stored) profileCache.set(login.toLowerCase(), stored);
  }).catch(() => {});
}

export function ProfileModal() {
  const selectedUser   = useCityStore((s) => s.selectedUser);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const setFlyTarget   = useCityStore((s) => s.setFlyTarget);
  const [fullProfile, setFullProfile] = useState<CityUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  const close = useCallback(() => {
    setSlideIn(false);
    setTimeout(() => setSelectedUser(null), 250);
  }, [setSelectedUser]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Slide in after mount
  useEffect(() => {
    if (selectedUser) {
      requestAnimationFrame(() => setSlideIn(true));
    } else {
      setSlideIn(false);
    }
  }, [selectedUser]);

  // Two-phase profile load: instant from SlimUser, then enrich with CityUser
  useEffect(() => {
    if (!selectedUser) { setFullProfile(null); return; }

    const login = selectedUser.login;
    const cached = profileCache.get(login.toLowerCase());
    if (cached) {
      setFullProfile(cached);
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      setLoadingProfile(true);
      try {
        const stored = await loadUserProfile(login);
        if (cancelled) return;
        if (stored) {
          profileCache.set(login.toLowerCase(), stored);
          setFullProfile(stored);
        }
      } catch (error) {
        if (!cancelled) console.error('Profile hydrate error:', error);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, [selectedUser?.login]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOpen = !!selectedUser;
  // Phase 1: selectedUser (SlimUser) — always available instantly
  // Phase 2: fullProfile (CityUser) — enriches with bio, repos, etc.
  const u = selectedUser;
  const full = fullProfile;

  if (!isOpen || !u) return null;

  return (
    <>
      {/* Dark backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0,
          background: slideIn ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
          zIndex: 999,
          backdropFilter: slideIn ? 'blur(2px)' : 'none',
          transition: 'background 250ms ease, backdrop-filter 250ms ease',
        }}
      />

      {/* Terminal panel — slide in from right */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(440px, 92vw)',
          background: BG,
          border: 'none',
          borderLeft: `1px solid ${GREEN}33`,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: slideIn
            ? `0 0 80px rgba(0,255,65,0.08), -4px 0 20px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,255,65,0.02)`
            : 'none',
          overflow: 'hidden',
          transform: slideIn ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Scan line overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* ── Title bar (macOS style) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: BG_LIGHT,
          borderBottom: `1px solid ${GREEN}22`,
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
            fontFamily: MONO, fontSize: 11, color: GREEN + '88',
            letterSpacing: '0.08em',
          }}>
            dev@gitworld: ~/{u.login}
          </span>
        </div>

        {/* ── Terminal body ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          fontFamily: MONO, fontSize: 13, lineHeight: 1.7,
          color: GREEN,
          position: 'relative', zIndex: 1,
        }}>
          <TerminalContent
            u={u}
            full={full}
            loading={loadingProfile}
            setFlyTarget={setFlyTarget}
            close={close}
          />
        </div>
      </div>
    </>
  );
}

/** Terminal-style profile content — two-phase render */
function TerminalContent({ u, full, loading, setFlyTarget, close }: {
  u: SlimUser;
  full: CityUser | null;
  loading: boolean;
  setFlyTarget: (t: { x: number; y: number; z: number }) => void;
  close: () => void;
}) {
  return (
    <div>
      {/* Header with avatar — always available from SlimUser */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        {u.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.avatarUrl}
            alt={u.login}
            width={64}
            height={64}
            style={{
              imageRendering: 'pixelated',
              borderRadius: 4,
              border: `2px solid ${GREEN}`,
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
            $ whoami
          </div>
          <div style={{ color: GREEN, fontSize: 15, marginTop: 4 }}>
            {u.login}
          </div>
          {full?.name && (
            <div style={{ color: '#ffcc00', fontSize: 13, marginTop: 3 }}>
              {full.name}
            </div>
          )}
        </div>
      </div>

      {/* Bio — Phase 2 (fills in when CityUser arrives) */}
      {full?.bio && (
        <div style={{ marginBottom: 14, animation: 'fadeIn 300ms ease' }}>
          <span style={{ color: '#666' }}>$ echo $BIO</span>
          <div style={{ color: '#cccccc', marginTop: 2 }}>{full.bio}</div>
        </div>
      )}

      {/* Location / Company — Phase 2 */}
      {(full?.location || full?.company) && (
        <div style={{ marginBottom: 14, animation: 'fadeIn 300ms ease' }}>
          {full.location && (
            <div><span style={{ color: '#666' }}>location:</span> <span style={{ color: '#ffcc00' }}>{full.location}</span></div>
          )}
          {full.company && (
            <div><span style={{ color: '#666' }}>company: </span> <span style={{ color: '#ffcc00' }}>{full.company}</span></div>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ color: GREEN + '22', marginBottom: 12 }}>{'─'.repeat(50)}</div>

      {/* Building info — always available from SlimUser */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#ffffff', marginBottom: 6 }}>$ cat /building/info</div>
        <div style={{ paddingLeft: 8 }}>
          <div><span style={{ color: '#666' }}>rank:  </span><span style={{ color: '#ff5555' }}>#{u.cityRank}</span></div>
          <div><span style={{ color: '#666' }}>tier:  </span><span style={{ color: '#ff5555' }}>{getTier(u.cityRank)}</span></div>
          <div><span style={{ color: '#666' }}>score: </span><span style={{ color: GREEN }}>{u.totalScore?.toLocaleString()}</span></div>
          <div><span style={{ color: '#666' }}>slot:  </span><span style={{ color: GREEN }}>#{u.citySlot}</span></div>
        </div>
      </div>

      {/* Find Building */}
      {u.citySlot > 0 && (
        <button
          onClick={() => {
            const pos = slotToWorld(u.citySlot);
            const dims = getBuildingDimensions(u.cityRank, u.citySlot, u);
            setFlyTarget({ x: pos.x, y: dims.height / 2, z: pos.z });
            close();
          }}
          style={{
            display: 'block', width: '100%',
            background: 'transparent',
            border: `1px solid ${GREEN}44`,
            color: GREEN, padding: '8px',
            fontSize: 13, cursor: 'pointer',
            fontFamily: MONO, marginBottom: 14,
            transition: 'background 150ms, border-color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${GREEN}11`; e.currentTarget.style.borderColor = GREEN; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${GREEN}44`; }}
        >
          {'>'} cd /city/building/{u.citySlot} && look
        </button>
      )}

      {/* Divider */}
      <div style={{ color: GREEN + '22', marginBottom: 12 }}>{'─'.repeat(50)}</div>

      {/* Stats — always available from SlimUser */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#ffffff', marginBottom: 6 }}>$ cat /dev/stats</div>
        <div style={{ paddingLeft: 8 }}>
          <div>
            <span style={{ color: '#666' }}>repos:   </span>
            <span style={{ color: GREEN }}>{(u.publicRepos ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>stars:   </span>
            <span style={{ color: '#ffcc00' }}>{(u.totalStars ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>commits: </span>
            <span style={{ color: GREEN }}>~{(u.estimatedCommits ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>score:   </span>
            <span style={{ color: '#ffffff' }}>{(u.totalScore ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Language — always available from SlimUser */}
      {u.topLanguage && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ color: '#666' }}>language: </span>
          <span style={{
            color: LANGUAGE_COLORS[u.topLanguage] ?? GREEN,
            fontWeight: 'bold',
          }}>
            {u.topLanguage}
          </span>
        </div>
      )}

      {/* Loading indicator for Phase 2 data */}
      {loading && !full && (
        <div style={{ marginBottom: 14, opacity: 0.5 }}>
          <span style={{ color: GREEN }}>{'>'} Fetching extended profile</span>
          <span style={{ animation: 'terminalBlink 1s step-end infinite' }}>...</span>
        </div>
      )}

      {/* Top repos — Phase 2 */}
      {full?.topRepos && full.topRepos.length > 0 && (
        <div style={{ marginBottom: 16, animation: 'fadeIn 300ms ease' }}>
          <div style={{ color: '#ffffff', marginBottom: 6 }}>$ ls ~/repos --top</div>
          {full.topRepos.slice(0, 5).map((repo) => (
            <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'block', padding: '6px 8px', marginBottom: 4,
                textDecoration: 'none', color: GREEN,
                fontFamily: MONO, fontSize: 12,
                border: '1px solid transparent',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN + '33'; e.currentTarget.style.background = `${GREEN}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <span style={{ color: '#5599ff' }}>drwxr-xr-x</span>{' '}
                <span style={{ color: GREEN }}>{repo.name}</span>
              </div>
              <div style={{ paddingLeft: 12, color: '#666', fontSize: 11 }}>
                ⭐ {(repo.stars || 0).toLocaleString()} · {repo.language || '?'}
                {repo.description && <span> · {repo.description.slice(0, 60)}</span>}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ color: GREEN + '22', marginBottom: 12 }}>{'─'.repeat(50)}</div>

      {/* GitHub link */}
      <a
        href={`https://github.com/${encodeURIComponent(u.login)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', textAlign: 'center',
          background: `${GREEN}11`,
          border: `1px solid ${GREEN}44`,
          color: GREEN, padding: '10px',
          fontSize: 13, textDecoration: 'none',
          fontFamily: MONO, marginBottom: 8,
          transition: 'background 150ms, border-color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${GREEN}22`; e.currentTarget.style.borderColor = GREEN; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${GREEN}11`; e.currentTarget.style.borderColor = `${GREEN}44`; }}
      >
        $ open https://github.com/{u.login}
      </a>

      {/* Cursor blink */}
      <div style={{ color: GREEN, marginTop: 8 }}>
        <span>{'>'} </span>
        <span style={{ animation: 'terminalBlink 1s step-end infinite' }}>█</span>
      </div>
    </div>
  );
}
