'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, PackId, Rarity, Finish } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { CARD_MAP, getCardDef } from '../../config/cardsData';
import { calculateCardMarketValue, calculateDustYield, PACKS_CONFIG } from '../../config/economy';
import { RealisticCardRenderer } from '../card/RealisticCardRenderer';
import { RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audio';
import {
  Sparkles,
  Eye,
  Trash2,
  RefreshCw,
  BookOpen,
  X,
  Coins,
  CheckCircle2,
  Layers,
  Rotate3d,
} from 'lucide-react';

export interface PackSummaryGridProps {
  cards: CardInstance[];
  isGodPack?: boolean;
  packId: PackId;
  previouslyDiscoveredCardDefIds?: Set<string>;
  onOpenAnother: () => void;
  onClose: () => void;
  canOpenAnother?: boolean;
  packCost?: number;
  isCooldownActive?: boolean;
  cooldownRemaining?: number;
}

// Arc/fan geometry offsets for 5 cards on desktop (index 0 to 4, center is 2)
const ARC_ROTATIONS = [-10, -5, 0, 5, 10];
const ARC_Y_OFFSETS = [16, 4, 0, 4, 16];
const ARC_X_OFFSETS = [-20, -10, 0, 10, 20];

// Tier-specific glowing border styles
export function getFinishGlowBorder(finish: Finish | string): {
  containerBorder: string;
  shadowGlow: string;
  badgeBorder: string;
} {
  switch (finish) {
    case 'signed':
    case 'signed_sp':
      return {
        containerBorder: 'border-2 border-amber-400/90',
        shadowGlow: 'shadow-[0_0_30px_rgba(251,191,36,0.65)]',
        badgeBorder: 'border-amber-400 bg-amber-500/20 text-amber-300',
      };
    case 'gold_etched':
      return {
        containerBorder: 'border-2 border-yellow-500/80',
        shadowGlow: 'shadow-[0_0_24px_rgba(234,179,8,0.55)]',
        badgeBorder: 'border-yellow-500 bg-yellow-500/20 text-yellow-300',
      };
    case 'rainbow':
      return {
        containerBorder: 'border-2 border-pink-400/80',
        shadowGlow: 'shadow-[0_0_22px_rgba(244,114,182,0.5)]',
        badgeBorder: 'border-pink-400 bg-pink-500/20 text-pink-300',
      };
    case 'sparkle':
      return {
        containerBorder: 'border-2 border-purple-400/70',
        shadowGlow: 'shadow-[0_0_18px_rgba(192,132,252,0.45)]',
        badgeBorder: 'border-purple-400 bg-purple-500/20 text-purple-300',
      };
    case 'holo':
      return {
        containerBorder: 'border-2 border-sky-400/70',
        shadowGlow: 'shadow-[0_0_15px_rgba(56,189,248,0.4)]',
        badgeBorder: 'border-sky-400 bg-sky-500/20 text-sky-300',
      };
    case 'raw':
    default:
      return {
        containerBorder: 'border border-white/15',
        shadowGlow: 'shadow-[0_4px_16px_rgba(0,0,0,0.6)]',
        badgeBorder: 'border-white/20 bg-zinc-800/60 text-zinc-400',
      };
  }
}

export const PackSummaryGrid: React.FC<PackSummaryGridProps> = ({
  cards,
  isGodPack = false,
  packId,
  previouslyDiscoveredCardDefIds,
  onOpenAnother,
  onClose,
  canOpenAnother = true,
  packCost = 0,
  isCooldownActive = false,
  cooldownRemaining = 0,
}) => {
  const [selectedCardFor3D, setSelectedCardFor3D] = useState<CardInstance | null>(null);
  const [dustedCardIds, setDustedCardIds] = useState<string[]>([]);
  const [dustToast, setDustToast] = useState<{ amount: number; count: number } | null>(null);

  const inventory = useGameStore((state) => state.inventory);
  const dustCardStore = useGameStore((state) => state.dustCard);

  // Close 3D inspector on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCardFor3D) {
        setSelectedCardFor3D(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardFor3D]);

  // Evaluate total market value of the pack
  const totalPackMarketValue = useMemo(() => {
    return cards.reduce((sum, c) => sum + calculateCardMarketValue(c), 0);
  }, [cards]);

  // Identify peak rarity
  const peakRarity = useMemo<Rarity>(() => {
    const weights: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, UR: 5, SEC: 6, MR: 7 };
    let highest: Rarity = 'C';
    for (const card of cards) {
      if (weights[card.rarity] > weights[highest]) {
        highest = card.rarity;
      }
    }
    return highest;
  }, [cards]);

  // Check if a card is newly discovered (not previously in dex)
  const isCardNew = useCallback(
    (card: CardInstance): boolean => {
      if (!previouslyDiscoveredCardDefIds) return false;
      return !previouslyDiscoveredCardDefIds.has(card.cardDefId);
    },
    [previouslyDiscoveredCardDefIds]
  );

  // Calculate duplicate non-rares eligible for Quick Dust
  // A non-rare is eligible if rarity is C or UC, not yet dusted, and player has > 1 copy in inventory
  const duplicateNonRares = useMemo(() => {
    const inventoryDefCounts = new Map<string, number>();
    for (const invCard of inventory) {
      inventoryDefCounts.set(
        invCard.cardDefId,
        (inventoryDefCounts.get(invCard.cardDefId) ?? 0) + 1
      );
    }

    return cards.filter((c) => {
      if (c.rarity !== 'C' && c.rarity !== 'UC') return false;
      if (dustedCardIds.includes(c.id)) return false;
      const count = inventoryDefCounts.get(c.cardDefId) ?? 0;
      return count > 1;
    });
  }, [cards, dustedCardIds, inventory]);

  const potentialDustYield = useMemo(() => {
    return duplicateNonRares.reduce((sum, c) => sum + calculateDustYield(c), 0);
  }, [duplicateNonRares]);

  // Handle Quick Dust Duplicates action
  const handleQuickDustDuplicates = useCallback(() => {
    if (duplicateNonRares.length === 0) return;

    let totalYield = 0;
    const newDustedIds = [...dustedCardIds];

    for (const card of duplicateNonRares) {
      const gained = dustCardStore(card.id);
      totalYield += gained;
      newDustedIds.push(card.id);
    }

    setDustedCardIds(newDustedIds);
    setDustToast({ amount: totalYield, count: duplicateNonRares.length });
    soundEngine.play('reveal_rare', 0.6);

    setTimeout(() => {
      setDustToast(null);
    }, 3500);
  }, [dustCardStore, dustedCardIds, duplicateNonRares]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full max-w-6xl my-auto z-20 py-2 sm:py-4 select-none animate-fadeIn">
      {/* ============================================================
          METRICS HEADER SUBTITLE & TOAST NOTIFICATION
          ============================================================ */}
      <div className="flex flex-col items-center text-center gap-1 mb-2 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-xs font-mono">
          <span className="text-zinc-400">Peak Rarity:</span>
          <span className="font-black text-amber-400">{peakRarity}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">Total Value:</span>
          <span className="font-bold text-amber-300">{totalPackMarketValue.toLocaleString()} ¥</span>
          {isGodPack && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="font-black text-yellow-300 tracking-wider animate-pulse">
                ★ GOD PACK!
              </span>
            </>
          )}
        </div>

        {/* Stardust Vaporization Toast */}
        <AnimatePresence>
          {dustToast && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mt-1 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/70 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              <span>
                Vaporized {dustToast.count} duplicate{dustToast.count > 1 ? 's' : ''} for +
                {dustToast.amount} Stardust!
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          PRESENTATION STAGE:
          A. Desktop: Ergonomic Arc / Fan Presentation
          B. Mobile: Horizontal Smooth Scrollable Snap Row
          ============================================================ */}

      {/* DESKTOP ARC/FAN (Hidden on small screens) */}
      <div className="hidden md:flex items-center justify-center relative w-full h-[470px] lg:h-[510px] my-auto px-4 overflow-visible">
        {cards.map((card, index) => {
          const isDusted = dustedCardIds.includes(card.id);
          const isNew = isCardNew(card);
          const glow = getFinishGlowBorder(card.finish);
          const rarityStyle = RARITY_BADGES[card.rarity] ?? RARITY_BADGES.C;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 40, scale: 0.88 }}
              animate={{
                opacity: 1,
                y: ARC_Y_OFFSETS[index] ?? 0,
                x: ARC_X_OFFSETS[index] ?? 0,
                rotateZ: ARC_ROTATIONS[index] ?? 0,
                scale: 1,
              }}
              whileHover={{
                y: -24,
                x: ARC_X_OFFSETS[index] ?? 0,
                rotateZ: 0,
                scale: 1.06,
                zIndex: 40,
                transition: { type: 'spring', stiffness: 350, damping: 24 },
              }}
              style={{
                zIndex: 10 + (index === 2 ? 6 : index === 1 || index === 3 ? 3 : 0),
              }}
              className={`relative mx-[-16px] lg:mx-[-10px] flex flex-col items-center rounded-2xl p-2 bg-[#0d0e15]/90 ${
                glow.containerBorder
              } ${glow.shadowGlow} transition-colors ${
                isDusted ? 'opacity-40 grayscale pointer-events-none' : ''
              }`}
            >
              {/* Card Header Pills: Slot Number, NEW badge, Rarity */}
              <div className="w-full flex items-center justify-between gap-1 mb-1.5 text-[10px] font-mono px-1">
                <span className="text-zinc-500 font-bold">#{index + 1}</span>

                {isNew && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-zinc-950 font-black text-[9px] tracking-wider uppercase shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse flex items-center gap-1 border border-yellow-200">
                    <Sparkles className="w-2.5 h-2.5 text-black shrink-0" />
                    NEW
                  </span>
                )}

                <span
                  className={`px-1.5 py-0.5 rounded font-black border text-[9px] ${rarityStyle.bgClass} ${rarityStyle.textClass} ${rarityStyle.borderClass}`}
                >
                  {card.rarity}
                </span>
              </div>

              {/* Card Renderer */}
              <div className="relative">
                <RealisticCardRenderer
                  card={card}
                  size="sm"
                  interactive={!isDusted}
                  showMarketValue={true}
                  disableTilt={false}
                />

                {/* DUSTED Overlay */}
                {isDusted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-xl z-30">
                    <span className="px-3 py-1 rounded bg-zinc-900 text-cyan-400 font-mono text-xs font-black border border-cyan-500/60 shadow-lg">
                      DUSTED (★)
                    </span>
                  </div>
                )}
              </div>

              {/* Finish Badge & One-Click Inspect 3D Button */}
              <div className="w-full flex flex-col items-center gap-1.5 mt-2">
                <span
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wider ${glow.badgeBorder}`}
                >
                  {FINISH_LABELS[card.finish] ?? card.finish}
                </span>

                <button
                  onClick={() => setSelectedCardFor3D(card)}
                  className="w-full px-2.5 py-1 rounded-lg bg-black/50 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 text-zinc-300 hover:text-amber-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  title="Inspect card in 3D with Weiss Schwarz shaders"
                >
                  <Eye className="w-3 h-3 text-amber-400" />
                  <span>Inspect 3D</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MOBILE SCROLLABLE ROW (Shown on screens < md) */}
      <div className="md:hidden flex w-full overflow-x-auto snap-x snap-mandatory gap-4 px-4 py-3 scrollbar-thin-dark items-center justify-start">
        {cards.map((card, index) => {
          const isDusted = dustedCardIds.includes(card.id);
          const isNew = isCardNew(card);
          const glow = getFinishGlowBorder(card.finish);
          const rarityStyle = RARITY_BADGES[card.rarity] ?? RARITY_BADGES.C;

          return (
            <div
              key={card.id}
              className={`snap-center shrink-0 w-[240px] flex flex-col items-center rounded-2xl p-2.5 bg-[#0d0e15]/90 ${
                glow.containerBorder
              } ${glow.shadowGlow} ${
                isDusted ? 'opacity-40 grayscale pointer-events-none' : ''
              }`}
            >
              {/* Header */}
              <div className="w-full flex items-center justify-between gap-1 mb-2 text-xs font-mono px-1">
                <span className="text-zinc-500 font-bold">#{index + 1}</span>

                {isNew && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-zinc-950 font-black text-[9px] tracking-wider uppercase shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse flex items-center gap-1 border border-yellow-200">
                    <Sparkles className="w-2.5 h-2.5 text-black shrink-0" />
                    NEW
                  </span>
                )}

                <span
                  className={`px-2 py-0.5 rounded font-black border text-[10px] ${rarityStyle.bgClass} ${rarityStyle.textClass} ${rarityStyle.borderClass}`}
                >
                  {card.rarity}
                </span>
              </div>

              {/* Card Thumbnail */}
              <div className="relative">
                <RealisticCardRenderer
                  card={card}
                  size="sm"
                  interactive={!isDusted}
                  showMarketValue={true}
                  disableTilt={false}
                />

                {isDusted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-xl z-30">
                    <span className="px-3 py-1 rounded bg-zinc-900 text-cyan-400 font-mono text-xs font-black border border-cyan-500/60 shadow-lg">
                      DUSTED
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="w-full flex flex-col items-center gap-1.5 mt-2">
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${glow.badgeBorder}`}
                >
                  {FINISH_LABELS[card.finish] ?? card.finish}
                </span>

                <button
                  onClick={() => setSelectedCardFor3D(card)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 hover:bg-amber-500/20 border border-white/10 text-zinc-300 hover:text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect 3D</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================
          BOTTOM ACTION COMMAND BAR:
          1. Quick Dust Duplicates (♻️)
          2. Open Another (🎴)
          3. Done / View Binder (📖)
          ============================================================ */}
      <div className="w-full max-w-3xl mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 px-4">
        {/* 1. Quick Dust Duplicates */}
        <button
          onClick={handleQuickDustDuplicates}
          disabled={duplicateNonRares.length === 0}
          title={
            duplicateNonRares.length > 0
              ? `Vaporize ${duplicateNonRares.length} duplicate non-rare(s) into +${potentialDustYield} Stardust`
              : 'No duplicate non-rares available to dust'
          }
          className="px-4 py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 disabled:opacity-30 disabled:pointer-events-none font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow"
        >
          <Trash2 className="w-4 h-4 text-cyan-400" />
          <span>
            Quick Dust Duplicates {potentialDustYield > 0 && `(+${potentialDustYield} ★)`}
          </span>
        </button>

        {/* 2. Open Another Button */}
        <button
          onClick={onOpenAnother}
          disabled={!canOpenAnother}
          title={
            isCooldownActive
              ? `On Cooldown (${cooldownRemaining}s remaining)`
              : !canOpenAnother
              ? `Insufficient Funds (${packCost.toLocaleString()} ¥ required)`
              : undefined
          }
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 py-2.5 font-black text-black transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(245,158,11,0.35)] text-xs uppercase tracking-wider"
        >
          <RefreshCw className="w-4 h-4" />
          <span>
            Open Another ({packCost === 0 ? 'FREE' : `${packCost.toLocaleString()} ¥`})
          </span>
        </button>

        {/* 3. Done / View Binder */}
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95"
        >
          <BookOpen className="w-4 h-4" />
          <span>Done / View Binder</span>
        </button>
      </div>

      {/* ============================================================
          ONE-CLICK 3D CARD SHADER INSPECTION MODAL
          ============================================================ */}
      <AnimatePresence>
        {selectedCardFor3D && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative max-w-2xl w-full flex flex-col md:flex-row items-center justify-center gap-6 p-6 rounded-3xl bg-[#0c0d14] border border-amber-500/30 shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCardFor3D(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900/80 hover:bg-white/20 text-zinc-400 hover:text-white border border-white/10 transition z-10"
                title="Close 3D Inspection"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 3D Interactive Card Stage */}
              <div className="shrink-0 flex flex-col items-center">
                <RealisticCardRenderer
                  card={selectedCardFor3D}
                  size="lg"
                  interactive={true}
                  enableGyro={true}
                  showMarketValue={true}
                />
                <span className="mt-2 text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                  <Rotate3d className="w-3 h-3 text-amber-400" />
                  Move pointer or tilt device to inspect foil
                </span>
              </div>

              {/* Dossier & Shader Details */}
              <div className="flex-1 flex flex-col justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                    <span className="font-bold">
                      {CARD_MAP[selectedCardFor3D.cardDefId]?.cardNumber ?? 'TQQ'}
                    </span>
                    <span>•</span>
                    <span className="uppercase">{selectedCardFor3D.rarity}</span>
                  </div>

                  <h3 className="text-lg font-black text-white mt-1">
                    {CARD_MAP[selectedCardFor3D.cardDefId]?.name ?? 'Quintuplet Card'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-serif italic mt-0.5">
                    {CARD_MAP[selectedCardFor3D.cardDefId]?.title ?? 'Collectible Card'}
                  </p>
                </div>

                {/* Character Lore Quote */}
                {CARD_MAP[selectedCardFor3D.cardDefId]?.loreQuote && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-300 font-serif italic">
                    &ldquo;{CARD_MAP[selectedCardFor3D.cardDefId]?.loreQuote}&rdquo;
                  </div>
                )}

                {/* Shader Details Breakdown */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 text-xs font-mono flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Surface Finish:</span>
                    <span className="font-bold text-amber-300 capitalize">
                      {FINISH_LABELS[selectedCardFor3D.finish] ?? selectedCardFor3D.finish}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Market Value:</span>
                    <span className="font-bold text-emerald-400">
                      {calculateCardMarketValue(selectedCardFor3D).toLocaleString()} ¥
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Active Shaders:</span>
                    <span className="text-[10px] text-zinc-300">
                      {selectedCardFor3D.finish === 'signed'
                        ? 'Gold VA Signature • Relief • Rainbow'
                        : selectedCardFor3D.finish === 'gold_etched'
                        ? 'Gold Emboss • Relief • Rainbow'
                        : selectedCardFor3D.finish === 'rainbow'
                        ? 'Rainbow Conic • Relief'
                        : selectedCardFor3D.finish === 'sparkle' ||
                          selectedCardFor3D.finish === 'holo'
                        ? 'Metallic Specular Sheen'
                        : '350gsm Matte Substrate'}
                    </span>
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => setSelectedCardFor3D(null)}
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold transition"
                >
                  Return to Summary
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PackSummaryGrid;
