import "./index.css";
import { Composition } from "remotion";
import {
  FPS,
  PremiumCollage,
  calculateMetadata,
} from "./compositions/PremiumCollage";
import { defaultProps, premiumCollageSchema } from "./data/heroScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        // npx remotion render PremiumCollage out/premium-collage.mp4
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
