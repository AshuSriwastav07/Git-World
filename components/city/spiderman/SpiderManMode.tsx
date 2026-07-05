// SpiderManMode — street-level web-swing traversal.
// Mirrors AirplaneMode architecture: all physics via refs, zero React state
// in the render loop, state.invalidate() each frame while active.
// Position is HARD-CLAMPED to the street corridor every frame via
// lib/streetGrid — structurally cannot enter or fly over buildings.
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';
import { clampToCorridor, findAnchor } from '@/lib/streetGrid';
import { SpiderManModel, createSpiderParts } from './SpiderManModel';
import { SpiderCamera } from './SpiderCamera';

/* ── Tuning ── */
const GRAVITY = 22;
const RUN_SPEED = 9;
const BOOST_MULT = 1.7;
const TURN_RATE = 2.6;
const SWING_STEER = 10;      // steering accel while swinging
const AIR_STEER = 6;         // steering accel while falling
const AIR_DRAG = 0.12;
const ROPE_MIN = 3;
const GROUND_Y = 0;
const CHAR_RADIUS = 0.35;
const JUMP_VEL = 9;
const MAX_SPEED = 26;

type MoveState = 'idle' | 'run' | 'swing' | 'fall';

interface Keys {
  fwd: boolean; back: boolean; left: boolean; right: boolean;
  swing: boolean; boost: boolean; jump: boolean;
}

const EXIT_TARGET = new THREE.Vector3(80, 55, 160);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function SpiderManMode() {
  const { camera } = useThree();
  const setActiveMode = useCityStore((s) => s.setActiveMode);

  /* ── Physics state (refs only) ── */
  const pos = useRef(new THREE.Vector3(32.5, 5, 32.5));
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  const heading = useRef(Math.PI); // face -z initially
  const moveState = useRef<MoveState>('fall');
  const anchor = useRef<THREE.Vector3 | null>(null);
  const ropeLen = useRef(0);
  const swingHeld = useRef(false);
  const keys = useRef<Keys>({ fwd: false, back: false, left: false, right: false, swing: false, boost: false, jump: false });
  const joystick = useRef({ x: 0, y: 0, active: false });
  const exiting = useRef(false);
  const exitProgress = useRef(0);
  const animPhase = useRef(0);

  const parts = useMemo(createSpiderParts, []);
  const spiderCam = useMemo(() => new SpiderCamera(), []);

  /* Pre-allocated math objects */
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);
  const aimDir = useMemo(() => new THREE.Vector3(), []);

  /* ── Web line (2 points, updated imperatively) ── */
  const webGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  const webMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#e8e8f0', transparent: true, opacity: 0.85 }), []);
  const webLineRef = useRef<THREE.Line>(null);
  const webLine = useMemo(() => {
    const l = new THREE.Line(webGeo, webMat);
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [webGeo, webMat]);
  useEffect(() => () => { webGeo.dispose(); webMat.dispose(); }, [webGeo, webMat]);

  /* ── HUD refs ── */
  const hintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (hintsRef.current) {
        hintsRef.current.style.transition = 'opacity 1s ease-out';
        hintsRef.current.style.opacity = '0';
      }
    }, 9000);
    return () => clearTimeout(t);
  }, []);

  /* ── Keyboard ── */
  useEffect(() => {
    const set = (k: string, v: boolean) => {
      const K = keys.current;
      if (k === 'w' || k === 'arrowup') K.fwd = v;
      else if (k === 's' || k === 'arrowdown') K.back = v;
      else if (k === 'a' || k === 'arrowleft') K.left = v;
      else if (k === 'd' || k === 'arrowright') K.right = v;
      else if (k === ' ') K.swing = v;
      else if (k === 'shift') K.boost = v;
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ') e.preventDefault();
      set(k, true);
      if (k === 'escape' && !exiting.current) exiting.current = true;
    };
    const up = (e: KeyboardEvent) => set(e.key.toLowerCase(), false);
    const mDown = (e: MouseEvent) => { if (e.button === 0) keys.current.swing = true; };
    const mUp = (e: MouseEvent) => { if (e.button === 0) keys.current.swing = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousedown', mDown);
    window.addEventListener('mouseup', mUp);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousedown', mDown);
      window.removeEventListener('mouseup', mUp);
    };
  }, []);

  /* ── Pose helper: lerp limb rotations toward targets ── */
  const pose = (dt: number, speed2D: number) => {
    const p = parts;
    if (!p.armL || !p.armR || !p.legL || !p.legR || !p.torso) return;
    const k = 1 - Math.exp(-10 * dt);
    const st = moveState.current;
    let aL = 0, aR = 0, lL = 0, lR = 0, lean = 0;

    if (st === 'swing') {
      aR = Math.PI * 0.95;   // right arm up along the web
      aL = Math.PI * 0.3;
      lL = -0.5; lR = -0.7;  // legs trailing
      lean = 0.5;
    } else if (st === 'fall') {
      aL = Math.PI * 0.5; aR = Math.PI * 0.5;
      lL = -0.35; lR = 0.2;
      lean = 0.25;
    } else if (st === 'run') {
      animPhase.current += dt * Math.min(speed2D, 12);
      const s = Math.sin(animPhase.current);
      aL = s * 0.8; aR = -s * 0.8;
      lL = -s * 0.9; lR = s * 0.9;
      lean = 0.18;
    }
    p.armL.rotation.x += (aL - p.armL.rotation.x) * k;
    p.armR.rotation.x += (aR - p.armR.rotation.x) * k;
    p.legL.rotation.x += (lL - p.legL.rotation.x) * k;
    p.legR.rotation.x += (lR - p.legR.rotation.x) * k;
    p.torso.rotation.x += (lean - p.torso.rotation.x) * k;
  };

  /* ── Main loop ── */
  useFrame((state, rawDelta) => {
    const root = parts.root;
    if (!root) return;
    const dt = Math.min(rawDelta, 0.05);

    /* ── Exit animation ── */
    if (exiting.current) {
      exitProgress.current += dt;
      root.visible = exitProgress.current < 0.4;
      camera.position.lerp(EXIT_TARGET, 0.04);
      camera.lookAt(0, 5, 0);
      if (exitProgress.current >= 1.2) {
        setActiveMode('menu');
      }
      state.invalidate();
      return;
    }

    const K = keys.current;
    const J = joystick.current;
    const fwdIn = (K.fwd ? 1 : 0) - (K.back ? 1 : 0) + (J.active ? -J.y : 0);
    const turnIn = (K.left ? 1 : 0) - (K.right ? 1 : 0) + (J.active ? -J.x : 0);
    const wantSwing = K.swing || swingHeld.current;
    const boost = K.boost ? BOOST_MULT : 1;

    heading.current += turnIn * TURN_RATE * dt;
    aimDir.set(Math.sin(heading.current), 0, Math.cos(heading.current));

    const p = pos.current;
    const v = vel.current;
    const st = moveState.current;

    /* ── Fire web ── */
    if (wantSwing && st !== 'swing') {
      const found = findAnchor(p, aimDir);
      if (found) {
        anchor.current = found.point;
        ropeLen.current = Math.max(p.distanceTo(found.point), ROPE_MIN);
        moveState.current = 'swing';
        // small upward kick when leaving the ground
        if (st === 'run' || st === 'idle') v.y = Math.max(v.y, JUMP_VEL * 0.6);
      } else if (st === 'run' || st === 'idle') {
        // no anchor: hop
        if (p.y <= GROUND_Y + 0.01) v.y = JUMP_VEL * 0.8;
        moveState.current = 'fall';
      }
    }

    /* ── Release web ── */
    if (!wantSwing && st === 'swing') {
      anchor.current = null;
      moveState.current = 'fall';
    }

    /* ── Physics per state ── */
    if (moveState.current === 'swing' && anchor.current) {
      const A = anchor.current;
      // gravity + steering
      v.y -= GRAVITY * dt;
      v.addScaledVector(aimDir, fwdIn * SWING_STEER * boost * dt);
      // integrate
      p.addScaledVector(v, dt);
      // rope constraint: project position back to sphere, kill radial velocity
      tmpA.subVectors(p, A);
      const dist = tmpA.length();
      if (dist > ropeLen.current) {
        tmpA.multiplyScalar(ropeLen.current / dist);
        p.copy(A).add(tmpA);
        tmpB.copy(tmpA).normalize();          // radial dir
        const radial = v.dot(tmpB);
        if (radial > 0) v.addScaledVector(tmpB, -radial); // tangent only
      }
      // slight rope shortening while boosting = speed pump
      if (K.boost) ropeLen.current = Math.max(ropeLen.current - 2.5 * dt, ROPE_MIN);
      if (p.y <= GROUND_Y + 0.01) {
        anchor.current = null;
        moveState.current = 'run';
      }
    } else if (moveState.current === 'fall') {
      v.y -= GRAVITY * dt;
      v.addScaledVector(aimDir, fwdIn * AIR_STEER * boost * dt);
      v.x *= 1 - AIR_DRAG * dt;
      v.z *= 1 - AIR_DRAG * dt;
      p.addScaledVector(v, dt);
      if (p.y <= GROUND_Y + 0.01) {
        p.y = GROUND_Y;
        v.y = 0;
        moveState.current = Math.abs(fwdIn) > 0.05 ? 'run' : 'idle';
      }
    } else {
      // grounded: run/idle
      const speed = RUN_SPEED * boost * fwdIn;
      v.x = aimDir.x * speed;
      v.z = aimDir.z * speed;
      v.y = 0;
      p.addScaledVector(v, dt);
      p.y = GROUND_Y;
      moveState.current = Math.abs(fwdIn) > 0.05 ? 'run' : 'idle';
    }

    /* ── Speed cap ── */
    const sp = v.length();
    if (sp > MAX_SPEED) v.multiplyScalar(MAX_SPEED / sp);

    /* ── HARD CLAMP to street corridor — every frame, all states ── */
    const clampRes = clampToCorridor(p, v, CHAR_RADIUS, GROUND_Y);
    if (clampRes.hitCeiling && moveState.current === 'swing') {
      // web geometry says we'd cross a rooftop — cut the web
      anchor.current = null;
      moveState.current = 'fall';
    }

    /* ── Apply to model ── */
    root.position.copy(p);
    root.rotation.y = heading.current;

    /* ── Web line ── */
    const line = webLineRef.current;
    if (line) {
      if (moveState.current === 'swing' && anchor.current) {
        const attr = webGeo.getAttribute('position') as THREE.BufferAttribute;
        // hand position (approx right hand raised)
        tmpB.set(0.3, 1.6, 0).applyAxisAngle(Y_AXIS, heading.current).add(p);
        attr.setXYZ(0, tmpB.x, tmpB.y, tmpB.z);
        attr.setXYZ(1, anchor.current.x, anchor.current.y, anchor.current.z);
        attr.needsUpdate = true;
        line.visible = true;
      } else {
        line.visible = false;
      }
    }

    /* ── Pose + camera ── */
    pose(dt, Math.sqrt(v.x * v.x + v.z * v.z));
    spiderCam.update(p, heading.current, camera, dt);
    state.invalidate();
  });

  /* ── Touch joystick handlers (attached to HUD elements) ── */
  const joyBase = useRef<HTMLDivElement>(null);
  const joyKnob = useRef<HTMLDivElement>(null);
  const handleJoy = (e: React.PointerEvent, end = false) => {
    const base = joyBase.current;
    const knob = joyKnob.current;
    if (!base || !knob) return;
    if (end) {
      joystick.current = { x: 0, y: 0, active: false };
      knob.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);
    const m = Math.sqrt(dx * dx + dy * dy);
    if (m > 1) { dx /= m; dy /= m; }
    joystick.current = { x: dx, y: dy, active: true };
    knob.style.transform = `translate(calc(-50% + ${dx * 28}px), calc(-50% + ${dy * 28}px))`;
  };

  const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  return (
    <>
      <SpiderManModel parts={parts} />

      {/* Web line */}
      <primitive object={webLine} ref={webLineRef} />

      <Html fullscreen zIndexRange={[40, 40]} style={{ pointerEvents: 'none' }}>
        {/* Hints */}
        <div
          ref={hintsRef}
          style={{
            position: 'absolute',
            bottom: isCoarse ? 150 : 24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            fontSize: 10,
            color: '#a8a8b8',
            whiteSpace: 'nowrap',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
          }}
        >
          {isCoarse
            ? 'Joystick: Move · Hold SWING to web-swing · Release to launch'
            : 'W/S: Move · A/D: Turn · Hold SPACE/Click: Swing · SHIFT: Boost · ESC: Exit'}
        </div>

        {/* Touch controls — coarse pointers only */}
        {isCoarse && (
          <>
            {/* Virtual joystick */}
            <div
              ref={joyBase}
              onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); handleJoy(e); }}
              onPointerMove={(e) => { if (joystick.current.active) handleJoy(e); }}
              onPointerUp={(e) => handleJoy(e, true)}
              onPointerCancel={(e) => handleJoy(e, true)}
              style={{
                position: 'absolute',
                left: 24,
                bottom: 32,
                width: 110,
                height: 110,
                borderRadius: '50%',
                border: '2px solid rgba(245,197,24,0.35)',
                background: 'rgba(6,4,12,0.5)',
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            >
              <div
                ref={joyKnob}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(245,197,24,0.5)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* SWING button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); swingHeld.current = true; }}
              onPointerUp={() => { swingHeld.current = false; }}
              onPointerCancel={() => { swingHeld.current = false; }}
              style={{
                position: 'absolute',
                right: 28,
                bottom: 48,
                width: 84,
                height: 84,
                borderRadius: '50%',
                border: '2px solid rgba(193,18,31,0.6)',
                background: 'rgba(193,18,31,0.35)',
                color: '#fff',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            >
              SWING
            </button>

            {/* BOOST button */}
            <button
              onPointerDown={(e) => { e.preventDefault(); keys.current.boost = true; }}
              onPointerUp={() => { keys.current.boost = false; }}
              onPointerCancel={() => { keys.current.boost = false; }}
              style={{
                position: 'absolute',
                right: 128,
                bottom: 36,
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '2px solid rgba(245,197,24,0.5)',
                background: 'rgba(245,197,24,0.25)',
                color: '#f5c518',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            >
              BOOST
            </button>

            {/* EXIT button */}
            <button
              onClick={() => { exiting.current = true; }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid rgba(245,197,24,0.4)',
                background: 'rgba(6,4,12,0.7)',
                color: '#f5c518',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                pointerEvents: 'auto',
              }}
            >
              EXIT
            </button>
          </>
        )}
      </Html>
    </>
  );
}
