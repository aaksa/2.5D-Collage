import { useMemo } from "react";
import { random } from "remotion";
import {
  BufferGeometry,
  CustomBlending,
  Float32BufferAttribute,
  OneFactor,
  ShaderMaterial,
} from "three";
import { useScene, useTimeline } from "./SceneContext";

// Sparse dust at many depths. Near motes are big, soft and dim (bokeh);
// far ones are fine points. Each drifts on its own slow current.
const vertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aWarm;
uniform float uTime;
uniform float uScale;
varying float vWarm;
varying float vSoft;
varying float vFade;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.011 + aPhase) * 0.12 + sin(uTime * 0.027 + aPhase * 2.1) * 0.04;
  p.y += sin(uTime * 0.009 + aPhase * 1.7) * 0.1 + uTime * 0.0012;
  p.z += cos(uTime * 0.007 + aPhase * 0.6) * 0.1;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  gl_PointSize = aSize * uScale / dist;
  vSoft = clamp((3.2 - dist) / 2.4, 0.0, 1.0);
  gl_PointSize += vSoft * 26.0;
  vFade = smoothstep(46.0, 30.0, dist) * smoothstep(0.35, 1.0, dist);
  vWarm = aWarm;
  gl_Position = projectionMatrix * mv;
}
`;

const fragment = /* glsl */ `
uniform vec3 uWarm;
varying float vWarm;
varying float vSoft;
varying float vFade;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float sharp = smoothstep(0.5, 0.1, r);
  float bokeh = smoothstep(0.5, 0.42, r) * 0.55 + smoothstep(0.42, 0.0, r) * 0.25;
  float a = mix(sharp, bokeh * 0.35, vSoft) * vFade;
  vec3 col = mix(vec3(1.0, 0.98, 0.95), uWarm, vWarm);
  gl_FragColor = vec4(col * a, a);
}
`;

// Drawn in two passes: deep dust before the cards, near dust after them.
export const ParticleField: React.FC<{
  count?: number;
  range: "far" | "near";
}> = ({ count = 170, range }) => {
  const { settings } = useScene();
  const { geometry, material } = useMemo(() => {
    const positions: number[] = [];
    const sizes: number[] = [];
    const phases: number[] = [];
    const warm: number[] = [];
    for (let i = 0; i < count; i++) {
      const r = (k: string) => random(`dust-${i}-${k}`);
      // Mostly deep space, a few in the midground, a handful near the lens.
      const layer = r("layer");
      const z =
        layer < 0.6
          ? -20 - r("z") * 22
          : layer < 0.93
            ? -1 - r("z") * 14
            : 1 + r("z") * 2.6;
      if (z < -1.5 !== (range === "far")) continue;
      const spread = 3 + Math.abs(z - 7) * 0.62;
      positions.push(
        (r("x") - 0.4) * spread * 2,
        (r("y") - 0.5) * spread * 1.2,
        z,
      );
      sizes.push(1.4 + r("s") ** 3 * 5);
      phases.push(r("p") * Math.PI * 2);
      warm.push(r("w") < 0.25 ? 1 : 0);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
    g.setAttribute("aPhase", new Float32BufferAttribute(phases, 1));
    g.setAttribute("aWarm", new Float32BufferAttribute(warm, 1));
    const m = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 10 },
        uWarm: {
          value: settings.highlight.clone().lerp(settings.accent, 0.25),
        },
      },
    });
    return { geometry: g, material: m };
  }, [count, settings, range]);

  useTimeline((t) => {
    material.uniforms.uTime.value = t;
  });

  return (
    <points
      geometry={geometry}
      material={material}
      renderOrder={range === "far" ? -2 : 5}
      frustumCulled={false}
    />
  );
};
