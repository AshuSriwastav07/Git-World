// CityScene — R3F Canvas with proper day/night lighting
'use client';

import { Canvas } from '@react-three/fiber';
import { Stars, Sky, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { Suspense } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { CityGrid } from './CityGrid';
import { TechPark } from './TechPark';
import { Airplane } from './Airplane';
import { CameraController } from './CameraController';

function SceneContent() {
  const isAirplaneMode = useCityStore((s) => s.isAirplaneMode);
  const isNightMode = useCityStore((s) => s.isNightMode);

  return (
    <>
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* ── LIGHTS ── */}
      {isNightMode ? (
        <>
          {/* Night: bright-enough ambient + cool moonlight */}
          <ambientLight color="#ffffff" intensity={0.55} />
          <directionalLight color="#aaccff" intensity={0.8} position={[100, 300, 100]} />
          {/* Warm ground bounce simulating window glow */}
          <pointLight color="#ff8833" intensity={1.2} position={[0, 5, 0]} distance={400} decay={1} />
        </>
      ) : (
        <>
          {/* Day: strong white sunlight */}
          <ambientLight color="#ffffff" intensity={0.9} />
          <directionalLight color="#ffffff" intensity={2.5} position={[200, 500, 200]} />
          {/* Fill light so shadow side isn't black */}
          <directionalLight color="#ccddff" intensity={0.6} position={[-100, 200, -100]} />
        </>
      )}

      {/* ── SKY ── */}
      {isNightMode ? (
        <>
          <color attach="background" args={['#0d0820']} />
          <Stars radius={600} depth={60} count={1500} factor={4} saturation={0} fade />
          <fog attach="fog" args={['#0d0820', 250, 1000]} />
        </>
      ) : (
        <>
          <Sky sunPosition={[100, 80, 100]} turbidity={8} rayleigh={2} />
          <fog attach="fog" args={['#c9e8ff', 400, 1500]} />
        </>
      )}

      {/* City grid (InstancedMesh) + windows + fireworks */}
      <CityGrid />

      {/* Tech Park */}
      <TechPark />

      {/* Airplane */}
      {isAirplaneMode && <Airplane />}

      {/* Camera controller */}
      <CameraController />
    </>
  );
}

export default function CityScene() {
  const selectUser = useCityStore((s) => s.selectUser);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'block' }}>
      <Canvas
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 60, 200], fov: 60, near: 0.5, far: 3000 }}
        shadows={false}
        performance={{ min: 0.5 }}
        onPointerMissed={() => selectUser(null)}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
