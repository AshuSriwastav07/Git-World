// CameraController — OrbitControls + auto-rotate + fly-to + WASD + keyboard shortcuts + cinematic intro
'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OCType } from 'three-stdlib';
import { useCityStore } from '@/lib/cityStore';
import { slotToWorld, getBuildingDimensions } from '@/lib/cityLayout';

/* ── Default camera position ── */
const DEFAULT_POS = new THREE.Vector3(80, 55, 160);
const DEFAULT_TGT = new THREE.Vector3(0, 5, 0);

export default function CameraController() {
  const controlsRef = useRef<OCType>(null);
  const { camera, clock } = useThree();

  const selectedUser     = useCityStore(s => s.selectedUser);
  const sortedLogins     = useCityStore(s => s.sortedLogins);
  const isAirplaneMode   = useCityStore(s => s.isAirplaneMode);
  const flyTarget        = useCityStore(s => s.flyTarget);
  const setFlyTarget     = useCityStore(s => s.setFlyTarget);
  const toggleAirplaneMode = useCityStore(s => s.toggleAirplaneMode);
  const toggleNight      = useCityStore(s => s.toggleNight);
  const setRankChartOpen = useCityStore(s => s.setRankChartOpen);
  const isRankChartOpen  = useCityStore(s => s.isRankChartOpen);
  const introStage       = useCityStore(s => s.introStage);
  const introStartTime   = useCityStore(s => s.introStartTime);
  const userInteracted   = useCityStore(s => s.userInteracted);
  const setUserInteracted = useCityStore(s => s.setUserInteracted);

  const flyAnim = useRef({
    active: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
  });

  const keysPressed = useRef(new Set<string>());

  // ── Reset clock on tab visibility ──
  useEffect(() => {
    const onVis = () => { if (!document.hidden) clock.start(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [clock]);

  // ── Set initial camera position ──
  useEffect(() => {
    camera.position.copy(DEFAULT_POS);
    if (controlsRef.current) {
      controlsRef.current.target.copy(DEFAULT_TGT);
      controlsRef.current.update();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── User interaction listener (stops auto-rotate permanently) ──
  useEffect(() => {
    if (userInteracted) return;
    const stop = () => { setUserInteracted(); };
    const el = document.body;
    el.addEventListener('pointerdown', stop, { once: true });
    el.addEventListener('wheel', stop, { once: true });
    el.addEventListener('touchstart', stop, { once: true });
    return () => {
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
    };
  }, [userInteracted, setUserInteracted]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);
      // Mark user interaction on keyboard press
      if (!useCityStore.getState().userInteracted) useCityStore.getState().setUserInteracted();
      if (key === 'f') toggleAirplaneMode();
      if (key === 'n') toggleNight();
      if (key === 'r') setRankChartOpen(!isRankChartOpen);
      if (key === 'escape') {
        useCityStore.getState().setSelectedUser(null);
        useCityStore.getState().setRankChartOpen(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRankChartOpen, setRankChartOpen, toggleAirplaneMode, toggleNight]);

  // ── Fly to selected building (offset camera right so building is on left half, panel on right) ──
  useEffect(() => {
    if (!selectedUser) return;
    const rank = selectedUser.cityRank ?? Math.max(sortedLogins.indexOf(selectedUser.login.toLowerCase()) + 1, 1);
    const slot = selectedUser.citySlot ?? (rank - 1);
    const pos  = slotToWorld(slot);
    const dims = getBuildingDimensions(rank, slot, selectedUser);
    const H = dims.height, BX = pos.x, BZ = pos.z;
    const dist = Math.max(H * 1.6, 25);
    // Offset camera to the right so the building sits in the left half of the viewport
    const panelOffset = dist * 0.35;
    const a = flyAnim.current;
    a.startPos.copy(camera.position);
    a.endPos.set(BX + dist * 0.4 + panelOffset, H * 0.7 + 12, BZ + dist);
    a.startTarget.copy(controlsRef.current?.target ?? new THREE.Vector3());
    a.endTarget.set(BX, H * 0.4, BZ);
    a.progress = 0;
    a.active = true;
  }, [selectedUser?.login, camera, sortedLogins]);

  // ── Fly via flyTarget store ──
  useEffect(() => {
    if (!flyTarget || !controlsRef.current || selectedUser) return;
    const a = flyAnim.current;
    a.active = true; a.progress = 0;
    a.startPos.copy(camera.position);
    a.endPos.set(flyTarget.x + 15, flyTarget.y + 30, flyTarget.z + 25);
    a.startTarget.copy(controlsRef.current.target);
    a.endTarget.set(flyTarget.x, flyTarget.y, flyTarget.z);
  }, [flyTarget, camera, selectedUser]);

  // ── Frame loop ──
  useFrame((_, rawDelta) => {
    if (isAirplaneMode) return;
    const delta = Math.min(rawDelta, 0.06);

    // ── Cinematic camera sweep during intro ──
    if ((introStage === 'cinematic' || introStage === 'loading') && introStartTime > 0) {
      const elapsed = (Date.now() - introStartTime) / 1000; // seconds
      const SWEEP_DURATION = 12; // match cinematic duration
      const t = Math.min(elapsed / SWEEP_DURATION, 1);

      // Camera path: start high above, sweep down in an orbit
      const angle = t * Math.PI * 1.8; // ~320 degrees orbit
      const startRadius = 200, endRadius = 90;
      const startHeight = 180, endHeight = 55;
      const radius = startRadius + (endRadius - startRadius) * easeInOutCubic(t);
      const height = startHeight + (endHeight - startHeight) * easeInOutCubic(t);

      camera.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      // Look at the city center, slightly above ground
      const lookY = 5 + (1 - t) * 15; // start looking higher, settle at y=5
      if (controlsRef.current) {
        controlsRef.current.target.set(0, lookY, 0);
        controlsRef.current.update();
      }
      return; // skip normal camera logic during cinematic
    }

    // ── WASD panning ──
    if (controlsRef.current && !flyAnim.current.active) {
      const speed = keysPressed.current.has('shift') ? 150 : 50;
      const keys = keysPressed.current;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const pan = new THREE.Vector3();
      if (keys.has('w')) pan.add(forward.clone().multiplyScalar(speed * delta));
      if (keys.has('s')) pan.add(forward.clone().multiplyScalar(-speed * delta));
      if (keys.has('a')) pan.add(right.clone().multiplyScalar(-speed * delta));
      if (keys.has('d')) pan.add(right.clone().multiplyScalar(speed * delta));
      if (pan.length() > 0) { camera.position.add(pan); controlsRef.current.target.add(pan); }
    }

    // ── Fly-to animation ──
    const anim = flyAnim.current;
    if (anim.active) {
      anim.progress = Math.min(anim.progress + delta * 1.5, 1);
      const ease = easeInOutCubic(anim.progress);
      camera.position.lerpVectors(anim.startPos, anim.endPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, ease);
        controlsRef.current.update();
      }
      if (anim.progress >= 1) { anim.active = false; setFlyTarget(null); }
    }
  });

  if (isAirplaneMode) return (
    <OrbitControls
      ref={controlsRef}
      enabled={false}
      makeDefault
    />
  );

  // Auto-rotate: orbit slowly until user interacts
  const shouldAutoRotate = !userInteracted;

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.07}
      screenSpacePanning={false}
      minDistance={5}
      maxDistance={400}
      maxPolarAngle={Math.PI / 2.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.6}
      makeDefault
      autoRotate={shouldAutoRotate}
      autoRotateSpeed={0.4}
    />
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
