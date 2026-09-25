# 2.5D Collage

A 15-second Remotion film (1920×1080, 30 fps). The red/yellow cut-out walker
from the reference walks a single line of paving slabs, seen from the side.
The camera tracks him through black space full of floating photographs and
drifting dust.

- **Real 2.5D camera.** One pinhole camera cranes down, pushes in and trucks
  alongside the walker. Photos and slabs are true perspective planes (a CSS
  `matrix3d` per quad), so everything parallaxes by its actual depth.
- **Photos with parallax inside the frame.** Each print's image slides
  within its torn edge as the viewing angle changes, and a sheen sweeps across
  it.
- **Depth of field.** Photos, slabs and particles blur by their distance from
  the focus plane. Near dust turns into soft bokeh.
- **Finish.** Stop-motion walker (on fours) against smooth camera motion, a
  warm light pool at his feet, light shafts, grain, vignette, 2.35:1
  letterbox and editorial titles.

## Commands

```console
npm i
npm run dev                                   # Remotion Studio preview
npx remotion render Collage out/collage.mp4   # render the video
```

## Customising

Everything below is a prop, editable in Studio or in `src/Root.tsx`:

- `photos`: the floating prints. The defaults in `public/photos/` are
  placeholders (see `public/photos/CREDITS.md`). Use any number of your own;
  they are shown in black and white.
- `pathTexture`: the image on the paving slabs.
- `title`, `subtitle`, `chapter`: the typography. An empty `title` hides the
  title cards.
- `letterbox`: bar height in px (131 gives 2.35:1, 0 turns it off).

## Where things live

- `src/Collage/camera.ts`: camera move, walking speed, projection, depth of field
- `src/Collage/scene.ts`: seeded layout of photos, slabs and dust
- `src/Collage/homography.ts`: maps world-space quads to CSS `matrix3d`
- `src/Collage/Titles.tsx`: title and letterbox typography

## Re-cutting the walker

`public/character/` holds the eight-pose walk cycle cut from the reference
clip by `scripts/extract_character.py`. See the docstring there for how to
regenerate it.
