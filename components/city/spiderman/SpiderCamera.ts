// SpiderCamera — damped third-person chase camera for Spider-Man mode.
// Modeled on FlightCamera; camera position is corridor-clamped with a
// boom-shortening fallback so buildings never clip the view.
import * as THREE from 'three';
import { clampToCorridor } from '@/lib/streetGrid';

const BOOM_BACK = 6.5;   // distance behind character
const BOOM_UP = 2.8;     // height above character
const LOOK_AHEAD = 4;    // look-at point ahead of character
const POS_DAMP = 4.5;    // camera position damping
const LOOK_DAMP = 7;     // look-at damping

export class SpiderCamera {
  private desired = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private smoothedLook = new THREE.Vector3();
  private back = new THREE.Vector3();
  private initialized = false;

  update(
    charPos: THREE.Vector3,
    heading: number, // yaw the character faces (radians)
    camera: THREE.Camera,
    dt: number
  ) {
    // Desired boom position behind the character based on heading
    this.back.set(Math.sin(heading), 0, Math.cos(heading));
    this.desired.copy(charPos)
      .addScaledVector(this.back, -BOOM_BACK);
    this.desired.y = charPos.y + BOOM_UP;

    // Corridor-clamp the boom (radius 0.4). If clamped into a wall, pull in.
    const r = clampToCorridor(this.desired, null, 0.4, 1.2);
    if (r.hitWall) {
      // Shorten the boom halfway toward the character and re-clamp
      this.desired.lerp(charPos, 0.45);
      this.desired.y = Math.max(this.desired.y, charPos.y + 1.2);
      clampToCorridor(this.desired, null, 0.3, 1.2);
    }

    this.lookTarget.copy(charPos)
      .addScaledVector(this.back, LOOK_AHEAD);
    this.lookTarget.y = charPos.y + 1;

    if (!this.initialized) {
      camera.position.copy(this.desired);
      this.smoothedLook.copy(this.lookTarget);
      this.initialized = true;
    } else {
      const kPos = 1 - Math.exp(-POS_DAMP * dt);
      const kLook = 1 - Math.exp(-LOOK_DAMP * dt);
      camera.position.lerp(this.desired, kPos);
      this.smoothedLook.lerp(this.lookTarget, kLook);
    }
    camera.lookAt(this.smoothedLook);
  }

  reset() {
    this.initialized = false;
  }
}
