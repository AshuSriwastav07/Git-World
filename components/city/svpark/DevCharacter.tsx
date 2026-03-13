// DevCharacter — Minecraft-style developer with 7 behavior types
'use client';

import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useCityStore } from '@/lib/cityStore';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';

// 7 behavior types:
// 0 = seated-working (typing at desk with laptop)
// 1 = walking-with-laptop (walks along path holding laptop)
// 2 = eating-on-bench (sitting on bench, arm moving to mouth)
// 3 = standing-talking (two hands gesture while standing)
// 4 = pacing-on-call (paces back and forth, one hand at ear)
// 5 = standing-focused (stands still, stares at phone in hand)
// 6 = sitting-resting (sitting on bench, relaxed idle)
export type BehaviorType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DevCharacterProps {
  login: string;
  avatarUrl: string;
  topLanguage: string;
  position: [number, number, number];
  rotation?: number;
  behavior: BehaviorType;
  walkPath?: [number, number, number][];
  walkSpeed?: number;
  containmentRadius?: number;
  citySlot?: number;
  cityRank?: number;
  totalScore?: number;
  estimatedCommits?: number;
  totalStars?: number;
  publicRepos?: number;
}

function DevCharacterInner({
  login,
  avatarUrl,
  topLanguage,
  position,
  rotation = 0,
  behavior,
  walkPath,
  walkSpeed = 0.5,
  containmentRadius,
  citySlot,
  cityRank,
  totalScore,
  estimatedCommits,
  totalStars,
  publicRepos,
}: DevCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const screenRef = useRef<THREE.MeshLambertMaterial>(null);
  const phoneRef = useRef<THREE.MeshLambertMaterial>(null);
  const deskLightRef = useRef<THREE.PointLight>(null);

  const bodyColor = LANGUAGE_COLORS[topLanguage] ?? LANGUAGE_COLORS.default;

  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < login.length; i++) h = ((h << 5) - h + login.charCodeAt(i)) | 0;
    return Math.abs(h);
  }, [login]);

  const avatarTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(avatarUrl);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, [avatarUrl]);

  const headMaterials = useMemo(() => {
    const skin = new THREE.MeshLambertMaterial({ color: '#f0c090' });
    const front = avatarTex
      ? new THREE.MeshLambertMaterial({ map: avatarTex })
      : skin;
    return [skin, skin, skin, skin, front, skin];
  }, [avatarTex]);

  const walkState = useRef({ idx: 0, progress: 0 });
  const lookUpTimer = useRef(seed % 1000);

  const isWalking = behavior === 1 || behavior === 4;
  const isSitting = behavior === 0 || behavior === 2 || behavior === 6;

  useFrame((state, dt) => {
    const time = state.clock.getElapsedTime();
    const ph = (seed % 100) / 10;

    // Walking behaviors (1 = walk-with-laptop, 4 = pacing-on-call)
    if (isWalking && walkPath && walkPath.length >= 2 && groupRef.current) {
      const ws = walkState.current;
      ws.progress += dt * walkSpeed;
      const from = walkPath[ws.idx];
      const to = walkPath[(ws.idx + 1) % walkPath.length];
      const dist = Math.sqrt((to[0] - from[0]) ** 2 + (to[2] - from[2]) ** 2);
      const t = Math.min(ws.progress / Math.max(dist, 0.1), 1);

      groupRef.current.position.set(
        from[0] + (to[0] - from[0]) * t,
        0,
        from[2] + (to[2] - from[2]) * t
      );

      // Clamp position within containment radius
      if (containmentRadius) {
        const cx = groupRef.current.position.x;
        const cz = groupRef.current.position.z;
        const d = Math.sqrt(cx * cx + cz * cz);
        if (d > containmentRadius) {
          const s = containmentRadius / d;
          groupRef.current.position.x = cx * s;
          groupRef.current.position.z = cz * s;
        }
      }

      const dx = to[0] - from[0];
      const dz = to[2] - from[2];
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        groupRef.current.rotation.y = Math.atan2(dx, dz);
      }

      // Leg swing
      const swing = Math.sin(time * 6 + ph) * 0.5;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;

      if (behavior === 1) {
        // Walking with laptop — arms held in front
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.6;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.6;
      } else {
        // Pacing on call — one hand at ear, other swings
        if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.4;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -1.2; // hand at ear
      }

      if (t >= 1) {
        ws.idx = (ws.idx + 1) % walkPath.length;
        ws.progress = 0;
      }
    } else {
      // Non-walking: breathing bob
      if (groupRef.current) {
        groupRef.current.position.y = Math.sin(time * 0.7 + ph) * 0.02;
      }

      switch (behavior) {
        case 0: // Seated working — typing animation
          if (leftArmRef.current) leftArmRef.current.rotation.x = -0.4 + Math.sin(time * 4 + ph) * 0.05;
          if (rightArmRef.current) rightArmRef.current.rotation.x = -0.35 + Math.sin(time * 4.3 + ph) * 0.05;
          break;
        case 2: // Eating on bench — arm moves to mouth
          if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8 + Math.sin(time * 1.5 + ph) * 0.3;
          break;
        case 3: // Standing talking — both arms gesture
          if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time * 2 + ph) * 0.3;
          if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time * 2.2 + ph + 1) * 0.35;
          if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(time * 1.5 + ph) * 0.15;
          break;
        case 5: // Standing focused — staring at phone
          if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8;
          if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8;
          if (headRef.current) headRef.current.rotation.x = -0.3; // looking down
          break;
        case 6: // Sitting resting — relaxed idle, slight sway
          if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
          if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time * 0.5 + ph) * 0.05;
          break;
      }
    }

    // Head look-up and turn (skip for behavior 5 which always looks down)
    if (headRef.current && behavior !== 5) {
      lookUpTimer.current += dt;
      const lookInterval = 8 + (seed % 5);
      const lookPhase = lookUpTimer.current % lookInterval;
      if (lookPhase > lookInterval - 0.8 && lookPhase < lookInterval - 0.3) {
        headRef.current.rotation.x = -0.25;
      } else {
        headRef.current.rotation.x = isSitting ? -0.15 : 0;
      }
      headRef.current.rotation.y = Math.sin(time * 0.3 + ph) * 0.15;
    }

    // ── Imperative day/night: update screen/phone/light via refs (no subscription) ──
    const night = useCityStore.getState().isNight;
    if (screenRef.current) {
      screenRef.current.emissive.set(night ? (behavior === 0 ? '#c8e4ff' : '#88bbff') : (behavior === 0 ? '#88bbff' : '#4466aa'));
      screenRef.current.emissiveIntensity = night ? (behavior === 0 ? 0.8 : 0.6) : (behavior === 0 ? 0.2 : 0.15);
    }
    if (phoneRef.current) {
      phoneRef.current.emissive.set(night ? '#88bbff' : '#4466aa');
      phoneRef.current.emissiveIntensity = night ? 0.8 : 0.2;
    }
    if (deskLightRef.current) {
      deskLightRef.current.intensity = night ? 0.5 : 0;
    }
    state.invalidate();
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const { users, selectUser } = useCityStore.getState();
    const existingUser = users.get(login.toLowerCase());
    if (existingUser) {
      selectUser(existingUser);
    } else {
      selectUser({
        login,
        citySlot: citySlot ?? 0,
        cityRank: cityRank ?? 9999,
        totalScore: totalScore ?? 0,
        topLanguage,
        estimatedCommits: estimatedCommits ?? 0,
        totalStars: totalStars ?? 0,
        publicRepos: publicRepos ?? 0,
        recentActivity: 0,
        avatarUrl,
        firstAddedAt: new Date().toISOString(),
      });
    }
  };

  // ── Name tag (shared across all poses) ──
  const nameTag = (y: number) => (
    <Billboard position={[0, y, 0]}>
      <mesh>
        <planeGeometry args={[login.length * 0.18 + 0.3, 0.35]} />
        <meshBasicMaterial color="#0d0d1a" transparent opacity={0.75} />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.16} color="white" anchorX="center" anchorY="middle">
        {login}
      </Text>
    </Billboard>
  );

  // ── Sitting pose (behaviors 0, 2, 6) ──
  if (isSitting) {
    return (
      <group ref={groupRef} position={position} rotation={[0, rotation, 0]} onClick={handleClick}>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.8, 1.1, 0.45]} />
          <meshLambertMaterial color={bodyColor} />
        </mesh>
        <mesh ref={headRef} position={[0, 1.65, 0]} material={headMaterials}>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
        </mesh>
        <mesh ref={leftArmRef} position={[-0.55, 0.85, 0.15]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.25, 0.9, 0.25]} />
          <meshLambertMaterial color="#f0c090" />
        </mesh>
        <mesh ref={rightArmRef} position={[0.55, 0.85, 0.15]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.25, 0.9, 0.25]} />
          <meshLambertMaterial color="#f0c090" />
        </mesh>
        <mesh ref={leftLegRef} position={[-0.2, 0.3, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.3, 0.95, 0.3]} />
          <meshLambertMaterial color="#2c3e50" />
        </mesh>
        <mesh ref={rightLegRef} position={[0.2, 0.3, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.3, 0.95, 0.3]} />
          <meshLambertMaterial color="#2c3e50" />
        </mesh>

        {/* Desk + laptop (behavior 0) or bench (behavior 2,6) */}
        {behavior === 0 && (
          <>
            <mesh position={[0, 1.2, 0.7]}>
              <boxGeometry args={[1.2, 0.05, 0.8]} />
              <meshLambertMaterial color="#5c3d1a" />
            </mesh>
            <mesh position={[0, 0.25, -0.1]}>
              <boxGeometry args={[0.7, 0.5, 0.5]} />
              <meshLambertMaterial color="#3a3a3a" />
            </mesh>
            <mesh position={[0, 1.24, 0.7]}>
              <boxGeometry args={[0.6, 0.02, 0.4]} />
              <meshLambertMaterial color="#333" />
            </mesh>
            <mesh position={[0, 1.44, 0.9]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.05]} />
              <meshLambertMaterial ref={screenRef} color="#1a1a2e" emissive="#88bbff" emissiveIntensity={0.2} />
            </mesh>
            <pointLight ref={deskLightRef} position={[0, 1.5, 0.9]} color="#88bbff" intensity={0} distance={3} />
          </>
        )}
        {(behavior === 2 || behavior === 6) && (
          <>
            {/* Bench seat */}
            <mesh position={[0, 0.25, -0.1]}>
              <boxGeometry args={[1.4, 0.15, 0.6]} />
              <meshLambertMaterial color="#5c3d1a" />
            </mesh>
            <mesh position={[-0.55, 0.1, -0.1]}>
              <boxGeometry args={[0.15, 0.2, 0.4]} />
              <meshLambertMaterial color="#4a3018" />
            </mesh>
            <mesh position={[0.55, 0.1, -0.1]}>
              <boxGeometry args={[0.15, 0.2, 0.4]} />
              <meshLambertMaterial color="#4a3018" />
            </mesh>
          </>
        )}
        {/* Food item for eating behavior */}
        {behavior === 2 && (
          <mesh position={[0.3, 1.3, 0.3]}>
            <boxGeometry args={[0.2, 0.15, 0.15]} />
            <meshLambertMaterial color="#cc6633" />
          </mesh>
        )}

        {nameTag(2.5)}
      </group>
    );
  }

  // ── Standing / walking pose (behaviors 1,3,4,5) ──
  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]} onClick={handleClick}>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.8, 1.1, 0.45]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>
      <mesh ref={headRef} position={[0, 1.85, 0]} material={headMaterials}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
      </mesh>
      <mesh ref={leftArmRef} position={[-0.55, 1.0, 0]}>
        <boxGeometry args={[0.25, 0.9, 0.25]} />
        <meshLambertMaterial color="#f0c090" />
      </mesh>
      <mesh ref={rightArmRef} position={[0.55, 1.0, 0]}>
        <boxGeometry args={[0.25, 0.9, 0.25]} />
        <meshLambertMaterial color="#f0c090" />
      </mesh>
      <mesh ref={leftLegRef} position={[-0.2, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.95, 0.3]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>
      <mesh ref={rightLegRef} position={[0.2, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.95, 0.3]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>

      {/* Laptop for walking-with-laptop (behavior 1) */}
      {behavior === 1 && (
        <group position={[0, 0.8, 0.35]}>
          <mesh>
            <boxGeometry args={[0.5, 0.02, 0.35]} />
            <meshLambertMaterial color="#333" />
          </mesh>
          <mesh position={[0, 0.15, 0.16]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.02]} />
            <meshLambertMaterial ref={screenRef} color="#1a1a2e" emissive="#4466aa" emissiveIntensity={0.15} />
          </mesh>
        </group>
      )}

      {/* Phone for standing-focused (behavior 5) */}
      {behavior === 5 && (
        <mesh position={[0, 0.75, 0.3]}>
          <boxGeometry args={[0.15, 0.25, 0.03]} />
          <meshLambertMaterial ref={phoneRef} color="#222" emissive="#4466aa" emissiveIntensity={0.2} />
        </mesh>
      )}

      {/* Phone at ear for pacing-on-call (behavior 4) */}
      {behavior === 4 && (
        <mesh position={[0.55, 1.7, 0.15]}>
          <boxGeometry args={[0.1, 0.2, 0.03]} />
          <meshLambertMaterial color="#222" />
        </mesh>
      )}

      {nameTag(2.7)}
    </group>
  );
}

export const DevCharacter = memo(DevCharacterInner);
