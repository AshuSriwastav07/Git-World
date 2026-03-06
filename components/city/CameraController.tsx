// CameraController — OrbitControls + fly-to animation + WASD pan + airplane toggle
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

export function CameraController() {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const isAirplaneMode = useCityStore((s) => s.isAirplaneMode);
  const flyToTarget = useCityStore((s) => s.flyToTarget);
  const setFlyToTarget = useCityStore((s) => s.setFlyToTarget);
  const toggleAirplaneMode = useCityStore((s) => s.toggleAirplaneMode);
  const toggleNightMode = useCityStore((s) => s.toggleNightMode);
  const setRankChartOpen = useCityStore((s) => s.setRankChartOpen);
  const isRankChartOpen = useCityStore((s) => s.isRankChartOpen);

  const flyAnim = useRef({
    active: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
  });

  const keysPressed = useRef(new Set<string>());

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);

      if (key === 'f') toggleAirplaneMode();
      if (key === 'n') toggleNightMode();
      if (key === 'r') setRankChartOpen(!isRankChartOpen);
      if (key === 'escape') {
        useCityStore.getState().setSelectedUser(null);
        useCityStore.getState().setRankChartOpen(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRankChartOpen]);

  // Fly-to animation trigger
  useEffect(() => {
    if (flyToTarget && controlsRef.current) {
      const anim = flyAnim.current;
      anim.active = true;
      anim.progress = 0;
      anim.startPos.copy(camera.position);
      anim.endPos.set(flyToTarget.x + 15, flyToTarget.y + 30, flyToTarget.z + 25);
      anim.startTarget.copy(controlsRef.current.target);
      anim.endTarget.set(flyToTarget.x, flyToTarget.y, flyToTarget.z);
    }
  }, [flyToTarget]);

  // WASD panning + fly-to animation
  useFrame((_, delta) => {
    if (isAirplaneMode) return;

    // WASD panning
    const speed = keysPressed.current.has('shift') ? 150 : 50;
    const keys = keysPressed.current;
    if (controlsRef.current && !flyAnim.current.active) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

      const panDelta = new THREE.Vector3();
      if (keys.has('w')) panDelta.add(forward.clone().multiplyScalar(speed * delta));
      if (keys.has('s')) panDelta.add(forward.clone().multiplyScalar(-speed * delta));
      if (keys.has('a')) panDelta.add(right.clone().multiplyScalar(-speed * delta));
      if (keys.has('d')) panDelta.add(right.clone().multiplyScalar(speed * delta));

      if (panDelta.length() > 0) {
        camera.position.add(panDelta);
        controlsRef.current.target.add(panDelta);
      }
    }

    // Fly-to animation
    const anim = flyAnim.current;
    if (anim.active) {
      anim.progress += delta / 1.5; // 1.5 seconds duration
      const t = easeInOutCubic(Math.min(anim.progress, 1));

      camera.position.lerpVectors(anim.startPos, anim.endPos, t);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, t);
      }

      if (anim.progress >= 1) {
        anim.active = false;
        setFlyToTarget(null);
      }
    }
  });

  if (isAirplaneMode) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      screenSpacePanning={false}
      minDistance={20}
      maxDistance={800}
      maxPolarAngle={Math.PI / 2.1}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.6}
      target={[0, 15, 0]}
    />
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
