import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { Key, curve, inertia } from "../utils/easing";
import { DEG, clamp01, lerp, layeredNoise } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

type Shot = {
  t: number; // seconds
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  roll?: number;
};

// The camera script, in seconds. Between shots the camera moves on smooth
// curves, so it accelerates out of one mark and settles into the next.
export const STORY_SHOTS: Shot[] = [
  // Act I: behind the rat and a little above, as in the reference.
  { t: 0, pos: [-0.55, 1.4, 6.8], target: [0, 0.4, 0], fov: 40, roll: -0.4 },
  { t: 3.2, pos: [-0.4, 1.3, 6.2], target: [0.05, 0.4, 0], fov: 40 },
  {
    t: 5.6,
    pos: [-0.15, 1.2, 5.6],
    target: [0.05, 0.35, 0],
    fov: 39,
    roll: 0.2,
  },
  { t: 9.6, pos: [0.25, 1.15, 5.35], target: [0.1, 0.32, 0], fov: 38.5 },
  {
    t: 13.8,
    pos: [-0.2, 1.2, 5.45],
    target: [0, 0.34, 0],
    fov: 38.5,
    roll: -0.3,
  },
  { t: 17.5, pos: [0.3, 1.1, 5.2], target: [0.1, 0.32, 0], fov: 38 },
  { t: 20.6, pos: [0.15, 1.2, 5.5], target: [0.05, 0.4, 0], fov: 38.5 },
  // "Indonesia merdeka 80 tahun": pull back to see everything they left.
  { t: 22.6, pos: [0, 1.95, 9.2], target: [0, 1.0, -3], fov: 44, roll: 0.3 },
  { t: 25.9, pos: [0.1, 1.8, 8.3], target: [0, 0.95, -3], fov: 43 },
  // The blackout hides a cut to Act II: lower, tighter, heavier.
  { t: 26.3, pos: [0.1, 1.8, 8.3], target: [0, 0.95, -3], fov: 43 },
  {
    t: 26.35,
    pos: [-0.7, 0.85, 5.1],
    target: [0, 0.35, 0],
    fov: 37,
    roll: -0.8,
  },
  {
    t: 29.5,
    pos: [-0.45, 0.85, 4.95],
    target: [0.05, 0.36, 0],
    fov: 37,
    roll: -0.4,
  },
  {
    t: 33.0,
    pos: [0.35, 0.8, 4.85],
    target: [0.1, 0.34, 0],
    fov: 36.5,
    roll: 0.5,
  },
  {
    t: 37.0,
    pos: [-0.3, 0.9, 5.05],
    target: [0, 0.35, 0],
    fov: 37,
    roll: -0.3,
  },
  { t: 41.4, pos: [0, 1.0, 5.6], target: [0, 0.4, 0], fov: 38 },
  // "siapa yang penjajah itu": a slow, heavy push towards him.
  { t: 44.8, pos: [0.05, 1.02, 4.4], target: [0, 0.5, 0], fov: 36 },
];

const track = (pick: (s: Shot) => number): Key[] =>
  STORY_SHOTS.map((s) => [s.t, pick(s)] as const);

const tracks = {
  px: track((s) => s.pos[0]),
  py: track((s) => s.pos[1]),
  pz: track((s) => s.pos[2]),
  tx: track((s) => s.target[0]),
  ty: track((s) => s.target[1]),
  tz: track((s) => s.target[2]),
  fov: track((s) => s.fov),
  roll: track((s) => s.roll ?? 0),
};

const storyPos = new Vector3();
const storyTarget = new Vector3();
const facePos = new Vector3();
const faceTarget = new Vector3();
const right = new Vector3();
const UP = new Vector3(0, 1, 0);

export const StoryCamera: React.FC<{
  faceAt: number; // seconds: start swinging round to the face
  heading: number; // the subject's walking direction, degrees
}> = ({ faceAt, heading }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { rig, settings } = useScene();

  useTimeline((t) => {
    const sec = t / 30;
    const k = settings.cameraIntensity;
    const sway = (seed: string, amp: number, base = 0.018) =>
      layeredNoise(t, seed, base) * amp * k;
    // Act II is handheld and uneasy; Act I and the ending are steadier.
    const unease = sec > 26.3 && sec < faceAt ? 1.8 : 1;

    storyPos.set(
      curve(sec, tracks.px) + sway("sx", 0.02 * unease),
      curve(sec, tracks.py) + sway("sy", 0.014 * unease),
      curve(sec, tracks.pz) + sway("sz", 0.02, 0.011),
    );
    storyTarget.set(
      curve(sec, tracks.tx) + sway("tx", 0.012 * unease, 0.013),
      curve(sec, tracks.ty) + sway("ty", 0.01 * unease, 0.015),
      curve(sec, tracks.tz),
    );
    let fov = curve(sec, tracks.fov);
    let roll = curve(sec, tracks.roll) + sway("roll", 0.1 * unease, 0.02);

    // The ending: swing round in front of him and close in on his face,
    // slightly below eye level, leaving the right of frame for the words.
    const e = inertia(clamp01((sec - faceAt) / 4.2));
    if (e > 0) {
      const back = heading * DEG;
      const phi = lerp(0, 152, e) * DEG + (sec - faceAt) * 0.6 * DEG;
      const bx = -Math.sin(back);
      const bz = Math.cos(back);
      const dir = new Vector3(
        bx * Math.cos(phi) + bz * Math.sin(phi),
        0,
        -bx * Math.sin(phi) + bz * Math.cos(phi),
      );
      const settle = clamp01((sec - faceAt - 4.2) / 6);
      const dist = lerp(4.4, 1.55, e) - 0.14 * settle;
      facePos
        .copy(rig.head)
        .addScaledVector(dir, dist)
        .add(new Vector3(0, lerp(0.5, -0.04, e), 0));
      right.copy(dir).negate().cross(UP).normalize();
      faceTarget
        .copy(rig.head)
        .addScaledVector(right, 0.36 * e)
        .add(new Vector3(0, -0.05 * e, 0));
      storyPos.lerp(facePos, e);
      storyTarget.lerp(faceTarget, e);
      fov = lerp(fov, 30, e);
      roll = lerp(roll, 1.2, e);
    }

    camera.position.copy(storyPos);
    camera.lookAt(storyTarget);
    camera.rotateZ(roll * DEG);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    rig.position.copy(camera.position);
    rig.rest.copy(camera.position);
    rig.fov = fov;
    rig.focus = camera.position.distanceTo(rig.head);
  }, 0);

  return null;
};
