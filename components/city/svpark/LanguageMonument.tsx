// LanguageMonument — 8 unique Minecraft-style monuments for each programming language
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

interface LanguageMonumentProps {
  language: string;
  color: string;
}

// Python: Double-helix DNA strand
function PythonHelix({ color, isNight }: { color: string; isNight: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.15;
  });

  const blocks: { pos: [number, number, number]; strand: number }[] = [];
  for (let i = 0; i < 20; i++) {
    const y = i * 0.5;
    const angle1 = (i / 20) * Math.PI * 4;
    const angle2 = angle1 + Math.PI;
    blocks.push({ pos: [Math.cos(angle1) * 1.5, y, Math.sin(angle1) * 1.5], strand: 0 });
    blocks.push({ pos: [Math.cos(angle2) * 1.5, y, Math.sin(angle2) * 1.5], strand: 1 });
  }

  return (
    <group ref={groupRef}>
      {blocks.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshLambertMaterial
            color={b.strand === 0 ? color : '#ffd43b'}
            emissive={isNight ? (b.strand === 0 ? color : '#ffd43b') : '#000'}
            emissiveIntensity={isNight ? 0.4 : 0}
          />
        </mesh>
      ))}
      {/* Rungs connecting strands every 4 blocks */}
      {[2, 6, 10, 14, 18].map(i => (
        <mesh key={`rung-${i}`} position={[0, i * 0.5, 0]}>
          <boxGeometry args={[3, 0.15, 0.15]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// JavaScript: Rotating yellow cube with JS letters
function JSCube({ color, isNight }: { color: string; isNight: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
      meshRef.current.position.y = 4 + Math.sin(clock.getElapsedTime() * 0.8) * 0.3;
    }
  });

  return (
    <group>
      {/* Pedestal */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* Floating JS cube */}
      <mesh ref={meshRef} position={[0, 4, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshLambertMaterial
          color={color}
          emissive={isNight ? color : '#000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>
      {/* JS label block on top face */}
      <mesh position={[0, 5.52, 0]}>
        <boxGeometry args={[1.5, 0.05, 1.5]} />
        <meshLambertMaterial color="#000000" />
      </mesh>
    </group>
  );
}

// TypeScript: Blue cube with angular notch
function TSCube({ color, isNight }: { color: string; isNight: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.25;
      meshRef.current.position.y = 4 + Math.sin(clock.getElapsedTime() * 0.7) * 0.3;
    }
  });

  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshLambertMaterial color="#222" />
      </mesh>
      {/* Main blue cube */}
      <mesh ref={meshRef} position={[0, 4, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshLambertMaterial
          color={color}
          emissive={isNight ? color : '#000'}
          emissiveIntensity={isNight ? 0.5 : 0}
        />
      </mesh>
      {/* White T accent on front */}
      <mesh position={[0, 4, 1.52]}>
        <boxGeometry args={[1.8, 0.4, 0.05]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 3.4, 1.52]}>
        <boxGeometry args={[0.4, 1.6, 0.05]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Java: Coffee cup with steam
function JavaCoffeeCup({ color, isNight }: { color: string; isNight: boolean }) {
  const steamRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (steamRef.current) {
      steamRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const t = clock.getElapsedTime() + i * 0.5;
        mesh.position.y = 6.5 + (t % 2) * 1.5;
        mesh.position.x = Math.sin(t * 2 + i) * 0.3;
        (mesh.material as THREE.MeshLambertMaterial).opacity = Math.max(0, 1 - (t % 2) / 2);
      });
    }
  });

  return (
    <group>
      {/* Cup body */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[3, 4, 3]} />
        <meshLambertMaterial
          color={color}
          emissive={isNight ? color : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>
      {/* Cup rim */}
      <mesh position={[0, 5.1, 0]}>
        <boxGeometry args={[3.4, 0.2, 3.4]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {/* Coffee surface */}
      <mesh position={[0, 4.9, 0]}>
        <boxGeometry args={[2.8, 0.1, 2.8]} />
        <meshLambertMaterial color="#3d1c02" />
      </mesh>
      {/* Handle */}
      <mesh position={[1.8, 3, 0]}>
        <boxGeometry args={[0.6, 2, 0.6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Saucer */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[4, 0.3, 4]} />
        <meshLambertMaterial color="#e8e8e8" />
      </mesh>
      {/* Steam particles */}
      <group ref={steamRef}>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[0, 6.5, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshLambertMaterial color="#cccccc" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Rust: Spinning gear/cog
function RustGear({ color, isNight }: { color: string; isNight: boolean }) {
  const gearRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (gearRef.current) gearRef.current.rotation.z = clock.getElapsedTime() * 0.2;
  });

  const TEETH = 8;
  const teeth: { pos: [number, number, number]; rot: number }[] = [];
  for (let i = 0; i < TEETH; i++) {
    const angle = (i / TEETH) * Math.PI * 2;
    teeth.push({
      pos: [Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 0],
      rot: angle,
    });
  }

  return (
    <group>
      {/* Pedestal */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshLambertMaterial color="#444" />
      </mesh>
      {/* Gear group */}
      <group ref={gearRef} position={[0, 5.5, 0]}>
        {/* Center hub */}
        <mesh>
          <boxGeometry args={[2.5, 0.8, 2.5]} />
          <meshLambertMaterial
            color={color}
            emissive={isNight ? color : '#000'}
            emissiveIntensity={isNight ? 0.4 : 0}
          />
        </mesh>
        {/* Center hole */}
        <mesh>
          <boxGeometry args={[1, 0.9, 1]} />
          <meshLambertMaterial color="#222" />
        </mesh>
        {/* Teeth */}
        {teeth.map((t, i) => (
          <mesh key={i} position={t.pos} rotation={[0, 0, t.rot]}>
            <boxGeometry args={[1, 0.8, 0.8]} />
            <meshLambertMaterial
              color={color}
              emissive={isNight ? color : '#000'}
              emissiveIntensity={isNight ? 0.3 : 0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Go: Gopher mascot (blocky)
function GoGopher({ color, isNight }: { color: string; isNight: boolean }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[3, 3.5, 2.5]} />
        <meshLambertMaterial
          color={color}
          emissive={isNight ? color : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[2.5, 2, 2.5]} />
        <meshLambertMaterial
          color={color}
          emissive={isNight ? color : '#000'}
          emissiveIntensity={isNight ? 0.3 : 0}
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.5, 5.3, 1.3]}>
        <boxGeometry args={[0.7, 0.7, 0.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.5, 5.3, 1.3]}>
        <boxGeometry args={[0.7, 0.7, 0.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.5, 5.3, 1.42]}>
        <boxGeometry args={[0.3, 0.3, 0.05]} />
        <meshLambertMaterial color="#000" />
      </mesh>
      <mesh position={[0.5, 5.3, 1.42]}>
        <boxGeometry args={[0.3, 0.3, 0.05]} />
        <meshLambertMaterial color="#000" />
      </mesh>
      {/* Ears */}
      <mesh position={[-1.1, 6.2, 0]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[1.1, 6.2, 0]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Belly (lighter) */}
      <mesh position={[0, 2.5, 1.27]}>
        <boxGeometry args={[2, 2.5, 0.05]} />
        <meshLambertMaterial color="#e8d8b8" />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.8, 0.3, 0.5]}>
        <boxGeometry args={[1, 0.6, 1.5]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0.8, 0.3, 0.5]}>
        <boxGeometry args={[1, 0.6, 1.5]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// C++: Block letters C++
function CppBlockLetters({ color, isNight }: { color: string; isNight: boolean }) {
  return (
    <group>
      {/* Pedestal */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[8, 1, 3]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* C letter — 3 blocks forming a C */}
      <group position={[-2.5, 1, 0]}>
        {/* Top bar */}
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[2.5, 1, 1.5]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
        {/* Vertical */}
        <mesh position={[-0.75, 2.5, 0]}>
          <boxGeometry args={[1, 4, 1.5]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
        {/* Bottom bar */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[2.5, 1, 1.5]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      </group>
      {/* First + */}
      <group position={[1, 1, 0]}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[0.5, 2.5, 0.8]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[2, 0.5, 0.8]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      </group>
      {/* Second + */}
      <group position={[3, 1, 0]}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[0.5, 2.5, 0.8]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[2, 0.5, 0.8]} />
          <meshLambertMaterial color={color} emissive={isNight ? color : '#000'} emissiveIntensity={isNight ? 0.4 : 0} />
        </mesh>
      </group>
    </group>
  );
}

// Kotlin: Rotating diamond shape
function KotlinDiamond({ color, isNight }: { color: string; isNight: boolean }) {
  const diamondRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (diamondRef.current) {
      diamondRef.current.rotation.y = clock.getElapsedTime() * 0.4;
      diamondRef.current.position.y = 5 + Math.sin(clock.getElapsedTime() * 0.6) * 0.4;
    }
  });

  return (
    <group>
      {/* Pedestal */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* Diamond — rotated cube */}
      <mesh ref={diamondRef} position={[0, 5, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]}>
        <boxGeometry args={[2.5, 2.5, 2.5]} />
        <meshLambertMaterial
          color={color}
          emissive={isNight ? color : '#000'}
          emissiveIntensity={isNight ? 0.6 : 0}
        />
      </mesh>
      {/* Gradient triangle overlay (front face) */}
      <mesh ref={diamondRef} position={[0, 5, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]}>
        <boxGeometry args={[2.52, 1.25, 2.52]} />
        <meshLambertMaterial
          color="#e44857"
          transparent
          opacity={0.5}
          emissive={isNight ? '#e44857' : '#000'}
          emissiveIntensity={isNight ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}

export function LanguageMonument({ language, color }: LanguageMonumentProps) {
  const isNight = useCityStore(s => s.isNight);

  switch (language) {
    case 'Python':     return <PythonHelix color={color} isNight={isNight} />;
    case 'JavaScript': return <JSCube color={color} isNight={isNight} />;
    case 'TypeScript': return <TSCube color={color} isNight={isNight} />;
    case 'Java':       return <JavaCoffeeCup color={color} isNight={isNight} />;
    case 'Rust':       return <RustGear color={color} isNight={isNight} />;
    case 'Go':         return <GoGopher color={color} isNight={isNight} />;
    case 'C++':        return <CppBlockLetters color={color} isNight={isNight} />;
    case 'Kotlin':     return <KotlinDiamond color={color} isNight={isNight} />;
    default:           return null;
  }
}
