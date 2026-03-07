// GodRaySpotlight — Spotlight beam + gold ring on selected building
'use client';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCityStore } from '@/lib/cityStore';
import { slotToWorld, getBuildingDimensions } from '@/lib/cityLayout';

export default function GodRaySpotlight() {
  const selectedUser = useCityStore(s => s.selectedUser);
  const sortedLogins = useCityStore(s => s.sortedLogins);

  if (!selectedUser) return null;

  const rank = Math.max(sortedLogins.indexOf(selectedUser.login.toLowerCase()) + 1, 1);
  const slot = selectedUser.citySlot ?? (rank - 1);
  const pos  = slotToWorld(slot);
  const dims = getBuildingDimensions(rank, slot, selectedUser);

  return <SpotlightBeam x={pos.x} z={pos.z} height={dims.height} />;
}

function SpotlightBeam({ x, z, height }: { x: number; z: number; height: number }) {
  const beamRef  = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.07 + 0.05 * Math.sin(t * 1.8);
    }
    if (ring1Ref.current) {
      const s = 1 + 0.18 * Math.sin(t * 3.5);
      ring1Ref.current.scale.setScalar(s);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.55 + 0.35 * Math.sin(t * 3.5);
    }
    if (ring2Ref.current) {
      const s = 1 + 0.12 * Math.sin(t * 3.5 + 1.2);
      ring2Ref.current.scale.setScalar(s);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.3 + 0.2 * Math.sin(t * 3.5 + 1.2);
    }
  });

  const BEAM_H = 250;

  return (
    <group position={[x, 0, z]}>
      {/* Cone beam from sky down to building */}
      <mesh ref={beamRef} position={[0, height / 2 + BEAM_H / 2, 0]}>
        <coneGeometry args={[8, BEAM_H, 16, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent opacity={0.09}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Bright point at top of beam (sky light source) */}
      <pointLight color="#ffffff" intensity={3} distance={80} position={[0, height + 60, 0]} />

      {/* Outer pulsing gold ring at building base */}
      <mesh ref={ring1Ref} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.5, 6.5, 48]} />
        <meshBasicMaterial
          color="#f5c518"
          transparent opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner white ring */}
      <mesh ref={ring2Ref} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.8, 48]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Strong point light on top of building — illuminates nearby buildings */}
      <pointLight color="#f5c518" intensity={10} distance={70} decay={1.5}
        position={[0, height + 5, 0]} />
    </group>
  );
}
