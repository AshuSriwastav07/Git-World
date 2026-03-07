// RankChart — Top 100 sliding panel with 3 tabs
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { langColor } from '@/lib/textureGenerator';
import { slotToWorld } from '@/lib/cityLayout';

const FONT = "'Press Start 2P', monospace";

type Tab = 'all' | 'week' | 'newest';

export function RankChart() {
  const isOpen = useCityStore((s) => s.isRankChartOpen);
  const setOpen = useCityStore((s) => s.setRankChartOpen);
  const users = useCityStore((s) => s.users);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const setFlyTarget = useCityStore((s) => s.setFlyTarget);

  const [tab, setTab] = useState<Tab>('all');

  const allUsersArr = useMemo(() => Array.from(users.values()), [users]);

  const rankedUsers = useMemo(() => {
    let sorted = [...allUsersArr];

    switch (tab) {
      case 'all':
        sorted.sort((a, b) => b.totalScore - a.totalScore);
        break;
      case 'week':
        sorted.sort((a, b) => b.recentActivity - a.recentActivity);
        break;
      case 'newest':
        sorted.sort((a, b) =>
          (b.firstAddedAt || '').localeCompare(a.firstAddedAt || '')
        );
        break;
    }

    return sorted.slice(0, 100);
  }, [allUsersArr, tab]);

  const maxScore = rankedUsers[0]?.totalScore || 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setOpen]);

  const handleClick = (login: string) => {
    const dev = users.get(login.toLowerCase());
    if (!dev) return;
    setSelectedUser(dev);
    const world = slotToWorld(dev.citySlot);
    setFlyTarget({ x: world.x, y: 0, z: world.z });
    setOpen(false);
  };

  return (
    <div
      className="fixed top-0 right-0 h-full z-30 transition-transform duration-300 select-none"
      style={{
        width: 380,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        background: 'rgba(15, 15, 30, 0.95)',
        borderLeft: '3px solid #fbbf24',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#333]">
        <h2 className="text-[10px] text-[#fbbf24]" style={{ fontFamily: FONT }}>
          GIT WORLD TOP 100
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="w-6 h-6 bg-[#cc342d] text-white text-[8px] flex items-center justify-center hover:bg-[#e53e35]"
          style={{ fontFamily: FONT }}
        >
          X
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#333]">
        {(['all', 'week', 'newest'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-[7px] transition-colors"
            style={{
              fontFamily: FONT,
              color: tab === t ? '#fbbf24' : '#666',
              borderBottom: tab === t ? '2px solid #fbbf24' : '2px solid transparent',
              background: tab === t ? 'rgba(251,191,36,0.05)' : 'transparent',
            }}
          >
            {t === 'all' ? 'ALL TIME' : t === 'week' ? 'THIS WEEK' : 'NEWEST'}
          </button>
        ))}
      </div>

      {/* Rankings list */}
      <div className="overflow-y-auto" style={{ height: 'calc(100% - 90px)' }}>
        {rankedUsers.map((user, i) => {
          const lc = langColor(user.topLanguage);
          const scorePct = (user.totalScore / maxScore) * 100;
          const rank = i + 1;
          return (
            <button
              key={user.login}
              onClick={() => handleClick(user.login)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#ffffff08] transition-colors text-left"
            >
              {/* Rank */}
              <span
                className="w-8 text-right text-[9px] flex-shrink-0"
                style={{
                  fontFamily: FONT,
                  color: rank <= 3 ? '#fbbf24' : rank <= 10 ? '#c0c0c0' : '#666',
                }}
              >
                {rank}
              </span>

              {/* Avatar */}
              <img
                src={user.avatarUrl}
                alt=""
                className="w-6 h-6 flex-shrink-0 border border-[#444]"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white truncate" style={{ fontFamily: FONT }}>
                    {user.login}
                  </span>
                  <span
                    className="px-1 text-[5px] text-white flex-shrink-0"
                    style={{ fontFamily: FONT, backgroundColor: lc }}
                  >
                    {user.topLanguage || '?'}
                  </span>
                </div>
                {/* Score bar */}
                <div className="w-full h-[4px] bg-[#222] mt-1">
                  <div
                    className="h-full"
                    style={{ width: `${scorePct}%`, backgroundColor: lc }}
                  />
                </div>
              </div>

              {/* Score */}
              <span
                className="text-[7px] text-[#888] flex-shrink-0 w-12 text-right"
                style={{ fontFamily: FONT }}
              >
                {user.totalScore >= 1000
                  ? `${(user.totalScore / 1000).toFixed(1)}k`
                  : user.totalScore}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
