import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { Backdrop, Finish, LightPool, LightShafts } from "./Atmosphere";
import { FPS, cameraAt, project, walkerAt } from "./camera";
import { PathSlab, slabQuad } from "./PathSlab";
import { Particles } from "./Particles";
import { PhotoCard, cardQuad } from "./PhotoCard";
import { makeCards, makeSlabs } from "./scene";
import { Titles } from "./Titles";
import { Walker } from "./Walker";

export const collageSchema = z.object({
  photos: z.array(z.string()).min(1),
  pathTexture: z.string(),
  title: z.string(),
  subtitle: z.string(),
  chapter: z.string(),
  // Height of each letterbox bar in px; 131 gives a 2.35:1 picture.
  letterbox: z.number().min(0).max(300),
});

export type CollageProps = z.infer<typeof collageSchema>;

export const Collage: React.FC<CollageProps> = ({
  photos,
  pathTexture,
  title,
  subtitle,
  chapter,
  letterbox,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const cam = cameraAt(frame);
  const cards = useMemo(() => makeCards(photos.length), [photos.length]);
  const slabs = useMemo(makeSlabs, []);

  const walkerPos = walkerAt(frame);
  const walker = project(cam, walkerPos);

  // Paint everything far to near. The walker gets a small bias so the slab
  // he stands on is drawn beneath him.
  const layers: { depth: number; node: React.ReactNode }[] = [];
  for (const slab of slabs) {
    const quad = slabQuad(slab, cam);
    if (quad) {
      layers.push({
        depth: quad.depth + 1.5,
        node: (
          <PathSlab
            key={`slab-${slab.id}`}
            slab={slab}
            quad={quad}
            cam={cam}
            walker={walkerPos}
            texture={pathTexture}
          />
        ),
      });
    }
  }
  for (const card of cards) {
    const quad = cardQuad(card, cam, t);
    if (quad) {
      layers.push({
        depth: quad.depth,
        node: (
          <PhotoCard
            key={`card-${card.id}`}
            card={card}
            quad={quad}
            cam={cam}
            src={photos[card.photo]}
          />
        ),
      });
    }
  }
  layers.push({
    depth: walker.depth,
    node: (
      <div key="walker">
        <LightPool walker={walker} />
        <Walker p={walker} frame={frame} />
      </div>
    ),
  });
  layers.sort((a, b) => b.depth - a.depth);

  const fadeIn = interpolate(frame, [0, 1.2 * FPS], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 3.2 * FPS, durationInFrames - 2.2 * FPS],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
        {/* A touch of roll and overscan, like a camera operator's hand. */}
        <AbsoluteFill
          style={{ transform: `rotate(${cam.roll}deg) scale(1.035)` }}
        >
          <Backdrop walker={walker} />
          <Particles cam={cam} t={t} layer="behind" />
          {layers.map((layer) => layer.node)}
          <Particles cam={cam} t={t} layer="front" />
          <LightShafts t={t} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Finish frame={frame} letterbox={letterbox} />
      <Titles
        frame={frame}
        durationInFrames={durationInFrames}
        title={title}
        subtitle={subtitle}
        chapter={chapter}
        letterbox={letterbox}
      />
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: interpolate(
            frame,
            [durationInFrames - 14, durationInFrames - 1],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          ),
        }}
      />
    </AbsoluteFill>
  );
};
