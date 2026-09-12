'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface MobileTiltState {
  tiltX: number; // Normalized -1.0 to +1.0 (Pitch / Beta: calibrated around 45deg)
  tiltY: number; // Normalized -1.0 to +1.0 (Yaw / Gamma: -20deg to +20deg)
  isSupported: boolean;
  isActive: boolean;
  permissionState: 'default' | 'granted' | 'denied' | 'unsupported';
  requestPermission: () => Promise<boolean>;
}

export function useMobileTilt(enabled: boolean = true): MobileTiltState {
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ tiltX: number; tiltY: number }>({ tiltX: 0, tiltY: 0 });

  // Smoothed tilt reference for low-pass filtering
  const smoothRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Check iOS permission requirement
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.DeviceOrientationEvent) {
      setPermissionState('unsupported');
      return;
    }

    // Check if iOS 13+ permission method exists
    const doe = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof doe.requestPermission !== 'function') {
      // Android or standard browser: permission is granted by default
      setPermissionState('granted');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      setPermissionState('unsupported');
      return false;
    }

    const doe = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof doe.requestPermission === 'function') {
      try {
        const response = await doe.requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } catch (err) {
        console.warn('DeviceOrientation permission error:', err);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('granted');
      return true;
    }
  }, []);

  useEffect(() => {
    if (!enabled || permissionState !== 'granted' || typeof window === 'undefined') {
      setIsActive(false);
      return;
    }

    let hasReceivedEvent = false;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;

      if (!hasReceivedEvent) {
        hasReceivedEvent = true;
        setIsActive(true);
      }

      // Gamma: Left-to-right tilt (+/- 20 degrees)
      const clampedGamma = Math.max(-20, Math.min(20, e.gamma));
      const targetY = clampedGamma / 20;

      // Beta: Front-to-back tilt calibrated to natural 45-degree hand-held angle (+/- 20 degrees)
      const deltaBeta = e.beta - 45;
      const clampedBeta = Math.max(-20, Math.min(20, deltaBeta));
      const targetX = clampedBeta / 20;

      // Low-pass exponential moving average filter (alpha = 0.2) to eliminate sensor jitter
      const alpha = 0.2;
      smoothRef.current.x = smoothRef.current.x + alpha * (targetX - smoothRef.current.x);
      smoothRef.current.y = smoothRef.current.y + alpha * (targetY - smoothRef.current.y);

      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(() => {
          setTilt({
            tiltX: Number(smoothRef.current.x.toFixed(3)),
            tiltY: Number(smoothRef.current.y.toFixed(3)),
          });
          animFrameRef.current = null;
        });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [enabled, permissionState]);

  return {
    tiltX: tilt.tiltX,
    tiltY: tilt.tiltY,
    isSupported: permissionState !== 'unsupported',
    isActive,
    permissionState,
    requestPermission,
  };
}

export default useMobileTilt;
