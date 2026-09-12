'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { resolveActiveSupportBuff, SUPPORT_BUFF_CONFIGS } from '../../config/supportBuffs';
import { CARD_MAP } from '../../config/cardsData';
import { calculateCardMarketValue } from '../../config/economy';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer, RARITY_BADGES } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  X,
  Sparkles,
  ShieldAlert,
  BookOpen,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';

interface SupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportDrawer: React.FC<SupportDrawerProps> = ({ isOpen, onClose }) => {
  const inventory = useGameStore((state) => state.inventory);
  const supportSlot = useGameStore((state) => state.supportSlot);
  const slotSupportCard = useGameStore((state) => state.slotSupportCard);

  const [characterFilter, setCharacterFilter] = useState<string>('all');
  const [slabFilter, setSlabFilter] = useState<'all' | 'slabs' | 'raw'>('all');

  // Resolved buff for current support slot
  const currentSlottedBuff = useMemo(() => {
    return resolveActiveSupportBuff(supportSlot);
  }, [supportSlot]);

  // Filter inventory strictly to Support character cards
  const candidateSupportCards = useMemo(() => {
    const supportCharIds = new Set(['fuutarou', 'raiha', 'maruo', 'isanari', 'takeda']);

    let cards = inventory.filter((card) => {
      const def = CARD_MAP[card.cardDefId];
      const isRoleSupport = def?.characterRole === 'support';
      const isCharSupport = supportCharIds.has(card.characterId);
      const isBuffConfigured = !!SUPPORT_BUFF_CONFIGS[card.cardDefId];
      return isRoleSupport || isCharSupport || isBuffConfigured;
    });

    // Character filter
    if (characterFilter !== 'all') {
      cards = cards.filter((c) => c.characterId === characterFilter);
    }

    // Slab filter
    if (slabFilter === 'slabs') {
      cards = cards.filter((c) => !!c.grade);
    } else if (slabFilter === 'raw') {
      cards = cards.filter((c) => !c.grade);
    }

    // Sort: slotted first, then Grade >= 9 first, then market value descending
    cards.sort((a, b) => {
      const aSlotted = supportSlot?.id === a.id ? 1 : 0;
      const bSlotted = supportSlot?.id === b.id ? 1 : 0;
      if (aSlotted !== bSlotted) return bSlotted - aSlotted;

      const aGrade9 = (a.grade?.numericGrade ?? 0) >= 9 ? 1 : 0;
      const bGrade9 = (b.grade?.numericGrade ?? 0) >= 9 ? 1 : 0;
      if (aGrade9 !== bGrade9) return bGrade9 - aGrade9;

      return calculateCardMarketValue(b) - calculateCardMarketValue(a);
    });

    return cards;
  }, [inventory, characterFilter, slabFilter, supportSlot]);

  const handleSocketCard = (card: CardInstance) => {
    try {
      slotSupportCard(card.id);
      soundEngine.playFoilRustle();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUnmount = () => {
    try {
      slotSupportCard(null);
      soundEngine.playFoilRustle();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Drawer Container */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-50 w-full max-w-xl h-full bg-[#0d0d13] border-l border-amber-500/20 shadow-2xl flex flex-col overflow-hidden text-zinc-100"
          >
            {/* Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-white/10 bg-black/40 space-y-3">
              <div>
                {/* Title and Close Button */}
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                    <span>Support Altar Dais</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Close Drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Micro-Description */}
                <p className="text-xs text-zinc-400 font-normal mt-0.5">
                  Assign a mentor to activate account-wide and showcase buffs.
                </p>
              </div>

              {/* Condensed Active Mentor Banner */}
              {supportSlot && (
                <div className="p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                  <div className="text-xs text-amber-300 font-semibold flex items-center gap-2 min-w-0 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      Mounted: {supportSlot.name}
                      {supportSlot.grade ? ` (Gr. ${supportSlot.grade.numericGrade})` : ''} •{' '}
                      {currentSlottedBuff?.badgeLabel || 'Buff Active'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnmount}
                    className="shrink-0 text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2.5 py-1 rounded-lg border border-red-500/30 transition-colors cursor-pointer font-medium"
                  >
                    Unmount
                  </button>
                </div>
              )}
            </div>

            {/* Filter Navigation Bar */}
            <div className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 border-b border-white/5 bg-[#101018] flex items-center justify-between gap-2 flex-wrap">
              {/* Mentor Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'fuutarou', label: 'Fuutarou' },
                  { id: 'raiha', label: 'Raiha' },
                  { id: 'maruo', label: 'Maruo' },
                  { id: 'takeda', label: 'Takeda' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCharacterFilter(tab.id)}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                      characterFilter === tab.id
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Format Toggles */}
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 shrink-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'slabs', label: 'Slabs' },
                  { id: 'raw', label: 'Raw' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSlabFilter(tab.id as 'all' | 'slabs' | 'raw')}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      slabFilter === tab.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Support Cards List */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-210px)] p-4 pr-2 space-y-3.5">
              {candidateSupportCards.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-white/10">
                  <ShieldAlert className="w-10 h-10 text-zinc-600 mb-3" />
                  <h3 className="text-sm font-mono font-bold text-zinc-300">
                    No Support Cards Available
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs font-mono">
                    {characterFilter !== 'all' || slabFilter !== 'all'
                      ? 'No support cards match your active filter criteria.'
                      : 'You do not own any Support cards yet. Pull Fuutarou, Raiha, Maruo, or Takeda from booster packs!'}
                  </p>
                </div>
              ) : (
                candidateSupportCards.map((card) => {
                  const isCurrentlySlotted = supportSlot?.id === card.id;
                  const buff = resolveActiveSupportBuff(card);
                  const isGradeScaled = Boolean(card.grade && card.grade.numericGrade >= 9);
                  const rarityStyle = RARITY_BADGES[card.rarity] ?? RARITY_BADGES.C;

                  return (
                    <div
                      key={card.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4 ${
                        isCurrentlySlotted
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-zinc-900/60 border-white/5 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                        {/* Left: Enlarged 3D Card Preview */}
                        <div className="w-24 sm:w-28 relative flex-shrink-0 aspect-[63/88] rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/40">
                          {card.grade ? (
                            <GradingSlab card={card} className="w-full h-full" thumbnail={true} />
                          ) : (
                            <CardRenderer card={card} className="w-full h-full" thumbnail={true} />
                          )}
                        </div>

                        {/* Middle: Information & Buffs */}
                        <div className="flex-1 min-w-0">
                          {/* Line 1: Character Name */}
                          <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            <span className="truncate">{card.name || 'Support Mentor'}</span>
                            {card.title && (
                              <span className="text-xs text-zinc-400 font-normal hidden sm:inline truncate">
                                • {card.title}
                              </span>
                            )}
                          </div>

                          {/* Line 2: Rarity Badge & Grade Tag */}
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-black border uppercase tracking-wider ${rarityStyle.bgClass} ${rarityStyle.textClass} ${rarityStyle.borderClass}`}
                            >
                              {card.rarity}
                            </span>

                            {card.grade && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                                  card.grade.isBlackLabel || card.grade.numericGrade === 10
                                    ? 'bg-amber-950 text-amber-300 border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                    : card.grade.numericGrade === 9
                                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_6px_rgba(6,182,212,0.3)]'
                                    : card.grade.numericGrade >= 7
                                    ? 'bg-slate-800 text-cyan-300 border-slate-600'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}
                              >
                                Grade {card.grade.numericGrade}.0
                              </span>
                            )}

                            {card.finish && card.finish !== 'raw' && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 capitalize">
                                {card.finish}
                              </span>
                            )}
                          </div>

                          {/* Line 3: Active Buff Callout Box */}
                          {buff && (
                            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <span className="truncate">
                                  ⚡{' '}
                                  {buff.badgeLabel.startsWith('ACTIVE BUFF:')
                                    ? buff.badgeLabel
                                    : `ACTIVE BUFF: ${buff.badgeLabel}`}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed mt-0.5">
                                {buff.description}
                              </p>
                              {isGradeScaled && (
                                <div className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1 mt-1 pt-1 border-t border-amber-500/10">
                                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>
                                    Grade {card.grade?.numericGrade} Slab: All buffs amplified by +20%!
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Line 4: Market Valuation */}
                          <div className="text-xs text-zinc-400 font-mono mt-1">
                            Valuation:{' '}
                            <span className="text-zinc-200 font-semibold">
                              ¥{calculateCardMarketValue(card).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="shrink-0 flex justify-end sm:self-center">
                        {isCurrentlySlotted ? (
                          <button
                            type="button"
                            onClick={handleUnmount}
                            className="bg-zinc-800 text-zinc-400 text-xs px-3.5 py-2 rounded-xl border border-white/10 hover:border-red-500/30 hover:text-red-300 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Active (Unmount)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSocketCard(card)}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all active:scale-95 shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            <span>Socket Tutor</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="shrink-0 p-3 bg-black/60 border-t border-white/10 text-center text-[11px] font-mono text-zinc-500">
              Grade 9 & 10 Certified Slabs amplify all Tutor buff percentages by an additional +20%.
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
