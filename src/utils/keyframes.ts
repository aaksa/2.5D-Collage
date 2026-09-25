import { curve, Key } from "./easing";

// A card's state at a moment in the story. Times are in seconds.
export type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number; // degrees
  ry: number;
  rz: number;
  s: number; // card height, world units
  o: number; // opacity
  damage: number; // 0 pristine .. 1 ruined
  murk: number; // 0 clear .. 1 muddy
};

export type PoseKey = { t: number } & Partial<Pose>;

const DEFAULTS: Pose = {
  x: 0,
  y: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  s: 1,
  o: 1,
  damage: 0,
  murk: 0,
};

const PROPS = Object.keys(DEFAULTS) as (keyof Pose)[];

// Each property is its own smooth curve through the keys that mention it,
// so a key can move a card without touching its opacity, and so on. Keys
// that repeat a value make a hold; the curves ease in and out of holds.
export const compileKeys = (keys: PoseKey[]) => {
  const sorted = [...keys].sort((a, b) => a.t - b.t);
  const tracks = new Map<keyof Pose, Key[]>();
  for (const prop of PROPS) {
    const track = sorted
      .filter((k) => k[prop] !== undefined)
      .map((k) => [k.t, k[prop] as number] as const);
    tracks.set(prop, track);
  }
  return (t: number, out: Pose): Pose => {
    for (const prop of PROPS) {
      const track = tracks.get(prop)!;
      out[prop] = track.length ? curve(t, track) : DEFAULTS[prop];
    }
    return out;
  };
};

export const emptyPose = (): Pose => ({ ...DEFAULTS });
