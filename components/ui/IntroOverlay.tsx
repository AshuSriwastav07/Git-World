// IntroOverlay — Cinematic movie-style intro: loading → cinematic → buttons → done
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCityStore } from '@/lib/cityStore';

const FONT = "'Press Start 2P', monospace";

/* ── Timing ── */
const CINEMATIC_DURATION = 8000; // 8s cinematic (building rise + title reveal)
const BUTTON_AUTO = 10000;       // auto-dismiss buttons after 10s

/* ── Particle system ── */
function Particles({ count = 80 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      speed: 0.1 + Math.random() * 0.3,
      opacity: 0.1 + Math.random() * 0.5,
      delay: Math.random() * 5,
      hue: Math.random() > 0.7 ? 45 : 35,
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
            background: `hsla(${p.hue}, 90%, 55%, ${p.opacity})`,
            boxShadow: p.size > 2 ? `0 0 ${p.size * 2}px hsla(${p.hue}, 90%, 55%, 0.3)` : 'none',
            animation: `introFloatUp ${6 + p.speed * 8}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Minecraft-style block progress bar ── */
function ProgressBar({ progress }: { progress: number }) {
  const blocks = 20;
  const filled = Math.round((progress / 100) * blocks);

  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: blocks }, (_, i) => (
        <div
          key={i}
          style={{
            width: '10px',
            height: '10px',
            border: '1px solid #333',
            background: i < filled
              ? 'linear-gradient(135deg, #f5c518 0%, #d4a017 100%)'
              : 'rgba(255,255,255,0.04)',
            boxShadow: i < filled ? '0 0 6px rgba(245, 197, 24, 0.3)' : 'none',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

export function IntroOverlay() {
  const introStage       = useCityStore(s => s.introStage);
  const setIntroStage    = useCityStore(s => s.setIntroStage);
  const setIntroStartTime = useCityStore(s => s.setIntroStartTime);
  const isLoading        = useCityStore(s => s.isLoading);
  const totalLoaded      = useCityStore(s => s.users.size);
  const loadingProgress  = useCityStore(s => s.loadingProgress);

  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [text1Visible, setText1Visible] = useState(false);
  const [text2Visible, setText2Visible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [countVisible, setCountVisible] = useState(false);
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
      // Phase 1 (0.3–2.5s): "Entering the Developer Universe" + overlay fading
      const t0 = setTimeout(() => setText1Visible(true), 300);
      const t1 = setTimeout(() => setOverlayOpacity(0.5), 1000);
      const t2 = setTimeout(() => { setText1Visible(false); setOverlayOpacity(0.3); }, 2500);
      // Phase 2 (3.5–5.5s): "Where Code Becomes Skyline"
      const t3 = setTimeout(() => setText2Visible(true), 3500);
      const t4 = setTimeout(() => { setText2Visible(false); setOverlayOpacity(0.05); }, 5500);
      // Phase 3 (6–7.8s): Title reveal over transparent overlay (city visible behind)
      const t5 = setTimeout(() => { setTitleVisible(true); setOverlayOpacity(0); }, 6000);
      const t6 = setTimeout(() => setTaglineVisible(true), 6500);
      const t7 = setTimeout(() => setCountVisible(true), 7000);
      // Phase 4 (8s): → buttons
      const t8 = setTimeout(() => setIntroStage('buttons'), CINEMATIC_DURATION);
      timerRef.current.push(t0, t1, t2, t3, t4, t5, t6, t7, t8);
    }

    if (introStage === 'buttons') {
      setOverlayOpacity(0);
      setTitleVisible(false);
      setTaglineVisible(false);
      setCountVisible(false);
      const t1 = setTimeout(() => setIntroStage('done'), BUTTON_AUTO);
      timerRef.current.push(t1);
    }

    return clearTimers;
  }, [introStage, setIntroStage]);

  /* ── Skip intro on click ── */
  const skipIntro = () => {
    clearTimers();
    setOverlayOpacity(0);
    setTitleVisible(false);
    setIntroStage('done');
    useCityStore.getState().setIntroProgress(1);
    useCityStore.getState().setUserInteracted();
  };

  if (introStage === 'done') return null;
  if (introStage === 'buttons') return null;

  const showBackground = introStage === 'loading' || overlayOpacity > 0.2;

  return (
    <>
      {/* CSS keyframes */}
      <style>{`
        @keyframes introFloatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        @keyframes introGlowPulse {
          0%, 100% { text-shadow: 0 0 30px rgba(245,197,24,0.5), 0 0 80px rgba(245,197,24,0.2); }
          50% { text-shadow: 0 0 60px rgba(245,197,24,0.9), 0 0 120px rgba(245,197,24,0.4), 0 0 180px rgba(245,197,24,0.2); }
        }
        @keyframes introBlockPulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.25); }
        }
        @keyframes introSlideIn {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes introTitleReveal {
          0% { transform: scale(0.7) translateY(30px); opacity: 0; filter: blur(8px); }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
        onClick={skipIntro}
        style={{
          background: showBackground
            ? `radial-gradient(ellipse at center, rgba(12, 8, 24, ${Math.max(overlayOpacity * 0.95, 0)}) 0%, rgba(3, 1, 8, ${Math.max(overlayOpacity * 0.98, 0)}) 100%)`
            : 'transparent',
          transition: 'background 1.2s ease-out',
          pointerEvents: introStage === 'loading' || overlayOpacity > 0.1 || titleVisible ? 'auto' : 'none',
          cursor: introStage === 'loading' || overlayOpacity > 0.1 ? 'pointer' : 'default',
        }}
      >
        {/* Scan line effect */}
        {showBackground && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%)',
              backgroundSize: '100% 4px',
            }}
          />
        )}

        {/* Particles */}
        {showBackground && <Particles />}

        {/* Cinema letterbox bars during cinematic */}
        {introStage === 'cinematic' && (
          <>
            <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
              height: '10vh',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
              transition: 'opacity 1.5s ease',
              opacity: overlayOpacity > 0 ? 1 : 0.4,
            }} />
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
              height: '10vh',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
              transition: 'opacity 1.5s ease',
              opacity: overlayOpacity > 0 ? 1 : 0.4,
            }} />
          </>
        )}

        {/* ── LOADING STAGE ── */}
        {introStage === 'loading' && (
          <div className="flex flex-col items-center gap-5" style={{ animation: 'introSlideIn 0.8s ease-out' }}>
            {/* Animated skyline blocks */}
            <div className="flex items-end gap-[3px] h-20">
              {[20, 35, 25, 50, 30, 45, 20, 55, 35, 40, 25, 45, 30].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: `${h}px`,
                    background: `linear-gradient(to top, rgba(245,197,24,${0.3 + (h / 55) * 0.5}), rgba(245,197,24,${0.1 + (h / 55) * 0.3}))`,
                    animation: `introBlockPulse ${1.2 + (i % 3) * 0.3}s ease ${i * 0.08}s infinite`,
                    transformOrigin: 'bottom',
                    borderTop: '2px solid rgba(245,197,24,0.6)',
                  }}
                />
              ))}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: FONT,
              fontSize: 'clamp(14px, 3.5vw, 22px)',
              color: '#f5c518',
              letterSpacing: '6px',
              textShadow: '0 0 30px rgba(245,197,24,0.4), 0 0 60px rgba(245,197,24,0.15)',
            }}>
              GIT WORLD
            </h1>

            {/* Progress bar */}
            <div className="flex flex-col items-center gap-3 mt-1">
              <ProgressBar progress={loadingProgress} />
              <p style={{
                fontFamily: FONT,
                fontSize: '8px',
                color: '#f5c518',
                letterSpacing: '1px',
              }}>
                {loadingProgress}%
              </p>
            </div>

            {/* Developer count */}
            <p style={{
              fontFamily: FONT,
              fontSize: '7px',
              color: '#888',
              letterSpacing: '2px',
            }}>
              {totalLoaded > 0
                ? `${totalLoaded.toLocaleString()} DEVELOPERS DISCOVERED`
                : 'INITIALIZING...'}
            </p>

            {/* Loading dots */}
            <div className="flex gap-2 mt-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: '5px',
                    height: '5px',
                    background: '#f5c518',
                    animation: `introBlockPulse 1s ease ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── CINEMATIC STAGE ── */}
        {introStage === 'cinematic' && (
          <div className="flex flex-col items-center justify-center relative" style={{ minHeight: '200px' }}>
            {/* Text 1: "Entering the Developer Universe" */}
            <p
              className="absolute"
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(7px, 1.8vw, 12px)',
                color: '#f5c518',
                letterSpacing: text1Visible ? '6px' : '2px',
                opacity: text1Visible ? 1 : 0,
                transform: text1Visible ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
                transition: 'opacity 0.8s ease-out, transform 0.8s ease-out, letter-spacing 1.5s ease-out',
                textShadow: '0 0 40px rgba(245,197,24,0.6), 0 0 80px rgba(245,197,24,0.2)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Entering the Developer Universe
            </p>

            {/* Text 2: "Where Code Becomes Skyline" */}
            <p
              className="absolute"
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(7px, 1.8vw, 12px)',
                color: '#f5c518',
                letterSpacing: text2Visible ? '6px' : '2px',
                opacity: text2Visible ? 1 : 0,
                transform: text2Visible ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
                transition: 'opacity 0.8s ease-out, transform 0.8s ease-out, letter-spacing 1.5s ease-out',
                textShadow: '0 0 40px rgba(245,197,24,0.6), 0 0 80px rgba(245,197,24,0.2)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Where Code Becomes Skyline
            </p>

            {/* Title reveal: "GIT WORLD" over transparent city */}
            <div
              className="absolute flex flex-col items-center gap-4"
              style={{
                opacity: titleVisible ? 1 : 0,
                transform: titleVisible ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(30px)',
                filter: titleVisible ? 'blur(0)' : 'blur(8px)',
                transition: 'opacity 1s ease-out, transform 1s ease-out, filter 1s ease-out',
              }}
            >
              <h1
                style={{
                  fontFamily: FONT,
                  fontSize: 'clamp(36px, 8vw, 72px)',
                  color: '#f5c518',
                  animation: titleVisible ? 'introGlowPulse 2.5s ease-in-out infinite' : 'none',
                  letterSpacing: '8px',
                }}
              >
                GIT WORLD
              </h1>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 'clamp(6px, 1.4vw, 10px)',
                  color: '#d4a017',
                  letterSpacing: '3px',
                  opacity: taglineVisible ? 1 : 0,
                  transform: taglineVisible ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
                  textShadow: '0 0 20px rgba(245,197,24,0.3)',
                }}
              >
                {`"Where Code Builds Cities"`}
              </p>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: '7px',
                  color: '#888',
                  letterSpacing: '2px',
                  opacity: countVisible ? 1 : 0,
                  transform: countVisible ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
                }}
              >
                {totalLoaded.toLocaleString()} DEVELOPERS &bull; ONE CITY
              </p>
            </div>
          </div>
        )}

        {/* Skip hint */}
        {introStage === 'loading' && (
          <p
            className="absolute bottom-8 text-center"
            style={{ fontFamily: FONT, fontSize: '6px', color: '#333', letterSpacing: '2px' }}
          >
            CLICK ANYWHERE TO SKIP
          </p>
        )}

        {introStage === 'cinematic' && overlayOpacity > 0.1 && (
          <p
            className="absolute text-center"
            style={{
              bottom: '12vh',
              fontFamily: FONT,
              fontSize: '6px',
              color: '#444',
              letterSpacing: '2px',
              zIndex: 70,
            }}
          >
            CLICK TO SKIP
          </p>
        )}
      </div>
    </>
  );
}
