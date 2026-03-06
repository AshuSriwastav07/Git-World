// TopFiveWidget — always-visible rank 1–5 widget
'use client';

import { useMemo } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { getLanguageColor } from '@/types';
import { slotToWorld } from '@/lib/cityLayout';

const FONT = "'Press Start 2P', monospace";

export function TopFiveWidget() {
  const users = useCityStore((s) => s.users);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const setFlyToTarget = useCityStore((s) => s.setFlyToTarget);

  const top5 = useMemo(() => {
    const all = Array.from(users.values());
    return all.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);
  }, [users]);

  if (top5.length === 0) return null;

  const handleClick = (login: string) => {
    const dev = users.get(login.toLowerCase());
    if (!dev) return;
    setSelectedUser(dev);
    const world = slotToWorld(dev.citySlot);
    setFlyToTarget({ x: world.x, y: 0, z: world.z });
  };

  return (
    <div className="bg-[#0d0d1aee] border-2 border-[#fbbf24] p-2 w-[180px] select-none">
      <h3 className="text-[7px] text-[#fbbf24] mb-2 text-center" style={{ fontFamily: FONT }}>
        🏆 TOP 5
      </h3>
      {top5.map((user, i) => {
        const langColor = getLanguageColor(user.topLanguage);
        return (
          <button
            key={user.login}
            onClick={() => handleClick(user.login)}
            className="w-full flex items-center gap-1 py-1 hover:bg-[#ffffff08] transition-colors text-left"
          >
            <span
              className="w-4 text-[8px] text-right"
              style={{
                fontFamily: FONT,
                color: i === 0 ? '#fbbf24' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666',
              }}
            >
              {i + 1}
            </span>
            <div
              className="w-2 h-2 flex-shrink-0"
              style={{ backgroundColor: langColor }}
            />
            <span
              className="text-[6px] text-white truncate flex-1"
              style={{ fontFamily: FONT }}
            >
              {user.login}
            </span>
            <span className="text-[5px] text-[#888]" style={{ fontFamily: FONT }}>
              {user.totalScore >= 1000
                ? `${(user.totalScore / 1000).toFixed(0)}k`
                : user.totalScore}
            </span>
          </button>
        );
      })}
    </div>
  );
}
