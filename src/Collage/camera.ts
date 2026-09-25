// A simple pinhole camera that walks forward through the scene.
// World units are metres: x right, y up (ground is y = 0), z forward.

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

export const FOCAL = 1100; // px
export const CENTER_X = WIDTH / 2;
export const HORIZON_Y = 430; // screen y of the vanishing point

const EYE_HEIGHT = 1.6;
const WALK_SPEED = 1.25; // m/s
const STEP_RATE = 1.8; // steps per second, for the head bob

// How far ahead of the camera the walker stands.
export const WALKER_DISTANCE = 3.2;
export const WALKER_HEIGHT = 1.78;

export type Camera = { x: number; y: number; z: number };

export const cameraAt = (frame: number): Camera => {
  const t = frame / FPS;
  return {
    x: 0.45 * Math.sin(t * 0.32) + 0.06 * t,
    y: EYE_HEIGHT + 0.018 * Math.sin(t * Math.PI * STEP_RATE),
    z: t * WALK_SPEED,
  };
};

export type Projected = { x: number; y: number; scale: number; depth: number };

export const project = (
  cam: Camera,
  x: number,
  y: number,
  z: number,
): Projected => {
  const depth = z - cam.z;
  const scale = FOCAL / depth;
  return {
    x: CENTER_X + (x - cam.x) * scale,
    y: HORIZON_Y + (cam.y - y) * scale,
    scale,
    depth,
  };
};
