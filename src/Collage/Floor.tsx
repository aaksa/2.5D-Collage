import { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { CENTER_X, Camera, FOCAL, HORIZON_Y } from "./camera";
import { makeSlabs } from "./scene";

// CSS pixels per metre. With `perspective: FOCAL` and an element placed at
// translateZ(FOCAL - depth * PX), the browser's projection matches project().
const PX = 100;

export const Floor: React.FC<{ cam: Camera; texture: string }> = ({
  cam,
  texture,
}) => {
  const slabs = useMemo(makeSlabs, []);

  return (
    <AbsoluteFill
      style={{
        perspective: FOCAL,
        perspectiveOrigin: `${CENTER_X}px ${HORIZON_Y}px`,
      }}
    >
      {slabs.map((slab) => {
        const depth = slab.z - cam.z;
        if (depth - slab.length / 2 < 0.4 || depth > 32) {
          return null;
        }
        const w = slab.width * PX;
        const h = slab.length * PX;
        const x = CENTER_X + (slab.x - cam.x) * PX;
        const y = HORIZON_Y + cam.y * PX;
        const z = FOCAL - depth * PX;
        const fog = interpolate(depth, [14, 32], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={slab.id}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: w,
              height: h,
              transform: `translate3d(${x - w / 2}px, ${y - h / 2}px, ${z}px) rotateX(90deg) rotateZ(${slab.yaw}deg)`,
              filter: `brightness(${slab.shade * fog})`,
              opacity: Math.min(1, fog * 1.5),
            }}
          >
            <Img
              src={staticFile(texture)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
