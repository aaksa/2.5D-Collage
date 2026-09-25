import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Group, ShaderMaterial, Texture, Vector3 } from "three";
import { microMotion } from "../hooks/useMicroMotion";
import {
  MAX_VERTS,
  TREATMENTS,
  Treatment,
  createCardMaterial,
} from "../shaders/card";
import { Pose, PoseKey, compileKeys, emptyPose } from "../utils/keyframes";
import { MaskName, Point, maskPoints } from "../utils/masks";
import { DEG, worldPerPixel } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

export type StoryCardProps = {
  id: string;
  src?: string;
  texture?: Texture;
  fill?: string;
  keys?: PoseKey[];
  // Alternative to keys: compute the pose directly (e.g. a lane).
  poseAt?: (seconds: number, out: Pose) => Pose;
  mask?: MaskName | Point[];
  treatment?: Treatment;
  contrast?: number;
  brightness?: number;
  border?: number;
  roughness?: number;
  useAlpha?: boolean;
  // A soft shadow under the card, so frames read as paper in space.
  shadow?: boolean;
  // How far the photo slides inside its frame, as a fraction of the card.
  innerParallax?: number;
  microMotion?: number;
  depthOfField?: number;
};

const LIGHT = new Vector3(-0.45, 0.6, 0.66).normalize();
const DOF = 62;

const tmp = new Vector3();
const view = new Vector3();
const normal = new Vector3();

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
    shadow = !useAlpha,
    innerParallax = 0.07,
    microMotion: microAmount = 1,
    depthOfField = 1,
  } = props;
  const camera = useThree((s) => s.camera);
  const { rig, settings, textures } = useScene();
  const map =
    props.texture ?? (props.src ? textures.get(props.src) : undefined);
  if (props.src && !map) throw new Error(`Texture not preloaded: ${props.src}`);

  const group = useRef<Group>(null);
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

  const [material, shadowMaterial] = useMemo(() => {
    const fill = props.fill ? new Color(props.fill) : undefined;
    return [
      createCardMaterial({ map, fill }),
      createCardMaterial({ map, fill, shadow: true }),
    ];
  }, [map, props.fill]);

  useLayoutEffect(() => {
    const points = maskPoints(mask, id);
    for (const m of [material, shadowMaterial]) {
      const u = m.uniforms;
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
      u.uSeed.value = (id.length * 7.31) % 13;
      u.uTreatment.value = TREATMENTS.indexOf(treatment);
      u.uUseAlpha.value = useAlpha ? 1 : 0;
      u.uLight.value.set("#e6e0d4");
    }
  }, [
    material,
    shadowMaterial,
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
    for (const mat of [material, shadowMaterial]) {
      const u = (mat as ShaderMaterial).uniforms;
      u.uInner.value.set(-ix, -iy);
      u.uBlur.value = blurPx / Math.max(cardPx, 1);
      u.uBias.value = blurPx > 2 ? Math.log2(blurPx) * 0.7 : 0;
      u.uOpacity.value = pose.o;
      u.uShade.value = fog * (0.9 + 0.16 * Math.max(0, normal.dot(LIGHT)));
      u.uDamage.value = pose.damage;
      u.uTintAmount.value = pose.murk;
    }
  });

  return (
    <group ref={group}>
      {shadow ? (
        <mesh
          position={[0.03, -0.045, -0.08]}
          scale={[1.03, 1.03, 1]}
          material={shadowMaterial}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ) : null}
      <mesh material={material}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};
