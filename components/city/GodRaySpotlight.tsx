// GodRaySpotlight — Neon blue god-light beam + red cone marker + gold ring on selected building
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

  return <SpotlightBeam x={pos.x} z={pos.z} height={dims.height} width={dims.width} depth={dims.depth} />;
}

function SpotlightBeam({ x, z, height, width, depth }: { x: number; z: number; height: number; width: number; depth: number }) {
  const beamRef  = useRef<THREE.Mesh>(null);
  const haloRef  = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const coneRef  = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + 0.06 * Math.sin(t * 2);
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1 + 0.1 * Math.sin(t * 3));
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.18 + 0.08 * Math.sin(t * 2.5);
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
    if (coneRef.current) {
      coneRef.current.rotation.y = t * 2;
      coneRef.current.position.y = height + 3 + Math.sin(t * 3) * 0.5;
    }
  });

  const BEAM_H = 250;
  const maxDim = Math.max(width, depth);
  const coneSize = maxDim * 0.5;

  return (
    <group position={[x, 0, z]}>
      {/* Neon blue god-light beam from sky down to building */}
      <mesh ref={beamRef} position={[0, height / 2 + BEAM_H / 2, 0]}>
        <cylinderGeometry args={[maxDim * 0.3, maxDim * 0.8, BEAM_H, 16, 1, true]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Neon blue halo ring at base */}
      <mesh ref={haloRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[maxDim * 0.5, maxDim * 2.5, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Red cone marker on top of building — spinning + bobbing */}
      <mesh ref={coneRef} position={[0, height + 3, 0]}>
        <coneGeometry args={[coneSize, coneSize * 2, 4]} />
        <meshBasicMaterial color="#ff2020" transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* Neon blue point light on beam source */}
      <pointLight color="#00e5ff" intensity={5} distance={80} position={[0, height + 60, 0]} />

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

      {/* Inner neon blue ring */}
      <mesh ref={ring2Ref} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.8, 48]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Blue-tinted point light on building top */}
      <pointLight color="#00e5ff" intensity={10} distance={70} decay={1.5}
        position={[0, height + 5, 0]} />
    </group>
  );
}
