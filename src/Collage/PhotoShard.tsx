import { Img, interpolate, staticFile } from "remotion";
import { CENTER_X, Projected, WIDTH } from "./camera";
import { Shard } from "./scene";

export const PhotoShard: React.FC<{
  shard: Shard;
  p: Projected;
  src: string;
  time: number;
}> = ({ shard, p, src, time }) => {
  const w = shard.width * p.scale;
  const h = shard.height * p.scale;
  const opacity = interpolate(p.depth, [13, 22], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // The photo slides inside its frame a little faster than the frame moves,
  // so each shard reads as a window with depth behind it.
  const parallax = ((p.x - CENTER_X) / WIDTH) * -12;
  const drift = shard.pan * time * 0.6;

  return (
    <div
      style={{
        position: "absolute",
        left: p.x - w / 2,
        top: p.y - h / 2,
        width: w,
        height: h,
        transform: `rotate(${shard.rotation}deg)`,
        clipPath: shard.clip,
        overflow: "hidden",
        opacity,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          left: "-15%",
          top: "-15%",
          width: "130%",
          height: "130%",
          objectFit: "cover",
          transform: `translateX(${parallax + drift}%) scale(1.02)`,
          filter: "grayscale(1) contrast(1.12) brightness(0.95)",
        }}
      />
    </div>
  );
};
