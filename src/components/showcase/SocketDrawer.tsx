'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { calculateCardMarketValue } from '../../config/economy';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import { X, Search, Sparkles, Layers } from 'lucide-react';

export interface SocketDrawerProps {
  selectedPedestalIndex: number | null;
  onClose: () => void;
}

export const SocketDrawer: React.FC<SocketDrawerProps> = ({
  selectedPedestalIndex,
  onClose,
}) => {
  const inventory = useGameStore((state) => state.inventory);
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const slotShowcaseCard = useGameStore((state) => state.slotShowcaseCard);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'slabs' | 'raw' | 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki' | 'support'
  >('all');

  // Set of card instance IDs already mounted across showcase slots and index lookup
  const slotOccupantMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const slot of showcaseSlots) {
      if (slot.cardInstanceId) {
        map.set(slot.cardInstanceId, slot.slotIndex);
      }
    }
    return map;
  }, [showcaseSlots]);

  // Current slot's occupant card ID
  const currentSlotCardId =
    selectedPedestalIndex !== null
      ? showcaseSlots[selectedPedestalIndex]?.cardInstanceId ?? null
      : null;

  // Filter & sort candidate cards
  const candidateCards = useMemo(() => {
    let result = [...inventory];

    // Filter by type or character
    if (filterTab === 'slabs') {
      result = result.filter((c) => !!c.grade);
    } else if (filterTab === 'raw') {
      result = result.filter((c) => !c.grade);
    } else if (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(filterTab)) {
      result = result.filter((c) => c.characterId === filterTab);
    } else if (filterTab === 'support') {
      result = result.filter(
        (c) => !['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(c.characterId)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.cardNumber && c.cardNumber.toLowerCase().includes(q)) ||
          c.characterId.toLowerCase().includes(q) ||
          c.rarity.toLowerCase().includes(q)
      );
    }

    // Priority sort: current slot occupant first, then available cards by market value, then socketed elsewhere
    result.sort((a, b) => {
      const aIsCurrent = a.id === currentSlotCardId ? 1 : 0;
      const bIsCurrent = b.id === currentSlotCardId ? 1 : 0;
      if (aIsCurrent !== bIsCurrent) return bIsCurrent - aIsCurrent;

      const aIsSocketed = slotOccupantMap.has(a.id) ? 1 : 0;
      const bIsSocketed = slotOccupantMap.has(b.id) ? 1 : 0;
      if (aIsSocketed !== bIsSocketed) return aIsSocketed - bIsSocketed;

      return calculateCardMarketValue(b) - calculateCardMarketValue(a);
    });

    return result;
  }, [inventory, filterTab, searchQuery, currentSlotCardId, slotOccupantMap]);

  // Handle Mount Card
  const handleMountCard = (card: CardInstance) => {
    if (selectedPedestalIndex === null) return;
    try {
      slotShowcaseCard(selectedPedestalIndex, card.id);
      soundEngine.playFoilRustle();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const isOpen = selectedPedestalIndex !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="w-full max-w-2xl h-full bg-[#0e0e14] border-l border-white/10 shadow-2xl flex flex-col z-50 select-none overflow-hidden text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/70 shrink-0">
              <div>
                <h3 className="text-base font-black font-mono tracking-wider text-white uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Socket Pedestal 0{selectedPedestalIndex + 1}</span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Mount any raw card or graded acrylic slab to generate passive idle yield.
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                aria-label="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Filter & Search Bar */}
            <div className="p-4 border-b border-white/5 bg-zinc-950/40 flex flex-col gap-3 shrink-0">
              {/* Search Input */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search collection by name, rarity, or sister..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(
                  [
                    'all',
                    'slabs',
                    'raw',
                    'ichika',
                    'nino',
                    'miku',
                    'yotsuba',
                    'itsuki',
                    'support',
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition capitalize whitespace-nowrap cursor-pointer ${
                      filterTab === tab
                        ? 'bg-amber-500 text-zinc-950 shadow'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Card Grid */}
            <div className="flex-1 overflow-y-auto max-h-[70vh] p-4 min-h-0">
              {candidateCards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Layers className="w-12 h-12 text-zinc-600 mb-3" />
                  <h4 className="text-sm font-black text-white font-mono uppercase">
                    No Available Cards Found
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs font-mono">
                    {searchQuery || filterTab !== 'all'
                      ? 'Try changing your filter tabs or search query.'
                      : 'Crack open booster packs to collect more cards for your showcase.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-12">
                  {candidateCards.map((card) => {
                    const marketValue = calculateCardMarketValue(card);
                    const isCurrentSlot = card.id === currentSlotCardId;
                    const socketedSlot = slotOccupantMap.get(card.id);
                    const isSocketedElsewhere =
                      socketedSlot !== undefined && socketedSlot !== selectedPedestalIndex;

                    return (
                      <div
                        key={card.id}
                        className={`group relative flex flex-col rounded-2xl p-2.5 transition-all duration-200 border ${
                          isCurrentSlot
                            ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : isSocketedElsewhere
                            ? 'bg-zinc-900/40 border-white/5 opacity-75'
                            : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/10 hover:border-amber-400/50 hover:scale-[1.02]'
                        }`}
                      >
                        {/* 1. Full-Art Showcase Slab */}
                        <div className="w-full aspect-[63/88] flex-shrink-0 relative rounded-xl p-1.5 bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden mb-2">
                          {card.grade ? (
                            <GradingSlab
                              card={card}
                              interactive={false}
                              size="full"
                              className="w-full h-full pointer-events-none select-none !p-0 !m-0"
                              showMarketValue={false}
                              showcaseMode={true}
                            />
                          ) : (
                            <CardRenderer
                              card={card}
                              interactive={false}
                              disableTilt={true}
                              size="full"
                              className="w-full h-full pointer-events-none select-none !p-0 !m-0 rounded-lg overflow-hidden"
                              showMarketValue={false}
                              hideInternalFooter={true}
                              showcaseMode={true}
                            />
                          )}

                          {/* Current Slot Occupant Badge */}
                          {isCurrentSlot && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] font-mono z-30 shadow">
                              CURRENT
                            </div>
                          )}

                          {/* Socketed Elsewhere Badge */}
                          {!isCurrentSlot && isSocketedElsewhere && (
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-zinc-800/90 text-zinc-300 font-bold text-[9px] font-mono z-30 border border-zinc-700 shadow">
                              PEDESTAL 0{socketedSlot + 1}
                            </div>
                          )}
                        </div>

                        {/* 2. Card Meta Info */}
                        <div className="flex flex-col gap-1 font-mono text-xs mb-2">
                          {/* Row 1: Character Name */}
                          <span className="font-semibold text-white truncate text-xs">
                            {card.name || 'Card'}
                          </span>

                          {/* Row 2: Value in ¥ and Grade Tag */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-amber-400 font-bold">
                              ¥ {marketValue.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-zinc-400 px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                              {card.grade
                                ? `Grade ${card.grade.numericGrade}.0`
                                : card.rarity}
                            </span>
                          </div>
                        </div>

                        {/* 3. Action Button */}
                        <div className="mt-auto">
                          {isCurrentSlot ? (
                            <button
                              disabled
                              className="w-full py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                            >
                              CURRENT
                            </button>
                          ) : isSocketedElsewhere ? (
                            <button
                              disabled
                              className="w-full py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                            >
                              SOCKETED
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMountCard(card);
                              }}
                              className="w-full py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black shadow-sm transition-colors active:scale-95 cursor-pointer"
                            >
                              MOUNT TO VITRINE
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SocketDrawer;
