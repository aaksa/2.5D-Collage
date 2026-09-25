import { random } from "remotion";

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// World units covered by one output pixel at a given distance from camera.
export const worldPerPixel = (
  distance: number,
  fovDeg: number,
  height = 1080,
) => (2 * distance * Math.tan((fovDeg * DEG) / 2)) / height;

// Smooth, non-repeating wobble in roughly [-1, 1]: three sines at
// incommensurate frequencies with seeded phases. Frequencies are in
// radians per frame.
export const layeredNoise = (t: number, seed: string, base = 0.02): number => {
  const r = (k: string) => random(`${seed}-${k}`);
  return (
    Math.sin(t * base * (0.8 + r("f1") * 0.4) + r("p1") * TAU) * 0.55 +
    Math.sin(t * base * 0.37 * (0.8 + r("f2") * 0.4) + r("p2") * TAU) * 0.3 +
    Math.sin(t * base * 2.3 * (0.8 + r("f3") * 0.4) + r("p3") * TAU) * 0.15
  );
};
