// Small helpers for the light effects: additive materials and colours that stay in display space.

import { AddEquation, Color, CustomBlending, LinearSRGBColorSpace, OneFactor, ShaderMaterial, type IUniform, type ShaderMaterialParameters } from 'three';

/** Light adds up: every effect is drawn with `source + destination`, so overlapping glows get brighter. */
const ADDITIVE: ShaderMaterialParameters = {
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneFactor,
  transparent: true,
  depthTest: false,
  depthWrite: false,
};

export function additiveMaterial(vertexShader: string, fragmentShader: string, uniforms: Record<string, IUniform>): ShaderMaterial {
  return new ShaderMaterial({ ...ADDITIVE, vertexShader, fragmentShader, uniforms });
}

export function uniform<T>(value: T): { value: T } {
  return { value };
}

/**
 * A colour from a hex string that goes to the shader exactly as written. The shaders blend in display (sRGB) space, so the
 * usual conversion to linear light would make every colour too dark.
 */
export function displayColor(hex: string, target: Color = new Color()): Color {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return target.setRGB(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, LinearSRGBColorSpace);
}

/** A bright colour that cycles through the rainbow, one round per `1 / speed` seconds. */
export function rainbowColor(time: number, speed = 0.5, target: Color = new Color()): Color {
  const t = time * speed;
  const channel = (offset: number) => 0.55 + 0.45 * Math.cos(2 * Math.PI * (t + offset));
  return target.setRGB(channel(0), channel(1 / 3), channel(2 / 3), LinearSRGBColorSpace);
}
