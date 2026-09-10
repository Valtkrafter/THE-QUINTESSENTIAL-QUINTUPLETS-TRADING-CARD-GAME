'use client';

import React, { useEffect, useState } from 'react';
import { ConsumableToolId, GradeTier } from '../../types/card';
import { GRADE_TIER_CONFIG } from '../../config/economy';
import { Shield, Sparkles, Zap, AlertTriangle } from 'lucide-react';

export type GradingPhase =
  | 'idle'
  | 'sliding_in'
  | 'laser_scanning'
  | 'hydraulic_sealing'
  | 'insurance_trigger'
  | 'grade_slam'
  | 'complete';

export interface GradingScannerFXProps {
  phase: GradingPhase;
  tier?: GradeTier;
  numericGrade?: number;
  isBlackLabel?: boolean;
  insuranceRerolled?: boolean;
  activeTool?: ConsumableToolId | null;
}

const TELEMETRY_LINES = [
  'INITIALIZING 488nm CYAN OPTICAL LASER...',
  'MEASURING 55/45 CENTERING RATIO...',
  'ANALYZING SURFACE LAMINATE REFLECTION...',
  'CHECKING 4-CORNER GEOMETRIC PRECISION...',
  'SCANNING FOIL MICRO-SCRATCH INTEGRITY...',
  'COMPUTING SUBGRADE VECTOR MATRIX...',
];

export const GradingScannerFX: React.FC<GradingScannerFXProps> = ({
  phase,
  tier = 'CRISP_7_8',
  numericGrade = 8,
  isBlackLabel = false,
  activeTool,
}) => {
  const [telemetryIndex, setTelemetryIndex] = useState(0);

  // Cycle telemetry lines during laser scan
  useEffect(() => {
    if (phase !== 'laser_scanning') return;
    const interval = setInterval(() => {
      setTelemetryIndex((prev) => (prev + 1) % TELEMETRY_LINES.length);
    }, 400);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'idle') return null;

  const isGemMint10 = numericGrade === 10 && !isBlackLabel;
  const isPoor = tier === 'POOR_1_3';
  const isCrisp = tier === 'CRISP_7_8';

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden rounded-3xl">
      {/* ============================================================
          PHASE 1: SLIDING IN HUD GUIDES
          ============================================================ */}
      {phase === 'sliding_in' && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-4 border border-cyan-500/30 rounded-3xl bg-cyan-950/10">
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-cyan-400/80">
            <span>[TQQ-VAULT-CHAMBER]</span>
            <span className="animate-pulse">MOUNTING ACRYLIC SHELL...</span>
          </div>
          {/* Target Alignment Corners */}
          <div className="w-full h-full relative">
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
          </div>
        </div>
      )}

      {/* ============================================================
          PHASE 2: DUAL NEON CYAN LASER SCANNER
          ============================================================ */}
      {phase === 'laser_scanning' && (
        <div className="absolute inset-0 scanner-grid-bg">
          {/* Neon Cyan Laser Sweep Bar */}
          <div className="absolute left-0 right-0 h-1.5 bg-cyan-300 animate-laser-sweep shadow-[0_0_20px_#06b6d4,0_0_40px_#22d3ee,0_0_60px_#a5f3fc] z-50">
            {/* Trailing Scan Beam */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-t from-cyan-400/30 to-transparent pointer-events-none" />
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-[9px] font-mono text-cyan-200 uppercase tracking-widest shadow-lg whitespace-nowrap">
              SPECTRAL SCANNER ACTIVE
            </div>
          </div>

          {/* Real-time Telemetry Readout */}
          <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/80 border border-cyan-500/40 backdrop-blur-md font-mono text-[10px] text-cyan-300 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="truncate">{TELEMETRY_LINES[telemetryIndex]}</span>
            </div>
            <span className="text-[9px] text-cyan-400/70 shrink-0 font-bold">PASS 2/2</span>
          </div>

          {/* Active Tool Perk HUD Indicator */}
          {activeTool && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-amber-400/60 text-amber-300 font-mono text-[10px] flex items-center gap-1.5 shadow-lg backdrop-blur">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="capitalize">{activeTool.replace('_', ' ')} Applied</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          PHASE 3: HYDRAULIC CLAMP & SLAB SEALER
          ============================================================ */}
      {phase === 'hydraulic_sealing' && (
        <div className="absolute inset-0 z-50">
          {/* Top Hydraulic Clamp Jaw */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 border-b-4 border-amber-500 animate-hydraulic-top shadow-[0_15px_30px_rgba(0,0,0,0.9)] flex flex-col justify-end p-2">
            <div className="w-full flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
              <span>HYDRAULIC PRESS SEALER</span>
              <span>PRESSURE: 4500 PSI</span>
            </div>
            {/* Caution stripes */}
            <div className="w-full h-2 mt-1 rounded bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_10px,#000_10px,#000_20px)]" />
          </div>

          {/* Bottom Hydraulic Clamp Jaw */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-800 via-zinc-900 to-zinc-950 border-t-4 border-amber-500 animate-hydraulic-bottom shadow-[0_-15px_30px_rgba(0,0,0,0.9)] flex flex-col justify-start p-2">
            {/* Caution stripes */}
            <div className="w-full h-2 mb-1 rounded bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_10px,#000_10px,#000_20px)]" />
            <div className="w-full flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
              <span>SONIC WELD RIVETS: 4/4</span>
              <span>AIR-TIGHT CHAMBER</span>
            </div>
          </div>

          {/* Steam Vents */}
          <div className="absolute top-16 left-4 w-12 h-12 rounded-full bg-white/40 blur-md animate-steam-release" />
          <div className="absolute top-16 right-4 w-12 h-12 rounded-full bg-white/40 blur-md animate-steam-release" />
          <div className="absolute bottom-16 left-8 w-14 h-14 rounded-full bg-white/40 blur-md animate-steam-release" />
          <div className="absolute bottom-16 right-8 w-14 h-14 rounded-full bg-white/40 blur-md animate-steam-release" />

          {/* Sealing Impact Flash */}
          <div className="absolute inset-0 bg-white/30 mix-blend-overlay animate-pulse" />
        </div>
      )}

      {/* ============================================================
          PHASE 4: VAULT INSURANCE TRIGGER NOTICE (IF < 7 REROLL)
          ============================================================ */}
      {phase === 'insurance_trigger' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-screen-shake">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-4 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-amber-300 tracking-wide font-mono uppercase">
            Vault Insurance Activated!
          </h3>
          <p className="text-xs text-zinc-300 mt-2 max-w-xs">
            First roll was below Grade 7.0! Policy automatically triggers an instant re-roll...
          </p>
          <div className="mt-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-[10px] font-mono font-bold text-amber-300 animate-pulse">
            RE-EVALUATING SLAB INTEGRITY...
          </div>
        </div>
      )}

      {/* ============================================================
          PHASE 5: COLOR-CODED GRADE IMPACT SHOCKWAVES
          ============================================================ */}
      {phase === 'grade_slam' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* 1. Grade 1–3: Red Shockwave ("Schulhof-Müll") */}
          {isPoor && (
            <div className="absolute inset-0 flex items-center justify-center animate-screen-shake">
              <div className="absolute w-72 h-72 rounded-full border-4 border-red-500 animate-shockwave shadow-[0_0_40px_rgba(239,68,68,0.8)]" />
              <div className="absolute w-96 h-96 rounded-full border-2 border-red-600/60 animate-shockwave" />
              {/* Cracked screen distortion overlay */}
              <div className="absolute inset-0 bg-red-950/30 mix-blend-color-burn" />
              <div className="px-4 py-2 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-300 font-mono font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                GRADE {numericGrade}.0 • BEATEN
              </div>
            </div>
          )}

          {/* 2. Grade 7–8: Silver Shine ("Crisp") */}
          {isCrisp && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-72 h-72 rounded-full border-4 border-slate-200 animate-shockwave shadow-[0_0_50px_rgba(255,255,255,0.9)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-100/20 via-white/40 to-transparent mix-blend-overlay animate-pulse" />
              <div className="px-4 py-2 rounded-2xl bg-zinc-900/90 border-2 border-zinc-300 text-zinc-100 font-mono font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-200" />
                CRISP GRADE {numericGrade}.0
              </div>
            </div>
          )}

          {/* 3. Grade 10: Golden Explosion & Fanfare ("PEAK FICTION") */}
          {isGemMint10 && (
            <div className="absolute inset-0 flex items-center justify-center animate-screen-shake-intense">
              {/* Expanding Golden Shockwave Rings */}
              <div className="absolute w-72 h-72 rounded-full border-8 border-yellow-400 animate-shockwave shadow-[0_0_70px_rgba(250,204,21,1)]" />
              <div className="absolute w-96 h-96 rounded-full border-4 border-amber-300 animate-shockwave" />
              {/* Golden Sunburst Radial Flash */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(251,191,36,0.5)_0%,transparent_70%)] animate-pulse" />
              {/* Celebration Banner */}
              <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-white text-zinc-950 font-black text-base uppercase tracking-widest shadow-[0_0_30px_rgba(251,191,36,0.8)] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-zinc-900 fill-zinc-900" />
                PEAK FICTION • GEM MINT 10
              </div>
            </div>
          )}

          {/* 4. Black Label: Midnight Obsidian Void & Dark Lightning ("THE CHOSEN ONE") */}
          {isBlackLabel && (
            <div className="absolute inset-0 flex items-center justify-center animate-screen-shake-intense">
              {/* Dark Vortex */}
              <div className="absolute w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,#18181b_10%,#09090b_50%,transparent_75%)] animate-obsidian-vortex" />
              {/* Golden Obsidian Aura Shockwave */}
              <div className="absolute w-80 h-80 rounded-full border-4 border-amber-400 animate-shockwave shadow-[0_0_80px_rgba(212,175,55,0.9)]" />
              {/* Dark Lightning Arcs */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(168,85,247,0.3)_0%,transparent_70%)] mix-blend-screen" />
              {/* Black Label Monolith Badge */}
              <div className="px-6 py-3 rounded-2xl bg-black border-2 border-amber-400 text-amber-300 font-black text-base uppercase tracking-widest shadow-[0_0_40px_rgba(212,175,55,0.8)] flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                ★ THE CHOSEN ONE • BLACK LABEL ★
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GradingScannerFX;
