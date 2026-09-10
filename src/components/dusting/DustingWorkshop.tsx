'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CardInstance, ConsumableToolId } from '../../types/card';
import { calculateDustYield, calculateRawCardValue, CONSUMABLE_TOOLS } from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  Sparkles,
  Flame,
  ShoppingBag,
  CheckSquare,
  Square,
  Shield,
  Zap,
  RotateCcw,
  Layers,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';

interface DustingWorkshopProps {
  onGoToGrading?: () => void;
}

export const DustingWorkshop: React.FC<DustingWorkshopProps> = ({ onGoToGrading }) => {
  const stardust = useGameStore((state) => state.stardust);
  const inventory = useGameStore((state) => state.inventory);
  const binder = useGameStore((state) => state.binder);
  const tools = useGameStore((state) => state.tools);
  const dustCards = useGameStore((state) => state.dustCards);
  const buyTool = useGameStore((state) => state.buyTool);

  // Filter for un-graded (raw) cards in inventory (graded slabs cannot be recycled)
  const rawCards = useMemo(() => {
    return inventory.filter((c) => !c.grade);
  }, [inventory]);

  // Selected card instance IDs for recycling
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Animated Dust Balance Ticker State
  const [displayDust, setDisplayDust] = useState<number>(stardust);
  const [isDusting, setIsDusting] = useState<boolean>(false);
  const [lastDustGain, setLastDustGain] = useState<number | null>(null);

  // Animated counter tick when stardust changes
  useEffect(() => {
    if (displayDust === stardust) return;

    const diff = stardust - displayDust;
    const step = Math.max(1, Math.ceil(Math.abs(diff) / 12));

    const timer = setTimeout(() => {
      setDisplayDust((prev) => {
        if (prev < stardust) {
          return Math.min(stardust, prev + step);
        } else {
          return Math.max(stardust, prev - step);
        }
      });
    }, 25);

    return () => clearTimeout(timer);
  }, [stardust, displayDust]);

  // Support perk check (Maruo gives +20% bonus dust yield)
  const hasMaruoSupport = useMemo(() => {
    const supportSlot = binder.slots.find((s) => s.slotIndex === 5);
    if (!supportSlot?.cardInstanceId) return false;
    const card = inventory.find((c) => c.id === supportSlot.cardInstanceId);
    return card?.characterId === 'maruo';
  }, [binder, inventory]);

  // Real-time calculation of total Stardust to gain from selected cards
  const estimatedDustYield = useMemo(() => {
    let total = 0;
    for (const card of rawCards) {
      if (selectedIds.has(card.id)) {
        total += calculateDustYield(card, hasMaruoSupport);
      }
    }
    return total;
  }, [rawCards, selectedIds, hasMaruoSupport]);

  // Toggle individual card selection
  const toggleSelectCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Batch selection helpers
  const handleSelectAll = () => {
    const all = new Set(rawCards.map((c) => c.id));
    setSelectedIds(all);
  };

  const handleSelectCommons = () => {
    const commons = new Set(rawCards.filter((c) => c.rarity === 'C').map((c) => c.id));
    setSelectedIds(commons);
  };

  const handleSelectCommonsAndUncommons = () => {
    const lowRarity = new Set(
      rawCards.filter((c) => c.rarity === 'C' || c.rarity === 'UC').map((c) => c.id)
    );
    setSelectedIds(lowRarity);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Execute Recycling Routine
  const handleRecycle = async () => {
    if (selectedIds.size === 0 || isDusting) return;

    setIsDusting(true);
    soundEngine.playDustVaporizeSound();

    const idsToDust = Array.from(selectedIds);
    const dustEarned = dustCards(idsToDust);

    setLastDustGain(dustEarned);
    setSelectedIds(new Set());

    setTimeout(() => {
      setIsDusting(false);
    }, 800);
  };

  // Buy Tool Action
  const handleBuyTool = (toolId: ConsumableToolId) => {
    try {
      buyTool(toolId, 1);
      soundEngine.playToolClickSound();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 select-none">
      {/* HEADER & ANIMATED STARDUST TICKER */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-md">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            Stardust Transmutation Workshop
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Card Recycler & Consumable Lab
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Vaporize spare raw cards to harvest pure Stardust (20% of raw market value). Use Stardust to purchase grading tools.
          </p>
        </div>

        {/* Animated Stardust Balance Ticker */}
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 rounded-2xl bg-zinc-950 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center gap-3 font-mono">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 leading-none">
                Stardust Balance
              </span>
              <span className="text-xl font-black text-cyan-300 leading-tight">
                {displayDust.toLocaleString()}
                <span className="text-xs font-normal text-cyan-400/70 ml-1">Dust</span>
              </span>
            </div>
          </div>

          {onGoToGrading && (
            <button
              onClick={onGoToGrading}
              className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <span>The Vault</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          MAIN WORKSHOP: DUAL COLUMN LAYOUT
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MULTI-SELECT CARD RECYCLER */}
        <div className="lg:col-span-8 flex flex-col gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl shadow-2xl">
          {/* Recycler Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-white">
                Raw Card Recycler ({rawCards.length})
              </h3>
            </div>

            {/* Quick Batch Select Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <button
                onClick={handleSelectCommons}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              >
                Select Commons
              </button>
              <button
                onClick={handleSelectCommonsAndUncommons}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
              >
                C &amp; UC
              </button>
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 transition"
              >
                Select All
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-950/80 text-red-300 border border-red-800/50 transition"
                >
                  Clear ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {rawCards.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[520px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {rawCards.map((card) => {
                const isSelected = selectedIds.has(card.id);
                const dustYield = calculateDustYield(card, hasMaruoSupport);
                const rawVal = calculateRawCardValue(card.rarity, card.finish);

                return (
                  <div
                    key={card.id}
                    onClick={() => toggleSelectCard(card.id)}
                    className={`relative p-2 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col items-center select-none group ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.35)] scale-[1.02]'
                        : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3 z-30">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-md bg-cyan-400 text-black flex items-center justify-center shadow">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-black/60 border border-zinc-600 text-zinc-500 flex items-center justify-center group-hover:border-zinc-400">
                          <Square className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Card Thumbnail */}
                    <div className="w-full flex justify-center py-1">
                      <CardRenderer card={card} size="sm" interactive={false} showMarketValue={false} />
                    </div>

                    {/* Metadata & Dust Value */}
                    <div className="w-full mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400 truncate max-w-[65px]">
                        {rawVal} ¥
                      </span>
                      <span className="font-bold text-cyan-300 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        +{dustYield}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">No Raw Cards in Inventory</h4>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                All your cards are either already graded in slabs or slotted into your binder pages.
              </p>
            </div>
          )}

          {/* Recycler Footer: Action Bar */}
          <div className="mt-2 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col font-mono">
                <span className="text-[10px] uppercase text-zinc-400">Selected Cards</span>
                <span className="text-base font-black text-white">{selectedIds.size} Copies</span>
              </div>

              <div className="h-8 w-px bg-zinc-800" />

              <div className="flex flex-col font-mono">
                <span className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <span>Stardust Gained</span>
                  {hasMaruoSupport && (
                    <span className="text-[9px] text-yellow-400 font-bold px-1 rounded bg-yellow-950 border border-yellow-500/40">
                      +20% Maruo
                    </span>
                  )}
                </span>
                <span className="text-base font-black text-cyan-300">
                  +{estimatedDustYield.toLocaleString()} Dust
                </span>
              </div>
            </div>

            <button
              onClick={handleRecycle}
              disabled={selectedIds.size === 0 || isDusting}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-xl ${
                selectedIds.size > 0 && !isDusting
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 hover:to-teal-300 text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
              }`}
            >
              {isDusting ? (
                <span className="flex items-center gap-2 animate-pulse font-mono">
                  <Flame className="w-4 h-4 animate-spin" />
                  VAPORIZING...
                </span>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>Vaporize Selected ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CONSUMABLE TOOL SHOP */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-white">
                Consumable Tool Shop
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Equip these precision tools before submitting cards to The Vault to manipulate grading roll probabilities.
            </p>

            {/* Tool 1: Microfiber Cloth */}
            {(() => {
              const tool = CONSUMABLE_TOOLS.microfiber_cloth;
              const owned = tools.microfiber_cloth ?? 0;
              const canAfford = stardust >= tool.stardustCost;
              return (
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition flex flex-col gap-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-extrabold text-xs text-white">{tool.name}</h4>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        100% Protection Against Grades 1–3
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      Owned: {owned}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {tool.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-black text-cyan-300">
                      {tool.stardustCost} Dust
                    </span>
                    <button
                      onClick={() => handleBuyTool('microfiber_cloth')}
                      disabled={!canAfford}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-[11px] uppercase tracking-wider transition active:scale-95 shadow"
                    >
                      Buy Tool
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Tool 2: Centering Laser */}
            {(() => {
              const tool = CONSUMABLE_TOOLS.centering_laser;
              const owned = tools.centering_laser ?? 0;
              const canAfford = stardust >= tool.stardustCost;
              return (
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition flex flex-col gap-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-extrabold text-xs text-white">{tool.name}</h4>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">
                        +5% Flat Chance for Grade 10
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      Owned: {owned}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {tool.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-black text-cyan-300">
                      {tool.stardustCost} Dust
                    </span>
                    <button
                      onClick={() => handleBuyTool('centering_laser')}
                      disabled={!canAfford}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-[11px] uppercase tracking-wider transition active:scale-95 shadow"
                    >
                      Buy Tool
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Tool 3: Vault Insurance */}
            {(() => {
              const tool = CONSUMABLE_TOOLS.vault_insurance;
              const owned = tools.vault_insurance ?? 0;
              const canAfford = stardust >= tool.stardustCost;
              return (
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition flex flex-col gap-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <h4 className="font-extrabold text-xs text-white">{tool.name}</h4>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">
                        Automatic Reroll if &lt; Grade 7
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      Owned: {owned}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {tool.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-black text-cyan-300">
                      {tool.stardustCost} Dust
                    </span>
                    <button
                      onClick={() => handleBuyTool('vault_insurance')}
                      disabled={!canAfford}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-[11px] uppercase tracking-wider transition active:scale-95 shadow"
                    >
                      Buy Tool
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DustingWorkshop;
