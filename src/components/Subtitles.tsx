import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/instrument-serif/400-italic.css";
import { AbsoluteFill, Easing, interpolate } from "remotion";

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
// A long, soft landing: things arrive and settle, never snap.
const glide = Easing.bezier(0.22, 1, 0.36, 1);
const drift = Easing.bezier(0.45, 0, 0.55, 1);

const SANS = "Inter, sans-serif";
const SERIF = '"Instrument Serif", serif';

// One word that rises out of a mask and fades in as it comes into view,
// then drifts up and away.
const Word: React.FC<{
  frame: number;
  inAt: number; // frame
  outAt: number; // frame
  duration?: number;
  style?: React.CSSProperties;
  children: string;
}> = ({ frame, inAt, outAt, duration = 30, style, children }) => {
  const rise = glide(
    interpolate(frame, [inAt, inAt + duration], [0, 1], clamp),
  );
  const fade = interpolate(
    frame,
    [inAt + 4, inAt + duration * 0.9],
    [0, 1],
    clamp,
  );
  const leave = drift(interpolate(frame, [outAt, outAt + 20], [0, 1], clamp));
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom",
        paddingBottom: "0.12em",
        marginBottom: "-0.12em",
        marginRight: "0.26em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${(1 - rise) * 105 - leave * 22}%)`,
          opacity: fade * (1 - leave),
          filter: `blur(${(1 - fade) * 3 + leave * 3}px)`,
          ...style,
        }}
      >
        {children}
      </span>
    </span>
  );
};

// A hairline that draws itself.
const Rule: React.FC<{
  frame: number;
  inAt: number;
  outAt: number;
  width: number;
  color?: string;
}> = ({ frame, inAt, outAt, width, color = "rgba(244,241,234,0.5)" }) => {
  const grow = glide(interpolate(frame, [inAt, inAt + 36], [0, 1], clamp));
  const leave = drift(interpolate(frame, [outAt, outAt + 18], [0, 1], clamp));
  return (
    <span
      style={{
        display: "inline-block",
        width: width * grow,
        height: 1,
        background: color,
        opacity: 1 - leave,
        verticalAlign: "middle",
        margin: "0 16px",
      }}
    />
  );
};

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Narration, set as an editorial caption bottom-left: a small index and a
// drawn rule arrive first, then the words rise into place one by one, with
// the emphasised words landing last in an italic serif.
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
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {cues.map((cue, index) => {
        const next = cues[index + 1];
        const exit = Math.min(
          cue.end + 0.3,
          next ? next.start - 0.12 : Infinity,
        );
        if (sec < cue.start - 0.6 || sec > exit + 1.2) return null;
        const inAt = (cue.start - 0.35) * fps;
        const outAt = exit * fps;
        const words = sentence(cue.text).split(/\s+/);
        let plain = 0;
        return (
          <div
            key={`${cue.start}-${cue.text}`}
            style={{
              position: "absolute",
              left: 120,
              bottom: 118,
              maxWidth: 1120,
            }}
          >
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 13,
                letterSpacing: "0.34em",
                color: "rgba(244,241,234,0.62)",
                marginBottom: 22,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Word frame={frame} inAt={inAt - 8} outAt={outAt} duration={26}>
                {String(index + 1).padStart(2, "0")}
              </Word>
              <Rule frame={frame} inAt={inAt - 4} outAt={outAt} width={64} />
              <Word frame={frame} inAt={inAt} outAt={outAt} duration={26}>
                {String(cues.length).padStart(2, "0")}
              </Word>
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: 60,
                lineHeight: 1.08,
                letterSpacing: "-0.028em",
                color: "#f4f1ea",
                textShadow: "0 2px 28px rgba(0,0,0,0.5)",
              }}
            >
              {words.map((word, i) => {
                const key = word.toLowerCase().replace(/[^a-z0-9]/g, "");
                const tone = emphasis[key];
                // Emphasised words arrive last, and take their time.
                const hasPlain = words.some(
                  (w) => !emphasis[w.toLowerCase().replace(/[^a-z0-9]/g, "")],
                );
                const at =
                  tone && hasPlain
                    ? inAt + 6 + words.length * 3.2
                    : inAt + 6 + plain++ * 3.2;
                return (
                  <Word
                    key={i}
                    frame={frame}
                    inAt={at}
                    outAt={outAt + i * 1.5}
                    duration={tone ? 38 : 30}
                    style={
                      tone
                        ? {
                            fontFamily: SERIF,
                            fontStyle: "italic",
                            fontWeight: 400,
                            fontSize: "1.16em",
                            letterSpacing: "-0.01em",
                            color: colors[tone],
                          }
                        : undefined
                    }
                  >
                    {word}
                  </Word>
                );
              })}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Chapter marks, top-left: a serif numeral, a drawn rule and a small title.
export const ChapterMarks: React.FC<{
  chapters: { from: number; to: number; numeral: string; title: string }[];
  frame: number;
  fps: number;
}> = ({ chapters, frame, fps }) => {
  const sec = frame / fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {chapters.map((c) => {
        if (sec < c.from - 0.2 || sec > c.to + 1.2) return null;
        const inAt = c.from * fps;
        const outAt = c.to * fps;
        return (
          <div
            key={c.numeral}
            style={{
              position: "absolute",
              left: 120,
              top: 92,
              display: "flex",
              alignItems: "center",
              color: "rgba(244,241,234,0.78)",
            }}
          >
            <Word
              frame={frame}
              inAt={inAt}
              outAt={outAt}
              duration={40}
              style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 40 }}
            >
              {c.numeral}
            </Word>
            <Rule frame={frame} inAt={inAt + 8} outAt={outAt} width={48} />
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 14,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
              }}
            >
              {c.title.split(" ").map((w, i) => (
                <Word
                  key={i}
                  frame={frame}
                  inAt={inAt + 14 + i * 3}
                  outAt={outAt}
                  duration={30}
                >
                  {w}
                </Word>
              ))}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// The closing line beside the rat's face: an accent rule draws, then the
// words rise into place slowly, one after another.
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
  const inAt = at * fps;
  const outAt = fadeOutAt * fps;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 1140, top: 372, width: 700 }}>
        <div style={{ marginBottom: 34, marginLeft: -16 }}>
          <Rule
            frame={frame}
            inAt={inAt}
            outAt={outAt}
            width={120}
            color={accent}
          />
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 94,
            lineHeight: 1.02,
            letterSpacing: "-0.01em",
            color: "#f4f1ea",
            textShadow: "0 2px 30px rgba(0,0,0,0.6)",
          }}
        >
          {text.split(/\s+/).map((word, i) => (
            <Word
              key={i}
              frame={frame}
              inAt={inAt + 14 + i * 7}
              outAt={outAt}
              duration={44}
              style={
                word.toLowerCase() === "thief" ? { color: accent } : undefined
              }
            >
              {word}
            </Word>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
