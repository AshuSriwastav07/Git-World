// LoadingScreen — black + gold pixel loading screen
'use client';

import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

export function LoadingScreen() {
  const isLoading = useCityStore((s) => s.isLoading);
  const progress = useCityStore((s) => s.loadingProgress);
  const message = useCityStore((s) => s.loadingMessage);
  const firebaseLoaded = useCityStore((s) => s.firebaseLoaded);
  const newDevsLoaded = useCityStore((s) => s.newDevsLoaded);
  const setLoading = useCityStore((s) => s.setLoading);
  const setLoadingProgress = useCityStore((s) => s.setLoadingProgress);

  if (!isLoading) return null;

  const totalLoaded = firebaseLoaded + newDevsLoaded;
  const pct = Math.min(progress, 100);
  const canEnter = totalLoaded >= 100;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ background: '#000' }}
    >
      {/* Title */}
      <h1
        className="text-3xl md:text-5xl mb-2"
        style={{
          fontFamily: FONT,
          color: '#d4af37',
          textShadow: '0 0 20px rgba(212,175,55,0.5)',
          animation: 'goldPulse 2s ease-in-out infinite',
        }}
      >
        GIT CITY
      </h1>
      <p
        className="text-[8px] md:text-[10px] mb-8"
        style={{ fontFamily: FONT, color: '#666', letterSpacing: '2px' }}
      >
        BUILDING THE SKYLINE...
      </p>

      {/* Pixel progress bar */}
      <div
        className="w-64 md:w-80 h-5 relative"
        style={{
          border: '2px solid #d4af37',
          background: '#111',
          imageRendering: 'pixelated',
        }}
      >
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #d4af37, #ffd700)',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Stats */}
      <p
        className="mt-3 text-[8px]"
        style={{ fontFamily: FONT, color: '#555' }}
      >
        {totalLoaded} buildings placed
      </p>
      <p
        className="mt-1 text-[7px]"
        style={{ fontFamily: FONT, color: '#444' }}
      >
        {message}
      </p>

      {/* Enter button when 100+ buildings */}
      {canEnter && (
        <button
          className="mt-6 px-6 py-2 transition-colors"
          style={{
            fontFamily: FONT,
            fontSize: '10px',
            color: '#000',
            background: '#d4af37',
            border: '2px solid #ffd700',
          }}
          onClick={() => {
            setLoadingProgress(100, 'City ready!');
            setLoading(false);
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ffd700'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#d4af37'; }}
        >
          ENTER CITY
        </button>
      )}

      {/* Auto-enter hint */}
      <p
        className="mt-4 text-[6px]"
        style={{ fontFamily: FONT, color: '#333' }}
      >
        {pct >= 100 ? 'READY' : 'LOADING...'}
      </p>

      <style jsx>{`
        @keyframes goldPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; text-shadow: 0 0 30px rgba(212,175,55,0.8); }
        }
      `}</style>
    </div>
  );
}
