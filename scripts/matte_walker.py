"""Cut the walker out of the source clip and write a transparent WebP sequence.

Usage:
  1. Extract frames:  npx remotion ffmpeg -i walking.mp4 <frames_dir>/%04d.png
  2. Build mattes:    python scripts/matte_walker.py mask <frames_dir> <masks_dir>
  3. Write sequence:  python scripts/matte_walker.py export <frames_dir> <masks_dir> public/walker

Requires: pip install "rembg[cpu]" pillow numpy
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def build_masks(frames_dir: Path, masks_dir: Path) -> None:
    from rembg import new_session, remove

    masks_dir.mkdir(parents=True, exist_ok=True)
    session = new_session("u2net_human_seg")
    frames = sorted(frames_dir.glob("*.png"))
    for i, frame in enumerate(frames):
        out = masks_dir / frame.name
        if out.exists():
            continue
        mask = remove(Image.open(frame), session=session, only_mask=True)
        mask.save(out)
        if i % 25 == 0:
            print(f"mask {i + 1}/{len(frames)}", flush=True)


# Region of the 720x1280 source that always contains the walker.
CROP = (230, 520, 540, 1196)
# The wet sand mirrors his feet; everything below this source row is reflection.
GROUND_Y = 1188
FEATHER = 8


def export(frames_dir: Path, masks_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    left, top, right, bottom = CROP
    rows = np.arange(top, bottom, dtype=np.float32)[:, None]
    ground_fade = np.clip((GROUND_Y - rows) / FEATHER, 0, 1)

    frames = sorted(frames_dir.glob("*.png"))
    for frame in frames:
        rgb = Image.open(frame).convert("RGB").crop(CROP)
        mask = Image.open(masks_dir / frame.name).convert("L").crop(CROP)
        # Pull the edge in a pixel so the bright beach background doesn't halo.
        mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
        alpha = (np.asarray(mask, dtype=np.float32) * ground_fade).astype(np.uint8)
        rgba = rgb.copy()
        rgba.putalpha(Image.fromarray(alpha))
        rgba.save(out_dir / f"{frame.stem}.webp", quality=88, alpha_quality=90, method=6)

    meta = {
        "frames": len(frames),
        "width": right - left,
        "height": bottom - top,
        # Ground line and approximate head-to-toe height, in crop pixels.
        "groundY": GROUND_Y - top,
        "personHeight": GROUND_Y - 540,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(meta)


if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    if cmd == "mask":
        build_masks(Path(args[0]), Path(args[1]))
    elif cmd == "export":
        export(Path(args[0]), Path(args[1]), Path(args[2]))
    else:
        raise SystemExit(f"unknown command {cmd}")
