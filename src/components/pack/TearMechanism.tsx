'use client';

import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../../utils/audio';
import { hapticTearCrimp } from '../../utils/haptics';

export interface TearMechanismProps {
  packWidth?: number;
  onTearStart?: () => void;
  onTearEnd?: () => void;
  onTearComplete: () => void;
}

export const TearMechanism: React.FC<TearMechanismProps> = ({
  packWidth = 320,
  onTearStart,
  onTearEnd,
  onTearComplete,
}) => {
  const notchWidth = 48;
  const maxDragX = packWidth - notchWidth; // 272px

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);
  const hasBreachedRef = useRef(false);
  const lastHapticDistRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hasBreachedRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX - currentDragXRef.current;
    lastHapticDistRef.current = currentDragXRef.current;
    hapticTearCrimp();
    onTearStart?.();
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || hasBreachedRef.current) return;

      const deltaX = e.clientX - startXRef.current;
      // Spring resistance clamp: dampening past bounds
      let clampedX = deltaX;
      if (clampedX < 0) {
        clampedX = clampedX * 0.15; // spring dampening on left drag
      } else if (clampedX > maxDragX) {
        const overshoot = clampedX - maxDragX;
        clampedX = maxDragX + overshoot * 0.15;
      }
      clampedX = Math.max(0, clampedX);

      currentDragXRef.current = clampedX;
      setDragX(clampedX);

      // Micro haptic pulse every 40px of tear progress
      if (Math.abs(clampedX - lastHapticDistRef.current) > 40) {
        hapticTearCrimp();
        lastHapticDistRef.current = clampedX;
      }

      // 85% Breach Threshold (231.2px)
      if (clampedX >= maxDragX * 0.85) {
        hasBreachedRef.current = true;
        isDraggingRef.current = false;
        setIsDragging(false);

        hapticTearCrimp();
        soundEngine.play('tear_pack', 0.9);
        onTearEnd?.();
        onTearComplete();
      }
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current || hasBreachedRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      onTearEnd?.();

      // Snap back if released before 85%
      currentDragXRef.current = 0;
      setDragX(0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [maxDragX, onTearEnd, onTearComplete]);

  if (hasBreachedRef.current) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[14%] z-50 h-8 select-none">
      {/* Real-time laser line track */}
      <div
        className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.95)]"
        style={{ width: `${dragX + 12}px` }}
      />

      {/* Manual Tear Tab with Expanded 54px x 54px Touch Hit Box */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className="pointer-events-auto absolute left-0 top-0 flex h-8 w-12 cursor-grab items-center justify-center rounded-r-md bg-gradient-to-r from-amber-400 to-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.95)] active:cursor-grabbing touch-none select-none"
      >
        {/* Invisible 54px x 54px Thumb Target Area */}
        <div className="absolute -inset-x-1 -inset-y-3 pointer-events-auto cursor-grab active:cursor-grabbing touch-none" />

        <span className="pointer-events-none text-[10px] font-black tracking-tight text-black select-none z-10">
          TEAR ▶
        </span>
      </div>
    </div>
  );
};

export default TearMechanism;
