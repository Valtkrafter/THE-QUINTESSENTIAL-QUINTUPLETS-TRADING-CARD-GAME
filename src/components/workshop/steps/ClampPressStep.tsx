'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { useGameStore } from '../../../store/useGameStore';
import { Gauge, Sparkles, Check, Clock, Zap, ShieldCheck } from 'lucide-react';

interface ClampPressStepProps {
  card: CardInstance;
  onComplete: () => void;
}

export const ClampPressStep: React.FC<ClampPressStepProps> = ({ card, onComplete }) => {
  const stardust = useGameStore((state) => state.stardust);

  // Clamping PSI (0 to 150)
  const [pressurePsi, setPressurePsi] = useState<number>(0);
  const [isPressingDone, setIsPressingDone] = useState<boolean>(false);
  const [isTimelapseRunning, setIsTimelapseRunning] = useState<boolean>(false);
  const [simulatedHoursLeft, setSimulatedHoursLeft] = useState<number>(24);

  const isOptimalPressure = pressurePsi >= 150;

  // Handle ratcheting clamps
  const handleRatchetClamp = () => {
    if (pressurePsi >= 150) return;

    soundEngine.playClampRatchet();
    setPressurePsi((prev) => Math.min(150, prev + 30));
  };

  // Standard 24h Timelapse Rest
  const handleStartStandardRest = () => {
    if (!isOptimalPressure || isTimelapseRunning || isPressingDone) return;
    setIsTimelapseRunning(true);

    let h = 24;
    const timer = setInterval(() => {
      h -= 2;
      setSimulatedHoursLeft(h);
      if (h <= 0) {
        clearInterval(timer);
        setIsTimelapseRunning(false);
        setIsPressingDone(true);
        soundEngine.playCleanChime();
      }
    }, 120);
  };

  // Instant Hydraulic Quick-Press
  const handleQuickPress = () => {
    if (!isOptimalPressure || isPressingDone) return;

    // If player has 30 stardust, deduct it; otherwise allow free skip for testing
    if (stardust >= 30) {
      useGameStore.setState((prev) => ({ stardust: Math.max(0, prev.stardust - 30) }));
    }

    soundEngine.playClampRatchet();
    setTimeout(() => {
      soundEngine.playCleanChime();
      setIsPressingDone(true);
    }, 450);
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 1. TOP HEADER (Static & flex-shrink-0) */}
      <header className="flex-shrink-0 text-center z-10 pt-3 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-1.5">
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
          <span>Stage 3: Dual Acrylic Press &amp; WORKPRO Clamp Station</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
          24-Hour Hard Press &amp; Warp Removal
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5">
          Ratchet dual bar clamps to 150 PSI between 12mm optical acrylic plates to eliminate cardstock curling and corner bowing.
        </p>
      </header>

      {/* 2. INTERACTIVE WORKBENCH AREA (Flexible & Scaled with min-h-0) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center p-2 sm:p-4 my-auto">
        <div className="relative max-h-[300px] sm:max-h-[340px] md:max-h-[380px] aspect-square h-full w-auto flex items-center justify-center my-auto">
          {/* WORKPRO Orange/Black Bar Clamps - Left */}
          <div className="absolute left-1 sm:left-4 z-30 flex flex-col items-center pointer-events-none">
            {/* Top Clamp Jaw */}
            <div className="w-10 h-14 bg-gradient-to-r from-orange-500 via-orange-600 to-zinc-900 rounded-t-lg border-2 border-orange-400/80 shadow-xl flex items-center justify-center">
              <span className="text-[8px] font-mono font-black text-white -rotate-90">WORKPRO</span>
            </div>
            {/* Steel Bar Guide */}
            <div className="w-4 h-56 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-500 border border-zinc-600 shadow-inner" />
            {/* Bottom Trigger Housing */}
            <div className="w-10 h-16 bg-zinc-950 rounded-b-lg border-2 border-orange-500 flex flex-col items-center justify-center">
              <div className="w-2 h-7 bg-orange-500 rounded-full" />
            </div>
          </div>

          {/* WORKPRO Orange/Black Bar Clamps - Right */}
          <div className="absolute right-1 sm:right-4 z-30 flex flex-col items-center pointer-events-none">
            {/* Top Clamp Jaw */}
            <div className="w-10 h-14 bg-gradient-to-l from-orange-500 via-orange-600 to-zinc-900 rounded-t-lg border-2 border-orange-400/80 shadow-xl flex items-center justify-center">
              <span className="text-[8px] font-mono font-black text-white rotate-90">WORKPRO</span>
            </div>
            {/* Steel Bar Guide */}
            <div className="w-4 h-56 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-500 border border-zinc-600 shadow-inner" />
            {/* Bottom Trigger Housing */}
            <div className="w-10 h-16 bg-zinc-950 rounded-b-lg border-2 border-orange-500 flex flex-col items-center justify-center">
              <div className="w-2 h-7 bg-orange-500 rounded-full" />
            </div>
          </div>

          {/* Central Acrylic Sandwich & Card Holder */}
          <div className="relative w-[210px] sm:w-[240px] aspect-[63/88] rounded-2xl flex items-center justify-center p-3">
            {/* Bottom 12mm Acrylic Base Plate */}
            <div className="absolute inset-0 rounded-2xl bg-white/10 border-2 border-white/30 backdrop-blur-md shadow-2xl" />

            {/* Inner Recessed Card */}
            <motion.div
              animate={isOptimalPressure ? { scale: 0.98 } : { scale: 1 }}
              className="relative w-full h-full rounded-xl overflow-hidden shadow-inner flex items-center justify-center z-10"
            >
              <CardRenderer
                card={card}
                size="full"
                interactive={false}
                showMarketValue={false}
                hideInternalFooter={true}
                showcaseMode={true}
              />
            </motion.div>

            {/* Top 12mm Acrylic Press Plate */}
            <motion.div
              animate={
                isOptimalPressure
                  ? { y: 0, opacity: 0.85 }
                  : { y: -12, opacity: 0.7 }
              }
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-white/10 border-2 border-white/40 pointer-events-none z-20 shadow-[inset_0_0_15px_rgba(255,255,255,0.4)]"
            />
          </div>

          {/* PSI Pressure Gauge Dial Overlay */}
          <div className="absolute top-2 right-2 sm:right-8 z-40 bg-zinc-950/90 border-2 border-zinc-700 rounded-2xl p-3 flex flex-col items-center shadow-xl">
            <div className="relative w-16 h-16 rounded-full border-4 border-zinc-700 bg-black flex items-center justify-center">
              {/* Dial Needle */}
              <motion.div
                animate={{ rotate: (pressurePsi / 150) * 180 - 90 }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                className="absolute w-1 h-7 bg-red-500 origin-bottom rounded-full"
                style={{ bottom: '50%' }}
              />
              <div className="w-3 h-3 rounded-full bg-zinc-300 z-10 border border-black shadow" />
            </div>
            <div className="mt-1.5 text-center font-mono">
              <div className={`text-xs font-black ${isOptimalPressure ? 'text-emerald-400' : 'text-amber-300'}`}>
                {pressurePsi} PSI
              </div>
              <span className="text-[9px] text-zinc-500 uppercase tracking-tight">
                {isOptimalPressure ? 'OPTIMAL' : 'NEED 150'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM ACTION BAR (Strictly Pinned & Protected) */}
      <footer className="w-full flex-shrink-0 p-4 pt-2 pb-6 border-t border-[#232730] bg-[#0f1115]/90 backdrop-blur-md flex flex-col items-center gap-2 z-20">
        {!isOptimalPressure ? (
          <div className="w-full max-w-md flex flex-col items-center gap-2">
            <div className="w-full bg-zinc-900 rounded-full h-2.5 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${(pressurePsi / 150) * 100}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleRatchetClamp}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2 hover:brightness-110"
            >
              <Gauge className="w-4 h-4 text-black" />
              <span>RATCHET CLAMPS (+30 PSI)</span>
            </button>
          </div>
        ) : !isPressingDone ? (
          <div className="w-full max-w-md flex flex-col items-center gap-2.5">
            <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono text-center flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Target 150 PSI Attained! Choose Rest Duration:</span>
            </div>

            <div className="w-full grid grid-cols-2 gap-2">
              {/* Option A: Standard 24h Rest (Simulated Timelapse) */}
              <button
                type="button"
                onClick={handleStartStandardRest}
                disabled={isTimelapseRunning}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 shadow"
              >
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>24h Standard Rest</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {isTimelapseRunning ? `Resting: ${simulatedHoursLeft}h left` : 'Simulate Timelapse'}
                </span>
              </button>

              {/* Option B: Hydraulic Quick-Press */}
              <button
                type="button"
                onClick={handleQuickPress}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-mono font-black flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-lg shadow-amber-500/20"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-black" />
                  <span>Hydraulic Quick-Press</span>
                </div>
                <span className="text-[10px] text-black/70 font-mono">
                  {stardust >= 30 ? '30 Stardust ★' : 'Instant (Free)'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md flex flex-col items-center gap-2"
          >
            <div className="w-full p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cardstock completely flat! Guaranteed Corners &amp; Edges &ge; 8.5.</span>
            </div>

            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <span>PROCEED TO RESTORATION WAX POLISH ▶</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </footer>
    </div>
  );
};

export default ClampPressStep;
