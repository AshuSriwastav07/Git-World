'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
import { HUD } from '@/components/ui/HUD';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ModeMenu } from '@/components/ui/ModeMenu';
import { loadSlimCity, subscribeToNewUsers } from '@/lib/supabaseDb';
import type { SlimUser } from '@/lib/supabaseDb';
import { startDiscoveryStream } from '@/lib/cityStream';
import { useCityStore } from '@/lib/cityStore';
import { getSessionCache, setSessionCache } from '@/lib/cityCache';
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
  const activeMode = useCityStore(s => s.activeMode);
  const introStage = useCityStore(s => s.introStage);

  const enteredCity = useRef(false);
  const cityReadyRef = useRef(false);
  const [dataReady, setDataReady] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingDismissed, setLoadingDismissed] = useState(false);

  // Canvas reports first frame rendered
  const handleCanvasReady = useCallback(() => {
    cityReadyRef.current = true;
    setCanvasReady(true);
  }, []);

  // Load data, then mount canvas, then show menu
  useEffect(() => {
    let cancelled = false;
    let stopStream: (() => void) | null = null;
    let realtimeChannel: ReturnType<typeof subscribeToNewUsers> | null = null;

    async function bootstrap() {
      setLoadingProgress(5, 'Loading city...');
      let loaded = 0;

      // Try sessionStorage cache first (instant)
      let snapshotOk = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cached = getSessionCache<any[]>();
      if (cached && cached.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batch: SlimUser[] = cached.map((r: any) => ({
          login:            r.login as string,
          citySlot:         (r.city_slot ?? r.citySlot ?? 0) as number,
          cityRank:         (r.city_rank ?? r.cityRank ?? 9999) as number,
          totalScore:       (r.total_score ?? r.totalScore ?? 0) as number,
          topLanguage:      (r.top_language ?? r.topLanguage ?? 'Unknown') as string,
          estimatedCommits: (r.estimated_commits ?? r.estimatedCommits ?? 0) as number,
          totalStars:       (r.total_stars ?? r.totalStars ?? 0) as number,
          publicRepos:      (r.public_repos ?? r.publicRepos ?? 0) as number,
          recentActivity:   (r.recent_activity ?? r.recentActivity ?? 0) as number,
          avatarUrl:        (r.avatar_url ?? r.avatarUrl ?? '') as string,
          firstAddedAt:     (r.first_added_at ?? r.firstAddedAt ?? '') as string,
        }));
        if (!cancelled && batch.length > 0) {
          addUsers(batch);
          loaded = batch.length;
          setLoadingProgress(35, `Loaded ${loaded.toLocaleString()} buildings (cached)...`);
          snapshotOk = true;
        }
      }

      // Try CDN snapshot (single request), fall back to paginated Supabase
      if (!snapshotOk) {
        try {
          const res = await fetch('/api/city/snapshot');
          if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows: any[] = await res.json();
            const batch: SlimUser[] = rows.map((r) => ({
              login:            r.login as string,
              citySlot:         (r.city_slot as number) ?? 0,
              cityRank:         (r.city_rank as number) ?? 9999,
              totalScore:       (r.total_score as number) ?? 0,
              topLanguage:      (r.top_language as string) ?? 'Unknown',
              estimatedCommits: (r.estimated_commits as number) ?? 0,
              totalStars:       (r.total_stars as number) ?? 0,
              publicRepos:      (r.public_repos as number) ?? 0,
              recentActivity:   (r.recent_activity as number) ?? 0,
              avatarUrl:        (r.avatar_url as string) ?? '',
              firstAddedAt:     (r.first_added_at as string) ?? '',
            }));
            if (!cancelled && batch.length > 0) {
              addUsers(batch);
              loaded = batch.length;
              setLoadingProgress(35, `Loaded ${loaded.toLocaleString()} buildings...`);
              snapshotOk = true;
              setSessionCache(rows);
            }
          }
        } catch { /* fall through to paginated load */ }
      }

      if (!snapshotOk) {
        await loadSlimCity((batch, totalSoFar) => {
          if (cancelled) return;
          addUsers(batch);
          loaded = totalSoFar;
          setLoadingProgress(
            Math.min(35, Math.round((totalSoFar / Math.max(totalSoFar + 500, 1000)) * 35)),
            `Loaded ${totalSoFar.toLocaleString()} buildings...`
          );
        });
      }
      if (cancelled) return;

      // Milestone: data ready (35→60%)
      setLoadingProgress(60, `${loaded.toLocaleString()} buildings placed!`);
      enteredCity.current = true;
      setLoading(false);
      setDataReady(true);

      // Skip intro — go straight to done + menu
      setIntroStage('done');
      setActiveMode('menu');

      // Milestone: matrices ready (60→80%) — fires from CityScene onCreated
      setLoadingProgress(80, 'Compiling shaders...');

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

    // Hard timeout: force-close loading after 18 seconds
    const hardTimeout = setTimeout(() => {
      if (!cityReadyRef.current) {
        console.warn('Hard timeout: forcing city ready after 18s');
        cityReadyRef.current = true;
        setCanvasReady(true);
      }
    }, 18000);

    return () => {
      cancelled = true;
      clearTimeout(hardTimeout);
      if (stopStream) stopStream();
      if (realtimeChannel) realtimeChannel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Callback when loading screen fade-out animation completes
  const handleLoadingFadeComplete = useCallback(() => {
    setLoadingDismissed(true);
  }, []);

  // Three-state crossfade: only hide loading after canvas renders first frame
  useEffect(() => {
    if (canvasReady && showLoading) {
      setLoadingProgress(100, 'City ready!');
      const t = setTimeout(() => setShowLoading(false), 100);
      return () => clearTimeout(t);
    }
  }, [canvasReady, showLoading, setLoadingProgress]);

  // Mode menu selection handler
  const handleModeSelect = useCallback((mode: ActiveMode) => {
    setActiveMode(mode);
    if (mode === 'fly') {
      setFlightMode(true);
    }
  }, [setActiveMode, setFlightMode]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Canvas mounts once data is ready */}
      {dataReady && <CityScene onReady={handleCanvasReady} />}

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
