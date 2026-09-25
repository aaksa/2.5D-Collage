import "./index.css";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./Collage/camera";
import { Collage, collageSchema } from "./Collage/Collage";
import { WALKER_FRAMES } from "./Collage/Walker";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      // npx remotion render Collage out/collage.mp4
      id="Collage"
      component={Collage}
      schema={collageSchema}
      durationInFrames={WALKER_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        // Swap these for your own photos in public/photos/.
        photos: [
          "photos/photo-01.svg",
          "photos/photo-02.svg",
          "photos/photo-03.svg",
          "photos/photo-04.svg",
          "photos/photo-05.svg",
          "photos/photo-06.svg",
          "photos/photo-07.svg",
          "photos/photo-08.svg",
        ],
        floorTexture: "photos/pavement.svg",
        // Darkest to lightest.
        walkerColors: ["#2a0406", "#b5141d", "#e0302a", "#e8d93a", "#f3f57a"],
        glowColor: "#ffe94a",
      }}
    />
  );
};
