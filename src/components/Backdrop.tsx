import { useMemo, useRef } from "react";
import { Mesh, ShaderMaterial, Vector3 } from "three";
import { useParallax } from "../hooks/useParallax";
import { noiseGlsl, planeVertex } from "../shaders/common";
import { useScene, useTimeline } from "./SceneContext";

// Near-black, never flat: a faint warm lift behind the subject and a
// slow-moving mottling you feel more than see.
export const Backdrop: React.FC = () => {
  const { settings } = useScene();
  const mesh = useRef<Mesh>(null);
  const parallaxOffset = useParallax(0.05);
  const offset = useMemo(() => new Vector3(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: /* glsl */ `
          uniform vec3 uBase;
          uniform float uTime;
          varying vec2 vUv;
          ${noiseGlsl}
          void main() {
            vec2 p = vUv - vec2(0.56, 0.54);
            float glow = exp(-dot(p * vec2(1.6, 2.4), p * vec2(1.6, 2.4)) * 5.0);
            float mottle = fbm(vUv * 7.0 + vec2(uTime * 0.0015, 0.0));
            vec3 col = uBase * (0.85 + mottle * 0.25);
            col += vec3(0.006, 0.0045, 0.003) * glow;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        uniforms: {
          uBase: { value: settings.background.clone() },
          uTime: { value: 0 },
        },
        depthWrite: false,
      }),
    [settings],
  );

  useTimeline((t) => {
    material.uniforms.uTime.value = t;
    parallaxOffset(offset);
    mesh.current?.position.set(offset.x, offset.y, -48 + offset.z);
  });

  return (
    <mesh ref={mesh} material={material} scale={[160, 90, 1]} renderOrder={-3}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};
