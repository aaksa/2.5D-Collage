import { useMemo } from "react";
import { random } from "remotion";
import { TAU } from "../utils/motion";

export type Micro = {
  x: number; // px
  y: number; // px
  rotation: number; // degrees
  scale: number; // multiplier
};

// Near-subconscious drift so nothing is ever digitally frozen:
// about ±4 px, ±3 px, ±0.5° and ±0.8% at amount = 1. Every object gets its
// own frequencies and phases, so no two things breathe in sync.
export const microMotion = (seed: string, amount: number) => {
  const r = (k: string) => random(`${seed}-micro-${k}`);
  const f = (k: string, base: number) => base * (0.75 + r(k) * 0.5);
  const p = (k: string) => r(k) * TAU;
  const fx = [f("fx1", 0.021), f("fx2", 0.0071), f("fx3", 0.047)];
  const fy = [f("fy1", 0.017), f("fy2", 0.0063), f("fy3", 0.039)];
  const fr = [f("fr1", 0.013), f("fr2", 0.029)];
  const fs = [f("fs1", 0.011), f("fs2", 0.027)];
  const px = [p("px1"), p("px2"), p("px3")];
  const py = [p("py1"), p("py2"), p("py3")];
  const pr = [p("pr1"), p("pr2")];
  const ps = [p("ps1"), p("ps2")];

  return (t: number): Micro => ({
    x:
      amount *
      (Math.sin(t * fx[0] + px[0]) * 2.2 +
        Math.sin(t * fx[1] + px[1]) * 1.3 +
        Math.sin(t * fx[2] + px[2]) * 0.5),
    y:
      amount *
      (Math.sin(t * fy[0] + py[0]) * 1.6 +
        Math.sin(t * fy[1] + py[1]) * 1.0 +
        Math.sin(t * fy[2] + py[2]) * 0.4),
    rotation:
      amount *
      (Math.sin(t * fr[0] + pr[0]) * 0.32 + Math.sin(t * fr[1] + pr[1]) * 0.14),
    scale:
      1 +
      amount *
        (Math.sin(t * fs[0] + ps[0]) * 0.005 +
          Math.sin(t * fs[1] + ps[1]) * 0.0025),
  });
};

export const useMicroMotion = (seed: string, amount: number) =>
  useMemo(() => microMotion(seed, amount), [seed, amount]);
