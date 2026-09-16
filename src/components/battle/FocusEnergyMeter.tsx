'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame } from 'lucide-react';
import { playSound } from '../../utils/audio';

export interface FocusEnergyMeterProps {
  focusEnergy: number;
  maxFocus: number;
  onCharge: (amount?: number) => void;
  onChargingStateChange?: (isCharging: boolean) => void;
  disabled?: boolean;
}

export const FocusEnergyMeter: React.FC<FocusEnergyMeterProps> = ({
  focusEnergy,
  maxFocus,
  onCharge,
  onChargingStateChange,
  disabled = false,
}) => {
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [chargeProgress, setChargeProgress] = useState<number>(0);
  const [chargeFlash, setChargeFlash] = useState<boolean>(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnimRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const focusRatio = Math.max(0, Math.min(1, focusEnergy / maxFocus));

  // Determine energy visual glow
  const getGlowColor = () => {
    if (focusRatio >= 0.7) return { border: '#f59e0b', text: '#fbbf24', shadow: 'rgba(245, 158, 11, 0.5)' };
    if (focusRatio >= 0.3) return { border: '#06b6d4', text: '#38bdf8', shadow: 'rgba(6, 182, 212, 0.4)' };
    return { border: '#3b82f6', text: '#60a5fa', shadow: 'rgba(59, 130, 246, 0.3)' };
  };

  const glow = getGlowColor();

  const cancelCharge = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressAnimRef.current) {
      cancelAnimationFrame(progressAnimRef.current);
      progressAnimRef.current = null;
    }
    setIsHolding(false);
    setChargeProgress(0);
    if (onChargingStateChange) {
      onChargingStateChange(false);
    }
  }, [onChargingStateChange]);

  const handleChargeComplete = useCallback(() => {
    cancelCharge();
    playSound('focus_charge_burst', 0.85);
    onCharge(40);
    setChargeFlash(true);
    setTimeout(() => setChargeFlash(false), 500);
  }, [cancelCharge, onCharge]);

  const startCharge = useCallback(() => {
    if (disabled || focusEnergy >= maxFocus) return;

    setIsHolding(true);
    setChargeProgress(0);
    startTimeRef.current = Date.now();
    playSound('focus_charge_hum', 0.65);

    if (onChargingStateChange) {
      onChargingStateChange(true);
    }

    // Animate progress to 100% over 1000ms
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / 1000);
      setChargeProgress(progress);

      if (progress < 1) {
        progressAnimRef.current = requestAnimationFrame(updateProgress);
      }
    };
    progressAnimRef.current = requestAnimationFrame(updateProgress);

    holdTimerRef.current = setTimeout(() => {
      handleChargeComplete();
    }, 1000);
  }, [disabled, focusEnergy, maxFocus, onChargingStateChange, handleChargeComplete]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-between p-2.5 rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-2 border-white/10 shadow-2xl backdrop-blur-md w-28 sm:w-32 flex-shrink-0 select-none">
      {/* Background Energy Aura */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 20px ${glow.shadow}`,
          opacity: focusRatio > 0.1 ? 0.8 : 0.2,
        }}
      />

      {/* Charge Complete Flash Overlay */}
      {chargeFlash && (
        <motion.div
          initial={{ opacity: 0.8, scale: 0.95 }}
          animate={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 rounded-2xl bg-amber-400 pointer-events-none z-30"
        />
      )}

      {/* Top Header: Energy Label & Digital Counter */}
      <div className="text-center w-full z-10 mb-1.5">
        <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
          <Zap className="w-3 h-3" style={{ color: glow.text }} />
          <span>Focus Ki</span>
        </div>
        <div
          className="font-mono font-black text-xs sm:text-sm tracking-tight mt-0.5"
          style={{
            color: glow.text,
            textShadow: `0 0 10px ${glow.shadow}`,
          }}
        >
          [ {Math.round(focusEnergy)} / {maxFocus} ]
        </div>
      </div>

      {/* Center: Vertical Stylized Ki Cylinder / Gauge */}
      <div className="relative w-7 sm:w-8 h-28 sm:h-32 bg-zinc-950 rounded-full border-2 border-white/20 p-1 flex flex-col justify-end overflow-hidden shadow-inner z-10">
        {/* Tick Measurement Lines */}
        <div className="absolute inset-x-0 inset-y-2 flex flex-col justify-between pointer-events-none px-1 z-20 opacity-30">
          {[100, 80, 60, 40, 20].map((tick) => (
            <div key={tick} className="w-full border-b border-white/40 h-0" />
          ))}
        </div>

        {/* Dynamic Energy Liquid Fluid Fill */}
        <motion.div
          className="w-full rounded-full relative overflow-hidden"
          style={{
            background:
              focusRatio >= 0.7
                ? 'linear-gradient(to top, #d97706, #f59e0b, #fef08a)'
                : focusRatio >= 0.3
                ? 'linear-gradient(to top, #0284c7, #06b6d4, #a5f3fc)'
                : 'linear-gradient(to top, #1e3a8a, #2563eb, #93c5fd)',
            boxShadow: `0 0 16px ${glow.border}`,
          }}
          initial={false}
          animate={{ height: `${focusRatio * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Active Energy Shimmer Light Rays */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/25 to-white/60 animate-pulse" />
        </motion.div>

        {/* Charging Ripple Wave */}
        {isHolding && (
          <motion.div
            animate={{ y: [20, -100] }}
            transition={{ repeat: Infinity, duration: 0.4, ease: 'linear' }}
            className="absolute inset-x-0 h-4 bg-amber-300/60 blur-[2px] rounded-full pointer-events-none z-10"
          />
        )}
      </div>

      {/* Bottom: Tactile "Concentrate / Charge" Button */}
      <div className="w-full mt-2 z-10">
        <button
          type="button"
          disabled={disabled || focusEnergy >= maxFocus}
          onPointerDown={startCharge}
          onPointerUp={cancelCharge}
          onPointerLeave={cancelCharge}
          onPointerCancel={cancelCharge}
          className={`relative w-full py-2 px-1 rounded-xl text-center font-black text-[11px] uppercase tracking-wider transition-all duration-150 overflow-hidden shadow-lg border cursor-pointer active:scale-95 touch-none ${
            disabled || focusEnergy >= maxFocus
              ? 'bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed'
              : isHolding
              ? 'bg-amber-500 text-black border-amber-300 shadow-amber-500/50 scale-95'
              : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:brightness-110 text-cyan-200 border-cyan-500/40 shadow-cyan-950/40'
          }`}
          title="Hold down for 1.0s to rapidly surge +40 Focus Ki"
        >
          {/* 1-Second Hold Radial/Linear Progress Fill */}
          {isHolding && (
            <div
              className="absolute inset-y-0 left-0 bg-amber-400 opacity-75 transition-all duration-75 ease-linear pointer-events-none"
              style={{ width: `${chargeProgress * 100}%` }}
            />
          )}

          <div className="relative z-10 flex flex-col items-center justify-center leading-none gap-0.5">
            <span className="flex items-center gap-1 font-extrabold text-[10px]">
              <Flame className={`w-3 h-3 ${isHolding ? 'animate-bounce text-red-700' : 'text-amber-400'}`} />
              {isHolding ? 'HOLD 1s...' : 'CHARGE'}
            </span>
            <span className="text-[8px] opacity-80 font-mono tracking-tighter">
              {focusEnergy >= maxFocus ? 'MAX FOCUS' : isHolding ? `${Math.round(chargeProgress * 100)}%` : '+40 KI (HOLD)'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
