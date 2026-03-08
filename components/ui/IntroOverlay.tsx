// IntroOverlay — Cinematic movie-style intro: loading → cinematic → title → buttons → done
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

/* ── Timing ── */
const CINEMATIC_DURATION = 12000; // 12s cinematic building rise + camera sweep
const TITLE_HOLD = 3000;         // 3s title card
const BUTTON_AUTO = 10000;       // auto-dismiss buttons after 10s

/* ── Particle system for the background ── */
function Particles({ count = 60 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      speed: 0.1 + Math.random() * 0.3,
      opacity: 0.1 + Math.random() * 0.4,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.current.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `rgba(245, 197, 24, ${p.opacity})`,
            animation: `floatUp ${8 + p.speed * 10}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function IntroOverlay() {
  const introStage    = useCityStore(s => s.introStage);
  const setIntroStage = useCityStore(s => s.setIntroStage);
  const setIntroStartTime = useCityStore(s => s.setIntroStartTime);
  const isLoading     = useCityStore(s => s.isLoading);
  const totalLoaded   = useCityStore(s => s.users.size);

  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [titleVisible, setTitleVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [countVisible, setCountVisible] = useState(false);
  const [cinematicText, setCinematicText] = useState('');
  const [cinematicTextVisible, setCinematicTextVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timerRef.current.forEach(clearTimeout); timerRef.current = []; };

  /* ── loading → cinematic when data is ready ── */
  useEffect(() => {
    if (introStage === 'loading' && !isLoading && totalLoaded > 30) {
      setIntroStage('cinematic');
      setIntroStartTime(Date.now());
    }
  }, [introStage, isLoading, totalLoaded, setIntroStage, setIntroStartTime]);

  /* ── Stage transitions ── */
  useEffect(() => {
    clearTimers();

    if (introStage === 'cinematic') {
      // Phase 1: Show "Building Your World..." text (0-2s)
      const t0 = setTimeout(() => { setCinematicText('Building Your World...'); setCinematicTextVisible(true); }, 300);
      // Phase 2: Fade out that text (3s)
      const t1 = setTimeout(() => setCinematicTextVisible(false), 3000);
      // Phase 3: Show "Developers Rising..." (4-6s)
      const t2 = setTimeout(() => { setCinematicText('Developers Rising...'); setCinematicTextVisible(true); }, 4000);
      // Phase 4: Fade out (7s)
      const t3 = setTimeout(() => setCinematicTextVisible(false), 7000);
      // Phase 5: Fade overlay to see city (2s in) 
      const t4 = setTimeout(() => setOverlayOpacity(0.3), 2000);
      // Phase 6: Further fade (6s)
      const t5 = setTimeout(() => setOverlayOpacity(0.1), 6000);
      // Phase 7: Fully transparent (9s)
      const t6 = setTimeout(() => setOverlayOpacity(0), 9000);
      // Phase 8: Move to title stage (12s)
      const t7 = setTimeout(() => setIntroStage('title'), CINEMATIC_DURATION);
      timerRef.current.push(t0, t1, t2, t3, t4, t5, t6, t7);
    }

    if (introStage === 'title') {
      // Show big title card overlay
      setOverlayOpacity(0.85);
      const t0 = setTimeout(() => setTitleVisible(true), 200);
      const t1 = setTimeout(() => setTaglineVisible(true), 800);
      const t2 = setTimeout(() => setCountVisible(true), 1400);
      const t3 = setTimeout(() => setIntroStage('buttons'), TITLE_HOLD);
      timerRef.current.push(t0, t1, t2, t3);
    }

    if (introStage === 'buttons') {
      setOverlayOpacity(0);
      const t1 = setTimeout(() => setIntroStage('done'), BUTTON_AUTO);
      timerRef.current.push(t1);
    }

    return clearTimers;
  }, [introStage, setIntroStage]);

  /* ── Skip intro on click ── */
  const skipIntro = () => {
    clearTimers();
    setOverlayOpacity(0);
    setIntroStage('done');
    useCityStore.getState().setIntroProgress(1);
    useCityStore.getState().setUserInteracted();
  };

  if (introStage === 'done') return null;
  if (introStage === 'buttons') return null;

  const isOpaque = introStage === 'loading' || introStage === 'title';

  return (
    <>
      {/* CSS keyframes */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(245,197,24,0.4), 0 0 60px rgba(245,197,24,0.2); }
          50% { text-shadow: 0 0 40px rgba(245,197,24,0.8), 0 0 100px rgba(245,197,24,0.4), 0 0 150px rgba(245,197,24,0.2); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes buildingCount {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
        onClick={skipIntro}
        style={{
          background: isOpaque
            ? 'radial-gradient(ellipse at center, rgba(12, 8, 24, 0.95) 0%, rgba(3, 1, 8, 0.98) 100%)'
            : 'transparent',
          opacity: overlayOpacity,
          transition: 'opacity 1.5s ease-out, background 1.5s ease-out',
          pointerEvents: isOpaque ? 'auto' : 'none',
          cursor: isOpaque ? 'pointer' : 'default',
        }}
      >
        {/* Scan line effect */}
        {isOpaque && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%)',
              backgroundSize: '100% 4px',
            }}
          />
        )}

        {/* Particles */}
        {isOpaque && <Particles />}

        {/* ── LOADING STAGE ── */}
        {introStage === 'loading' && (
          <div className="flex flex-col items-center gap-6">
            {/* Animated building blocks */}
            <div className="flex items-end gap-1 h-16">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="w-3 bg-[#f5c518]"
                  style={{
                    height: `${15 + i * 7}px`,
                    animation: `buildingCount 0.6s ease ${i * 0.1}s infinite alternate`,
                    opacity: 0.4 + i * 0.08,
                  }}
                />
              ))}
            </div>
            <p style={{ fontFamily: FONT, fontSize: '10px', color: '#f5c518', letterSpacing: '3px' }}>
              GIT WORLD
            </p>
            <p style={{ fontFamily: FONT, fontSize: '7px', color: '#666', letterSpacing: '2px' }}>
              LOADING {totalLoaded.toLocaleString()} DEVELOPERS...
            </p>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-[#f5c518] rounded-sm"
                  style={{ animation: `buildingCount 0.8s ease ${i * 0.15}s infinite alternate` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── CINEMATIC STAGE — fading text over city ── */}
        {introStage === 'cinematic' && (
          <div className="flex flex-col items-center">
            <p
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(8px, 2vw, 14px)',
                color: '#f5c518',
                letterSpacing: '4px',
                opacity: cinematicTextVisible ? 1 : 0,
                transform: cinematicTextVisible ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
                transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
                textShadow: '0 0 30px rgba(245,197,24,0.5)',
              }}
            >
              {cinematicText}
            </p>
          </div>
        )}

        {/* ── TITLE STAGE — big reveal ── */}
        {introStage === 'title' && (
          <div className="flex flex-col items-center gap-4">
            <h1
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(32px, 7vw, 64px)',
                color: '#f5c518',
                opacity: titleVisible ? 1 : 0,
                transform: titleVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
                transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
                animation: titleVisible ? 'glowPulse 3s ease-in-out infinite' : 'none',
                letterSpacing: '6px',
              }}
            >
              GIT WORLD
            </h1>
            <p
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(6px, 1.6vw, 11px)',
                color: '#b8860b',
                letterSpacing: '3px',
                opacity: taglineVisible ? 1 : 0,
                transform: taglineVisible ? 'translateY(0)' : 'translateY(15px)',
                transition: 'opacity 1s ease-out 0.2s, transform 1s ease-out 0.2s',
              }}
            >
              {`"Feels like All Dev's Home at One Place"`}
            </p>
            <div
              style={{
                marginTop: '20px',
                opacity: countVisible ? 1 : 0,
                transform: countVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
                transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
              }}
            >
              <p style={{ fontFamily: FONT, fontSize: '8px', color: '#555', letterSpacing: '2px' }}>
                {totalLoaded.toLocaleString()} DEVELOPERS &bull; ONE CITY
              </p>
            </div>
          </div>
        )}

        {/* Skip hint */}
        {isOpaque && (
          <p
            className="absolute bottom-8 text-center"
            style={{ fontFamily: FONT, fontSize: '6px', color: '#444', letterSpacing: '2px' }}
          >
            CLICK ANYWHERE TO SKIP
          </p>
        )}
      </div>
    </>
  );
}
