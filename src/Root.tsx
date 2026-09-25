import "./index.css";
import { Composition } from "remotion";
import { DURATION, FPS, HEIGHT, WIDTH } from "./Collage/camera";
import { Collage, collageSchema } from "./Collage/Collage";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      // npx remotion render Collage out/collage.mp4
      id="Collage"
      component={Collage}
      schema={collageSchema}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        // Placeholder photos (see public/photos/CREDITS.md). Swap in your own;
        // any number works, and they are shown in black and white.
        photos: [
          "photos/01-skyline.jpg",
          "photos/02-ferry.jpg",
          "photos/03-church.jpg",
          "photos/04-bridge.jpg",
          "photos/05-window.jpg",
          "photos/06-dusk.jpg",
          "photos/07-shore.jpg",
          "photos/08-waves.jpg",
          "photos/09-lone-tree.jpg",
          "photos/10-fog-forest.jpg",
          "photos/11-mountain.jpg",
          "photos/12-alpine-town.jpg",
          "photos/13-lake.jpg",
          "photos/14-palms.jpg",
          "photos/15-street.jpg",
          "photos/16-dunes.jpg",
        ],
        pathTexture: "photos/pavement.svg",
        title: "Between Places",
        subtitle: "A walk through what remains",
        chapter: "Chapter One — The Walk",
        letterbox: 131,
      }}
    />
  );
};
