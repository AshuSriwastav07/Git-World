'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
import { HUD } from '@/components/ui/HUD';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
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
  const setActiveMode = useCityStore(s => s.setActiveMode);
  const setFlightMode = useCityStore(s => s.setFlightMode);
  const setRankChartOpen = useCityStore(s => s.setRankChartOpen);
  const activeMode = useCityStore(s => s.activeMode);
  const introStage = useCityStore(s => s.introStage);

  const enteredCity = useRef(false);
  const [dataReady, setDataReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingDismissed, setLoadingDismissed] = useState(false);

  // Load data, then mount canvas, then show menu
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
      setLoading(false);
      setLoadingProgress(100, 'City ready!');
      setDataReady(true);

      // Skip intro — go straight to done + menu
      setIntroStage('done');
      setActiveMode('menu');

      // Small delay then hide loading screen
      setTimeout(() => {
        if (!cancelled) setShowLoading(false);
      }, 600);

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

  // Callback when loading screen fade-out animation completes
  const handleLoadingFadeComplete = useCallback(() => {
    setLoadingDismissed(true);
  }, []);

  // Mode menu selection handler
  const handleModeSelect = useCallback((mode: ActiveMode) => {
    setActiveMode(mode);
    if (mode === 'fly') {
      setFlightMode(true);
    } else if (mode === 'leaderboard') {
      setRankChartOpen(true);
    }
  }, [setActiveMode, setFlightMode, setRankChartOpen]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Canvas mounts once data is ready */}
      {dataReady && <CityScene />}

      {/* HUD shows after intro is done */}
      <HUD />

      {/* Mode selection menu */}
      <ModeMenu
        visible={introStage === 'done' && activeMode === 'menu'}
        onSelect={handleModeSelect}
      />

      {/* Loading screen — on top of everything */}
      {!loadingDismissed && (
        <LoadingScreen
          visible={showLoading}
          onFadeComplete={handleLoadingFadeComplete}
        />
      )}
    </div>
  );
}
