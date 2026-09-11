'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion';
import { soundEngine } from '../../utils/audioEngine';

export interface TearMechanismProps {
  packWidth?: number; // width of pack in px (default 320)
  onTearProgress?: (progress: number) => void; // 0 to 100
  onTearComplete: () => void;
  accentColor?: string;
  disabled?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

interface SparkParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const TearMechanism: React.FC<TearMechanismProps> = ({
  packWidth = 320,
  onTearProgress,
  onTearComplete,
  accentColor = '#F59E0B',
  disabled = false,
  onDragStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const notchX = useMotionValue(0);
  const [tearProgress, setTearProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [sparks, setSparks] = useState<SparkParticle[]>([]);
  const lastRustleTick = useRef<number>(0);

  // Maximum drag distance across the pack width (48px notch width)
  const maxDrag = Math.max(160, packWidth - 48);

  // Spawn particle sparks along the tear notch
  const spawnSparks = useCallback((originX: number, originY: number, count: number = 18) => {
    const colors = ['#FCD34D', '#F59E0B', '#FFFFFF', '#EC4899', '#06B6D4', '#10B981'];
    const newSparks: SparkParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 5 + 2;
      newSparks.push({
        id: Math.random(),
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }

    setSparks((prev) => [...prev.slice(-25), ...newSparks]);
  }, []);

  // Animate particle sparks
  useEffect(() => {
    if (sparks.length === 0) return;
    const interval = setInterval(() => {
      setSparks((prev) =>
        prev
          .map((s) => ({
            ...s,
            x: s.x + s.vx,
            y: s.y + s.vy,
            vy: s.vy + 0.3,
            alpha: s.alpha - 0.06,
          }))
          .filter((s) => s.alpha > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [sparks]);

  // Complete tear sequence trigger
  const completeTearSequence = useCallback(() => {
    if (hasCompleted) return;
    setHasCompleted(true);
    setIsDragging(false);
    onDragStateChange?.(false);
    setTearProgress(1);
    onTearProgress?.(100);

    // Snap notch to end
    notchX.set(maxDrag);

    // Audio & Haptics
    soundEngine.playTearSound();
    soundEngine.playSparkleSound();
    spawnSparks(maxDrag, 16, 36);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 80]);
    }

    setTimeout(() => {
      onTearComplete();
    }, 320);
  }, [hasCompleted, maxDrag, notchX, onDragStateChange, onTearComplete, onTearProgress, spawnSparks]);

  // Reset notch back to beginning if release criteria wasn't met
  const resetNotch = useCallback(() => {
    animate(notchX, 0, {
      type: 'spring',
      stiffness: 280,
      damping: 24,
    });
    setTearProgress(0);
    onTearProgress?.(0);
    setIsDragging(false);
    onDragStateChange?.(false);
  }, [notchX, onDragStateChange, onTearProgress]);

  // Handle pointer down on the yellow notch
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || hasCompleted) return;
    e.stopPropagation();
    setIsDragging(true);
    onDragStateChange?.(true);
    soundEngine.playFoilRustle();
  };

  // On drag motion handler
  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || hasCompleted) return;

    // Calculate container-relative progress accurately
    let currentX = notchX.get();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = info.point.x - rect.left;
      currentX = Math.max(0, Math.min(maxDrag, relativeX));
    }

    const progress = Math.min(1, Math.max(0, currentX / maxDrag));
    setTearProgress(progress);
    onTearProgress?.(progress * 100);

    // Sound effect ticks while ripping
    const now = Date.now();
    if (now - lastRustleTick.current > 70) {
      soundEngine.playFoilRustle();
      lastRustleTick.current = now;
    }

    // Spark particles at the notch tip
    if (Math.random() > 0.45) {
      spawnSparks(currentX, 16, 4);
    }
  };

  // On drag end handler
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || hasCompleted) return;

    const currentX = notchX.get();
    const progress = Math.min(1, Math.max(0, currentX / maxDrag));

    if (progress >= 0.85 || info.velocity.x > 300) {
      completeTearSequence();
    } else {
      resetNotch();
    }
  };

  const currentPixelOffset = tearProgress * maxDrag;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 right-0 h-9 z-40 select-none pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Dynamic Laser Tear Breach Line behind the notch */}
      {tearProgress > 0 && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-300 shadow-[0_0_15px_#f59e0b] rounded-l pointer-events-none transition-all duration-75"
          style={{ width: `${currentPixelOffset}px` }}
        />
      )}

      {/* Sparks Canvas / Particles */}
      {sparks.map((s) => (
        <div
          key={s.id}
          className="absolute pointer-events-none rounded-full shadow-[0_0_6px_currentColor]"
          style={{
            left: `${s.x}px`,
            top: `${s.y}px`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: s.color,
            color: s.color,
            opacity: s.alpha,
          }}
        />
      ))}

      {/* Decoupled Framer Motion Drag Notch */}
      {!hasCompleted && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.02}
          dragMomentum={false}
          style={{ x: notchX }}
          onPointerDown={handlePointerDown}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="absolute top-0.5 left-0 w-12 h-8 rounded-r bg-gradient-to-r from-[#fbbf24] to-[#fef08a] shadow-[0_0_12px_rgba(251,191,36,0.85)] cursor-grab active:cursor-grabbing z-50 flex items-center justify-center select-none"
        >
          {/* Shimmer sweep inside notch */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />

          {/* Typography */}
          <span className="text-[10px] font-black tracking-tight text-black select-none font-mono">
            TEAR ▶
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default TearMechanism;
