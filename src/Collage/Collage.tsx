import { zColor } from "@remotion/zod-types";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";
import {
  FPS,
  WALKER_DISTANCE,
  cameraAt,
  project,
  HEIGHT,
  WIDTH,
} from "./camera";
import { Floor } from "./Floor";
import { PhotoShard } from "./PhotoShard";
import { makeShards } from "./scene";
import { Starfield } from "./Starfield";
import { Walker, WalkerFilter } from "./Walker";

export const collageSchema = z.object({
  photos: z.array(z.string()).min(1),
  floorTexture: z.string(),
  walkerColors: z.array(zColor()).min(2),
  glowColor: zColor(),
});

export type CollageProps = z.infer<typeof collageSchema>;

export const Collage: React.FC<CollageProps> = ({
  photos,
  floorTexture,
  walkerColors,
  glowColor,
}) => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  const shards = useMemo(() => makeShards(photos.length), [photos.length]);

  // The walker keeps pace with the camera; the camera sways around him a bit.
  const walker = project(cam, cam.x * 0.8, 0, cam.z + WALKER_DISTANCE);

  // Paint far to near so closer shards overlap farther ones and the walker.
  const layers = [
    ...shards.map((shard) => ({
      depth: shard.z - cam.z,
      node: (() => {
        const p = project(cam, shard.x, shard.y, shard.z);
        const reach = Math.max(shard.width, shard.height) * p.scale;
        if (
          p.depth < 0.5 ||
          p.x + reach < 0 ||
          p.x - reach > WIDTH ||
          p.y + reach < 0 ||
          p.y - reach > HEIGHT
        ) {
          return null;
        }
        return (
          <PhotoShard
            key={`shard-${shard.id}`}
            shard={shard}
            p={p}
            src={photos[shard.photo]}
            time={frame / FPS}
          />
        );
      })(),
    })),
    {
      depth: WALKER_DISTANCE,
      node: <Walker key="walker" p={walker} frame={frame} glow={glowColor} />,
    },
  ].sort((a, b) => b.depth - a.depth);

  const fade = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <WalkerFilter colors={walkerColors} />
      <AbsoluteFill style={{ opacity: fade }}>
        <Starfield cam={cam} />
        <Floor cam={cam} texture={floorTexture} />
        {layers.map((layer) => layer.node)}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
