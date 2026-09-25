import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { Key, curve } from "../utils/easing";
import { DEG, layeredNoise } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

export type CameraMove = {
  x: readonly Key[];
  y: readonly Key[];
  z: readonly Key[];
  roll: readonly Key[]; // degrees
  fov: readonly Key[];
  targetX: readonly Key[];
  targetY: readonly Key[];
};

// Keys are [progress 0..1, value]. The rhythm: establish (0-15%), a slow
// push (15-55%), more energy (55-80%), then overshoot a hair and settle.
export const HERO_MOVE: CameraMove = {
  x: [
    [0, -0.4],
    [0.15, -0.34],
    [0.55, 0.02],
    [0.8, 0.6],
    [0.93, 0.83],
    [1, 0.8],
  ],
  y: [
    [0, 0.05],
    [0.55, -0.02],
    [0.88, -0.115],
    [1, -0.1],
  ],
  z: [
    [0, 7],
    [0.15, 6.86],
    [0.55, 6.05],
    [0.8, 5.12],
    [0.94, 4.74],
    [1, 4.8],
  ],
  roll: [
    [0, -0.3],
    [0.5, 0.02],
    [0.86, 0.48],
    [1, 0.4],
  ],
  fov: [
    [0, 42],
    [0.6, 40.6],
    [0.92, 37.8],
    [1, 38],
  ],
  // Where the lens points: it trails the dolly a little, which reads as a
  // slow pan following the subject.
  targetX: [
    [0, -0.25],
    [0.2, -0.22],
    [0.65, -0.05],
    [0.95, 0.12],
    [1, 0.11],
  ],
  targetY: [
    [0, -0.02],
    [1, -0.14],
  ],
};

const target = new Vector3();
const restPos = new Vector3();

export const CameraRig: React.FC<{
  move?: CameraMove;
  subject: Vector3;
}> = ({ move = HERO_MOVE, subject }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { rig, settings } = useScene();

  useTimeline((t) => {
    const u = Math.min(1, Math.max(0, t / (settings.duration - 1)));
    const k = settings.cameraIntensity;
    // Intensity scales how far the camera travels from its opening mark.
    const at = (keys: readonly Key[]) =>
      keys[0][1] + (curve(u, keys) - keys[0][1]) * k;

    // Handheld-on-a-stabilised-dolly: slow, layered, never jittery.
    const sway = (seed: string, amp: number, base = 0.018) =>
      layeredNoise(t, seed, base) * amp * k;

    restPos.set(move.x[0][1], move.y[0][1], move.z[0][1]);
    camera.position.set(
      at(move.x) + sway("cam-x", 0.018),
      at(move.y) + sway("cam-y", 0.012),
      at(move.z) + sway("cam-z", 0.02, 0.011),
    );
    target.set(
      at(move.targetX) + sway("tgt-x", 0.01, 0.013),
      at(move.targetY) + sway("tgt-y", 0.008, 0.015),
      0,
    );
    camera.lookAt(target);
    camera.rotateZ((at(move.roll) + sway("roll", 0.08, 0.02)) * DEG);
    camera.fov = at(move.fov);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    rig.position.copy(camera.position);
    rig.rest.copy(restPos);
    rig.fov = camera.fov;
    rig.focus = camera.position.distanceTo(subject);
  }, 0);

  return null;
};
