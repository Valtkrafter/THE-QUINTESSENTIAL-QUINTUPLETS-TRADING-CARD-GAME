'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PackId, Rarity, Finish } from '../../types/card';
import {
  PACKS_CONFIG,
  FINISH_CHANCES,
  FINISH_MULTIPLIERS,
  RARITY_BASE_VALUES,
} from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { PACK_THEMES } from './BoosterPack3D';
import { RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import {
  PackageOpen,
  X,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  Store,
} from 'lucide-react';
import { SinglesMarket } from '../market/SinglesMarket';

export interface SelectBoosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPack: (packId: PackId) => void;
  initialTab?: 'packs' | 'kiosk';
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
  initialTab = 'packs',
}) => {
  const [oddsPackId, setOddsPackId] = useState<PackId | null>(null);
  const [activeStoreTab, setActiveStoreTab] = useState<'packs' | 'kiosk'>(initialTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveStoreTab(initialTab);
    }
  }, [initialTab]);

  const yen = useGameStore((state) => state.yen);
  const pityCounters = useGameStore((state) => state.pityCounters);

  // Client-side hydration guard for React Portals
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scroll while odds modal is open
  useEffect(() => {
    if (oddsPackId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [oddsPackId]);

  if (!isOpen) return null;

  const inspectedConfig = oddsPackId ? PACKS_CONFIG[oddsPackId] : null;
  const inspectedTheme = oddsPackId ? PACK_THEMES[oddsPackId] : null;

  // Standalone Portal Content for Odds Modal
  const renderOddsPortal = () => {
    if (!mounted || !oddsPackId || !inspectedConfig || !inspectedTheme) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn select-none"
        onClick={() => setOddsPackId(null)}
      >
        <div
          className="w-full max-w-lg rounded-2xl bg-[#0e0e14] border border-white/10 shadow-2xl p-6 text-white relative max-h-[90vh] overflow-y-auto space-y-5"
          style={{ backgroundColor: '#0e0e14', opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
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
                  <h3 className="text-base font-black text-white">
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
                  {inspectedTheme.japaneseTitle} • Official Drop Probabilities
                </p>
              </div>
            </div>

            <button
              onClick={() => setOddsPackId(null)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition"
              title="Close Odds"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Pity Progress Counters */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Active Pity System Counters</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Guaranteed High Tier Safety Net
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* SR Pity Counter */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-300">Super Rare (SR) Pity</span>
                  <span className="font-mono font-bold text-zinc-200">
                    {pityCounters.packsWithoutSR} / 30
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (pityCounters.packsWithoutSR / 30) * 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-zinc-400">
                  Guaranteed SR+ card within 30 paid booster openings without one.
                </p>
              </div>

              {/* UR Pity Counter */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300">Ultra Rare (UR) Pity</span>
                  <span className="font-mono font-bold text-zinc-200">
                    {pityCounters.packsWithoutUR} / 100
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (pityCounters.packsWithoutUR / 100) * 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-zinc-400">
                  Guaranteed UR+ card within 100 paid booster openings without one.
                </p>
              </div>
            </div>
          </div>

          {/* Guaranteed Rules / Tier Special Mechanics */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <strong className="uppercase font-mono">Guaranteed Rules: </strong>
              {oddsPackId === 'braut_schicksal' && (
                <span>No Commons or Uncommons! Guaranteed Rare (R) or higher in every slot.</span>
              )}
              {oddsPackId === 'klassenfahrt_kyoto' && (
                <span>No Common cards in this pack. Minimum Uncommon (UC) in every slot.</span>
              )}
              {oddsPackId === 'god_pack' && (
                <span>★ CELESTIAL GOD PACK: 100% Ultra, Secret, and Master Rares only!</span>
              )}
              {oddsPackId !== 'braut_schicksal' &&
                oddsPackId !== 'klassenfahrt_kyoto' &&
                oddsPackId !== 'god_pack' && (
                  <span>
                    {inspectedConfig.slots} cards per booster. Base odds configured per slot below.
                  </span>
                )}
            </div>
          </div>

          {/* Base Rarity Probabilities Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black uppercase tracking-wider text-white">
                Base Rarity Probabilities (Per Slot)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {inspectedConfig.slots} Slots Per Pack
              </span>
            </div>

            <div className="space-y-1.5">
              {RARITY_ORDER.map((rarity) => {
                const rate = inspectedConfig.dropTable[rarity] ?? 0;
                const badgeStyle = RARITY_BADGES[rarity] ?? RARITY_BADGES.C;
                const isHighTier =
                  rarity === 'SR' || rarity === 'UR' || rarity === 'SEC' || rarity === 'MR';

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
                      <span className="text-[10px] font-mono text-zinc-300 font-semibold">
                        {RARITY_BASE_VALUES[rarity].toLocaleString()} ¥
                      </span>
                    </div>

                    {/* Rate Bar */}
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

                    {/* Exact Probability */}
                    <span
                      className={`font-mono text-xs font-bold w-16 text-right ${
                        rate > 0
                          ? isHighTier
                            ? 'text-amber-400 font-black'
                            : 'text-zinc-200'
                          : 'text-zinc-600'
                      }`}
                    >
                      {rate > 0 ? `${rate.toFixed(2)}%` : '0.00%'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Surface Finish Multipliers */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-white">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Surface Finish Odds & Multipliers</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                Up to 40× Value Boost
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FINISH_ORDER.map((finish) => {
                const chance = FINISH_CHANCES[finish];
                const mult = FINISH_MULTIPLIERS[finish];
                const finishLabel = FINISH_LABELS[finish];
                const finishColorClass = FINISH_COLORS[finish] ?? 'text-zinc-300';

                return (
                  <div
                    key={finish}
                    className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between text-[10px]"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-black uppercase tracking-wider ${finishColorClass}`}>
                        {finishLabel}
                      </span>
                      <span className="font-mono text-amber-400 font-bold">{mult}×</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 font-mono text-[9px]">
                      <span>Chance:</span>
                      <span className="text-zinc-200">{chance}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popover Footer Action */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              onClick={() => setOddsPackId(null)}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition"
            >
              Close
            </button>

            <button
              onClick={() => {
                const chosen = oddsPackId;
                setOddsPackId(null);
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
      </div>,
      document.body
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-5 select-none animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-5xl bg-[#0b0c14] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden my-auto">
        {/* Iridescent background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ============================================================
            HEADER: Title, Player Yen & Close
            ============================================================ */}
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

        {/* Store Tabs Switcher: Booster Packs vs. Singles Kiosk */}
        <div className="flex items-center gap-2 relative z-10 font-mono text-xs">
          <button
            onClick={() => setActiveStoreTab('packs')}
            className={`px-4 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all ${
              activeStoreTab === 'packs'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white bg-zinc-900/80 border border-white/5 hover:border-white/10'
            }`}
          >
            <PackageOpen className="w-4 h-4" />
            <span>Booster Packs</span>
          </button>

          <button
            onClick={() => setActiveStoreTab('kiosk')}
            className={`px-4 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all ${
              activeStoreTab === 'kiosk'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white bg-zinc-900/80 border border-white/5 hover:border-white/10'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Singles Kiosk</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                activeStoreTab === 'kiosk' ? 'bg-black/25 text-black' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              DAILY
            </span>
          </button>
        </div>

        {/* Content View: Singles Kiosk vs. Booster Packs Grid */}
        {activeStoreTab === 'kiosk' ? (
          <div className="relative z-10 py-1">
            <SinglesMarket />
          </div>
        ) : (
          /* 8-PACK RESPONSIVE GRID (With Minimalist Circular '?' Odds Button) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
          {ALL_PACK_IDS.map((pId) => {
            const config = PACKS_CONFIG[pId];
            const theme = PACK_THEMES[pId];
            const canAfford = yen >= config.costYen;
            const isGodTier = pId === 'god_pack' || config.isGodPack;

            return (
              <div
                key={pId}
                onClick={() => onSelectPack(pId)}
                className={`group relative p-4 rounded-2xl bg-zinc-900/60 border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer ${
                  isGodTier
                    ? 'border-yellow-400/50 hover:border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                    : 'border-white/10 hover:border-white/30 hover:bg-zinc-900/90'
                }`}
              >
                {/* Metallic Top Line Accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 opacity-70"
                  style={{ backgroundColor: theme.primaryColor }}
                />

                {/* Minimalist Circular '?' Odds Button (Top-Right Corner) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOddsPackId(pId);
                  }}
                  className="absolute top-3 right-3 h-7 w-7 rounded-full border border-white/15 bg-black/40 text-zinc-300 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all z-20 backdrop-blur-sm"
                  title="View Drop Rates & Multipliers"
                >
                  <span className="text-xs font-bold font-mono">?</span>
                </button>

                {/* Pack Card Content */}
                <div>
                  {/* Top Header: Motif & Badge */}
                  <div className="flex items-start justify-between mb-3 pr-8">
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
                    {pId === 'klassenfahrt_kyoto' && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-[9px] font-mono font-bold text-rose-300 border border-rose-500/30">
                        No Commons
                      </span>
                    )}
                  </div>
                </div>

                {/* Open Pack Primary Action Button */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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
      )}

        {/* Portal-Mounted Odds Modal */}
        {renderOddsPortal()}
      </div>
    </div>
  );
};

export default SelectBoosterModal;
