import {
  Color,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector4,
} from "three";
import { noiseGlsl, planeVertex } from "../shaders/common";

// A photographic print: paper border around a photo that is really a
// little 3D scene. The photo's depth map is ray-marched so near layers
// slide over far ones as the inner camera shifts and pushes in, with
// proper occlusion (the nearest surface along the ray wins).
//
// uParallax: inner-camera shift, in UV units per unit of depth.
// uZoom: inner dolly; near layers grow faster than far ones.
// uFocus: the depth that stays put.
const printFragment = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uDepth;
uniform vec4 uCrop;
uniform vec2 uSize;        // card size in world units (with border)
uniform float uBorder;     // border width in world units
uniform vec2 uParallax;
uniform float uZoom;
uniform float uFocus;
uniform float uOverscan;
uniform float uOpacity;
uniform float uDim;
uniform float uSat;
uniform float uAge;        // 0 fresh .. 1 faded, grey and scratched
uniform float uKeepRed;
uniform float uSepia;
uniform float uCold;
uniform float uContrast;
uniform float uFlash;
uniform float uSeed;
uniform float uPiece;      // 0 whole; -1 / 1 one side of a crack
uniform float uFullBleed;  // 1 = no border (the photo fills the card)
uniform vec3 uPaper;
varying vec2 vUv;

${noiseGlsl}

float depthAt(vec2 uv) {
  return texture2D(uDepth, uCrop.xy + uv * uCrop.zw).r;
}

// Where a point in the photo at depth h appears, for screen position uv.
vec2 displaced(vec2 uv, float h) {
  float k = h - uFocus;
  return 0.5 + (uv - 0.5 - uParallax * k) / (1.0 + uZoom * k);
}

vec2 march(vec2 uv) {
  const int STEPS = 40;
  float prevH = 1.0;
  float prevDiff = depthAt(displaced(uv, 1.0)) - 1.0;
  for (int i = 1; i <= STEPS; i++) {
    float h = 1.0 - float(i) / float(STEPS);
    vec2 p = displaced(uv, h);
    float diff = depthAt(p) - h;
    if (diff >= 0.0) {
      // Refine between the last miss and this hit.
      float t = prevDiff / (prevDiff - diff);
      return displaced(uv, mix(prevH, h, t));
    }
    prevH = h;
    prevDiff = diff;
  }
  return displaced(uv, 0.0);
}

// Jagged crack across the card, in card-local 0..1 coordinates.
float crack(vec2 p) {
  float line = (p.x - 0.5) - (p.y - 0.5) * 0.35;
  line += (noise(vec2(p.y * 18.0, uSeed)) - 0.5) * 0.06;
  line += (noise(vec2(p.y * 70.0, uSeed + 3.0)) - 0.5) * 0.018;
  return line;
}

void main() {
  vec2 local = vUv * uSize;
  vec2 inner0 = vec2(uBorder) * (1.0 - uFullBleed);
  vec2 innerSize = uSize - 2.0 * inner0;
  vec2 puv = (local - inner0) / innerSize;

  // Paper edge: faintly irregular.
  float edgeNoise = (fbm(local * 9.0 + uSeed) - 0.5) * 0.012;
  vec2 q = min(local, uSize - local);
  float edge = min(q.x, q.y) + edgeNoise;
  float aa = fwidth(edge) * 1.5;
  float alpha = smoothstep(0.0, aa, edge);

  if (uPiece != 0.0) {
    float c = crack(vUv) * uPiece;
    float caa = fwidth(c) * 1.5;
    alpha *= smoothstep(-caa, caa, c);
  }
  if (alpha <= 0.001) discard;

  // The photo, seen through its window.
  vec2 uv = (puv - 0.5) / uOverscan + 0.5;
  vec2 suv = march(uv);
  vec3 col = texture2D(uMap, uCrop.xy + clamp(suv, 0.0, 1.0) * uCrop.zw).rgb;

  // Grade.
  float l = luma(col);
  vec3 grey = vec3(l);
  float redness = smoothstep(0.08, 0.25, col.r - max(col.g, col.b));
  float sat = mix(uSat, 1.0, redness * uKeepRed);
  col = mix(grey, col, sat);
  col = mix(col, l * vec3(1.18, 0.98, 0.74), uSepia * (1.0 - redness * uKeepRed));
  col = mix(col, l * vec3(0.86, 0.96, 1.1), uCold * (1.0 - redness * uKeepRed));
  col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18);

  // Age: lift, flatten, desaturate, scratch.
  float scratch = smoothstep(0.985, 1.0, noise(vec2(puv.x * 400.0 + uSeed, puv.y * 3.0)));
  vec3 aged = mix(vec3(luma(col)), col, 0.25) * 0.75 + 0.03;
  aged += scratch * 0.12;
  col = mix(col, aged, uAge);

  // Paper grain on the emulsion, inner-edge burn.
  float paper = fbm(local * 38.0 + uSeed * 7.0);
  col *= 1.0 + (paper - 0.5) * 0.08;
  vec2 pe = min(puv, 1.0 - puv);
  float burn = smoothstep(0.0, 0.1, min(pe.x, pe.y * 1.5));
  col *= mix(0.72, 1.0, burn);

  // Border.
  float inPhoto = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
  vec3 paperCol = uPaper * (0.9 + paper * 0.14);
  paperCol = mix(paperCol, vec3(luma(paperCol)) * 0.8, uAge * 0.6);
  col = mix(paperCol, col, inPhoto);

  col = mix(col, vec3(1.0), uFlash);
  col *= 1.0 - uDim;
  float a = alpha * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
`;

// Soft drop shadow under a print.
const shadowFragment = /* glsl */ `
uniform vec2 uSize;
uniform float uSoft;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 half_ = uSize * 0.5 - uSoft;
  vec2 d = abs(p) - half_;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  float a = (1.0 - smoothstep(-uSoft * 0.5, uSoft, dist)) * uOpacity;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
`;

// The surface everything sits on: warm aged paper in the past, cold
// concrete-dark now, with a moving pool of light.
const backdropFragment = /* glsl */ `
uniform float uWarm;
uniform float uLight;
uniform float uTime;
uniform vec3 uWarmCol;
uniform vec3 uColdCol;
varying vec2 vUv;
${noiseGlsl}
void main() {
  vec2 p = vUv - 0.5;
  p.x *= 1.8;
  vec3 base = mix(uColdCol, uWarmCol, uWarm);
  float fib = fbm(vUv * vec2(90.0, 30.0)) * 0.5 + fbm(vUv * 12.0 + uTime * 0.01) * 0.5;
  vec2 lp = vec2(sin(uTime * 0.13) * 0.25, cos(uTime * 0.09) * 0.12);
  float pool = exp(-dot(p - lp, p - lp) * 3.2);
  vec3 col = base * (0.55 + fib * 0.5) * (0.35 + pool * 1.1);
  col *= uLight;
  gl_FragColor = vec4(col, 1.0);
}
`;

const premultiplied = (material: ShaderMaterial) => {
  material.blending = CustomBlending;
  material.blendSrc = OneFactor;
  material.blendDst = OneMinusSrcAlphaFactor;
  return material;
};

export const createPrintMaterial = (map: Texture, depth: Texture) =>
  premultiplied(
    new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: printFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: map },
        uDepth: { value: depth },
        uCrop: { value: new Vector4(0, 0, 1, 1) },
        uSize: { value: new Vector2(1, 1) },
        uBorder: { value: 0.12 },
        uParallax: { value: new Vector2() },
        uZoom: { value: 0 },
        uFocus: { value: 0.35 },
        uOverscan: { value: 1.08 },
        uOpacity: { value: 1 },
        uDim: { value: 0 },
        uSat: { value: 1 },
        uAge: { value: 0 },
        uKeepRed: { value: 0 },
        uSepia: { value: 0 },
        uCold: { value: 0 },
        uContrast: { value: 1.1 },
        uFlash: { value: 0 },
        uSeed: { value: 0 },
        uPiece: { value: 0 },
        uFullBleed: { value: 0 },
        uPaper: { value: new Color("#e8dfcc") },
      },
    }),
  );

export const createShadowMaterial = () =>
  premultiplied(
    new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: shadowFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSize: { value: new Vector2(1, 1) },
        uSoft: { value: 0.35 },
        uOpacity: { value: 0.55 },
      },
    }),
  );

export const createBackdropMaterial = () =>
  new ShaderMaterial({
    vertexShader: planeVertex,
    fragmentShader: backdropFragment,
    depthWrite: false,
    uniforms: {
      uWarm: { value: 1 },
      uLight: { value: 1 },
      uTime: { value: 0 },
      uWarmCol: { value: new Color("#5a4128") },
      uColdCol: { value: new Color("#2a2e33") },
    },
  });
