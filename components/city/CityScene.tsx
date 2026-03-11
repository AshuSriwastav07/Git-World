// CityScene — R3F Canvas with proper day/night lighting
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { SkyEnvironment } from './environment/SkyEnvironment';
import { Suspense, useRef, useCallback, useEffect } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { CityGrid } from './CityGrid';
import { TechPark } from './TechPark';
import { AirplaneMode } from './airplane/AirplaneMode';
import CameraController from './CameraController';
import GodRaySpotlight from './GodRaySpotlight';
import { SiliconValleyPark } from './SiliconValleyPark';
import { TrendingDistrict } from './TrendingDistrict';
import { SceneErrorBoundary } from './SceneErrorBoundary';

/** Fires onReady after first frame renders */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

function SceneContent({ onReady }: { onReady?: () => void }) {
  const flightMode = useCityStore((s) => s.flightMode);

  return (
    <>
      <AdaptiveDpr pixelated />

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

      {/* Spotlight on selected building */}
      <GodRaySpotlight />

      {/* Camera controller */}
      <CameraController />
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
        frameloop="always"
        dpr={[0.75, 1]}
        flat
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{ position: [80, 55, 160], fov: 50, near: 1, far: 2000 }}
        shadows={false}
        performance={{ min: 0.3 }}
        onPointerMissed={handlePointerMissed}
      >
        <Suspense fallback={null}>
          <SceneContent onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
