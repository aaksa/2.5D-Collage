// Everything in the film is timed from the voice-over (0926.srt) and the
// music under it. Times are in seconds.

export const FPS = 30;
export const AUDIO = "story/0926.mp3";
export const DURATION = 54.65;

// The kick runs at ~101.7 BPM from the very first frame.
export const BEAT = 60 / 101.7;
export const BEAT_OFFSET = 0.06;
export const beatAt = (k: number) => BEAT_OFFSET + k * BEAT;

// Where the music changes character.
export const ACT_TWO = 23.44; // filter drops: dark, bass-heavy
export const FALL = 27.3; // the old prints fall away
export const SILENCE = 44.47; // everything cuts out
export const HIT = 45.09; // full band returns for the outro
export const END_FADE = 53.4;

export type Act = "past" | "now" | "end";

export type Cue = {
  start: number;
  end: number;
  text: string;
  act: Act;
  // Words drawn in the accent colour.
  accent?: string[];
  // A number in the line that counts up as it appears.
  count?: string;
};

// The SRT, in the order it is spoken (cues 20 and 21 are out of order in
// the file).
export const CUES: Cue[] = [
  { start: 0.333, end: 2.533, text: "Belanda menjajah Indonesia", act: "past" },
  { start: 3.333, end: 4.8, text: "350 tahun", act: "past", count: "350" },
  { start: 5.7, end: 7.133, text: "gunung masih utuh", act: "past" },
  { start: 7.366, end: 9.366, text: "samudra masih terbentang luas", act: "past" },
  { start: 9.6, end: 11.0, text: "sungai-sungai jernih", act: "past" },
  {
    start: 11.266,
    end: 13.766,
    text: "dia meninggalkan perkebunan yang terhampar",
    act: "past",
  },
  { start: 13.966, end: 15.466, text: "bangunan-bangunan yang indah", act: "past" },
  { start: 15.7, end: 17.2, text: "gedung-gedung yang kokoh", act: "past" },
  { start: 17.4, end: 18.366, text: "jalan-jalan yang kuat", act: "past" },
  { start: 18.866, end: 20.7, text: "jembatan kereta api yang kokoh", act: "past" },
  {
    start: 21.0,
    end: 23.066,
    text: "Indonesia merdeka 80 tahun",
    act: "past",
    count: "80",
  },
  { start: 28.0, end: 29.5, text: "gunung gundul", act: "now", accent: ["gundul"] },
  { start: 30.066, end: 31.466, text: "sungai keruh", act: "now", accent: ["keruh"] },
  {
    start: 32.0,
    end: 33.4,
    text: "Hutang menggunung",
    act: "now",
    accent: ["menggunung"],
  },
  { start: 33.6, end: 34.8, text: "Bangunan bangunan", act: "now" },
  {
    start: 34.9,
    end: 36.7,
    text: "hampir tidak ada yang berkualitas",
    act: "now",
    accent: ["tidak"],
  },
  {
    start: 37.1,
    end: 38.966,
    text: "Jalan jalan mudah rusak",
    act: "now",
    accent: ["rusak"],
  },
  {
    start: 39.4,
    end: 41.133,
    text: "jembatan mudah roboh",
    act: "now",
    accent: ["roboh"],
  },
  { start: 41.466, end: 42.533, text: "pertanyaannya adalah", act: "now" },
  {
    start: 43.0,
    end: SILENCE,
    text: "siapa yang penjajah itu",
    act: "now",
    accent: ["penjajah"],
  },
];

// How a print arrives, matched to what the line says about it.
export type Entrance =
  | "emerge" // out of the dark, from far away
  | "slide" // tossed in from the right
  | "rise" // lifts into view, majestic
  | "glide" // a long, wide sweep
  | "flow" // drifts in along a curve, like water
  | "unfold" // was lying flat, tilts up to spread out
  | "build" // rises slowly, as if built
  | "slam" // drops from above and lands hard
  | "straight" // dead straight, fast, no wobble
  | "train" // rolls in sideways with a rhythmic judder
  | "flip" // turns over to reveal itself
  | "sink" // sluggish, settles low
  | "drop" // falls onto the pile
  | "jolt" // shoved in, knocked crooked
  | "fade"; // rises out of the dark, slowly

export type Exit =
  | "none"
  | "crack" // splits in two along a jagged line
  | "collapse"; // hinges off one corner and falls

export type Shot = {
  id: string;
  src: string; // colour, under public/
  act: Act;
  land: number; // when the print comes to rest
  entrance: Entrance;
  exit?: Exit;
  exitAt?: number;
  // Resting place, relative to the centre of the stage.
  x?: number;
  y?: number;
  rz?: number; // degrees
  scale?: number;
  // Crop into the photo (x, y, w, h in 0..1), for repeat prints.
  crop?: [number, number, number, number];
  // Lands on top of the previous print without pushing it back.
  stacks?: boolean;
  // Keep reds saturated (the flag).
  keepRed?: boolean;
  // Inner-camera drift direction for the hold, in parallax units.
  drift?: [number, number];
};

const photo = (id: string) => `story/${id}.jpg`;

export const SHOTS: Shot[] = [
  { id: "01-ship", src: photo("01-ship"), act: "past", land: 2.4, entrance: "emerge", drift: [1, 0.2] },
  { id: "02-map", src: photo("02-map"), act: "past", land: beatAt(6), entrance: "slide", rz: -2.5, x: 0.25, drift: [-0.6, 0.5] },
  { id: "03-mountain", src: photo("03-mountain"), act: "past", land: beatAt(10), entrance: "rise", rz: 1.5, x: -0.2, drift: [0, 1] },
  { id: "04-ocean", src: photo("04-ocean"), act: "past", land: beatAt(13), entrance: "glide", rz: -1, x: 0.15, drift: [1.2, 0] },
  { id: "05-river", src: photo("05-river"), act: "past", land: 9.98, entrance: "flow", rz: 2, x: -0.2, drift: [-0.8, 0.4] },
  { id: "06-plantation", src: photo("06-plantation"), act: "past", land: beatAt(20), entrance: "unfold", rz: -1.5, x: 0.2, drift: [0.7, 0.6] },
  { id: "07-building", src: photo("07-building"), act: "past", land: beatAt(24), entrance: "build", rz: 1, x: -0.15, drift: [0, 0.9] },
  { id: "08-gedung", src: photo("08-gedung"), act: "past", land: beatAt(27), entrance: "slam", rz: -0.5, x: 0.1, drift: [-0.5, 0.8] },
  { id: "09-road", src: photo("09-road"), act: "past", land: beatAt(30), entrance: "straight", rz: 0, x: -0.1, drift: [0, 0.5] },
  { id: "10-bridge", src: photo("10-bridge"), act: "past", land: beatAt(33), entrance: "train", rz: 1, x: 0.1, drift: [1, 0.2] },
  { id: "11-merdeka", src: photo("11-merdeka"), act: "past", land: beatAt(36), entrance: "flip", rz: -1, keepRed: true, drift: [-0.6, 0.6] },

  { id: "12-gundul", src: photo("12-gundul"), act: "now", land: 28.12, entrance: "slam", rz: 4, x: -0.2, drift: [0.8, 0.3] },
  { id: "13-keruh", src: photo("13-keruh"), act: "now", land: 30.35, entrance: "sink", rz: -2.5, x: 0.25, drift: [-0.7, 0.2] },
  { id: "14-hutang", src: photo("14-hutang"), act: "now", land: beatAt(54), entrance: "drop", rz: 2, x: -0.1, y: -0.35, drift: [0, 1] },
  { id: "14-hutang-b", src: photo("14-hutang"), act: "now", land: beatAt(55), entrance: "drop", rz: -5, x: 0.5, y: 0.1, scale: 0.86, stacks: true, crop: [0.18, 0.1, 0.7, 0.7], drift: [0.4, 0.8] },
  { id: "14-hutang-c", src: photo("14-hutang"), act: "now", land: beatAt(56), entrance: "drop", rz: 6, x: -0.45, y: 0.5, scale: 0.74, stacks: true, crop: [0.3, 0.05, 0.5, 0.5], drift: [-0.4, 0.8] },
  { id: "14-hutang-d", src: photo("14-hutang"), act: "now", land: 33.35, entrance: "drop", rz: -2, x: 0.15, y: 0.85, scale: 0.62, stacks: true, crop: [0.38, 0.0, 0.34, 0.34], drift: [0, 1] },
  { id: "15-bangunan", src: photo("15-bangunan"), act: "now", land: 33.9, entrance: "jolt", rz: -3, x: 0.2, drift: [0.8, 0.3] },
  { id: "16-kualitas", src: photo("16-kualitas"), act: "now", land: beatAt(60), entrance: "rise", rz: 1.5, x: -0.15, exit: "crack", exitAt: 36.2, drift: [-0.5, 0.6] },
  { id: "17-jalan", src: photo("17-jalan"), act: "now", land: 37.35, entrance: "jolt", rz: -2, x: 0.15, drift: [0, 0.9] },
  { id: "18-roboh", src: photo("18-roboh"), act: "now", land: beatAt(67), entrance: "slide", rz: 1, x: -0.1, exit: "collapse", exitAt: 40.45, drift: [0.7, 0.3] },

  { id: "19-cermin", src: photo("19-cermin"), act: "end", land: 44.3, entrance: "fade", rz: 0, keepRed: true, drift: [0.3, 0.2] },
];

// Where the old prints lay out when the camera pulls back at ACT_TWO,
// in the order of SHOTS (01..10). The flag (11) sits on top in the middle.
export const SPREAD: [number, number, number][] = [
  [-7.4, 3.9, -4],
  [-2.5, 4.1, 3],
  [2.5, 3.8, -2],
  [7.4, 4.0, 5],
  [-7.6, 0.1, 3],
  [7.5, -0.1, -3],
  [-7.3, -3.9, -2],
  [-2.4, -4.0, 4],
  [2.6, -3.8, -5],
  [7.4, -4.1, 2],
];
