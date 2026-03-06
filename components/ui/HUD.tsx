// HUD — assembles all UI overlays
'use client';

import { useCityStore } from '@/lib/cityStore';
import { SearchBar } from './SearchBar';
import { ProfileModal } from './ProfileModal';
import { RankChart } from './RankChart';
import { MiniMap } from './MiniMap';
import { TopFiveWidget } from './TopFiveWidget';
import { LiveFeed } from './LiveFeed';
import { LoadingScreen } from './LoadingScreen';
import { AirplaneHUD } from './AirplaneHUD';
import { Controls } from './Controls';

const FONT = "'Press Start 2P', monospace";

export function HUD() {
  const users = useCityStore((s) => s.users);
  const isNightMode = useCityStore((s) => s.isNightMode);
  const toggleNightMode = useCityStore((s) => s.toggleNightMode);
  const setRankChartOpen = useCityStore((s) => s.setRankChartOpen);
  const isRankChartOpen = useCityStore((s) => s.isRankChartOpen);

  return (
    <>
      <LoadingScreen />
      <ProfileModal />
      <RankChart />
      <AirplaneHUD />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-[#0d0d1acc] border-b-2 border-[#333] select-none">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-[10px] md:text-[12px] text-[#4ade80]" style={{ fontFamily: FONT }}>
            🧱 MINECRAFT GITHUB CITY
          </h1>
        </div>
        {/* Center: user count */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[8px] text-[#aaa]" style={{ fontFamily: FONT }}>
            {users.size.toLocaleString()} devs
          </span>
          <span className="w-2 h-2 bg-[#cc342d] rounded-full animate-pulse" />
          <span className="text-[7px] text-[#cc342d]" style={{ fontFamily: FONT }}>
            LIVE
          </span>
        </div>
        {/* Right: buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRankChartOpen(!isRankChartOpen)}
            className="px-2 py-1 bg-[#1a1a2e] border-2 border-[#fbbf24] text-[#fbbf24] text-[8px] hover:bg-[#fbbf2411] transition-colors"
            style={{ fontFamily: FONT }}
          >
            RANKINGS
          </button>
          <button
            onClick={toggleNightMode}
            className="px-2 py-1 bg-[#1a1a2e] border-2 border-[#555] text-white text-[10px] hover:border-[#888] transition-colors"
            title={isNightMode ? 'Switch to Day' : 'Switch to Night'}
          >
            {isNightMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Bottom-left: minimap + controls */}
      <div className="fixed bottom-16 left-3 z-20 flex flex-col gap-2 select-none">
        <div className="relative">
          <Controls />
        </div>
        <MiniMap />
      </div>

      {/* Bottom-right: top 5 */}
      <div className="fixed bottom-16 right-3 z-20 select-none">
        <TopFiveWidget />
      </div>

      {/* Bottom center: search */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <SearchBar />
      </div>

      {/* Live feed ticker */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <LiveFeed />
      </div>

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
