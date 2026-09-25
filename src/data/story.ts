import { StoryCardProps } from "../components/StoryCard";
import { PoseKey } from "../utils/keyframes";

// "Now the Thief Speaks Our Tongue". A 54.65 s story told against the
// narration in public/audio/0926.mp3. All times are in seconds and follow
// the subtitle cues in public/audio/0926.srt.
//
// Act I (0-26 s): what the colonisers left. Each photo flies in on its line,
//   is presented beside the rat, then settles into a growing collage.
// The silence at 26.0 s is a blackout.
// Act II (26.5-45 s): the same photos come forward to decay: burnt, muddied,
//   cracked, falling.
// Ending (45 s-): the camera comes round to the rat's face.

export const STORY_DURATION = 54.65;
export const BLACKOUT = 26.0;
export const ACT_TWO = 26.6;
export const FACE_AT = 45.0;
export const THIEF_LINE_AT = 48.6;

const photo = (name: string) => `story/${name}.jpg`;

type Slot = {
  x: number;
  y: number;
  z: number;
  s: number;
  rx?: number;
  ry?: number;
  rz?: number;
};

// Where a photo is presented while its line is spoken.
const HERO = {
  left: { x: -2.35, y: 0.5, z: -0.6, s: 1.7, ry: 14, rz: 7 },
  right: { x: 2.4, y: 0.72, z: -0.9, s: 1.8, ry: -16, rz: -8 },
  top: { x: 0.7, y: 2.05, z: -2.3, s: 1.9, rz: -5 },
  wide: { x: -0.4, y: 2.3, z: -3.2, s: 2.2, rz: 3 },
} satisfies Record<string, Slot>;

// The collage wall the photos settle into, well behind the rat.
const WALL: Slot[] = [
  { x: -5.2, y: 2.6, z: -6, s: 2.2, rz: 12, ry: 10 },
  { x: 3.9, y: 3.2, z: -6.8, s: 2.4, rz: -12, ry: -8 },
  { x: -2.6, y: 3.7, z: -7.5, s: 2.4, rz: -8 },
  { x: 0.9, y: 4.0, z: -8.2, s: 2.3, rz: 6 },
  { x: 6.4, y: 1.5, z: -7.2, s: 2.2, rz: 9, ry: -12 },
  { x: -6.8, y: 0.1, z: -7.5, s: 2.4, rz: -6, ry: 14 },
  { x: 6.8, y: -1.5, z: -8, s: 2.2, rz: -10 },
  { x: -4.6, y: -1.7, z: -5.6, s: 1.9, rz: 14, ry: 8 },
  { x: 4.3, y: -0.5, z: -5.2, s: 2.0, rz: 5, ry: -10 },
  { x: -1.5, y: 2.1, z: -9.6, s: 2.2, rz: -14 },
  { x: 2.7, y: 1.7, z: -10, s: 2.3, rz: 11 },
  { x: -8, y: 3.8, z: -10, s: 2.5, rz: 8 },
  { x: 8.6, y: 3.9, z: -10.5, s: 2.4, rz: -7 },
  { x: -9.4, y: -2.2, z: -9.8, s: 2.3, rz: -9 },
  { x: 9.6, y: -3, z: -9.5, s: 2.1, rz: 12 },
  { x: 0.4, y: -3.4, z: -9, s: 2.2, rz: -4 },
];

const pose = (slot: Slot, extra: Partial<PoseKey> = {}) => ({
  x: slot.x,
  y: slot.y,
  z: slot.z,
  s: slot.s,
  rx: slot.rx ?? 0,
  ry: slot.ry ?? 0,
  rz: slot.rz ?? 0,
  ...extra,
});

const drift = (slot: Slot, k: number): Slot => ({
  ...slot,
  x: slot.x + 0.08 * k,
  y: slot.y + 0.05 * k,
  rz: (slot.rz ?? 0) + 1.6 * k,
});

type Journey = {
  arrive: number; // lands in its hero slot
  hero: Slot;
  rest: number; // leaves for the wall
  wall: Slot;
  // Act II: comes forward again to decay.
  decay?: {
    at: number;
    hero: Slot;
    damage?: number;
    murk?: number;
    leave?: number; // drifts back out after its line
  };
};

// One photo's whole path through the film as keyframes.
const journey = (j: Journey): PoseKey[] => {
  const deep: Slot = {
    ...j.hero,
    x: j.hero.x * 1.9,
    y: j.hero.y + 1.4,
    z: j.hero.z - 15,
    rz: (j.hero.rz ?? 0) + 28,
    ry: (j.hero.ry ?? 0) - 20,
  };
  const keys: PoseKey[] = [
    { t: j.arrive - 1.0, ...pose(deep), o: 0, damage: 0, murk: 0 },
    { t: j.arrive - 0.45, o: 1 },
    { t: j.arrive, ...pose(j.hero) },
    { t: j.rest, ...pose(drift(j.hero, 1)) },
    { t: j.rest + 1.1, ...pose(j.wall) },
    { t: BLACKOUT - 0.4, ...pose(drift(j.wall, 1)), damage: 0 },
    // Eighty years later: everything has aged a little.
    {
      t: ACT_TWO,
      ...pose(drift(j.wall, -1), { z: j.wall.z - 0.6 }),
      damage: 0.3,
    },
  ];
  if (j.decay) {
    const d = j.decay;
    keys.push(
      { t: d.at - 0.9, ...pose(drift(j.wall, -1), { z: j.wall.z - 0.6 }) },
      { t: d.at, ...pose(d.hero), damage: 0.35, murk: 0 },
      {
        t: d.at + 1.3,
        ...pose(drift(d.hero, 1)),
        damage: d.damage ?? 0.9,
        murk: d.murk ?? 0,
      },
    );
    if (d.leave) {
      keys.push(
        { t: d.leave, ...pose(drift(d.hero, 1.4)) },
        {
          t: d.leave + 1.4,
          ...pose(drift(j.wall, -2), { z: j.wall.z - 2.5 }),
          o: 0.55,
        },
      );
    }
  }
  // "Pertanyaannya adalah": the world recedes and dims.
  keys.push(
    { t: 41.4, o: j.decay?.leave || !j.decay ? 0.55 : 1 },
    { t: 43.4, o: 0.18 },
    { t: FACE_AT + 1.2, o: 0 },
  );
  return keys;
};

// A photo that only arrives in Act II.
const arrival = (
  at: number,
  hero: Slot,
  leave: number,
  damage = 0.6,
): PoseKey[] => [
  {
    t: at - 1.0,
    ...pose({
      ...hero,
      x: hero.x * 1.9,
      y: hero.y - 1.6,
      z: hero.z - 14,
      rz: (hero.rz ?? 0) - 30,
    }),
    o: 0,
    damage,
  },
  { t: at - 0.45, o: 1 },
  { t: at, ...pose(hero) },
  { t: leave, ...pose(drift(hero, 1)) },
  {
    t: leave + 1.5,
    ...pose({ ...hero, x: hero.x * 1.6, y: hero.y + 0.8, z: hero.z - 6 }),
    o: 0.4,
  },
  { t: 43.4, o: 0.15 },
  { t: FACE_AT + 1.2, o: 0 },
];

export type StoryCardSpec = Omit<StoryCardProps, "texture"> & {
  typeTexture?: string; // a canvas texture made at load time
};

export const storyCards: StoryCardSpec[] = [
  // "Belanda menjajah Indonesia"
  {
    id: "colonial-facade",
    src: photo("colonial-facade"),
    border: 0.035,
    keys: journey({ arrive: 0.4, hero: HERO.right, rest: 5.1, wall: WALL[0] }),
  },
  {
    id: "colonial-street",
    src: photo("colonial-street"),
    mask: "shard",
    keys: journey({ arrive: 1.1, hero: HERO.left, rest: 5.4, wall: WALL[5] }),
  },
  // "gunung masih utuh"
  {
    id: "mountain-forest",
    src: photo("mountain-forest"),
    mask: "kite",
    keys: journey({
      arrive: 5.6,
      hero: HERO.top,
      rest: 7.3,
      wall: WALL[3],
      decay: { at: 28.0, hero: HERO.top, damage: 1, leave: 30.0 },
    }),
  },
  {
    id: "mountain-lake",
    src: photo("mountain-lake"),
    mask: "shard",
    keys: journey({ arrive: 6.0, hero: HERO.right, rest: 7.5, wall: WALL[1] }),
  },
  // "samudra masih terbentang luas"
  {
    id: "ocean-waves",
    src: photo("ocean-waves"),
    mask: "sliver",
    keys: journey({
      arrive: 7.4,
      hero: { ...HERO.left, s: 1.9 },
      rest: 9.5,
      wall: WALL[7],
    }),
  },
  {
    id: "ocean-horizon",
    src: photo("ocean-horizon"),
    border: 0.03,
    keys: journey({
      arrive: 7.8,
      hero: { ...HERO.right, s: 1.6, x: 2.7 },
      rest: 9.7,
      wall: WALL[6],
    }),
  },
  // "sungai-sungai jernih"
  {
    id: "river-bend",
    src: photo("river-bend"),
    mask: "shard",
    keys: journey({
      arrive: 9.6,
      hero: HERO.top,
      rest: 11.2,
      wall: WALL[9],
      decay: { at: 29.9, hero: HERO.left, damage: 0.55, murk: 1, leave: 31.9 },
    }),
  },
  {
    id: "river-clear",
    src: photo("river-clear"),
    mask: "kite",
    keys: journey({ arrive: 10.0, hero: HERO.left, rest: 11.4, wall: WALL[8] }),
  },
  // "dia meninggalkan perkebunan yang terhampar"
  {
    id: "tea-plantation",
    src: photo("tea-plantation"),
    border: 0.03,
    keys: journey({
      arrive: 11.3,
      hero: { ...HERO.right, s: 2.0 },
      rest: 13.9,
      wall: WALL[4],
    }),
  },
  {
    id: "fields",
    src: photo("fields"),
    mask: "sliver",
    keys: journey({
      arrive: 11.9,
      hero: HERO.left,
      rest: 14.1,
      wall: WALL[13],
    }),
  },
  // "bangunan-bangunan yang indah"
  {
    id: "cathedral",
    src: photo("cathedral"),
    mask: "triangle",
    keys: journey({ arrive: 14.0, hero: HERO.top, rest: 15.7, wall: WALL[2] }),
  },
  {
    id: "columns",
    src: photo("columns"),
    mask: "shard",
    keys: journey({
      arrive: 14.4,
      hero: HERO.left,
      rest: 15.9,
      wall: WALL[11],
    }),
  },
  // "gedung-gedung yang kokoh"
  {
    id: "brick-building",
    src: photo("brick-building"),
    border: 0.035,
    crackAt: 35.6,
    keys: journey({
      arrive: 15.7,
      hero: HERO.right,
      rest: 17.3,
      wall: WALL[10],
      decay: { at: 34.9, hero: HERO.top, damage: 0.8, leave: 37.0 },
    }),
  },
  // "jalan-jalan yang kuat"
  {
    id: "road-straight",
    src: photo("road-straight"),
    border: 0.03,
    crackAt: 37.7,
    keys: journey({
      arrive: 17.4,
      hero: HERO.left,
      rest: 18.8,
      wall: WALL[15],
      decay: { at: 37.1, hero: HERO.right, damage: 0.85, leave: 39.1 },
    }),
  },
  {
    id: "road-lights",
    src: photo("road-lights"),
    mask: "shard",
    keys: journey({
      arrive: 17.7,
      hero: HERO.right,
      rest: 19.0,
      wall: WALL[14],
    }),
  },
  // "jembatan kereta api yang kokoh"
  {
    id: "railway-bridge",
    src: photo("railway-bridge"),
    border: 0.03,
    crackAt: 40.1,
    fallAt: 40.5,
    keys: journey({
      arrive: 18.9,
      hero: { ...HERO.wide, s: 2.3 },
      rest: 21.1,
      wall: WALL[12],
      decay: { at: 39.3, hero: HERO.top, damage: 0.8 },
    }),
  },
  {
    id: "elevated-train",
    src: photo("elevated-train"),
    mask: "kite",
    keys: journey({
      arrive: 19.7,
      hero: HERO.right,
      rest: 21.3,
      wall: WALL[2],
    }),
  },

  // "350 tahun" and "80 tahun": the two numbers the story turns on.
  {
    id: "type-350",
    typeTexture: "350",
    treatment: "color",
    contrast: 1,
    brightness: 0,
    useAlpha: true,
    depthOfField: 0.3,
    microMotion: 0.5,
    keys: [
      { t: 2.9, x: 1.2, y: 1.2, z: -8, s: 2.2, rz: 4, o: 0 },
      { t: 3.35, x: 0.9, y: 1.3, z: -3.6, s: 2.6, rz: 0, o: 1 },
      { t: 4.9, x: 0.8, y: 1.35, z: -3.3, s: 2.6, rz: -1 },
      { t: 5.6, x: 1.6, y: 2.4, z: -11, s: 2.2, rz: -8, o: 0 },
    ],
  },
  {
    id: "type-80",
    typeTexture: "80",
    treatment: "color",
    contrast: 1,
    brightness: 0,
    useAlpha: true,
    depthOfField: 0.3,
    microMotion: 0.5,
    keys: [
      { t: 20.6, x: 0.3, y: 1.4, z: -9, s: 2.6, rz: -3, o: 0 },
      { t: 21.1, x: 0.2, y: 1.6, z: -4.2, s: 3.4, rz: 0, o: 1 },
      { t: 25.6, x: 0.25, y: 1.7, z: -4.6, s: 3.4, rz: 1.5 },
      { t: BLACKOUT, x: 0.25, y: 1.7, z: -4.6, s: 3.4, o: 0 },
    ],
  },

  // Act II arrivals: what replaced them.
  {
    id: "barren-hills",
    src: photo("barren-hills"),
    border: 0.03,
    keys: arrival(28.4, HERO.right, 30.0, 0.35),
  },
  {
    id: "industrial-river",
    src: photo("industrial-river"),
    mask: "shard",
    keys: arrival(30.3, HERO.right, 31.9, 0.4),
  },
  {
    id: "smokestacks",
    src: photo("smokestacks"),
    mask: "triangle",
    keys: arrival(30.7, HERO.top, 31.9, 0.4),
  },
  {
    id: "apartment-blocks",
    src: photo("apartment-blocks"),
    border: 0.03,
    crackAt: 35.3,
    fallAt: 36.3,
    keys: arrival(33.5, HERO.left, 36.8, 0.5),
  },
  {
    id: "crowded-street",
    src: photo("crowded-street"),
    mask: "kite",
    keys: arrival(33.9, HERO.right, 36.8, 0.5),
  },
];

// "Hutang menggunung": ledger pages pile up into a mountain, one per beat
// (the track runs at about 103 BPM).
const BEAT = 60 / 103;
export const debtPile: StoryCardSpec[] = new Array(13).fill(0).map((_, i) => {
  // A rough pyramid: rows of 5, 4, 3, 1.
  const rows = [5, 4, 3, 1];
  let row = 0;
  let k = i;
  while (k >= rows[row]) {
    k -= rows[row];
    row++;
  }
  const n = rows[row];
  const x = 2.0 + (k - (n - 1) / 2) * 0.5 + (row % 2) * 0.1;
  const y = -0.45 + row * 0.44;
  const at = 31.95 + (i * BEAT) / 4;
  const rz = ((i * 37) % 23) - 11;
  return {
    id: `debt-${i}`,
    typeTexture: "ledger",
    treatment: "mono",
    contrast: 1.1,
    brightness: -0.08,
    roughness: 0.02,
    microMotion: 0.4,
    keys: [
      {
        t: at - 0.5,
        x: x + 0.6,
        y: y + 3.2,
        z: -1.3 - row * 0.1,
        s: 0.62,
        rz: rz + 40,
        o: 0,
      },
      { t: at - 0.25, o: 1 },
      { t: at, x, y, z: -1.3 - row * 0.1, s: 0.62, rz },
      { t: 33.6, x, y, z: -1.3 - row * 0.1, s: 0.62, rz, damage: 0 },
      {
        t: 35.0,
        x: x + 0.3,
        y: y + 0.2,
        z: -3.5,
        s: 0.62,
        rz: rz * 1.4,
        o: 0.55,
        damage: 0.4,
      },
      { t: 43.4, o: 0.15 },
      { t: FACE_AT, o: 0 },
    ],
  };
});

// Words to set in colour in the subtitles.
export const EMPHASIS: Record<string, "highlight" | "accent"> = {
  "350": "highlight",
  tahun: "highlight",
  "80": "highlight",
  merdeka: "highlight",
  gundul: "accent",
  keruh: "accent",
  hutang: "accent",
  menggunung: "accent",
  rusak: "accent",
  roboh: "accent",
  berkualitas: "accent",
  penjajah: "accent",
};
