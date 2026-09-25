import "@fontsource/inter/800.css";
import "@fontsource/instrument-serif/400-italic.css";
import { AbsoluteFill, interpolate } from "remotion";
import { expoOut } from "../utils/easing";

export type Cue = { start: number; end: number; text: string }; // seconds

// Minimal SRT reader. Cues are sorted by start time (the source file lists
// two of them out of order).
export const parseSrt = (srt: string): Cue[] => {
  const toSeconds = (ts: string) => {
    const [h, m, rest] = ts.trim().split(":");
    const [s, ms] = rest.split(",");
    return +h * 3600 + +m * 60 + +s + +ms / 1000;
  };
  return srt
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((lines) => lines.length >= 3 && lines[1].includes("-->"))
    .map((lines) => {
      const [a, b] = lines[1].split("-->");
      return {
        start: toSeconds(a),
        end: toSeconds(b),
        text: lines.slice(2).join(" ").trim(),
      };
    })
    .sort((a, b) => a.start - b.start);
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Bold editorial subtitles, bottom-left like the reference's label. Words
// resolve out of a blur one after another and leave together, drifting up.
export const Subtitles: React.FC<{
  cues: Cue[];
  frame: number;
  fps: number;
  emphasis: Record<string, "highlight" | "accent">;
  colors: { highlight: string; accent: string };
  hideAfter: number; // seconds
}> = ({ cues, frame, fps, emphasis, colors, hideAfter }) => {
  const sec = frame / fps;
  if (sec > hideAfter) return null;
  const active = cues.filter(
    (c) => sec >= c.start - 0.1 && sec <= c.end + 0.35,
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {active.map((cue) => {
        const words = cue.text.split(/\s+/);
        const startF = cue.start * fps;
        const out = interpolate(sec, [cue.end, cue.end + 0.35], [0, 1], clamp);
        return (
          <div
            key={`${cue.start}-${cue.text}`}
            style={{
              position: "absolute",
              left: 96,
              bottom: 104,
              maxWidth: 1180,
              fontFamily: "Inter, sans-serif",
              fontWeight: 800,
              fontSize: 64,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: "#f4f1ea",
              textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            }}
          >
            {words.map((word, i) => {
              const inP = expoOut(
                interpolate(
                  frame,
                  [startF + i * 2.5, startF + i * 2.5 + 14],
                  [0, 1],
                  clamp,
                ),
              );
              const key = word.toLowerCase().replace(/[^a-z0-9]/g, "");
              const tone = emphasis[key];
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    marginRight: "0.24em",
                    opacity: inP * (1 - out),
                    filter: `blur(${(1 - inP) * 8 + out * 6}px)`,
                    transform: `translateY(${(1 - inP) * 16 - out * 10}px)`,
                    color: tone ? colors[tone] : undefined,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// The closing line beside the rat's face, set in a serif and revealed word
// by word.
export const ClosingLine: React.FC<{
  text: string;
  frame: number;
  fps: number;
  at: number; // seconds
  fadeOutAt: number;
  accent: string;
}> = ({ text, frame, fps, at, fadeOutAt, accent }) => {
  const sec = frame / fps;
  if (sec < at - 0.2) return null;
  const startF = at * fps;
  const fade = interpolate(sec, [fadeOutAt, fadeOutAt + 0.7], [1, 0], clamp);
  const rule = expoOut(
    interpolate(frame, [startF, startF + 24], [0, 1], clamp),
  );
  const words = text.split(/\s+/);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fade }}>
      <div style={{ position: "absolute", left: 1140, top: 380, width: 700 }}>
        <div
          style={{
            height: 3,
            width: 120 * rule,
            background: accent,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontStyle: "italic",
            fontSize: 94,
            lineHeight: 1.0,
            letterSpacing: "-0.01em",
            color: "#f4f1ea",
            textShadow: "0 2px 30px rgba(0,0,0,0.6)",
          }}
        >
          {words.map((word, i) => {
            const p = expoOut(
              interpolate(
                frame,
                [startF + 8 + i * 6, startF + 8 + i * 6 + 22],
                [0, 1],
                clamp,
              ),
            );
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.22em",
                  opacity: p,
                  filter: `blur(${(1 - p) * 10}px)`,
                  transform: `translateY(${(1 - p) * 20}px)`,
                  color: word.toLowerCase() === "thief" ? accent : undefined,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
