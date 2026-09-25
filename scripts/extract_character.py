"""Cut the stylised walker out of the reference clip as a looping sprite sequence.

The reference is a screen recording, so most frames are repeats; only the
unique poses are kept. The character is the only saturated thing in the
frame, so he is colour-keyed, with rembg filling in the black bag and shadows.

Usage:
  1. Extract frames:  npx remotion ffmpeg -i Reference_Video.mov -vsync 0 <frames_dir>/%03d.png
  2. Write sprites:   python scripts/extract_character.py <frames_dir> public/character

Requires: pip install "rembg[cpu]" opencv-python-headless pillow numpy
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np

# One full stride (two steps). Pose 36 is nearly pose 6, so 9 -> 36 loops cleanly.
LOOP = ["009", "013", "017", "021", "024", "028", "032", "036"]
# Search area around the walker, in source pixels (x0, y0, x1, y1).
AREA = (300, 300, 700, 915)
# Row where the planted foot meets the ground.
GROUND_Y = 887
CROP_W, CROP_TOP = 300, 360


def fill_holes(mask: np.ndarray) -> np.ndarray:
    flood = mask.copy()
    pad = np.zeros((mask.shape[0] + 2, mask.shape[1] + 2), np.uint8)
    cv2.floodFill(flood, pad, (0, 0), 255)
    return mask | cv2.bitwise_not(flood)


def character_mask(bgr: np.ndarray, net_mask: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    s, v = hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
    x0, y0, x1, y1 = AREA
    sat = ((s > 0.42) & (v > 0.22)).astype(np.uint8) * 255
    outside = np.ones_like(sat, bool)
    outside[y0:y1, x0:x1] = False
    sat[outside] = 0
    sat = cv2.morphologyEx(sat, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    # Keep the biggest saturated blob: the walker.
    _, labels, stats, _ = cv2.connectedComponentsWithStats(sat)
    biggest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    body = (labels == biggest).astype(np.uint8) * 255

    # Black bag and jacket shadows: dark pixels rembg calls "person", next to the
    # body, above the hips (below that it only ever grabs background between legs).
    rows = np.where(body.any(1))[0]
    hip = int(rows.min() + 0.56 * (rows.max() - rows.min()))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))
    near = cv2.dilate(body, kernel) > 0
    extra = ((net_mask > 100) & (v < 0.28) & near).astype(np.uint8) * 255
    extra[hip:] = 0

    closed = cv2.morphologyEx(body | extra, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    mask = fill_holes(closed)
    mask[hip:] = closed[hip:]
    return mask


def main(frames_dir: Path, out_dir: Path) -> None:
    from PIL import Image
    from rembg import new_session, remove

    session = new_session("u2net_human_seg")
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(LOOP):
        path = frames_dir / f"{name}.png"
        bgr = cv2.imread(str(path))
        net = np.asarray(remove(Image.open(path), session=session, only_mask=True))
        mask = character_mask(bgr, net)

        # Line every pose up on the torso so he walks on the spot.
        ys, xs = np.where(mask > 0)
        top = ys.min()
        torso_x = xs[ys < top + 0.45 * (ys.max() - top)].mean()
        x0 = int(round(torso_x - CROP_W / 2))
        box = (x0, CROP_TOP, x0 + CROP_W, GROUND_Y + 14)

        alpha = cv2.GaussianBlur(mask, (3, 3), 0.8)
        rgba = np.dstack([cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), alpha])
        crop = rgba[box[1] : box[3], box[0] : box[2]]
        Image.fromarray(crop).save(out_dir / f"pose-{i + 1:02d}.webp", lossless=True)

    meta = {
        "poses": len(LOOP),
        "width": CROP_W,
        "height": GROUND_Y + 14 - CROP_TOP,
        "groundY": GROUND_Y - CROP_TOP,
        # Head to planted foot, in sprite pixels.
        "personHeight": GROUND_Y - 394,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(meta)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
