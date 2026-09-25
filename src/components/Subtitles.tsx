import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
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
  // Which side carries the word gap. Right-aligned lines put it on the
  // left, so nothing trails past the margin.
  space?: "left" | "right" | "none";
  children: string;
}> = ({
  frame,
  inAt,
  outAt,
  duration = 30,
  style,
  space = "right",
  children,
}) => {
  const rise = glide(
    interpolate(frame, [inAt, inAt + duration], [0, 1], clamp),
  );
  const fade = interpolate(
    frame,
    [inAt + 3, inAt + duration * 0.7],
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
        marginLeft: space === "left" ? "0.26em" : 0,
        marginRight: space === "right" ? "0.26em" : 0,
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

const SELECT_BLUE = "#0d99ff";

const mixColor = (t: number) => {
  // Dim warm grey towards bright white, as the word is spoken.
  const a = 0.34 + (1 - 0.34) * t;
  return `rgba(${Math.round(244 + 3 * t)},${Math.round(241 + 4 * t)},${Math.round(234 + 6 * t)},${a.toFixed(3)})`;
};

// A design-tool selection around a word: a translucent blue fill and a
// hairline box that sweeps open from the left, then two round handles pop
// in on opposite corners.
export const SelectionFrame: React.FC<{ progress: number; fade?: number }> = ({
  progress,
  fade = 1,
}) => {
  const box = glide(Math.min(1, Math.max(0, progress / 0.7)));
  const knobs = glide(Math.min(1, Math.max(0, (progress - 0.45) / 0.55)));
  if (box <= 0 || fade <= 0) return null;
  const knob = (pos: React.CSSProperties) => (
    <span
      style={{
        position: "absolute",
        width: 13,
        height: 13,
        borderRadius: "50%",
        background: SELECT_BLUE,
        boxShadow: "0 0 0 2px #d8ecff",
        transform: `translate(-50%, -50%) scale(${knobs})`,
        ...pos,
      }}
    />
  );
  return (
    <span
      style={{
        position: "absolute",
        inset: "0.02em -0.1em -0.02em -0.1em",
        opacity: fade,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(13,153,255,0.2)",
          border: `2px solid ${SELECT_BLUE}`,
          borderRadius: 2,
          clipPath: `inset(-4px ${(1 - box) * 100}% -4px -4px)`,
        }}
      />
      {knob({ left: 0, top: 0 })}
      {knob({ left: "100%", top: "100%" })}
    </span>
  );
};

type LineWord = {
  text: string;
  inAt: number; // frame it rises in
  litAt: number; // frame it is spoken
  selected: boolean;
};

// A line in the reference style: every word rises in dim, lights up white
// as it is spoken, and the key word is selected like a layer in a design
// tool.
const Line: React.FC<{
  words: LineWord[];
  frame: number;
  outAt: number;
  align: "left" | "right";
  style: React.CSSProperties;
}> = ({ words, frame, outAt, align, style }) => {
  const leave = drift(interpolate(frame, [outAt, outAt + 20], [0, 1], clamp));
  return (
    <div style={{ ...style, textAlign: align }}>
      {words.map((w, i) => {
        const lit = glide(
          interpolate(frame, [w.litAt, w.litAt + 9], [0, 1], clamp),
        );
        const gap = i === 0 ? 0 : "0.27em";
        const word = (
          <Word
            frame={frame}
            inAt={w.inAt}
            outAt={outAt + i * 1.5}
            duration={30}
            space="none"
            style={{ color: mixColor(lit) }}
          >
            {w.text}
          </Word>
        );
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              position: "relative",
              marginLeft: align === "right" ? gap : 0,
              marginRight: align === "left" ? "0.27em" : 0,
            }}
          >
            {w.selected ? (
              <SelectionFrame
                progress={interpolate(
                  frame,
                  [w.litAt - 2, w.litAt + 22],
                  [0, 1],
                  clamp,
                )}
                fade={1 - leave}
              />
            ) : null}
            {word}
          </span>
        );
      })}
    </div>
  );
};

const LINE_STYLE: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: 64,
  lineHeight: 1.14,
  letterSpacing: "-0.03em",
};

// Narration: a small index and a drawn rule arrive first, then the line.
export const Subtitles: React.FC<{
  cues: Cue[];
  frame: number;
  fps: number;
  emphasis: Record<string, "highlight" | "accent">;
  colors: { highlight: string; accent: string };
  hideAfter: number; // seconds
}> = ({ cues, frame, fps, emphasis, hideAfter }) => {
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
        const texts = sentence(cue.text).split(/\s+/);
        const span = Math.max(0.3, cue.end - cue.start) * fps;
        const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
        // Select the last emphasised word of the line, like the reference.
        const selectedIndex = texts
          .map((t, i) => (emphasis[key(t)] ? i : -1))
          .reduce((a, b) => Math.max(a, b), -1);
        const words: LineWord[] = texts.map((text, i) => ({
          text,
          inAt: inAt + 4 + i * 3,
          litAt: cue.start * fps + (i / texts.length) * span * 0.85,
          selected: i === selectedIndex,
        }));
        return (
          <div
            key={`${cue.start}-${cue.text}`}
            style={{
              position: "absolute",
              right: 120,
              bottom: 116,
              maxWidth: 780,
            }}
          >
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 13,
                letterSpacing: "0.34em",
                color: "rgba(244,241,234,0.62)",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Word
                frame={frame}
                inAt={inAt - 8}
                outAt={outAt}
                duration={26}
                space="none"
              >
                {String(index + 1).padStart(2, "0")}
              </Word>
              <Rule frame={frame} inAt={inAt - 4} outAt={outAt} width={64} />
              <Word
                frame={frame}
                inAt={inAt}
                outAt={outAt}
                duration={26}
                space="none"
              >
                {String(cues.length).padStart(2, "0")}
              </Word>
            </div>
            <Line
              words={words}
              frame={frame}
              outAt={outAt}
              align="right"
              style={LINE_STYLE}
            />
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
              right: 120,
              top: 92,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              color: "rgba(244,241,234,0.78)",
            }}
          >
            <Word
              frame={frame}
              inAt={inAt}
              outAt={outAt}
              duration={40}
              space="none"
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
                  space={i === 0 ? "none" : "left"}
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

// The closing line beside the rat's face, in the same voice as the
// captions: the words rise in dim, light up one by one, and the selection
// lands on "Thief".
export const ClosingLine: React.FC<{
  text: string;
  frame: number;
  fps: number;
  at: number; // seconds
  fadeOutAt: number;
  accent: string;
}> = ({ text, frame, fps, at, fadeOutAt }) => {
  const sec = frame / fps;
  if (sec < at - 0.2) return null;
  const inAt = at * fps;
  const texts = text.split(/\s+/);
  const words: LineWord[] = texts.map((t, i) => ({
    text: t,
    inAt: inAt + i * 5,
    litAt: inAt + 24 + i * 9,
    selected: t.toLowerCase() === "thief",
  }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 1110, top: 380, width: 700 }}>
        <Line
          words={words}
          frame={frame}
          outAt={fadeOutAt * fps}
          align="left"
          style={{ ...LINE_STYLE, fontSize: 86, lineHeight: 1.1 }}
        />
      </div>
    </AbsoluteFill>
  );
};
