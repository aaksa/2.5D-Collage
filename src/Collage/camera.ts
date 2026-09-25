import { Easing, interpolate } from "remotion";

// World units are metres: x right, y up (ground is y = 0), z away from camera.
// The camera always looks straight down +z and dollies alongside the walker.

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const DURATION = 15 * FPS;

export const FOCAL = 1150; // px
export const CENTER_X = WIDTH / 2;
export const HORIZON_Y = 430;

// The walker heads right and away from camera, matching the sprite's 3/4 view.
const HEADING = (50 * Math.PI) / 180;
export const DIRECTION = { x: Math.sin(HEADING), z: Math.cos(HEADING) };
const WALK_SPEED = 0.45; // m/s, tuned so the planted foot doesn't skate

export const WALKER_HEIGHT = 1.75;

export type Vec3 = { x: number; y: number; z: number };
export type Camera = Vec3 & { roll: number; focus: number };

const ease = Easing.bezier(0.33, 0, 0.1, 1);

export const walkerAt = (frame: number): Vec3 => {
  const s = (frame / FPS) * WALK_SPEED;
  return { x: s * DIRECTION.x, y: 0, z: s * DIRECTION.z };
};

// Low-frequency sway, like a camera on a gimbal rather than a tripod.
const handheld = (t: number, seed: number) =>
  Math.sin(t * 0.9 + seed) * 0.6 +
  Math.sin(t * 1.7 + seed * 2.1) * 0.3 +
  Math.sin(t * 3.1 + seed * 0.7) * 0.1;

export const cameraAt = (frame: number): Camera => {
  const t = frame / FPS;
  const walker = walkerAt(frame);
  // Crane down and push in over the opening, then keep creeping closer.
  const intro = interpolate(frame, [0, 4.5 * FPS], [0, 1], {
    easing: ease,
    extrapolateRight: "clamp",
  });
  const distance = interpolate(intro, [0, 1], [5.6, 3.9]) - 0.02 * t;
  const height = interpolate(intro, [0, 1], [2.5, 1.25]);
  // Leave lead room: the walker sits left of centre, facing into the frame.
  const lead = interpolate(intro, [0, 1], [0.2, 0.62]);
  return {
    x: walker.x + lead + 0.015 * handheld(t, 1),
    y: height + 0.012 * handheld(t, 4),
    z: walker.z - distance,
    roll: 0.35 * handheld(t * 0.7, 9),
    focus: distance,
  };
};

export type Projected = { x: number; y: number; scale: number; depth: number };

export const project = (cam: Camera, p: Vec3): Projected => {
  const depth = p.z - cam.z;
  const scale = FOCAL / depth;
  return {
    x: CENTER_X + (p.x - cam.x) * scale,
    y: HORIZON_Y + (cam.y - p.y) * scale,
    scale,
    depth,
  };
};

// Screen-space blur for depth of field, in px.
export const defocus = (cam: Camera, depth: number, strength = 0.026) =>
  Math.min(22, Math.abs(1 / depth - 1 / cam.focus) * FOCAL * strength);
