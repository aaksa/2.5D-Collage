import { random } from "remotion";
import { Object3D, Vector3 } from "three";
import { StoryCardProps } from "../components/StoryCard";
import { Pose, PoseKey } from "../utils/keyframes";

// "Now the Thief Speaks Our Tongue". A 54.65 s story told against the
// narration in public/audio/0926.mp3. All times are in seconds and follow
// the subtitle cues in public/audio/0926.srt.
//
// The photos ride a slow floating carousel around the rat: a ring turning
// around his walking line. They drift in from far ahead, pass beside him and
// slip away behind the camera, so the world keeps moving as he walks. Each
// photo is featured (larger, brighter, sharper) at the moment its line is
// spoken; the rest stay quiet.
//
// Act I (0-26 s): what the colonisers left.
// The silence at 26.0 s is a blackout; the carousel changes over.
// Act II (26.5-44 s): the same places come back, aged and breaking.
// Ending (45 s-): the camera comes round to the rat's face.

export const STORY_DURATION = 54.65;
export const BLACKOUT = 26.0;
export const ACT_TWO = 26.6;
export const FACE_AT = 45.0;
export const THIEF_LINE_AT = 48.6;

export const CHAPTERS = [
  { from: 0.6, to: 25.4, numeral: "I", title: "Warisan" },
  {
    from: 27.4,
    to: 43.6,
    numeral: "II",
    title: "Delapan puluh tahun kemudian",
  },
];

const photo = (name: string) => `story/${name}.jpg`;

// ---- The carousel -------------------------------------------------------

export const HEADING = 45; // the rat's walking direction, degrees
const AXIS = new Vector3(
  Math.sin((HEADING * Math.PI) / 180),
  0,
  -Math.cos((HEADING * Math.PI) / 180),
);
const UP = new Vector3(0, 1, 0);
const SIDE = new Vector3().crossVectors(AXIS, UP).normalize(); // camera-right
const ORIGIN = new Vector3(0, 0.3, 0); // the ring turns around his chest
const FLOW = 0.72; // world units per second: the ring glides past him
const SPIN = 2.6; // degrees per second: and turns, slowly
const FEATURE_S = 0.5; // how far ahead of him a featured card sits
const CAMERA_HOME = new Vector3(0, 1.15, 5.8);

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Orbit = {
  feature: number; // seconds: when it is beside him
  theta: number; // degrees around the ring at that moment; 0 = overhead
  radius: number;
  size: number;
  act: 1 | 2;
  emphasis: number; // 1 featured, 0 ambient
  damage?: number;
  murk?: number;
  tilt?: number;
};

const dummy = new Object3D();
const radial = new Vector3();
const toCamera = new Vector3();
const pos = new Vector3();
const lookTarget = new Vector3();

const orbitPose = (o: Orbit, seed: string) => {
  const phase = random(`${seed}-phase`) * Math.PI * 2;
  const tilt = o.tilt ?? (random(`${seed}-tilt`) - 0.5) * 22;
  return (sec: number, out: Pose): Pose => {
    const s = FEATURE_S + FLOW * (o.feature - sec);
    const theta = ((o.theta + SPIN * (sec - o.feature)) * Math.PI) / 180;
    radial
      .copy(UP)
      .multiplyScalar(Math.cos(theta))
      .addScaledVector(SIDE, Math.sin(theta));
    pos.copy(ORIGIN).addScaledVector(AXIS, s).addScaledVector(radial, o.radius);
    pos.y += 0.06 * Math.sin(sec * 0.45 + phase);

    // Face the viewer, leaning a little into the ring.
    toCamera
      .copy(CAMERA_HOME)
      .sub(pos)
      .normalize()
      .multiplyScalar(0.72)
      .addScaledVector(radial, -0.28);
    dummy.position.copy(pos);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(lookTarget.copy(pos).add(toCamera));
    dummy.rotateZ(((tilt + 2.5 * Math.sin(sec * 0.3 + phase)) * Math.PI) / 180);

    // Featured: a gentle swell in size and presence around its moment.
    const g = o.emphasis * Math.exp(-(((sec - o.feature) / 2.1) ** 2));
    const far = smooth(18, 12.5, s);
    const near = smooth(-2.6, -0.9, s);
    const act =
      o.act === 1
        ? 1 - smooth(BLACKOUT - 0.6, BLACKOUT + 0.1, sec)
        : smooth(ACT_TWO - 0.2, ACT_TWO + 1.4, sec);
    const recede = 1 - smooth(41.4, 44.4, sec);
    const presence = 0.6 + 0.4 * Math.max(g, 1 - o.emphasis * 0.9);

    out.x = pos.x;
    out.y = pos.y;
    out.z = pos.z;
    out.rx = (dummy.rotation.x * 180) / Math.PI;
    out.ry = (dummy.rotation.y * 180) / Math.PI;
    out.rz = (dummy.rotation.z * 180) / Math.PI;
    out.s = o.size * (1 + 0.26 * g);
    out.o = far * near * act * recede * presence;
    const age = o.act === 2 ? 0.3 : 0;
    const target = o.damage ?? age;
    out.damage =
      age + (target - age) * smooth(o.feature - 1.6, o.feature + 1.2, sec);
    out.murk = (o.murk ?? 0) * smooth(o.feature - 1.6, o.feature + 1.4, sec);
    return out;
  };
};

export type StoryCardSpec = Omit<StoryCardProps, "texture"> & {
  typeTexture?: string; // a canvas texture made at load time
};

type Feature = Omit<StoryCardSpec, "poseAt" | "keys"> & { orbit: Orbit };

const card = ({ orbit, ...rest }: Feature): StoryCardSpec => ({
  ...rest,
  poseAt: orbitPose(orbit, rest.id),
});

const f = (
  id: string,
  name: string,
  feature: number,
  theta: number,
  extra: Partial<Orbit> = {},
  look: Partial<StoryCardSpec> = {},
): StoryCardSpec =>
  card({
    id,
    src: photo(name),
    mask: "shard",
    ...look,
    orbit: {
      feature,
      theta,
      radius: 2.65,
      size: 1.7,
      act: feature < BLACKOUT ? 1 : 2,
      emphasis: 1,
      ...extra,
    },
  });

const print = { mask: "rect" as const, border: 0.032 };

const featured: StoryCardSpec[] = [
  // "Belanda menjajah Indonesia"
  f("colonial-facade", "colonial-facade", 1.2, 52, {}, print),
  f("colonial-street", "colonial-street", 2.1, -62, { radius: 2.9 }),
  // "gunung masih utuh"
  f(
    "mountain-forest",
    "mountain-forest",
    6.3,
    24,
    { size: 1.8 },
    { mask: "kite" },
  ),
  f("mountain-lake", "mountain-lake", 6.9, -74),
  // "samudra masih terbentang luas"
  f("ocean-waves", "ocean-waves", 8.1, 52, { size: 1.8 }, { mask: "sliver" }),
  f("ocean-horizon", "ocean-horizon", 8.8, -42, {}, print),
  // "sungai-sungai jernih"
  f("river-bend", "river-bend", 10.1, 34),
  f("river-clear", "river-clear", 10.6, -70, {}, { mask: "kite" }),
  // "dia meninggalkan perkebunan yang terhampar"
  f("tea-plantation", "tea-plantation", 12.2, 52, { size: 1.95 }, print),
  f("fields", "fields", 13.1, -50, {}, { mask: "sliver" }),
  // "bangunan-bangunan yang indah"
  f("cathedral", "cathedral", 14.6, 18, {}, { mask: "triangle" }),
  f("columns", "columns", 15.1, -74),
  // "gedung-gedung yang kokoh"
  f("brick-building", "brick-building", 16.4, 52, {}, print),
  // "jalan-jalan yang kuat"
  f("road-straight", "road-straight", 17.8, -56, {}, print),
  f("road-lights", "road-lights", 18.3, 52),
  // "jembatan kereta api yang kokoh"
  f("railway-bridge", "railway-bridge", 19.7, 16, { size: 2.1 }, print),
  f("elevated-train", "elevated-train", 20.4, -70, {}, { mask: "kite" }),

  // Act II. "gunung gundul"
  f(
    "mountain-burnt",
    "mountain-forest",
    28.6,
    30,
    { damage: 1, size: 1.8 },
    { mask: "kite" },
  ),
  f("barren-hills", "barren-hills", 29.2, -64, { damage: 0.45 }, print),
  // "sungai keruh"
  f("river-murky", "river-bend", 30.6, 52, { damage: 0.5, murk: 1 }),
  f("industrial-river", "industrial-river", 31.1, -46, { damage: 0.45 }),
  f(
    "smokestacks",
    "smokestacks",
    31.6,
    10,
    { damage: 0.45 },
    { mask: "triangle" },
  ),
  // "Bangunan bangunan" / "hampir tidak ada yang berkualitas"
  f(
    "apartment-blocks",
    "apartment-blocks",
    34.2,
    52,
    { damage: 0.6 },
    { ...print, crackAt: 35.7, fallAt: 36.9 },
  ),
  f(
    "crowded-street",
    "crowded-street",
    34.7,
    -60,
    { damage: 0.55 },
    { mask: "kite" },
  ),
  f(
    "brick-cracked",
    "brick-building",
    35.8,
    20,
    { damage: 0.8 },
    { ...print, crackAt: 36.3 },
  ),
  // "Jalan jalan mudah rusak"
  f(
    "road-broken",
    "road-straight",
    37.8,
    52,
    { damage: 0.85 },
    { ...print, crackAt: 38.2 },
  ),
  // "jembatan mudah roboh"
  f(
    "bridge-collapse",
    "railway-bridge",
    40.0,
    16,
    { damage: 0.8, size: 2.1 },
    { ...print, crackAt: 40.2, fallAt: 40.9 },
  ),
];

// Quieter cards that keep the ring full, all the way through.
const AMBIENT_ACT_ONE = [
  "colonial-street",
  "mountain-lake",
  "ocean-horizon",
  "river-clear",
  "fields",
  "columns",
  "road-lights",
  "elevated-train",
  "cathedral",
  "tea-plantation",
];
const AMBIENT_ACT_TWO = [
  "barren-hills",
  "industrial-river",
  "smokestacks",
  "apartment-blocks",
  "crowded-street",
  "brick-building",
  "road-straight",
  "colonial-facade",
];
const MASKS = ["shard", "kite", "sliver", "triangle", "rect"] as const;

const ambient: StoryCardSpec[] = new Array(34).fill(0).map((_, i) => {
  const r = (k: string) => random(`ambient-${i}-${k}`);
  const feature = -22 + i * 2.2 + r("t") * 1.2;
  const act: 1 | 2 = feature < BLACKOUT + 1 ? 1 : 2;
  const pool = act === 1 ? AMBIENT_ACT_ONE : AMBIENT_ACT_TWO;
  const mask = MASKS[Math.floor(r("m") * MASKS.length)];
  return card({
    id: `ambient-${i}`,
    src: photo(pool[i % pool.length]),
    mask,
    border: mask === "rect" ? 0.03 : 0,
    orbit: {
      feature,
      theta: -125 + r("theta") * 172,
      radius: 3.1 + r("radius") * 1.1,
      size: 1.0 + r("size") * 0.45,
      act,
      emphasis: 0,
      damage: act === 2 ? 0.45 : 0,
    },
  });
});

// "Hutang menggunung": ledger pages flood the ring, one after another on
// the beat (the track runs at about 103 BPM).
const BEAT = 60 / 103;
export const debtPile: StoryCardSpec[] = new Array(16).fill(0).map((_, i) =>
  card({
    id: `debt-${i}`,
    typeTexture: "ledger",
    treatment: "mono",
    contrast: 1.05,
    brightness: -0.1,
    roughness: 0.02,
    orbit: {
      feature: 32.1 + (i * BEAT) / 3,
      theta: -110 + ((i * 47) % 160),
      radius: 1.9 + (i % 4) * 0.35,
      size: 0.62,
      act: 2,
      emphasis: 0.6,
    },
  }),
);

// "350 tahun" and "80 tahun": the two numbers the story turns on. They
// rise slowly into place and fade the same way.
const numeral = (
  id: string,
  at: number,
  until: number,
  x: number,
  y: number,
  z: number,
  s: number,
): StoryCardSpec => {
  const keys: PoseKey[] = [
    { t: at - 0.8, x, y: y - 0.35, z, s, rz: 1.5, o: 0 },
    { t: at + 0.9, x, y, z, s, rz: 0, o: 1 },
    { t: until, x: x + 0.05, y: y + 0.12, z: z - 0.2, s, rz: -0.6, o: 1 },
    { t: until + 1.3, x: x + 0.08, y: y + 0.4, z: z - 0.6, s, rz: -1, o: 0 },
  ];
  return {
    id,
    typeTexture: id.replace("type-", ""),
    treatment: "color",
    contrast: 1,
    brightness: 0,
    useAlpha: true,
    depthOfField: 0.3,
    microMotion: 0.5,
    keys,
  };
};

export const storyCards: StoryCardSpec[] = [
  ...featured,
  ...ambient,
  numeral("type-350", 3.3, 5.2, 0.9, 1.35, -3.6, 2.6),
  numeral("type-80", 21.0, 24.8, 0.25, 1.65, -4.6, 3.4),
];

// Words set in colour (and in italic serif) in the subtitles.
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
