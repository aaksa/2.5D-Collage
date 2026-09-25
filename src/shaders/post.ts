import { Vector2 } from "three";
import { noiseGlsl } from "./common";

const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Adds one motion-blur sample into the accumulation buffer.
export const AccumulateShader = {
  uniforms: {
    tDiffuse: { value: null },
    uWeight: { value: 1 },
  },
  vertexShader: fullscreenVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uWeight;
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * uWeight, uWeight);
    }
  `,
};

// The finishing pass, in display space: fresh monochrome grain every frame,
// a whisper of halftone, lens chromatic aberration and a small vignette.
export const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFrame: { value: 0 },
    uGrain: { value: 0.05 },
    uHalftone: { value: 0.025 },
    uAberration: { value: 0.0018 },
    uVignette: { value: 0.28 },
    uResolution: { value: new Vector2(1920, 1080) },
  },
  vertexShader: fullscreenVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uFrame;
    uniform float uGrain;
    uniform float uHalftone;
    uniform float uAberration;
    uniform float uVignette;
    uniform vec2 uResolution;
    varying vec2 vUv;

    ${noiseGlsl}

    // Dave Hoskins' hash without sine.
    float grainHash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 shift = c * uAberration * (0.4 + r2 * 3.0);
      vec3 col = vec3(
        texture2D(tDiffuse, vUv - shift).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv + shift).b
      );

      float l = luma(col);
      vec2 px = vUv * uResolution;
      vec2 hg = mat2(0.8660, -0.5, 0.5, 0.8660) * px / 3.2;
      float dots = smoothstep(0.36, 0.2, length(fract(hg) - 0.5));
      col *= 1.0 + (dots - 0.4) * uHalftone * smoothstep(0.05, 0.4, l) * (1.0 - l);

      // Two uniform hashes summed: a softer, film-like distribution. The
      // hash stays precise at full-HD pixel coordinates (no banding).
      vec2 seed = floor(px) + mod(vec2(uFrame * 131.0, uFrame * 71.0), 2048.0);
      float g = grainHash(seed) + grainHash(seed + 4096.0) - 1.0;
      col += g * uGrain * (0.55 + 0.45 * (1.0 - l));

      float v = smoothstep(0.95, 0.25, length(c * vec2(1.0, 1.15)) * 1.2);
      col *= mix(1.0, v, uVignette);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
