// Airplane — Full 3D flight with mouse steering (pointer lock) + WASD controls
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCityStore } from '@/lib/cityStore';

const MIN_ALTITUDE = 2;

// Pre-allocated temp objects — NEVER inside useFrame (prevents GC pauses)
const _right    = new THREE.Vector3();
const _axisX    = new THREE.Vector3(1, 0, 0);
const _axisY    = new THREE.Vector3(0, 1, 0);
const _axisZ    = new THREE.Vector3(0, 0, 1);
const _qPitch   = new THREE.Quaternion();
const _qYaw     = new THREE.Quaternion();
const _qRoll    = new THREE.Quaternion();
const _qBank    = new THREE.Quaternion();
const _qGrav    = new THREE.Quaternion();
const _forward  = new THREE.Vector3();
const _fwd2     = new THREE.Vector3();
const _levelQ   = new THREE.Quaternion();
const _levelMat = new THREE.Matrix4();
const _origin   = new THREE.Vector3();
const _up       = new THREE.Vector3(0, 1, 0);
const _camOff   = new THREE.Vector3();
const _targetCam = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _camQ     = new THREE.Quaternion();
const _lookMat  = new THREE.Matrix4();

export function Airplane() {
  const groupRef = useRef<THREE.Group>(null);
  const propellerRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const isNight = useCityStore((s) => s.isNight);

  const state = useRef({
    throttle: 0.3,
    speed: 12,
    position: new THREE.Vector3(0, 60, 0),
    quaternion: new THREE.Quaternion(),
    keys: new Set<string>(),
    mouseX: 0,
    mouseY: 0,
    blinkTimer: 0,
    blinkOn: true,
    locked: false,
  });

  // Pointer lock for mouse flight control
  const requestLock = useCallback(() => {
    gl.domElement.requestPointerLock();
  }, [gl]);

  useEffect(() => {
    const onLockChange = () => {
      state.current.locked = document.pointerLockElement === gl.domElement;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!state.current.locked) return;
      state.current.mouseX += e.movementX * 0.003;
      state.current.mouseY += e.movementY * 0.003;
    };

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    // Request pointer lock on click while in airplane mode
    gl.domElement.addEventListener('click', requestLock);

    // Request lock immediately
    requestLock();

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      gl.domElement.removeEventListener('click', requestLock);
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    };
  }, [gl, requestLock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      state.current.keys.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      state.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_state, delta) => {
    const s = state.current;
    const keys = s.keys;
    const dt = Math.min(delta, 0.05); // Cap to prevent physics explosion

    // Throttle: W = increase, S = decrease
    if (keys.has('w')) s.throttle = Math.min(s.throttle + dt * 0.8, 1);
    if (keys.has('s')) s.throttle = Math.max(s.throttle - dt * 0.8, 0);

    // Speed from throttle
    const boost = keys.has('shift') ? 2.5 : 1;
    const targetSpeed = 15 + s.throttle * 55;
    s.speed += (targetSpeed * boost - s.speed) * dt * 3;

    // Clamp mouse input to prevent extreme values
    s.mouseX = Math.max(-1.5, Math.min(1.5, s.mouseX));
    s.mouseY = Math.max(-1.5, Math.min(1.5, s.mouseY));

    // Mouse steering → pitch and yaw (smoothed)
    const pitchRate = -s.mouseY * 3.5;
    const yawRate = -s.mouseX * 3.0;

    // Fast decay — much less sticky, plane stops turning quickly when mouse stops
    s.mouseX *= 0.72;
    s.mouseY *= 0.72;
    // Dead zone — zero out tiny residual values
    if (Math.abs(s.mouseX) < 0.003) s.mouseX = 0;
    if (Math.abs(s.mouseY) < 0.003) s.mouseY = 0;

    // Keyboard roll: A/D
    let rollRate = 0;
    if (keys.has('a')) rollRate = 2.5;
    if (keys.has('d')) rollRate = -2.5;

    // Direct yaw: Q/E for fine-tuning heading without banking
    let directYaw = 0;
    if (keys.has('q')) directYaw = 1.5;
    if (keys.has('e')) directYaw = -1.5;

    // Direct altitude: Space = climb, Ctrl/C = dive
    let altThrust = 0;
    if (keys.has(' ')) altThrust = 35;
    if (keys.has('control') || keys.has('c')) altThrust = -35;

    // Bank-to-turn: roll angle automatically generates yaw (realistic banking turns)
    _right.set(1, 0, 0).applyQuaternion(s.quaternion);
    const bankYawRate = -_right.y * 2.0;

    // Build rotation deltas as quaternions applied in local space (reuse pre-allocated)
    _qPitch.setFromAxisAngle(_axisX, pitchRate * dt);
    _qYaw.setFromAxisAngle(_axisY, (yawRate + directYaw) * dt);
    _qRoll.setFromAxisAngle(_axisZ, rollRate * dt);

    // Bank-to-turn applied in world space (pre-multiply)
    if (Math.abs(bankYawRate) > 0.01) {
      _qBank.setFromAxisAngle(_axisY, bankYawRate * dt);
      s.quaternion.premultiply(_qBank);
    }

    // Apply local rotations (order: yaw, pitch, roll)
    s.quaternion.multiply(_qYaw).multiply(_qPitch).multiply(_qRoll);
    s.quaternion.normalize();

    // Forward direction from quaternion
    _forward.set(0, 0, -1).applyQuaternion(s.quaternion);

    // Move forward
    s.position.addScaledVector(_forward, s.speed * dt);

    // Direct altitude adjustment
    s.position.y += altThrust * dt;

    // Gentle gravity: nose drifts down at low speed
    if (s.speed < 20) {
      const gravPitch = (1 - s.speed / 20) * 0.4 * dt;
      _qGrav.setFromAxisAngle(_axisX, gravPitch);
      s.quaternion.multiply(_qGrav);
      s.quaternion.normalize();
    }

    // Floor clamp
    if (s.position.y < MIN_ALTITUDE) {
      s.position.y = MIN_ALTITUDE;
    }

    // Update airplane mesh
    if (groupRef.current) {
      groupRef.current.position.copy(s.position);
      groupRef.current.quaternion.copy(s.quaternion);
    }

    // Propeller spin
    if (propellerRef.current) {
      propellerRef.current.rotation.x += dt * (8 + s.throttle * 25);
    }

    // Auto-level: quickly restore wings level when not actively steering
    const isIdle = Math.abs(s.mouseX) < 0.005 && Math.abs(s.mouseY) < 0.005 && !keys.has('a') && !keys.has('d');
    if (isIdle) {
      _fwd2.set(0, 0, -1).applyQuaternion(s.quaternion);
      _origin.set(0, 0, 0);
      _up.set(0, 1, 0);
      _levelMat.lookAt(_origin, _fwd2, _up);
      _levelQ.setFromRotationMatrix(_levelMat);
      s.quaternion.slerp(_levelQ, dt * 2.0);
      s.quaternion.normalize();
    }

    // Camera follow — responsive lerp behind and above the plane (zero allocation)
    _camOff.set(0, 6, 25).applyQuaternion(s.quaternion);
    _targetCam.copy(s.position).add(_camOff);
    camera.position.lerp(_targetCam, 0.22);

    _lookTarget.copy(s.position).addScaledVector(_forward, 15);
    _up.set(0, 1, 0);
    _lookMat.lookAt(camera.position, _lookTarget, _up);
    _camQ.setFromRotationMatrix(_lookMat);
    camera.quaternion.slerp(_camQ, 0.25);

    // Blink
    s.blinkTimer += dt;
    if (s.blinkTimer > 0.8) { s.blinkTimer = 0; s.blinkOn = !s.blinkOn; }
    _state.invalidate();
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh>
        <boxGeometry args={[2.2, 2.2, 7]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Cockpit */}
      <mesh position={[0, 0.9, -2.5]}>
        <boxGeometry args={[2, 1.4, 2]} />
        <meshLambertMaterial color="#66ccff" transparent opacity={0.7} />
      </mesh>

      {/* Left wing */}
      <mesh position={[4.5, -0.2, 0]}>
        <boxGeometry args={[9, 0.4, 1.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Right wing */}
      <mesh position={[-4.5, -0.2, 0]}>
        <boxGeometry args={[9, 0.4, 1.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Vertical tail fin */}
      <mesh position={[0, 1.5, 3]}>
        <boxGeometry args={[0.4, 2.2, 2.2]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Left horizontal stabilizer */}
      <mesh position={[1.6, 0.2, 3]}>
        <boxGeometry args={[3.2, 0.3, 0.4]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Right horizontal stabilizer */}
      <mesh position={[-1.6, 0.2, 3]}>
        <boxGeometry args={[3.2, 0.3, 0.4]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Engine nacelle */}
      <mesh position={[0, -0.2, -3.8]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshLambertMaterial color="#888888" />
      </mesh>

      {/* Propeller */}
      <group ref={propellerRef} position={[0, -0.2, -4.6]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <boxGeometry args={[0.2, 4.5, 0.3]} />
          <meshLambertMaterial color="#444444" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.2, 4.5, 0.3]} />
          <meshLambertMaterial color="#444444" />
        </mesh>
      </group>

      {/* Banner */}
      <mesh position={[0, -1.3, 1]}>
        <boxGeometry args={[0.1, 0.6, 5]} />
        <meshLambertMaterial color="#ff4444" />
      </mesh>

      {/* Navigation lights */}
      {isNight && (
        <>
          <pointLight position={[5, -0.2, 0]} color="red" intensity={2} distance={15} />
          <pointLight position={[-5, -0.2, 0]} color="green" intensity={2} distance={15} />
          <pointLight position={[0, 2.5, 3]} color="white" intensity={1.5} distance={20} />
        </>
      )}
    </group>
  );
}
