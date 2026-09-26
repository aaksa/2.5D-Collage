import { Object3D, Vector3 } from "three";
import { StoryCardProps } from "../components/StoryCard";
import { Pose } from "../utils/keyframes";
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

// One stream. Every photo follows the same line: from far down the path,
// above and a little right of its far end, to its place beside him on the
// left. ("low" and "high" are kept as names for the story list below.)
const STREAM = {
  lateral: 2.8,
  height: 0.75,
  farLateral: -0.7,
  farHeight: 1.7,
};
// Distance over which the stream runs from beside him to its far end.
const STREAM_REACH = 32;
const ROWS = { low: STREAM, high: STREAM };

// A photo first appears far down the path, like the far end of the paving,
// and travels towards him. Once it is next in line, right in front of him,
// it is resized up to full size from its corner, so it is already big while
// it walks in. Its selection frame shows only while it resizes. Then it
// travels on past him.
const FAR = 48; // how far ahead it appears, in world units along the path
const RESIZE_AT = 6.2; // world units ahead of him where it grows to size
const RESIZE_SPAN = 1.6; // world units of travel the resize takes: unhurried

// ---- The conveyor -----------------------------------------------------------
//
// The photos ride a conveyor: each keeps a fixed gap to its neighbours
// (room to breathe), and the whole queue glides together at one shared
// speed. That speed eases smoothly from line to line so every photo reaches
// him on its cue. Each act has its own queue, so Act I keeps drifting
// gently through the year counter instead of rushing on towards Act II.
const GAP = 3.4; // world units between neighbouring photos
const cues: number[] = [];
const conveyors: Partial<Record<1 | 2, (sec: number) => number>> = {};

// The photos play a little slower than the narration: each act's queue is
// stretched from its first cue, so Act I runs on until the counter lands on
// 2025 and its last photo arrives with it.
const FIRST_CUE = { 1: 0.9, 2: 28.5 };
const PACE = { 1: 1.15, 2: 1.1 };
const actOf = (sec: number) => (sec < BLACKOUT ? 1 : 2);
const paced = (cue: number) => {
  const a = actOf(cue);
  return FIRST_CUE[a] + (cue - FIRST_CUE[a]) * PACE[a];
};

// Monotone cubic interpolation (Fritsch-Carlson): smooth, never overshoots,
// so the queue never stops or backs up; straight lines beyond the ends.
const monotone = (xs: number[], ys: number[]) => {
  const n = xs.length;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) =>
    i === 0 ? d[0] : i === n - 1 ? d[n - 2] : (d[i - 1] + d[i]) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
};

const actCues = (a: 1 | 2) =>
  cues.filter((c) => actOf(c) === a).sort((x, y) => x - y);

// Each cue's place on its act's conveyor, in world units.
const slotOf = (feature: number) =>
  actCues(actOf(feature)).indexOf(feature) * GAP;

// How far the conveyor carrying this cue has travelled by `sec`.
const travelled = (feature: number, sec: number) => {
  const a = actOf(feature);
  if (!conveyors[a]) {
    const sorted = actCues(a);
    conveyors[a] = monotone(sorted, sorted.map(slotOf));
  }
  return conveyors[a](sec);
};

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
  const { lateral, height, farLateral, farHeight } = ROWS[m.row];
  return (sec: number, out: Pose): Pose => {
    // Its distance ahead of him: its place on the conveyor minus how far
    // the conveyor has travelled.
    const s = FEATURE_S + slotOf(m.feature) - travelled(m.feature, sec);
    const t = sec - m.feature;
    const sinking = m.sink ? smooth(0.2, 3.4, t) : 0;
    // A straight line, like the paving: from far ahead above the path on
    // the right of frame to its place beside him on the left, at constant
    // speed. It may pass behind him on the way.
    const across = Math.min(1, Math.max(0, (s - FEATURE_S) / STREAM_REACH));
    pos
      .set(0, height + (farHeight - height) * across - sinking * 1.1, 0)
      .addScaledVector(AXIS, s)
      .addScaledVector(LEFT, lateral + (farLateral - lateral) * across);

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
    const pasted = smooth(FAR, FAR - 12, s); // a long, slow fade in
    const gone = smooth(-5.5, -3, s); // lingers, then fades out of frame

    out.x = pos.x;
    out.y = pos.y;
    out.z = pos.z;
    out.rx = (dummy.rotation.x * 180) / Math.PI;
    out.ry = (dummy.rotation.y * 180) / Math.PI;
    out.rz = (dummy.rotation.z * 180) / Math.PI;
    out.s = m.size;
    // Snaps to full size as it passes RESIZE_AT, well in front of him.
    const resized = glide((RESIZE_AT - s) / RESIZE_SPAN);
    out.grow = 0.5 + 0.5 * resized;
    // The selection frame shows only while it resizes, like the handles
    // of a frame being dragged out; it clears once it reaches full size.
    // Resizes are further apart than they last, so only one shows at once.
    out.sel =
      smooth(RESIZE_AT + 0.45, RESIZE_AT, s) *
      (1 - smooth(RESIZE_AT - RESIZE_SPAN, RESIZE_AT - RESIZE_SPAN - 0.5, s)) *
      act;
    // Guided sequence: the queue waits quietly in the dark; each photo
    // brightens as its turn approaches, so the eye is led along the stream
    // to the one being spoken.
    const turn = 0.32 + 0.68 * smooth(16, 5, s);
    out.o = pasted * gone * turn * (1 - sinking * 0.85) * act;
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
): Moment => {
  const cue = paced(feature);
  cues.push(cue);
  return { feature: cue, row, size, tilt, ...decay };
};

// One generated image per line, in the order they are spoken.
const scene = (file: string) => `story/${file}.jpg`;

export const storyCards: StoryCardSpec[] = [
  // Act I
  // "Belanda menjajah Indonesia"
  framed("ship", scene("01-ship"), "rect", at(0.9, "low", 1.7)),
  // "350 tahun"
  framed("map", scene("02-map"), "rect", at(3.9, "high", 1.6)),
  // "gunung masih utuh"
  framed("mountain", scene("03-mountain"), "rect", at(6.2, "low", 1.65)),
  // "samudra masih terbentang luas"
  framed("ocean", scene("04-ocean"), "rect", at(7.9, "high", 1.6)),
  // "sungai-sungai jernih"
  framed("river", scene("05-river"), "rect", at(10.1, "low", 1.65)),
  // "dia meninggalkan perkebunan yang terhampar"
  framed("plantation", scene("06-plantation"), "rect", at(11.9, "high", 1.6)),
  // "bangunan-bangunan yang indah"
  framed("building", scene("07-building"), "rect", at(14.5, "low", 1.65)),
  // "gedung-gedung yang kokoh"
  framed("gedung", scene("08-gedung"), "rect", at(16.2, "high", 1.6)),
  // "jalan-jalan yang kuat"
  framed("road", scene("09-road"), "rect", at(17.9, "low", 1.65)),
  // "jembatan kereta api yang kokoh"
  framed("bridge", scene("10-bridge"), "rect", at(19.4, "high", 1.6)),
  // "Indonesia merdeka 80 tahun"
  framed("merdeka", scene("11-merdeka"), "rect", at(21.6, "low", 1.8)),

  // Act II
  // "gunung gundul"
  framed("gundul", scene("12-gundul"), "rect", at(28.5, "high", 1.6)),
  // "sungai keruh"
  framed("keruh", scene("13-keruh"), "rect", at(30.6, "low", 1.65)),
  // "Hutang menggunung"
  framed("hutang", scene("14-hutang"), "rect", at(32.5, "high", 1.6)),
  // "Bangunan bangunan"
  framed("bangunan", scene("15-bangunan"), "rect", at(34.1, "low", 1.65)),
  // "hampir tidak ada yang berkualitas"
  framed("kualitas", scene("16-kualitas"), "rect", at(35.5, "high", 1.6)),
  // "Jalan jalan mudah rusak"
  framed("jalan", scene("17-jalan"), "rect", at(37.7, "low", 1.65)),
  // "jembatan mudah roboh"
  framed(
    "roboh",
    scene("18-roboh"),
    "rect",
    at(39.9, "high", 1.6, 0, { sink: true }),
  ),
  // "pertanyaannya adalah, siapa yang penjajah itu"
  framed("cermin", scene("19-cermin"), "rect", at(42.3, "low", 1.8)),
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
