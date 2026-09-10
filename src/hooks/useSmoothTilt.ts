'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
  MotionStyle,
} from 'framer-motion';
import type { CardLightState } from '../types/card';

export type { CardLightState };

export interface UseSmoothTiltOptions {
  /** Maximum rotational angle in degrees (default: 12) */
  maxRotation?: number;
  /** Perspective distance in px (default: 1000) */
  perspective?: number;
  /** Spring physics configuration for inertia and damping */
  springConfig?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
  /** When true, completely disables mouse tracking and resets tilt to 0 */
  disabled?: boolean;
  /** Optional callback fired when hover state changes */
  onHoverChange?: (isHovered: boolean) => void;
}

export interface UseSmoothTiltReturn {
  /** Reactive physically-derived light state bundle for child propagation */
  light: CardLightState;
  /** Inertia-damped rotation along X axis (pitch) */
  rotateX: MotionValue<number>;
  /** Inertia-damped rotation along Y axis (yaw) */
  rotateY: MotionValue<number>;
  /** Physically-mapped Light Center X as percentage string (15% to 85%) */
  lightX: MotionValue<string>;
  /** Physically-mapped Light Center Y as percentage string (85% to 15%) */
  lightY: MotionValue<string>;
  /** Foil Incident Angle theta_foil derived from 3D orientation */
  foilAngle: MotionValue<string>;
  /** Specular Sheen Opacity O_sheen derived from tilt magnitude */
  sheenOpacity: MotionValue<number>;
  /** Dynamic radial-gradient background for specular reflection */
  glareBackground: MotionValue<string>;
  /** Current hover state */
  isHovered: boolean;

  /** Pre-configured style object for the motion element with CSS variables */
  tiltStyle: MotionStyle;
  /** Alias for tiltStyle */
  style: MotionStyle;
  /** Pre-configured style object for the specular glare overlay */
  glareStyle: MotionStyle;

  /** Direct mouse event handlers */
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseEnter: (e?: React.MouseEvent<HTMLElement>) => void;
  handleMouseLeave: (e?: React.MouseEvent<HTMLElement>) => void;

  /** Convenience prop bundle to spread onto the outermost interactive hit container */
  containerProps: {
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void;
  };
}

const DEFAULT_SPRING_CONFIG = { stiffness: 140, damping: 22, mass: 0.6 };

/**
 * Universal Buttery-Smooth 3D Tilt Hook & Derived Light Vector Engine
 * Calculates inertia-damped 3D rotation and derives all surface reflections,
 * holographic sweeps, and specular glares strictly from instantaneous 3D rotation angles.
 */
export function useSmoothTilt({
  maxRotation = 12,
  perspective = 1000,
  springConfig = DEFAULT_SPRING_CONFIG,
  disabled = false,
  onHoverChange,
}: UseSmoothTiltOptions = {}): UseSmoothTiltReturn {
  const [isHovered, setIsHovered] = useState(false);

  // Raw target motion values
  const targetRotateX = useMotionValue(0);
  const targetRotateY = useMotionValue(0);

  // Spring physics for smooth rotational inertia
  const mergedSpringConfig = { ...DEFAULT_SPRING_CONFIG, ...springConfig };
  const rotateX = useSpring(targetRotateX, mergedSpringConfig);
  const rotateY = useSpring(targetRotateY, mergedSpringConfig);

  // Smooth hover presence factor (spring-interpolated for soft fade on leave)
  const targetHoverFactor = useMotionValue(0);
  const hoverFactor = useSpring(targetHoverFactor, { stiffness: 160, damping: 24 });

  // CSS variables for transform rotation
  const rotXDeg = useTransform(rotateX, (v) => `${v.toFixed(2)}deg`);
  const rotYDeg = useTransform(rotateY, (v) => `${v.toFixed(2)}deg`);

  // ============================================================
  // PHYSICALLY-DRIVEN LIGHT MAPPING (DERIVED STRICTLY FROM rotateX & rotateY)
  // ============================================================

  // 1. Light Center X (%): Maps rotateY from [-maxRotation, maxRotation] to [15%, 85%]
  const lightCenterXPct = useTransform(
    rotateY,
    [-maxRotation, maxRotation],
    ['15.0%', '85.0%']
  );

  // 2. Light Center Y (%): Maps rotateX from [-maxRotation, maxRotation] to [85%, 15%]
  const lightCenterYPct = useTransform(
    rotateX,
    [-maxRotation, maxRotation],
    ['85.0%', '15.0%']
  );

  // 3. Foil Incident Angle: theta_foil = 135° + (rotateY / maxRotation * 45°) + (rotateX / maxRotation * 30°)
  const foilAngle = useTransform([rotateX, rotateY], ([rx, ry]: number[]) => {
    const angle = 135 + (ry / maxRotation) * 45 + (rx / maxRotation) * 30;
    return `${angle.toFixed(1)}deg`;
  });

  // 4. Specular Sheen Opacity: M_tilt = sqrt(rx^2 + ry^2) / maxRotation
  //    O_sheen = min(0.85, 0.20 + M_tilt * 0.65) * hoverFactor
  const sheenOpacity = useTransform(
    [rotateX, rotateY, hoverFactor],
    ([rx, ry, hf]: number[]) => {
      if (disabled) return 0;
      const mag = Math.sqrt(rx * rx + ry * ry) / maxRotation;
      const baseSheen = Math.min(0.85, 0.20 + mag * 0.65);
      return Number((baseSheen * hf).toFixed(3));
    }
  );

  const sheenOpacityStr = useTransform(sheenOpacity, (v) => v.toFixed(3));

  // 5. Specular Glare Gradient (glides smoothly with spring rotation)
  const glareBackground = useTransform(
    [lightCenterXPct, lightCenterYPct],
    ([gx, gy]: string[]) =>
      `radial-gradient(circle 240px at ${gx} ${gy}, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.2) 30%, rgba(255, 255, 255, 0.05) 55%, transparent 80%)`
  );

  // Reset to neutral if disabled
  useEffect(() => {
    if (disabled) {
      targetRotateX.set(0);
      targetRotateY.set(0);
      targetHoverFactor.set(0);
      setIsHovered(false);
      onHoverChange?.(false);
    }
  }, [disabled, targetRotateX, targetRotateY, targetHoverFactor, onHoverChange]);

  // Jitter-proof MouseMove coordinate math strictly using currentTarget
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalized coordinates from -0.5 to +0.5
      const normX = Math.max(-0.5, Math.min(0.5, x / rect.width - 0.5));
      const normY = Math.max(-0.5, Math.min(0.5, y / rect.height - 0.5));

      // Clamped rotation targets
      targetRotateX.set(-normY * maxRotation);
      targetRotateY.set(normX * maxRotation);
      targetHoverFactor.set(1);
    },
    [disabled, maxRotation, targetRotateX, targetRotateY, targetHoverFactor]
  );

  const handleMouseEnter = useCallback(
    (_e?: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      setIsHovered(true);
      targetHoverFactor.set(1);
      onHoverChange?.(true);
    },
    [disabled, targetHoverFactor, onHoverChange]
  );

  const handleMouseLeave = useCallback(
    (_e?: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      setIsHovered(false);
      targetHoverFactor.set(0);
      onHoverChange?.(false);

      // Smooth inertia-damped return to neutral (0, 0)
      targetRotateX.set(0);
      targetRotateY.set(0);
    },
    [disabled, targetRotateX, targetRotateY, targetHoverFactor, onHoverChange]
  );

  // Bundled light values for seamless child component propagation
  const light: CardLightState = {
    lightX: lightCenterXPct,
    lightY: lightCenterYPct,
    foilAngle,
    sheenOpacity,
  };

  // Pre-configured style for the tilt container
  const tiltStyle: MotionStyle = {
    rotateX: disabled ? 0 : rotateX,
    rotateY: disabled ? 0 : rotateY,
    transformStyle: 'preserve-3d',
    perspective: `${perspective}px`,
    // Reactive CSS variables fed to child holographic shaders
    ['--rot-x' as string]: disabled ? '0deg' : rotXDeg,
    ['--rot-y' as string]: disabled ? '0deg' : rotYDeg,
    ['--light-x' as string]: lightCenterXPct,
    ['--light-y' as string]: lightCenterYPct,
    ['--foil-angle' as string]: foilAngle,
    ['--sheen-opacity' as string]: disabled ? '0' : sheenOpacityStr,
    ['--glare-x' as string]: lightCenterXPct,
    ['--glare-y' as string]: lightCenterYPct,
    ['--glare-opacity' as string]: disabled ? '0' : sheenOpacityStr,
  };

  // Pre-configured style for specular sheen overlay
  const glareStyle: MotionStyle = {
    background: glareBackground,
    opacity: disabled ? 0 : sheenOpacity,
  };

  return {
    light,
    rotateX,
    rotateY,
    lightX: lightCenterXPct,
    lightY: lightCenterYPct,
    foilAngle,
    sheenOpacity,
    glareBackground,
    isHovered,
    tiltStyle,
    style: tiltStyle,
    glareStyle,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
    containerProps: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

export default useSmoothTilt;
