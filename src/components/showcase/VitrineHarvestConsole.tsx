'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Clock, Zap } from 'lucide-react';
import { soundEngine } from '../../utils/audioEngine';

export interface VitrineHarvestConsoleProps {
  accruedYen: number;
  yieldPerMinute: number;
  yieldPerSecond: number;
  isMaxOfflineReached: boolean;
  onClaim: () => void;
  isClaiming?: boolean;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
}

/**
 * VitrineHarvestConsole (Right Flank HUD)
 *
 * Genshin Impact / Wuthering Waves inspired glassmorphic command module.
 * Visualizes real-time idle yield rate, animated frequency stream, uncollected
 * revenue well, and tactile burst-style [CLAIM REVENUE] skill button.
 */
export const VitrineHarvestConsole: React.FC<VitrineHarvestConsoleProps> = ({
  accruedYen,
  yieldPerMinute,
  yieldPerSecond,
  isMaxOfflineReached,
  onClaim,
  isClaiming = false,
  className = '',
}) => {
  const [localClaiming, setLocalClaiming] = useState<boolean>(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lastClaimedAmount, setLastClaimedAmount] = useState<number>(0);

  const claimingActive = isClaiming || localClaiming;

  const handleClickClaim = () => {
    if (accruedYen <= 0 || claimingActive) return;

    setLastClaimedAmount(accruedYen);
    setLocalClaiming(true);

    // Generate celebratory golden coin particles
    const generated: Particle[] = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 220,
      y: -30 - Math.random() * 80,
      scale: 0.6 + Math.random() * 0.8,
    }));
    setParticles(generated);

    // Trigger claim and sound
    onClaim();
    soundEngine.playCoinPulseSound();

    setTimeout(() => {
      setLocalClaiming(false);
      setParticles([]);
    }, 1600);
  };

  return (
    <div
      className={`w-72 md:w-80 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shadow-xl flex flex-col justify-between gap-3 relative overflow-hidden text-zinc-100 select-none ${className}`}
    >
      {/* Subtle top accent line with emerald shimmer */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent pointer-events-none" />

      {/* 1. Live Idle Yield Meter & Equalizer Visualizer */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] tracking-widest text-zinc-400 uppercase font-mono">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Yield Generator</span>
          </span>

          {/* Animated Audio-Frequency Streaming Bar Effect */}
          <div className="flex items-end gap-1 h-3.5" title="Currency Stream Active">
            <span
              className={`w-1 rounded-full transition-all duration-300 ${
                yieldPerMinute > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'
              }`}
              style={{ height: yieldPerMinute > 0 ? '60%' : '20%', animationDuration: '0.8s' }}
            />
            <span
              className={`w-1 rounded-full transition-all duration-300 ${
                yieldPerMinute > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'
              }`}
              style={{ height: yieldPerMinute > 0 ? '100%' : '20%', animationDuration: '0.5s' }}
            />
            <span
              className={`w-1 rounded-full transition-all duration-300 ${
                yieldPerMinute > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'
              }`}
              style={{ height: yieldPerMinute > 0 ? '80%' : '20%', animationDuration: '0.7s' }}
            />
            <span
              className={`w-1 rounded-full transition-all duration-300 ${
                yieldPerMinute > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'
              }`}
              style={{ height: yieldPerMinute > 0 ? '45%' : '20%', animationDuration: '0.6s' }}
            />
          </div>
        </div>

        {/* Live Yield Rate */}
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-emerald-400 font-bold text-sm tracking-wide">
            +{yieldPerMinute.toFixed(1)} ¥/min
          </span>
          <span className="text-[10px] text-zinc-500 font-normal">
            ({yieldPerSecond.toFixed(2)} ¥/s)
          </span>
        </div>
      </div>

      {/* 2. Uncollected Vault Revenue Pool (Inset Recessed Well) */}
      <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium font-mono">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Uncollected Pool</span>
            {isMaxOfflineReached && (
              <span className="text-[9px] text-amber-400 font-bold">(12h Cap)</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-amber-300 font-bold text-base font-mono tracking-tight">
            ¥ {Math.floor(accruedYen).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. Tactile "CLAIM REVENUE" Skill Button (Burst / Ultimate Style) */}
      <div className="relative w-full pt-1">
        <button
          type="button"
          onClick={handleClickClaim}
          disabled={accruedYen <= 0 || claimingActive}
          className={`w-full py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-95 relative overflow-hidden font-mono ${
            accruedYen > 0
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:brightness-110 cursor-pointer animate-pulse'
              : 'bg-zinc-800/80 text-zinc-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Coins className={`w-4 h-4 ${accruedYen > 0 ? 'text-black' : 'text-zinc-500'}`} />
          <span>Claim Revenue</span>

          {/* Golden Sweep Shimmer Effect */}
          {accruedYen > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-shimmer pointer-events-none" />
          )}
        </button>

        {/* Floating Coin Particles FX */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: p.scale }}
              animate={{
                opacity: 0,
                x: p.x,
                y: p.y - 70,
                scale: p.scale * 1.3,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute left-1/2 bottom-3 pointer-events-none z-50 text-amber-300 font-black font-mono flex items-center gap-1 text-xs shadow-md"
            >
              <Coins className="w-3.5 h-3.5 text-yellow-300" />
              <span>+{Math.max(1, Math.round(lastClaimedAmount / particles.length || 10))}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VitrineHarvestConsole;
