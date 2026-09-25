import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Euler, Mesh, Quaternion, Vector3 } from "three";
import { createCardMaterial } from "../shaders/card";
import { inertia } from "../utils/easing";
import { MaskName, maskPoints } from "../utils/masks";
import { DEG, clamp01, lerp, worldPerPixel } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

// A print that sweeps across just in front of the lens: a spatial wipe.
// It is placed relative to the camera, so it always crosses frame no
// matter where the camera is, and it passes close enough to blur heavily.
export const TransitionCard: React.FC<{
  src: string;
  startFrame: number;
  endFrame: number;
  distance?: number; // from the lens, world units
  mask?: MaskName;
}> = ({ src, startFrame, endFrame, distance = 1.25, mask = "shard" }) => {
  const camera = useThree((s) => s.camera);
  const { textures, rig } = useScene();
  const map = textures.get(src);
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => createCardMaterial({ map }), [map]);
  const image = map?.image as { width: number; height: number };
  const aspect = image ? image.width / image.height : 1.5;
  const tmp = useMemo(
    () => ({ v: new Vector3(), q: new Quaternion(), e: new Euler() }),
    [],
  );

  useLayoutEffect(() => {
    const u = material.uniforms;
    const points = maskPoints(mask, `transition-${src}`);
    u.uAspect.value = aspect;
    u.uCount.value = points.length;
    points.forEach(([x, y], i) => u.uVerts.value[i].set(x * aspect, y));
    u.uRough.value = 0.02;
    u.uContrast.value = 1.3;
    u.uPaper.value = 0.12;
    u.uSeed.value = 4.2;
  }, [material, aspect, mask, src]);

  useTimeline((t) => {
    const m = mesh.current;
    if (!m) return;
    const p = clamp01((t - startFrame) / (endFrame - startFrame));
    m.visible = p > 0 && p < 1;
    if (!m.visible) return;

    const e = inertia(p);
    const halfH = distance * Math.tan((rig.fov * DEG) / 2);
    const halfW = halfH * (16 / 9);
    const height = halfH * 2.5;
    const width = height * aspect;
    const travel = halfW + width / 2 + 0.1;
    // Enters right, leaves left, with a slight fall and turn as it goes.
    tmp.v.set(
      lerp(travel, -travel, e),
      lerp(0.08, -0.12, e) * halfH,
      -distance,
    );
    m.position.copy(camera.localToWorld(tmp.v));
    tmp.e.set(0, lerp(16, -10, e) * DEG, lerp(-7, 4, e) * DEG);
    m.quaternion.copy(camera.quaternion).multiply(tmp.q.setFromEuler(tmp.e));
    m.scale.set(width, height, 1);

    const cardPx = height / worldPerPixel(distance, rig.fov);
    const blurPx = 18;
    material.uniforms.uBlur.value = blurPx / cardPx;
    material.uniforms.uBias.value = Math.log2(blurPx) * 0.7;
    material.uniforms.uShade.value = 0.6;
  });

  return (
    <mesh ref={mesh} material={material} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};
