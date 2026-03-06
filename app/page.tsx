'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { HUD } from '@/components/ui/HUD';
import { loadSlimCity } from '@/lib/firestore';
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
  const setFirebaseLoaded = useCityStore(s => s.setFirebaseLoaded);
  const enteredCity = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let stopStream: (() => void) | null = null;

    async function bootstrap() {
      // Phase 1: Load existing Firestore users in batches (fast)
      await loadSlimCity(
        (batch) => {
          if (cancelled) return;
          addUsers(batch);
        },
        (total) => {
          if (cancelled) return;
          setFirebaseLoaded(total);
          setLoadingProgress(
            Math.min((total / 5) * 100, 95),
            `Loaded ${total} saved devs...`,
          );
          // Enter city early once we have 200 buildings
          if (total >= 200 && !enteredCity.current) {
            enteredCity.current = true;
            setLoadingProgress(100, 'City ready!');
            setLoading(false);
          }
        },
      );

      // If we finished loading but didn't hit 200, enter anyway
      if (!cancelled && !enteredCity.current) {
        enteredCity.current = true;
        setLoadingProgress(100, 'City ready!');
        setLoading(false);
      }

      // Phase 2: Stream NEW GitHub users silently in background
      if (!cancelled) {
        stopStream = startDiscoveryStream(
          (user) => { if (!cancelled) addUser(user); },
          () => {},
          () => {},
        );
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (stopStream) stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <CityScene />
      <HUD />
    </div>
  );
}
