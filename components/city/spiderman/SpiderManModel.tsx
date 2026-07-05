// SpiderManModel — procedural voxel web-slinger matching the city's blocky
// aesthetic. ~18 boxes, 3 shared materials. Limb groups are exposed through
// `parts` so SpiderManMode can pose them imperatively (zero React state).
'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export interface SpiderParts {
  root: THREE.Group | null;
  armL: THREE.Group | null;
  armR: THREE.Group | null;
  legL: THREE.Group | null;
  legR: THREE.Group | null;
  torso: THREE.Group | null;
}

export function createSpiderParts(): SpiderParts {
  return { root: null, armL: null, armR: null, legL: null, legR: null, torso: null };
}

/* Character is ~1.5 units tall; origin at feet */
export function SpiderManModel({ parts }: { parts: SpiderParts }) {
  const redMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#c1121f' }), []);
  const blueMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#1d3fa8' }), []);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8f0ff' }), []);

  useEffect(() => () => { redMat.dispose(); blueMat.dispose(); eyeMat.dispose(); }, [redMat, blueMat, eyeMat]);

  return (
    <group ref={(g) => { parts.root = g; }}>
      <group ref={(g) => { parts.torso = g; }} position={[0, 0.95, 0]}>
        {/* Torso */}
        <mesh material={redMat} position={[0, 0, 0]}>
          <boxGeometry args={[0.42, 0.5, 0.24]} />
        </mesh>
        {/* Hips */}
        <mesh material={blueMat} position={[0, -0.3, 0]}>
          <boxGeometry args={[0.38, 0.14, 0.22]} />
        </mesh>
        {/* Head */}
        <mesh material={redMat} position={[0, 0.42, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.28]} />
        </mesh>
        {/* Eyes (front face, +Z) */}
        <mesh material={eyeMat} position={[-0.075, 0.44, 0.145]}>
          <boxGeometry args={[0.09, 0.1, 0.02]} />
        </mesh>
        <mesh material={eyeMat} position={[0.075, 0.44, 0.145]}>
          <boxGeometry args={[0.09, 0.1, 0.02]} />
        </mesh>

        {/* Left arm — pivot at shoulder */}
        <group ref={(g) => { parts.armL = g; }} position={[-0.28, 0.2, 0]}>
          <mesh material={redMat} position={[0, -0.14, 0]}>
            <boxGeometry args={[0.12, 0.3, 0.12]} />
          </mesh>
          <mesh material={blueMat} position={[0, -0.4, 0]}>
            <boxGeometry args={[0.11, 0.26, 0.11]} />
          </mesh>
          {/* Hand */}
          <mesh material={redMat} position={[0, -0.58, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
          </mesh>
        </group>

        {/* Right arm */}
        <group ref={(g) => { parts.armR = g; }} position={[0.28, 0.2, 0]}>
          <mesh material={redMat} position={[0, -0.14, 0]}>
            <boxGeometry args={[0.12, 0.3, 0.12]} />
          </mesh>
          <mesh material={blueMat} position={[0, -0.4, 0]}>
            <boxGeometry args={[0.11, 0.26, 0.11]} />
          </mesh>
          <mesh material={redMat} position={[0, -0.58, 0]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
          </mesh>
        </group>
      </group>

      {/* Left leg — pivot at hip */}
      <group ref={(g) => { parts.legL = g; }} position={[-0.12, 0.58, 0]}>
        <mesh material={blueMat} position={[0, -0.16, 0]}>
          <boxGeometry args={[0.15, 0.32, 0.16]} />
        </mesh>
        <mesh material={redMat} position={[0, -0.44, 0]}>
          <boxGeometry args={[0.14, 0.26, 0.15]} />
        </mesh>
        {/* Boot */}
        <mesh material={redMat} position={[0, -0.6, 0.03]}>
          <boxGeometry args={[0.15, 0.1, 0.22]} />
        </mesh>
      </group>

      {/* Right leg */}
      <group ref={(g) => { parts.legR = g; }} position={[0.12, 0.58, 0]}>
        <mesh material={blueMat} position={[0, -0.16, 0]}>
          <boxGeometry args={[0.15, 0.32, 0.16]} />
        </mesh>
        <mesh material={redMat} position={[0, -0.44, 0]}>
          <boxGeometry args={[0.14, 0.26, 0.15]} />
        </mesh>
        <mesh material={redMat} position={[0, -0.6, 0.03]}>
          <boxGeometry args={[0.15, 0.1, 0.22]} />
        </mesh>
      </group>
    </group>
  );
}
