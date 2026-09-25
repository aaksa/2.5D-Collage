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

// Two rows, alternated line by line so neighbours never overlap. Each row
// has its own far end, so the queue spreads into two streams: one low along
// the left of the far path, one high over its right.
const ROWS = {
  low: { lateral: 2.85, height: 0.15, farLateral: 2.6, farHeight: -0.6 },
  high: { lateral: 2.75, height: 1.42, farLateral: -3.4, farHeight: 2.9 },
};

// A photo first appears far down the path, like the far end of the paving,
// and travels towards him. While it is still well ahead of him it is
// selected and resized up to full size from its corner, so it arrives big;
// it is selected again while its line is spoken, then travels on past him.
const FAR = 20; // how far ahead it appears, in world units along the path
const RESIZE_AT = 6.5; // world units ahead of him where it snaps to size
const RESIZE_SPAN = 0.35; // world units of travel the resize takes
// The photos drift a little slower than the paving under his feet.
const PHOTO_FLOW = 0.7;
const APPEAR = 0.55; // seconds before its moment it is selected again
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
  const { lateral, height, farLateral, farHeight } = ROWS[m.row];
  return (sec: number, out: Pose): Pose => {
    // Exactly the paving's motion: straight along the path, constant speed.
    const s = FEATURE_S + lane.speed * PHOTO_FLOW * (m.feature - sec);
    const t = sec - m.feature;
    const sinking = m.sink ? smooth(0.2, 3.4, t) : 0;
    // A straight line, like the paving: from far ahead above the path on
    // the right of frame to its place beside him on the left, at constant
    // speed. It may pass behind him on the way.
    const across = Math.min(1, Math.max(0, (s - FEATURE_S) / (FAR - 2)));
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
    const pasted = smooth(FAR, FAR - 3, s); // fades in from far away
    const gone = smooth(-3.4, -2.2, s); // fades as it passes out of frame

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
    const resizing =
      smooth(RESIZE_AT + 0.25, RESIZE_AT, s) *
      (1 -
        smooth(
          RESIZE_AT - RESIZE_SPAN - 0.1,
          RESIZE_AT - RESIZE_SPAN - 0.6,
          s,
        ));
    const spoken =
      smooth(-APPEAR - 0.25, -APPEAR, t) *
      (1 - smooth(SELECTED, SELECTED + 0.45, t));
    out.sel = Math.max(resizing, spoken) * act;
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
