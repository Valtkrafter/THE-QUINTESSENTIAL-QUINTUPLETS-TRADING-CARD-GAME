'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [hasCompleted, setHasCompleted] = useState(false);
  const [sparks, setSparks] = useState<SparkParticle[]>([]);
  const lastRustleTick = useRef<number>(0);

  // Maximum drag distance across the pack width
  const maxDrag = Math.max(180, packWidth - 44);

  // Spawn particle sparks along the tear notch
  const spawnSparks = useCallback((originX: number, originY: number, count: number = 24) => {
    const colors = ['#FCD34D', '#F59E0B', '#FFFFFF', '#EC4899', '#06B6D4', '#10B981'];
    const newSparks: SparkParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 6 + 2;
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

    setSparks((prev) => [...prev.slice(-30), ...newSparks]);
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
            alpha: s.alpha - 0.05,
          }))
          .filter((s) => s.alpha > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [sparks]);

  // Handle pointer down drag start
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || hasCompleted) return;
    e.stopPropagation();
    e.preventDefault();

    setIsDragging(true);
    onDragStateChange?.(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    soundEngine.playFoilRustle();
  };

  // Handle pointer move during drag
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || hasCompleted || !containerRef.current) return;
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const rawPct = (currentX / maxDrag) * 100;
    const clamped = Math.max(0, Math.min(100, rawPct));

    setProgress(clamped);
    onTearProgress?.(clamped);

    // Subtle audio ticks while ripping
    const now = Date.now();
    if (now - lastRustleTick.current > 75) {
      soundEngine.playFoilRustle();
      lastRustleTick.current = now;
    }

    // Spawn sparks at the tear tip
    if (Math.random() > 0.4) {
      spawnSparks(currentX, 16, 4);
    }

    // Check completion threshold: >= 88%
    if (clamped >= 88) {
      setHasCompleted(true);
      setIsDragging(false);
      onDragStateChange?.(false);
      setProgress(100);
      onTearProgress?.(100);

      // Explosive release triggers
      soundEngine.playTearSound();
      soundEngine.playSparkleSound();
      spawnSparks(maxDrag, 16, 40);

      // Haptic pulse if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 80]);
      }

      setTimeout(() => {
        onTearComplete();
      }, 350);
    }
  };

  // Handle pointer release
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || hasCompleted) return;
    e.stopPropagation();

    setIsDragging(false);
    onDragStateChange?.(false);

    // If released before 88%, snap back to 0
    if (progress < 88) {
      setProgress(0);
      onTearProgress?.(0);
    }
  };

  const currentPixelOffset = (progress / 100) * maxDrag;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 right-0 h-9 z-40 select-none pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Dynamic Laser Tear Breach Line behind the notch */}
      {progress > 0 && (
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

      {/* Direct-on-Pack Metallic Pull Notch */}
      {!hasCompleted && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute top-0 flex items-center cursor-grab active:cursor-grabbing transition-transform ${
            isDragging ? 'scale-110' : 'hover:scale-105'
          }`}
          style={{
            transform: `translateX(${currentPixelOffset}px)`,
          }}
        >
          {/* Glowing Metallic Pull Notch Tab */}
          <div className="h-8 w-11 rounded-r-lg bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 border border-white/60 shadow-[0_0_15px_rgba(251,191,36,0.9)] flex items-center justify-center relative overflow-hidden group">
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <span className="text-[9px] font-black tracking-tighter text-zinc-950 font-mono select-none">
              TEAR ▶
            </span>
          </div>

          {/* Left perforation anchor cut indicator */}
          <div className="w-1.5 h-3 bg-amber-400/80 rounded-l-sm -ml-0.5" />
        </div>
      )}
    </div>
  );
};

export default TearMechanism;
