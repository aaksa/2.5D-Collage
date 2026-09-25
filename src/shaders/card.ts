import {
  Color,
  CustomBlending,
  DstColorFactor,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OneMinusSrcColorFactor,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector4,
} from "three";
import { noiseGlsl, planeVertex } from "./common";

export const TREATMENTS = ["mono", "duotone", "threshold", "color"] as const;
export type Treatment = (typeof TREATMENTS)[number];
export type BlendMode = "normal" | "screen" | "multiply" | "add";

export const MAX_VERTS = 12;

// A printed photo: polygon mask with torn edges, crop, colour treatment,
// paper texture, optional border and a built-in blur for depth of field.
// Output is premultiplied so every blend mode composites correctly.
const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uFill;
uniform vec4 uCrop;
uniform vec2 uVerts[${MAX_VERTS}];
uniform int uCount;
uniform float uAspect;
uniform float uRough;
uniform float uBorder;
uniform float uBlur;
uniform float uBias;
uniform float uOpacity;
uniform float uContrast;
uniform float uBrightness;
uniform float uPaper;
uniform float uSeed;
uniform float uShade;
uniform float uUseAlpha;
uniform float uShadow;
uniform float uTreatment;
uniform vec3 uDark;
uniform vec3 uLight;
uniform vec3 uPaperColor;
uniform vec2 uInner;
uniform float uDamage;
uniform vec3 uTint;
uniform float uTintAmount;
uniform float uPad; // extra plane around the card, in card heights
uniform float uSelect; // Figma-style selection frame, 0..1
uniform float uPx; // card-height units per screen pixel
uniform vec3 uSelColor;
varying vec2 vUv;

${noiseGlsl}

// Signed distance to the mask polygon (negative inside), after Inigo Quilez.
float sdPolygon(vec2 p) {
  float d = dot(p - uVerts[0], p - uVerts[0]);
  float s = 1.0;
  for (int i = 0; i < ${MAX_VERTS}; i++) {
    if (i >= uCount) break;
    int j = i == 0 ? uCount - 1 : i - 1;
    vec2 vi = uVerts[i];
    vec2 vj = uVerts[j];
    vec2 e = vj - vi;
    vec2 w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
  }
  return s * sqrt(d);
}

vec4 sampleBlurred(vec2 uv, vec2 r) {
  vec4 acc = texture2D(uMap, uv, uBias) * 0.2;
  acc += texture2D(uMap, uv + r * vec2(-0.326, -0.406), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(-0.840, -0.074), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(-0.696, 0.457), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(-0.203, 0.621), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(0.962, -0.195), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(0.473, -0.480), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(0.519, 0.767), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(0.185, -0.893), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(0.507, 0.064), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(0.896, 0.412), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(-0.322, -0.933), uBias) * 0.0667;
  acc += texture2D(uMap, uv + r * vec2(-0.792, -0.598), uBias) * 0.0667;
  return acc;
}

void main() {
  // Work in card-height units so edges and borders are even on all sides.
  // The plane is padded by uPad so the selection handles can sit outside.
  vec2 p = vec2(vUv.x * (uAspect + 2.0 * uPad), vUv.y * (1.0 + 2.0 * uPad)) - uPad;
  vec2 uv = vec2(p.x / uAspect, p.y);
  float d = sdPolygon(p);
  d += (fbm(p * 26.0 + uSeed) - 0.5) * uRough;
  d += (noise(p * 140.0 + uSeed) - 0.5) * uRough * 0.35;
  float aa = fwidth(d) * 1.2 + uBlur * 0.6;

  if (uShadow > 0.5) {
    float a = (1.0 - smoothstep(-aa - 0.05, aa + 0.05, d)) * uOpacity * 0.42;
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }

  float alpha = 1.0 - smoothstep(-aa, aa, d);
  vec4 tex = vec4(uFill, 1.0);
  if (uHasMap > 0.5) {
    // uInner slides the photo inside its frame: parallax within the card.
    vec2 iuv = uCrop.xy + uInner + uv * uCrop.zw;
    tex = sampleBlurred(iuv, vec2(uBlur / uAspect, uBlur) * uCrop.zw);
  }

  vec3 col = tex.rgb;
  float l = luma(col);
  // Contrast pivots on linear mid-grey; then crush the blacks.
  float lc = clamp((l - 0.18) * uContrast + 0.18 + uBrightness, 0.0, 1.4);
  lc = smoothstep(0.015, 1.0, lc);
  if (uTreatment < 0.5) {
    col = vec3(lc);
  } else if (uTreatment < 1.5) {
    col = mix(uDark, uLight, lc);
  } else if (uTreatment < 2.5) {
    float grit = (hash(uv * 911.0 + uSeed) - 0.5) * 0.07;
    col = mix(uDark, uPaperColor, smoothstep(0.15, 0.21, lc + grit));
  } else {
    col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18 + uBrightness);
  }

  // Decay: murky wash, then grime, burn and crushed contrast.
  col = mix(col, vec3(luma(col)) * uTint * 1.6, uTintAmount);
  if (uDamage > 0.0) {
    vec2 q = vec2(uv.x * uAspect, uv.y);
    float grime = fbm(q * 7.0 + uSeed * 1.7);
    float burn = smoothstep(0.35, 0.75, fbm(q * 2.3 + uSeed) + grime * 0.3);
    col = mix(col, max(vec3(0.0), (col - 0.12) * 1.7), uDamage * 0.7);
    col *= 1.0 - uDamage * (0.35 + 0.5 * burn * grime);
    float scratch = smoothstep(0.985, 1.0, noise(vec2(q.x * 260.0, q.y * 4.0) + uSeed));
    col += scratch * uDamage * 0.25;
  }

  float paper = fbm(vec2(uv.x * uAspect, uv.y) * 55.0 + uSeed * 3.0);
  col *= 1.0 + (paper - 0.5) * uPaper;
  if (uBorder > 0.0) {
    float b = smoothstep(-uBorder - aa, -uBorder + aa, d);
    col = mix(col, uPaperColor * (0.9 + paper * 0.12), b);
  }
  col *= uShade;

  float a = alpha * uOpacity * (uUseAlpha > 0.5 ? tex.a : 1.0);
  vec4 base = vec4(col * a, a);

  // Selection frame, as in a design tool: a 1.5px outline, square handles
  // on the corners and round radius handles just inside them.
  if (uSelect > 0.001) {
    vec2 hb = vec2(uAspect, 1.0) * 0.5;
    vec2 dq = abs(p - hb) - hb;
    float box = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0);
    float px = uPx;
    float lw = 1.0 * px;
    float line = 1.0 - smoothstep(lw, lw + px, abs(box));
    float fill = 0.0;
    float edge = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 c = vec2(i == 1 || i == 3 ? uAspect : 0.0, i >= 2 ? 1.0 : 0.0);
      vec2 r = abs(p - c);
      float sq = max(r.x, r.y) - 6.0 * px;
      fill = max(fill, 1.0 - smoothstep(0.0, px, sq));
      edge = max(edge, 1.0 - smoothstep(lw, lw + px, abs(sq)));
      vec2 cc = c + sign(hb - c) * 20.0 * px;
      float rd = length(p - cc) - 6.0 * px;
      fill = max(fill, 1.0 - smoothstep(0.0, px, rd));
      edge = max(edge, 1.0 - smoothstep(lw, lw + px, abs(rd)));
    }
    float oa = max(line, fill) * uSelect * uOpacity;
    vec3 oc = mix(uSelColor, vec3(1.0), fill * (1.0 - edge));
    base = vec4(oc * oa + base.rgb * (1.0 - oa), oa + base.a * (1.0 - oa));
  }
  gl_FragColor = base;
}
`;

export const setBlend = (material: ShaderMaterial, mode: BlendMode) => {
  material.blending = CustomBlending;
  material.blendSrc = mode === "multiply" ? DstColorFactor : OneFactor;
  material.blendDst =
    mode === "add"
      ? OneFactor
      : mode === "screen"
        ? OneMinusSrcColorFactor
        : OneMinusSrcAlphaFactor;
};

export const createCardMaterial = (opts: {
  map?: Texture;
  fill?: Color;
  shadow?: boolean;
}) => {
  const material = new ShaderMaterial({
    vertexShader: planeVertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: opts.map ?? null },
      uHasMap: { value: opts.map ? 1 : 0 },
      uFill: { value: opts.fill ?? new Color(1, 1, 1) },
      uCrop: { value: new Vector4(0, 0, 1, 1) },
      uVerts: {
        value: new Array(MAX_VERTS).fill(0).map(() => new Vector2()),
      },
      uCount: { value: 4 },
      uAspect: { value: 1 },
      uRough: { value: 0.01 },
      uBorder: { value: 0 },
      uBlur: { value: 0 },
      uBias: { value: 0 },
      uOpacity: { value: 1 },
      uContrast: { value: 1.2 },
      uBrightness: { value: 0 },
      uPaper: { value: 0.08 },
      uSeed: { value: 0 },
      uShade: { value: 1 },
      uUseAlpha: { value: 0 },
      uShadow: { value: opts.shadow ? 1 : 0 },
      uTreatment: { value: 0 },
      uDark: { value: new Color("#0b0a09") },
      uLight: { value: new Color("#e9e4da") },
      uPaperColor: { value: new Color("#ebe6dc") },
      uInner: { value: new Vector2() },
      uDamage: { value: 0 },
      uTint: { value: new Color("#6b5a3e") },
      uTintAmount: { value: 0 },
      uPad: { value: 0 },
      uSelect: { value: 0 },
      uPx: { value: 0.002 },
      uSelColor: { value: new Color("#0d99ff") },
    },
  });
  setBlend(material, "normal");
  return material;
};
