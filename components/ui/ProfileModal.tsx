// ProfileModal — CMD/Terminal style centered modal
'use client';

import { useCityStore } from '@/lib/cityStore';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import { useEffect, useCallback, useState, useRef } from 'react';
import { slotToWorld, getBuildingDimensions, getTier } from '@/lib/cityLayout';
import { loadUserProfile } from '@/lib/supabaseDb';
import type { SlimUser, CityUser } from '@/lib/supabaseDb';

const MONO = "'Courier New', 'Consolas', 'Monaco', monospace";

// Profile cache — avoids re-fetching
const profileCache = new Map<string, CityUser>();

/** Terminal skeleton while loading */
function TerminalSkeleton() {
  return (
    <div style={{ padding: '16px 20px', fontFamily: MONO, fontSize: 13, color: '#33ff33' }}>
      <div style={{ marginBottom: 8 }}>{'>'} Loading profile...</div>
      <div style={{ opacity: 0.4 }}>{'>'} Fetching data from GitHub...</div>
      <div style={{ opacity: 0.3 }}>{'>'} Please wait...</div>
      <div style={{ marginTop: 16 }}>
        <span style={{ display: 'inline-block', width: '100%', height: 12, background: 'rgba(51,255,51,0.08)', animation: 'terminalBlink 1s infinite' }} />
      </div>
    </div>
  );
}

export function ProfileModal() {
  const selectedUser   = useCityStore((s) => s.selectedUser);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const setFlyTarget   = useCityStore((s) => s.setFlyTarget);
  const [fullProfile, setFullProfile] = useState<CityUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const close = useCallback(() => setSelectedUser(null), [setSelectedUser]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Lazy load full profile with cache
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
  const u = fullProfile ?? selectedUser;
  const showSkeleton = isOpen && loadingProfile && !fullProfile;

  if (!isOpen) return null;

  return (
    <>
      {/* Dark backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 999,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Terminal window — centered */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(580px, 92vw)',
          maxHeight: '85vh',
          background: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: 8,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 1px rgba(51,255,51,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* ── Title bar (macOS style) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          userSelect: 'none',
        }}>
          {/* Red dot close button */}
          <button
            onClick={close}
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: '#ff5f57', border: 'none',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: 'transparent', lineHeight: 1,
              transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#4a0000'}
            onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
          >×</button>
          {/* Yellow + Green dots (decorative) */}
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#28c840' }} />
          {/* Title */}
          <span style={{
            flex: 1, textAlign: 'center',
            fontFamily: MONO, fontSize: 12, color: '#888',
            letterSpacing: '0.05em',
          }}>
            dev@gitworld: ~/{u?.login ?? 'user'}
          </span>
        </div>

        {/* ── Terminal body ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          fontFamily: MONO, fontSize: 13, lineHeight: 1.7,
          color: '#33ff33',
        }}>
          {/* Skeleton while loading */}
          {showSkeleton && <TerminalSkeleton />}

          {/* No data */}
          {!u && !loadingProfile && (
            <div style={{ color: '#ff5555' }}>{'>'} Error: user not found</div>
          )}

          {/* Profile content */}
          {u && !showSkeleton && <TerminalContent u={u} setFlyTarget={setFlyTarget} close={close} />}
        </div>
      </div>
    </>
  );
}

/** Terminal-style profile content */
function TerminalContent({ u, setFlyTarget, close }: {
  u: SlimUser | CityUser;
  setFlyTarget: (t: { x: number; y: number; z: number }) => void;
  close: () => void;
}) {
  const full = 'name' in u ? u as CityUser : null;

  return (
    <div>
      {/* Header with avatar */}
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
              border: '2px solid #33ff33',
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
            $ whoami
          </div>
          <div style={{ color: '#33ff33', fontSize: 15, marginTop: 4 }}>
            {u.login}
          </div>
          {full?.name && (
            <div style={{ color: '#ffcc00', fontSize: 13, marginTop: 3 }}>
              {full.name}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {full?.bio && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ color: '#888' }}>$ echo $BIO</span>
          <div style={{ color: '#cccccc', marginTop: 2 }}>{full.bio}</div>
        </div>
      )}

      {/* Location / Company */}
      {(full?.location || full?.company) && (
        <div style={{ marginBottom: 14 }}>
          {full.location && (
            <div><span style={{ color: '#888' }}>location:</span> <span style={{ color: '#ffcc00' }}>{full.location}</span></div>
          )}
          {full.company && (
            <div><span style={{ color: '#888' }}>company: </span> <span style={{ color: '#ffcc00' }}>{full.company}</span></div>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ color: '#333', marginBottom: 12 }}>{'─'.repeat(50)}</div>

      {/* Building info */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#ffffff', marginBottom: 6 }}>$ cat /building/info</div>
        <div style={{ paddingLeft: 8 }}>
          <div><span style={{ color: '#888' }}>rank:  </span><span style={{ color: '#ff5555' }}>#{u.cityRank}</span></div>
          <div><span style={{ color: '#888' }}>tier:  </span><span style={{ color: '#ff5555' }}>{getTier(u.cityRank)}</span></div>
          <div><span style={{ color: '#888' }}>score: </span><span style={{ color: '#33ff33' }}>{u.totalScore?.toLocaleString()}</span></div>
          <div><span style={{ color: '#888' }}>slot:  </span><span style={{ color: '#33ff33' }}>#{u.citySlot}</span></div>
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
            border: '1px solid #33ff33',
            color: '#33ff33', padding: '8px',
            fontSize: 13, cursor: 'pointer',
            fontFamily: MONO, marginBottom: 14,
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,51,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {'>'} cd /city/building/{u.citySlot} && look
        </button>
      )}

      {/* Divider */}
      <div style={{ color: '#333', marginBottom: 12 }}>{'─'.repeat(50)}</div>

      {/* Stats */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: '#ffffff', marginBottom: 6 }}>$ cat /dev/stats</div>
        <div style={{ paddingLeft: 8 }}>
          <div>
            <span style={{ color: '#888' }}>repos:   </span>
            <span style={{ color: '#33ff33' }}>{(u.publicRepos ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>stars:   </span>
            <span style={{ color: '#ffcc00' }}>{(u.totalStars ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>commits: </span>
            <span style={{ color: '#33ff33' }}>~{(u.estimatedCommits ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>score:   </span>
            <span style={{ color: '#ffffff' }}>{(u.totalScore ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Language */}
      {u.topLanguage && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ color: '#888' }}>language: </span>
          <span style={{
            color: LANGUAGE_COLORS[u.topLanguage] ?? '#33ff33',
            fontWeight: 'bold',
          }}>
            {u.topLanguage}
          </span>
        </div>
      )}

      {/* Top repos */}
      {full?.topRepos && full.topRepos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#ffffff', marginBottom: 6 }}>$ ls ~/repos --top</div>
          {full.topRepos.slice(0, 5).map((repo) => (
            <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'block', padding: '6px 8px', marginBottom: 4,
                textDecoration: 'none', color: '#33ff33',
                fontFamily: MONO, fontSize: 12,
                border: '1px solid transparent',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = 'rgba(51,255,51,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <span style={{ color: '#5599ff' }}>drwxr-xr-x</span>{' '}
                <span style={{ color: '#33ff33' }}>{repo.name}</span>
              </div>
              <div style={{ paddingLeft: 12, color: '#888', fontSize: 11 }}>
                ⭐ {(repo.stars || 0).toLocaleString()} · {repo.language || '?'}
                {repo.description && <span> · {repo.description.slice(0, 60)}</span>}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ color: '#333', marginBottom: 12 }}>{'─'.repeat(50)}</div>

      {/* GitHub link */}
      <a
        href={`https://github.com/${encodeURIComponent(u.login)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', textAlign: 'center',
          background: 'rgba(51,255,51,0.1)',
          border: '1px solid #33ff33',
          color: '#33ff33', padding: '10px',
          fontSize: 13, textDecoration: 'none',
          fontFamily: MONO, marginBottom: 8,
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,51,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(51,255,51,0.1)'}
      >
        $ open https://github.com/{u.login}
      </a>

      {/* Cursor blink */}
      <div style={{ color: '#33ff33', marginTop: 8 }}>
        <span>{'>'} </span>
        <span style={{ animation: 'terminalBlink 1s step-end infinite' }}>█</span>
      </div>
    </div>
  );
}
