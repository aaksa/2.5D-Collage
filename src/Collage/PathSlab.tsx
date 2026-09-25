import { Img, interpolate, staticFile } from "remotion";
import { Camera, Vec3, defocus } from "./camera";
import {
  ProjectedQuad,
  onScreen,
  projectQuad,
  quadToMatrix3d,
} from "./homography";
import { Slab } from "./scene";

const SIZE = 256;

export const slabQuad = (slab: Slab, cam: Camera): ProjectedQuad | null => {
  const quad = projectQuad(cam, slab.corners, 0.6);
  return quad && onScreen(quad, 40) ? quad : null;
};

export const PathSlab: React.FC<{
  slab: Slab;
  quad: ProjectedQuad;
  cam: Camera;
  walker: Vec3;
  texture: string;
}> = ({ slab, quad, cam, walker, texture }) => {
  const c = slab.corners;
  const cx = (c[0].x + c[2].x) / 2;
  const cz = (c[0].z + c[2].z) / 2;
  // A pool of light travels with the walker; the path falls away into dark.
  const d = Math.hypot(cx - walker.x, cz - walker.z);
  const light = 0.16 + 0.95 * Math.exp(-(d * d) / (2 * 1.9 * 1.9));
  const fade = interpolate(quad.depth, [14, 22], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const [tl, tr] = quad.corners;
  const pxPerUnit = Math.hypot(tr.x - tl.x, tr.y - tl.y) / SIZE;
  const blur = defocus(cam, quad.depth, 0.018) / Math.max(pxPerUnit, 0.05);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: SIZE,
        height: SIZE,
        transformOrigin: "0 0",
        transform: quadToMatrix3d(SIZE, SIZE, quad.corners),
        opacity: fade,
        filter: `brightness(${(light * slab.shade).toFixed(3)}) sepia(${(0.35 * Math.exp((-d * d) / 4)).toFixed(3)})${blur > 0.4 ? ` blur(${blur.toFixed(1)}px)` : ""}`,
      }}
    >
      <Img
        src={staticFile(texture)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};
