import { useMemo } from "react";
import { Texture, Vector3 } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import characterMeta from "../../public/character/meta.json";
import { PremiumCollageProps } from "../data/heroScene";
import { Backdrop } from "./Backdrop";
import { CameraRig } from "./CameraRig";
import { ImageCard } from "./ImageCard";
import { ParticleField } from "./ParticleField";
import { PathLine } from "./PathLine";
import { Renderer } from "./Renderer";
import { useScene } from "./SceneContext";
import { SubjectModel, measureWalkSpeed } from "./SubjectModel";
import { SubjectPlane } from "./SubjectPlane";
import { TransitionCard } from "./TransitionCard";

const GROUND = -1.05;
const FPS = 30;
// The sprite walker walks right and away (his 3/4 view); this pace was
// tuned by eye to his stride.
const SPRITE_HEADING = 50;
const SPRITE_SPEED = 0.42;

export const Scene: React.FC<{
  props: PremiumCollageProps;
  titleTexture: Texture | null;
  model: GLTF | null;
}> = ({ props, titleTexture, model }) => {
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
  // A 3D walker sets the pace itself: the path moves exactly as fast as his
  // planted foot slides back, so the feet never skate.
  const walk = useMemo(() => {
    if (!model) {
      return { heading: SPRITE_HEADING, speed: SPRITE_SPEED };
    }
    const { speed, height } = measureWalkSpeed(model);
    return {
      heading: props.subject.heading,
      speed: (speed * props.subject.height) / height,
    };
  }, [model, props.subject.heading, props.subject.height]);

  return (
    <>
      <CameraRig subject={chest} />
      <Backdrop />
      <ParticleField range="far" count={760} />
      <PathLine
        texture={props.pathTexture}
        origin={feet}
        heading={walk.heading}
        speed={walk.speed}
        fps={FPS}
      />
      {props.images.map((image, i) => (
        <ImageCard key={`${i}-${image.src}`} id={`card-${i}`} {...image} />
      ))}
      {model ? (
        <>
          {/* Graphic lighting: a soft key from camera-left and a hard rim
              from behind, which the screenprint turns into yellow edges. */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[-3, 4, 6]} intensity={1.5} />
          <directionalLight position={[4, 3, -5]} intensity={2.6} />
          <SubjectModel
            gltf={model}
            x={props.subject.x}
            ground={GROUND}
            z={props.subject.z}
            height={props.subject.height}
            heading={props.subject.heading}
            stepFrames={2}
            fps={FPS}
          />
        </>
      ) : (
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
      )}
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
          x={props.subject.x + 2.35}
          y={0.72}
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
      <ParticleField range="near" count={340} />
      <Renderer />
    </>
  );
};
