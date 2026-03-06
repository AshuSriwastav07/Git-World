// TechPark — green park with trees, fountain, benches, sign, characters
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { getTechParkWorldCenter } from '@/lib/cityLayout';
import { ParkCharacter } from './ParkCharacter';

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshLambertMaterial color="#8B4513" />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[5, 3, 5]} />
        <meshLambertMaterial color="#2d8a2d" />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[3, 0.2, 0.8]} />
        <meshLambertMaterial color="#8B6914" />
      </mesh>
      {/* Legs */}
      <mesh position={[-1, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshLambertMaterial color="#5C4033" />
      </mesh>
      <mesh position={[1, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshLambertMaterial color="#5C4033" />
      </mesh>
    </group>
  );
}

function Fountain() {
  const isNight = useCityStore((s) => s.isNightMode);
  return (
    <group>
      {/* Stone ring */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[4, 4.5, 1, 8]} />
        <meshLambertMaterial color="#888888" />
      </mesh>
      {/* Water */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.4, 8]} />
        <meshLambertMaterial
          color="#4488cc"
          emissive={isNight ? '#003388' : '#000000'}
          emissiveIntensity={isNight ? 0.4 : 0}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Center column */}
      <mesh position={[0, 2.0, 0]}>
        <boxGeometry args={[1, 3, 1]} />
        <meshLambertMaterial color="#999999" />
      </mesh>
    </group>
  );
}

function LampPost({ position }: { position: [number, number, number] }) {
  const isNight = useCityStore((s) => s.isNightMode);
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.3, 3, 0.3]} />
        <meshLambertMaterial color="#555555" />
      </mesh>
      {/* Glowstone */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshLambertMaterial
          color="#ffcc55"
          emissive={isNight ? '#ffcc55' : '#000000'}
          emissiveIntensity={isNight ? 0.8 : 0}
        />
      </mesh>
      {isNight && <pointLight position={[0, 3.5, 0]} color="#ffcc55" intensity={2.0} distance={25} />}
    </group>
  );
}

function ChessTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Legs */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshLambertMaterial color="#777777" />
      </mesh>
      {/* Top */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.8, 0.2, 1.8]} />
        <meshLambertMaterial color="#999999" />
      </mesh>
    </group>
  );
}

function FlowerPatch({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function TechParkSign({ position }: { position: [number, number, number] }) {
  const isNight = useCityStore((s) => s.isNightMode);
  const letters = 'TECH PARK';

  return (
    <group position={position}>
      {/* Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[letters.length * 2.5 + 2, 0.3, 0.3]} />
        <meshLambertMaterial color="#555555" />
      </mesh>
      {/* Letters as gold blocks */}
      {letters.split('').map((char, i) => {
        if (char === ' ') return null;
        return (
          <mesh
            key={i}
            position={[(i - letters.length / 2 + 0.5) * 2.2, 0, 0.3]}
          >
            <boxGeometry args={[1.8, 3, 0.6]} />
            <meshLambertMaterial
              color="#ffd700"
              emissive={isNight ? '#ffd700' : '#000000'}
              emissiveIntensity={isNight ? 0.6 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function TechPark() {
  const park = getTechParkWorldCenter();
  const users = useCityStore((s) => s.users);
  const isNight = useCityStore((s) => s.isNightMode);

  // Get top 20 most recently active developers
  const parkCharacters = useMemo(() => {
    const all = Array.from(users.values());
    return all
      .sort((a, b) => b.recentActivity - a.recentActivity)
      .slice(0, 20);
  }, [users]);

  const characterPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 8 + (i % 3) * 5;
      positions.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ]);
    }
    return positions;
  }, []);

  return (
    <group position={[park.x, 0.05, park.z]}>
      {/* Green ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial color="#5a9e28" />
      </mesh>

      {/* Perimeter fence */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fence-n-${i}`} position={[-25 + i, 0.5, -25]}>
          <boxGeometry args={[1, 1, 0.3]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fence-s-${i}`} position={[-25 + i, 0.5, 25]}>
          <boxGeometry args={[1, 1, 0.3]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fence-w-${i}`} position={[-25, 0.5, -25 + i]}>
          <boxGeometry args={[0.3, 1, 1]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={`fence-e-${i}`} position={[25, 0.5, -25 + i]}>
          <boxGeometry args={[0.3, 1, 1]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Trees */}
      <Tree position={[-20, 0, -20]} />
      <Tree position={[20, 0, -20]} />
      <Tree position={[-20, 0, 20]} />
      <Tree position={[20, 0, 20]} />
      <Tree position={[-15, 0, 0]} />
      <Tree position={[15, 0, 0]} />
      <Tree position={[0, 0, -18]} />
      <Tree position={[0, 0, 18]} />

      {/* Fountain */}
      <Fountain />

      {/* Benches */}
      <Bench position={[6, 0, 6]} rotation={Math.PI / 4} />
      <Bench position={[-6, 0, 6]} rotation={-Math.PI / 4} />
      <Bench position={[6, 0, -6]} rotation={-Math.PI / 4} />

      {/* Lamp posts */}
      <LampPost position={[-22, 0, -22]} />
      <LampPost position={[22, 0, -22]} />
      <LampPost position={[-22, 0, 22]} />
      <LampPost position={[22, 0, 22]} />

      {/* Chess tables */}
      <ChessTable position={[-10, 0, 10]} />
      <ChessTable position={[10, 0, -10]} />

      {/* Flower patches */}
      <FlowerPatch position={[8, 0.25, 8]} color="#ff4444" />
      <FlowerPatch position={[9, 0.25, 7]} color="#ffff44" />
      <FlowerPatch position={[-8, 0.25, -8]} color="#ff88cc" />
      <FlowerPatch position={[-9, 0.25, -7]} color="#ff8800" />
      <FlowerPatch position={[3, 0.25, 12]} color="#ff4444" />
      <FlowerPatch position={[-3, 0.25, -12]} color="#ffff44" />

      {/* TECH PARK Sign */}
      <TechParkSign position={[0, 4, -23]} />

      {/* Park Characters */}
      {parkCharacters.map((dev, i) => (
        <ParkCharacter
          key={dev.login}
          developer={dev}
          position={characterPositions[i] || [0, 0, 0]}
        />
      ))}
    </group>
  );
}
