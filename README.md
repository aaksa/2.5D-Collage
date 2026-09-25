# 2.5D Collage

One polished hero scene: an editorial cut-out collage in real 3D, built with
Remotion, Three.js, React Three Fiber and `@remotion/three`. The screenprinted
walker from the reference moves through floating photographic prints while a
weighted camera dollies, trucks and rolls past them. It runs 4 s at 1920×1080,
30 fps, and the duration is configurable.

## Commands

```console
npm i
npm run dev                                                  # Studio, with live props
npx remotion render PremiumCollage out/premium-collage.mp4   # final render
```

Rendering uses WebGL. On a machine with a GPU the default (`angle`, set in
`remotion.config.ts`) is fastest. On a server without one, add `--gl=swangle`.

## How it's built

- **True 3D space.** Flat assets are planes at real depths: foreground
  +1..+2.5, subject 0, midground -1..-6, background -9..-16, dust -20 and
  beyond. Parallax comes from the camera moving through that space.
- **Camera with mass** (`components/CameraRig.tsx`). Keyframed dolly, truck,
  rise, roll and FOV (42° to 38°), interpolated with velocity-continuous
  curves (`utils/easing.ts`). It establishes, pushes slowly, gathers energy,
  overshoots a hair and settles. Layered low-frequency noise gives it a
  stabilised-dolly feel, never game shake.
- **Micro-motion** (`hooks/useMicroMotion.ts`). Every object drifts a few
  pixels, fractions of a degree and fractions of a percent in scale, on its
  own mix of frequencies and phases.
- **Cards** (`components/ImageCard.tsx`, `shaders/card.ts`):
  - polygon masks with torn, noisy edges; crop; border
  - mono, duotone, threshold or colour treatment; paper texture
  - soft shadow, blend modes
  - depth-of-field blur by distance from the focus plane
  - entrances that layer opacity, depth, rise, rotation, scale and blur
- **Subject.** By default, a rigged 3D character (`components/SubjectModel.tsx`)
  walks in the centre of frame. Its animation plays on twos, driven by the
  timeline, and its lit material is screenprinted into four inks (black, red,
  orange, yellow) with halftone. An HDR outline blooms into the yellow glow.
  The path slides at the speed measured from its planted foot, so the feet
  don't skate. Set `subject.model` to any rigged GLB with a walk animation.
  Without a model, the reference cut-out sprite sequence is used instead
  (`components/SubjectPlane.tsx`).
- **Transition** (`components/TransitionCard.tsx`). A print sweeps across just
  in front of the lens as a spatial wipe, uncovering the title.
- **Motion blur** (`components/Renderer.tsx`). The scene is re-posed at 10
  moments across a 180° shutter and the renders are averaged. Fast foreground
  motion smears; the stop-motion subject stays crisp.
- **Finish** (`shaders/post.ts`). Highlight-only bloom, then per-frame
  monochrome grain, a faint halftone, lens fringing and a small vignette.

## Props (editable in Studio)

`backgroundColor`, `accentColor`, `highlightColor`, `subject`, `images`,
`transitionImage`, `pathTexture`, `title`, `subtitle`, `durationInSeconds`,
`cameraIntensity`, `parallaxIntensity`, `grainAmount`, `microMotionAmount` and
`motionBlurAmount`.

Each entry in `images` looks like:

```ts
{
  src: "photos/03-church.jpg",
  x: -4.5, y: 0.45, z: -3,     // world units; the subject stands at z = 0
  scale: 3,                     // card height
  rotationX: 0, rotationY: 10, rotationZ: 0,   // degrees
  parallax: 1.05,               // 1 = physically static; <1 calmer, >1 stronger
  mask: "kite",                 // rect | shard | kite | triangle | sliver
  treatment: "mono",            // mono | duotone | threshold | color
  crop: [0, 0, 1, 1], border: 0.04, shadow: true,
  brightness: 0, contrast: 1.25, microMotion: 1,
  enterFrame: 6, exitFrame: undefined,
}
```

## Assets

- `public/photos/`: placeholder photos (see `CREDITS.md`). Replace freely.
- `public/models/boss-minion-orc.glb`: "Boss Minion Orc" by Lowpolyprincipal,
  CC BY 4.0. Credit the author when publishing (see `public/models/CREDITS.md`).
- `public/character/`: the walk cycle cut from the reference clip by
  `scripts/extract_character.py` (see its docstring).
