// LoadingScreen — now just drives isLoading; IntroOverlay handles the cinematic sequence
'use client';

import { useCityStore } from '@/lib/cityStore';

/**
 * LoadingScreen is now invisible — the visual loading / intro is handled by IntroOverlay.
 * This component simply watches isLoading and ensures the intro stage begins once data is ready.
 * It can be kept for any future loading-bar needs.
 */
export function LoadingScreen() {
  const introStage = useCityStore((s) => s.introStage);

  // IntroOverlay watches isLoading + user count and drives intro stages.
  // LoadingScreen is retained as a mount-point (no visual output).
  if (introStage !== 'loading') return null;
  return null;
}
