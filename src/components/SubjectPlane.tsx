import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Group, ShaderMaterial, Vector3 } from "three";
import { useMicroMotion } from "../hooks/useMicroMotion";
import { useParallax } from "../hooks/useParallax";
import { planeVertex } from "../shaders/common";
import { createGlowMaterial, createSubjectMaterial } from "../shaders/subject";
import { worldPerPixel } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

export type SubjectProps = {
  frames: string[]; // transparent PNG/WebP sequence, looped
  holdFrames: number; // output frames per pose; 4 = "on fours"
  x: number;
  ground: number; // y of the ground plane
  z: number;
  height: number; // head to toe, world units
  // Sprite layout in pixels: where the ground line sits and how tall the
  // figure is from head to planted foot.
  spriteGroundY: number;
  spritePersonHeight: number;
};

const shadowMaterial = () =>
  new ShaderMaterial({
    vertexShader: planeVertex,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float d = length((vUv - 0.5) * vec2(1.0, 2.2));
        float a = smoothstep(0.5, 0.0, d) * 0.55;
        gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

export const SubjectPlane: React.FC<SubjectProps> = (props) => {
  const { textures, settings, rig } = useScene();
  const maps = useMemo(
    () =>
      props.frames.map((f) => {
        const tex = textures.get(f);
        if (!tex) throw new Error(`Texture not preloaded: ${f}`);
        return tex;
      }),
    [props.frames, textures],
  );
  const group = useRef<Group>(null);
  const [material, glow, shadow] = useMemo(
    () => [
      createSubjectMaterial(maps[0]),
      createGlowMaterial(maps[0]),
      shadowMaterial(),
    ],
    [maps],
  );
  // The subject barely breathes: a pixel or so.
  const micro = useMicroMotion("subject", 0.3 * settings.microMotionAmount);
  const parallaxOffset = useParallax(1);
  const offset = useMemo(() => new Vector3(), []);

  useLayoutEffect(() => {
    material.uniforms.uAccent.value.copy(settings.accent);
    material.uniforms.uMid.value
      .copy(settings.accent)
      .lerp(new Color("#ff8a3a"), 0.3);
    material.uniforms.uHighlight.value.copy(settings.highlight);
    glow.uniforms.uColor.value
      .copy(settings.highlight)
      .lerp(new Color("#ffb030"), 0.55);
  }, [material, glow, settings]);

  const image = maps[0].image as { width: number; height: number };
  const k = props.height / props.spritePersonHeight; // world units per px
  const w = image.width * k;
  const h = image.height * k;
  const centerY = props.ground + (image.height / 2 - props.spriteGroundY) * -k;

  useTimeline((t, frame) => {
    const g = group.current;
    if (!g) return;
    // The pose follows the output frame, never the shutter samples: a
    // stop-motion figure stays crisp while the world blurs around him.
    const pose = Math.floor(frame / props.holdFrames) % maps.length;
    material.uniforms.uMap.value = maps[pose];
    material.uniforms.uSeed.value = pose * 1.618;
    glow.uniforms.uMap.value = maps[pose];

    const m = micro(t);
    const px = worldPerPixel(rig.focus, rig.fov);
    parallaxOffset(offset);
    g.position.set(props.x + offset.x + m.x * px, offset.y, props.z + offset.z);
  });

  return (
    <group ref={group}>
      <mesh
        position={[0, props.ground + 0.005, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[w * 1.25, h * 0.2, 1]}
        material={shadow}
        renderOrder={-0.5}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh
        position={[0, centerY, -0.02]}
        scale={[w * 1.06, h * 1.04, 1]}
        material={glow}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh position={[0, centerY, 0]} scale={[w, h, 1]} material={material}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};
