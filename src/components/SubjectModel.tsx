import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  BackSide,
  Bone,
  Box3,
  Color,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  SkinnedMesh,
  Vector3,
} from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useMicroMotion } from "../hooks/useMicroMotion";
import { useParallax } from "../hooks/useParallax";
import { planeVertex } from "../shaders/common";
import { DEG, worldPerPixel } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

export type SubjectModelProps = {
  gltf: GLTF;
  x: number;
  ground: number;
  z: number;
  height: number; // world units, head to toe
  heading: number; // degrees; 90 = walking straight to the right
  stepFrames: number; // hold each animation pose this many frames (2 = on twos)
  fps: number;
};

// Screenprint treatment on top of the model's own lit material: the final
// lit colour is reduced to luminance and snapped to four inks, with a
// midtone halftone, so the 3D figure prints like the reference cut-out.
const screenprint = (
  material: MeshStandardMaterial,
  inks: { ink: Color; accent: Color; mid: Color; highlight: Color },
) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uInk = { value: inks.ink };
    shader.uniforms.uAccent = { value: inks.accent };
    shader.uniforms.uMid = { value: inks.mid };
    shader.uniforms.uHighlight = { value: inks.highlight };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        /* glsl */ `
        uniform vec3 uInk;
        uniform vec3 uAccent;
        uniform vec3 uMid;
        uniform vec3 uHighlight;
        float spHash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }
        void main() {`,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        {
          float l = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
          vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 4.5;
          float dotMask = smoothstep(0.34, 0.22, length(fract(g) - 0.5));
          l += (dotMask - 0.45) * 0.16 * l * (1.0 - l) * 4.0;
          l += (spHash(floor(gl_FragCoord.xy)) - 0.5) * 0.025;
          outgoingLight = l < 0.06 ? uInk : l < 0.3 ? uAccent : l < 0.5 ? uMid : uHighlight;
        }
        #include <opaque_fragment>`,
      );
  };
  material.needsUpdate = true;
};

// A bright inverted hull: a crisp printed outline that the bloom pass turns
// into the reference's glow.
const outlineMaterial = (color: Color, thickness: number) => {
  const material = new MeshBasicMaterial({ color, side: BackSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "uniform float uThickness;\nvoid main() {")
      .replace(
        "#include <skinning_vertex>",
        "#include <skinning_vertex>\ntransformed += normalize(objectNormal) * uThickness;",
      );
  };
  return material;
};

const findBone = (root: Object3D, pattern: RegExp) => {
  let found: Bone | null = null;
  root.traverse((o) => {
    if (!found && (o as Bone).isBone && pattern.test(o.name)) {
      found = o as Bone;
    }
  });
  return found as Bone | null;
};

// How fast the planted foot slides back under the body, in model units per
// second. The ground must move at exactly this speed or the feet skate.
export const measureWalkSpeed = (gltf: GLTF) => {
  const model = clone(gltf.scene);
  const mixer = new AnimationMixer(model);
  const clip = gltf.animations[0];
  mixer.clipAction(clip).play();
  const feet = [/LeftToe_?Base|LeftFoot/, /RightToe_?Base|RightFoot/]
    .map((p) => findBone(model, p))
    .filter((b): b is Bone => b !== null);
  const samples = 240;
  const dt = clip.duration / samples;
  const track = feet.map(() => [] as Vector3[]);
  for (let i = 0; i <= samples; i++) {
    mixer.setTime(i * dt);
    model.updateMatrixWorld(true);
    feet.forEach((f, k) => track[k].push(f.getWorldPosition(new Vector3())));
  }
  const box = new Box3().setFromObject(model, true);
  let sum = 0;
  let n = 0;
  for (const points of track) {
    const minY = Math.min(...points.map((p) => p.y));
    const range = Math.max(...points.map((p) => p.y)) - minY;
    for (let i = 1; i < points.length; i++) {
      // Stance: the foot is on (or within a hair of) the ground.
      if (points[i].y < minY + range * 0.08) {
        sum += -(points[i].z - points[i - 1].z) / dt;
        n++;
      }
    }
  }
  const height = box.max.y - box.min.y;
  return { speed: n ? sum / n : 0, height };
};

export const SubjectModel: React.FC<SubjectModelProps> = ({
  gltf,
  x,
  ground,
  z,
  height,
  heading,
  stepFrames,
  fps,
}) => {
  const { settings, rig } = useScene();
  const group = useRef<Group>(null);
  const micro = useMicroMotion(
    "subject-model",
    0.25 * settings.microMotionAmount,
  );
  const parallaxOffset = useParallax(1);
  const offset = useMemo(() => new Vector3(), []);

  const { model, mixer, scale, lift } = useMemo(() => {
    const m = clone(gltf.scene);
    const mx = new AnimationMixer(m);
    mx.clipAction(gltf.animations[0]).play();
    mx.setTime(0);
    m.updateMatrixWorld(true);
    const box = new Box3().setFromObject(m, true);
    const s = height / (box.max.y - box.min.y);
    return { model: m, mixer: mx, scale: s, lift: -box.min.y * s };
  }, [gltf, height]);

  useLayoutEffect(() => {
    const inks = {
      ink: new Color("#150707"),
      accent: settings.accent.clone(),
      mid: settings.accent.clone().lerp(new Color("#ff8a3a"), 0.35),
      highlight: settings.highlight.clone(),
    };
    // HDR outline so only it (not the body) crosses the bloom threshold.
    const glow = settings.highlight
      .clone()
      .lerp(new Color("#ffb030"), 0.35)
      .multiplyScalar(1.45);
    const pairs: { mesh: SkinnedMesh; outline: SkinnedMesh }[] = [];
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mats = (
        Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      ) as Material[];
      mats.forEach((mat) => {
        if ((mat as MeshStandardMaterial).isMeshStandardMaterial) {
          screenprint(mat as MeshStandardMaterial, inks);
        }
      });
      if ((mesh as SkinnedMesh).isSkinnedMesh) {
        const skinned = mesh as SkinnedMesh;
        const worldScale = skinned.getWorldScale(new Vector3());
        const outline = new SkinnedMesh(
          skinned.geometry,
          outlineMaterial(glow, 0.0065 / (worldScale.x * scale)),
        );
        outline.bind(skinned.skeleton, skinned.bindMatrix);
        outline.position.copy(skinned.position);
        outline.quaternion.copy(skinned.quaternion);
        outline.scale.copy(skinned.scale);
        outline.frustumCulled = false;
        skinned.frustumCulled = false;
        pairs.push({ mesh: skinned, outline });
      }
    });
    // Attach after the traversal so it never visits its own outlines.
    pairs.forEach(({ mesh, outline }) => mesh.parent?.add(outline));
    return () => {
      pairs.forEach(({ outline }) => outline.removeFromParent());
    };
  }, [model, scale, settings]);

  const shadow = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            float d = length((vUv - 0.5) * vec2(1.0, 2.2));
            gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(0.5, 0.0, d) * 0.6);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useTimeline((t, frame) => {
    const g = group.current;
    if (!g) return;
    // Posed on the output frame (stepped), never on shutter samples, so the
    // figure stays crisp while the world blurs past.
    const stepped = Math.floor(frame / stepFrames) * stepFrames;
    mixer.setTime(stepped / fps);
    const m = micro(t);
    const px = worldPerPixel(rig.focus, rig.fov);
    parallaxOffset(offset);
    g.position.set(x + offset.x + m.x * px, offset.y, z + offset.z);
  });

  return (
    <group ref={group}>
      <mesh
        position={[0, ground + 0.006, 0]}
        rotation={[-Math.PI / 2, 0, (90 - heading) * DEG]}
        scale={[height * 0.95, height * 0.3, 1]}
        material={shadow}
        renderOrder={-0.5}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group
        position={[0, ground + lift, 0]}
        rotation={[0, (180 - heading) * DEG, 0]}
        scale={scale}
      >
        <primitive object={model} />
      </group>
    </group>
  );
};
