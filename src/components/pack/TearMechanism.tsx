'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { soundEngine } from '../../utils/audioEngine';
import { Sparkles, ChevronRight } from 'lucide-react';

export interface TearMechanismProps {
  onTearProgress?: (progress: number) => void; // 0 to 100
  onTearComplete: () => void;
  accentColor?: string;
  disabled?: boolean;
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
  onTearProgress,
  onTearComplete,
  accentColor = '#F59E0B',
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [sparks, setSparks] = useState<SparkParticle[]>([]);
  const [hasCompleted, setHasCompleted] = useState(false);
  const lastSoundTick = useRef<number>(0);

  // Spawn particle sparks at the tear point
  const spawnSparks = useCallback((originX: number, originY: number, count: number = 35) => {
    const colors = ['#FCD34D', '#F59E0B', '#FFFFFF', '#EC4899', '#06B6D4', '#10B981'];
    const newSparks: SparkParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 8 + 3;
      newSparks.push({
        id: Math.random(),
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }

    setSparks(newSparks);
  }, []);

  // Animate sparks
  useEffect(() => {
    if (sparks.length === 0) return;
    const interval = setInterval(() => {
      setSparks((prev) =>
        prev
          .map((s) => ({
            ...s,
            x: s.x + s.vx,
            y: s.y + s.vy,
            vy: s.vy + 0.35, // gravity
            alpha: s.alpha - 0.04,
          }))
          .filter((s) => s.alpha > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [sparks]);

  const updateProgressFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current || hasCompleted || disabled) return;

      const rect = trackRef.current.getBoundingClientRect();
      const currentX = clientX - rect.left;
      const rawPct = (currentX / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, rawPct));

      setProgress(clamped);
      onTearProgress?.(clamped);

      // Play subtle rustle ticks while dragging
      const now = Date.now();
      if (now - lastSoundTick.current > 70) {
        soundEngine.playFoilRustle();
        lastSoundTick.current = now;
      }

      // Check completion threshold (85% or more)
      if (clamped >= 85) {
        setHasCompleted(true);
        setIsDragging(false);
        setProgress(100);
        onTearProgress?.(100);

        // Sound triggers
        soundEngine.playTearSound();
        soundEngine.playSparkleSound();

        // Spawn explosive particle burst
        spawnSparks(rect.width * 0.85, rect.height / 2, 45);

        // Haptic shake trigger
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([40, 20, 60]);
        }

        setTimeout(() => {
          onTearComplete();
        }, 500);
      }
    },
    [disabled, hasCompleted, onTearComplete, onTearProgress, spawnSparks]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || hasCompleted) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateProgressFromEvent(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || hasCompleted) return;
    updateProgressFromEvent(e.clientX);
  };

  const handlePointerUp = () => {
    if (!isDragging || hasCompleted) return;
    setIsDragging(false);

    // If released before 85%, snap back to 0
    if (progress < 85) {
      setProgress(0);
      onTearProgress?.(0);
    }
  };

  return (
    <div className="relative w-full my-2 select-none">
      {/* Tear Slider Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full h-12 rounded-xl bg-zinc-950/90 border-2 ${
          isDragging ? 'border-amber-400' : 'border-dashed border-white/30'
        } flex items-center px-1 overflow-hidden cursor-grab active:cursor-grabbing backdrop-blur-md shadow-2xl transition-colors`}
      >
        {/* Serrated Foil Laser Perforation Line */}
        <div
          className="absolute inset-x-0 h-0.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #fff 0px, #fff 4px, transparent 4px, transparent 8px)',
          }}
        />

        {/* Torn Foil Gold Ribbon Fill */}
        <div
          className="absolute top-0 bottom-0 left-0 transition-all duration-75 pointer-events-none"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${accentColor}33, ${accentColor}88)`,
            borderRight: `2px solid ${accentColor}`,
          }}
        />

        {/* Swipe Prompt Label */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200"
          style={{
            opacity: progress > 15 ? 0 : 1,
          }}
        >
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 drop-shadow flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            SWIPE RIGHT TO TEAR OPEN
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </span>
        </div>

        {/* Glowing Tear Thumb / Pull Tab */}
        <div
          className={`relative z-20 h-10 w-12 rounded-lg flex items-center justify-center border shadow-xl transition-transform duration-75 ${
            isDragging ? 'scale-105' : ''
          }`}
          style={{
            left: `calc(${progress}% - ${progress * 0.48}px)`,
            background: `linear-gradient(135deg, ${accentColor}, #d97706)`,
            borderColor: '#FFFFFF',
            boxShadow: `0 0 15px ${accentColor}88`,
          }}
        >
          <span className="text-zinc-950 font-black text-sm tracking-tighter">
            ✂️
          </span>
        </div>
      </div>

      {/* Particle Sparks Canvas / Overlay */}
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute rounded-full pointer-events-none z-50 shadow-sm"
          style={{
            left: `${spark.x}px`,
            top: `${spark.y}px`,
            width: `${spark.size}px`,
            height: `${spark.size}px`,
            backgroundColor: spark.color,
            opacity: spark.alpha,
            boxShadow: `0 0 8px ${spark.color}`,
          }}
        />
      ))}
    </div>
  );
};

export default TearMechanism;
