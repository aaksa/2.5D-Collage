import { Object3D, Vector3 } from "three";
import { StoryCardProps } from "../components/StoryCard";
import { Pose, PoseKey } from "../utils/keyframes";
import { MaskName } from "../utils/masks";

// "Now the Thief Speaks Our Tongue". A 54.65 s story told against the
// narration in public/audio/0926.mp3. All times are in seconds and follow
// the subtitle cues in public/audio/0926.srt.
//
// Composition: the rat walks the path. On his left, one framed photograph
// per line floats in along a lane beside the path, travelling like the
// paving slabs: it arrives from ahead, is presented beside him while its
// words are spoken, and drifts back and away. Photos alternate between a
// low and a high row so they never overlap, and each sits in its own shaped
// paper frame. The right of frame is kept for type.
//
// Act I (0-26 s): what the colonisers left.
// The break before the silence counts the years, 1945 to 2025.
// Act II (26.5-44 s): the same kinds of places, drained, muddied and
// sinking.
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

// ---- The lane --------------------------------------------------------------

// The lane moves at the rat's measured walking speed (set by the scene).
export const lane = { speed: 0.6 };

const RAD = Math.PI / 180;
const AXIS = new Vector3(Math.sin(HEADING * RAD), 0, -Math.cos(HEADING * RAD));
// "Left" of the path as seen from the camera, so the photos sit beside him
// on screen rather than hidden behind him.
const LEFT = new Vector3(-1, 0, -0.3).normalize();
const FEATURE_S = 0.4; // beside him, a step ahead
const CAMERA_HOME = new Vector3(0, 1.15, 5.8);

// Two rows, alternated line by line so neighbours never overlap.
const ROWS = {
  low: { lateral: 2.35, height: 0.15 },
  high: { lateral: 2.25, height: 1.42 },
};

// A photo is "pasted" a little ahead of him and resized up from its corner,
// stays selected while its line is spoken, then simply travels on with the
// paving until it has passed him.
const APPEAR = 1.2; // seconds before its moment
const RESIZE = 1.0; // seconds to grow to full size
const SELECTED = 1.5; // seconds after its moment the selection clears

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Moment = {
  feature: number; // seconds: presented beside him
  row: keyof typeof ROWS;
  size: number;
  tilt: number; // degrees
  // Act II decay, shown in the photograph itself rather than by tearing it.
  damage?: number;
  murk?: number;
  sink?: boolean; // slowly tilts and sinks away ("roboh")
};

const dummy = new Object3D();
const toCamera = new Vector3();
const pos = new Vector3();
const lookTarget = new Vector3();

// A long, soft landing, as when a handle is dragged and released.
const glide = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);

const momentPose = (m: Moment) => {
  const { lateral, height } = ROWS[m.row];
  return (sec: number, out: Pose): Pose => {
    // Exactly the paving's motion: straight along the path, constant speed.
    const s = FEATURE_S + lane.speed * (m.feature - sec);
    const t = sec - m.feature;
    const sinking = m.sink ? smooth(0.2, 3.4, t) : 0;
    pos
      .set(0, height - sinking * 1.1, 0)
      .addScaledVector(AXIS, s)
      .addScaledVector(LEFT, lateral);

    // Square to the viewer, like an image on a canvas.
    toCamera.copy(CAMERA_HOME).sub(pos).normalize();
    dummy.position.copy(pos);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(lookTarget.copy(pos).add(toCamera));
    dummy.rotateZ((sinking * 11 * Math.PI) / 180);

    const act =
      m.feature < BLACKOUT
        ? 1 - smooth(BLACKOUT - 0.6, BLACKOUT + 0.1, sec)
        : smooth(ACT_TWO - 0.2, ACT_TWO + 1.2, sec);
    const pasted = smooth(-APPEAR, -APPEAR + 0.2, t);
    const gone = smooth(-3.4, -2.2, s); // fades as it passes out of frame

    out.x = pos.x;
    out.y = pos.y;
    out.z = pos.z;
    out.rx = (dummy.rotation.x * 180) / Math.PI;
    out.ry = (dummy.rotation.y * 180) / Math.PI;
    out.rz = (dummy.rotation.z * 180) / Math.PI;
    out.s = m.size;
    out.grow = 0.32 + 0.68 * glide((t + APPEAR) / RESIZE);
    out.sel =
      smooth(-APPEAR, -APPEAR + 0.12, t) *
      (1 - smooth(SELECTED, SELECTED + 0.45, t)) *
      act;
    out.o = pasted * gone * (1 - sinking * 0.85) * act;
    out.damage = (m.damage ?? 0) * smooth(-1.0, 1.2, t);
    out.murk = (m.murk ?? 0) * smooth(-1.0, 1.4, t);
    return out;
  };
};

export type StoryCardSpec = Omit<StoryCardProps, "texture"> & {
  typeTexture?: string; // a canvas texture made at load time
};

// Plain photographs in colour: no frame, no cut shape.
const framed = (
  id: string,
  src: string,
  _mask: MaskName,
  moment: Moment,
  extra: Partial<StoryCardSpec> = {},
): StoryCardSpec => ({
  id,
  src,
  mask: "rect",
  treatment: "color",
  contrast: 1.08,
  brightness: -0.02,
  border: 0,
  roughness: 0,
  microMotion: 0.25,
  ...extra,
  poseAt: momentPose(moment),
});

const at = (
  feature: number,
  row: keyof typeof ROWS,
  size = 1.6,
  tilt = 0,
  decay: Partial<Moment> = {},
): Moment => ({ feature, row, size, tilt, ...decay });

export const storyCards: StoryCardSpec[] = [
  // Act I
  // "Belanda menjajah Indonesia"
  framed(
    "colonial",
    photo("colonial-facade"),
    "arch",
    at(1.5, "low", 1.75, -2),
  ),
  // "gunung masih utuh"
  framed(
    "mountain",
    photo("mountain-forest"),
    "hexagon",
    at(6.4, "high", 1.6, 3),
  ),
  // "samudra masih terbentang luas"
  framed("ocean", photo("ocean-waves"), "porthole", at(8.4, "low", 1.55, 0)),
  // "sungai-sungai jernih"
  framed("river", photo("river-bend"), "wedge", at(10.3, "high", 1.5, -3)),
  // "dia meninggalkan perkebunan yang terhampar"
  framed(
    "plantation",
    photo("tea-plantation"),
    "rect",
    at(12.5, "low", 1.7, 2),
  ),
  // "bangunan-bangunan yang indah"
  framed("beautiful", photo("cathedral"), "arch", at(14.7, "high", 1.6, -2)),
  // "gedung-gedung yang kokoh"
  framed("sturdy", photo("brick-building"), "ticket", at(16.4, "low", 1.55, 3)),
  // "jalan-jalan yang kuat"
  framed(
    "road",
    photo("road-straight"),
    "parallelogram",
    at(17.9, "high", 1.5, 0),
  ),
  // "jembatan kereta api yang kokoh"
  framed("bridge", photo("railway-bridge"), "rect", at(19.8, "low", 1.8, -2)),

  // Act II
  // "gunung gundul"
  framed(
    "bald",
    photo("barren-hills"),
    "hexagon",
    at(28.7, "high", 1.6, 3, { damage: 0.35 }),
  ),
  // "sungai keruh"
  framed(
    "murky",
    photo("industrial-river"),
    "wedge",
    at(30.7, "low", 1.55, -2, { murk: 0.9, damage: 0.3 }),
  ),
  // "Hutang menggunung"
  framed("debt", "", "ticket", at(32.6, "high", 1.45, 2), {
    typeTexture: "ledger",
    treatment: "mono",
    src: undefined,
  }),
  // "Bangunan bangunan"
  framed(
    "blocks",
    photo("apartment-blocks"),
    "notched",
    at(34.2, "low", 1.6, -3, { damage: 0.4 }),
  ),
  // "hampir tidak ada yang berkualitas"
  framed(
    "crowded",
    photo("crowded-street"),
    "trapezoid",
    at(35.9, "high", 1.5, 2, { damage: 0.5 }),
  ),
  // "Jalan jalan mudah rusak"
  framed(
    "broken-road",
    photo("road-straight"),
    "parallelogram",
    at(38.0, "high", 1.55, -2, { damage: 0.7 }),
  ),
  // "jembatan mudah roboh"
  framed(
    "fallen-bridge",
    photo("railway-bridge"),
    "rect",
    at(40.0, "low", 1.75, 1, { damage: 0.6, sink: true }),
  ),

  // "350 tahun": the number rises slowly into place on the right, where the
  // type lives, and fades the same way.
  numeral("type-350", 3.3, 5.2, 2.0, 1.25, -3.0, 2.3),
];

function numeral(
  id: string,
  from: number,
  until: number,
  x: number,
  y: number,
  z: number,
  s: number,
): StoryCardSpec {
  const keys: PoseKey[] = [
    { t: from - 0.8, x, y: y - 0.35, z, s, rz: 1.5, o: 0 },
    { t: from + 0.9, x, y, z, s, rz: 0, o: 1 },
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
}

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
