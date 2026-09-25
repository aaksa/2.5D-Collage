import { random } from "remotion";
import { Object3D, Vector3 } from "three";
import { StoryCardProps } from "../components/StoryCard";
import { Pose, PoseKey } from "../utils/keyframes";
import { MaskName } from "../utils/masks";

// "Now the Thief Speaks Our Tongue". A 54.65 s story told against the
// narration in public/audio/0926.mp3. All times are in seconds and follow
// the subtitle cues in public/audio/0926.srt.
//
// Composition: the rat walks the path; the photos ride a slow carousel on
// his LEFT only, a drum turning beside him that carries them from far behind
// the scene towards the lens as he walks. The right of frame is kept for
// type: captions, the "350" and the 1945-2025 year counter.
//
// Act I (0-26 s): what the colonisers left. Each photo is featured (larger,
// brighter, sharper) at the moment its line is spoken.
// The break before the silence counts the years, 1945 to 2025.
// Act II (26.5-44 s): the same places come back, aged and breaking.
// Ending (45 s-): the camera comes round to the rat's face.

export const STORY_DURATION = 54.65;
export const BLACKOUT = 26.0;
export const ACT_TWO = 26.6;
export const FACE_AT = 45.0;
export const THIEF_LINE_AT = 48.6;
export const HEADING = 45; // the rat's walking direction, degrees

// The year counter during the break.
export const YEARS = {
  from: 1945,
  to: 2025,
  start: 21.3,
  land: 24.7,
  until: 25.7,
};

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

// ---- The carousel: a drum turning on the rat's left -----------------------

const AXIS_X = -3.1; // the drum's axis runs front-to-back, left of the path
const AXIS_Y = 0.45;
const FLOW = 0.75; // world units per second towards the lens
const SPIN = 7; // degrees per second: the drum turns, slowly
const FEATURE_Z = -0.4; // beside the rat
const CAMERA_HOME = new Vector3(0, 1.15, 5.8);

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Orbit = {
  feature: number; // seconds: when it is beside him
  phi: number; // degrees round the drum then; 0 = the side facing the rat
  radius: number; // at most ~1.8, so it never crosses the path
  size: number;
  act: 1 | 2;
  emphasis: number; // 1 featured, 0 ambient
  damage?: number;
  murk?: number;
};

const dummy = new Object3D();
const toCamera = new Vector3();
const pos = new Vector3();
const lookTarget = new Vector3();

const orbitPose = (o: Orbit, seed: string) => {
  const phase = random(`${seed}-phase`) * Math.PI * 2;
  const tilt = (random(`${seed}-tilt`) - 0.5) * 16;
  return (sec: number, out: Pose): Pose => {
    const z = FEATURE_Z + FLOW * (sec - o.feature);
    const phi = ((o.phi + SPIN * (sec - o.feature)) * Math.PI) / 180;
    pos.set(
      AXIS_X + Math.cos(phi) * o.radius,
      AXIS_Y +
        Math.sin(phi) * o.radius * 0.95 +
        0.05 * Math.sin(sec * 0.45 + phase),
      z + 0.35 * Math.sin(phi),
    );

    // Face the viewer, turned a touch towards the rat.
    toCamera.copy(CAMERA_HOME).sub(pos).normalize();
    toCamera.x += 0.18;
    dummy.position.copy(pos);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(lookTarget.copy(pos).add(toCamera));
    dummy.rotateZ(((tilt + 2.5 * Math.sin(sec * 0.3 + phase)) * Math.PI) / 180);

    // Featured: a gentle swell in size and presence around its moment.
    const g = o.emphasis * Math.exp(-(((sec - o.feature) / 2.1) ** 2));
    const far = smooth(-15, -10, z);
    const near = 1 - smooth(1.4, 2.8, z);
    const act =
      o.act === 1
        ? 1 - smooth(BLACKOUT - 0.6, BLACKOUT + 0.1, sec)
        : smooth(ACT_TWO - 0.2, ACT_TWO + 1.4, sec);
    const recede = 1 - smooth(41.4, 44.4, sec);
    const presence = 0.62 + 0.38 * Math.max(g, 1 - o.emphasis * 0.9);

    out.x = pos.x;
    out.y = pos.y;
    out.z = pos.z;
    out.rx = (dummy.rotation.x * 180) / Math.PI;
    out.ry = (dummy.rotation.y * 180) / Math.PI;
    out.rz = (dummy.rotation.z * 180) / Math.PI;
    out.s = o.size * (1 + 0.26 * g);
    out.o = far * near * act * recede * presence;
    const age = o.act === 2 ? 0.25 : 0;
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

// Photos keep their colour, with a little extra contrast.
const COLOUR = {
  treatment: "color" as const,
  contrast: 1.12,
  brightness: -0.03,
};
const PRINT = { mask: "rect" as MaskName, border: 0.032 };

const f = (
  id: string,
  name: string,
  feature: number,
  phi: number,
  mask: MaskName,
  extra: Partial<Orbit> = {},
  look: Partial<StoryCardSpec> = {},
): StoryCardSpec =>
  card({
    id,
    src: photo(name),
    mask,
    ...COLOUR,
    ...look,
    orbit: {
      feature,
      phi,
      radius: 1.6,
      size: 1.55,
      act: feature < BLACKOUT ? 1 : 2,
      emphasis: 1,
      ...extra,
    },
  });

const featured: StoryCardSpec[] = [
  // "Belanda menjajah Indonesia"
  f("colonial-facade", "colonial-facade", 1.2, 22, "arch", { size: 1.75 }),
  f("colonial-street", "colonial-street", 2.1, -32, "ticket", { radius: 1.75 }),
  // "gunung masih utuh"
  f("mountain-forest", "mountain-forest", 6.3, 28, "hexagon", { size: 1.7 }),
  f("mountain-lake", "mountain-lake", 6.9, -30, "wedge"),
  // "samudra masih terbentang luas"
  f("ocean-waves", "ocean-waves", 8.1, 20, "porthole", { size: 1.6 }),
  f("ocean-horizon", "ocean-horizon", 8.8, -36, "parallelogram"),
  // "sungai-sungai jernih"
  f("river-bend", "river-bend", 10.1, 26, "chevron"),
  f("river-clear", "river-clear", 10.6, -28, "notched"),
  // "dia meninggalkan perkebunan yang terhampar"
  f("tea-plantation", "tea-plantation", 12.2, 18, "rect", { size: 1.8 }, PRINT),
  f("fields", "fields", 13.1, -34, "trapezoid"),
  // "bangunan-bangunan yang indah"
  f("cathedral", "cathedral", 14.6, 24, "arch", { size: 1.7 }),
  f("columns", "columns", 15.1, -30, "parallelogram"),
  // "gedung-gedung yang kokoh"
  f("brick-building", "brick-building", 16.4, 20, "ticket", { size: 1.65 }),
  // "jalan-jalan yang kuat"
  f("road-straight", "road-straight", 17.8, -26, "wedge"),
  f("road-lights", "road-lights", 18.3, 30, "hexagon"),
  // "jembatan kereta api yang kokoh"
  f("railway-bridge", "railway-bridge", 19.7, 16, "rect", { size: 1.9 }, PRINT),
  f("elevated-train", "elevated-train", 20.4, -32, "porthole"),

  // Act II. "gunung gundul"
  f("mountain-burnt", "mountain-forest", 28.6, 24, "hexagon", {
    damage: 1,
    size: 1.7,
  }),
  f("barren-hills", "barren-hills", 29.2, -32, "notched", { damage: 0.4 }),
  // "sungai keruh"
  f("river-murky", "river-bend", 30.6, 22, "chevron", { damage: 0.5, murk: 1 }),
  f("industrial-river", "industrial-river", 31.1, -34, "parallelogram", {
    damage: 0.4,
  }),
  f("smokestacks", "smokestacks", 31.6, 48, "arch", { damage: 0.4 }),
  // "Bangunan bangunan" / "hampir tidak ada yang berkualitas"
  f(
    "apartment-blocks",
    "apartment-blocks",
    34.2,
    20,
    "rect",
    { damage: 0.6 },
    { ...PRINT, crackAt: 35.7, fallAt: 36.9 },
  ),
  f("crowded-street", "crowded-street", 34.7, -30, "trapezoid", {
    damage: 0.5,
  }),
  f(
    "brick-cracked",
    "brick-building",
    35.8,
    34,
    "rect",
    { damage: 0.8 },
    { ...PRINT, crackAt: 36.3 },
  ),
  // "Jalan jalan mudah rusak"
  f(
    "road-broken",
    "road-straight",
    37.8,
    18,
    "rect",
    { damage: 0.85 },
    { ...PRINT, crackAt: 38.2 },
  ),
  // "jembatan mudah roboh"
  f(
    "bridge-collapse",
    "railway-bridge",
    40.0,
    16,
    "rect",
    { damage: 0.8, size: 1.95 },
    { ...PRINT, crackAt: 40.2, fallAt: 40.9 },
  ),
];

// Quieter cards that keep the drum full, all the way through.
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
const SHAPES: MaskName[] = [
  "arch",
  "porthole",
  "hexagon",
  "ticket",
  "notched",
  "chevron",
  "trapezoid",
  "parallelogram",
  "wedge",
  "shard",
  "kite",
];

const ambient: StoryCardSpec[] = new Array(30).fill(0).map((_, i) => {
  const r = (k: string) => random(`ambient-${i}-${k}`);
  const feature = -20 + i * 2.5 + r("t") * 1.2;
  const act: 1 | 2 = feature < BLACKOUT + 1 ? 1 : 2;
  const pool = act === 1 ? AMBIENT_ACT_ONE : AMBIENT_ACT_TWO;
  return card({
    id: `ambient-${i}`,
    src: photo(pool[i % pool.length]),
    mask: SHAPES[i % SHAPES.length],
    ...COLOUR,
    orbit: {
      feature,
      phi: r("phi") * 360,
      radius: 0.9 + r("radius") * 0.9,
      size: 0.85 + r("size") * 0.45,
      act,
      emphasis: 0,
      damage: act === 2 ? 0.4 : 0,
    },
  });
});

// "Hutang menggunung": ledger pages flood the drum, one after another on
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
      phi: -80 + ((i * 47) % 200),
      radius: 0.7 + (i % 4) * 0.3,
      size: 0.6,
      act: 2,
      emphasis: 0.6,
    },
  }),
);

// "350 tahun": the number rises slowly into place on the right, where the
// type lives, and fades the same way.
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
  numeral("type-350", 3.3, 5.2, 2.0, 1.25, -3.0, 2.3),
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
