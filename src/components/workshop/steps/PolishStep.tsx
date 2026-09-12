'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { playSound } from '../../../utils/audio';
import { useGameStore } from '../../../store/useGameStore';
import { Sparkles, Crosshair } from 'lucide-react';

interface PolishStepProps {
  card: CardInstance;
  onComplete: () => void;
}

interface BalmSpot {
  index: number;
  x: number; // percentage
  y: number; // percentage
  label: string;
}

const BALM_DAB_SLOTS: BalmSpot[] = [
  { index: 0, x: 28, y: 26, label: 'Top-Left Foil' },
  { index: 1, x: 72, y: 32, label: 'Top-Right Foil' },
  { index: 2, x: 32, y: 68, label: 'Bottom-Left Foil' },
  { index: 3, x: 68, y: 74, label: 'Bottom-Right Foil' },
];

export const PolishStep: React.FC<PolishStepProps> = ({ card, onComplete }) => {
  const advanceRestorationStep = useGameStore((state) => state.advanceRestorationStep);

  // Restore saved progress if available
  const initialDabbedSpots = card.restoration?.dabbedSpots ?? [];
  const initialBuffProgress = card.restoration?.waxBuffProgress ?? 0;

  // Phase A: dabbing wax dots onto card (indices 0..3)
  const [dabbedSpots, setDabbedSpots] = useState<number[]>(initialDabbedSpots);

  // Phase B: microfiber cloth buffing progress (0 to 100)
  const [buffProgress, setBuffProgress] = useState<number>(initialBuffProgress);
  const [isBuffComplete, setIsBuffComplete] = useState<boolean>(initialBuffProgress >= 100);
  const [showLensFlare, setShowLensFlare] = useState<boolean>(false);

  const lastWaxSoundTimeRef = useRef<number>(0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);

  const allDabbed = dabbedSpots.length === BALM_DAB_SLOTS.length;

  useEffect(() => {
    if (initialBuffProgress >= 100) {
      setIsBuffComplete(true);
    }
  }, [initialBuffProgress]);

  const handleDabSpot = (spotIndex: number) => {
    if (dabbedSpots.includes(spotIndex) || allDabbed) return;

    soundEngine.playWaxRub();
    const nextSpots = [...dabbedSpots, spotIndex];
    setDabbedSpots(nextSpots);

    advanceRestorationStep(card.id, {
      dabbedSpots: nextSpots,
      waxBuffProgress: buffProgress,
    });
  };

  const handleDabAll = () => {
    soundEngine.playWaxRub();
    const nextSpots = BALM_DAB_SLOTS.map((s) => s.index);
    setDabbedSpots(nextSpots);

    advanceRestorationStep(card.id, {
      dabbedSpots: nextSpots,
      waxBuffProgress: buffProgress,
    });
  };

  // Circular rubbing motion tracking
  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!allDabbed || isBuffComplete) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    if (lastPointerPosRef.current) {
      const dx = currentX - lastPointerPosRef.current.x;
      const dy = currentY - lastPointerPosRef.current.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 5) {
        const now = Date.now();
        if (now - lastWaxSoundTimeRef.current > 130) {
          soundEngine.playWaxRub();
          lastWaxSoundTimeRef.current = now;
        }

        setBuffProgress((prev) => {
          const next = Math.min(100, prev + 2.5);
          if (next >= 100 && !isBuffComplete) {
            triggerBuffCompletion();
          }

          // Periodic sync to store
          if (Math.floor(next) % 10 === 0 || next >= 100) {
            advanceRestorationStep(card.id, {
              dabbedSpots,
              waxBuffProgress: Math.round(next),
            });
          }

          return next;
        });
      }
    }

    lastPointerPosRef.current = { x: currentX, y: currentY };
  };

  const triggerBuffCompletion = () => {
    setIsBuffComplete(true);
    setShowLensFlare(true);
    soundEngine.playCleanChime();
    playSound('reveal_rare');

    advanceRestorationStep(card.id, {
      waxBuffProgress: 100,
      waxBuffed: true,
      checklist: {
        allClean: true,
        polished: true,
        waxed: true,
        microScratchRemoval: true,
        flattened: true,
        gradePrepCertified: false,
      },
    });

    setTimeout(() => {
      setShowLensFlare(false);
    }, 2200);
  };

  const handleProceed = () => {
    soundEngine.playCleanChime();
    onComplete();
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 1. TOP HEADER (Static & flex-shrink-0) */}
      <header className="flex-shrink-0 text-center z-10 pt-3 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Stage 4: Restoration Balm &amp; Microfiber Holographic Buff</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
          {!allDabbed
            ? 'Dab Viscous Restoration Balm onto Holo Foil'
            : !isBuffComplete
            ? 'Buff Circularly with Microfiber Cloth'
            : 'Mirror-Grade Specular Buff Finished!'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5">
          {!allDabbed
            ? 'Place 3D gel droplets of specialized Kuradashi balm onto high-wear foil sectors.'
            : !isBuffComplete
            ? 'Drag the microfiber cloth in circular motions to polish away fine swirls and blend wax film.'
            : 'Foil surface restored to factory mirror clarity. +1.5 Surface bonus and +15% Gem Mint 10 odds.'}
        </p>
      </header>

      {/* 2. INTERACTIVE WORKBENCH AREA (Flexible & Scaled with min-h-0) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center p-2 sm:p-4 my-auto">
        <div className="relative flex items-center justify-center gap-4 sm:gap-8 md:gap-12 flex-wrap my-auto">
          {/* Tool Tray (Restoration Wax Jar & Microfiber Cloth) */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 bg-zinc-950/90 p-3 rounded-2xl border border-white/10 shadow-2xl flex-shrink-0">
            {/* Kuradashi Golden Balm Jar */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border-2 border-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center text-center p-1 cursor-pointer">
              <span className="text-[8px] font-mono font-black text-zinc-950 uppercase leading-none">
                KURADASHI
              </span>
              <span className="text-[7px] font-mono font-bold text-zinc-900 mt-0.5">3D BALM</span>
              {/* Gloss shine on lid */}
              <div className="w-6 h-2 bg-white/40 rounded-full blur-[0.5px] mt-1" />
            </div>

            {/* Dark Grey Microfiber Cloth Visual */}
            <div
              className={`w-12 h-10 sm:w-14 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-600 shadow-md flex flex-col items-center justify-center transition-all ${
                allDabbed && !isBuffComplete ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse' : 'opacity-70'
              }`}
            >
              <span className="text-[8px] font-mono text-zinc-200 font-black uppercase tracking-wider">CLOTH</span>
              <span className="text-[6px] font-mono text-zinc-400">MICROFIBER</span>
            </div>

            {!allDabbed && (
              <button
                type="button"
                onClick={handleDabAll}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold transition active:scale-95 shadow-sm cursor-pointer"
              >
                Dab All (Quick)
              </button>
            )}
          </div>

          {/* Central Card with Micro-Scratches, Matte Wax Smears & 3D Gel Dabs */}
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={() => (lastPointerPosRef.current = null)}
            className="relative max-h-[300px] sm:max-h-[340px] md:max-h-[380px] aspect-[63/88] w-auto h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-zinc-900 flex items-center justify-center cursor-pointer select-none"
          >
            {/* Card Base Renderer */}
            <CardRenderer
              card={card}
              size="full"
              interactive={false}
              showMarketValue={false}
              hideInternalFooter={true}
              showcaseMode={true}
            />

            {/* Faint Micro-Scratches Overlay (Fades out as buffProgress reaches 100%) */}
            <svg
              viewBox="0 0 200 280"
              className="absolute inset-0 w-full h-full pointer-events-none z-20 stroke-white/40 fill-none transition-opacity duration-300"
              style={{ opacity: Math.max(0, (1 - buffProgress / 100) * 0.75) }}
            >
              <line x1="30" y1="40" x2="60" y2="55" strokeWidth="0.8" />
              <line x1="120" y1="70" x2="160" y2="85" strokeWidth="0.8" />
              <line x1="50" y1="180" x2="90" y2="195" strokeWidth="0.8" />
              <line x1="110" y1="210" x2="150" y2="225" strokeWidth="0.8" />
              <circle cx="80" cy="120" r="14" strokeWidth="0.6" strokeDasharray="3 3" />
            </svg>

            {/* Applied Matte Wax Smears (Semi-opaque wax film that dulls underlying holographic reflection) */}
            {BALM_DAB_SLOTS.map((slot) => {
              const isDabbed = dabbedSpots.includes(slot.index);
              if (!isDabbed) return null;

              // Smear fades out proportionally as buffProgress goes from 0 to 100%
              const smearOpacity = Math.max(0, (1 - buffProgress / 100) * 0.75);

              return (
                <div
                  key={`smear-${slot.index}`}
                  className="absolute pointer-events-none z-20 rounded-full transition-opacity duration-200"
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: '90px',
                    height: '90px',
                    transform: 'translate(-50%, -50%)',
                    opacity: smearOpacity,
                    mixBlendMode: 'screen',
                    backdropFilter: 'blur(1px)',
                    background:
                      'radial-gradient(circle, rgba(254,240,138,0.7) 0%, rgba(251,191,36,0.45) 45%, rgba(180,83,9,0.2) 70%, transparent 85%)',
                  }}
                />
              );
            })}

            {/* 3D Viscous Gel Droplets & Animated Radar Reticles */}
            {BALM_DAB_SLOTS.map((slot) => {
              const isDabbed = dabbedSpots.includes(slot.index);

              return (
                <div
                  key={`dab-${slot.index}`}
                  onClick={() => handleDabSpot(slot.index)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300 cursor-pointer"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  {isDabbed ? (
                    /* 3D Viscous Gel Droplet */
                    <motion.div
                      initial={{ scale: 0, y: -4 }}
                      animate={{ scale: [1.25, 1], y: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                      className="w-9 h-9 rounded-full relative shadow-[0_4px_8px_rgba(0,0,0,0.6)] transition-opacity duration-500"
                      style={{
                        background:
                          'radial-gradient(circle at 35% 35%, #fef08a 0%, #fbbf24 45%, #b45309 85%, #78350f 100%)',
                        opacity: Math.max(0, 1 - buffProgress / 85),
                      }}
                    >
                      {/* Specular Reflection Highlight (Gloss Shine Dot) */}
                      <div className="w-2.5 h-2.5 bg-white rounded-full absolute top-1.5 left-1.5 opacity-90 blur-[0.5px] pointer-events-none" />
                      {/* Secondary Rim Refraction */}
                      <div className="w-1.5 h-1 bg-white/50 rounded-full absolute bottom-1 right-1.5 opacity-60 blur-[0.3px] pointer-events-none" />
                    </motion.div>
                  ) : (
                    /* Undabbed State: High-Contrast Animated Radar Reticle */
                    <div className="relative w-10 h-10 flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                      {/* Rotating Dashed Amber Ring */}
                      <div className="w-10 h-10 border-2 border-dashed border-[#f59e0b] rounded-full animate-[spin_6s_linear_infinite]" />

                      {/* Pulsing Amber Crosshair Indicator with Drop Shadow */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Crosshair className="w-5 h-5 text-[#fef08a] drop-shadow-[0_1px_3px_rgba(0,0,0,1)] animate-pulse" />
                      </div>

                      {/* Subtle Center Glow Pip */}
                      <div className="w-2 h-2 rounded-full bg-[#f59e0b] border border-[#78350f] shadow-[0_0_6px_#f59e0b] animate-ping pointer-events-none" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ultra-Bright Diagonal Prismatic Flare Sweep at 100% */}
            {showLensFlare && (
              <motion.div
                initial={{ x: '-150%', opacity: 0 }}
                animate={{ x: '180%', opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-48 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-40 transform -skew-x-25 mix-blend-overlay shadow-[0_0_40px_white]"
              />
            )}
          </div>
        </div>
      </main>

      {/* 3. BOTTOM ACTION BAR (Strictly Pinned & Protected) */}
      <footer className="w-full flex-shrink-0 p-4 pt-2 pb-6 border-t border-[#232730] bg-[#0f1115]/90 backdrop-blur-md flex flex-col items-center gap-2 z-20">
        <div className="w-full max-w-md flex flex-col items-center gap-2">
          {!allDabbed ? (
            <div className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-white/10 text-xs font-mono">
              <span className="text-zinc-400">Balm Application Progress:</span>
              <span className="text-amber-400 font-bold">
                {dabbedSpots.length} / {BALM_DAB_SLOTS.length} Droplets Dabbed
              </span>
            </div>
          ) : !isBuffComplete ? (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full bg-zinc-900 rounded-full h-3 border border-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 transition-all duration-100 shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                  style={{ width: `${buffProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Microfiber Buffing: <strong>{Math.round(buffProgress)}%</strong> / 100% (Rub card in circles)
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center gap-2"
            >
              <div className="w-full p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Surface micro-scratches cleared! +1.5 Surface roll buff active.</span>
              </div>

              <button
                type="button"
                onClick={handleProceed}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>PROCEED TO SEMI-RIGID HOLDER ▶</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default PolishStep;
