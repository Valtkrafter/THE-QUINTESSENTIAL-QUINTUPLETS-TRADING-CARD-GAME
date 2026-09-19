/**
 * TQQ Vault - Shader Uniform Mathematics & 3D Pack Opening Calculations
 * Pure mathematical functions for tilt vectors, refraction angles, specular hotspots,
 * and tear thresholds.
 */

import type { CardShaderUniforms } from '../types/packCeremony';

/**
 * Strictly clamps a numeric value within [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(`clamp error: min (${min}) cannot be greater than max (${max})`);
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Holographic Dynamic Refraction Angle:
 * H(θx, θy) = (atan2(θy, θx) * (180 / π) + 360) mod 360
 * Returns angle in degrees [0, 360).
 */
export function calculateHolographicAngle(tiltX: number, tiltY: number): number {
  const rad = Math.atan2(tiltY, tiltX);
  const deg = (rad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * Specular Hotspot Projection along X-axis:
 * Sx(θx) = clamp(50 + (θx * 40), 0, 100)
 */
export function calculateSpecularX(tiltX: number): number {
  return clamp(50 + tiltX * 40, 0, 100);
}

/**
 * Specular Hotspot Projection along Y-axis:
 * Sy(θy) = clamp(50 + (θy * 40), 0, 100)
 */
export function calculateSpecularY(tiltY: number): number {
  return clamp(50 + tiltY * 40, 0, 100);
}

/**
 * Specular Hotspot Projection:
 * Computes { x, y } percentage coordinates on the card surface [0, 100].
 */
export function calculateSpecularHotspot(
  tiltX: number,
  tiltY: number
): { x: number; y: number } {
  return {
    x: calculateSpecularX(tiltX),
    y: calculateSpecularY(tiltY),
  };
}

/**
 * Glare Intensity Envelope:
 * G(θx, θy) = clamp(sqrt(θx^2 + θy^2) * 0.75, 0.0, 1.0)
 */
export function calculateGlareIntensity(tiltX: number, tiltY: number): number {
  const magnitude = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
  return clamp(magnitude * 0.75, 0.0, 1.0);
}

/**
 * Strict Tear Breach Threshold:
 * Pack perforation severing triggers strictly at progress >= 0.82.
 */
export const TEAR_BREACH_THRESHOLD = 0.82;

/**
 * Tear Progress Clamp:
 * progress = clamp(deltaX / (packWidth * 0.85), 0.0, 1.0)
 * where deltaX = pointerX - startX.
 */
export function calculateTearProgress(deltaX: number, packWidth: number): number {
  if (packWidth <= 0) return 0;
  const denominator = packWidth * 0.85;
  return clamp(deltaX / denominator, 0.0, 1.0);
}

/**
 * Convenience calculation using absolute pointer coordinates:
 * progress = clamp((pointerX - startX) / (packWidth * 0.85), 0.0, 1.0)
 */
export function calculateTearProgressFromPointer(
  pointerX: number,
  startX: number,
  packWidth: number
): number {
  return calculateTearProgress(pointerX - startX, packWidth);
}

/**
 * Evaluates whether tear progress has breached the separation threshold (0.82).
 */
export function isTearBreached(progress: number): boolean {
  return progress >= TEAR_BREACH_THRESHOLD;
}

/**
 * Default neutral shader uniforms for card surfaces.
 */
export const DEFAULT_CARD_SHADER_UNIFORMS: CardShaderUniforms = {
  tiltX: 0,
  tiltY: 0,
  glareOpacity: 0,
  specularX: 50,
  specularY: 50,
  holographicAngle: 0,
};

/**
 * Aggregates all mathematical uniform evaluations into a complete CardShaderUniforms model.
 * Clamps input tilt vectors to [-1.0, 1.0].
 */
export function calculateCardShaderUniforms(
  tiltX: number,
  tiltY: number
): CardShaderUniforms {
  const clampedTiltX = clamp(tiltX, -1.0, 1.0);
  const clampedTiltY = clamp(tiltY, -1.0, 1.0);

  return {
    tiltX: clampedTiltX,
    tiltY: clampedTiltY,
    glareOpacity: calculateGlareIntensity(clampedTiltX, clampedTiltY),
    specularX: calculateSpecularX(clampedTiltX),
    specularY: calculateSpecularY(clampedTiltY),
    holographicAngle: calculateHolographicAngle(clampedTiltX, clampedTiltY),
  };
}
