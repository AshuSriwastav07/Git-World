'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
import { HUD } from '@/components/ui/HUD';
import { CinematicIntro } from '@/components/intro/CinematicIntro';
import { ModeMenu } from '@/components/ui/ModeMenu';
import { loadSlimCity, subscribeToNewUsers } from '@/lib/supabaseDb';
import { startDiscoveryStream } from '@/lib/cityStream';
import { useCityStore } from '@/lib/cityStore';
import type { ActiveMode } from '@/lib/cityStore';

const CityScene = dynamic(() => import('@/components/city/CityScene').then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const addUsers = useCityStore(s => s.addUsers);
  const addUser = useCityStore(s => s.addUser);
  const setLoading = useCityStore(s => s.setLoading);
  const setLoadingProgress = useCityStore(s => s.setLoadingProgress);
  const setIntroStage = useCityStore(s => s.setIntroStage);
  const setIntroStartTime = useCityStore(s => s.setIntroStartTime);
  const setActiveMode = useCityStore(s => s.setActiveMode);
  const setFlightMode = useCityStore(s => s.setFlightMode);
  const setRankChartOpen = useCityStore(s => s.setRankChartOpen);
  const activeMode = useCityStore(s => s.activeMode);
  const introStage = useCityStore(s => s.introStage);

  const enteredCity = useRef(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Phase 1: Load data in background immediately
  useEffect(() => {
    let cancelled = false;
    let stopStream: (() => void) | null = null;
    let realtimeChannel: ReturnType<typeof subscribeToNewUsers> | null = null;

    async function bootstrap() {
      setLoadingProgress(5, 'Loading city from Supabase...');
      let loaded = 0;
      await loadSlimCity((batch, totalSoFar) => {
        if (cancelled) return;
        addUsers(batch);
        loaded = totalSoFar;
        setLoadingProgress(
          Math.min(90, Math.round((totalSoFar / Math.max(totalSoFar + 500, 1000)) * 90)),
          `Loaded ${totalSoFar.toLocaleString()} buildings...`
        );
      });
      if (cancelled) return;

      setLoadingProgress(95, `${loaded.toLocaleString()} buildings placed!`);
      enteredCity.current = true;
      setLoadingProgress(100, 'City ready!');
      setLoading(false);
      setDataReady(true);

      // Subscribe to Supabase realtime
      if (!cancelled) {
        realtimeChannel = subscribeToNewUsers((user) => {
          if (!cancelled) addUser(user);
        });
      }

      // Stream NEW GitHub users — auto-close after 5 minutes
      if (!cancelled) {
        const STREAM_MAX_MS = 5 * 60 * 1000;
        stopStream = startDiscoveryStream(
          (user) => { if (!cancelled) addUser(user); },
          () => {},
          () => {},
        );
        setTimeout(() => {
          if (stopStream) { stopStream(); stopStream = null; }
        }, STREAM_MAX_MS);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (stopStream) stopStream();
      if (realtimeChannel) realtimeChannel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CinematicIntro signals: mount Canvas at ~15s
  const handleRequestCanvas = useCallback(() => {
    setShowCanvas(true);
    // Set to 'cinematic' so CityGrid builds at scaleY=0 (buildings hidden)
    setIntroStage('cinematic');
    setIntroStartTime(0); // Don't start rise yet
  }, [setIntroStage, setIntroStartTime]);

  // CinematicIntro signals: intro complete at ~25s — buildings rise now
  const handleIntroComplete = useCallback(() => {
    setIntroStage('cinematic');
    setIntroStartTime(Date.now());
    setTimeout(() => setShowIntro(false), 1200);
    // After rise animation (7s), mark done and show mode menu
    setTimeout(() => {
      setIntroStage('done');
      setActiveMode('menu');
    }, 7500);
  }, [setIntroStage, setIntroStartTime, setActiveMode]);

  // Mode menu selection handler
  const handleModeSelect = useCallback((mode: ActiveMode) => {
    setActiveMode(mode);
    if (mode === 'fly') {
      setFlightMode(true);
    } else if (mode === 'leaderboard') {
      setRankChartOpen(true);
    }
    // 'explore', 'trending', 'search' — just dismiss menu, HUD appears
  }, [setActiveMode, setFlightMode, setRankChartOpen]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Canvas mounts at second 60 behind intro overlay */}
      {showCanvas && <CityScene />}

      {/* HUD shows after intro is done */}
      <HUD />

      {/* Mode selection menu — visible when activeMode is 'menu' and intro is done */}
      <ModeMenu
        visible={introStage === 'done' && activeMode === 'menu'}
        onSelect={handleModeSelect}
      />

      {/* Cinematic intro overlay — on top of everything */}
      {showIntro && (
        <CinematicIntro
          onRequestCanvas={handleRequestCanvas}
          onComplete={handleIntroComplete}
          dataReady={dataReady}
        />
      )}
    </div>
  );
}
