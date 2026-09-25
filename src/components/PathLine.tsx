import { useMemo, useRef } from "react";
import { random } from "remotion";
import { Group, Mesh, ShaderMaterial, Vector3 } from "three";
import { useParallax } from "../hooks/useParallax";
import { createCardMaterial } from "../shaders/card";
import { DEG } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

// One line of paving slabs under the subject. The slabs slide back towards
// the camera at walking pace, so the figure walks without leaving his mark.
export const PathLine: React.FC<{
  texture: string;
  origin: Vector3; // where the subject's feet are
  heading: number; // degrees; 0 = straight away from camera
  speed: number; // world units per second
  fps: number;
}> = ({ texture, origin, heading, speed, fps }) => {
  const { textures } = useScene();
  const map = textures.get(texture);
  const group = useRef<Group>(null);
  const meshes = useRef<(Mesh | null)[]>([]);
  const parallaxOffset = useParallax(1);
  const offset = useMemo(() => new Vector3(), []);

  const spacing = 1.24;
  const start = -5 * spacing;
  const count = 19;
  const span = count * spacing;
  const dir = useMemo(
    () => new Vector3(Math.sin(heading * DEG), 0, -Math.cos(heading * DEG)),
    [heading],
  );

  const slabs = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`slab-${i}-${k}`);
        const width = 1.08 + r("w") * 0.08;
        const length = 1.02 + r("l") * 0.06;
        const material = createCardMaterial({ map });
        const u = material.uniforms;
        const aspect = width / length;
        u.uAspect.value = aspect;
        u.uCount.value = 4;
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ].forEach(([x, y], k) => u.uVerts.value[k].set(x * aspect, y));
        u.uCrop.value.set(r("cx") * 0.4, r("cy") * 0.4, 0.6, 0.6 / aspect);
        u.uRough.value = 0.018;
        u.uContrast.value = 1.1;
        u.uBrightness.value = 0.02;
        u.uPaper.value = 0.14;
        u.uSeed.value = i * 3.7;
        return {
          material,
          width,
          length,
          lateral: (r("lat") - 0.5) * 0.06,
          yaw: (r("yaw") - 0.5) * 6,
        };
      }),
    [map],
  );

  useTimeline((t) => {
    parallaxOffset(offset);
    group.current?.position.copy(offset);
    const travel = (t / fps) * speed;
    slabs.forEach((slab, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      // Wrap slabs around so the line never ends.
      const s = start + ((((i * spacing - travel) % span) + span) % span);
      mesh.position.set(
        origin.x + dir.x * s + dir.z * slab.lateral,
        origin.y,
        origin.z + dir.z * s - dir.x * slab.lateral,
      );
      mesh.rotation.set(-Math.PI / 2, (-heading + slab.yaw) * DEG, 0, "YXZ");
      mesh.scale.set(slab.width, slab.length, 1);
      // A pool of light around the feet; the line dissolves at both ends.
      const lit = 0.12 + 0.5 * Math.exp(-(s * s) / (2 * 2.1 * 2.1));
      const fade = Math.min(1, (s - start) / 1.4, (start + span - s) / 3);
      const u = (slab.material as ShaderMaterial).uniforms;
      u.uShade.value = lit;
      u.uOpacity.value = Math.max(0, fade);
    });
  });

  return (
    <group ref={group}>
      {slabs.map((slab, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          material={slab.material}
          renderOrder={-1}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
};
