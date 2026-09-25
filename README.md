# 2.5D Collage

A Remotion video (1920×1080, 30 fps): a cut-out walker in a posterised
red/yellow screen-print look walks through a starfield. Grayscale photo shards
float past and paving slabs scroll underneath. Everything sits in one 3D camera
space, so layers separate with real parallax.

## Commands

```console
npm i
npm run dev                                   # Remotion Studio preview
npx remotion render Collage out/collage.mp4   # render the video
```

## Replacing the photos

The shards use `public/photos/photo-01.svg` … `photo-08.svg`, which are
placeholders. Drop your own images into `public/photos/` and update the
`photos` list in `src/Root.tsx` (or edit the props in Studio). Any number of
photos works, in colour or not: they are shown in grayscale automatically.
`floorTexture` sets the image used for the paving slabs.

`walkerColors` (darkest to lightest) and `glowColor` control the walker's look.

## Where things live

- `src/Collage/camera.ts`: camera path, walking speed and projection
- `src/Collage/scene.ts`: seeded layout of shards, slabs and stars
- `src/Collage/Walker.tsx`: the walker frame sequence and its colour filter

## Re-cutting the walker

`public/walker/` holds the walker as a transparent WebP sequence, cut from
`walking.mp4` with `scripts/matte_walker.py` (rembg `u2net_human_seg`). See the
docstring in that script to regenerate it from a new clip. If the new clip has
a different framing, adjust `CROP` and `GROUND_Y` there. `GROUND_Y` is the row
where the feet meet the ground; anything below it is cut away.
