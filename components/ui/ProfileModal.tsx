// ProfileModal — SIDE PANEL that slides in from right
'use client';

import { useCityStore } from '@/lib/cityStore';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import { useEffect, useCallback, useState } from 'react';
import { slotToWorld, getTier } from '@/lib/cityLayout';
import { loadUserProfile } from '@/lib/supabaseDb';
import type { SlimUser, CityUser } from '@/lib/supabaseDb';

const FONT = "'Press Start 2P', monospace";

export function ProfileModal() {
  const selectedUser   = useCityStore((s) => s.selectedUser);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const users          = useCityStore((s) => s.users);
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

  // Lazy load full profile
  useEffect(() => {
    if (!selectedUser) { setFullProfile(null); return; }

    let cancelled = false;
    const hydrate = async () => {
      setLoadingProfile(true);
      try {
        const stored = await loadUserProfile(selectedUser.login);
        if (cancelled) return;
        if (stored) setFullProfile(stored);
      } catch (error) {
        if (!cancelled) console.error('Profile hydrate error:', error);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, [selectedUser?.login]);

  const isOpen = !!selectedUser;
  const u = fullProfile ?? selectedUser;

  // Get stats for scaling bars
  const allUsers = Array.from(users.values());
  const maxCommits = Math.max(1, ...allUsers.map((x) => x.estimatedCommits));
  const maxStars = Math.max(1, ...allUsers.map((x) => x.totalStars));
  const maxRepos = Math.max(1, ...allUsers.map((x) => x.publicRepos));

  return (
    <>
      {/* SIDE PANEL */}
      <div style={{
        position:   'fixed',
        top:        0,
        right:      0,
        width:      '360px',
        height:     '100vh',
        background: 'rgba(8, 5, 20, 0.97)',
        borderLeft: '2px solid #f5c518',
        transform:  isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        zIndex:     1000,
        overflowY:  'auto',
        fontFamily: FONT,
        display:    'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#f5c518', fontSize: '10px', letterSpacing: '0.1em' }}>
            DEV PROFILE
          </span>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', color: '#f5c518', cursor: 'pointer', fontSize: '18px', fontFamily: 'monospace' }}
          >×</button>
        </div>

        {!u && !loadingProfile && (
          <div style={{ color: '#666', fontSize: '8px', padding: '20px', textAlign: 'center' }}>
            NO DATA
          </div>
        )}

        {loadingProfile && !u && (
          <div style={{ color: '#f5c518', fontSize: '8px', padding: '20px', textAlign: 'center' }}>
            LOADING...
          </div>
        )}

        {u && (
          <div style={{ padding: '16px', flex: 1 }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {u.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatarUrl}
                  alt={u.login}
                  width={56}
                  height={56}
                  style={{ imageRendering: 'pixelated', borderRadius: '4px', border: '2px solid #f5c518' }}
                />
              )}
              <div>
                <div style={{ color: '#f5c518', fontSize: '10px', marginBottom: '4px' }}>
                  {u.login}
                </div>
                {'name' in u && (u as CityUser).name && (u as CityUser).name !== u.login && (
                  <div style={{ color: '#aaa', fontSize: '7px' }}>{(u as CityUser).name}</div>
                )}
              </div>
            </div>

            {/* Bio */}
            {'bio' in u && (u as CityUser).bio && (
              <div style={{ color: '#ccc', fontSize: '7px', lineHeight: 1.8, marginBottom: '12px',
                background: 'rgba(255,255,255,0.04)', padding: '8px', borderLeft: '2px solid #f5c51855' }}>
                {(u as CityUser).bio}
              </div>
            )}

            {/* Location / Company */}
            {'location' in u && ((u as CityUser).location || (u as CityUser).company) && (
              <div style={{ color: '#888', fontSize: '7px', marginBottom: '12px', lineHeight: 2 }}>
                {(u as CityUser).location && <div>📍 {(u as CityUser).location}</div>}
                {(u as CityUser).company && <div>🏢 {(u as CityUser).company}</div>}
              </div>
            )}

            {/* Building info */}
            <div style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid #f5c51844',
              padding: '10px', marginBottom: '12px' }}>
              <div style={{ color: '#f5c518', fontSize: '8px', marginBottom: '6px' }}>🧱 BUILDING</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '7px', color: '#ccc' }}>
                <span>Rank: #{u.cityRank}</span>
                <span>Tier: {getTier(u.cityRank)}</span>
                <span>Score: {u.totalScore?.toLocaleString()}</span>
                <span>Slot: #{u.citySlot}</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'REPOS',     value: u.publicRepos ?? 0 },
                { label: 'STARS',     value: u.totalStars ?? 0 },
                { label: 'COMMITS~',  value: u.estimatedCommits ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid #f5c51844',
                  padding: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#f5c518', fontSize: '8px', marginBottom: '4px' }}>{label}</div>
                  <div style={{ color: '#fff', fontSize: '9px' }}>{value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Language badge */}
            {u.topLanguage && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid #f5c518',
                  color: '#f5c518', padding: '4px 8px', fontSize: '7px' }}>
                  {u.topLanguage}
                </span>
              </div>
            )}

            {/* Top repos (only available on full CityUser) */}
            {'topRepos' in u && (u as CityUser).topRepos && (u as CityUser).topRepos.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#f5c518', fontSize: '8px', marginBottom: '8px' }}>TOP REPOS</div>
                {(u as CityUser).topRepos.slice(0, 5).map((repo) => (
                  <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid #333', padding: '8px', marginBottom: '6px',
                      textDecoration: 'none', color: '#ccc', fontSize: '7px', lineHeight: 1.8 }}>
                    <div style={{ color: '#4cc9f0' }}>⬡ {repo.name}</div>
                    <div style={{ color: '#888' }}>⭐ {(repo.stars || 0).toLocaleString()} · {repo.language || '?'}</div>
                    {repo.description && (
                      <div style={{ color: '#666', marginTop: '2px', fontSize: '6px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {repo.description}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* GitHub link */}
            <a
              href={`https://github.com/${encodeURIComponent(u.login)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', background: '#f5c518', color: '#000',
                padding: '10px', fontSize: '8px', textDecoration: 'none', letterSpacing: '0.1em',
                fontFamily: FONT, marginTop: 'auto',
              }}
            >
              VIEW ON GITHUB →
            </a>
          </div>
        )}
      </div>

      {/* Dark overlay on LEFT side */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, right: '360px',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 999,
          }}
        />
      )}
    </>
  );
}
