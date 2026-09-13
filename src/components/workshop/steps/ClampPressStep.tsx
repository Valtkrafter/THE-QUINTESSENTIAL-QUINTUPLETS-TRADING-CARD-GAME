'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { useGameStore } from '../../../store/useGameStore';
import { Gauge, Sparkles, Check, Clock, Zap, ShieldCheck, AlertCircle } from 'lucide-react';

interface ClampPressStepProps {
  card: CardInstance;
  onComplete: () => void;
}

export const ClampPressStep: React.FC<ClampPressStepProps> = ({ card, onComplete }) => {
  const inventory = useGameStore((state) => state.inventory);
  const stardust = useGameStore((state) => state.stardust);
  const startClamping = useGameStore((state) => state.startClamping);
  const skipClampingWithDust = useGameStore((state) => state.skipClampingWithDust);
  const calculateQuickPressCost = useGameStore((state) => state.calculateQuickPressCost);
  const advanceRestorationStep = useGameStore((state) => state.advanceRestorationStep);

  // Derive latest card state from store
  const activeCard = inventory.find((c) => c.id === card.id) ?? card;
  const clampingStartedAt = activeCard.restoration?.clampingStartedAt ?? null;
  const isClamped = Boolean(activeCard.restoration?.isClamped || clampingStartedAt);

  // Live real-time tick (1 second intervals)
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute offline & refresh resilient elapsed / remaining time
  const elapsed = clampingStartedAt ? Math.max(0, now - clampingStartedAt) : 0;
  const clampingDurationMs = activeCard.restoration?.clampingDurationMs ?? 86400000;
  const remaining = clampingStartedAt ? Math.max(0, clampingDurationMs - elapsed) : clampingDurationMs;

  const isComplete = Boolean(clampingStartedAt && remaining === 0);
  const isActiveClamping = Boolean(clampingStartedAt && remaining > 0);
  const isNotStarted = !clampingStartedAt;

  // Pressure PSI: 0 if not started, 150 if active or complete
  const pressurePsi = isNotStarted ? 0 : 150;
  const dynamicCost = calculateQuickPressCost(clampingStartedAt);
  const canAffordQuickPress = stardust >= dynamicCost;

  // Format HH:MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle engaging clamps
  const handleEngageClamps = () => {
    soundEngine.playClampRatchet();
    startClamping(activeCard.id);
  };

  // Handle instant hydraulic quick-press with Stardust
  const handleQuickPress = () => {
    if (!canAffordQuickPress) return;

    soundEngine.playClampRatchet();
    try {
      skipClampingWithDust(activeCard.id);
      soundEngine.playCleanChime();
      onComplete();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Handle unclamp and proceed when 24h is complete
  const handleUnclampAndProceed = () => {
    soundEngine.playClampRatchet();
    soundEngine.playCleanChime();
    advanceRestorationStep(activeCard.id, {
      step: 'polish',
      isClamped: false,
      clamped: true,
      checklist: {
        allClean: true,
        polished: false,
        waxed: false,
        microScratchRemoval: false,
        flattened: true,
        gradePrepCertified: false,
      },
    });
    onComplete();
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 1. TOP HEADER (Static & flex-shrink-0) */}
      <header className="flex-shrink-0 text-center z-10 pt-3 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-1.5">
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
          <span>Stage 3: Dual Optical Acrylic Press &amp; WORKPRO Bar Clamp Station</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
          {isNotStarted
            ? 'Engage Clamps to Begin 24-Hour Flattening'
            : isActiveClamping
            ? '24-Hour Cardstock Rest In Progress (150 PSI)'
            : 'Cardstock Flattened & Rested (150 PSI Complete)'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5">
          {isNotStarted
            ? 'Sandwich the card between dual 12mm optical acrylic plates and tighten heavy WORKPRO bar clamps to 150 PSI.'
            : isActiveClamping
            ? 'Clamping proceeds automatically in the background. You can safely exit the lab anytime.'
            : 'Cardstock warp and curl permanently cured. Guaranteed Corners & Edges Subgrades ≥ 8.5.'}
        </p>
      </header>

      {/* 2. INTERACTIVE WORKBENCH AREA (Flexible & Scaled with min-h-0) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center p-2 sm:p-4 my-auto">
        <div className="relative w-[300px] sm:w-[350px] md:w-[390px] aspect-square flex-shrink-0 flex items-center justify-center my-auto">
          {/* WORKPRO Orange/Black Bar Clamps - Left */}
          <div className="absolute left-1 sm:left-4 z-30 flex flex-col items-center pointer-events-none">
            {/* Top Clamp Jaw */}
            <motion.div
              animate={{ y: isNotStarted ? -8 : 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="w-10 h-14 bg-gradient-to-r from-orange-500 via-orange-600 to-zinc-900 rounded-t-lg border-2 border-orange-400/80 shadow-xl flex items-center justify-center"
            >
              <span className="text-[8px] font-mono font-black text-white -rotate-90">WORKPRO</span>
            </motion.div>
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
            <motion.div
              animate={{ y: isNotStarted ? -8 : 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="w-10 h-14 bg-gradient-to-l from-orange-500 via-orange-600 to-zinc-900 rounded-t-lg border-2 border-orange-400/80 shadow-xl flex items-center justify-center"
            >
              <span className="text-[8px] font-mono font-black text-white rotate-90">WORKPRO</span>
            </motion.div>
            {/* Steel Bar Guide */}
            <div className="w-4 h-56 bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-500 border border-zinc-600 shadow-inner" />
            {/* Bottom Trigger Housing */}
            <div className="w-10 h-16 bg-zinc-950 rounded-b-lg border-2 border-orange-500 flex flex-col items-center justify-center">
              <div className="w-2 h-7 bg-orange-500 rounded-full" />
            </div>
          </div>

          {/* Central Acrylic Sandwich & Card Holder */}
          <div className="relative w-[210px] sm:w-[240px] md:w-[260px] aspect-[63/88] flex-shrink-0 rounded-2xl flex items-center justify-center p-3">
            {/* Bottom 12mm Acrylic Base Plate */}
            <div className="absolute inset-0 rounded-2xl bg-white/10 border-2 border-white/30 backdrop-blur-md shadow-2xl" />

            {/* Inner Card Presentation */}
            <motion.div
              animate={pressurePsi >= 150 ? { scale: 0.98 } : { scale: 1 }}
              className="relative w-full h-full rounded-xl overflow-hidden shadow-inner flex items-center justify-center z-10"
            >
              <CardRenderer
                card={activeCard}
                size="full"
                interactive={false}
                showMarketValue={false}
                hideInternalFooter={true}
                showcaseMode={true}
              />

              {/* Real-Time Clamping Overlay (Ticking Digital Clock) */}
              {isActiveClamping && (
                <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>RESTING CARDSTOCK</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-widest drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                    {formatTime(remaining)}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase">
                    REMAINING UNTIL 150 PSI REST COMPLETE
                  </span>
                </div>
              )}
            </motion.div>

            {/* Top 12mm Optical Acrylic Press Plate */}
            <motion.div
              animate={
                pressurePsi >= 150
                  ? { y: 0, opacity: 0.85 }
                  : { y: -16, opacity: 0.55 }
              }
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-white/10 border-2 border-white/40 pointer-events-none z-20 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]"
            />
          </div>

          {/* PSI Pressure Gauge Dial */}
          <div className="absolute top-2 right-2 sm:right-6 z-40 bg-zinc-950/95 border-2 border-zinc-700 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center shadow-2xl">
            <div className="relative w-16 h-16 rounded-full border-4 border-zinc-700 bg-black flex items-center justify-center">
              {/* Gauge Needle */}
              <motion.div
                animate={{ rotate: (pressurePsi / 150) * 180 - 90 }}
                transition={{ type: 'spring', stiffness: 140, damping: 14 }}
                className="absolute w-1 h-7 bg-red-500 origin-bottom rounded-full"
                style={{ bottom: '50%' }}
              />
              <div className="w-3 h-3 rounded-full bg-zinc-300 z-10 border border-black shadow" />
            </div>
            <div className="mt-1 text-center font-mono">
              <div className={`text-xs font-black ${pressurePsi >= 150 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {pressurePsi} PSI
              </div>
              <span className="text-[8px] text-zinc-500 uppercase tracking-tight">
                {pressurePsi >= 150 ? 'OPTIMAL' : 'NEED 150'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM ACTION BAR (Strictly Pinned & Protected) */}
      <footer className="w-full flex-shrink-0 p-4 pt-2 pb-6 border-t border-[#232730] bg-[#0f1115]/90 backdrop-blur-md flex flex-col items-center gap-2 z-20">
        {isNotStarted ? (
          /* State A: Clamping Not Started */
          <div className="w-full max-w-md flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleEngageClamps}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:brightness-110 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gauge className="w-4 h-4 text-black" />
              <span>ENGAGE CLAMPS (150 PSI PRESS)</span>
            </button>
            <span className="text-[10px] font-mono text-zinc-500">
              Locks cardstock into 24-hour persistent press.
            </span>
          </div>
        ) : isActiveClamping ? (
          /* State B: Clamping In Progress */
          <div className="w-full max-w-md flex flex-col items-center gap-2.5">
            <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono text-center flex items-center justify-between gap-2 px-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>24h Clamping Active:</span>
              </div>
              <span className="font-bold text-sm tracking-wider text-white">
                {formatTime(remaining)}
              </span>
            </div>

            <div className="w-full grid grid-cols-2 gap-2">
              {/* 24h Standard Rest (Disabled with pulsing icon) */}
              <button
                type="button"
                disabled
                className="py-2.5 px-3 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-75"
              >
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Resting Cardstock...</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatTime(remaining)} left
                </span>
              </button>

              {/* Dynamic Stardust Skip Button */}
              <button
                type="button"
                onClick={handleQuickPress}
                disabled={!canAffordQuickPress}
                title={
                  !canAffordQuickPress
                    ? `Requires ${dynamicCost} Stardust (You have ${stardust} ★)`
                    : `Skip remaining clamp time for ${dynamicCost} Stardust`
                }
                className={`py-2.5 px-3 rounded-xl text-xs font-mono font-black flex flex-col items-center justify-center gap-1 transition shadow-lg ${
                  canAffordQuickPress
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-amber-500/20 active:scale-95 cursor-pointer'
                    : 'bg-[#1c1e24] text-zinc-500 border border-red-500/30 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${canAffordQuickPress ? 'text-black' : 'text-zinc-500'}`} />
                  <span>Hydraulic Quick-Press</span>
                </div>
                <span className={`text-[10px] font-mono ${canAffordQuickPress ? 'text-black/80' : 'text-zinc-500'}`}>
                  ★ {dynamicCost} Stardust
                </span>
              </button>
            </div>

            {!canAffordQuickPress && (
              <div className="w-full flex items-center gap-1.5 text-[10px] font-mono text-red-400 bg-red-950/40 border border-red-500/20 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span>Requires {dynamicCost} Stardust (You have {stardust} ★). Clamping continues in background.</span>
              </div>
            )}
          </div>
        ) : (
          /* State C: Clamping Complete */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md flex flex-col items-center gap-2"
          >
            <div className="w-full p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cardstock Flattened &amp; Rested (150 PSI Complete)</span>
            </div>

            <button
              type="button"
              onClick={handleUnclampAndProceed}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>UNCLAMP &amp; PROCEED TO POLISHING ▶</span>
              <Sparkles className="w-4 h-4 text-black" />
            </button>
          </motion.div>
        )}
      </footer>
    </div>
  );
};

export default ClampPressStep;
