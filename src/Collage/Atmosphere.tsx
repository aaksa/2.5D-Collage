import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { HEIGHT, Projected, WIDTH } from "./camera";

// Deep, slightly warm black with a faint haze behind the walker.
export const Backdrop: React.FC<{ walker: Projected }> = ({ walker }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 60% 45% at ${walker.x + 260}px ${walker.y - 260}px, #1a1510 0%, #0a0908 45%, #030303 100%)`,
    }}
  />
);

// Warm light pooling on the path around his feet.
export const LightPool: React.FC<{ walker: Projected }> = ({ walker }) => {
  const w = walker.scale * 3.4;
  const h = walker.scale * 0.9;
  return (
    <div
      style={{
        position: "absolute",
        left: walker.x - w / 2,
        top: walker.y - h / 2,
        width: w,
        height: h,
        background:
          "radial-gradient(closest-side, rgba(255,186,90,0.32), rgba(255,150,60,0.1) 55%, rgba(255,140,50,0) 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
};

// Soft shafts of light from high up on the left, drifting slowly.
export const LightShafts: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
    {[
      { x: 380, w: 260, a: 0.07, s: 0.13 },
      { x: 620, w: 140, a: 0.05, s: 0.19 },
      { x: 900, w: 360, a: 0.04, s: 0.09 },
    ].map((beam, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: beam.x + 60 * Math.sin(t * beam.s + i),
          top: -300,
          width: beam.w,
          height: HEIGHT + 600,
          transform: "rotate(-24deg)",
          transformOrigin: "50% 0",
          background: `linear-gradient(90deg, transparent, rgba(255,236,210,${beam.a * (0.8 + 0.2 * Math.sin(t * 0.7 + i * 2))}) 50%, transparent)`,
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 45%, transparent 85%)",
        }}
      />
    ))}
  </AbsoluteFill>
);

const GRAIN = 512;

// Vignette, animated film grain and letterbox: the finishing pass.
export const Finish: React.FC<{ frame: number; letterbox: number }> = ({
  frame,
  letterbox,
}) => {
  const ox = -random(`grain-x-${frame}`) * GRAIN;
  const oy = -random(`grain-y-${frame}`) * GRAIN;
  const tiles = [];
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      tiles.push(
        <Img
          key={`${gx}-${gy}`}
          src={staticFile("fx/grain.png")}
          style={{
            position: "absolute",
            left: ox + gx * GRAIN,
            top: oy + gy * GRAIN,
            width: GRAIN,
            height: GRAIN,
          }}
        />,
      );
    }
  }
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 75% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      <AbsoluteFill
        style={{ mixBlendMode: "overlay", opacity: 0.16, overflow: "hidden" }}
      >
        {tiles}
      </AbsoluteFill>
      {letterbox > 0 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: WIDTH,
              height: letterbox,
              background: "#000",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: WIDTH,
              height: letterbox,
              background: "#000",
            }}
          />
        </>
      ) : null}
    </>
  );
};
