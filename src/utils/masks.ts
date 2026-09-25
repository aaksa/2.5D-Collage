import { random } from "remotion";

export const MASKS = ["rect", "shard", "kite", "triangle", "sliver"] as const;
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
  switch (mask) {
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
