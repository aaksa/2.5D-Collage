import { random } from "remotion";
import { expoIn, expoOut, inertia } from "../utils/easing";
import { DEG, clamp01, lerp } from "../utils/motion";
import {
  ACT_TWO,
  BEAT,
  BEAT_OFFSET,
  DURATION,
  Entrance,
  FALL,
  HIT,
  SHOTS,
  SILENCE,
  SPREAD,
  Shot,
} from "./timeline";

// World layout. The camera looks down -z at the stage; a print is 3:2.
export const PHOTO_H = 3.0;
export const PHOTO_W = 4.5;
export const BORDER = 0.13;
export const CARD_W = PHOTO_W + BORDER * 2;
export const CARD_H = PHOTO_H + BORDER * 2;
export const STAGE_Y = 0.3;
export const CAMERA_Z = 10;
export const FOV = 30;

export type Pose = {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  opacity: number;
  dim: number;
  age: number;
  flash: number;
  // Inner camera: shift (roughly -1..1) and push-in.
  ix: number;
  iy: number;
  zoom: number;
  split: number; // crack opening, 0..1
  fullBleed: number;
};

const smooth = (a: number, b: number, t: number) => {
  const u = clamp01((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const ramp = (a: number, b: number, t: number, ease = expoOut) =>
  ease(clamp01((t - a) / (b - a)));
// Damped wobble after an impact; 0 before it.
const settle = (u: number, freq = 3, decay = 6) =>
  u <= 0 ? 0 : Math.exp(-decay * u) * Math.sin(u * freq * Math.PI * 2);
const wobble = (t: number, seed: string, speed = 0.6) =>
  Math.sin(t * speed + random(seed) * 6.28) * 0.6 +
  Math.sin(t * speed * 2.31 + random(`${seed}b`) * 6.28) * 0.4;

type From = Partial<Record<"x" | "y" | "z" | "rx" | "ry" | "rz" | "s", number>>;
type Motion = {
  duration: number;
  ease: (u: number) => number;
  from: From; // offsets at the start (angles in degrees)
  fade?: number; // seconds of fade-in, for prints that don't fly in
  impact?: { y?: number; rz?: number; rx?: number; ry?: number; s?: number };
};

const MOTIONS: Record<Entrance, Motion> = {
  emerge: { duration: 2.4, ease: inertia, from: { z: -9, y: -0.3, rz: 4 }, fade: 1.3 },
  slide: { duration: 0.6, ease: expoOut, from: { x: 11, rz: -16, ry: -25 }, impact: { rz: 1.5 } },
  rise: { duration: 1.0, ease: expoOut, from: { y: -7, rx: 30, z: -1 }, impact: { rx: 2 } },
  glide: { duration: 1.1, ease: expoOut, from: { x: -13, ry: 45, z: -1.5 }, impact: { ry: 2 } },
  flow: { duration: 1.2, ease: inertia, from: { x: 9, y: 4, rz: -12, ry: -15 } },
  unfold: { duration: 0.9, ease: expoOut, from: { rx: -85, y: -1.5, z: 0.5 }, impact: { rx: 4 } },
  build: { duration: 1.2, ease: inertia, from: { y: -6, s: -0.12, rx: 10 } },
  slam: { duration: 0.36, ease: expoIn, from: { y: 8.5, z: 1.2, rz: 6 }, impact: { y: 0.12, s: 0.015 } },
  straight: { duration: 0.42, ease: expoOut, from: { x: -14 } },
  train: { duration: 0.95, ease: inertia, from: { x: 13 } },
  flip: { duration: 0.8, ease: expoOut, from: { ry: -110, y: -0.8, z: -1 }, impact: { ry: 3 } },
  sink: { duration: 1.0, ease: inertia, from: { x: -10, y: 0.6, rz: 6 } },
  drop: { duration: 0.3, ease: expoIn, from: { y: 7, z: 1, rz: 8 }, impact: { y: 0.08, rz: 1 } },
  jolt: { duration: 0.35, ease: expoOut, from: { x: 12, rz: -10 }, impact: { rz: 3 } },
  fade: { duration: 1.6, ease: inertia, from: { z: -3, y: -0.4 }, fade: 1.4 },
};

// Camera kicks, in seconds: [time, strength].
export const IMPACTS: [number, number][] = [
  ...SHOTS.filter((s) => ["slam", "drop", "jolt"].includes(s.entrance)).map(
    (s): [number, number] => [
      s.land,
      s.entrance === "slam" ? 0.16 : s.entrance === "jolt" ? 0.08 : 0.06,
    ],
  ),
  [20.12, 0.05], // the bridge "kokoh"
  [40.45, 0.06], // the bridge cracks
  [41.25, 0.14], // and hits the water
  [HIT, 0.22],
];

const shotIndex = new Map(SHOTS.map((s, i) => [s.id, i]));

// How many later prints have landed on top of this one (smoothly).
const pushedBy = (shot: Shot, t: number) => {
  const i = shotIndex.get(shot.id)!;
  let p = 0;
  for (let j = i + 1; j < SHOTS.length; j++) {
    const o = SHOTS[j];
    if (o.act !== shot.act || o.stacks) continue;
    p += smooth(o.land - 0.3, o.land + 0.35, t);
  }
  return p;
};

const DEFAULT_POSE: Pose = {
  visible: false,
  x: 0,
  y: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  scale: 1,
  opacity: 0,
  dim: 0,
  age: 0,
  flash: 0,
  ix: 0,
  iy: 0,
  zoom: 0,
  split: 0,
  fullBleed: 0,
};

export const shotPose = (shot: Shot, t: number): Pose => {
  const m = MOTIONS[shot.entrance];
  const start = shot.land - m.duration;
  if (t < start - 0.05) return DEFAULT_POSE;

  const u = t - shot.land; // < 0 while arriving
  const k = m.ease(clamp01((t - start) / m.duration));
  const f = (key: keyof From) => (m.from[key] ?? 0) * (1 - k);
  const seed = shot.id;

  // Rest pose plus the arriving offset.
  let x = (shot.x ?? 0) + f("x");
  let y = STAGE_Y + (shot.y ?? 0) + f("y");
  let z = f("z");
  let rx = f("rx") * DEG;
  let ry = f("ry") * DEG;
  let rz = ((shot.rz ?? 0) + f("rz")) * DEG;
  let scale = (shot.scale ?? 1) * (1 + f("s"));
  let opacity = m.fade ? smooth(start, start + m.fade, t) : 1;

  // Entrance-specific flavour.
  if (shot.entrance === "flow") y += Math.sin(k * Math.PI) * 0.6;
  if (shot.entrance === "train") {
    y += Math.sin(t * 2 * Math.PI * 7) * 0.035 * (1 - k * 0.8);
    y -= settle(t - 20.12, 4, 7) * 0.06;
  }
  if (shot.entrance === "sink") y -= 0.28 * smooth(shot.land, shot.land + 1.6, t);
  if (shot.entrance === "jolt" && u > 0) {
    // Keeps getting knocked on the beat: nothing here is steady.
    const b = ((t - BEAT_OFFSET) % BEAT) / BEAT;
    rz += Math.exp(-b * 7) * 0.6 * DEG * Math.sign(Math.sin(t * 9));
  }

  // Landing wobble.
  if (m.impact) {
    const w = settle(u);
    y -= (m.impact.y ?? 0) * w;
    rz += (m.impact.rz ?? 0) * w * DEG;
    rx += (m.impact.rx ?? 0) * w * DEG;
    ry += (m.impact.ry ?? 0) * w * DEG;
    scale *= 1 + (m.impact.s ?? 0) * w;
  }

  // Hold: breathe and creep towards the lens.
  const hold = Math.max(0, u);
  x += wobble(t, `${seed}x`, 0.5) * 0.04;
  y += wobble(t, `${seed}y`, 0.45) * 0.03;
  rz += wobble(t, `${seed}r`, 0.4) * 0.35 * DEG;
  z += Math.min(hold, 6) * 0.1;

  // Inner camera: drift across the scene and dolly in; while flying in,
  // the inside lags behind the frame.
  const [dx, dy] = shot.drift ?? [0.5, 0.3];
  const travel = clamp01((hold + 0.3) / 3.2);
  let ix = dx * lerp(-0.7, 0.7, travel) - f("x") * 0.08 - (m.from.ry ?? 0) * (1 - k) * 0.02;
  let iy = dy * lerp(-0.6, 0.6, travel) - f("y") * 0.08 + (m.from.rx ?? 0) * (1 - k) * 0.02;
  let zoom = 0.04 + Math.min(hold, 5) * 0.045 + (1 - k) * 0.12;

  // Pushed down the pile by later prints.
  const p = pushedBy(shot, t);
  const side = random(`${seed}side`) > 0.5 ? 1 : -1;
  z -= 1.1 * p;
  x += side * 0.55 * Math.min(p, 2);
  y += 0.12 * Math.min(p, 2);
  rz += side * 2.2 * Math.min(p, 2) * DEG;
  let dim = Math.min(0.55, 0.3 * p);
  opacity *= 1 - smooth(1.3, 2.3, p);
  let age = 0;
  let flash = 0;
  let split = 0;
  let fullBleed = 0;

  if (shot.entrance === "flip") flash = u > 0 ? Math.exp(-u * 9) * 0.4 : 0;

  // Exits.
  if (shot.exit === "crack" && shot.exitAt !== undefined) {
    split = ramp(shot.exitAt, shot.exitAt + 0.9, t);
    if (t > shot.exitAt) rz += settle(t - shot.exitAt, 5, 8) * 1.5 * DEG;
  }
  if (shot.exit === "collapse" && shot.exitAt !== undefined) {
    // Hinge on the bottom-left corner, then fall into the dark.
    const a = shot.exitAt;
    const shudder = settle(t - a, 6, 5) * 1.2 * DEG;
    const theta = -ramp(a + 0.15, a + 0.85, t, expoIn) * 28 * DEG + shudder;
    const px = (-CARD_W / 2) * scale;
    const py = (-CARD_H / 2) * scale;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    x += px - (c * px - s * py);
    y += py - (s * px + c * py);
    rz += theta;
    const fall = ramp(a + 0.7, a + 1.5, t, expoIn);
    y -= fall * 9;
    rz -= fall * 20 * DEG;
    rx += fall * 25 * DEG;
  }

  // The past: pulled back into a spread, aged, then dropped.
  if (shot.act === "past" && t > ACT_TWO) {
    const i = shotIndex.get(shot.id)!;
    const isFlag = shot.entrance === "flip";
    const [sx, sy, srz] = isFlag ? [0, 0, -1] : SPREAD[i];
    const w = ramp(ACT_TWO + i * 0.05, ACT_TWO + 1.4 + i * 0.05, t);
    x = lerp(x, sx, w);
    y = lerp(y, sy, w);
    z = lerp(z, isFlag ? 1 : random(`${seed}sz`) * 0.4, w);
    rx = lerp(rx, 0, w);
    ry = lerp(ry, 0, w);
    rz = lerp(rz, srz * DEG, w);
    scale = lerp(scale, isFlag ? 1.25 : 0.95, w);
    opacity = lerp(opacity, 1, w);
    dim = lerp(dim, 0.08, w);
    age = smooth(24.4, 27.0, t);
    dim += age * 0.3;
    ix = lerp(ix, wobble(t, `${seed}ix`, 0.35), w);
    iy = lerp(iy, wobble(t, `${seed}iy`, 0.3) * 0.6, w);
    zoom = lerp(zoom, 0.08, w);
    // Fall away.
    const fallAt = FALL + (isFlag ? 0.45 : random(`${seed}fall`) * 0.35);
    const fall = ramp(fallAt, fallAt + 0.8, t, expoIn);
    y -= fall * 16;
    rz += fall * (random(`${seed}fr`) - 0.5) * 70 * DEG;
    rx -= fall * 30 * DEG;
    if (t > fallAt + 0.85) return DEFAULT_POSE;
  }

  // The present sinks into the dark on "pertanyaannya adalah".
  if (shot.act === "now") {
    const g = smooth(41.4, 43.2, t);
    z -= g * 4;
    dim = lerp(dim, 0.9, g);
    opacity *= 1 - smooth(42.3, 43.4, t);
  }

  // The mirror: a print until the silence, then the whole frame.
  if (shot.act === "end") {
    const out = smooth(DURATION - 1.4, DURATION - 0.1, t);
    if (t >= HIT) {
      const v = (t - HIT) / (DURATION - HIT);
      x = 0;
      y = 0;
      z = 0;
      rx = 0;
      ry = 0;
      rz = settle(t - HIT, 2, 3) * 0.6 * DEG;
      fullBleed = 1;
      scale = 2.2 + v * 0.35 + settle(t - HIT, 2.5, 5) * 0.05;
      opacity = 1;
      dim = out;
      ix = lerp(-0.6, 0.6, inertia(v));
      iy = lerp(0.3, -0.2, v);
      zoom = 0.05 + v * 0.3;
    }
    if (t >= SILENCE && t < HIT) opacity = 0;
  }

  return {
    visible: opacity > 0.001,
    x,
    y,
    z,
    rx,
    ry,
    rz,
    scale,
    opacity,
    dim,
    age,
    flash,
    ix: Math.max(-1.4, Math.min(1.4, ix)),
    iy: Math.max(-1.4, Math.min(1.4, iy)),
    zoom,
    split,
    fullBleed,
  };
};

// Camera -------------------------------------------------------------------

// Settles in slowly through the past, pulls far back for the spread,
// dives back in as the old prints fall, then leans in for the question.
const cameraZ = (t: number) => {
  let z = lerp(10.6, 9.8, smooth(0, ACT_TWO, t));
  z = lerp(z, 22.5, ramp(ACT_TWO - 0.1, ACT_TWO + 1.6, t, inertia));
  z -= 1.2 * smooth(ACT_TWO + 1.6, FALL, t);
  z = lerp(z, 10.2, ramp(FALL, FALL + 0.85, t, inertia));
  z -= 0.7 * smooth(FALL + 0.85, 41.4, t);
  return z;
};
const cameraX = (t: number) =>
  lerp(-0.25, 0.2, smooth(0, ACT_TWO, t)) * (1 - ramp(ACT_TWO - 0.1, ACT_TWO + 1.6, t, inertia)) -
  0.15 * smooth(FALL, SILENCE, t);

// The last kick at or before t, and how hard it still rings.
const impactShake = (t: number) => {
  let v = 0;
  for (const [at, amp] of IMPACTS) {
    const u = t - at;
    if (u >= 0 && u < 1.2) v += amp * Math.exp(-u * 7);
  }
  return v;
};

export const beatPulse = (t: number) => {
  if (t < BEAT_OFFSET) return 0;
  const phase = ((t - BEAT_OFFSET) % BEAT) / BEAT;
  return Math.exp(-phase * 9);
};

export type CameraPose = { x: number; y: number; z: number; rz: number };

export const cameraPose = (t: number): CameraPose => {
  const shake = impactShake(t);
  const act2 = t > ACT_TWO + 4 ? 1 : 0;
  const pulse = beatPulse(t) * (act2 ? 0.1 : 0.035) * (t < SILENCE ? 1 : 0);
  return {
    x: cameraX(t) + wobble(t, "camx", 0.3) * 0.05 + Math.sin(t * 61) * shake * 0.35,
    y: wobble(t, "camy", 0.27) * 0.04 + Math.sin(t * 53 + 1) * shake * 0.4,
    z: cameraZ(t) - pulse,
    rz: wobble(t, "camr", 0.2) * 0.25 * DEG + Math.sin(t * 47) * shake * 0.02,
  };
};

// Backdrop: warmth and light over the film.
export const backdropState = (t: number) => ({
  warm: 1 - smooth(24.0, 27.6, t),
  light:
    smooth(0, 1.2, t) *
    (1 - 0.75 * smooth(41.4, 43.4, t)) *
    (t >= SILENCE && t < HIT ? 0 : 1) *
    (t >= HIT ? 0.35 : 1),
});
