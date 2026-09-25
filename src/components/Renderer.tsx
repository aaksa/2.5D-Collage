import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { getRemotionEnvironment, useCurrentFrame } from "remotion";
import {
  Camera,
  CustomBlending,
  HalfFloatType,
  OneFactor,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import {
  FullScreenQuad,
  Pass,
} from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AccumulateShader } from "../shaders/post";
import { useFinishPass } from "./GrainOverlay";
import { SceneState, useScene } from "./SceneContext";

// Frame-sampled motion blur. The whole scene is re-posed at several moments
// across the shutter and the renders are averaged, so anything that moves
// fast on screen (near cards, the wipe, camera moves) smears in proportion
// to its real speed, while the stop-motion subject stays crisp.
class MotionBlurPass extends Pass {
  frame = 0;
  samples = 1;
  shutter = 0.5; // fraction of a frame; 0.5 = 180 degree shutter
  private sample: WebGLRenderTarget;
  private quad: FullScreenQuad;
  private material: ShaderMaterial;

  constructor(
    private scene: Scene,
    private camera: Camera,
    private state: SceneState,
  ) {
    super();
    this.needsSwap = true;
    this.sample = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: 4,
    });
    this.material = new ShaderMaterial({
      ...AccumulateShader,
      uniforms: {
        tDiffuse: { value: null },
        uWeight: { value: 1 },
      },
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  setSize(width: number, height: number) {
    this.sample.setSize(width, height);
  }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget) {
    const n = Math.max(1, this.samples);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(writeBuffer);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    for (let i = 0; i < n; i++) {
      const offset = n === 1 ? 0 : (i / (n - 1) - 0.5) * this.shutter;
      this.state.update(this.frame + offset, this.frame);
      renderer.setRenderTarget(this.sample);
      renderer.setClearColor(this.state.settings.background, 1);
      renderer.clear();
      renderer.render(this.scene, this.camera);
      this.material.uniforms.tDiffuse.value = this.sample.texture;
      this.material.uniforms.uWeight.value = 1 / n;
      renderer.setRenderTarget(writeBuffer);
      this.quad.render(renderer);
    }
    // Leave the scene posed at the frame itself.
    this.state.update(this.frame, this.frame);
    renderer.autoClear = autoClear;
  }

  dispose() {
    this.sample.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}

export type Grade = {
  exposure: number;
  saturation: number;
  tint: [number, number, number];
  vignette: number;
  grain: number; // multiplier on the base grain
};

export const Renderer: React.FC<{
  // Colour grade over time (seconds), for stories that change mood.
  grade?: (seconds: number) => Grade;
  // Motion-blur samples per frame when rendering (default 10).
  samples?: number;
}> = ({ grade, samples = 10 }) => {
  const frame = useCurrentFrame();
  const { gl, scene, camera, size } = useThree();
  const state = useScene();
  const finish = useFinishPass();
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const { composer, blur } = useMemo(() => {
    const c = new EffectComposer(gl);
    const b = new MotionBlurPass(scene, camera, state);
    c.addPass(b);
    // Bloom only catches the brightest highlights: the subject's glow.
    c.addPass(new UnrealBloomPass(new Vector2(1920, 1080), 0.3, 0.5, 1.0));
    c.addPass(new OutputPass());
    c.addPass(finish);
    return { composer: c, blur: b };
  }, [gl, scene, camera, state, finish]);

  useLayoutEffect(() => {
    composer.setPixelRatio(1);
    composer.setSize(size.width, size.height);
    finish.uniforms.uResolution.value.set(size.width, size.height);
  }, [composer, finish, size]);

  useLayoutEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => {
    const { motionBlurAmount } = state.settings;
    // Full quality when rendering; lighter while scrubbing in the Studio.
    const rendering = getRemotionEnvironment().isRendering;
    blur.frame = frameRef.current;
    blur.shutter = motionBlurAmount;
    blur.samples = motionBlurAmount > 0 ? (rendering ? samples : 2) : 1;
    finish.uniforms.uFrame.value = frameRef.current;
    if (grade) {
      const g = grade(frameRef.current / 30);
      finish.uniforms.uExposure.value = g.exposure;
      finish.uniforms.uSaturation.value = g.saturation;
      finish.uniforms.uTint.value.set(...g.tint);
      finish.uniforms.uVignette.value = g.vignette;
      finish.uniforms.uGrain.value =
        0.04 * state.settings.grainAmount * g.grain;
    }
    composer.render();
  }, 1);

  return null;
};
