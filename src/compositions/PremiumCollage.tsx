import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/inter/500.css";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useVideoConfig,
} from "remotion";
import { CanvasTexture, Color, SRGBColorSpace, Texture } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Scene } from "../components/Scene";
import {
  SceneProvider,
  Settings,
  createSceneState,
} from "../components/SceneContext";
import { PremiumCollageProps } from "../data/heroScene";

export const FPS = 30;

export const calculateMetadata: CalculateMetadataFunction<
  PremiumCollageProps
> = ({ props }) => ({
  durationInFrames: Math.round(props.durationInSeconds * FPS),
});

const resolve = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

const loadTexture = (src: string) =>
  new Promise<Texture>((ok, fail) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = new Texture(img);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      ok(tex);
    };
    img.onerror = () => fail(new Error(`Could not load ${src}`));
    img.src = resolve(src);
  });

const SERIF = '"Instrument Serif"';
const SANS = "Inter";

// Typography is drawn to a canvas once, then lives in the scene as a card.
const makeTitle = async (title: string, subtitle: string) => {
  if (!title) return null;
  await Promise.all([
    document.fonts.load(`italic 400 200px ${SERIF}`),
    document.fonts.load(`500 40px ${SANS}`),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2ede3";
  ctx.textBaseline = "alphabetic";
  ctx.font = `italic 400 270px ${SERIF}`;
  ctx.fillText(title, 20, 330);
  ctx.fillStyle = "rgba(242,237,227,0.55)";
  ctx.fillRect(28, 402, 380, 3);
  ctx.fillStyle = "rgba(242,237,227,0.82)";
  ctx.font = `500 40px ${SANS}`;
  ctx.letterSpacing = "16px";
  ctx.fillText(subtitle.toUpperCase(), 28, 500);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

const loadModel = (src: string) =>
  new Promise<GLTF>((ok, fail) =>
    new GLTFLoader().load(resolve(src), ok, undefined, () =>
      fail(new Error(`Could not load ${src}`)),
    ),
  );

const useAssets = (props: PremiumCollageProps) => {
  const [handle] = useState(() => delayRender("Loading collage assets"));
  const [assets, setAssets] = useState<{
    textures: Map<string, Texture>;
    title: Texture | null;
    model: GLTF | null;
  } | null>(null);

  useEffect(() => {
    const srcs = [
      ...new Set([
        ...props.images.map((i) => i.src),
        ...props.subject.frames,
        props.transitionImage,
        props.pathTexture,
      ]),
    ];
    Promise.all([
      Promise.all(srcs.map(async (s) => [s, await loadTexture(s)] as const)),
      makeTitle(props.title, props.subtitle),
      props.subject.model ? loadModel(props.subject.model) : null,
    ])
      .then(([entries, title, model]) => {
        setAssets({ textures: new Map(entries), title, model });
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, props]);

  return assets;
};

export const PremiumCollage: React.FC<PremiumCollageProps> = (props) => {
  const { width, height, durationInFrames } = useVideoConfig();
  const assets = useAssets(props);

  const state = useMemo(() => {
    if (!assets) return null;
    const settings: Settings = {
      duration: durationInFrames,
      background: new Color(props.backgroundColor),
      accent: new Color(props.accentColor),
      highlight: new Color(props.highlightColor),
      cameraIntensity: props.cameraIntensity,
      parallaxIntensity: props.parallaxIntensity,
      grainAmount: props.grainAmount,
      microMotionAmount: props.microMotionAmount,
      motionBlurAmount: props.motionBlurAmount,
    };
    return createSceneState(settings, assets.textures);
  }, [assets, durationInFrames, props]);

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {state && assets ? (
        <ThreeCanvas
          width={width}
          height={height}
          flat
          dpr={1}
          gl={{ antialias: false }}
          camera={{ fov: 42, near: 0.05, far: 200, position: [-0.4, 0.05, 7] }}
        >
          <SceneProvider value={state}>
            <Scene
              props={props}
              titleTexture={assets.title}
              model={assets.model}
            />
          </SceneProvider>
        </ThreeCanvas>
      ) : null}
    </AbsoluteFill>
  );
};
