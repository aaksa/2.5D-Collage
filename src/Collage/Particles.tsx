import { useMemo } from "react";
import { Camera, FOCAL, HEIGHT, WIDTH, defocus, project } from "./camera";
import { makeMotes } from "./scene";

// Floating dust. Each mote is drawn as a disc whose radius grows with
// defocus while its brightness drops, so near motes become soft bokeh.
// Drawn in two passes so motes can pass both behind and in front of the
// walker.
export const Particles: React.FC<{
  cam: Camera;
  t: number;
  layer: "behind" | "front";
}> = ({ cam, t, layer }) => {
  const motes = useMemo(makeMotes, []);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}
    >
      <defs>
        <radialGradient id={`mote-cool-${layer}`}>
          <stop offset="0" stopColor="#fffaf2" stopOpacity="1" />
          <stop offset="0.45" stopColor="#fffaf2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fffaf2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`mote-warm-${layer}`}>
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="1" />
          <stop offset="0.45" stopColor="#ffc070" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffb050" stopOpacity="0" />
        </radialGradient>
      </defs>
      {motes.map((mote, i) => {
        // Drift on slow, overlapping currents and rise very gently.
        const pos = {
          x: mote.position.x + 0.18 * Math.sin(t * 0.21 + mote.phase),
          y:
            mote.position.y +
            0.12 * Math.sin(t * 0.33 + mote.phase * 1.7) +
            0.04 * t,
          z: mote.position.z + 0.18 * Math.cos(t * 0.17 + mote.phase * 0.6),
        };
        const p = project(cam, pos);
        if (p.depth < 0.4 || p.depth > 30) return null;
        if (p.depth < cam.focus !== (layer === "front")) return null;
        const core = Math.max(0.7, (mote.size * FOCAL) / p.depth);
        const radius = core + defocus(cam, p.depth, 0.03) * 0.9;
        if (
          p.x < -radius ||
          p.x > WIDTH + radius ||
          p.y < -radius ||
          p.y > HEIGHT + radius
        ) {
          return null;
        }
        const energy = Math.min(1, (core / radius) ** 1.4);
        const twinkle = 0.75 + 0.25 * Math.sin(t * 1.3 + mote.phase * 3);
        const far = Math.min(1, (30 - p.depth) / 8);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={radius * 1.8}
            fill={`url(#mote-${mote.warm ? "warm" : "cool"}-${layer})`}
            opacity={Math.max(0.12, energy) * twinkle * far * 0.9}
          />
        );
      })}
    </svg>
  );
};
