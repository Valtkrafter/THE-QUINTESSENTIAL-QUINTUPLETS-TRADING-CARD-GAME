'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../utils/audio';
import { hapticTearCrimp, hapticLight } from '../../utils/haptics';
import {
  calculateTearProgress,
  isTearBreached,
  TEAR_BREACH_THRESHOLD,
} from '../../utils/shaderMath';
import { usePackCeremonyStore } from '../../store/usePackCeremonyStore';

export interface FoilTearCrimpProps {
  packWidth?: number;
  onTearStart?: () => void;
  onTearProgress?: (progress: number) => void;
  onTearEnd?: () => void;
  onTearComplete?: () => void;
  onScreenShake?: (active: boolean) => void;
  isBreached?: boolean;
  className?: string;
  renderTopCrimpContent?: () => React.ReactNode;
}

// Authentic shredded jagged foil path
const JAGGED_TEAR_PATH =
  'M 0 0 L 12 3 L 24 -2 L 36 4 L 48 -3 L 60 2 L 72 -4 L 84 3 L 96 -2 L 108 4 L 120 -3 L 132 2 L 144 -4 L 156 3 L 168 -2 L 180 4 L 192 -3 L 204 2 L 216 -4 L 228 3 L 240 -2 L 252 4 L 264 -3 L 276 2 L 288 -4 L 300 3 L 312 -2 L 324 4 L 340 0';

export const FoilTearCrimp: React.FC<FoilTearCrimpProps> = ({
  packWidth = 320,
  onTearStart,
  onTearProgress,
  onTearEnd,
  onTearComplete,
  onScreenShake,
  isBreached: externalIsBreached = false,
  className = '',
  renderTopCrimpContent,
}) => {
  const storeBreached = usePackCeremonyStore((s) => s.isBreached);
  const effectiveBreached = externalIsBreached || storeBreached;

  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [localBreached, setLocalBreached] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);
  const hasBreachedRef = useRef(false);

  const isActuallyBreached = effectiveBreached || localBreached;

  // Sync external reset
  useEffect(() => {
    if (!effectiveBreached) {
      setLocalBreached(false);
      hasBreachedRef.current = false;
      setDragProgress(0);
      currentDragXRef.current = 0;
    }
  }, [effectiveBreached]);

  const executeBreach = useCallback(() => {
    if (hasBreachedRef.current) return;
    hasBreachedRef.current = true;
    isDraggingRef.current = false;
    setIsDragging(false);
    setLocalBreached(true);
    setDragProgress(1.0);

    // 1. Tactile haptics
    hapticTearCrimp();

    // 2. Procedural Web Audio snap
    soundEngine.play('tear_pack', 0.9);

    // 3. Store state transition
    usePackCeremonyStore.getState().breachCrimp();

    // 4. Screen shake impact (8px displacement, 140ms duration)
    onScreenShake?.(true);
    setTimeout(() => {
      onScreenShake?.(false);
    }, 140);

    onTearEnd?.();
    onTearComplete?.();
  }, [onScreenShake, onTearEnd, onTearComplete]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hasBreachedRef.current || isActuallyBreached) return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX - currentDragXRef.current;

    hapticLight();
    usePackCeremonyStore.getState().startTear();
    onTearStart?.();
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || hasBreachedRef.current) return;

      const deltaX = Math.max(0, e.clientX - startXRef.current);
      currentDragXRef.current = deltaX;

      const progress = calculateTearProgress(deltaX, packWidth);
      setDragProgress(progress);
      onTearProgress?.(progress);

      usePackCeremonyStore.getState().updateTear(deltaX, packWidth);

      // Check breach threshold: >= 0.82
      if (isTearBreached(progress)) {
        executeBreach();
      }
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current || hasBreachedRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);
      onTearEnd?.();

      // Elastic snap-back if released before threshold (0.82)
      currentDragXRef.current = 0;
      setDragProgress(0);
      onTearProgress?.(0);
      usePackCeremonyStore.getState().updateTear(0, packWidth);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [packWidth, onTearProgress, onTearEnd, executeBreach]);

  // Visual calculations during tearing (0 -> 0.82)
  const tearX = dragProgress * (packWidth * 0.85);
  const flapRotationZ = -dragProgress * 18; // Rotates up to -18deg
  const flapPullY = -dragProgress * 16; // Pulls open upwards up to -16px

  return (
    <div
      className={`absolute inset-x-0 top-0 pointer-events-none select-none z-50 ${className}`}
      style={{ height: '44px' }}
    >
      {/* SEVERED TOP FLAP VOLUME (Top Crimp Flap from 0px to 44px) */}
      <AnimatePresence>
        {!isActuallyBreached ? (
          <motion.div
            key="top-crimp-attached"
            className="absolute inset-x-0 top-0 h-[44px] pointer-events-none select-none origin-bottom-right"
            style={{
              rotateZ: flapRotationZ,
              y: flapPullY,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {renderTopCrimpContent && renderTopCrimpContent()}
          </motion.div>
        ) : (
          <motion.div
            key="top-crimp-detached"
            initial={{ y: flapPullY, rotateZ: flapRotationZ, opacity: 1, scale: 1 }}
            animate={{
              y: -220,
              x: 45,
              rotateZ: -28,
              opacity: 0,
              scale: 0.92,
            }}
            transition={{
              duration: 0.38,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="absolute inset-x-0 top-0 h-[44px] pointer-events-none select-none origin-bottom-right"
          >
            {renderTopCrimpContent && renderTopCrimpContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* VECTOR PERFORATION SEAM & NOTCH (Mounted only while unbreached) */}
      {!isActuallyBreached && (
        <div
          className="absolute inset-x-0 top-[44px] -translate-y-1/2 h-[48px] pointer-events-none select-none flex items-center"
          style={{ width: `${packWidth}px` }}
        >
          {/* 1. Neon Dashed Laser Perforation Line Across Full Foil Width */}
          <svg
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-4 pointer-events-none overflow-visible"
            viewBox={`0 0 ${packWidth} 16`}
            fill="none"
          >
            {/* Guide line */}
            <line
              x1="0"
              y1="8"
              x2={packWidth}
              y2="8"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
              filter="drop-shadow(0 0 4px rgba(251, 191, 36, 0.7))"
            />

            {/* Unmasked Jagged Foil Path from Left to Current Tear Position */}
            <g clipPath={`url(#tear-progress-clip-${packWidth})`}>
              <clipPath id={`tear-progress-clip-${packWidth}`}>
                <rect x="0" y="0" width={Math.max(0, tearX)} height="16" />
              </clipPath>

              {/* Metallic Silver Shredded Edge */}
              <path
                d={JAGGED_TEAR_PATH}
                transform="translate(0, 8)"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
                filter="drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))"
              />

              {/* Golden Laser Core */}
              <path
                d={JAGGED_TEAR_PATH}
                transform="translate(0, 8)"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="1"
                filter="drop-shadow(0 0 6px #f59e0b)"
              />
            </g>
          </svg>

          {/* 2. Floating Golden Chevron Tear Tab Notch */}
          <div
            onPointerDown={handlePointerDown}
            style={{
              transform: `translateX(${tearX}px)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}
            className="pointer-events-auto absolute left-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none z-50"
          >
            {/* Expanding Pulsing Touch Hitbox (48px x 48px) */}
            <div className="relative w-[48px] h-[48px] flex items-center justify-center">
              {/* Idle Pulsing Radar Ring */}
              {!isDragging && (
                <span className="absolute inset-1 rounded-lg bg-amber-400/25 animate-ping pointer-events-none" />
              )}

              {/* Chevron Tab Capsule */}
              <div className="relative flex items-center justify-center h-8 px-2.5 rounded-r-lg rounded-l-xs bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-zinc-950 font-black font-mono text-[10px] tracking-wider shadow-[0_0_16px_rgba(251,191,36,0.9)] border-y border-r border-amber-200">
                <span className="drop-shadow-sm flex items-center gap-0.5 whitespace-nowrap select-none">
                  TEAR ▶
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoilTearCrimp;
