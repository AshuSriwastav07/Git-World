// FireworkSystem — colorful particle bursts in the sky
'use client';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const MAX_SPARKS = 3000;

interface Spark {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  decay: number;
  r: number; g: number; b: number;
  active: boolean;
}

const FIREWORK_COLORS: [number, number, number][] = [
  [1.0, 0.9, 0.2], // gold
  [1.0, 0.2, 0.2], // red
  [0.2, 0.8, 1.0], // cyan
  [1.0, 0.3, 1.0], // magenta
  [0.3, 1.0, 0.3], // green
  [1.0, 0.6, 0.1], // orange
  [0.6, 0.2, 1.0], // purple
  [1.0, 1.0, 1.0], // white
];

export default function FireworkSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const sparks = useRef<Spark[]>(
    Array.from({ length: MAX_SPARKS }, () => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      life: 0, decay: 0, r: 1, g: 1, b: 1, active: false,
    }))
  );
  const nextFirework = useRef(2.0);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    return geo;
  }, []);

  function launchFirework() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 120;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    const cy = 80 + Math.random() * 100;

    const colTuple = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const [cr, cg, cb] = colTuple;
    const col2 = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

    const SPARKS_PER_BURST = 60 + Math.floor(Math.random() * 80);
    let placed = 0;

    for (let i = 0; i < sparks.current.length && placed < SPARKS_PER_BURST; i++) {
      const s = sparks.current[i];
      if (s.active) continue;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 8 + Math.random() * 18;

      s.x = cx; s.y = cy; s.z = cz;
      s.vx = Math.sin(phi) * Math.cos(theta) * speed;
      s.vy = Math.cos(phi) * speed * 0.7;
      s.vz = Math.sin(phi) * Math.sin(theta) * speed;
      s.life = 1.0;
      s.decay = 0.6 + Math.random() * 0.8;

      if (Math.random() < 0.3) {
        s.r = col2[0]; s.g = col2[1]; s.b = col2[2];
      } else {
        s.r = cr; s.g = cg; s.b = cb;
      }
      s.active = true;
      placed++;
    }
  }

  useFrame((_, delta) => {
    nextFirework.current -= delta;
    if (nextFirework.current <= 0) {
      const burst = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i++) launchFirework();
      nextFirework.current = 1.5 + Math.random() * 3.0;
    }

    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < sparks.current.length; i++) {
      const s = sparks.current[i];
      const i3 = i * 3;

      if (!s.active || s.life <= 0) {
        positions[i3] = 0; positions[i3 + 1] = -9999; positions[i3 + 2] = 0;
        colors[i3] = 0; colors[i3 + 1] = 0; colors[i3 + 2] = 0;
        continue;
      }

      s.vy -= 9.8 * delta * 0.4;
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.vz *= 0.985;

      s.x += s.vx * delta;
      s.y += s.vy * delta;
      s.z += s.vz * delta;

      s.life -= delta * s.decay;
      if (s.life <= 0) { s.active = false; s.life = 0; }

      positions[i3] = s.x;
      positions[i3 + 1] = s.y;
      positions[i3 + 2] = s.z;

      const fade = Math.pow(Math.max(s.life, 0), 0.5);
      colors[i3] = s.r * fade + (1 - fade) * 0.6;
      colors[i3 + 1] = s.g * fade + (1 - fade) * 0.6;
      colors[i3 + 2] = s.b * fade + (1 - fade) * 0.6;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={3.0}
        vertexColors
        transparent
        toneMapped={false}
        opacity={1.0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
