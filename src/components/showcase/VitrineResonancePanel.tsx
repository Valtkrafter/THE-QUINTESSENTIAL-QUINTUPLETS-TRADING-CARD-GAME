'use client';

import React from 'react';
import { ShowcaseSynergyReport } from '../../types/card';

export interface VitrineResonancePanelProps {
  synergyReport: ShowcaseSynergyReport;
  className?: string;
}

/**
 * VitrineResonancePanel (Left Flank HUD)
 *
 * Genshin Impact / Wuthering Waves inspired glassmorphic status module.
 * Visualizes total vault valuation and the 3 core resonance matrices:
 * 1. Quintuplet Harmony (+50%)
 * 2. Mono-Waifu Obsession (+30%)
 * 3. Vault Excellence (+100%)
 */
export const VitrineResonancePanel: React.FC<VitrineResonancePanelProps> = ({
  synergyReport,
  className = '',
}) => {
  // Determine dynamic Harmony bonus display (accounts for Fuutarou UR amplification)
  const harmonyBonusValue =
    50 + Math.round((synergyReport.activeSupportBuff?.effects.harmonyBonusBoost ?? 0) * 100);
  const harmonyBonusText = `+${harmonyBonusValue}%`;

  return (
    <div
      className={`w-72 md:w-80 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md shadow-xl flex flex-col gap-3 relative overflow-hidden text-zinc-100 select-none ${className}`}
    >
      {/* Subtle top accent line with golden shimmer */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />

      {/* 1. Header Tag & Total Vault Valuation */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Acrylic Showcase • Vault Resonance</span>
          </span>
        </div>

        <div className="flex flex-col mt-0.5">
          <span className="text-xs text-zinc-400 font-medium font-mono">Total Vault Valuation</span>
          <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-extrabold text-lg tracking-tight font-mono">
            ¥ {synergyReport.totalMarketValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Micro Separator */}
      <div className="h-px w-full bg-white/10" />

      {/* 2. Resonance / Synergy Matrix (Status Indicators) */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center justify-between">
          <span>Active Synergies</span>
          <span className="text-zinc-400">
            {synergyReport.slottedCount}/5 Sockets
          </span>
        </div>

        {/* 2a. Quintuplet Harmony (+50% or amplified) */}
        <div
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all duration-300 ${
            synergyReport.quintupletHarmony
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-zinc-900/50 border-white/5 text-zinc-600'
          }`}
          title="Socket all 5 sisters (Ichika, Nino, Miku, Yotsuba, Itsuki) for +50% Yield"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                synergyReport.quintupletHarmony
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse'
                  : 'bg-zinc-700'
              }`}
            />
            <span className="text-xs">🌸 Harmony</span>
          </div>
          <span
            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
              synergyReport.quintupletHarmony ? 'bg-emerald-900/60 text-emerald-200' : 'bg-black/40 text-zinc-600'
            }`}
          >
            {harmonyBonusText}
          </span>
        </div>

        {/* 2b. Mono-Waifu Obsession (+30%) */}
        <div
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all duration-300 ${
            synergyReport.monoWaifu
              ? 'bg-pink-950/60 border-pink-500/40 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
              : 'bg-zinc-900/50 border-white/5 text-zinc-600'
          }`}
          title="Socket 5 copies of the same sister for +30% Yield"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                synergyReport.monoWaifu
                  ? 'bg-pink-400 shadow-[0_0_6px_#f472b6] animate-pulse'
                  : 'bg-zinc-700'
              }`}
            />
            <span className="text-xs">💖 Mono-Waifu</span>
          </div>
          <span
            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
              synergyReport.monoWaifu ? 'bg-pink-900/60 text-pink-200' : 'bg-black/40 text-zinc-600'
            }`}
          >
            +30%
          </span>
        </div>

        {/* 2c. Vault Excellence (+100%) */}
        <div
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition-all duration-300 ${
            synergyReport.vaultExcellence
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
              : 'bg-zinc-900/50 border-white/5 text-zinc-600'
          }`}
          title="Socket 5 certified acrylic Slabs with Grade >= 9 for +100% Yield"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                synergyReport.vaultExcellence
                  ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse'
                  : 'bg-zinc-700'
              }`}
            />
            <span className="text-xs">💎 Excellence</span>
          </div>
          <span
            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
              synergyReport.vaultExcellence ? 'bg-cyan-900/60 text-cyan-200' : 'bg-black/40 text-zinc-600'
            }`}
          >
            +100%
          </span>
        </div>
      </div>

      {/* 3. Telemetry Footer */}
      <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-white/5">
        <span className="text-zinc-500">Resonance Boost:</span>
        <span className="font-bold text-amber-300">
          ×{synergyReport.synergyMultiplier.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default VitrineResonancePanel;
