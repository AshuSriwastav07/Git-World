// AirplaneHUD — altitude, speed, heading, throttle display
'use client';

import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

export function AirplaneHUD() {
  const isAirplaneMode = useCityStore((s) => s.isAirplaneMode);

  if (!isAirplaneMode) return null;

  // HUD shows static labels; actual values update via the Airplane component's internal state
  // For simplicity, we show control hints here. The airplane component handles physics.
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 flex gap-4 select-none pointer-events-none">
      <div className="bg-[#0d0d1acc] border-2 border-[#fbbf24] px-3 py-2">
        <p className="text-[7px] text-[#fbbf24] text-center mb-1" style={{ fontFamily: FONT }}>
          ✈️ AIRPLANE MODE
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[6px] text-[#aaa]" style={{ fontFamily: FONT }}>
          <span>W/S: Throttle</span>
          <span>A/D: Turn</span>
          <span>Q/E: Pitch</span>
          <span>Shift: Boost</span>
          <span>F: Exit</span>
          <span>Click: Info</span>
        </div>
      </div>
    </div>
  );
}
