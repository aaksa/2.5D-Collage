import { useMemo } from "react";
import { Texture, Vector3 } from "three";
import characterMeta from "../../public/character/meta.json";
import { PremiumCollageProps } from "../data/heroScene";
import { Backdrop } from "./Backdrop";
import { CameraRig } from "./CameraRig";
import { ImageCard } from "./ImageCard";
import { ParticleField } from "./ParticleField";
import { PathLine } from "./PathLine";
import { Renderer } from "./Renderer";
import { useScene } from "./SceneContext";
import { SubjectPlane } from "./SubjectPlane";
import { TransitionCard } from "./TransitionCard";

const GROUND = -1.05;
const HEADING = 50; // the figure walks right and away, matching his 3/4 view
const WALK_SPEED = 0.42; // tuned to his stride so the feet don't skate

export const Scene: React.FC<{
  props: PremiumCollageProps;
  titleTexture: Texture | null;
}> = ({ props, titleTexture }) => {
  const { settings } = useScene();
  const d = settings.duration;
  const feet = useMemo(
    () => new Vector3(props.subject.x, GROUND, props.subject.z),
    [props.subject.x, props.subject.z],
  );
  const chest = useMemo(
    () =>
      new Vector3(
        props.subject.x,
        GROUND + props.subject.height * 0.6,
        props.subject.z,
      ),
    [props.subject.x, props.subject.z, props.subject.height],
  );

  return (
    <>
      <CameraRig subject={chest} />
      <Backdrop />
      <ParticleField range="far" />
      <PathLine
        texture={props.pathTexture}
        origin={feet}
        heading={HEADING}
        speed={WALK_SPEED}
        fps={30}
      />
      {props.images.map((image, i) => (
        <ImageCard key={`${i}-${image.src}`} id={`card-${i}`} {...image} />
      ))}
      <SubjectPlane
        frames={props.subject.frames}
        holdFrames={props.subject.holdFrames}
        x={props.subject.x}
        ground={GROUND}
        z={props.subject.z}
        height={props.subject.height}
        spriteGroundY={characterMeta.groundY}
        spritePersonHeight={characterMeta.personHeight}
      />
      {/* A single accent shard: the one saturated note besides the figure. */}
      <ImageCard
        id="accent"
        fill={props.accentColor}
        x={props.subject.x - 1.9}
        y={1.5}
        z={-2.4}
        scale={0.34}
        rotationZ={-18}
        rotationY={14}
        mask="sliver"
        treatment="color"
        contrast={1}
        paper={0.16}
        enterFrame={Math.round(d * 0.2)}
      />
      {titleTexture ? (
        <ImageCard
          id="title"
          texture={titleTexture}
          x={props.subject.x + 1.75}
          y={0.5}
          z={-0.9}
          scale={0.74}
          rotationY={-6}
          treatment="color"
          contrast={1}
          paper={0.05}
          useAlpha
          depthOfField={0.4}
          microMotion={0.6}
          enterFrame={Math.round(d * 0.8)}
        />
      ) : null}
      <TransitionCard
        src={props.transitionImage}
        startFrame={Math.round(d * 0.66)}
        endFrame={Math.round(d * 0.9)}
      />
      <ParticleField range="near" />
      <Renderer />
    </>
  );
};
