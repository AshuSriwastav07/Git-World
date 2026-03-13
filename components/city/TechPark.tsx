// TechPark — green park with trees, fountain, benches, "TECH PARK" banner, animated workers
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { getTechParkWorldCenter } from '@/lib/cityLayout';
import { langColor } from '@/lib/textureGenerator';
import type { SlimUser } from '@/lib/supabaseDb';

/* ── Helpers ── */
function Tree({ position }: { position: [number, number, number] }) {
  const isNight = useCityStore((s) => s.isNight);
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshLambertMaterial color="#8B4513" emissive={isNight ? '#3d1f08' : '#000000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[5, 3, 5]} />
        <meshLambertMaterial color="#2d8a2d" emissive={isNight ? '#1a5c1a' : '#000000'} emissiveIntensity={isNight ? 0.4 : 0} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const isNight = useCityStore((s) => s.isNight);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[3, 0.2, 0.8]} />
        <meshLambertMaterial color="#8B6914" emissive={isNight ? '#5a4410' : '#000000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>
      <mesh position={[-1, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshLambertMaterial color="#5C4033" emissive={isNight ? '#3a2820' : '#000000'} emissiveIntensity={isNight ? 0.2 : 0} />
      </mesh>
      <mesh position={[1, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshLambertMaterial color="#5C4033" emissive={isNight ? '#3a2820' : '#000000'} emissiveIntensity={isNight ? 0.2 : 0} />
      </mesh>
    </group>
  );
}

function Fountain() {
  const isNight = useCityStore((s) => s.isNight);
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[4, 4.5, 1, 8]} />
        <meshLambertMaterial color="#888888" emissive={isNight ? '#444444' : '#000000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.4, 8]} />
        <meshLambertMaterial color="#4488cc" emissive={isNight ? '#2266bb' : '#000000'} emissiveIntensity={isNight ? 0.8 : 0} transparent opacity={0.8} />
      </mesh>
      {/* Blue glow from water at night */}
      {isNight && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[5, 8, 8]} />
          <meshBasicMaterial color="#4488cc" transparent opacity={0.06} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 2.0, 0]}>
        <boxGeometry args={[1, 3, 1]} />
        <meshLambertMaterial color="#999999" emissive={isNight ? '#444444' : '#000000'} emissiveIntensity={isNight ? 0.2 : 0} />
      </mesh>
    </group>
  );
}

function LampPost({ position }: { position: [number, number, number] }) {
  const isNight = useCityStore((s) => s.isNight);
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.3, 3, 0.3]} />
        <meshLambertMaterial color="#555555" />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshLambertMaterial color="#ffcc55" emissive={isNight ? '#ffcc55' : '#000000'} emissiveIntensity={isNight ? 1.5 : 0} />
      </mesh>
      {isNight && (
        <mesh position={[0, 3.2, 0]}>
          <sphereGeometry args={[2, 8, 8]} />
          <meshBasicMaterial color="#ffcc55" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function FlowerPatch({ position, color }: { position: [number, number, number]; color: string }) {
  const isNight = useCityStore((s) => s.isNight);
  return (
    <mesh position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshLambertMaterial color={color} emissive={isNight ? color : '#000000'} emissiveIntensity={isNight ? 0.5 : 0} />
    </mesh>
  );
}

/* ── Walking Character (moves between waypoints with laptop) ── */
function WalkingCharacter({ developer, waypoints, speed }: {
  developer: SlimUser;
  waypoints: [number, number, number][];
  speed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const isNight = useCityStore((s) => s.isNight);
  const bodyColor = langColor(developer.topLanguage);

  const wpIdx = useRef(0);
  const progress = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!groupRef.current || waypoints.length < 2) return;
    const from = waypoints[wpIdx.current];
    const to = waypoints[(wpIdx.current + 1) % waypoints.length];
    progress.current += dt * speed;

    const t = Math.min(progress.current, 1);
    const x = from[0] + (to[0] - from[0]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    groupRef.current.position.set(x, 0, z);

    // Face direction of movement
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    }

    // Walk animation
    const swing = Math.sin(progress.current * 8) * 0.5;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.5;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.5;

    if (t >= 1) {
      wpIdx.current = (wpIdx.current + 1) % waypoints.length;
      progress.current = 0;
    }
    state.invalidate();
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); setSelectedUser(developer); }}>
      {/* Head */}
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.35]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>
      {/* Left arm */}
      <mesh ref={leftArmRef} position={[-0.45, 1.0, 0.1]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>
      {/* Right arm */}
      <mesh ref={rightArmRef} position={[0.45, 1.0, 0.1]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>
      {/* Laptop held in front */}
      <mesh position={[0, 0.85, 0.35]}>
        <boxGeometry args={[0.45, 0.03, 0.3]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.98, 0.49]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.45, 0.3, 0.03]} />
        <meshLambertMaterial color="#1a1a2e" emissive={isNight ? '#4488ff' : '#88bbff'} emissiveIntensity={isNight ? 0.8 : 0.2} />
      </mesh>
      {/* Left leg */}
      <mesh ref={leftLegRef} position={[-0.15, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>
      {/* Right leg */}
      <mesh ref={rightLegRef} position={[0.15, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>
    </group>
  );
}

/* ── Sitting Laptop Character (on bench, idle bob) ── */
function SittingLaptopCharacter({ position, developer, facing = 0 }: {
  position: [number, number, number]; developer: SlimUser; facing?: number;
}) {
  const bodyColor = langColor(developer.topLanguage);
  const isNight = useCityStore((s) => s.isNight);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const headRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const _dt = Math.min(delta, 0.05);
    void _dt;
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3 + position[0]) * 0.2;
      headRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5 + position[2]) * 0.08 - 0.15;
    }
    state.invalidate();
  });

  return (
    <group position={position} rotation={[0, facing, 0]} onClick={(e) => { e.stopPropagation(); setSelectedUser(developer); }}>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.6, 0.7, 0.35]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>
      <mesh ref={headRef} position={[0, 1.4, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>
      <mesh position={[-0.4, 0.85, 0.15]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>
      <mesh position={[0.4, 0.85, 0.15]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshLambertMaterial color="#ffcc99" />
      </mesh>
      <mesh position={[-0.15, 0.4, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.22, 0.45, 0.22]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.15, 0.4, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.22, 0.45, 0.22]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0, 0.68, 0.4]}>
        <boxGeometry args={[0.5, 0.04, 0.35]} />
        <meshLambertMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.88, 0.57]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.5, 0.35, 0.03]} />
        <meshLambertMaterial color="#1a1a2e" emissive={isNight ? '#4488ff' : '#88bbff'} emissiveIntensity={isNight ? 0.9 : 0.3} />
      </mesh>
      {/* Emissive screen glow only — no pointLight to avoid GPU uniform overflow */}
    </group>
  );
}

/* ── Big Glowing "TECH PARK" Banner with readable canvas text ── */
function ParkBanner({ position }: { position: [number, number, number] }) {
  const isNight = useCityStore((s) => s.isNight);

  const bannerTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 512, 128);

    // Gold border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 120);

    // Inner border
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 492, 108);

    // Main text
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow
    ctx.fillStyle = '#ff006e';
    ctx.fillText('TECH PARK', 258, 66);

    // Main colored text
    ctx.fillStyle = '#ffd700';
    ctx.fillText('TECH PARK', 256, 64);

    // Subtitle
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#00f5d4';
    ctx.fillText('★ DEVELOPERS AT WORK ★', 256, 108);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={position}>
      {/* Left pole */}
      <mesh position={[-13, -3, 0]}>
        <boxGeometry args={[0.6, 8, 0.6]} />
        <meshLambertMaterial color="#888888" />
      </mesh>
      {/* Right pole */}
      <mesh position={[13, -3, 0]}>
        <boxGeometry args={[0.6, 8, 0.6]} />
        <meshLambertMaterial color="#888888" />
      </mesh>

      {/* Front face — meshBasicMaterial so text is always crisp (self-lit sign) */}
      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[26, 6.5]} />
        <meshBasicMaterial
          map={bannerTex ?? undefined}
          color={bannerTex ? '#ffffff' : '#1a1a2e'}
          toneMapped={false}
        />
      </mesh>
      {/* Back face */}
      <mesh position={[0, 0, -0.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[26, 6.5]} />
        <meshBasicMaterial
          map={bannerTex ?? undefined}
          color={bannerTex ? '#ffffff' : '#1a1a2e'}
          toneMapped={false}
        />
      </mesh>

      {/* Glowing edge trim (top & bottom bars) */}
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[26.5, 0.3, 0.5]} />
        <meshLambertMaterial color="#ffd700" emissive={isNight ? '#ffd700' : '#665500'} emissiveIntensity={isNight ? 1.2 : 0.2} />
      </mesh>
      <mesh position={[0, -3.4, 0]}>
        <boxGeometry args={[26.5, 0.3, 0.5]} />
        <meshLambertMaterial color="#ffd700" emissive={isNight ? '#ffd700' : '#665500'} emissiveIntensity={isNight ? 1.2 : 0.2} />
      </mesh>

      {/* Night glow halo */}
      {isNight && (
        <mesh position={[0, 0, 1.5]}>
          <sphereGeometry args={[8, 8, 8]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.06} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ── Desk cluster ── */
function DeskCluster({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const isNight = useCityStore((s) => s.isNight);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[2.5, 0.1, 1.5]} />
        <meshLambertMaterial color="#8B6914" emissive={isNight ? '#3d2e08' : '#000000'} emissiveIntensity={isNight ? 0.3 : 0} />
      </mesh>
      {([[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]] as [number, number][]).map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.3, lz]}>
          <boxGeometry args={[0.15, 0.6, 0.15]} />
          <meshLambertMaterial color="#5C4033" emissive={isNight ? '#2a1e17' : '#000000'} emissiveIntensity={isNight ? 0.2 : 0} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Main TechPark ── */
export function TechPark() {
  const park = getTechParkWorldCenter();
  const users = useCityStore((s) => s.users);
  const isNight = useCityStore((s) => s.isNight);

  const parkDevs = useMemo(() => {
    const all = Array.from(users.values());
    return all.sort((a, b) => b.recentActivity - a.recentActivity).slice(0, 60);
  }, [users]);

  const walkingPaths = useMemo<[number, number, number][][]>(() => [
    [[18, 0, -18], [18, 0, 18], [-18, 0, 18], [-18, 0, -18]],
    [[-10, 0, -5], [10, 0, -5], [10, 0, 5], [-10, 0, 5]],
    [[0, 0, -20], [0, 0, 20], [5, 0, 20], [5, 0, -20]],
    [[-20, 0, 0], [20, 0, 0], [20, 0, 5], [-20, 0, 5]],
    [[-15, 0, -15], [15, 0, 15], [15, 0, -15], [-15, 0, 15]],
    [[12, 0, -12], [12, 0, 12], [-12, 0, 12], [-12, 0, -12]],
    [[-8, 0, 18], [8, 0, 18], [8, 0, 10], [-8, 0, 10]],
    [[-18, 0, -10], [-18, 0, 10], [-10, 0, 10], [-10, 0, -10]],
    [[5, 0, -18], [15, 0, -8], [5, 0, 2], [-5, 0, -8]],
    [[10, 0, 5], [20, 0, 15], [10, 0, 15], [0, 0, 5]],
  ], []);

  const sittingPositions = useMemo(() => [
    { pos: [7, 0, 6] as [number, number, number], facing: Math.PI / 4 },
    { pos: [5.5, 0, 6.5] as [number, number, number], facing: Math.PI / 3 },
    { pos: [-7, 0, 6] as [number, number, number], facing: -Math.PI / 4 },
    { pos: [-5.5, 0, 6.5] as [number, number, number], facing: -Math.PI / 3 },
    { pos: [7, 0, -6] as [number, number, number], facing: -Math.PI / 4 },
    { pos: [5.5, 0, -5.5] as [number, number, number], facing: -Math.PI / 6 },
    { pos: [-10, 0, 10] as [number, number, number], facing: Math.PI / 2 },
    { pos: [-11, 0, 9] as [number, number, number], facing: Math.PI / 2.5 },
    { pos: [10, 0, -10] as [number, number, number], facing: -Math.PI / 2 },
    { pos: [11, 0, -9] as [number, number, number], facing: -Math.PI / 2.5 },
    { pos: [3, 0, 15] as [number, number, number], facing: 0 },
    { pos: [-3, 0, 15] as [number, number, number], facing: 0 },
    { pos: [3, 0, -15] as [number, number, number], facing: Math.PI },
    { pos: [-3, 0, -15] as [number, number, number], facing: Math.PI },
    { pos: [14, 0, 0] as [number, number, number], facing: -Math.PI / 2 },
    { pos: [-14, 0, 0] as [number, number, number], facing: Math.PI / 2 },
    { pos: [0, 0, -14] as [number, number, number], facing: Math.PI },
    { pos: [0, 0, 14] as [number, number, number], facing: 0 },
    { pos: [12, 0, 12] as [number, number, number], facing: -Math.PI * 0.75 },
    { pos: [-12, 0, -12] as [number, number, number], facing: Math.PI * 0.25 },
    { pos: [8, 0, 16] as [number, number, number], facing: -0.3 },
    { pos: [-8, 0, 16] as [number, number, number], facing: 0.3 },
    { pos: [16, 0, 8] as [number, number, number], facing: -Math.PI / 2 },
    { pos: [-16, 0, -8] as [number, number, number], facing: Math.PI / 2 },
    { pos: [0, 0, 8] as [number, number, number], facing: Math.PI / 6 },
  ], []);

  const walkers = parkDevs.slice(0, Math.min(walkingPaths.length, parkDevs.length));
  const sitters = parkDevs.slice(walkingPaths.length, walkingPaths.length + sittingPositions.length);

  return (
    <group position={[park.x, 0.05, park.z]}>
      {/* Park ground — dark green emissive at night */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial color="#99cc2f" emissive={isNight ? '#2a4e0a' : '#000000'} emissiveIntensity={isNight ? 0.5 : 0} />
      </mesh>

      {/* Fence — north */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fn-${i}`} position={[-25 + i, 0.5, -25]}>
          <boxGeometry args={[1, 1, 0.3]} />
          <meshLambertMaterial color="#ffffff" emissive={isNight ? '#555555' : '#000000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      ))}
      {/* Fence — south */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fs-${i}`} position={[-25 + i, 0.5, 25]}>
          <boxGeometry args={[1, 1, 0.3]} />
          <meshLambertMaterial color="#ffffff" emissive={isNight ? '#555555' : '#000000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      ))}
      {/* Fence — west */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fw-${i}`} position={[-25, 0.5, -25 + i]}>
          <boxGeometry args={[0.3, 1, 1]} />
          <meshLambertMaterial color="#ffffff" emissive={isNight ? '#555555' : '#000000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      ))}
      {/* Fence — east */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fe-${i}`} position={[25, 0.5, -25 + i]}>
          <boxGeometry args={[0.3, 1, 1]} />
          <meshLambertMaterial color="#ffffff" emissive={isNight ? '#555555' : '#000000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      ))}

      <Tree position={[-20, 0, -20]} />
      <Tree position={[20, 0, -20]} />
      <Tree position={[-20, 0, 20]} />
      <Tree position={[20, 0, 20]} />
      <Tree position={[-15, 0, 0]} />
      <Tree position={[15, 0, 0]} />
      <Tree position={[0, 0, -18]} />
      <Tree position={[0, 0, 18]} />
      <Tree position={[-10, 0, -15]} />
      <Tree position={[10, 0, 15]} />

      <Fountain />

      <Bench position={[6, 0, 6]} rotation={Math.PI / 4} />
      <Bench position={[-6, 0, 6]} rotation={-Math.PI / 4} />
      <Bench position={[6, 0, -6]} rotation={-Math.PI / 4} />
      <Bench position={[-6, 0, -6]} rotation={Math.PI / 4} />
      <Bench position={[12, 0, 0]} rotation={Math.PI / 2} />
      <Bench position={[-12, 0, 0]} rotation={-Math.PI / 2} />
      <Bench position={[0, 0, 12]} rotation={0} />
      <Bench position={[0, 0, -12]} rotation={Math.PI} />

      <DeskCluster position={[8, 0, 16]} rotation={0.3} />
      <DeskCluster position={[-8, 0, 16]} rotation={-0.3} />
      <DeskCluster position={[16, 0, 8]} rotation={Math.PI / 2} />
      <DeskCluster position={[-16, 0, -8]} rotation={Math.PI / 2} />

      <LampPost position={[-22, 0, -22]} />
      <LampPost position={[22, 0, -22]} />
      <LampPost position={[-22, 0, 22]} />
      <LampPost position={[22, 0, 22]} />
      <LampPost position={[0, 0, -22]} />
      <LampPost position={[0, 0, 22]} />
      <LampPost position={[-22, 0, 0]} />
      <LampPost position={[22, 0, 0]} />

      <FlowerPatch position={[8, 0.25, 8]} color="#ff4444" />
      <FlowerPatch position={[9, 0.25, 7]} color="#ffff44" />
      <FlowerPatch position={[-8, 0.25, -8]} color="#ff88cc" />
      <FlowerPatch position={[-9, 0.25, -7]} color="#ff8800" />
      <FlowerPatch position={[3, 0.25, 12]} color="#ff4444" />
      <FlowerPatch position={[-3, 0.25, -12]} color="#ffff44" />
      <FlowerPatch position={[16, 0.25, 5]} color="#ff006e" />
      <FlowerPatch position={[-16, 0.25, -5]} color="#4cc9f0" />

      <ParkBanner position={[0, 6, -24]} />

      {walkers.map((dev, i) => (
        <WalkingCharacter
          key={`walk-${dev.login}`}
          developer={dev}
          waypoints={walkingPaths[i]}
          speed={0.08 + (i % 5) * 0.02}
        />
      ))}

      {sitters.map((dev, i) => {
        const sp = sittingPositions[i];
        if (!sp) return null;
        return (
          <SittingLaptopCharacter
            key={`sit-${dev.login}`}
            developer={dev}
            position={sp.pos}
            facing={sp.facing}
          />
        );
      })}
    </group>
  );
}
