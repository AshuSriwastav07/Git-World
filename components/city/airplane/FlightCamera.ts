// FlightCamera — Pure TypeScript camera follow logic for airplane mode
// Pre-allocates all temp objects to avoid GC pressure in useFrame.
import * as THREE from 'three';

const LOCAL_OFFSET = new THREE.Vector3(0, 2.5, -8);
const LOOK_AHEAD = new THREE.Vector3(0, 0, 15);

export class FlightCamera {
  private _worldOffset = new THREE.Vector3();
  private _targetCamPos = new THREE.Vector3();
  private _lookTarget = new THREE.Vector3();
  private _tempOffset = new THREE.Vector3();

  /** Smooth follow: split XZ (snappy) / Y (smooth) lerp for stable flight feel */
  updateFromPlane(
    planePosition: THREE.Vector3,
    planeQuaternion: THREE.Quaternion,
    camera: THREE.Camera,
    dt: number,
  ): void {
    // Camera target position = plane pos + rotated local offset
    this._tempOffset.copy(LOCAL_OFFSET);
    this._worldOffset.copy(this._tempOffset).applyQuaternion(planeQuaternion);
    this._targetCamPos.copy(planePosition).add(this._worldOffset);

    // Frame-rate-independent split lerp: XZ tracks faster, Y is softer
    const xzSmooth = 1 - Math.exp(-2.0 * dt);
    const ySmooth  = 1 - Math.exp(-1.8 * dt);
    camera.position.x += (this._targetCamPos.x - camera.position.x) * xzSmooth;
    camera.position.z += (this._targetCamPos.z - camera.position.z) * xzSmooth;
    camera.position.y += (this._targetCamPos.y - camera.position.y) * ySmooth;

    // Look ahead of the plane
    this._tempOffset.copy(LOOK_AHEAD);
    this._lookTarget.copy(planePosition).add(
      this._tempOffset.applyQuaternion(planeQuaternion),
    );
    camera.lookAt(this._lookTarget);
  }

  /** Snap camera to default overview position */
  reset(camera: THREE.Camera, target: THREE.Vector3): void {
    camera.position.set(80, 55, 160);
    camera.lookAt(target);
  }
}
