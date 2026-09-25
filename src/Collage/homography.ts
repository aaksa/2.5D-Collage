import { Camera, Projected, Vec3, project } from "./camera";

type Pt = { x: number; y: number };

// CSS matrix3d that maps a w x h element (transform-origin 0 0) onto the
// screen quad p0..p3 (top-left, top-right, bottom-right, bottom-left).
// Square-to-quad projective mapping, after Heckbert (1989).
export const quadToMatrix3d = (
  w: number,
  h: number,
  [p0, p1, p2, p3]: Pt[],
): string => {
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const k = (dx1 * dy3 - dx3 * dy1) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + k * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + k * p3.y;
  return `matrix3d(${[
    a / w,
    d / w,
    0,
    g / w,
    b / h,
    e / h,
    0,
    k / h,
    0,
    0,
    1,
    0,
    p0.x,
    p0.y,
    0,
    1,
  ].join(",")})`;
};

export type ProjectedQuad = { corners: Projected[]; depth: number };

// Projects a world-space quad, or returns null if any corner is behind or
// right against the lens.
export const projectQuad = (
  cam: Camera,
  corners: Vec3[],
  near = 0.35,
): ProjectedQuad | null => {
  const projected = corners.map((c) => project(cam, c));
  if (projected.some((p) => p.depth < near)) {
    return null;
  }
  const depth =
    projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;
  return { corners: projected, depth };
};

export const onScreen = (quad: ProjectedQuad, margin = 80) => {
  const xs = quad.corners.map((c) => c.x);
  const ys = quad.corners.map((c) => c.y);
  return (
    Math.max(...xs) > -margin &&
    Math.min(...xs) < 1920 + margin &&
    Math.max(...ys) > -margin &&
    Math.min(...ys) < 1080 + margin
  );
};
