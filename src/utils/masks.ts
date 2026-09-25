import { random } from "remotion";

export const MASKS = [
  "rect",
  "shard",
  "kite",
  "triangle",
  "sliver",
  "arch",
  "porthole",
  "hexagon",
  "ticket",
  "notched",
  "chevron",
  "trapezoid",
  "parallelogram",
  "wedge",
] as const;
export type MaskName = (typeof MASKS)[number];
export type Point = [number, number];

// Mask outlines in 0..1 card space (x right, y up), with a little seeded
// irregularity so no two cuts are identical.
export const maskPoints = (mask: MaskName | Point[], seed: string): Point[] => {
  if (Array.isArray(mask)) {
    return mask;
  }
  const j = (k: string, amount: number) =>
    (random(`${seed}-${k}`) - 0.5) * amount;
  const arc = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    from: number,
    to: number,
    n: number,
  ): Point[] =>
    new Array(n).fill(0).map((_, i) => {
      const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
      return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    });
  switch (mask) {
    // A window-like arch: square foot, rounded head.
    case "arch":
      return [[0, 0], [1, 0], ...arc(0.5, 0.6, 0.5, 0.4, 0, 180, 9)];
    // A round porthole.
    case "porthole":
      return arc(0.5, 0.5, 0.5, 0.5, 0, 330, 12);
    case "hexagon":
      return [
        [0.25, 0],
        [0.75, 0],
        [1, 0.5],
        [0.75, 1],
        [0.25, 1],
        [0, 0.5],
      ];
    // A ticket stub, notched on both sides.
    case "ticket":
      return [
        [0, 0],
        [1, 0],
        [1, 0.4],
        [0.94, 0.5],
        [1, 0.6],
        [1, 1],
        [0, 1],
        [0, 0.6],
        [0.06, 0.5],
        [0, 0.4],
      ];
    // A print with one corner cut away.
    case "notched":
      return [
        [0, 0],
        [1, 0],
        [1, 0.74 + j("a", 0.08)],
        [0.78 + j("b", 0.08), 1],
        [0, 1],
      ];
    case "chevron":
      return [
        [0, 0],
        [0.84, 0],
        [1, 0.5],
        [0.84, 1],
        [0, 1],
        [0.13, 0.5],
      ];
    case "trapezoid":
      return [
        [0, 0],
        [1, 0],
        [0.9, 1],
        [0.1, 1],
      ];
    case "parallelogram":
      return [
        [0.14, 0],
        [1, 0],
        [0.86, 1],
        [0, 1],
      ];
    // A pennant: tall at the hoist, tapering away.
    case "wedge":
      return [
        [0, 0],
        [1, 0.16],
        [1, 0.84],
        [0, 1],
      ];
    case "rect":
      return [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];
    case "shard":
      return [
        [0.02 + j("a", 0.04), 0.06 + j("b", 0.1)],
        [0.9 + j("c", 0.12), 0],
        [1, 0.86 + j("d", 0.16)],
        [0.12 + j("e", 0.16), 1],
      ];
    case "kite":
      return [
        [0.5 + j("a", 0.2), 0],
        [1, 0.42 + j("b", 0.2)],
        [0.55 + j("c", 0.2), 1],
        [0, 0.55 + j("d", 0.2)],
      ];
    case "triangle":
      return [
        [0, 0.04 + j("a", 0.08)],
        [1, 0],
        [0.42 + j("b", 0.3), 1],
      ];
    case "sliver":
      return [
        [0, 0.1 + j("a", 0.1)],
        [1, 0],
        [0.96 + j("b", 0.06), 0.62 + j("c", 0.2)],
        [0.04, 1],
      ];
  }
};
