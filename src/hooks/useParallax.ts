import { useCallback } from "react";
import { Vector3 } from "three";
import { useScene } from "../components/SceneContext";

// The scene is real 3D, so depth already produces parallax. `strength`
// art-directs it: 1 is physically static in space, below 1 the object is
// partly carried along with the camera (calmer), above 1 it counter-moves
// (exaggerated depth). The global parallaxIntensity scales every layer.
export const useParallax = (strength: number) => {
  const { rig, settings } = useScene();
  return useCallback(
    (out: Vector3) =>
      out
        .copy(rig.position)
        .sub(rig.rest)
        .multiplyScalar(1 - strength * settings.parallaxIntensity),
    [rig, settings, strength],
  );
};
