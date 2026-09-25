import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { random } from "remotion";
import { Color, Group, Mesh, ShaderMaterial, Texture, Vector3 } from "three";
import { microMotion } from "../hooks/useMicroMotion";
import {
  MAX_VERTS,
  TREATMENTS,
  Treatment,
  createCardMaterial,
} from "../shaders/card";
import { inertia } from "../utils/easing";
import { Pose, PoseKey, compileKeys, emptyPose } from "../utils/keyframes";
import { MaskName, Point, maskPoints } from "../utils/masks";
import { DEG, clamp01, worldPerPixel } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

export type StoryCardProps = {
  id: string;
  src?: string;
  texture?: Texture;
  fill?: string;
  keys?: PoseKey[];
  // Alternative to keys: compute the pose directly (e.g. a carousel).
  poseAt?: (seconds: number, out: Pose) => Pose;
  mask?: MaskName | Point[];
  treatment?: Treatment;
  contrast?: number;
  brightness?: number;
  border?: number;
  roughness?: number;
  useAlpha?: boolean;
  shadow?: boolean;
  // How far the photo slides inside its frame, as a fraction of the card.
  innerParallax?: number;
  // Seconds at which the card cracks in two, and at which it falls.
  crackAt?: number;
  fallAt?: number;
  microMotion?: number;
  depthOfField?: number;
};

const LIGHT = new Vector3(-0.45, 0.6, 0.66).normalize();
const DOF = 62;
const GRAVITY = 1.4; // world units / s^2; slow, like debris in a dream

const tmp = new Vector3();
const view = new Vector3();
const normal = new Vector3();

// A jagged vertical crack, and the two halves it leaves (card space 0..1).
const crackHalves = (seed: string): [Point[], Point[]] => {
  const r = (k: string) => random(`${seed}-crack-${k}`);
  const xs = [
    0.42 + r("a") * 0.16,
    0.36 + r("b") * 0.28,
    0.4 + r("c") * 0.2,
    0.38 + r("d") * 0.24,
  ];
  const ys = [0, 0.34 + (r("e") - 0.5) * 0.1, 0.67 + (r("f") - 0.5) * 0.1, 1];
  const crack = xs.map((x, i) => [x, ys[i]] as Point);
  const left: Point[] = [[0, 0], ...crack, [0, 1]];
  const right: Point[] = [[1, 0], [1, 1], ...[...crack].reverse()];
  return [left, right];
};

export const StoryCard: React.FC<StoryCardProps> = (props) => {
  const {
    id,
    keys,
    poseAt,
    mask = "rect",
    treatment = "mono",
    contrast = 1.25,
    brightness = -0.07,
    border = 0,
    roughness = 0.012,
    useAlpha = false,
    innerParallax = 0.07,
    crackAt,
    fallAt,
    microMotion: microAmount = 1,
    depthOfField = 1,
  } = props;
  const camera = useThree((s) => s.camera);
  const { rig, settings, textures } = useScene();
  const map =
    props.texture ?? (props.src ? textures.get(props.src) : undefined);
  if (props.src && !map) throw new Error(`Texture not preloaded: ${props.src}`);

  const group = useRef<Group>(null);
  const whole = useRef<Mesh>(null);
  const halves = useRef<(Mesh | null)[]>([]);
  const sample = useMemo(
    () => poseAt ?? compileKeys(keys ?? []),
    [keys, poseAt],
  );
  const pose = useMemo(emptyPose, []);
  const micro = useMemo(
    () => microMotion(id, microAmount * settings.microMotionAmount),
    [id, microAmount, settings.microMotionAmount],
  );
  const image = map?.image as { width: number; height: number } | undefined;
  // Cropped in a little so the photo has room to slide inside the frame.
  const margin = map && !useAlpha ? innerParallax : 0;
  const aspect = image
    ? (image.width * (1 - 2 * margin)) / (image.height * (1 - 2 * margin))
    : 1.4;

  const materials = useMemo(() => {
    const fill = props.fill ? new Color(props.fill) : undefined;
    return [0, 1, 2].map(() => createCardMaterial({ map, fill }));
  }, [map, props.fill]);

  useLayoutEffect(() => {
    const outlines = [maskPoints(mask, id), ...crackHalves(id)];
    materials.forEach((m, i) => {
      const u = m.uniforms;
      const points = outlines[i];
      u.uAspect.value = aspect;
      u.uCount.value = Math.min(points.length, MAX_VERTS);
      points
        .slice(0, MAX_VERTS)
        .forEach(([x, y], k) => u.uVerts.value[k].set(x * aspect, y));
      u.uCrop.value.set(margin, margin, 1 - 2 * margin, 1 - 2 * margin);
      u.uRough.value = roughness;
      u.uBorder.value = border;
      u.uContrast.value = contrast;
      u.uBrightness.value = brightness;
      u.uSeed.value = (id.length * 7.31 + i) % 13;
      u.uTreatment.value = TREATMENTS.indexOf(treatment);
      u.uUseAlpha.value = useAlpha ? 1 : 0;
      u.uLight.value.set("#e6e0d4");
    });
  }, [
    materials,
    mask,
    id,
    aspect,
    margin,
    roughness,
    border,
    contrast,
    brightness,
    treatment,
    useAlpha,
  ]);

  useTimeline((t) => {
    const g = group.current;
    if (!g) return;
    const sec = t / 30;
    sample(sec, pose);
    const visible = pose.o > 0.002;
    g.visible = visible;
    if (!visible) return;

    const distance = Math.max(
      0.3,
      rig.position.distanceTo(tmp.set(pose.x, pose.y, pose.z)),
    );
    const px = worldPerPixel(distance, rig.fov);
    const m = micro(t);
    g.position.set(pose.x + m.x * px, pose.y + m.y * px, pose.z);
    g.rotation.set(pose.rx * DEG, pose.ry * DEG, (pose.rz + m.rotation) * DEG);
    const s = pose.s * m.scale;
    g.scale.set(s * aspect, s, 1);

    // Crack and fall.
    const cracked = crackAt !== undefined && sec >= crackAt;
    const open = cracked ? inertia(clamp01((sec - crackAt!) / 2.0)) : 0;
    const fallT = fallAt !== undefined ? Math.max(0, sec - fallAt) : 0;
    if (whole.current) whole.current.visible = !cracked;
    halves.current.forEach((h, i) => {
      if (!h) return;
      h.visible = cracked;
      const side = i === 0 ? -1 : 1;
      h.position.set(
        side * (0.06 * open + 0.05 * fallT),
        -(0.5 * GRAVITY * fallT * fallT) / s + side * 0.015 * open,
        0,
      );
      h.rotation.set(0, 0, side * -(3.5 * open + 16 * fallT * fallT) * DEG);
    });
    if (!cracked && fallT > 0) {
      g.position.y -= 0.5 * GRAVITY * fallT * fallT;
      g.rotation.z += 14 * fallT * fallT * DEG;
    }

    // Inner parallax: the photo drifts against the card's position in view,
    // as if it sat deeper than the paper.
    view.copy(g.position).applyMatrix4(camera.matrixWorldInverse);
    const depth = Math.max(0.3, -view.z);
    const ix = Math.max(-1, Math.min(1, (view.x / depth) * 1.6)) * margin;
    const iy = Math.max(-1, Math.min(1, (view.y / depth) * 1.6)) * margin;

    const cardPx = s / worldPerPixel(depth, rig.fov);
    const blurPx = Math.min(
      24,
      Math.abs(1 / depth - 1 / rig.focus) * DOF * depthOfField,
    );
    normal.set(0, 0, 1).applyEuler(g.rotation);
    const fog = Math.min(1, Math.max(0.3, 1.18 - depth / 26));
    const fade = fallT > 0 ? clamp01(1 - (fallT - 1.0) / 1.8) : 1;
    for (const mat of materials) {
      const u = (mat as ShaderMaterial).uniforms;
      u.uInner.value.set(-ix, -iy);
      u.uBlur.value = blurPx / Math.max(cardPx, 1);
      u.uBias.value = blurPx > 2 ? Math.log2(blurPx) * 0.7 : 0;
      u.uOpacity.value = pose.o * fade;
      u.uShade.value = fog * (0.9 + 0.16 * Math.max(0, normal.dot(LIGHT)));
      u.uDamage.value = pose.damage;
      u.uTintAmount.value = pose.murk;
      u.uRough.value = roughness + pose.damage * 0.03;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={whole} material={materials[0]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {[1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            halves.current[i - 1] = m;
          }}
          material={materials[i]}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
};
