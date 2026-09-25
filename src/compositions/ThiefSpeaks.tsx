import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/800.css";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  cancelRender,
  continueRender,
  delayRender,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CanvasTexture, Color, SRGBColorSpace, Texture } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  SceneProvider,
  Settings,
  createSceneState,
} from "../components/SceneContext";
import { StoryScene } from "../components/StoryScene";
import {
  ChapterMarks,
  ClosingLine,
  Cue,
  Subtitles,
  parseSrt,
} from "../components/Subtitles";
import {
  CHAPTERS,
  EMPHASIS,
  FACE_AT,
  STORY_DURATION,
  THIEF_LINE_AT,
  debtPile,
  storyCards,
} from "../data/story";

export const STORY_FPS = 30;
export const STORY_FRAMES = Math.ceil(STORY_DURATION * STORY_FPS);

const COLORS = {
  background: "#080808",
  accent: "#d8261d",
  highlight: "#eee84e",
};

const PATH_TEXTURE = "photos/pavement.svg";

const loadTexture = (src: string) =>
  new Promise<Texture>((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const tex = new Texture(img);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      ok(tex);
    };
    img.onerror = () => fail(new Error(`Could not load ${src}`));
    img.src = staticFile(src);
  });

const canvasTexture = (canvas: HTMLCanvasElement) => {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

// Big serif numerals for "350" and "80".
const numeral = (text: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2ede3";
  ctx.font = 'italic 400 820px "Instrument Serif"';
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 800, 720);
  return canvasTexture(canvas);
};

// A ledger page for the debt pile: ruled paper, columns of figures, a
// red rule. The figures are random; they are texture, not data.
const ledger = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 620;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ebe4d4";
  ctx.fillRect(0, 0, 480, 620);
  ctx.fillStyle = "#b8231c";
  ctx.fillRect(40, 70, 400, 4);
  ctx.font = "800 34px Inter";
  ctx.fillText("HUTANG", 40, 56);
  ctx.strokeStyle = "rgba(40,40,60,0.25)";
  ctx.lineWidth = 1;
  ctx.font = "500 22px Inter";
  for (let row = 0; row < 18; row++) {
    const y = 110 + row * 28;
    ctx.beginPath();
    ctx.moveTo(40, y + 6);
    ctx.lineTo(440, y + 6);
    ctx.stroke();
    ctx.fillStyle = "rgba(25,25,35,0.85)";
    const n = Math.floor(random(`ledger-${row}`) * 9e8 + 1e8);
    ctx.fillText(n.toLocaleString("id-ID"), 250, y);
    ctx.fillText(String(row + 1).padStart(2, "0"), 44, y);
  }
  return canvasTexture(canvas);
};

type Assets = {
  textures: Map<string, Texture>;
  typeTextures: Record<string, Texture>;
  model: GLTF;
  cues: Cue[];
};

const useAssets = () => {
  const [handle] = useState(() => delayRender("Loading story assets"));
  const [assets, setAssets] = useState<Assets | null>(null);

  useEffect(() => {
    const srcs = [
      ...new Set([
        ...[...storyCards, ...debtPile].flatMap((c) => (c.src ? [c.src] : [])),
        PATH_TEXTURE,
      ]),
    ];
    const fonts = Promise.all([
      document.fonts.load('italic 400 200px "Instrument Serif"'),
      document.fonts.load("800 40px Inter"),
      document.fonts.load("500 40px Inter"),
      document.fonts.load("600 40px Inter"),
    ]);
    Promise.all([
      Promise.all(srcs.map(async (s) => [s, await loadTexture(s)] as const)),
      new Promise<GLTF>((ok, fail) =>
        new GLTFLoader().load(
          staticFile("models/rat-in-suit.glb"),
          ok,
          undefined,
          () => fail(new Error("Could not load the rat model")),
        ),
      ),
      fetch(staticFile("audio/0926.srt")).then((r) => r.text()),
      fonts,
    ])
      .then(([entries, model, srt]) => {
        setAssets({
          textures: new Map(entries),
          typeTextures: {
            "350": numeral("350"),
            "80": numeral("80"),
            ledger: ledger(),
          },
          model,
          cues: parseSrt(srt),
        });
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);

  return assets;
};

export const ThiefSpeaks: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const assets = useAssets();

  const state = useMemo(() => {
    if (!assets) return null;
    const settings: Settings = {
      duration: durationInFrames,
      background: new Color(COLORS.background),
      accent: new Color(COLORS.accent),
      highlight: new Color(COLORS.highlight),
      cameraIntensity: 1,
      parallaxIntensity: 1,
      grainAmount: 1,
      microMotionAmount: 1,
      motionBlurAmount: 0.5,
    };
    return createSceneState(settings, assets.textures);
  }, [assets, durationInFrames]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Audio src={staticFile("audio/0926.mp3")} />
      {state && assets ? (
        <>
          <ThreeCanvas
            width={width}
            height={height}
            flat
            dpr={1}
            gl={{ antialias: false }}
            camera={{
              fov: 40,
              near: 0.05,
              far: 200,
              position: [-0.55, 1.4, 6.8],
            }}
          >
            <SceneProvider value={state}>
              <StoryScene
                model={assets.model}
                typeTextures={assets.typeTextures}
                pathTexture={PATH_TEXTURE}
              />
            </SceneProvider>
          </ThreeCanvas>
          <ChapterMarks chapters={CHAPTERS} frame={frame} fps={fps} />
          <Subtitles
            cues={assets.cues}
            frame={frame}
            fps={fps}
            emphasis={EMPHASIS}
            colors={{ highlight: COLORS.highlight, accent: "#ff4b3e" }}
            hideAfter={FACE_AT + 0.5}
          />
          <ClosingLine
            text="Now the Thief Speaks Our Tongue"
            frame={frame}
            fps={fps}
            at={THIEF_LINE_AT}
            fadeOutAt={STORY_DURATION - 1.0}
            accent="#ff4b3e"
          />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
