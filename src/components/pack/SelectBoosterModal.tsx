'use client';

import React, { useState } from 'react';
import { PackId, Rarity, Finish } from '../../types/card';
import {
  PACKS_CONFIG,
  FINISH_CHANCES,
  FINISH_MULTIPLIERS,
  GRADE_TIER_CONFIG,
  RARITY_BASE_VALUES,
} from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { PACK_THEMES } from './BoosterPack3D';
import { RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import {
  PackageOpen,
  X,
  Sparkles,
  BarChart2,
  TrendingUp,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Flame,
  Award,
  Zap,
} from 'lucide-react';

export interface SelectBoosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPack: (packId: PackId) => void;
}

const ALL_PACK_IDS: PackId[] = [
  'test_sheet',
  'kiosk',
  'lernsession',
  'sommerfeuerwerk',
  'schulfest',
  'klassenfahrt_kyoto',
  'braut_schicksal',
  'god_pack',
];

const RARITY_ORDER: Rarity[] = ['C', 'UC', 'R', 'SR', 'UR', 'SEC', 'MR'];
const FINISH_ORDER: Finish[] = ['raw', 'holo', 'sparkle', 'rainbow', 'gold_etched', 'signed'];

const FINISH_COLORS: Record<Finish, string> = {
  raw: 'text-zinc-400',
  holo: 'text-sky-300',
  sparkle: 'text-purple-300',
  rainbow: 'text-pink-400',
  gold_etched: 'text-amber-300',
  signed: 'text-yellow-300 font-black',
};

export const SelectBoosterModal: React.FC<SelectBoosterModalProps> = ({
  isOpen,
  onClose,
  onSelectPack,
}) => {
  const [inspectingPackId, setInspectingPackId] = useState<PackId | null>(null);
  const yen = useGameStore((state) => state.yen);

  if (!isOpen) return null;

  const inspectedConfig = inspectingPackId ? PACKS_CONFIG[inspectingPackId] : null;
  const inspectedTheme = inspectingPackId ? PACK_THEMES[inspectingPackId] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-5 select-none animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (inspectingPackId) {
            setInspectingPackId(null);
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="w-full max-w-5xl bg-[#0b0c14] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden my-auto">
        {/* Iridescent background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ============================================================
            VIEW 1: PACK CATALOG GRID
            ============================================================ */}
        {!inspectingPackId ? (
          <>
            {/* Header: Title, Player Yen & Close */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <PackageOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
                    <span>Select Booster Pack</span>
                    <span className="text-xs font-serif text-zinc-500 font-normal hidden sm:inline">
                      五等分の花嫁
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Choose from 8 authentic Japanese TCG foil tiers to initiate direct-on-pack opening ceremony.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Balance Badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 font-mono text-xs font-bold text-amber-400">
                  <span className="text-[10px] text-zinc-500">BALANCE:</span>
                  <span>{yen.toLocaleString()} ¥</span>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition"
                  title="Close Selector"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 8-Pack Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
              {ALL_PACK_IDS.map((pId) => {
                const config = PACKS_CONFIG[pId];
                const theme = PACK_THEMES[pId];
                const canAfford = yen >= config.costYen;
                const isGodTier = pId === 'god_pack' || config.isGodPack;

                return (
                  <div
                    key={pId}
                    className={`group relative p-4 rounded-2xl bg-zinc-900/60 border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                      isGodTier
                        ? 'border-yellow-400/50 hover:border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                        : 'border-white/10 hover:border-white/30 hover:bg-zinc-900/90'
                    }`}
                  >
                    {/* Metallic Top Accents */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 opacity-70"
                      style={{ backgroundColor: theme.primaryColor }}
                    />

                    {/* Card Content Top */}
                    <div>
                      {/* Top Header: Motif & Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/15"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${theme.primaryColor}55, #09090f)`,
                            boxShadow: `0 0 15px ${theme.accentGlow}`,
                          }}
                        >
                          <span>{theme.motifIcon}</span>
                        </div>

                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border font-mono shadow"
                          style={{
                            backgroundColor: `${theme.primaryColor}20`,
                            borderColor: theme.primaryColor,
                            color: theme.primaryColor,
                          }}
                        >
                          {theme.badge}
                        </span>
                      </div>

                      {/* Japanese & English Titles */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-serif tracking-wider text-zinc-400 truncate">
                          {theme.japaneseTitle}
                        </div>
                        <h4 className="font-black text-sm text-white truncate group-hover:text-amber-300 transition">
                          {theme.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                          {config.description}
                        </p>
                      </div>

                      {/* Quick Meta Pills */}
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-black/40 text-[9px] font-mono text-zinc-300 border border-white/10">
                          {config.slots} Cards
                        </span>
                        {config.canTriggerGodPack && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[9px] font-mono font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>God Pack 0.05%</span>
                          </span>
                        )}
                        {pId === 'braut_schicksal' && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-[9px] font-mono font-bold text-purple-300 border border-purple-500/30">
                            R+ Guaranteed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions: Open + Odds Inspector */}
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      {/* Drop-Rate Inspector Trigger Button */}
                      <button
                        onClick={() => setInspectingPackId(pId)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 border border-white/10 transition"
                      >
                        <BarChart2 className="w-3 h-3 text-amber-400" />
                        <span>Drop Rates & Multipliers</span>
                        <ChevronRight className="w-3 h-3 text-zinc-500 ml-auto" />
                      </button>

                      {/* Open Pack Button */}
                      <button
                        onClick={() => {
                          onSelectPack(pId);
                        }}
                        disabled={!canAfford && config.costYen > 0}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-35 disabled:pointer-events-none text-black font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                      >
                        <span>Open Pack</span>
                        <span className="font-mono opacity-80 text-[11px]">
                          ({config.costYen > 0 ? `${config.costYen.toLocaleString()} ¥` : 'FREE'})
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ============================================================
              VIEW 2: DEDICATED DROP-RATE & MULTIPLIER INSPECTOR
              ============================================================ */
          inspectedConfig &&
          inspectedTheme && (
            <div className="space-y-6 relative z-10 animate-fadeIn">
              {/* Inspector Header & Back Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setInspectingPackId(null)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition flex items-center gap-1.5 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl border border-white/20 shadow-inner"
                      style={{
                        background: `radial-gradient(circle, ${inspectedTheme.primaryColor}66, #0c0c14)`,
                      }}
                    >
                      {inspectedTheme.motifIcon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-white">
                          {inspectedTheme.name}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border"
                          style={{
                            backgroundColor: `${inspectedTheme.primaryColor}20`,
                            borderColor: inspectedTheme.primaryColor,
                            color: inspectedTheme.primaryColor,
                          }}
                        >
                          {inspectedTheme.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-serif">
                        {inspectedTheme.japaneseTitle} • Drop Rate & Multiplier Analysis
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingPackId(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Two Column Layout: Drop Table & Multiplier Mechanics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. EXACT RARITY DROP RATES TABLE */}
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        Rarity Drop Rates (Per Slot)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {inspectedConfig.slots} Slots Per Pack
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Exact probabilistic weightings configured in the official game economy engine for this tier.
                  </p>

                  <div className="space-y-2 pt-1">
                    {RARITY_ORDER.map((rarity) => {
                      const rate = inspectedConfig.dropTable[rarity] ?? 0;
                      const badgeStyle = RARITY_BADGES[rarity] ?? RARITY_BADGES.C;
                      const isHighTier = rarity === 'SR' || rarity === 'UR' || rarity === 'SEC' || rarity === 'MR';

                      return (
                        <div
                          key={rarity}
                          className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5"
                        >
                          <div className="flex items-center gap-2.5 w-24">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black border ${badgeStyle.bgClass} ${badgeStyle.textClass} ${badgeStyle.borderClass}`}
                            >
                              {rarity}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-300 font-semibold">
                              {RARITY_BASE_VALUES[rarity].toLocaleString()} ¥
                            </span>
                          </div>

                          {/* Visual Rate Bar */}
                          <div className="flex-1 mx-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHighTier
                                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                                  : 'bg-zinc-500'
                              }`}
                              style={{ width: `${Math.min(100, rate)}%` }}
                            />
                          </div>

                          {/* Exact Percentage */}
                          <span
                            className={`font-mono text-xs font-bold w-16 text-right ${
                              rate > 0 ? (isHighTier ? 'text-amber-400 font-black' : 'text-zinc-200') : 'text-zinc-600'
                            }`}
                          >
                            {rate > 0 ? `${rate.toFixed(2)}%` : '0.00%'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. VALUE MULTIPLIERS & FINISH ODDS */}
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">
                          Surface Finish Multipliers
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        Up to 40.0× Boost
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                      Every card pulled has a rolled surface finish that directly scales its raw market value and grading ceiling.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {FINISH_ORDER.map((finish) => {
                        const chance = FINISH_CHANCES[finish];
                        const mult = FINISH_MULTIPLIERS[finish];
                        const finishLabel = FINISH_LABELS[finish];
                        const finishColorClass = FINISH_COLORS[finish] ?? 'text-zinc-300';

                        return (
                          <div
                            key={finish}
                            className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider ${finishColorClass}`}
                              >
                                {finishLabel}
                              </span>
                              <span className="text-[10px] font-mono text-amber-400 font-bold">
                                {mult}×
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                              <span>Drop Rate:</span>
                              <span className="text-zinc-200 font-bold">{chance}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Pack Mechanics & Peak Fiction Ceiling */}
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Theoretical Value Multiplier Ceiling</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-normal">
                      Combining a <strong>Signed (40×)</strong> finish with a perfect <strong>Black Label Grade 10 (50×)</strong> creates a gargantuan <strong>2,000× market value multiplier</strong> on any card!
                    </p>
                    {inspectedConfig.canTriggerGodPack && (
                      <p className="text-[10px] text-amber-300 font-mono font-bold mt-1">
                        ★ This pack qualifies for the rare 0.05% Celestial God Pack replacement trigger!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspector Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => setInspectingPackId(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  Return to Pack List
                </button>

                <button
                  onClick={() => {
                    const chosen = inspectingPackId;
                    setInspectingPackId(null);
                    onSelectPack(chosen);
                  }}
                  disabled={yen < inspectedConfig.costYen && inspectedConfig.costYen > 0}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 flex items-center gap-1.5"
                >
                  <span>Open This Pack</span>
                  <span className="font-mono text-[11px] opacity-85">
                    ({inspectedConfig.costYen > 0 ? `${inspectedConfig.costYen.toLocaleString()} ¥` : 'FREE'})
                  </span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SelectBoosterModal;
