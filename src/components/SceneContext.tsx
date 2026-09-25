import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { Color, Texture, Vector3 } from "three";

// Every animated object registers an updater that poses it for a given time.
// Time is a float frame number, so the renderer can evaluate the scene
// between frames for motion blur. `frame` is the integer output frame, for
// things that must not blur (the stop-motion subject's pose).
export type Updater = (t: number, frame: number) => void;

export type Rig = {
  position: Vector3; // camera now
  rest: Vector3; // camera at t = 0, without noise; the parallax origin
  fov: number;
  focus: number; // distance to the subject, for depth of field
  head: Vector3; // the subject's head, for close-ups (set by the subject)
};

export type Settings = {
  duration: number; // frames
  background: Color;
  accent: Color;
  highlight: Color;
  cameraIntensity: number;
  parallaxIntensity: number;
  grainAmount: number;
  microMotionAmount: number;
  motionBlurAmount: number;
};

export type SceneState = {
  register: (fn: Updater, order: number) => () => void;
  update: Updater;
  rig: Rig;
  settings: Settings;
  textures: Map<string, Texture>;
};

export const createSceneState = (
  settings: Settings,
  textures: Map<string, Texture>,
): SceneState => {
  const updaters: { fn: Updater; order: number }[] = [];
  return {
    register: (fn, order) => {
      const entry = { fn, order };
      updaters.push(entry);
      updaters.sort((a, b) => a.order - b.order);
      return () => {
        updaters.splice(updaters.indexOf(entry), 1);
      };
    },
    update: (t, frame) => {
      for (const u of updaters) {
        u.fn(t, frame);
      }
    },
    rig: {
      position: new Vector3(),
      rest: new Vector3(),
      fov: 42,
      focus: 7,
      head: new Vector3(0, 0.8, 0),
    },
    settings,
    textures,
  };
};

const SceneContext = createContext<SceneState | null>(null);
export const SceneProvider = SceneContext.Provider;

export const useScene = () => {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error("useScene must be used inside <SceneProvider>");
  }
  return ctx;
};

// Camera updaters run first (order 0) so everything else can read the rig.
export const useTimeline = (fn: Updater, order = 1) => {
  const { register } = useScene();
  const ref = useRef(fn);
  ref.current = fn;
  useLayoutEffect(
    () => register((t, frame) => ref.current(t, frame), order),
    [register, order],
  );
};

export const useTexture = (src: string) => {
  const { textures } = useScene();
  const texture = textures.get(src);
  if (!texture) {
    throw new Error(`Texture not preloaded: ${src}`);
  }
  return texture;
};
