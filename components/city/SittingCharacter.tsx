// SittingCharacter — clickable Minecraft character in sitting pose
'use client';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { SlimUser } from '@/lib/supabaseDb';
import { langColor } from '@/lib/textureGenerator';
import { useCityStore } from '@/lib/cityStore';

interface SittingCharacterProps {
  user: SlimUser;
  position: [number, number, number];
  cameraDistance?: number;
}

export default function SittingCharacter({ user, position, cameraDistance = 999 }: SittingCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const setSelectedUser = useCityStore(s => s.setSelectedUser);

  const bodyColor = langColor(user.topLanguage);
  const skinColor = '#f4c89a';
  const pantsColor = '#2c3e50';

  const bodyMat  = new THREE.MeshLambertMaterial({ color: bodyColor });
  const skinMat  = new THREE.MeshLambertMaterial({ color: hovered ? '#ffffff' : skinColor });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(hovered ? 1.08 : 1.0);
    }
  });

  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelectedUser(user);
  };

  const showLabel = cameraDistance < 45;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <primitive object={skinMat} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.55, 0.65, 0.3]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.4, 1.1, 0]}>
        <boxGeometry args={[0.22, 0.55, 0.22]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.4, 1.1, 0]}>
        <boxGeometry args={[0.22, 0.55, 0.22]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Left thigh (bent — sitting) */}
      <mesh position={[-0.15, 0.6, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.22, 0.5, 0.22]} />
        <primitive object={pantsMat} />
      </mesh>
      {/* Right thigh */}
      <mesh position={[0.15, 0.6, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.22, 0.5, 0.22]} />
        <primitive object={pantsMat} />
      </mesh>
      {/* Left shin */}
      <mesh position={[-0.15, 0.3, 0.5]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <primitive object={pantsMat} />
      </mesh>
      {/* Right shin */}
      <mesh position={[0.15, 0.3, 0.5]}>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <primitive object={pantsMat} />
      </mesh>

      {/* Floating username label */}
      {showLabel && (
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="black"
        >
          {user.login}
        </Text>
      )}
    </group>
  );
}
