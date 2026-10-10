// Pieces every 3D card view shares: the light, and a camera that keeps the content in frame.

import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

export const DEFAULT_LIGHT = new Vector3(-3.5, 4.5, 9);
const FIT_MARGIN = 1.15;

/** Eases the camera distance so the content box fits the viewport. */
export function useCameraFit(contentWidth: number, contentHeight: number): void {
  useFrame((state, delta) => {
    const { camera, size } = state;
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }
    const tanHalfFov = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const aspect = size.width / Math.max(size.height, 1);
    const fitHeight = contentHeight / 2 / tanHalfFov;
    const fitWidth = contentWidth / 2 / (tanHalfFov * aspect);
    const distance = Math.max(fitHeight, fitWidth) * FIT_MARGIN;
    camera.position.z = MathUtils.damp(camera.position.z, distance, 5, delta);
  });
}

/** The scene's light position, eased toward the pointer when `followPointer` is on. The vector is mutated each frame. */
export function useSceneLight(followPointer: boolean): Vector3 {
  const [light] = useState(() => DEFAULT_LIGHT.clone());
  const [target] = useState(() => new Vector3());
  useFrame((state, delta) => {
    if (followPointer) {
      target.set(state.pointer.x * 7, state.pointer.y * 5, DEFAULT_LIGHT.z);
    } else {
      target.copy(DEFAULT_LIGHT);
    }
    light.set(
      MathUtils.damp(light.x, target.x, 5, delta),
      MathUtils.damp(light.y, target.y, 5, delta),
      MathUtils.damp(light.z, target.z, 5, delta),
    );
  });
  return light;
}
