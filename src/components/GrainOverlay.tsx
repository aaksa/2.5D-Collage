import { useMemo } from "react";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FinishShader } from "../shaders/post";
import { useScene } from "./SceneContext";

// The last pass over the frame, in display space: grain regenerated every
// frame (seeded by the frame number, so renders are repeatable), a faint
// screenprint halftone, lens fringing and a small vignette.
export const useFinishPass = () => {
  const { settings } = useScene();
  return useMemo(() => {
    const pass = new ShaderPass(FinishShader);
    pass.uniforms.uGrain.value = 0.04 * settings.grainAmount;
    return pass;
  }, [settings]);
};
