import { random } from "remotion";
import { DIRECTION, DURATION, FPS, Vec3, cameraAt, walkerAt } from "./camera";

// Everything is generated from fixed seeds, so every render is identical.

export type Card = {
  id: number;
  center: Vec3;
  width: number; // metres
  height: number;
  roll: number; // in-plane rotation, degrees
  yaw: number; // turn away from the camera, degrees
  photo: number;
  clip: string | null; // torn-edge polygon, or null for a clean print
  phase: number;
};

export type Slab = { id: number; corners: Vec3[]; shade: number };

export type Mote = {
  position: Vec3;
  size: number; // metres
  phase: number;
  warm: boolean;
};

const pct = (n: number) => `${n.toFixed(1)}%`;

// Torn-paper shards: skewed quads, kites and the odd triangle.
const shardClip = (seed: string): string => {
  const r = (k: string) => random(`${seed}-${k}`);
  const kind = r("kind");
  if (kind < 0.15) {
    return `polygon(${pct(r("a") * 25)} 100%, ${pct(40 + r("b") * 25)} 0%, 100% ${pct(72 + r("c") * 28)})`;
  }
  if (kind < 0.35) {
    return `polygon(${pct(40 + r("a") * 20)} 0%, 100% ${pct(35 + r("b") * 25)}, ${pct(45 + r("c") * 20)} 100%, 0% ${pct(40 + r("d") * 25)})`;
  }
  return `polygon(${pct(r("a") * 16)} ${pct(r("b") * 14)}, ${pct(100 - r("c") * 10)} ${pct(r("d") * 20)}, ${pct(100 - r("e") * 16)} ${pct(100 - r("f") * 10)}, ${pct(r("g") * 8)} ${pct(100 - r("h") * 22)})`;
};

// Perpendicular distance from the walker's line on the ground.
const offPath = (x: number, z: number) =>
  Math.abs(x * DIRECTION.z - z * DIRECTION.x);

export const makeCards = (photoCount: number): Card[] => {
  const start = cameraAt(0);
  const end = cameraAt(DURATION);
  const cards: Card[] = [];
  let attempt = 0;
  while (cards.length < 64 && attempt < 4000) {
    const r = (k: string) => random(`card-${attempt}-${k}`);
    attempt++;
    const x = start.x - 7 + r("x") * (end.x - start.x + 22);
    const z = end.z + 0.9 + r("z") ** 1.4 * 24;
    const width = 0.9 + r("w") * 1.9;
    const height = width * (0.6 + r("h") * 0.45);
    const y = 0.25 + height / 2 + r("y") ** 1.5 * 3.6;

    // Keep the path and the walker's body clear, and nothing right
    // against the lens.
    if (offPath(x, z) < 0.9 + width / 2 && y - height / 2 < 2.3) continue;
    if (z - end.z < 1.1) continue;

    cards.push({
      id: cards.length,
      center: { x, y, z },
      width,
      height,
      roll: (r("roll") - 0.5) * 56,
      yaw: (r("yaw") - 0.5) * 50,
      photo: cards.length % photoCount,
      clip: r("clip") < 0.72 ? shardClip(`card-${attempt}`) : null,
      phase: r("phase") * Math.PI * 2,
    });
  }
  // A few prints hang right in front of the lens: as the camera trucks past
  // they sweep across frame, big and out of focus.
  [3.2, 6.8, 10.2, 13.4].forEach((seconds, i) => {
    const r = (k: string) => random(`fg-${i}-${k}`);
    const cam = cameraAt(seconds * FPS);
    const width = 0.7 + r("w") * 0.3;
    cards.push({
      id: cards.length,
      center: {
        x: cam.x,
        y: i % 2 === 0 ? 0.35 + r("y") * 0.2 : 2.05 + r("y") * 0.2,
        z: cam.z + 1.35 + r("z") * 0.3,
      },
      width,
      height: width * 0.72,
      roll: (r("roll") - 0.5) * 40,
      yaw: (r("yaw") - 0.5) * 30,
      photo: (cards.length * 7) % photoCount,
      clip: r("clip") < 0.5 ? shardClip(`fg-${i}`) : null,
      phase: r("phase") * Math.PI * 2,
    });
  });
  return cards;
};

// A single line of paving slabs along the walker's route.
export const makeSlabs = (): Slab[] => {
  const slabs: Slab[] = [];
  const along = { x: DIRECTION.x, z: DIRECTION.z };
  const across = { x: DIRECTION.z, z: -DIRECTION.x };
  const length = 0.82;
  const gap = 0.07;
  for (let i = -8; i < 40; i++) {
    const r = (k: string) => random(`slab-${i}-${k}`);
    const s = i * (length + gap);
    const lateral = (r("l") - 0.5) * 0.08;
    const yaw = ((r("yaw") - 0.5) * 7 * Math.PI) / 180;
    const width = 0.78 + r("w") * 0.08;
    // Turn each slab a touch for a hand-laid look.
    const a = {
      x: along.x * Math.cos(yaw) + across.x * Math.sin(yaw),
      z: along.z * Math.cos(yaw) + across.z * Math.sin(yaw),
    };
    const b = {
      x: across.x * Math.cos(yaw) - along.x * Math.sin(yaw),
      z: across.z * Math.cos(yaw) - along.z * Math.sin(yaw),
    };
    const cx = along.x * s + across.x * lateral;
    const cz = along.z * s + across.z * lateral;
    const corner = (u: number, v: number): Vec3 => ({
      x: cx + a.x * u * (length / 2) + b.x * v * (width / 2),
      y: 0,
      z: cz + a.z * u * (length / 2) + b.z * v * (width / 2),
    });
    slabs.push({
      id: i,
      corners: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
      shade: 0.88 + r("shade") * 0.16,
    });
  }
  return slabs;
};

// Dust hanging in the air around the route. Positive lateral is beyond the
// path, negative is between the path and the camera.
export const makeMotes = (): Mote[] => {
  const origin = walkerAt(0);
  return new Array(340).fill(true).map((_, i) => {
    const r = (k: string) => random(`mote-${i}-${k}`);
    const along = -4 + r("s") * 22;
    const lateral = -3 + r("l") * 16;
    return {
      position: {
        x: origin.x + DIRECTION.x * along - DIRECTION.z * lateral,
        y: -0.5 + r("y") * 5,
        z: origin.z + DIRECTION.z * along + DIRECTION.x * lateral,
      },
      size: 0.006 + r("size") ** 4 * 0.03,
      phase: r("phase") * Math.PI * 2,
      warm: r("warm") < 0.3,
    };
  });
};
