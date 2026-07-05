// CityScene — R3F Canvas with proper day/night lighting
'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { AdaptiveDpr } from '@react-three/drei';
import { SkyEnvironment } from './environment/SkyEnvironment';
import { Suspense, useRef, useCallback, lazy } from 'react';
import { useCityStore } from '@/lib/cityStore';
import type { RootState } from '@react-three/fiber';
import { CityGrid } from './CityGrid';
import CameraController from './CameraController';
import GodRaySpotlight from './GodRaySpotlight';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { PerfOverlay } from './PerfOverlay';

const TechPark = lazy(() => import('./TechPark').then(m => ({ default: m.TechPark })));
const SiliconValleyPark = lazy(() => import('./SiliconValleyPark').then(m => ({ default: m.SiliconValleyPark })));
const TrendingDistrict = lazy(() => import('./TrendingDistrict').then(m => ({ default: m.TrendingDistrict })));
const AirplaneMode = lazy(() => import('./airplane/AirplaneMode').then(m => ({ default: m.AirplaneMode })));
const SpiderManMode = lazy(() => import('./spiderman/SpiderManMode').then(m => ({ default: m.SpiderManMode })));

/** Fires onReady after first frame renders — stops invalidating afterwards */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame((state) => {
    if (!fired.current) {
      fired.current = true;
      onReady();
      state.invalidate();
    }
  });
  return null;
}

/**
 * AmbientDriver — the ONLY source of frames for ambient/decorative animation.
 * Requests frames at a capped 30 Hz (characters, banners, monuments, sky).
 * Previously ~25 components each called state.invalidate() unconditionally in
 * useFrame, which defeated frameloop="demand" AND pushed the render loop to
 * uncapped max rate. Interaction (OrbitControls change events, flight/swing
 * modes, intro rise) still invalidates at full refresh rate on top of this.
 * Pauses entirely when the tab is hidden.
 */
const AMBIENT_INTERVAL_MS = 33; // ~30 Hz
function AmbientDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id === null) id = setInterval(() => invalidate(), AMBIENT_INTERVAL_MS);
    };
    const stop = () => {
      if (id !== null) { clearInterval(id); id = null; }
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [invalidate]);
  return null;
}

function SceneContent({ onReady }: { onReady?: () => void }) {
  const flightMode = useCityStore((s) => s.flightMode);
  const spiderMode = useCityStore((s) => s.activeMode === 'spiderman');

  return (
    <>
      {/* Removed AdaptiveDpr to prevent the blurry/laggy visual scaling effect */}

      {/* ── SKY ENVIRONMENT (dome, sun, moon, clouds, stars, aurora, lighting) ── */}
      <SkyEnvironment />

      {/* Ready signal — fires after first frame */}
      {onReady && <ReadySignal onReady={onReady} />}

      {/* City grid (InstancedMesh) + windows + fireworks */}
      <CityGrid />

      {/* Tech Park */}
      <SceneErrorBoundary name="TechPark">
        <TechPark />
      </SceneErrorBoundary>

      {/* Silicon Valley Park */}
      <SceneErrorBoundary name="SiliconValleyPark">
        <SiliconValleyPark />
      </SceneErrorBoundary>

      {/* Trending Repositories District */}
      <SceneErrorBoundary name="TrendingDistrict">
        <TrendingDistrict />
      </SceneErrorBoundary>

      {/* Airplane */}
      {flightMode && <AirplaneMode />}

      {/* Spider-Man street traversal */}
      {spiderMode && (
        <SceneErrorBoundary name="SpiderManMode">
          <SpiderManMode />
        </SceneErrorBoundary>
      )}

      {/* Spotlight on selected building */}
      <GodRaySpotlight />

      {/* Camera controller */}
      <CameraController />

      {/* Ambient animation clock — capped 30 Hz */}
      <AmbientDriver />

      {/* Dev-only perf stats (?debug=perf) */}
      <PerfOverlay />
    </>
  );
}

export default function CityScene({ onReady }: { onReady?: () => void }) {
  const selectUser = useCityStore((s) => s.selectUser);

  /* ── Click-vs-drag guard for onPointerMissed ── */
  const pointerDown = useRef<{ x: number; y: number; time: number } | null>(null);
  const DRAG_THRESHOLD = 5;
  const CLICK_TIMEOUT = 200;

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const handlePointerMissed = useCallback((e: MouseEvent) => {
    if (!pointerDown.current) return;
    const dx = e.clientX - pointerDown.current.x;
    const dy = e.clientY - pointerDown.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - pointerDown.current.time;
    pointerDown.current = null;
    if (dist < DRAG_THRESHOLD && elapsed < CLICK_TIMEOUT) {
      selectUser(null);
    }
  }, [selectUser]);

  return (
    <div
      style={{ width: '100vw', height: '100vh', display: 'block' }}
      onPointerDown={handleCanvasPointerDown}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        flat
        gl={{
          antialias: false,
          // logarithmicDepthBuffer removed: near 0.5 / far 2500 is fine for a
          // 24-bit depth buffer and log depth costs per-fragment math + kills early-Z
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{ position: [80, 55, 160], fov: 50, near: 0.5, far: 2500 }}
        shadows={false}
        performance={{ min: 0.3 }}
        onPointerMissed={handlePointerMissed}
        onCreated={(state: RootState) => {
          // Pre-compile all shaders to avoid first-frame stutter
          state.gl.compile(state.scene, state.camera);
        }}
      >
        <Suspense fallback={null}>
          <SceneContent onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
