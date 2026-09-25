import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Group, Mesh, Texture, Vector3 } from "three";
import { useMicroMotion } from "../hooks/useMicroMotion";
import { useParallax } from "../hooks/useParallax";
import {
  BlendMode,
  MAX_VERTS,
  TREATMENTS,
  Treatment,
  createCardMaterial,
  setBlend,
} from "../shaders/card";
import { expoIn, expoOut } from "../utils/easing";
import { MaskName, Point, maskPoints } from "../utils/masks";
import { DEG, clamp01, worldPerPixel } from "../utils/motion";
import { useScene, useTimeline } from "./SceneContext";

export type CardProps = {
  id: string;
  src?: string;
  texture?: Texture; // e.g. a canvas texture for type
  fill?: string; // solid colour card instead of an image
  x: number;
  y: number;
  z: number;
  scale: number; // card height in world units
  rotationX?: number; // degrees
  rotationY?: number;
  rotationZ?: number;
  parallax?: number;
  opacity?: number;
  crop?: [number, number, number, number]; // x, y, w, h in 0..1
  mask?: MaskName | Point[];
  roughness?: number;
  treatment?: Treatment;
  contrast?: number;
  brightness?: number;
  paper?: number;
  border?: number; // in card heights
  shadow?: boolean;
  blend?: BlendMode;
  microMotion?: number;
  depthOfField?: number;
  enterFrame?: number;
  exitFrame?: number;
  useAlpha?: boolean;
  renderOrder?: number;
};

const ENTER = 26; // frames
const EXIT = 16;
const LIGHT = new Vector3(-0.45, 0.6, 0.66).normalize();
const DOF = 62; // defocus strength, px per unit of |1/d - 1/focus|

const tmp = new Vector3();
const normal = new Vector3();

export const ImageCard: React.FC<CardProps> = (props) => {
  const {
    id,
    x,
    y,
    z,
    scale,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0,
    parallax = 1,
    opacity = 1,
    crop = [0, 0, 1, 1],
    mask = "rect",
    roughness = 0.012,
    treatment = "mono",
    contrast = 1.25,
    brightness = -0.035,
    paper = 0.1,
    border = 0,
    shadow = false,
    blend = "normal",
    microMotion: microAmount = 1,
    depthOfField = 1,
    enterFrame,
    exitFrame,
    useAlpha = false,
    renderOrder = 0,
  } = props;

  const { rig, settings, textures } = useScene();
  const map =
    props.texture ?? (props.src ? textures.get(props.src) : undefined);
  if (props.src && !map) {
    throw new Error(`Texture not preloaded: ${props.src}`);
  }
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const micro = useMicroMotion(id, microAmount * settings.microMotionAmount);
  const parallaxOffset = useParallax(parallax);

  const image = map?.image as { width: number; height: number } | undefined;
  const aspect = image
    ? (image.width * crop[2]) / (image.height * crop[3])
    : 1.5;

  const [material, shadowMaterial] = useMemo(() => {
    const fill = props.fill ? new Color(props.fill) : undefined;
    return [
      createCardMaterial({ map, fill }),
      shadow ? createCardMaterial({ map, fill, shadow: true }) : null,
    ];
  }, [map, props.fill, shadow]);

  useLayoutEffect(() => {
    const points = maskPoints(mask, id);
    for (const m of [material, shadowMaterial]) {
      if (!m) continue;
      const u = m.uniforms;
      u.uAspect.value = aspect;
      u.uCount.value = Math.min(points.length, MAX_VERTS);
      points.slice(0, MAX_VERTS).forEach(([px, py], i) => {
        u.uVerts.value[i].set(px * aspect, py);
      });
      u.uCrop.value.set(crop[0], crop[1], crop[2], crop[3]);
      u.uRough.value = roughness;
      u.uBorder.value = border;
      u.uContrast.value = contrast;
      u.uBrightness.value = brightness;
      u.uPaper.value = paper;
      u.uSeed.value = (id.length * 7.31) % 13;
      u.uTreatment.value = TREATMENTS.indexOf(treatment);
      u.uUseAlpha.value = useAlpha ? 1 : 0;
      u.uDark.value.copy(new Color("#0b0a09"));
      u.uLight.value.set("#e6e0d4");
    }
    setBlend(material, blend);
  }, [
    material,
    shadowMaterial,
    aspect,
    mask,
    id,
    crop,
    roughness,
    border,
    contrast,
    brightness,
    paper,
    treatment,
    useAlpha,
    blend,
    settings,
  ]);

  useTimeline((t) => {
    const g = group.current;
    if (!g) return;

    const enter =
      enterFrame === undefined ? 1 : expoOut(clamp01((t - enterFrame) / ENTER));
    const exit =
      exitFrame === undefined ? 0 : expoIn(clamp01((t - exitFrame) / EXIT));
    const settle = 1 - enter;

    const distance = Math.max(0.2, rig.position.distanceTo(tmp.set(x, y, z)));
    const px = worldPerPixel(distance, rig.fov);
    const m = micro(t);
    parallaxOffset(tmp);

    // Entrances layer several small moves; the motion starts before the
    // card is fully visible.
    g.position.set(
      x + tmp.x + m.x * px,
      y + tmp.y + (m.y - settle * 12 + exit * 10) * px,
      z + tmp.z - settle * 0.5 - exit * 0.3,
    );
    g.rotation.set(
      rotationX * DEG,
      rotationY * DEG,
      (rotationZ + m.rotation - settle * 1.5 + exit * 1.2) * DEG,
    );
    const s = scale * m.scale * (1 + settle * 0.04);
    g.scale.set(s * aspect, s, 1);

    // Depth of field plus the entrance blur, in card-height units.
    const depth = rig.position.distanceTo(g.position);
    const cardPx = s / worldPerPixel(depth, rig.fov);
    const blurPx =
      Math.min(26, Math.abs(1 / depth - 1 / rig.focus) * DOF * depthOfField) +
      settle * 8 +
      exit * 8;

    normal.set(0, 0, 1).applyEuler(g.rotation);
    const fog = Math.min(1, Math.max(0.3, 1.18 - depth / 26));
    for (const mat of [material, shadowMaterial]) {
      if (!mat) continue;
      const u = mat.uniforms;
      u.uBlur.value = blurPx / Math.max(cardPx, 1);
      u.uBias.value = blurPx > 2 ? Math.log2(blurPx) * 0.7 : 0;
      u.uOpacity.value = opacity * enter ** 1.6 * (1 - exit);
      u.uShade.value = fog * (0.9 + 0.16 * Math.max(0, normal.dot(LIGHT)));
    }
  });

  return (
    <group ref={group}>
      {shadowMaterial ? (
        <mesh
          position={[0.035, -0.05, -0.06]}
          scale={[1.03, 1.03, 1]}
          material={shadowMaterial}
          renderOrder={renderOrder}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ) : null}
      <mesh ref={mesh} material={material} renderOrder={renderOrder}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};
