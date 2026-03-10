// CinematicIntro — 25-second cinematic intro (5 screens)
// Pure HTML/CSS overlay. No Three.js. Canvas mounts at ~15s behind this overlay.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useCityStore } from '@/lib/cityStore';

/* ── Timing constants (seconds) ── */
const SCREEN_TIMES = {
  darkness:   { start: 0,    end: 2.5 },  // Screen 1: breath glow
  quote:      { start: 2.5,  end: 10  },   // Screen 2: typewriter quote
  numbers:    { start: 10,   end: 16  },   // Screen 3: count-up stats
  creator:    { start: 16,   end: 21  },   // Screen 4: GIT WORLD title
  descent:    { start: 21,   end: 25  },   // Screen 5: fade out to city
} as const;

const TOTAL_DURATION = 25;
const CANVAS_MOUNT_AT = 15; // Mount Canvas behind overlay at this second

const QUOTE_TEXT = "Every line of code is a brick. Every developer, an architect. Together, they built a city.";

/* ── Typewriter hook ── */
function useTypewriter(text: string, active: boolean, charDelay = 45) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) { setDisplayed(''); indexRef.current = 0; return; }
    indexRef.current = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      indexRef.current++;
      if (indexRef.current > text.length) { clearInterval(timer); return; }
      setDisplayed(text.slice(0, indexRef.current));
    }, charDelay);
    return () => clearInterval(timer);
  }, [text, active, charDelay]);

  return displayed;
}

/* ── Smooth screen crossfade helper ── */
function screenOpacity(elapsed: number, start: number, end: number): number {
  const fadeIn = 0.4, fadeOut = 0.4;
  if (elapsed < start) return 0;
  if (elapsed >= end) return 0;
  const inT = Math.min((elapsed - start) / fadeIn, 1);
  const outT = Math.min((end - elapsed) / fadeOut, 1);
  return Math.min(inT, outT);
}

/* ── Count-up hook ── */
function useCountUp(target: number, active: boolean, durationMs = 2500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);

  return value;
}

/* ── Get current screen from elapsed time ── */
function getScreen(elapsed: number): keyof typeof SCREEN_TIMES | null {
  for (const [key, { start, end }] of Object.entries(SCREEN_TIMES)) {
    if (elapsed >= start && elapsed < end) return key as keyof typeof SCREEN_TIMES;
  }
  return null;
}

/* ── Props ── */
interface CinematicIntroProps {
  onRequestCanvas: () => void;   // Called at ~15s to mount Canvas
  onComplete: () => void;        // Called at ~25s (intro done)
  dataReady: boolean;            // Whether city data has loaded
}

export function CinematicIntro({ onRequestCanvas, onComplete, dataReady }: CinematicIntroProps) {
  const startTimeRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [screen, setScreen] = useState<keyof typeof SCREEN_TIMES | null>('darkness');
  const [fadingOut, setFadingOut] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRequested = useRef(false);
  const completeSignaled = useRef(false);
  const rafRef = useRef(0);

  const users = useCityStore(s => s.users);
  const userCount = users.size;

  // Start the clock
  useEffect(() => {
    startTimeRef.current = performance.now();
    const tick = () => {
      const now = performance.now();
      const secs = (now - startTimeRef.current) / 1000;
      setElapsed(secs);
      setScreen(getScreen(secs));

      // Mount Canvas behind overlay
      if (secs >= CANVAS_MOUNT_AT && !canvasRequested.current) {
        canvasRequested.current = true;
        onRequestCanvas();
      }

      // Signal completion
      if (secs >= TOTAL_DURATION && !completeSignaled.current) {
        completeSignaled.current = true;
        onComplete();
        // Let fade finish then unmount
        setTimeout(() => setDone(true), 600);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onRequestCanvas, onComplete]);

  // Start fade-out at descent screen
  useEffect(() => {
    if (elapsed >= SCREEN_TIMES.descent.start && !fadingOut) {
      setFadingOut(true);
    }
  }, [elapsed, fadingOut]);

  // ── Derived state ──
  const quoteActive = screen === 'quote';
  const numbersActive = screen === 'numbers';

  const typedQuote = useTypewriter(QUOTE_TEXT, quoteActive, 65);
  const devCount = useCountUp(userCount || 4500, numbersActive, 2200);
  const buildingCount = useCountUp(userCount || 4500, numbersActive, 2500);
  const langCount = useCountUp(38, numbersActive, 1800);

  // Don't render after fade completes
  if (done) return null;

  const overlayOpacity = fadingOut
    ? Math.max(0, 1 - (elapsed - SCREEN_TIMES.descent.start) / (SCREEN_TIMES.descent.end - SCREEN_TIMES.descent.start))
    : 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#000',
        opacity: fadingOut ? Math.max(0, overlayOpacity) : 1,
        transition: fadingOut ? 'opacity 1.5s ease-out' : 'none',
        pointerEvents: fadingOut && overlayOpacity < 0.1 ? 'none' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar (thin line at bottom) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2, zIndex: 1010,
        width: `${Math.min((elapsed / TOTAL_DURATION) * 100, 100)}%`,
        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
        transition: 'width 0.3s linear',
      }} />

      {/* ═══════ SCREEN 1: DARKNESS (0-2.5s) ═══════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: screenOpacity(elapsed, SCREEN_TIMES.darkness.start, SCREEN_TIMES.darkness.end),
        transition: 'opacity 0.4s ease-out',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#fbbf24',
          boxShadow: '0 0 40px 20px rgba(251,191,36,0.15)',
          animation: 'introBreath 2s ease-in-out infinite',
        }} />
      </div>

      {/* ═══════ SCREEN 2: QUOTE (2.5-10s) ═══════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 10%',
        opacity: screenOpacity(elapsed, SCREEN_TIMES.quote.start, SCREEN_TIMES.quote.end),
        transition: 'opacity 0.4s ease-out',
        pointerEvents: 'none',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 700 }}>
          <p style={{
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            fontSize: 'clamp(14px, 2.5vw, 22px)',
            color: '#e0e0e0',
            lineHeight: 1.8,
            letterSpacing: '0.02em',
            minHeight: '4em',
          }}>
            &ldquo;{typedQuote}&rdquo;
            {quoteActive && typedQuote.length < QUOTE_TEXT.length && (
              <span style={{
                display: 'inline-block', width: 2, height: '1em',
                background: '#fbbf24', marginLeft: 2,
                animation: 'introBlink 0.6s step-end infinite',
              }} />
            )}
          </p>
        </div>
      </div>

      {/* ═══════ SCREEN 3: NUMBERS (10-16s) ═══════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: screenOpacity(elapsed, SCREEN_TIMES.numbers.start, SCREEN_TIMES.numbers.end),
        transition: 'opacity 0.4s ease-out',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', gap: 'clamp(24px, 6vw, 80px)',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { value: devCount, label: 'DEVELOPERS', suffix: '+' },
            { value: buildingCount, label: 'BUILDINGS', suffix: '' },
            { value: langCount, label: 'LANGUAGES', suffix: '+' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', animation: `introFadeInUp 0.6s ${i * 0.2}s both` }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 'clamp(24px, 5vw, 56px)',
                color: '#fbbf24',
                letterSpacing: '0.05em',
              }}>
                {stat.value.toLocaleString()}{stat.suffix}
              </div>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 'clamp(7px, 1.2vw, 10px)',
                color: '#888',
                marginTop: 12,
                letterSpacing: '0.15em',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ SCREEN 4: CREATOR / TITLE (16-21s) ═══════ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: screenOpacity(elapsed, SCREEN_TIMES.creator.start, SCREEN_TIMES.creator.end),
        transition: 'opacity 0.4s ease-out',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 'clamp(28px, 5vw, 52px)',
          color: '#fbbf24',
          letterSpacing: '0.08em',
          textShadow: '0 0 60px rgba(251,191,36,0.4)',
          marginBottom: 24,
          animation: 'introFadeInUp 0.8s ease-out',
        }}>
          GIT WORLD
        </div>
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 'clamp(7px, 1vw, 9px)',
          color: '#666', letterSpacing: '0.2em',
          animation: 'introFadeInUp 0.8s 0.3s ease-out both',
        }}>
          BUILT BY ASHUSRIWASTAV07
        </div>
        <div style={{
          width: 60, height: 2,
          background: '#333', marginTop: 32,
          animation: 'introFadeInUp 0.8s 0.5s ease-out both',
        }} />
      </div>

      {/* ═══════ SCREEN 5: DESCENT (21-25s) — fades out revealing city ═══════ */}
      {fadingOut && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 'clamp(8px, 1.2vw, 11px)',
            color: `rgba(251,191,36,${Math.max(0, overlayOpacity)})`,
            letterSpacing: '0.25em',
          }}>
            ENTERING THE CITY
          </div>
        </div>
      )}

      {/* ═══════ CSS keyframes ═══════ */}
      <style>{`
        @keyframes introBreath {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes introBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes introFadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
