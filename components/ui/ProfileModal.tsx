// ProfileModal — developer profile popup with stats, repos, buttons
'use client';

import { useCityStore } from '@/lib/cityStore';
import { getLanguageColor } from '@/types';
import { useEffect, useCallback, useState } from 'react';
import { slotToWorld, getTier } from '@/lib/cityLayout';
import { loadUserProfile } from '@/lib/firestore';

const FONT = "'Press Start 2P', monospace";

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[8px] text-[#ccc] mb-1" style={{ fontFamily: FONT }}>
        <span>{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-3 bg-[#333] border border-[#555]">
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ActivityBadge({ activity }: { activity: number }) {
  if (activity >= 70) return <span className="text-[#4ade80] text-[8px]" style={{ fontFamily: FONT }}>⚡ Very Active</span>;
  if (activity >= 30) return <span className="text-[#fbbf24] text-[8px]" style={{ fontFamily: FONT }}>● Active</span>;
  return <span className="text-[#888] text-[8px]" style={{ fontFamily: FONT }}>○ Quiet</span>;
}

export function ProfileModal() {
  const selectedUser = useCityStore((s) => s.selectedUser);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const setFlyToTarget = useCityStore((s) => s.setFlyToTarget);
  const addUser = useCityStore((s) => s.addUser);
  const users = useCityStore((s) => s.users);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const close = useCallback(() => setSelectedUser(null), [setSelectedUser]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Lazy load full profile if missing key data
  useEffect(() => {
    if (!selectedUser) return;
    const hasFullProfile = selectedUser.topRepos && selectedUser.topRepos.length > 0;
    if (hasFullProfile) return;

    let cancelled = false;
    setLoadingProfile(true);
    loadUserProfile(selectedUser.login).then((full) => {
      if (cancelled || !full) { setLoadingProfile(false); return; }
      addUser(full);
      setLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [selectedUser?.login]);

  if (!selectedUser) return null;

  const u = selectedUser;
  const langColor = getLanguageColor(u.topLanguage);
  const tier = getTier(u.cityRank);
  const tierNames: Record<number, string> = {
    1: 'SKYSCRAPER',
    2: 'TOWER',
    3: 'TALL BUILDING',
    4: 'STANDARD',
    5: 'SMALL BUILDING',
  };

  // Get max stats for bar scaling
  const allUsers = Array.from(users.values());
  const maxCommits = Math.max(1, ...allUsers.map((x) => x.estimatedCommits));
  const maxStars = Math.max(1, ...allUsers.map((x) => x.totalStars));
  const maxRepos = Math.max(1, ...allUsers.map((x) => x.publicRepos));
  const maxFollowers = Math.max(1, ...allUsers.map((x) => x.followers));

  const world = slotToWorld(u.citySlot);

  const handleFlyTo = () => {
    setFlyToTarget({ x: world.x, y: 0, z: world.z });
    close();
  };

  const joinYear = new Date(u.createdAt).getFullYear();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={close}>
      <div
        className="relative w-[380px] max-h-[85vh] overflow-y-auto bg-[#1a1a2e] p-5"
        style={{
          border: `4px solid ${langColor}`,
          boxShadow: `0 0 20px ${langColor}44`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-2 right-2 w-7 h-7 bg-[#cc342d] text-white text-[10px] flex items-center justify-center hover:bg-[#e53e35] transition-colors"
          style={{ fontFamily: FONT }}
        >
          X
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <img
            src={u.avatarUrl}
            alt={u.login}
            className="w-16 h-16 border-2 border-[#555]"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm text-white truncate" style={{ fontFamily: FONT }}>
              {u.login}
            </h2>
            {u.name && (
              <p className="text-[8px] text-[#aaa] mt-1" style={{ fontFamily: FONT }}>
                {u.name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span
                className="px-2 py-1 text-[7px] text-white"
                style={{ fontFamily: FONT, backgroundColor: langColor }}
              >
                {u.topLanguage || 'Unknown'}
              </span>
              <ActivityBadge activity={u.recentActivity} />
            </div>
          </div>
        </div>

        {/* Bio + Info */}
        {u.bio && (
          <p className="text-[8px] text-[#ccc] mb-3 leading-relaxed" style={{ fontFamily: FONT }}>
            {u.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[7px] text-[#888]" style={{ fontFamily: FONT }}>
          {u.location && <span>📍 {u.location}</span>}
          {u.company && <span>🏢 {u.company}</span>}
          <span>📅 Joined {joinYear}</span>
        </div>

        {/* Building Info */}
        <div className="bg-[#0d0d1a] border border-[#333] p-3 mb-3">
          <h3 className="text-[8px] text-[#fbbf24] mb-2" style={{ fontFamily: FONT }}>
            🧱 BUILDING INFO
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[7px] text-[#ccc]" style={{ fontFamily: FONT }}>
            <span>Type: {tierNames[tier]}</span>
            <span>Rank: #{u.cityRank}</span>
            <span>Slot: #{u.citySlot}</span>
            <span>Score: {u.totalScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Stats bars */}
        <div className="mb-3">
          <StatBar label="COMMITS" value={u.estimatedCommits} max={maxCommits} color="#4ade80" />
          <StatBar label="STARS" value={u.totalStars} max={maxStars} color="#fbbf24" />
          <StatBar label="REPOS" value={u.publicRepos} max={maxRepos} color="#3178c6" />
          <StatBar label="FOLLOWERS" value={u.followers} max={maxFollowers} color="#a97bff" />
        </div>

        {/* Top Repos */}
        {loadingProfile && (
          <p className="text-[8px] text-[#888] text-center mb-3" style={{ fontFamily: FONT }}>
            Loading full profile...
          </p>
        )}
        {u.topRepos && u.topRepos.length > 0 && (
          <div className="mb-3">
            <h3 className="text-[8px] text-[#fbbf24] mb-2" style={{ fontFamily: FONT }}>
              📦 TOP REPOSITORIES
            </h3>
            <div className="space-y-2">
              {u.topRepos.slice(0, 5).map((repo) => (
                <a
                  key={repo.name}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#0d0d1a] border border-[#333] p-2 hover:border-[#555] transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-[#4ade80] truncate" style={{ fontFamily: FONT }}>
                      {repo.name}
                    </span>
                    <span className="text-[7px] text-[#888] flex-shrink-0 ml-2" style={{ fontFamily: FONT }}>
                      ⭐{repo.stars} 🍴{repo.forks}
                    </span>
                  </div>
                  {repo.description && (
                    <p className="text-[7px] text-[#666] mt-1 line-clamp-2" style={{ fontFamily: FONT }}>
                      {repo.description}
                    </p>
                  )}
                  {repo.language && (
                    <span
                      className="inline-block mt-1 px-1 text-[6px] text-white"
                      style={{ fontFamily: FONT, backgroundColor: getLanguageColor(repo.language) }}
                    >
                      {repo.language}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <a
            href={`https://github.com/${encodeURIComponent(u.login)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2 bg-[#238636] text-white text-[8px] hover:bg-[#2ea043] transition-colors border-2 border-[#2ea043]"
            style={{ fontFamily: FONT }}
          >
            View on GitHub →
          </a>
          <button
            onClick={handleFlyTo}
            className="flex-1 py-2 bg-[#3178c6] text-white text-[8px] hover:bg-[#4490e2] transition-colors border-2 border-[#4490e2]"
            style={{ fontFamily: FONT }}
          >
            Fly to Building
          </button>
        </div>

        {/* Freshness */}
        <p className="text-[6px] text-[#555] mt-3 text-center" style={{ fontFamily: FONT }}>
          Data refreshed {Math.round((Date.now() - u.lastUpdatedAt) / 60000)} minutes ago
        </p>
      </div>
    </div>
  );
}
