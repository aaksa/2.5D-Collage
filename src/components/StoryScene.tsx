import { useMemo } from "react";
import { Texture, Vector3 } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  BLACKOUT,
  FACE_AT,
  HEADING,
  STORY_DURATION,
  StoryCardSpec,
  debtPile,
  storyCards,
} from "../data/story";
import { Backdrop } from "./Backdrop";
import { ParticleField } from "./ParticleField";
import { PathLine } from "./PathLine";
import { Grade, Renderer } from "./Renderer";
import { StoryCamera } from "./StoryCamera";
import { StoryCard } from "./StoryCard";
import { SubjectModel, measureWalkSpeed } from "./SubjectModel";

const GROUND = -1.05;
const HEIGHT = 2.05;
const FPS = 30;
const ROAD_BREAKS = 37.25; // "Jalan jalan mudah rusak"

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Warm and whole in Act I; a blackout on the silence; colder, harder and
// grainier in Act II; a red-tinged close on the face.
export const storyGrade = (sec: number): Grade => {
  const act2 = smooth(BLACKOUT, BLACKOUT + 0.8, sec);
  const face = smooth(FACE_AT, FACE_AT + 3, sec);
  // A soft, breathing blackout on the silence, never a hard cut.
  const dark =
    smooth(BLACKOUT - 0.7, BLACKOUT, sec) *
    (1 - smooth(BLACKOUT + 0.5, BLACKOUT + 1.6, sec));
  const end = smooth(STORY_DURATION - 1.6, STORY_DURATION - 0.1, sec);
  const intro = 1 - smooth(0, 1.6, sec);
  const tint: [number, number, number] = [
    mix(mix(1.04, 0.95, act2), 1.05, face),
    mix(mix(1.0, 0.98, act2), 0.97, face),
    mix(mix(0.94, 1.06, act2), 0.94, face),
  ];
  return {
    exposure: Math.max(0.02, (1 - dark * 0.97) * (1 - end) * (1 - intro)),
    saturation: mix(mix(1, 0.9, act2), 1.05, face),
    tint,
    vignette: mix(mix(0.28, 0.42, act2), 0.46, face),
    grain: mix(1, 1.45, act2),
  };
};

export const StoryScene: React.FC<{
  model: GLTF;
  typeTextures: Record<string, Texture>;
  pathTexture: string;
}> = ({ model, typeTextures, pathTexture }) => {
  const feet = useMemo(() => new Vector3(0, GROUND, 0), []);
  const walk = useMemo(() => {
    const { speed, height } = measureWalkSpeed(model);
    return (speed * HEIGHT) / height;
  }, [model]);
  const cards = useMemo<StoryCardSpec[]>(
    () => [...storyCards, ...debtPile],
    [],
  );

  return (
    <>
      <StoryCamera faceAt={FACE_AT} heading={HEADING} />
      <Backdrop />
      <ParticleField range="far" count={760} />
      <PathLine
        texture={pathTexture}
        origin={feet}
        heading={HEADING}
        speed={walk}
        fps={FPS}
        breakAt={ROAD_BREAKS}
      />
      {cards.map(({ typeTexture, ...card }) => (
        <StoryCard
          key={card.id}
          {...card}
          texture={typeTexture ? typeTextures[typeTexture] : undefined}
        />
      ))}
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3, 4, 6]} intensity={1.7} />
      <directionalLight position={[4, 3, -5]} intensity={2.8} />
      <directionalLight position={[3, 1.5, 3]} intensity={0.9} />
      <SubjectModel
        gltf={model}
        x={0}
        ground={GROUND}
        z={0}
        height={HEIGHT}
        heading={HEADING}
        stepFrames={1}
        fps={FPS}
        exposure={2.4}
      />
      <ParticleField range="near" count={340} />
      <Renderer grade={storyGrade} samples={2} />
    </>
  );
};
