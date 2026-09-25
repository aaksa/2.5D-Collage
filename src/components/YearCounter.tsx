import "@fontsource/instrument-serif/400-italic.css";
import { AbsoluteFill, Easing, interpolate } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Starts slowly, runs through the decades, then takes its time to settle.
const run = Easing.bezier(0.6, 0, 0.18, 1);
const glide = Easing.bezier(0.22, 1, 0.36, 1);
const drift = Easing.bezier(0.45, 0, 0.55, 1);

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

// The years rolling by, like a mechanical counter: each column turns, and
// carries into the next one as it passes 9.
export const YearCounter: React.FC<{
  frame: number;
  fps: number;
  from: number;
  to: number;
  start: number; // seconds: starts counting
  land: number; // seconds: reaches the final year
  until: number; // seconds: leaves
  color: string;
  landColor: string;
}> = ({ frame, fps, from, to, start, land, until, color, landColor }) => {
  const sec = frame / fps;
  if (sec < start - 1 || sec > until + 1.2) return null;

  const valueAt = (s: number) =>
    from + (to - from) * run(interpolate(s, [start, land], [0, 1], clamp));
  const value = valueAt(sec);
  const speed = Math.abs(valueAt(sec + 1 / fps) - value) * fps; // years/s
  const n = Math.floor(value);
  const frac = value - n;

  const enter = glide(
    interpolate(sec, [start - 0.9, start + 0.3], [0, 1], clamp),
  );
  const leave = drift(interpolate(sec, [until, until + 0.9], [0, 1], clamp));
  const landed = interpolate(sec, [land - 0.2, land + 0.6], [0, 1], clamp);
  const line = interpolate(value, [from, to], [0, 1], clamp);

  const size = 190;
  const places = [3, 2, 1, 0];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 210,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          opacity: (1 - leave) * Math.min(1, enter * 1.4),
          transform: `translateY(${(1 - enter) * 40 - leave * 26}px)`,
          filter: `blur(${leave * 4}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: '"Instrument Serif", serif',
            fontStyle: "italic",
            fontSize: size,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color,
            textShadow: "0 2px 30px rgba(0,0,0,0.5)",
          }}
        >
          {places.map((p) => {
            const unit = 10 ** p;
            const digit = Math.floor(n / unit) % 10;
            // A column only turns while every column below it is at 9.
            const carrying = n % unit === unit - 1 || p === 0;
            const position = digit + (carrying ? frac : 0);
            const columnSpeed = speed / unit;
            return (
              <div
                key={p}
                style={{
                  width: "0.56em",
                  height: "1.05em",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    transform: `translateY(${-position * 1.05}em)`,
                    filter: `blur(${Math.min(6, columnSpeed * 0.18)}px)`,
                  }}
                >
                  {DIGITS.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        height: "1.05em",
                        display: "flex",
                        justifyContent: "center",
                        color:
                          landed > 0 && p < 2
                            ? mixHex(color, landColor, landed)
                            : undefined,
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* The passage of time, drawn as a line under the year. */}
        <div
          style={{
            marginTop: 18,
            marginRight: 8,
            width: 420,
            height: 1,
            background: "rgba(244,241,234,0.22)",
          }}
        >
          <div
            style={{
              width: `${line * 100}%`,
              height: 1,
              background: landColor,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c.join(",")})`;
};
