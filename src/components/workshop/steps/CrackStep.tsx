'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { Scissors, Wrench, AlertCircle, Sparkles, Check } from 'lucide-react';

interface CrackStepProps {
  card: CardInstance;
  onComplete: () => void;
}

export const CrackStep: React.FC<CrackStepProps> = ({ card, onComplete }) => {
  // 4 corners: 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right
  const [snippedCorners, setSnippedCorners] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);
  const [activeCornerSnip, setActiveCornerSnip] = useState<number | null>(null);

  // Pry tension state (0 to 100)
  const [isPrying, setIsPrying] = useState<boolean>(false);
  const [pryProgress, setPryProgress] = useState<number>(0);
  const [isCracked, setIsCracked] = useState<boolean>(false);
  const [showShards, setShowShards] = useState<boolean>(false);

  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const allSnipped = snippedCorners.every(Boolean);
  const snippedCount = snippedCorners.filter(Boolean).length;

  const handleSnipCorner = (index: number) => {
    if (snippedCorners[index] || isCracked) return;

    setActiveCornerSnip(index);
    soundEngine.playPlasticSnip();

    setTimeout(() => {
      setSnippedCorners((prev) => {
        const next: [boolean, boolean, boolean, boolean] = [...prev];
        next[index] = true;
        return next;
      });
      setActiveCornerSnip(null);
    }, 180);
  };

  // Hold-to-pry mechanic
  useEffect(() => {
    if (isPrying && !isCracked && allSnipped) {
      holdIntervalRef.current = setInterval(() => {
        setPryProgress((prev) => {
          const next = prev + 3.5;
          if (next >= 100) {
            triggerCrackCeremony();
            return 100;
          }
          return next;
        });
      }, 50);
    } else {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
      if (!isCracked) {
        // Decay tension if released early
        const decayTimer = setInterval(() => {
          setPryProgress((prev) => {
            if (prev <= 0) {
              clearInterval(decayTimer);
              return 0;
            }
            return Math.max(0, prev - 8);
          });
        }, 40);
        return () => clearInterval(decayTimer);
      }
    }

    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isPrying, isCracked, allSnipped]);

  const triggerCrackCeremony = () => {
    if (isCracked) return;
    setIsCracked(true);
    setIsPrying(false);
    setShowShards(true);

    // Deep mechanical plastic fracture crunch followed by acrylic rattle
    soundEngine.playAcrylicCrackAndShatter();

    setTimeout(() => {
      setShowShards(false);
    }, 1400);
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 1. TOP HEADER (Static & flex-shrink-0) */}
      <header className="flex-shrink-0 text-center z-10 pt-3 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-1.5">
          <Wrench className="w-3.5 h-3.5 text-amber-400" />
          <span>Stage 1: Acrylic Slab Depenetration</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
          {!allSnipped ? 'Snip the 4 Sonic-Welded Corners' : !isCracked ? 'Pry Open the Side Seam' : 'Slab Cracked Cleanly!'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5 sm:mt-1">
          {!allSnipped
            ? `Use precision wire pliers to snip corner stress notches (${snippedCount}/4). Relieves internal structural tension.`
            : !isCracked
            ? 'Insert the flat steel pry tool into the lateral weld seam and hold tension until fracture propagation.'
            : 'The acrylic casing has separated into fragments. Card extracted with zero surface trauma.'}
        </p>
      </header>

      {/* 2. INTERACTIVE WORKBENCH AREA (Flexible & Scaled with min-h-0) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center justify-center p-2 sm:p-4 my-auto">
        <motion.div
          animate={
            isPrying && !isCracked
              ? {
                  x: [
                    (Math.random() - 0.5) * (pryProgress / 12),
                    (Math.random() - 0.5) * (pryProgress / 12),
                    (Math.random() - 0.5) * (pryProgress / 12),
                  ],
                  y: [
                    (Math.random() - 0.5) * (pryProgress / 12),
                    (Math.random() - 0.5) * (pryProgress / 12),
                    (Math.random() - 0.5) * (pryProgress / 12),
                  ],
                }
              : isCracked
              ? { scale: [1, 1.04, 0.98, 1], rotate: [0, -1, 1, 0] }
              : {}
          }
          transition={{ duration: 0.1, repeat: isPrying ? Infinity : 0 }}
          className="relative w-[220px] sm:w-[250px] md:w-[270px] aspect-[82/130] flex-shrink-0 rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-center bg-white/5 border border-white/20 shadow-2xl backdrop-blur-sm"
        >
          {/* Outer Slab Acrylic Casing */}
          <div className="absolute inset-0 rounded-3xl border-2 border-white/30 bg-gradient-to-br from-white/10 via-transparent to-black/30 pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.15)]" />

          {/* Plier Jaws Animation Overlay for Active Snip */}
          <AnimatePresence>
            {activeCornerSnip !== null && (
              <motion.div
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className={`absolute z-40 pointer-events-none ${
                  activeCornerSnip === 0
                    ? 'top-2 left-2'
                    : activeCornerSnip === 1
                    ? 'top-2 right-2'
                    : activeCornerSnip === 2
                    ? 'bottom-2 left-2'
                    : 'bottom-2 right-2'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-ping" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4 Clickable Corner Stress Notches */}
          {!isCracked && (
            <>
              {/* Top-Left */}
              <button
                type="button"
                onClick={() => handleSnipCorner(0)}
                disabled={snippedCorners[0]}
                className={`absolute -top-3 -left-3 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  snippedCorners[0]
                    ? 'bg-zinc-800 border border-zinc-600 text-zinc-500 cursor-default'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse hover:scale-110 cursor-pointer'
                }`}
                title={snippedCorners[0] ? 'Corner snipped' : 'Snip corner notch with pliers'}
              >
                {snippedCorners[0] ? <Check className="w-4 h-4 text-emerald-400" /> : <Scissors className="w-4 h-4" />}
              </button>

              {/* Top-Right */}
              <button
                type="button"
                onClick={() => handleSnipCorner(1)}
                disabled={snippedCorners[1]}
                className={`absolute -top-3 -right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  snippedCorners[1]
                    ? 'bg-zinc-800 border border-zinc-600 text-zinc-500 cursor-default'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse hover:scale-110 cursor-pointer'
                }`}
                title={snippedCorners[1] ? 'Corner snipped' : 'Snip corner notch with pliers'}
              >
                {snippedCorners[1] ? <Check className="w-4 h-4 text-emerald-400" /> : <Scissors className="w-4 h-4" />}
              </button>

              {/* Bottom-Left */}
              <button
                type="button"
                onClick={() => handleSnipCorner(2)}
                disabled={snippedCorners[2]}
                className={`absolute -bottom-3 -left-3 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  snippedCorners[2]
                    ? 'bg-zinc-800 border border-zinc-600 text-zinc-500 cursor-default'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse hover:scale-110 cursor-pointer'
                }`}
                title={snippedCorners[2] ? 'Corner snipped' : 'Snip corner notch with pliers'}
              >
                {snippedCorners[2] ? <Check className="w-4 h-4 text-emerald-400" /> : <Scissors className="w-4 h-4" />}
              </button>

              {/* Bottom-Right */}
              <button
                type="button"
                onClick={() => handleSnipCorner(3)}
                disabled={snippedCorners[3]}
                className={`absolute -bottom-3 -right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  snippedCorners[3]
                    ? 'bg-zinc-800 border border-zinc-600 text-zinc-500 cursor-default'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse hover:scale-110 cursor-pointer'
                }`}
                title={snippedCorners[3] ? 'Corner snipped' : 'Snip corner notch with pliers'}
              >
                {snippedCorners[3] ? <Check className="w-4 h-4 text-emerald-400" /> : <Scissors className="w-4 h-4" />}
              </button>
            </>
          )}

          {/* Slab Header Label (Simulated BGS) */}
          {!isCracked && (
            <div className="w-full mb-3 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-amber-400 font-bold">TQQ VAULT BGS</span>
              <span className="text-white font-black">
                GRADE {card.grade ? `${card.grade.numericGrade}.0` : '7.0'}
              </span>
            </div>
          )}

          {/* Inner Card Presentation */}
          <div className="relative w-full aspect-[63/88] rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            <CardRenderer
              card={card}
              size="full"
              interactive={false}
              showMarketValue={false}
              hideInternalFooter={true}
              showcaseMode={true}
            />

            {/* Fracture Lines SVG Overlay upon Crack */}
            {isCracked && (
              <svg
                viewBox="0 0 300 420"
                className="absolute inset-0 w-full h-full pointer-events-none z-30 stroke-white/80 fill-none"
                style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}
              >
                <path d="M 10,10 L 80,95 L 150,140 L 290,120" strokeWidth="2.5" />
                <path d="M 290,20 L 220,95 L 150,140 L 160,260 L 280,390" strokeWidth="2.5" />
                <path d="M 150,140 L 70,220 L 20,400" strokeWidth="2" />
                <path d="M 70,220 L 160,260 L 140,410" strokeWidth="2" />
                <path d="M 220,95 L 270,180" strokeWidth="1.5" />
              </svg>
            )}

            {/* Flying Glass Shard Particles on Breach */}
            {showShards && (
              <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: 140,
                      y: 200,
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                    }}
                    animate={{
                      x: 140 + (Math.random() - 0.5) * 350,
                      y: 200 + (Math.random() - 0.5) * 450,
                      opacity: 0,
                      scale: 0.4 + Math.random() * 0.8,
                      rotate: Math.random() * 720 - 360,
                    }}
                    transition={{ duration: 0.9 + Math.random() * 0.4, ease: 'easeOut' }}
                    className="absolute w-6 h-6 bg-white/40 border border-white/90 backdrop-blur shadow-[0_0_10px_white]"
                    style={{
                      clipPath:
                        i % 2 === 0
                          ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                          : 'polygon(20% 0%, 80% 10%, 100% 90%, 10% 80%)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* 3. BOTTOM ACTION BAR (Strictly Pinned & Protected) */}
      <footer className="w-full flex-shrink-0 p-4 pt-2 pb-6 border-t border-[#232730] bg-[#0f1115]/90 backdrop-blur-md flex flex-col items-center gap-2 z-20">
        {!allSnipped ? (
          <div className="w-full max-w-md flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Click all 4 corner amber notches to clip the acrylic weld.</span>
          </div>
        ) : !isCracked ? (
          <div className="w-full max-w-md flex flex-col items-center gap-2">
            {/* Tension Meter */}
            <div className="w-full bg-zinc-900/90 rounded-full h-3 border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-75 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                style={{ width: `${pryProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Pry Seam Tension: <strong>{Math.round(pryProgress)}%</strong> / 100%
            </span>

            {/* Hold to Pry Button */}
            <button
              type="button"
              onMouseDown={() => setIsPrying(true)}
              onMouseUp={() => setIsPrying(false)}
              onMouseLeave={() => setIsPrying(false)}
              onTouchStart={() => setIsPrying(true)}
              onTouchEnd={() => setIsPrying(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing"
            >
              <Wrench className="w-4 h-4 text-black" />
              <span>HOLD TO PRY OPEN</span>
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md flex flex-col items-center gap-2"
          >
            <div className="w-full flex items-center justify-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 rounded-xl">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Acrylic cracked cleanly! Card ready for microscope inspection.</span>
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <span>PROCEED TO DIGITAL MICROSCOPE ▶</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </footer>
    </div>
  );
};

export default CrackStep;
