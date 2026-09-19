'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
  MotionStyle,
} from 'framer-motion';
import type { CardShaderUniforms } from '../types/packCeremony';
import {
  clamp,
  calculateCardShaderUniforms,
  DEFAULT_CARD_SHADER_UNIFORMS,
} from '../utils/shaderMath';

export interface UseCardFoilTiltOptions {
  /** Maximum rotational pitch & yaw angle in degrees (default: 15) */
  maxRotation?: number;
  /** CSS 3D perspective distance in px (default: 1000) */
  perspective?: number;
  /** Spring physics config for smooth rotational inertia & center return */
  springConfig?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
  /** Disables tracking and locks card in neutral center state */
  disabled?: boolean;
  /** Enables DeviceOrientation gyroscope on mobile devices (default: true) */
  enableGyro?: boolean;
  /** Callback fired whenever activeShaderUniforms update */
  onUniformsChange?: (uniforms: CardShaderUniforms) => void;
}

export interface UseCardFoilTiltReturn {
  /** Reactive shader uniforms model for SVG filters and React props */
  uniforms: CardShaderUniforms;
  /** Inertia-damped MotionValue for normalized horizontal tilt [-1.0, 1.0] */
  springTiltX: MotionValue<number>;
  /** Inertia-damped MotionValue for normalized vertical tilt [-1.0, 1.0] */
  springTiltY: MotionValue<number>;
  /** Inertia-damped rotation along X axis (pitch) */
  rotateX: MotionValue<number>;
  /** Inertia-damped rotation along Y axis (yaw) */
  rotateY: MotionValue<number>;
  /** MotionValue string for dynamic holographic refraction angle e.g. "180.0deg" */
  holoAngleStr: MotionValue<string>;
  /** MotionValue string for dynamic specular X coordinate e.g. "50.0%" */
  specularXStr: MotionValue<string>;
  /** MotionValue string for dynamic specular Y coordinate e.g. "50.0%" */
  specularYStr: MotionValue<string>;
  /** MotionValue string for glare intensity [0.0, 1.0] */
  glareOpacityStr: MotionValue<string>;
  /** Whether mouse/touch is actively interacting with the card */
  isHovered: boolean;
  /** Whether gyroscope is actively streaming orientation data */
  isGyroActive: boolean;
  /** Pre-configured MotionStyle with 3D transform and CSS variables */
  tiltStyle: MotionStyle;
  /** Spreadable container event props for pointer tracking */
  containerProps: {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
    onTouchMove: (e: React.TouchEvent<HTMLElement>) => void;
    onTouchEnd: () => void;
  };
  /** Explicit permission requester for iOS 13+ DeviceOrientation */
  requestGyroPermission: () => Promise<boolean>;
  /** Reset tilt back to neutral center (0, 0) */
  resetTilt: () => void;
}

const DEFAULT_SPRING = { stiffness: 140, damping: 25, mass: 0.8 };

/**
 * useCardFoilTilt - Real-time 3D Card Tilt & Holographic Shader Uniforms Engine
 * Bridges mouse pointer motion (desktop) and DeviceOrientation gyroscope (mobile)
 * to normalized -1.0 ... +1.0 tilt vectors, driving reactive CSS variables and
 * procedural SVG filter uniforms at 60fps without React re-render overhead.
 */
export function useCardFoilTilt({
  maxRotation = 15,
  perspective = 1000,
  springConfig = DEFAULT_SPRING,
  disabled = false,
  enableGyro = true,
  onUniformsChange,
}: UseCardFoilTiltOptions = {}): UseCardFoilTiltReturn {
  const [isHovered, setIsHovered] = useState(false);
  const [isGyroActive, setIsGyroActive] = useState(false);
  const [uniforms, setUniforms] = useState<CardShaderUniforms>(DEFAULT_CARD_SHADER_UNIFORMS);

  // Raw instantaneous tilt targets
  const targetTiltX = useMotionValue(0);
  const targetTiltY = useMotionValue(0);

  // Inertia-damped spring values
  const mergedSpring = { ...DEFAULT_SPRING, ...springConfig };
  const springTiltX = useSpring(targetTiltX, mergedSpring);
  const springTiltY = useSpring(targetTiltY, mergedSpring);

  // 3D Pitch and Yaw transformations
  // Moving pointer to the right -> rotate card clockwise around Y (rotateY > 0)
  // Moving pointer to top -> tilt top forward (rotateX > 0)
  const rotateX = useTransform(springTiltY, (y) => (disabled ? 0 : -y * maxRotation));
  const rotateY = useTransform(springTiltX, (x) => (disabled ? 0 : x * maxRotation));

  // CSS variables as MotionValues for 60fps zero-react-render styling
  const rotXDeg = useTransform(rotateX, (v) => `${v.toFixed(2)}deg`);
  const rotYDeg = useTransform(rotateY, (v) => `${v.toFixed(2)}deg`);
  const tiltXStr = useTransform(springTiltX, (v) => (disabled ? '0' : v.toFixed(3)));
  const tiltYStr = useTransform(springTiltY, (v) => (disabled ? '0' : v.toFixed(3)));

  const holoAngleStr = useTransform([springTiltX, springTiltY], ([x, y]: number[]) => {
    if (disabled) return '0deg';
    const computed = calculateCardShaderUniforms(x, y);
    return `${computed.holographicAngle.toFixed(1)}deg`;
  });

  const specularXStr = useTransform(springTiltX, (x) => {
    if (disabled) return '50.0%';
    const computed = calculateCardShaderUniforms(x, 0);
    return `${computed.specularX.toFixed(1)}%`;
  });

  const specularYStr = useTransform(springTiltY, (y) => {
    if (disabled) return '50.0%';
    const computed = calculateCardShaderUniforms(0, y);
    return `${computed.specularY.toFixed(1)}%`;
  });

  const glareOpacityStr = useTransform([springTiltX, springTiltY], ([x, y]: number[]) => {
    if (disabled) return '0';
    const computed = calculateCardShaderUniforms(x, y);
    return computed.glareOpacity.toFixed(3);
  });

  // Keep uniforms state synchronized for SVG filter attributes (<feDistantLight azimuth={...} />)
  const syncUniformsRef = useRef<() => void>(() => {});
  syncUniformsRef.current = () => {
    if (disabled) {
      setUniforms(DEFAULT_CARD_SHADER_UNIFORMS);
      onUniformsChange?.(DEFAULT_CARD_SHADER_UNIFORMS);
      return;
    }
    const currentX = springTiltX.get();
    const currentY = springTiltY.get();
    const newUniforms = calculateCardShaderUniforms(currentX, currentY);
    setUniforms(newUniforms);
    onUniformsChange?.(newUniforms);
  };

  useEffect(() => {
    const unsubX = springTiltX.on('change', () => syncUniformsRef.current());
    const unsubY = springTiltY.on('change', () => syncUniformsRef.current());
    return () => {
      unsubX();
      unsubY();
    };
  }, [springTiltX, springTiltY]);

  // Reset to neutral if disabled
  useEffect(() => {
    if (disabled) {
      targetTiltX.set(0);
      targetTiltY.set(0);
      setIsHovered(false);
      setUniforms(DEFAULT_CARD_SHADER_UNIFORMS);
    }
  }, [disabled, targetTiltX, targetTiltY]);

  // Desktop pointer event handlers
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const normX = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1.0, 1.0);
      const normY = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1.0, 1.0);

      targetTiltX.set(normX);
      targetTiltY.set(normY);
    },
    [disabled, targetTiltX, targetTiltY]
  );

  const handlePointerEnter = useCallback(
    (_e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      setIsHovered(true);
    },
    [disabled]
  );

  const handlePointerLeave = useCallback(
    (_e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      setIsHovered(false);
      targetTiltX.set(0);
      targetTiltY.set(0);
    },
    [disabled, targetTiltX, targetTiltY]
  );

  // Touch event handlers for mobile
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const normX = clamp(((touch.clientX - rect.left) / rect.width) * 2 - 1, -1.0, 1.0);
      const normY = clamp(((touch.clientY - rect.top) / rect.height) * 2 - 1, -1.0, 1.0);

      targetTiltX.set(normX);
      targetTiltY.set(normY);
      setIsHovered(true);
    },
    [disabled, targetTiltX, targetTiltY]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    setIsHovered(false);
    targetTiltX.set(0);
    targetTiltY.set(0);
  }, [disabled, targetTiltX, targetTiltY]);

  // Reset helper
  const resetTilt = useCallback(() => {
    targetTiltX.set(0);
    targetTiltY.set(0);
    setIsHovered(false);
  }, [targetTiltX, targetTiltY]);

  // Mobile Gyroscope Listener
  useEffect(() => {
    if (disabled || !enableGyro || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // If gamma (roll) and beta (pitch) are available
      if (e.gamma !== null && e.beta !== null) {
        setIsGyroActive(true);
        // Roll: gamma is typically -90° to +90°
        const gyroX = clamp(e.gamma / 35, -1.0, 1.0);
        // Pitch: beta is typically -180° to +180°; standard reading angle is ~45°
        const gyroY = clamp((e.beta - 45) / 35, -1.0, 1.0);

        // Only apply if user is not currently overriding with pointer/touch
        if (!isHovered) {
          targetTiltX.set(gyroX);
          targetTiltY.set(gyroY);
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [disabled, enableGyro, isHovered, targetTiltX, targetTiltY]);

  // Explicit iOS 13+ permission requester
  const requestGyroPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const navOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof navOrientation?.requestPermission === 'function') {
      try {
        const response = await navOrientation.requestPermission();
        return response === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  // Pre-configured MotionStyle object feeding GPU transform & CSS variables
  const tiltStyle: MotionStyle = {
    rotateX,
    rotateY,
    transformStyle: 'preserve-3d',
    perspective: `${perspective}px`,
    // Reactive CSS variables fed into card shader layers
    ['--tilt-x' as string]: tiltXStr,
    ['--tilt-y' as string]: tiltYStr,
    ['--rot-x' as string]: rotXDeg,
    ['--rot-y' as string]: rotYDeg,
    ['--holo-angle' as string]: holoAngleStr,
    ['--specular-x' as string]: specularXStr,
    ['--specular-y' as string]: specularYStr,
    ['--glare-opacity' as string]: glareOpacityStr,
  };

  return {
    uniforms,
    springTiltX,
    springTiltY,
    rotateX,
    rotateY,
    holoAngleStr,
    specularXStr,
    specularYStr,
    glareOpacityStr,
    isHovered,
    isGyroActive,
    tiltStyle,
    containerProps: {
      onPointerMove: handlePointerMove,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    requestGyroPermission,
    resetTilt,
  };
}

export default useCardFoilTilt;
