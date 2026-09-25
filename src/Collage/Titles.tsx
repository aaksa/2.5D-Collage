import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  continueRender,
  delayRender,
  interpolate,
} from "remotion";
import { FPS } from "./camera";

const SERIF = '"Instrument Serif", serif';
const SANS = "Inter, sans-serif";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const outExpo = Easing.bezier(0.16, 1, 0.3, 1);

// Fonts come from @fontsource; hold the render until they are ready.
const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load(`italic 400 100px ${SERIF}`),
      document.fonts.load(`400 20px ${SANS}`),
      document.fonts.load(`500 20px ${SANS}`),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

// Letters resolve out of a blur one after another.
const Reveal: React.FC<{
  text: string;
  frame: number;
  start: number;
  end: number;
  stagger?: number;
}> = ({ text, frame, start, end, stagger = 1.6 }) => (
  <>
    {text.split("").map((ch, i) => {
      const t = interpolate(
        frame,
        [start + i * stagger, start + i * stagger + 22],
        [0, 1],
        {
          ...clamp,
          easing: outExpo,
        },
      );
      const out = interpolate(frame, [end - 14, end], [1, 0], clamp);
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            opacity: t * out,
            filter: `blur(${(1 - t) * 14 + (1 - out) * 8}px)`,
            transform: `translateY(${(1 - t) * 18}px)`,
          }}
        >
          {ch}
        </span>
      );
    })}
  </>
);

export const Titles: React.FC<{
  frame: number;
  durationInFrames: number;
  title: string;
  subtitle: string;
  chapter: string;
  letterbox: number;
}> = ({ frame, durationInFrames, title, subtitle, chapter, letterbox }) => {
  useFonts();
  const openIn = 1.1 * FPS;
  const openOut = 5 * FPS;
  const endIn = durationInFrames - 2.4 * FPS;
  const rule = interpolate(frame, [openIn + 10, openIn + 40], [0, 1], {
    ...clamp,
    easing: outExpo,
  });
  const ruleOut = interpolate(frame, [openOut - 14, openOut], [1, 0], clamp);
  const meta = interpolate(frame, [2.5 * FPS, 3.5 * FPS], [0, 1], clamp);
  const seconds = Math.floor(frame / FPS);
  const timecode = `00:00:${String(seconds).padStart(2, "0")}:${String(frame % FPS).padStart(2, "0")}`;
  const barText = Math.max(0, letterbox / 2 - 7);

  return (
    <AbsoluteFill
      style={{ color: "#f3efe7", textShadow: "0 2px 28px rgba(0,0,0,0.65)" }}
    >
      {title ? (
        <div style={{ position: "absolute", left: 1090, top: 400, width: 760 }}>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 118,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            <Reveal text={title} frame={frame} start={openIn} end={openOut} />
          </div>
          <div
            style={{
              marginTop: 26,
              height: 1,
              width: 340 * rule,
              background: "rgba(243,239,231,0.55)",
              opacity: ruleOut,
            }}
          />
          <div
            style={{
              marginTop: 20,
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            <Reveal
              text={subtitle}
              frame={frame}
              start={openIn + 18}
              end={openOut}
              stagger={0.7}
            />
          </div>
        </div>
      ) : null}

      {/* Small print in the letterbox bars. */}
      {letterbox > 0 ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 13,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.55 * meta,
          }}
        >
          <div style={{ position: "absolute", left: 72, top: barText }}>
            {chapter}
          </div>
          <div style={{ position: "absolute", right: 72, top: barText }}>
            {title}
          </div>
          <div
            style={{
              position: "absolute",
              right: 72,
              bottom: barText,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.2em",
            }}
          >
            {timecode}
          </div>
        </div>
      ) : null}

      {title ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 84,
          }}
        >
          <div>
            {" "}
            <Reveal
              text={title}
              frame={frame}
              start={endIn}
              end={durationInFrames + 20}
              stagger={1.2}
            />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
