import "./index.css";
import { Composition } from "remotion";
import {
  FPS,
  PremiumCollage,
  calculateMetadata,
} from "./compositions/PremiumCollage";
import {
  STORY_FPS,
  STORY_FRAMES,
  ThiefSpeaks,
} from "./compositions/ThiefSpeaks";
import { defaultProps, premiumCollageSchema } from "./data/heroScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        // The story: npx remotion render ThiefSpeaks out/thief-speaks.mp4
        id="ThiefSpeaks"
        component={ThiefSpeaks}
        durationInFrames={STORY_FRAMES}
        fps={STORY_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        // The hero scene: npx remotion render PremiumCollage out/premium-collage.mp4
        id="PremiumCollage"
        component={PremiumCollage}
        schema={premiumCollageSchema}
        calculateMetadata={calculateMetadata}
        durationInFrames={Math.round(defaultProps.durationInSeconds * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  );
};
