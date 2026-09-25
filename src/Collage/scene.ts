import { random } from "remotion";

// Everything is generated from fixed seeds, so every render is identical.

export type Shard = {
  id: number;
  x: number;
  y: number;
  z: number;
  width: number; // metres
  height: number;
  rotation: number; // degrees, in the picture plane
  photo: number; // index into the photos list
  clip: string; // CSS clip-path polygon
  pan: number; // direction the photo drifts inside its frame
};

export type Slab = {
  id: number;
  x: number;
  z: number;
  width: number;
  length: number;
  yaw: number; // degrees
  shade: number; // brightness multiplier, for variety
};

export type Star = {
  x: number;
  y: number;
  z: number;
  radius: number;
  twinkle: number;
  bokeh: boolean;
};

const pct = (n: number) => `${n.toFixed(1)}%`;

// Irregular torn-paper shapes: skewed quads, kites and the odd triangle.
const shardClip = (seed: string): string => {
  const r = (k: string) => random(`${seed}-${k}`);
  const kind = r("kind");
  if (kind < 0.18) {
    return `polygon(${pct(r("a") * 30)} ${pct(100)}, ${pct(40 + r("b") * 30)} 0%, 100% ${pct(70 + r("c") * 30)})`;
  }
  if (kind < 0.42) {
    return `polygon(${pct(40 + r("a") * 20)} 0%, 100% ${pct(35 + r("b") * 25)}, ${pct(45 + r("c") * 20)} 100%, 0% ${pct(40 + r("d") * 25)})`;
  }
  return `polygon(${pct(r("a") * 22)} ${pct(r("b") * 18)}, ${pct(100 - r("c") * 14)} ${pct(r("d") * 26)}, ${pct(100 - r("e") * 22)} ${pct(100 - r("f") * 14)}, ${pct(r("g") * 12)} ${pct(100 - r("h") * 28)})`;
};

export const makeShards = (photoCount: number): Shard[] => {
  const shards: Shard[] = [];
  let z = 3.5;
  let i = 0;
  while (z < 48) {
    const r = (k: string) => random(`shard-${i}-${k}`);
    const overhead = r("overhead") < 0.22;
    const side = i % 2 === 0 ? -1 : 1;
    const width = 1.5 + r("w") * 2.1;
    const height = width * (0.55 + r("h") * 0.5);
    shards.push({
      id: i,
      // Overhead shards hang above the path; the rest line the sides.
      x: overhead ? (r("x") - 0.5) * 3 : side * (1.5 + r("x") * 3.4),
      y: overhead ? 3.3 + r("y") * 1.8 : 0.4 + height / 2 + r("y") * 2.2,
      z,
      width,
      height,
      rotation: (r("rot") - 0.5) * 70,
      photo: i % photoCount,
      clip: shardClip(`shard-${i}`),
      pan: r("pan") < 0.5 ? -1 : 1,
    });
    z += 1.1 + r("gap") * 1.5;
    i++;
  }
  return shards;
};

export const makeSlabs = (): Slab[] => {
  const slabs: Slab[] = [];
  let id = 0;
  for (let row = 0; row < 60; row++) {
    const z = 1.2 + row * 1.05;
    const r = (k: string) => random(`slab-${row}-${k}`);
    // The path the walker follows, with the occasional missing slab.
    if (r("gap") > 0.12) {
      slabs.push({
        id: id++,
        x: (r("x") - 0.5) * 0.5,
        z: z + (r("z") - 0.5) * 0.2,
        width: 1.0 + r("w") * 0.45,
        length: 0.8 + r("l") * 0.2,
        yaw: (r("yaw") - 0.5) * 18,
        shade: 0.85 + r("shade") * 0.25,
      });
    }
    // Scattered slabs off to either side.
    for (const side of [-1, 1]) {
      if (r(`side${side}`) < 0.45) {
        slabs.push({
          id: id++,
          x: side * (1.5 + r(`sx${side}`) * 2.6),
          z: z + r(`sz${side}`) * 0.6,
          width: 0.9 + r(`sw${side}`) * 0.9,
          length: 0.6 + r(`sl${side}`) * 0.5,
          yaw: (r(`syaw${side}`) - 0.5) * 40,
          shade: 0.75 + r(`sshade${side}`) * 0.3,
        });
      }
    }
  }
  return slabs;
};

// Stars fill a box that wraps around the camera as it moves forward.
export const STAR_DEPTH = 90;

export const makeStars = (): Star[] =>
  new Array(900).fill(true).map((_, i) => {
    const r = (k: string) => random(`star-${i}-${k}`);
    const bokeh = r("bokeh") < 0.025;
    return {
      x: (r("x") - 0.5) * 90,
      y: (r("y") - 0.35) * 55,
      z: r("z") * STAR_DEPTH,
      radius: bokeh ? 0.05 + r("r") * 0.05 : 0.02 + r("r") ** 3 * 0.05,
      twinkle: r("t") * Math.PI * 2,
      bokeh,
    };
  });
