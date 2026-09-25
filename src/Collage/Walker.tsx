import { Img, staticFile } from "remotion";
import meta from "../../public/character/meta.json";
import { Projected, WALKER_HEIGHT } from "./camera";

// The character is animated "on fours" (7.5 poses a second), like the
// reference; everything around him moves at the full 30 fps.
const FRAMES_PER_POSE = 4;

export const Walker: React.FC<{ p: Projected; frame: number }> = ({
  p,
  frame,
}) => {
  const k = (WALKER_HEIGHT * p.scale) / meta.personHeight;
  const pose = (Math.floor(frame / FRAMES_PER_POSE) % meta.poses) + 1;
  const w = meta.width * k;
  const h = meta.height * k;
  return (
    <>
      {/* Soft contact shadow so he sits on the slab rather than over it. */}
      <div
        style={{
          position: "absolute",
          left: p.x - w * 0.55,
          top: p.y - h * 0.035,
          width: w * 1.1,
          height: h * 0.07,
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0))",
        }}
      />
      <Img
        src={staticFile(`character/pose-${String(pose).padStart(2, "0")}.webp`)}
        style={{
          position: "absolute",
          left: p.x - w / 2,
          top: p.y - meta.groundY * k,
          width: w,
          height: h,
          filter:
            "drop-shadow(0 0 1.5px rgba(255,236,120,0.9)) drop-shadow(0 0 18px rgba(255,170,40,0.35))",
        }}
      />
    </>
  );
};
