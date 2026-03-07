// IntroButtons — Minecraft-style action panel shown after cinematic intro
'use client';

import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

interface ActionButton {
  label: string;
  icon: string;
  onClick: () => void;
}

export function IntroButtons() {
  const introStage    = useCityStore(s => s.introStage);
  const setIntroStage = useCityStore(s => s.setIntroStage);
  const toggleAirplaneMode = useCityStore(s => s.toggleAirplaneMode);
  const setRankChartOpen    = useCityStore(s => s.setRankChartOpen);
  const userCount           = useCityStore(s => s.users.size);

  if (introStage !== 'buttons') return null;

  const dismiss = () => setIntroStage('done');

  const buttons: ActionButton[] = [
    {
      label: 'EXPLORE CITY',
      icon: '🏙️',
      onClick: dismiss,
    },
    {
      label: 'AIRPLANE MODE',
      icon: '✈️',
      onClick: () => { toggleAirplaneMode(); dismiss(); },
    },
    {
      label: 'GITHUB REPO',
      icon: '⭐',
      onClick: () => {
        window.open('https://github.com/Ashusriwastav07/git-world', '_blank', 'noopener,noreferrer');
        dismiss();
      },
    },
    {
      label: 'TOP DEVS',
      icon: '🏆',
      onClick: () => { setRankChartOpen(true); dismiss(); },
    },
    {
      label: 'MY BUILDING',
      icon: '🔍',
      onClick: () => {
        dismiss();
        // Focus the search input after intro closes
        setTimeout(() => {
          const el = document.querySelector<HTMLInputElement>('input[placeholder*="Search"], input[placeholder*="search"]');
          if (el) el.focus();
        }, 300);
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none">
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(7,5,15,0.5) 0%, rgba(7,5,15,0.8) 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Title */}
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(10px, 2.5vw, 16px)',
            color: '#f5c518',
            textShadow: '0 0 20px rgba(245,197,24,0.4)',
            letterSpacing: '2px',
          }}
        >
          GIT WORLD
        </h2>

        {/* Building count */}
        <p
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(6px, 1.2vw, 8px)',
            color: '#888',
            letterSpacing: '1px',
          }}
        >
          {userCount.toLocaleString()} BUILDINGS LOADED
        </p>

        {/* Button grid */}
        <div className="flex flex-col gap-2 mt-2">
          {buttons.map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="group relative flex items-center gap-3 px-5 py-2.5 min-w-55
                         border-2 border-[#333] bg-[#0d0d1a]/90
                         hover:border-[#f5c518] hover:bg-[#1a1a2e]
                         transition-all duration-200"
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(6px, 1.2vw, 9px)',
                color: '#ccc',
                imageRendering: 'pixelated',
              }}
            >
              <span className="text-base">{btn.icon}</span>
              <span className="group-hover:text-[#f5c518] transition-colors">{btn.label}</span>
              {/* Pixel corner accents */}
              <span className="absolute top-0 left-0 w-1 h-1 bg-[#333] group-hover:bg-[#f5c518] transition-colors" />
              <span className="absolute top-0 right-0 w-1 h-1 bg-[#333] group-hover:bg-[#f5c518] transition-colors" />
              <span className="absolute bottom-0 left-0 w-1 h-1 bg-[#333] group-hover:bg-[#f5c518] transition-colors" />
              <span className="absolute bottom-0 right-0 w-1 h-1 bg-[#333] group-hover:bg-[#f5c518] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
