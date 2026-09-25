"""Prepare story photos for in-frame parallax: a JPEG of each photo plus a depth map.

Depth comes from Depth Anything V2 (small). Near is white, far is black.
The map is normalised on robust percentiles, then near regions are dilated
by a few pixels and the result is softened, so when the shader shifts
layers apart the stretching happens in the background, not on the edges of
foreground objects.

Usage:
  python scripts/make_depth.py public/story/src public/story

Requires: pip install torch transformers pillow numpy
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from transformers import pipeline

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"
OUT_W = 1536


def main(src_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    estimate = pipeline("depth-estimation", model=MODEL)
    for path in sorted(src_dir.glob("*.png")):
        img = Image.open(path).convert("RGB")
        if img.width != OUT_W:
            img = img.resize((OUT_W, round(img.height * OUT_W / img.width)), Image.LANCZOS)
        img.save(out_dir / f"{path.stem}.jpg", quality=90)

        raw = np.asarray(estimate(img)["predicted_depth"].squeeze(), dtype=np.float32)
        lo, hi = np.percentile(raw, [2, 99.5])
        d = np.clip((raw - lo) / (hi - lo + 1e-6), 0, 1) ** 0.6
        depth = Image.fromarray((d * 255).astype(np.uint8)).resize(img.size, Image.BICUBIC)
        depth = depth.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3))
        depth.save(out_dir / f"{path.stem}-depth.jpg", quality=92)
        print(path.stem)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
