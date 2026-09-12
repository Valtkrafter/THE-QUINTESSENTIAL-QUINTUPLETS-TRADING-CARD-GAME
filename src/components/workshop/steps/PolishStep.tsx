'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { playSound } from '../../../utils/audio';
import { Sparkles, Check, Wand2, Shield, Award } from 'lucide-react';

interface PolishStepProps {
  card: CardInstance;
  onComplete: () => void;
}

interface BalmDab {
  id: number;
  x: number; // percentage
  y: number; // percentage
}

const BALM_DAB_SLOTS: BalmDab[] = [
  { id: 1, x: 30, y: 25 },
  { id: 2, x: 70, y: 35 },
  { id: 3, x: 40, y: 65 },
  { id: 4, x: 65, y: 75 },
];

export const PolishStep: React.FC<PolishStepProps> = ({ card, onComplete }) => {
  // Phase A: dabbing wax dots onto card (0 to 4)
  const [dabbedSlots, setDabbedSlots] = useState<number[]>([]);

  // Phase B: microfiber cloth buffing progress (0 to 100)
  const [buffProgress, setBuffProgress] = useState<number>(0);
  const [isBuffComplete, setIsBuffComplete] = useState<boolean>(false);
  const [showLensFlare, setShowLensFlare] = useState<boolean>(false);

  const lastWaxSoundTimeRef = useRef<number>(0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);

  const allDabbed = dabbedSlots.length === BALM_DAB_SLOTS.length;

  const handleDabSlot = (slotId: number) => {
    if (dabbedSlots.includes(slotId) || allDabbed) return;

    soundEngine.playWaxRub();
    setDabbedSlots((prev) => [...prev, slotId]);
  };

  const handleDabAll = () => {
    soundEngine.playWaxRub();
    setDabbedSlots(BALM_DAB_SLOTS.map((s) => s.id));
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

      if (distance > 6) {
        // Play moist wax rubbing sound
        const now = Date.now();
        if (now - lastWaxSoundTimeRef.current > 140) {
          soundEngine.playWaxRub();
          lastWaxSoundTimeRef.current = now;
        }

        setBuffProgress((prev) => {
          const next = Math.min(100, prev + 2.2);
          if (next >= 100 && !isBuffComplete) {
            triggerBuffCompletion();
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
    // Crystalline rare chime
    playSound('reveal_rare');

    setTimeout(() => {
      setShowLensFlare(false);
    }, 2200);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* Step Header */}
      <div className="text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-mono font-bold mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>Stage 4: Restoration Balm &amp; Microfiber Holographic Buff</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
          {!allDabbed ? 'Dab Yellow Restoration Balm onto Holo Foil' : !isBuffComplete ? 'Buff Circularly with Microfiber Cloth' : 'Mirror-Grade Specular Buff Finished!'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5">
          {!allDabbed
            ? 'Place dots of specialized surface balm onto the foil surface to fill micro-scratches.'
            : !isBuffComplete
            ? 'Drag the dark grey microfiber cloth in circular motions to polish away fine swirls.'
            : 'Foil surface restored to factory mirror clarity. +1.5 Surface bonus and +15% Gem Mint 10 odds.'}
        </p>
      </div>

      {/* Main Workspace Stage */}
      <div className="relative flex-1 w-full max-w-3xl flex items-center justify-center my-2">
        <div className="relative flex items-center justify-center gap-6 sm:gap-12 flex-wrap">
          {/* Tool Tray (Restoration Wax Jar & Applicator) */}
          <div className="flex flex-col items-center gap-3 bg-zinc-950/80 p-3 rounded-2xl border border-white/10 shadow-xl">
            {/* Yellow Balm Jar */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 border-2 border-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.4)] flex flex-col items-center justify-center text-center p-1">
              <span className="text-[8px] font-mono font-black text-zinc-950 uppercase leading-none">
                KURADASHI
              </span>
              <span className="text-[7px] font-mono font-bold text-zinc-900 mt-0.5">BALM</span>
            </div>

            {/* Dark Grey Microfiber Cloth Visual */}
            <div className={`w-14 h-12 rounded-xl bg-zinc-800 border border-zinc-600 shadow-md flex items-center justify-center transition-all ${allDabbed && !isBuffComplete ? 'ring-2 ring-yellow-400 animate-pulse' : 'opacity-70'}`}>
              <span className="text-[8px] font-mono text-zinc-300 font-bold uppercase">CLOTH</span>
            </div>

            {!allDabbed && (
              <button
                type="button"
                onClick={handleDabAll}
                className="px-2.5 py-1 rounded-lg bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/40 text-[9px] font-mono font-bold transition"
              >
                Dab All (Quick)
              </button>
            )}
          </div>

          {/* Central Card with Micro-Scratches & Wax Dabs */}
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={() => (lastPointerPosRef.current = null)}
            className="relative w-[220px] sm:w-[260px] aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-zinc-900 flex items-center justify-center cursor-pointer select-none"
          >
            {/* Card Base */}
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
              style={{ opacity: Math.max(0, (1 - buffProgress / 100) * 0.7) }}
            >
              <line x1="30" y1="40" x2="60" y2="55" strokeWidth="0.8" />
              <line x1="120" y1="70" x2="160" y2="85" strokeWidth="0.8" />
              <line x1="50" y1="180" x2="90" y2="195" strokeWidth="0.8" />
              <line x1="110" y1="210" x2="150" y2="225" strokeWidth="0.8" />
              <circle cx="80" cy="120" r="14" strokeWidth="0.6" strokeDasharray="3 3" />
            </svg>

            {/* Yellow Wax Dabs */}
            {BALM_DAB_SLOTS.map((slot) => {
              const isDabbed = dabbedSlots.includes(slot.id);
              return (
                <div
                  key={slot.id}
                  onClick={() => handleDabSlot(slot.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  {isDabbed ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1.3, 1] }}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-yellow-100 shadow-[0_0_12px_rgba(234,179,8,0.8)] transition-opacity duration-500"
                      style={{ opacity: Math.max(0, 1 - buffProgress / 85) }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-yellow-400 bg-yellow-400/20 animate-pulse flex items-center justify-center">
                      <span className="text-[9px] font-bold text-yellow-300 font-mono">DAB</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ultra-Bright Specular Lens Flare Sweep at 100% */}
            {showLensFlare && (
              <motion.div
                initial={{ x: '-150%', opacity: 0 }}
                animate={{ x: '180%', opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-44 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-40 transform -skew-x-25 mix-blend-overlay shadow-[0_0_35px_white]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar & Step Forward */}
      <div className="w-full max-w-md z-10 flex flex-col items-center gap-3">
        {!allDabbed ? (
          <div className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-white/10 text-xs font-mono">
            <span className="text-zinc-400">Balm Application Progress:</span>
            <span className="text-yellow-400 font-bold">
              {dabbedSlots.length} / {BALM_DAB_SLOTS.length} Dots Dabbed
            </span>
          </div>
        ) : !isBuffComplete ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full bg-zinc-900 rounded-full h-3 border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 transition-all duration-100 shadow-[0_0_10px_rgba(234,179,8,0.7)]"
                style={{ width: `${buffProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Microfiber Buffing: <strong>{Math.round(buffProgress)}%</strong> / 100% (Rub in circles)
            </span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-2"
          >
            <div className="w-full p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-xs font-mono flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Surface micro-scratches cleared! +1.5 Surface roll buff active.</span>
            </div>

            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-yellow-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <span>PROCEED TO SEMI-RIGID HOLDER</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PolishStep;
