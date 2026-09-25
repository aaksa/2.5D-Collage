import { Easing } from "remotion";

// Fast start, long soft landing. The house curve for entrances.
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
// Slow in, slow out, weighted towards the end: things with mass.
export const inertia = Easing.bezier(0.55, 0, 0.15, 1);
export const expoIn = Easing.bezier(0.7, 0, 0.84, 0);

export type Key = readonly [time: number, value: number];

const tangent = (keys: readonly Key[], i: number) => {
  // Zero velocity at the ends: the move starts from rest and settles.
  if (i === 0 || i === keys.length - 1) {
    return 0;
  }
  const [t0, v0] = keys[i - 1];
  const [t1, v1] = keys[i + 1];
  return (v1 - v0) / (t1 - t0);
};

// Smooth curve through keyframes (cubic Hermite, Catmull-Rom tangents).
// Velocity is continuous across keys, so a move accelerates, carries its
// momentum and decelerates instead of snapping between linear segments.
// Put a key slightly past the target just before the end for a gentle
// overshoot and settle.
export const curve = (u: number, keys: readonly Key[]): number => {
  if (u <= keys[0][0]) {
    return keys[0][1];
  }
  const last = keys[keys.length - 1];
  if (u >= last[0]) {
    return last[1];
  }
  let i = 0;
  while (u > keys[i + 1][0]) {
    i++;
  }
  const [t0, v0] = keys[i];
  const [t1, v1] = keys[i + 1];
  const h = t1 - t0;
  const s = (u - t0) / h;
  const m0 = tangent(keys, i) * h;
  const m1 = tangent(keys, i + 1) * h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * v0 +
    (s3 - 2 * s2 + s) * m0 +
    (-2 * s3 + 3 * s2) * v1 +
    (s3 - s2) * m1
  );
};
