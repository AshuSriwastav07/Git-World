// CityGrid — InstancedMesh rendering for all buildings + Minecraft grass ground + street lights
'use client';
import { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useCityStore } from '@/lib/cityStore';
import {
  slotToWorld,
  getBuildingDimensions,
  getGroundSize,
  isInsidePark,
  isOnConnectorRoad,
  CONNECTOR_ROAD_HALF_WIDTH,
} from '@/lib/cityLayout';
import { LANGUAGE_COLORS } from '@/lib/textureGenerator';
import { preloadProfile } from '@/components/ui/ProfileModal';

const MAX_BUILDINGS = 8000;

/* ── Window color palette per building ── */
const WINDOW_COLORS = ['#ff3333', '#33ff33', '#ffdd33', '#ffffff', '#3399ff', '#222222'];

/* ── Easing: slight overshoot for "pop-up" feel ── */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/* ── Neutral window texture: white windows on black, tinted by instanceColor ── */
function createWindowTexture(night: boolean): THREE.CanvasTexture {
  const S = 32;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, S, S);

  const WIN = 6, GAP = 1, MARGIN = 2, STEP = WIN + GAP;
  const COLS = Math.floor((S - MARGIN * 2) / STEP);
  const ROWS = Math.floor((S - MARGIN * 2) / STEP);
  const OX = Math.floor((S - COLS * STEP - GAP) / 2);
  const OY = Math.floor((S - ROWS * STEP - GAP) / 2);
  const litRatio = night ? 0.92 : 0.82;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const wx = OX + col * STEP;
      const wy = OY + row * STEP;
      if (Math.random() < litRatio) {
        const b = Math.round((night ? 0.85 + Math.random() * 0.15 : 0.55 + Math.random() * 0.45) * 255);
        ctx.fillStyle = `rgb(${b},${b},${b})`;
        ctx.fillRect(wx, wy, WIN, WIN);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(wx + 2, wy + 2, 2, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(wx, wy, WIN, 1);
        ctx.fillRect(wx, wy, 1, WIN);
      } else {
        const d = Math.round((night ? 0.15 : 0.06) * 255);
        ctx.fillStyle = `rgb(${d},${d},${d})`;
        ctx.fillRect(wx, wy, WIN, WIN);
      }
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 8; y < S; y += 8) ctx.fillRect(0, y, S, 1);

  const grad = ctx.createLinearGradient(S * 0.55, 0, S, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.needsUpdate = true;
  return tex;
}

/* ── Minecraft grass texture ── */
function createGroundTexture(): THREE.CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#72767d';
  ctx.fillRect(0, 0, S, S);
  const rng = (seed: number) => { let s = seed; return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return ((s >>> 0) / 0xffffffff); }; };
  const r = rng(42069);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = r();
      if (v < 0.35) { ctx.fillStyle = `rgba(52, 56, 63, ${0.12 + r() * 0.18})`; ctx.fillRect(x, y, 1, 1); }
      else if (v < 0.62) { ctx.fillStyle = `rgba(138, 143, 150, ${0.08 + r() * 0.14})`; ctx.fillRect(x, y, 1, 1); }
      else if (v < 0.72) { ctx.fillStyle = `rgba(96, 101, 108, ${0.08 + r() * 0.12})`; ctx.fillRect(x, y, 1, 1); }
    }
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; ctx.lineWidth = 1;
  for (let i = 0; i < S; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function ConnectorRoads() {
  return (
    <group>
      {/* Vertical connectors between parks (base only) */}
      <mesh position={[0, 0.031, -39.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CONNECTOR_ROAD_HALF_WIDTH * 2, 29]} />
        <meshLambertMaterial color="#13171c" />
      </mesh>
      <mesh position={[0, 0.031, 69.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CONNECTOR_ROAD_HALF_WIDTH * 2, 89]} />
        <meshLambertMaterial color="#13171c" />
      </mesh>

      {/* Gate connectors at park edges */}
      <mesh position={[0, 0.032, -54]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 2]} />
        <meshLambertMaterial color="#13171c" />
      </mesh>
      <mesh position={[0, 0.032, 114]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 2]} />
        <meshLambertMaterial color="#13171c" />
      </mesh>

      {/* Dashed lane markers */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`lane-top-${i}`} position={[0, 0.05, -52 + i * 2.8]}>
          <boxGeometry args={[0.9, 0.02, 1.4]} />
          <meshBasicMaterial color="#c8d0d8" />
        </mesh>
      ))}
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh key={`lane-bottom-${i}`} position={[0, 0.05, 28 + i * 3.4]}>
          <boxGeometry args={[0.9, 0.02, 1.7]} />
          <meshBasicMaterial color="#c8d0d8" />
        </mesh>
      ))}
    </group>
  );
}

/* ── Street lamp — no React state subscription, materials updated imperatively ── */
const _lampEmissive = new THREE.Color();
const LAMP_DAY_EMISSIVE = new THREE.Color('#000000');
const LAMP_NIGHT_EMISSIVE = new THREE.Color('#ffdd88');

// Shared lamp materials — created once, updated in CityGrid useFrame
let _sharedLampMat: THREE.MeshLambertMaterial | null = null;
let _sharedGlowMat: THREE.MeshBasicMaterial | null = null;

function getSharedLampMat() {
  if (!_sharedLampMat) {
    _sharedLampMat = new THREE.MeshLambertMaterial({
      color: '#ffdd88',
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
    });
  }
  return _sharedLampMat;
}

function getSharedGlowMat() {
  if (!_sharedGlowMat) {
    _sharedGlowMat = new THREE.MeshBasicMaterial({
      color: '#ffcc66',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  }
  return _sharedGlowMat;
}

function StreetLight({ position }: { position: [number, number, number] }) {
  const lampMat = useMemo(getSharedLampMat, []);
  const glowMat = useMemo(getSharedGlowMat, []);
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}><boxGeometry args={[0.25, 4, 0.25]} /><meshLambertMaterial color="#555555" /></mesh>
      <mesh position={[0.5, 4, 0]}><boxGeometry args={[1, 0.2, 0.2]} /><meshLambertMaterial color="#555555" /></mesh>
      <mesh position={[1, 3.7, 0]}><boxGeometry args={[0.6, 0.6, 0.6]} /><primitive object={lampMat} attach="material" /></mesh>
      <mesh position={[1, 3.7, 0]}><sphereGeometry args={[1.8, 8, 8]} /><primitive object={glowMat} attach="material" /></mesh>
    </group>
  );
}

/* ── Selection ring at selected building ── */
function SelectionRing() {
  const selectedUser = useCityStore(s => s.selectedUser);
  const sortedLogins = useCityStore(s => s.sortedLogins);
  const meshRef = useRef<THREE.Mesh>(null);

  const target = useMemo(() => {
    if (!selectedUser) return null;
    const idx = sortedLogins.indexOf(selectedUser.login.toLowerCase());
    const rank = idx >= 0 ? idx + 1 : (selectedUser.cityRank ?? 1);
    const slot = selectedUser.citySlot ?? (rank - 1);
    const pos = slotToWorld(slot);
    const dims = getBuildingDimensions(rank, slot, selectedUser);
    return { pos, dims };
  }, [selectedUser, sortedLogins]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !target) return;
    const t = clock.getElapsedTime();
    meshRef.current.scale.setScalar(1 + 0.15 * Math.sin(t * 4));
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.35 * Math.sin(t * 4);
  });

  if (!target) return null;
  const maxDim = Math.max(target.dims.width, target.dims.depth);
  return (
    <mesh ref={meshRef} position={[target.pos.x, 0.05, target.pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[maxDim * 0.9, maxDim * 1.9, 32]} />
      <meshBasicMaterial color="#f5c518" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ── Tier 1 crown for rank-1 building ── */
function Tier1Crown() {
  const users = useCityStore(s => s.users);
  const sortedLogins = useCityStore(s => s.sortedLogins);
  if (sortedLogins.length === 0) return null;
  const user = users.get(sortedLogins[0]);
  if (!user) return null;
  const slot = user.citySlot ?? 0;
  const pos = slotToWorld(slot);
  const { height, width, depth } = getBuildingDimensions(1, slot, user);
  const langColor = LANGUAGE_COLORS[user.topLanguage] ?? LANGUAGE_COLORS.default;
  return (
    <group position={[pos.x, 0, pos.z]}>
      {([[0.75, 10], [0.50, 8], [0.30, 6]] as const).map(([s, h], i) => (
        <mesh key={i} position={[0, height - 15 + 10 * i + h / 2, 0]}>
          <boxGeometry args={[width * s, h, depth * s]} />
          <meshLambertMaterial color={langColor} />
        </mesh>
      ))}
      <mesh position={[0, height + 9, 0]}><boxGeometry args={[0.5, 1.5, 0.5]} /><meshBasicMaterial color="#ffd700" /></mesh>
      <mesh position={[0, height + 19, 0]}><boxGeometry args={[0.1, 18, 0.1]} /><meshBasicMaterial color="#aaaaaa" /></mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
        <mesh key={`gs-${i}`} position={[sx * (width / 2 + 0.08), height / 2, sz * (depth / 2 + 0.08)]}>
          <boxGeometry args={[0.08, height, 0.08]} />
          <meshBasicMaterial color="#ffd700" />
        </mesh>
      ))}
    </group>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CityGrid — main export
   Uses TWO InstancedMeshes: body (textured) + glow (additive blending).
   Individual Building components are eliminated for 60 fps at 5000+ buildings.
   During cinematic intro, buildings rise from ground outward from center.
   ════════════════════════════════════════════════════════════════════════════ */
export function CityGrid() {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  const sortedLogins = useCityStore(s => s.sortedLogins);
  const selectedUser = useCityStore(s => s.selectedUser);
  const selectUser   = useCityStore(s => s.selectUser);
  const isNight      = useCityStore(s => s.isNight);
  const introStage   = useCityStore(s => s.introStage);
  const introStartTime = useCityStore(s => s.introStartTime);
  const setIntroProgress = useCityStore(s => s.setIntroProgress);

  const loginsByInstance = useRef<string[]>([]);
  const instanceCount = useRef(0);
  /* Store per-building data for rise animation */
  const buildingData = useRef<{ pos: THREE.Vector3; width: number; height: number; depth: number; dist: number }[]>([]);

  /* Shared geometry — a unit cube scaled per instance */
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  /* Pre-build BOTH day AND night materials at startup — swap on toggle, never recreate */
  const { dayBodyMat, nightBodyMat, dayGlowMat, nightGlowMat } = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        dayBodyMat: new THREE.MeshLambertMaterial(),
        nightBodyMat: new THREE.MeshLambertMaterial(),
        dayGlowMat: new THREE.MeshBasicMaterial(),
        nightGlowMat: new THREE.MeshBasicMaterial(),
      };
    }
    const dayTex = createWindowTexture(false);
    const nightTex = createWindowTexture(true);

    const dayBody = new THREE.MeshLambertMaterial({
      map: dayTex,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
    });
    const nightBody = new THREE.MeshLambertMaterial({
      map: nightTex,
      emissive: new THREE.Color('#ffcc66'),
      emissiveIntensity: 0.18,
      emissiveMap: nightTex,
    });
    const dayGlow = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0.05, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.BackSide,
    });
    const nightGlow = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0.3, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.BackSide,
    });

    return { dayBodyMat: dayBody, nightBodyMat: nightBody, dayGlowMat: dayGlow, nightGlowMat: nightGlow };
  }, []); // empty deps — created once, never recreated

  /* Swap materials instantly on day/night toggle — 2 ref swaps, not 8000 rebuilds */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.material = isNight ? nightBodyMat : dayBodyMat;
    if (glowRef.current) glowRef.current.material = isNight ? nightGlowMat : dayGlowMat;
  }, [isNight, dayBodyMat, nightBodyMat, dayGlowMat, nightGlowMat]);

  /* Dispose all GPU resources on unmount */
  useEffect(() => {
    return () => {
      dayBodyMat.dispose(); nightBodyMat.dispose();
      dayGlowMat.dispose(); nightGlowMat.dispose();
      if (dayBodyMat.map) dayBodyMat.map.dispose();
      if (nightBodyMat.map) nightBodyMat.map.dispose();
      boxGeo.dispose();
    };
  }, [dayBodyMat, nightBodyMat, dayGlowMat, nightGlowMat, boxGeo]);

  /* ── Build / rebuild all instances ── */
  useEffect(() => {
    // Skip rebuilding during loading — buildings aren't visible yet
    if (introStage === 'loading') return;

    const body = bodyRef.current;
    const glow = glowRef.current;
    if (!body || !glow) return;

    // Access users via getState to avoid re-render subscription during loading
    const users = useCityStore.getState().users;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const logins: string[] = [];
    const bData: typeof buildingData.current = [];
    let count = 0;

    const isDone = introStage === 'done' || introStage === 'buttons';

    /* Pre-calculate selected building position for nearby-hiding */
    const HIDE_RADIUS = 18; // world units — buildings within this radius of selected are hidden
    let selPos: { x: number; z: number } | null = null;
    let selLogin: string | null = null;
    if (selectedUser) {
      const idx = sortedLogins.indexOf(selectedUser.login.toLowerCase());
      const rank = idx >= 0 ? idx + 1 : (selectedUser.cityRank ?? 1);
      const slot = selectedUser.citySlot ?? (rank - 1);
      const p = slotToWorld(slot);
      selPos = { x: p.x, z: p.z };
      selLogin = selectedUser.login.toLowerCase();
    }

    sortedLogins.forEach((login, index) => {
      const user = users.get(login);
      if (!user || count >= MAX_BUILDINGS) return;
      const slot = user.citySlot ?? index;
      const rank = index + 1;
      const pos = slotToWorld(slot);
      if (isInsidePark(pos.x, pos.z) || isOnConnectorRoad(pos.x, pos.z, 1.5)) return;
      const dims = getBuildingDimensions(rank, slot, user);

      const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

      /* Hide nearby buildings when one is selected (except the selected one itself) */
      if (selPos && login !== selLogin) {
        const dx = pos.x - selPos.x;
        const dz = pos.z - selPos.z;
        const distToSel = Math.sqrt(dx * dx + dz * dz);
        if (distToSel < HIDE_RADIUS && distToSel > 0.1) {
          // Push a dummy hidden instance (scale 0) to keep index mapping consistent
          dummy.position.set(pos.x, -1000, pos.z);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          body.setMatrixAt(count, dummy.matrix);
          glow.setMatrixAt(count, dummy.matrix);
          color.set(WINDOW_COLORS[count % WINDOW_COLORS.length]);
          body.setColorAt(count, color);
          glow.setColorAt(count, color);
          bData.push({ pos: new THREE.Vector3(pos.x, 0, pos.z), width: dims.width, height: dims.height, depth: dims.depth, dist });
          logins.push(login);
          count++;
          return;
        }
      }

      if (isDone) {
        // Final position — full height
        dummy.position.set(pos.x, dims.height / 2, pos.z);
        dummy.scale.set(dims.width, dims.height, dims.depth);
      } else {
        // During intro — start at 0 height (will be animated in useFrame)
        dummy.position.set(pos.x, 0.01, pos.z);
        dummy.scale.set(dims.width, 0.02, dims.depth);
      }
      dummy.updateMatrix();
      body.setMatrixAt(count, dummy.matrix);

      if (isDone) {
        dummy.scale.set(dims.width + 0.35, dims.height + 0.1, dims.depth + 0.35);
      } else {
        dummy.scale.set(dims.width + 0.35, 0.02, dims.depth + 0.35);
      }
      dummy.updateMatrix();
      glow.setMatrixAt(count, dummy.matrix);

      color.set(WINDOW_COLORS[count % WINDOW_COLORS.length]);
      body.setColorAt(count, color);
      glow.setColorAt(count, color);

      bData.push({ pos: new THREE.Vector3(pos.x, 0, pos.z), width: dims.width, height: dims.height, depth: dims.depth, dist });
      logins.push(login);
      count++;
    });

    body.count = count;
    glow.count = count;
    body.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
    body.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    glow.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    body.computeBoundingSphere();
    glow.computeBoundingSphere();

    loginsByInstance.current = logins;
    instanceCount.current = count;
    buildingData.current = bData;
  }, [sortedLogins, introStage, selectedUser]); // isNight removed — material swap handles day/night

  /* ── Rise animation during cinematic intro ── */
  const RISE_DURATION = 7000; // 7 seconds for all buildings to rise
  const MAX_DIST_DELAY = 0.6;  // fraction of rise time used for distance-based delay
  const riseDummy = useMemo(() => new THREE.Object3D(), []);
  const groundRef = useRef<THREE.MeshLambertMaterial>(null);
  const dayFactorRef = useRef(useCityStore.getState().isNight ? 0 : 1);

  /* ── Imperative day/night transitions for street lamps + ground (zero re-renders) ── */
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const isNight = useCityStore.getState().isNight;
    const targetDay = isNight ? 0 : 1;
    dayFactorRef.current = THREE.MathUtils.lerp(dayFactorRef.current, targetDay, dt * 0.8);
    const f = dayFactorRef.current;
    const nightF = 1 - f;

    // Lamp material
    const lamp = getSharedLampMat();
    _lampEmissive.copy(LAMP_DAY_EMISSIVE).lerp(LAMP_NIGHT_EMISSIVE, nightF);
    lamp.emissive.copy(_lampEmissive);
    lamp.emissiveIntensity = nightF * 2.0;

    // Glow material
    const glow = getSharedGlowMat();
    glow.opacity = nightF * 0.08;

    // Ground color lerp (day: grass green, night: darker)
    if (groundRef.current) {
      const g = groundRef.current;
      if (!g.userData._dayColor) {
        g.userData._dayColor = new THREE.Color('#ffffff');
        g.userData._nightColor = new THREE.Color('#2f343c');
        g.userData._current = new THREE.Color('#ffffff');
      }
      (g.userData._current as THREE.Color).copy(g.userData._nightColor).lerp(g.userData._dayColor, f);
      g.color.copy(g.userData._current);
    }
    _state.invalidate();
  });

  useFrame((riseState) => {
    if (introStage !== 'cinematic' && introStage !== 'loading') return;
    const body = bodyRef.current;
    const glow = glowRef.current;
    if (!body || !glow || introStartTime === 0) return;

    const elapsed = Date.now() - introStartTime;
    const globalProgress = Math.min(elapsed / RISE_DURATION, 1);
    setIntroProgress(globalProgress);

    const count = instanceCount.current;
    if (count === 0) return;

    // Find max distance for normalization
    let maxDist = 1;
    for (let i = 0; i < count; i++) {
      if (buildingData.current[i].dist > maxDist) maxDist = buildingData.current[i].dist;
    }

    let anyChanged = false;

    for (let i = 0; i < count; i++) {
      const bd = buildingData.current[i];
      // Buildings closer to center rise first
      const normalizedDist = bd.dist / maxDist;
      const delayFraction = normalizedDist * MAX_DIST_DELAY;
      const localProgress = Math.max(0, Math.min((globalProgress - delayFraction) / (1 - MAX_DIST_DELAY), 1));

      // Eased progress for smooth rise
      const eased = easeOutBack(localProgress);
      const currentHeight = bd.height * eased;

      if (currentHeight > 0.02) {
        riseDummy.position.set(bd.pos.x, currentHeight / 2, bd.pos.z);
        riseDummy.scale.set(bd.width, currentHeight, bd.depth);
        riseDummy.updateMatrix();
        body.setMatrixAt(i, riseDummy.matrix);

        riseDummy.scale.set(bd.width + 0.35, currentHeight + 0.1, bd.depth + 0.35);
        riseDummy.updateMatrix();
        glow.setMatrixAt(i, riseDummy.matrix);
        anyChanged = true;
      }
    }

    if (anyChanged) {
      body.instanceMatrix.needsUpdate = true;
      glow.instanceMatrix.needsUpdate = true;
    }
    riseState.invalidate();
  });

  /* ── Click-vs-drag guard ── */
  const pointerDown = useRef<{ x: number; y: number; time: number } | null>(null);
  const DRAG_THRESHOLD = 5; // px — movement beyond this means drag, not click
  const CLICK_TIMEOUT = 200; // ms — ignore clicks held longer than this

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDown.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const isRealClick = useCallback((e: ThreeEvent<MouseEvent>): boolean => {
    if (!pointerDown.current) return false;
    const dx = e.clientX - pointerDown.current.x;
    const dy = e.clientY - pointerDown.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - pointerDown.current.time;
    pointerDown.current = null;
    return dist < DRAG_THRESHOLD && elapsed < CLICK_TIMEOUT;
  }, []);

  /* ── Click handler ── */
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // During intro, skip it on click
    if (introStage !== 'done' && introStage !== 'buttons') {
      useCityStore.getState().setIntroStage('done');
      useCityStore.getState().setIntroProgress(1);
      useCityStore.getState().setUserInteracted();
      return;
    }
    if (!isRealClick(e)) return; // drag, not click
    if (e.instanceId !== undefined) {
      const login = loginsByInstance.current[e.instanceId];
      if (login) {
        const user = useCityStore.getState().users.get(login);
        if (user) selectUser(user);
      }
    }
  }, [selectUser, introStage, isRealClick]);

  /* ── Hover preload: pre-fetch profile data on hover ── */
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (e.instanceId === undefined) return;
    const login = loginsByInstance.current[e.instanceId];
    if (!login) return;
    hoverTimer.current = setTimeout(() => preloadProfile(login), 300);
  }, []);
  const handlePointerOut = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }, []);

  /* ── Ground ── */
  const groundSize = getGroundSize(sortedLogins.length);
  const groundTex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const tex = createGroundTexture();
    tex.repeat.set(Math.max(Math.round(groundSize / 5), 12), Math.max(Math.round(groundSize / 5), 12));
    return tex;
  }, [groundSize]);

  /* ── Street lights ── */
  const streetLights = useMemo(() => {
    const positions: [number, number, number][] = [];
    const half = Math.floor(groundSize / 2);
    for (let x = -half + 10; x < half; x += 20) {
      for (let z = -half + 10; z < half; z += 20) {
        if (!isInsidePark(x, z) && !isOnConnectorRoad(x, z, 3)) positions.push([x, 0, z]);
      }
    }
    return positions;
  }, [groundSize]);

  return (
    <group onPointerMissed={() => selectUser(null)}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow={false}>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshLambertMaterial ref={groundRef} map={groundTex ?? undefined} color={groundTex ? '#ffffff' : '#72767d'} />
      </mesh>

      {/* Connector roads between parks (never inside park interiors) */}
      <ConnectorRoads />

      {/* Street Lights */}
      {streetLights.map((pos, i) => <StreetLight key={`sl-${i}`} position={pos} />)}

      {/* Building bodies — InstancedMesh */}
      <instancedMesh
        ref={bodyRef}
        args={[boxGeo, dayBodyMat, MAX_BUILDINGS]}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        frustumCulled={false}
      />

      {/* Glow shells — InstancedMesh */}
      <instancedMesh ref={glowRef} args={[boxGeo, dayGlowMat, MAX_BUILDINGS]} frustumCulled={false} renderOrder={0} />

      {/* Selection ring */}
      <SelectionRing />

      {/* Tier 1 crown decorations */}
      <Tier1Crown />
    </group>
  );
}
