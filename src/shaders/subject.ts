import {
  Color,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Texture,
  Vector2,
} from "three";
import { noiseGlsl, planeVertex } from "./common";

// Screenprint treatment for the cut-out: crushed blacks, hard posterised
// tritone, a faint halftone in the midtones and edges that "boil" from pose
// to pose like hand-cut paper.
const subjectFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uSeed;
uniform float uRough;
uniform float uHalftone;
uniform float uOpacity;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec3 uMid;
uniform vec3 uHighlight;
varying vec2 vUv;

${noiseGlsl}

void main() {
  vec4 s = texture2D(uMap, vUv);
  float n1 = noise(vUv * vec2(70.0, 126.0) + uSeed * 17.0) - 0.5;
  float n2 = noise(vUv * vec2(260.0, 470.0) + uSeed * 5.0) - 0.5;
  float a = smoothstep(0.4, 0.6, s.a + n1 * uRough + n2 * uRough * 0.6);

  float l = luma(s.rgb);
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 4.5;
  float dotMask = smoothstep(0.34, 0.22, length(fract(g) - 0.5));
  l += (dotMask - 0.45) * uHalftone * l * (1.0 - l) * 4.0;
  float q = l + (hash(vUv * 733.0 + uSeed) - 0.5) * 0.05;

  vec3 col = q < 0.03 ? uInk : q < 0.3 ? uAccent : q < 0.52 ? uMid : uHighlight;
  float alpha = a * uOpacity;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

// Soft halo from the silhouette: a ring-sampled blur of the alpha.
const glowFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uRadius;
uniform vec3 uColor;
uniform float uStrength;
varying vec2 vUv;

void main() {
  float acc = 0.0;
  for (int ring = 1; ring <= 3; ring++) {
    float r = float(ring) / 3.0;
    for (int k = 0; k < 10; k++) {
      float ang = float(k) * 0.6283 + float(ring) * 0.37;
      acc += texture2D(uMap, vUv + vec2(cos(ang), sin(ang)) * uRadius * r).a;
    }
  }
  float glow = acc / 30.0;
  float inner = texture2D(uMap, vUv).a;
  float a = glow * (1.0 - inner * 0.6) * uStrength;
  gl_FragColor = vec4(uColor * a, a);
}
`;

export const createSubjectMaterial = (map: Texture) => {
  const material = new ShaderMaterial({
    vertexShader: planeVertex,
    fragmentShader: subjectFragment,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    uniforms: {
      uMap: { value: map },
      uSeed: { value: 0 },
      uRough: { value: 0.28 },
      uHalftone: { value: 0.18 },
      uOpacity: { value: 1 },
      uInk: { value: new Color("#150707") },
      uAccent: { value: new Color("#d8261d") },
      uMid: { value: new Color("#ec4a2a") },
      uHighlight: { value: new Color("#eee84e") },
    },
  });
  return material;
};

export const createGlowMaterial = (map: Texture) =>
  new ShaderMaterial({
    vertexShader: planeVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    uniforms: {
      uMap: { value: map },
      uRadius: { value: new Vector2(0.022, 0.012) },
      uColor: { value: new Color("#ffd24a") },
      uStrength: { value: 0.5 },
    },
  });
