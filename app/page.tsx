'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { HUD } from '@/components/ui/HUD';
import { loadSlimCity, subscribeToNewUsers } from '@/lib/supabaseDb';
import { startDiscoveryStream } from '@/lib/cityStream';
import { useCityStore } from '@/lib/cityStore';

const CityScene = dynamic(() => import('@/components/city/CityScene').then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const addUsers = useCityStore(s => s.addUsers);
  const addUser = useCityStore(s => s.addUser);
  const setLoading = useCityStore(s => s.setLoading);
  const setLoadingProgress = useCityStore(s => s.setLoadingProgress);
  const enteredCity = useRef(false);
  const [cityReady, setCityReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stopStream: (() => void) | null = null;
    let realtimeChannel: ReturnType<typeof subscribeToNewUsers> | null = null;

    async function bootstrap() {
      // Phase 1: Load ALL existing users from Supabase (paginated)
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
      // Defer Canvas mount to let intro overlay transition first
      setCityReady(true);

      // Phase 2: Subscribe to Supabase realtime for new users
      if (!cancelled) {
        realtimeChannel = subscribeToNewUsers((user) => {
          if (!cancelled) addUser(user);
        });
      }

      // Phase 3: Stream NEW GitHub users — auto-close after 5 minutes total
      if (!cancelled) {
        const STREAM_MAX_MS = 5 * 60 * 1000; // 5 minutes
        stopStream = startDiscoveryStream(
          (user) => { if (!cancelled) addUser(user); },
          () => {},
          () => {}, // onDone — no restart, rely on Supabase Realtime after this
        );
        // Force-close stream after 5 minutes to prevent memory leak
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {cityReady && <CityScene />}
      <HUD />
    </div>
  );
}
