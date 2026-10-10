import { MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, Vector2, Vector3, Vector4, type Texture } from 'three';
import { CARD_ASPECT } from './cardGeometry';
import { ART_BOX } from './finishes';
import { cardBackFragmentShader, cardFrontFragmentShader, cardVertexShader } from './shaders';

// Uniform maps are typed here so per-frame updates never go through three's loosely typed `uniforms` record.

export type FrontUniforms = {
  uMap: { value: Texture | null };
  uMask: { value: Texture | null };
  uMapTransform: { value: Vector4 };
  uHasMask: { value: number };
  uMaskMode: { value: number };
  uArtBox: { value: Vector4 };
  uFrameInset: { value: Vector2 };
  uPremium: { value: number };
  uFinish: { value: number };
  uIntensity: { value: number };
  uGlare: { value: number };
  uHover: { value: number };
  uPointer: { value: Vector2 };
  uTime: { value: number };
  uCameraLocal: { value: Vector3 };
  uLightLocal: { value: Vector3 };
  uAspect: { value: number };
};

export type BackUniforms = {
  uBackMap: { value: Texture | null };
  uHasBackMap: { value: number };
  uBackTransform: { value: Vector4 };
  uIntensity: { value: number };
  uCameraLocal: { value: Vector3 };
  uLightLocal: { value: Vector3 };
  uAspect: { value: number };
};

export interface CardShader<TUniforms> {
  readonly material: ShaderMaterial;
  readonly uniforms: TUniforms;
}

export function createFrontShader(): CardShader<FrontUniforms> {
  const uniforms: FrontUniforms = {
    uMap: { value: null },
    uMask: { value: null },
    uMapTransform: { value: new Vector4(1, 1, 0, 0) },
    uHasMask: { value: 0 },
    uMaskMode: { value: 0 },
    uArtBox: { value: new Vector4(ART_BOX.minU, ART_BOX.minV, ART_BOX.maxU, ART_BOX.maxV) },
    uFrameInset: { value: new Vector2(0, 0) },
    uPremium: { value: 0 },
    uFinish: { value: 0 },
    uIntensity: { value: 1 },
    uGlare: { value: 0.6 },
    uHover: { value: 0 },
    uPointer: { value: new Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uCameraLocal: { value: new Vector3(0, 0, 10) },
    uLightLocal: { value: new Vector3(0, 0, 10) },
    uAspect: { value: CARD_ASPECT },
  };
  const material = new ShaderMaterial({
    vertexShader: cardVertexShader,
    fragmentShader: cardFrontFragmentShader,
    uniforms,
  });
  return { material, uniforms };
}

export function createBackShader(): CardShader<BackUniforms> {
  const uniforms: BackUniforms = {
    uBackMap: { value: null },
    uHasBackMap: { value: 0 },
    uBackTransform: { value: new Vector4(1, 1, 0, 0) },
    uIntensity: { value: 1 },
    uCameraLocal: { value: new Vector3(0, 0, -10) },
    uLightLocal: { value: new Vector3(0, 0, -10) },
    uAspect: { value: CARD_ASPECT },
  };
  const material = new ShaderMaterial({
    vertexShader: cardVertexShader,
    fragmentShader: cardBackFragmentShader,
    uniforms,
  });
  return { material, uniforms };
}

/** Material slots for the extruded edge: [caps, side walls]. Caps are hidden because the face meshes cover them. */
export function createEdgeMaterials(): [MeshBasicMaterial, MeshStandardMaterial] {
  return [
    new MeshBasicMaterial({ visible: false }),
    new MeshStandardMaterial({ color: '#e6e1d8', roughness: 0.7, metalness: 0 }),
  ];
}
