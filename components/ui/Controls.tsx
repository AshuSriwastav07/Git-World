// Controls — collapsible keyboard shortcuts panel
'use client';

import { useState } from 'react';

const FONT = "'Press Start 2P', monospace";

const CONTROLS = [
  { key: 'Left Drag', action: 'Rotate camera' },
  { key: 'Right Drag', action: 'Pan camera' },
  { key: 'Scroll', action: 'Zoom in/out' },
  { key: 'W A S D', action: 'Pan move' },
  { key: 'Shift', action: 'Fast pan' },
  { key: 'F', action: 'Airplane mode' },
  { key: 'N', action: 'Night toggle' },
  { key: 'R', action: 'Open Rankings' },
  { key: 'Click', action: 'Open profile' },
  { key: 'Escape', action: 'Close panel' },
];

const AIRPLANE_CONTROLS = [
  { key: 'W / S', action: 'Throttle' },
  { key: 'A / D', action: 'Turn L/R' },
  { key: 'Q / E', action: 'Pitch U/D' },
  { key: 'Shift', action: 'Speed boost' },
  { key: 'F / Esc', action: 'Exit flight' },
];

export function Controls() {
  const [open, setOpen] = useState(false);

  return (
    <div className="select-none">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 bg-[#0d0d1acc] border-2 border-[#555] text-[10px] text-white flex items-center justify-center hover:border-[#888] transition-colors"
        style={{ fontFamily: FONT }}
        title="Controls"
      >
        ℹ
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-[#0d0d1af0] border-2 border-[#555] p-3 w-[240px]">
          <h3 className="text-[8px] text-[#fbbf24] mb-2" style={{ fontFamily: FONT }}>
            CONTROLS
          </h3>
          {CONTROLS.map((c) => (
            <div key={c.key} className="flex justify-between py-[2px]">
              <span className="text-[6px] text-[#aaa]" style={{ fontFamily: FONT }}>
                {c.key}
              </span>
              <span className="text-[6px] text-[#666]" style={{ fontFamily: FONT }}>
                {c.action}
              </span>
            </div>
          ))}
          <h3 className="text-[8px] text-[#fbbf24] mt-2 mb-1" style={{ fontFamily: FONT }}>
            AIRPLANE
          </h3>
          {AIRPLANE_CONTROLS.map((c) => (
            <div key={c.key} className="flex justify-between py-[2px]">
              <span className="text-[6px] text-[#aaa]" style={{ fontFamily: FONT }}>
                {c.key}
              </span>
              <span className="text-[6px] text-[#666]" style={{ fontFamily: FONT }}>
                {c.action}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
