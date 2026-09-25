import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { Camera, HEIGHT, WIDTH, project } from "./camera";
import { STAR_DEPTH, makeStars } from "./scene";

export const Starfield: React.FC<{ cam: Camera }> = ({ cam }) => {
  const frame = useCurrentFrame();
  const stars = useMemo(makeStars, []);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ position: "absolute", inset: 0 }}
    >
      <defs>
        <filter id="bokeh-blur">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      {stars.map((star, i) => {
        // Wrap each star into the slab of space just ahead of the camera.
        const ahead =
          ((((star.z - cam.z) % STAR_DEPTH) + STAR_DEPTH) % STAR_DEPTH) + 1.5;
        const p = project(cam, star.x, star.y, cam.z + ahead);
        if (p.x < -20 || p.x > WIDTH + 20 || p.y < -20 || p.y > HEIGHT + 20) {
          return null;
        }
        // Fade in from the far end and out as they rush past.
        const fade =
          Math.min(1, (STAR_DEPTH - ahead) / 15) * Math.min(1, ahead / 3);
        const twinkle = 0.7 + 0.3 * Math.sin(frame * 0.15 + star.twinkle);
        const r = Math.min(
          star.bokeh ? 16 : 3.2,
          Math.max(1, star.radius * p.scale),
        );
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={r}
            fill={star.bokeh ? "#9a9a9a" : "#fff"}
            opacity={fade * (star.bokeh ? 0.45 : twinkle)}
            filter={star.bokeh ? "url(#bokeh-blur)" : undefined}
          />
        );
      })}
    </svg>
  );
};
