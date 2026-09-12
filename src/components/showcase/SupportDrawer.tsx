'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { resolveActiveSupportBuff, SUPPORT_BUFF_CONFIGS } from '../../config/supportBuffs';
import { CARD_MAP } from '../../config/cardsData';
import { calculateCardMarketValue } from '../../config/economy';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  X,
  Search,
  Sparkles,
  ShieldAlert,
  Zap,
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

  const [searchQuery, setSearchQuery] = useState<string>('');
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

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter((c) => {
        const buff = resolveActiveSupportBuff(c);
        return (
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.cardNumber && c.cardNumber.toLowerCase().includes(q)) ||
          c.characterId.toLowerCase().includes(q) ||
          c.rarity.toLowerCase().includes(q) ||
          (buff?.description && buff.description.toLowerCase().includes(q))
        );
      });
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
  }, [inventory, characterFilter, slabFilter, searchQuery, supportSlot]);

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
            <div className="shrink-0 p-5 border-b border-white/10 bg-black/40 relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-zinc-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-wide uppercase font-mono text-white flex items-center gap-2">
                      <span>Support Altar Dais</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        TUTOR
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Assign a mentor to project active economy and yield buffs
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Currently Slotted Card Banner */}
              {supportSlot && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-amber-300 truncate">
                        Mounted: {supportSlot.name}
                        {supportSlot.grade && (
                          <span className="ml-1.5 text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                            Gr. {supportSlot.grade.numericGrade}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">
                        {currentSlottedBuff?.badgeLabel || 'Buff Active'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleUnmount}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    Unmount
                  </button>
                </div>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="shrink-0 p-4 border-b border-white/5 bg-[#101018] space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tutor name, title, buff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Character Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Mentors' },
                  { id: 'fuutarou', label: 'Fuutarou' },
                  { id: 'raiha', label: 'Raiha' },
                  { id: 'maruo', label: 'Maruo' },
                  { id: 'takeda', label: 'Takeda' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCharacterFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      characterFilter === tab.id
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Slabs vs Raw Filters */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Type:</span>
                {(['all', 'slabs', 'raw'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSlabFilter(type)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      slabFilter === type
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {type === 'all' ? 'All Formats' : type === 'slabs' ? 'BGS Slabs (Grade 9+ Scaling)' : 'Raw Cards'}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Support Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {candidateSupportCards.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-white/10">
                  <ShieldAlert className="w-10 h-10 text-zinc-600 mb-3" />
                  <h3 className="text-sm font-mono font-bold text-zinc-300">
                    No Support Cards Available
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    {searchQuery || characterFilter !== 'all' || slabFilter !== 'all'
                      ? 'No support cards match your active filter criteria.'
                      : 'You do not own any Support cards yet. Pull Fuutarou, Raiha, Maruo, or Takeda from booster packs!'}
                  </p>
                </div>
              ) : (
                candidateSupportCards.map((card) => {
                  const isCurrentlySlotted = supportSlot?.id === card.id;
                  const buff = resolveActiveSupportBuff(card);
                  const isGradeScaled = Boolean(card.grade && card.grade.numericGrade >= 9);

                  return (
                    <div
                      key={card.id}
                      className={`relative rounded-2xl border transition-all duration-300 p-3.5 flex gap-4 overflow-hidden ${
                        isCurrentlySlotted
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-white/5 border-white/10 hover:border-amber-500/30 hover:bg-white/[0.07]'
                      }`}
                    >
                      {/* Left: Card Thumbnail Preview */}
                      <div className="relative w-14 sm:w-16 aspect-[63/88] flex-shrink-0 rounded-lg overflow-hidden bg-black/40">
                        {card.grade ? (
                          <GradingSlab card={card} className="w-full h-full" thumbnail={true} />
                        ) : (
                          <CardRenderer card={card} className="w-full h-full" thumbnail={true} />
                        )}
                      </div>

                      {/* Right: Info & Buff Effects */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* Card Name & Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">
                              {card.name || 'Support Card'}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-bold uppercase">
                              {card.rarity}
                            </span>
                            {card.grade && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                                  card.grade.isBlackLabel || card.grade.numericGrade === 10
                                    ? 'bg-amber-950 text-amber-300 border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                    : card.grade.numericGrade === 9
                                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_6px_rgba(6,182,212,0.3)]'
                                    : card.grade.numericGrade >= 7
                                    ? 'bg-slate-800 text-slate-200 border-slate-600'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}
                              >
                                Gr. {card.grade.numericGrade} ({card.grade.tier})
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-mono text-zinc-400 mt-0.5 truncate">
                            {card.title || card.cardNumber}
                          </div>

                          {/* Dynamic Active Buff Preview */}
                          {buff && (
                            <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                              <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="truncate">{buff.badgeLabel}</span>
                              </div>
                              <p className="text-xs text-amber-300/90 leading-snug">
                                {buff.description}
                              </p>
                              {isGradeScaled && (
                                <div className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1 pt-0.5">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>Grade {card.grade?.numericGrade} Slab: All buffs amplified by +20%!</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 gap-2">
                          <span className="text-xs text-zinc-400 font-mono">
                            Valuation: <span className="text-white font-semibold">¥{calculateCardMarketValue(card).toLocaleString()}</span>
                          </span>

                          {isCurrentlySlotted ? (
                            <button
                              type="button"
                              onClick={handleUnmount}
                              className="shrink-0 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>Active (Unmount)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSocketCard(card)}
                              className="shrink-0 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-black transition-all shadow-md hover:shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Socket Tutor</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
