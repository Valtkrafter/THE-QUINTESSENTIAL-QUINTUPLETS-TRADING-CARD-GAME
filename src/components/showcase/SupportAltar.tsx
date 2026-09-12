'use client';

import React, { useMemo } from 'react';
import { CardInstance } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { resolveActiveSupportBuff } from '../../config/supportBuffs';
import { calculateCardMarketValue } from '../../config/economy';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  BookOpen,
  Plus,
  Zap,
  Sparkles,
  RotateCw,
  X,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

interface SupportAltarProps {
  onOpenDrawer: () => void;
  className?: string;
}

export const SupportAltar: React.FC<SupportAltarProps> = ({ onOpenDrawer, className = '' }) => {
  const supportSlot = useGameStore((state) => state.supportSlot);
  const slotSupportCard = useGameStore((state) => state.slotSupportCard);

  // Active resolved support buff with Grade 9/10 scaling (+20%)
  const resolvedBuff = useMemo(() => {
    return resolveActiveSupportBuff(supportSlot);
  }, [supportSlot]);

  const isGradeScaled = Boolean(supportSlot?.grade && supportSlot.grade.numericGrade >= 9);

  const handleUnmount = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      slotSupportCard(null);
      soundEngine.playFoilRustle();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSwap = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDrawer();
  };

  return (
    <div className={`relative flex flex-col items-center pointer-events-none select-none z-30 ${className}`}>
      {/* Downward-projecting ambient light cone connecting to lower sister pedestals */}
      <div
        className="absolute top-24 -bottom-48 w-80 sm:w-96 md:w-[500px] pointer-events-none select-none opacity-40 transition-all duration-700"
        style={{
          background: supportSlot
            ? isGradeScaled
              ? 'conic-gradient(from 180deg at 50% 0%, transparent 60deg, rgba(245,158,11,0.25) 80deg, rgba(234,179,8,0.35) 90deg, rgba(245,158,11,0.25) 100deg, transparent 120deg)'
              : 'conic-gradient(from 180deg at 50% 0%, transparent 60deg, rgba(139,92,246,0.2) 80deg, rgba(168,85,247,0.3) 90deg, rgba(139,92,246,0.2) 100deg, transparent 120deg)'
            : 'conic-gradient(from 180deg at 50% 0%, transparent 65deg, rgba(245,158,11,0.08) 85deg, rgba(245,158,11,0.12) 90deg, rgba(245,158,11,0.08) 95deg, transparent 115deg)',
          filter: 'blur(30px)',
        }}
      />

      {/* Ceiling Dais Halo / Lantern Fixture */}
      <div className="flex items-center gap-2 mb-2 pointer-events-none select-none">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/40" />
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-amber-500/30 text-[10px] font-mono font-black uppercase tracking-wider text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          <span>Support Altar • Tutor Dais</span>
          {isGradeScaled && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950 font-black text-[9px] shadow-[0_0_10px_rgba(245,158,11,0.6)]">
              SLAB +20%
            </span>
          )}
        </div>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/40" />
      </div>

      {/* Main Pedestal Container */}
      <div className="relative w-48 h-64 sm:w-52 sm:h-70 md:w-56 md:h-76 pointer-events-auto">
        {supportSlot ? (
          /* ============================================================
             SLOTTED STATE: SUPPORT CARD SLAB PREVIEW WITH HOVER CONTROLS
             ============================================================ */
          <div
            onClick={onOpenDrawer}
            className="group relative w-full h-full rounded-2xl border border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.2)] hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] transition-all duration-300 cursor-pointer overflow-hidden p-1.5 bg-[#0b0b12]"
          >
            {/* Card Inner View */}
            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              {supportSlot.grade ? (
                <GradingSlab
                  card={supportSlot}
                  interactive={false}
                  size="full"
                  className="w-full h-full pointer-events-none select-none !p-0 !m-0"
                  showMarketValue={false}
                  showcaseMode={true}
                />
              ) : (
                <CardRenderer
                  card={supportSlot}
                  interactive={false}
                  disableTilt={true}
                  size="full"
                  className="w-full h-full pointer-events-none select-none !p-0 !m-0"
                  showMarketValue={false}
                  hideInternalFooter={true}
                />
              )}

              {/* Gold Ethereal Dais Border Glow */}
              <div
                className="absolute inset-0 rounded-xl border-2 pointer-events-none transition-colors duration-500 z-20"
                style={{
                  borderColor: isGradeScaled ? 'rgba(245, 158, 11, 0.7)' : 'rgba(217, 119, 6, 0.4)',
                  boxShadow: isGradeScaled
                    ? 'inset 0 0 20px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.4)'
                    : 'inset 0 0 15px rgba(217,119,6,0.15)',
                }}
              />

              {/* Grade 9/10 Scaling Shimmer Badge */}
              {isGradeScaled && (
                <div className="absolute top-2 left-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-mono font-black text-[10px] shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  <span>+20% BUFF</span>
                </div>
              )}

              {/* Full-Card Hover Action Controls */}
              <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5 p-3 select-none overflow-hidden">
                {/* Isolated backdrop blur */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center justify-center gap-2 w-full text-center">
                  <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-wide">
                    {supportSlot.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    ¥{calculateCardMarketValue(supportSlot).toLocaleString()}
                  </span>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleSwap}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-black text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUnmount}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-mono font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Unmount</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             EMPTY STATE: ENGRAVED SILHOUETTE & PULSING PROMPT
             ============================================================ */
          <div
            onClick={onOpenDrawer}
            className="group relative w-full h-full rounded-2xl border-2 border-dashed border-amber-500/30 hover:border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 cursor-pointer overflow-hidden p-4 flex flex-col items-center justify-center gap-3 bg-[#0c0c14]/80 backdrop-blur-sm"
          >
            {/* Subtle animated background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] via-transparent to-amber-500/[0.02] pointer-events-none group-hover:from-amber-500/[0.08] transition-colors duration-300" />

            <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 text-center">
              {/* Notebook Icon with glowing ring */}
              <div className="relative w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 group-hover:border-amber-400/60 flex items-center justify-center text-amber-400 group-hover:text-amber-300 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:scale-105">
                <BookOpen className="w-6 h-6" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-md">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              <div>
                <span className="text-xs font-mono font-black tracking-wider text-zinc-200 group-hover:text-amber-300 uppercase block">
                  Socket Tutor / Support
                </span>
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400 block mt-0.5">
                  Fuutarou • Raiha • Maruo • Takeda
                </span>
              </div>

              <div className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-400/80 uppercase tracking-wide">
                Passive Economy Buffs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slotted State: Glowing HUD Badge Plate Below Altar */}
      {supportSlot && resolvedBuff && (
        <div className="mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-amber-300 font-mono text-xs font-black animate-pulse max-w-sm text-center">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{resolvedBuff.badgeLabel}</span>
        </div>
      )}
    </div>
  );
};
