import { Img, interpolate, staticFile } from "remotion";
import { Camera, Vec3, defocus } from "./camera";
import {
  ProjectedQuad,
  onScreen,
  projectQuad,
  quadToMatrix3d,
} from "./homography";
import { Card } from "./scene";

// Element size in CSS px; the matrix3d does the real scaling.
const BASE = 640;

const rad = (deg: number) => (deg * Math.PI) / 180;

export const cardQuad = (
  card: Card,
  cam: Camera,
  t: number,
): ProjectedQuad | null => {
  // A slow float, as if hanging on a thread.
  const bob = 0.05 * Math.sin(t * 0.55 + card.phase);
  const roll = rad(card.roll + 2.2 * Math.sin(t * 0.3 + card.phase));
  const yaw = rad(card.yaw + 4 * Math.sin(t * 0.22 + card.phase * 1.3));
  const right = { x: Math.cos(yaw), y: 0, z: Math.sin(yaw) };
  const up = { x: 0, y: 1, z: 0 };
  const r = {
    x: right.x * Math.cos(roll) + up.x * Math.sin(roll),
    y: right.y * Math.cos(roll) + up.y * Math.sin(roll),
    z: right.z * Math.cos(roll) + up.z * Math.sin(roll),
  };
  const u = {
    x: up.x * Math.cos(roll) - right.x * Math.sin(roll),
    y: up.y * Math.cos(roll) - right.y * Math.sin(roll),
    z: up.z * Math.cos(roll) - right.z * Math.sin(roll),
  };
  const c = { ...card.center, y: card.center.y + bob };
  const corner = (sx: number, sy: number): Vec3 => ({
    x: c.x + (r.x * sx * card.width + u.x * sy * card.height) / 2,
    y: c.y + (r.y * sx * card.width + u.y * sy * card.height) / 2,
    z: c.z + (r.z * sx * card.width + u.z * sy * card.height) / 2,
  });
  const quad = projectQuad(cam, [
    corner(-1, 1),
    corner(1, 1),
    corner(1, -1),
    corner(-1, -1),
  ]);
  return quad && onScreen(quad) ? quad : null;
};

export const PhotoCard: React.FC<{
  card: Card;
  quad: ProjectedQuad;
  cam: Camera;
  src: string;
}> = ({ card, quad, cam, src }) => {
  const w = BASE;
  const h = BASE * (card.height / card.width);
  const [tl, tr] = quad.corners;
  const pxPerUnit = Math.hypot(tr.x - tl.x, tr.y - tl.y) / w;

  // Out-of-focus cards blur; the matrix scales the blur, so undo that.
  const blur = defocus(cam, quad.depth) / Math.max(pxPerUnit, 0.05);
  const fog = interpolate(quad.depth, [9, 26], [1, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(quad.depth, [24, 28], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Viewing angle drives two effects: the photo slides inside its frame as
  // if it sat deeper than the card, and a sheen sweeps across the print.
  const angle = (card.center.x - cam.x) / quad.depth;
  const lift = (card.center.y - cam.y) / quad.depth;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transformOrigin: "0 0",
        transform: quadToMatrix3d(w, h, quad.corners),
        clipPath: card.clip ?? undefined,
        overflow: "hidden",
        opacity: fadeIn,
        filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined,
        backgroundColor: "#111",
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          left: "-12%",
          top: "-12%",
          width: "124%",
          height: "124%",
          objectFit: "cover",
          transform: `translate(${(-angle * 9).toFixed(2)}%, ${(lift * 6).toFixed(2)}%)`,
          filter: `grayscale(1) contrast(1.12) brightness(${(0.95 * fog).toFixed(3)})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(115deg, transparent ${30 + angle * 40}%, rgba(255,255,255,0.16) ${42 + angle * 40}%, transparent ${54 + angle * 40}%)`,
          mixBlendMode: "screen",
        }}
      />
      {card.clip ? null : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 0 6px rgba(240,236,228,0.9)",
            opacity: fog,
          }}
        />
      )}
    </div>
  );
};
