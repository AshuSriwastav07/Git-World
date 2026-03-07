// CityScene — R3F Canvas with proper day/night lighting
'use client';

import { Canvas } from '@react-three/fiber';
import { Stars, Sky, AdaptiveDpr } from '@react-three/drei';
import { Suspense } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { CityGrid } from './CityGrid';
import { TechPark } from './TechPark';
import { Airplane } from './Airplane';
import CameraController from './CameraController';
import GodRaySpotlight from './GodRaySpotlight';
import FireworkSystem from './FireworkSystem';

function SceneContent() {
  const isAirplaneMode = useCityStore((s) => s.isAirplaneMode);
  const isNight = useCityStore((s) => s.isNight);

  return (
    <>
      <AdaptiveDpr pixelated />

      {/* ── LIGHTS ── */}
      {isNight ? (
        <>
          <ambientLight color="#445577" intensity={0.8} />
          <directionalLight color="#6688cc" intensity={1.8} position={[100, 300, 100]} />
          <pointLight color="#ff5500" intensity={2.5} position={[0, 5, 0]} distance={500} decay={1} />
          <pointLight color="#4488ff" intensity={1.5} position={[-80, 40, 80]} distance={400} decay={1} />
        </>
      ) : (
        <>
          <ambientLight color="#ffffff" intensity={1.1} />
          <directionalLight color="#fffcee" intensity={3.0} position={[200, 500, 200]} />
          <directionalLight color="#ccddff" intensity={0.8} position={[-100, 200, -100]} />
        </>
      )}

      {/* ── SKY ── */}
      {isNight ? (
        <>
          <color attach="background" args={['#07050f']} />
          <Stars radius={600} depth={60} count={1500} factor={4} saturation={0} fade />
          <fog attach="fog" args={['#0d0818', 200, 800]} />
        </>
      ) : (
        <>
          <Sky sunPosition={[100, 80, 100]} turbidity={8} rayleigh={2} />
          <fog attach="fog" args={['#c9e8ff', 300, 1000]} />
        </>
      )}

      {/* City grid (InstancedMesh) + windows + fireworks */}
      <CityGrid />

      {/* Tech Park */}
      <TechPark />

      {/* Airplane */}
      {isAirplaneMode && <Airplane />}

      {/* Spotlight on selected building */}
      <GodRaySpotlight />

      {/* Firework particle bursts */}
      <FireworkSystem />

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
        camera={{ position: [80, 55, 160], fov: 50, near: 0.5, far: 2500 }}
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
