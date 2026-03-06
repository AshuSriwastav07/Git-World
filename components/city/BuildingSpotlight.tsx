// BuildingSpotlight — god-ray beam + gold ring on selected building
'use client';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { slotToWorld, getBuildingDimensions } from '@/lib/cityLayout';
import { useCityStore } from '@/lib/cityStore';
import { getLanguageColor } from '@/types';
import type { CityDeveloper } from '@/types';

interface Props {
  user: CityDeveloper;
}

export default function BuildingSpotlight({ user }: Props) {
  const sortedLogins = useCityStore(s => s.sortedLogins);
  const beamRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const rank = sortedLogins.indexOf(user.login) + 1;
  const slot = user.citySlot ?? rank;
  const pos = slotToWorld(slot);
  const dims = getBuildingDimensions(rank, slot, user);

  const BX = pos.x;
  const BZ = pos.z;
  const BH = dims.height;
  const BW = dims.width;

  const langColor = getLanguageColor(user.topLanguage);
  const BEAM_HEIGHT = 200;

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + 0.12 * Math.sin(t * 2);
    }

    if (ringRef.current) {
      const scale = 1 + 0.2 * Math.sin(t * 3);
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 + 0.3 * Math.sin(t * 3);
    }
  });

  return (
    <group>
      {/* God-ray beam from sky down to building */}
      <mesh ref={beamRef} position={[BX, BH / 2 + BEAM_HEIGHT / 2, BZ]}>
        <cylinderGeometry args={[BW * 0.6, BW * 2.5, BEAM_HEIGHT, 12, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Bright point light on building top */}
      <pointLight
        position={[BX, BH + 5, BZ]}
        color="#fffacc"
        intensity={20}
        distance={80}
        decay={2}
      />

      {/* Gold ring at base — pulsing */}
      <mesh ref={ringRef} position={[BX, 0.1, BZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BW * 0.9, BW * 1.6, 32]} />
        <meshBasicMaterial
          color="#f5c518"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Secondary smaller ring */}
      <mesh position={[BX, 0.15, BZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BW * 0.5, BW * 0.75, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Language-colored spot below beam */}
      <pointLight
        position={[BX, BH * 0.5, BZ]}
        color={langColor}
        intensity={12}
        distance={60}
        decay={2}
      />
    </group>
  );
}
