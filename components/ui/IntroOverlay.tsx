// IntroOverlay — 6-stage cinematic intro: black → logo → city → burst → buttons → done
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

/* Stage timing (ms from stage start) */
const LOGO_HOLD   = 2200;   // Show logo before city starts
const CITY_HOLD   = 5500;   // Camera sweep + building rise
const BURST_HOLD  = 1800;   // Particle burst / fireworks
const BUTTON_AUTO = 15000;  // Auto-dismiss buttons after 15s

export function IntroOverlay() {
  const introStage    = useCityStore(s => s.introStage);
  const setIntroStage = useCityStore(s => s.setIntroStage);
  const isLoading     = useCityStore(s => s.isLoading);
  const totalLoaded   = useCityStore(s => s.users.size);

  const [opacity, setOpacity] = useState(1);
  const [logoVisible, setLogoVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timerRef.current.forEach(clearTimeout); timerRef.current = []; };

  /* ── Transition from 'black' → 'logo' when data loads ── */
  useEffect(() => {
    if (introStage === 'black' && !isLoading && totalLoaded > 30) {
      setIntroStage('logo');
    }
  }, [introStage, isLoading, totalLoaded, setIntroStage]);

  /* ── Stage transitions ── */
  useEffect(() => {
    clearTimers();

    if (introStage === 'logo') {
      // Fade in logo
      const t1 = setTimeout(() => setLogoVisible(true), 200);
      const t2 = setTimeout(() => setSubtitleVisible(true), 800);
      // After hold → city
      const t3 = setTimeout(() => setIntroStage('city'), LOGO_HOLD);
      timerRef.current.push(t1, t2, t3);
    }

    if (introStage === 'city') {
      // Overlay fades to transparent so city is visible
      const t1 = setTimeout(() => setOpacity(0), 600);
      // After sweep → burst
      const t2 = setTimeout(() => setIntroStage('burst'), CITY_HOLD);
      timerRef.current.push(t1, t2);
    }

    if (introStage === 'burst') {
      // Brief pause then show buttons
      const t1 = setTimeout(() => setIntroStage('buttons'), BURST_HOLD);
      timerRef.current.push(t1);
    }

    if (introStage === 'buttons') {
      // Auto-dismiss after timeout
      const t1 = setTimeout(() => setIntroStage('done'), BUTTON_AUTO);
      timerRef.current.push(t1);
    }

    return clearTimers;
  }, [introStage, setIntroStage]);

  /* ── Skip intro ── */
  const skipIntro = () => {
    clearTimers();
    setOpacity(0);
    setIntroStage('done');
  };

  // Don't render after 'done' or during button stage (IntroButtons handles that)
  if (introStage === 'done') return null;
  if (introStage === 'buttons') return null;

  const showBlackBg = introStage === 'black' || introStage === 'logo';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      onClick={skipIntro}
      style={{
        background: showBlackBg ? 'rgba(7, 5, 15, 0.95)' : 'transparent',
        opacity: showBlackBg ? 1 : opacity,
        transition: 'opacity 1.2s ease-out, background 1.5s ease-out',
        pointerEvents: showBlackBg ? 'auto' : 'none',
        cursor: showBlackBg ? 'pointer' : 'default',
      }}
    >
      {/* Loading indicator during 'black' */}
      {introStage === 'black' && (
        <div className="flex flex-col items-center gap-3">
          <p style={{ fontFamily: FONT, fontSize: '8px', color: '#555', letterSpacing: '3px' }}>
            LOADING {totalLoaded.toLocaleString()} BUILDINGS...
          </p>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-[#d4af37] rounded-full"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Logo during 'logo' & 'city' stages */}
      {(introStage === 'logo' || introStage === 'city') && (
        <div className="flex flex-col items-center">
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(28px, 6vw, 56px)',
              color: '#f5c518',
              textShadow: '0 0 40px rgba(245,197,24,0.6), 0 0 80px rgba(245,197,24,0.3)',
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
            }}
          >
            GIT WORLD
          </h1>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(6px, 1.5vw, 10px)',
              color: '#666',
              letterSpacing: '4px',
              marginTop: '12px',
              opacity: subtitleVisible ? 1 : 0,
              transition: 'opacity 1s ease-out 0.3s',
            }}
          >
            EVERY DEVELOPER HAS A BUILDING
          </p>
        </div>
      )}

      {/* Skip hint */}
      {showBlackBg && (
        <p
          className="absolute bottom-8 text-center"
          style={{ fontFamily: FONT, fontSize: '6px', color: '#444' }}
        >
          CLICK ANYWHERE TO SKIP
        </p>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
