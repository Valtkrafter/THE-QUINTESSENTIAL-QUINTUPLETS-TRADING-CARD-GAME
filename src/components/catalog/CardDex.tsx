'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardDefinition, CardDexEntry, CardInstance, CharacterId, Finish, Rarity } from '../../types/card';
import { CARDS_CATALOG, CARD_MAP } from '../../config/cardsData';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import { GradingSlab } from '../card/GradingSlab';
import { soundEngine } from '../../utils/audioEngine';
import { DexMicroProgress } from './DexMicroProgress';
import { DexFilterTabs, DexFilterTab } from './DexFilterTabs';
import { DexSearchBar } from './DexSearchBar';
import {
  Lock,
  Sparkles,
  Award,
  Search,
  X,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Crown,
  ChevronRight,
  Shield,
  HelpCircle,
  PackageOpen,
} from 'lucide-react';

export { DexMicroProgress } from './DexMicroProgress';
export { DexFilterTabs } from './DexFilterTabs';
export { DexSearchBar } from './DexSearchBar';
export type { DexFilterTab } from './DexFilterTabs';

export const CardDex: React.FC = () => {
  const inventory = useGameStore((state) => state.inventory);
  const cardDex = useGameStore((state) => state.cardDex);

  const [activeTab, setActiveTab] = useState<DexFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [slabsOnly, setSlabsOnly] = useState<boolean>(false);
  const [selectedCardDef, setSelectedCardDef] = useState<CardDefinition | null>(null);

  // Count current copies of each card definition currently in inventory
  const inventoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const card of inventory) {
      map[card.cardDefId] = (map[card.cardDefId] || 0) + 1;
    }
    return map;
  }, [inventory]);

  // Total collection metrics (42 cards total: 35 Nakano Sisters + 7 Support Mentors)
  const totalCardsCount = CARDS_CATALOG.length;
  const discoveredCount = useMemo(() => {
    if (!cardDex) return 0;
    return Object.values(cardDex).filter((entry) => entry.discovered).length;
  }, [cardDex]);

  const completionPercentage = totalCardsCount > 0 ? Math.round((discoveredCount / totalCardsCount) * 100) : 0;
  const isComplete100 = discoveredCount >= totalCardsCount && totalCardsCount > 0;

  // Filtered card list
  const filteredCatalog = useMemo(() => {
    let list = [...CARDS_CATALOG];

    // Filter by Tab
    if (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(activeTab)) {
      list = list.filter((c) => c.characterId === activeTab);
    } else if (activeTab === 'support') {
      list = list.filter((c) => !['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(c.characterId));
    }

    // Filter by Slabs Only
    if (slabsOnly) {
      list = list.filter((c) => Boolean(cardDex?.[c.id]?.bestGrade));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.cardNumber.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.characterId.toLowerCase().includes(q) ||
          c.rarity.toLowerCase().includes(q) ||
          (c.loreQuote && c.loreQuote.toLowerCase().includes(q))
      );
    }

    // Strictly sort by Card Number (TQQ-001 to TQQ-042)
    list.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

    return list;
  }, [activeTab, searchQuery, slabsOnly, cardDex]);

  // Tab counts for badge display
  const tabCounts = useMemo(() => {
    const counts: Record<string, { total: number; discovered: number }> = {
      all: { total: totalCardsCount, discovered: discoveredCount },
      ichika: { total: 0, discovered: 0 },
      nino: { total: 0, discovered: 0 },
      miku: { total: 0, discovered: 0 },
      yotsuba: { total: 0, discovered: 0 },
      itsuki: { total: 0, discovered: 0 },
      support: { total: 0, discovered: 0 },
    };

    for (const card of CARDS_CATALOG) {
      const isSister = ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(card.characterId);
      const tabKey = isSister ? card.characterId : 'support';
      const isDiscovered = Boolean(cardDex?.[card.id]?.discovered);

      counts[tabKey].total += 1;
      if (isDiscovered) {
        counts[tabKey].discovered += 1;
      }
    }

    return counts;
  }, [cardDex, totalCardsCount, discoveredCount]);

  // Synthesize CardInstance for inspection preview if discovered
  const activeInspectedCardInstance: CardInstance | null = useMemo(() => {
    if (!selectedCardDef) return null;
    const dexEntry = cardDex?.[selectedCardDef.id];
    if (!dexEntry || !dexEntry.discovered) return null;

    return {
      id: `dex_preview_${selectedCardDef.id}`,
      cardDefId: selectedCardDef.id,
      characterId: selectedCardDef.characterId,
      rarity: selectedCardDef.rarity,
      finish: dexEntry.highestFinish ?? 'raw',
      obtainedAt: dexEntry.discoveredAt ?? Date.now(),
      grade: dexEntry.bestGrade,
      imageUrl: selectedCardDef.imageUrl,
      name: selectedCardDef.name,
      title: selectedCardDef.title,
      cardNumber: selectedCardDef.cardNumber,
      forceFit: selectedCardDef.forceFit,
    };
  }, [selectedCardDef, cardDex]);

  return (
    <div
      className={`relative w-full h-full bg-[#08080c] text-zinc-100 flex flex-col select-none overflow-hidden font-sans ${
        isComplete100 ? 'ring-2 ring-amber-400/50' : ''
      }`}
    >
      {/* 100% Golden Holographic Aura Shimmer */}
      {isComplete100 && (
        <div className="absolute inset-0 pointer-events-none z-10 opacity-30 bg-gradient-to-r from-yellow-500/10 via-pink-500/10 via-cyan-500/10 to-yellow-500/10 animate-shimmer" />
      )}

      {/* ============================================================
          UNIFIED VIEWPORT & SCROLL CONTAINER WITH STICKY HIGH-DENSITY TOOLBAR
          Reclaims ~75px of vertical space, elevating the card grid.
          ============================================================ */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-2 pb-20">
        {/* UNIFIED CARD-DEX TOOLBAR */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 bg-black/60 border border-white/10 rounded-2xl backdrop-blur-md mb-4 sticky top-0 z-20 shadow-xl shadow-black/40">
          {/* Left Flank: Micro Progress Ring + Sister Filter Tabs */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-thin-dark py-1.5 min-w-0">
            <DexMicroProgress collected={discoveredCount} total={totalCardsCount} />
            <DexFilterTabs activeTab={activeTab} counts={tabCounts} onSelect={setActiveTab} />
          </div>

          {/* Right Flank (White Box Area): Quick Search Bar + Rarity / Slab Filter & Live Count */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
            <DexSearchBar value={searchQuery} onChange={setSearchQuery} />

            {/* Slabs Only / Show All Toggle Button */}
            <button
              onClick={() => {
                setSlabsOnly((prev) => !prev);
                soundEngine.playFoilRustle();
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                slabsOnly
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
              }`}
              title={slabsOnly ? 'Showing Slabs Only (Click to show all)' : 'Filter: Show Slabs Only'}
            >
              <Shield className={`w-3.5 h-3.5 ${slabsOnly ? 'text-black' : 'text-zinc-400'}`} />
              <span className="hidden sm:inline">{slabsOnly ? 'Slabs Only' : 'All Cards'}</span>
              <span className="sm:hidden">{slabsOnly ? 'Slabs' : 'All'}</span>
            </button>

            {/* Total Count Badge in Glowing Monospace Font */}
            <div
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)] flex items-center gap-1.5 shrink-0"
              title={`Master Card-Dex: ${discoveredCount} / ${totalCardsCount} Artworks Collected (${completionPercentage}%)`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{discoveredCount}/{totalCardsCount}</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            42-CARD MASTER GRID (TQQ-001 TO TQQ-042)
            Elevated with immediate vertical clearance showing 2+ rows.
            ============================================================ */}
        {filteredCatalog.length === 0 ? (
          <div className="w-full max-w-md mx-auto py-16 flex flex-col items-center justify-center text-center font-mono">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
              <HelpCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Matching Cards Found</h3>
            <p className="text-xs text-zinc-400 mb-5 max-w-xs">
              No artworks match your active search query or filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
                setSlabsOnly(false);
                soundEngine.playFoilRustle();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition active:scale-95 shadow-md"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 max-w-7xl mx-auto">
            {filteredCatalog.map((cardDef) => {
              const dexEntry = cardDex?.[cardDef.id];
              const isDiscovered = Boolean(dexEntry?.discovered);
              const ownedInInventory = inventoryCountMap[cardDef.id] || 0;
              const theme = CHARACTER_THEMES[cardDef.characterId] ?? CHARACTER_THEMES.miku;

              // Construct preview instance if discovered
              const previewCard: CardInstance = {
                id: `dex_grid_${cardDef.id}`,
                cardDefId: cardDef.id,
                characterId: cardDef.characterId,
                rarity: cardDef.rarity,
                finish: dexEntry?.highestFinish ?? 'raw',
                obtainedAt: dexEntry?.discoveredAt ?? Date.now(),
                grade: dexEntry?.bestGrade,
                imageUrl: cardDef.imageUrl,
                name: cardDef.name,
                title: cardDef.title,
                cardNumber: cardDef.cardNumber,
                forceFit: cardDef.forceFit,
              };

              return (
                <div
                  key={cardDef.id}
                  onClick={() => {
                    setSelectedCardDef(cardDef);
                    soundEngine.playFoilRustle();
                  }}
                  className={`group relative flex flex-col items-center justify-between p-3 rounded-2xl border transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer select-none ${
                    isDiscovered
                      ? 'bg-zinc-900/70 border-white/10 hover:border-amber-400/60'
                      : 'bg-[#0c0c10] border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Inner Card Frame Aspect Ratio: UNIFIED aspect-[63/88] for all cards */}
                  <div className="relative w-full aspect-[63/88] rounded-xl overflow-hidden flex items-center justify-center">
                    {isDiscovered ? (
                      /* Discovered: Full-Color Card with Highest Finish or Slab */
                      <div className="w-full h-full relative flex items-center justify-center">
                        {previewCard.grade ? (
                          <GradingSlab
                            card={previewCard}
                            interactive={false}
                            size="full"
                            className="w-full h-full pointer-events-none !p-0 !m-0"
                            showMarketValue={false}
                            showcaseMode={true}
                          />
                        ) : (
                          <CardRenderer
                            card={previewCard}
                            interactive={false}
                            size="full"
                            className="w-full h-full pointer-events-none !p-0 !m-0"
                            showMarketValue={false}
                            hideInternalFooter={true}
                          />
                        )}

                        {/* Discovered Hover Glow Rim */}
                        <div className="absolute inset-0 rounded-xl border-2 border-amber-400/0 group-hover:border-amber-400/80 pointer-events-none transition duration-300 z-40" />
                      </div>
                    ) : (
                      /* Undiscovered: Matte Pitch-Black Silhouette with Smoky Particle Shimmer */
                      <div className="w-full h-full bg-[#0c0c10] flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Dark silhouette of artwork */}
                        {cardDef.imageUrl && (
                          <img
                            src={cardDef.imageUrl}
                            alt="Silhouette"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-0 contrast-200 opacity-20 pointer-events-none"
                          />
                        )}

                        {/* Smoky Particle Shimmer Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-40 animate-pulse pointer-events-none" />

                        {/* Padlock Icon & Mystery Code */}
                        <div className="relative z-10 flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-zinc-900/90 border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 shadow-md">
                            <Lock className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-black">
                            {cardDef.cardNumber}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Owned Count Badge (Top-Left to avoid colliding with top-right grade badge) */}
                    {isDiscovered && ownedInInventory > 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-zinc-950/85 border border-white/20 text-amber-300 font-mono text-[10px] font-bold z-30 shadow">
                        x{ownedInInventory}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Metadata Bar */}
                  <div className="mt-2.5 w-full flex items-center justify-between px-1 text-xs font-mono">
                    {/* Left: Serial Number & Character */}
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white truncate max-w-[90px]">
                        {isDiscovered ? cardDef.cardNumber : '???'}
                      </span>
                      <span className="text-[9px] text-zinc-400 truncate max-w-[90px]">
                        {isDiscovered ? cardDef.name.split(' ')[0] : 'Locked'}
                      </span>
                    </div>

                    {/* Right: Badges (Best Finish & Grade) */}
                    <div className="flex items-center gap-1">
                      {isDiscovered ? (
                        <>
                          {dexEntry?.bestGrade && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black">
                              {dexEntry.bestGrade.isBlackLabel ? 'QUAD 10' : `G${dexEntry.bestGrade.numericGrade}`}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10 text-[9px] font-bold">
                            {cardDef.rarity}
                          </span>
                        </>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-600 border border-zinc-800 text-[9px]">
                          LOCKED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================
          CARD-DEX INSPECTION MODAL
          ============================================================ */}
      <AnimatePresence>
        {selectedCardDef && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none"
            onClick={() => setSelectedCardDef(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0e0e14] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row gap-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCardDef(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Column: Interactive 3D Card Display */}
              <div className="w-full md:w-56 shrink-0 flex flex-col items-center">
                <div className={`w-full ${activeInspectedCardInstance?.grade ? 'aspect-[82/130]' : 'aspect-[63/88]'} rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center`}>
                  {activeInspectedCardInstance ? (
                    activeInspectedCardInstance.grade ? (
                      <GradingSlab
                        card={activeInspectedCardInstance}
                        size="full"
                        className="w-full h-full !p-0 !m-0"
                        showMarketValue={false}
                      />
                    ) : (
                      <CardRenderer
                        card={activeInspectedCardInstance}
                        size="full"
                        className="w-full h-full !p-0 !m-0"
                        showMarketValue={false}
                      />
                    )
                  ) : (
                    /* Silhouette Teaser */
                    <div className="w-full h-full bg-[#0c0c10] border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                      {selectedCardDef.imageUrl && (
                        <img
                          src={selectedCardDef.imageUrl}
                          alt="Classified"
                          className="absolute inset-0 w-full h-full object-cover filter brightness-0 contrast-200 opacity-20 pointer-events-none"
                        />
                      )}
                      <Lock className="w-12 h-12 text-zinc-600 mb-3 animate-pulse relative z-10" />
                      <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest relative z-10">
                        {selectedCardDef.cardNumber}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 mt-1 relative z-10">
                        CLASSIFIED CARD
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Master Dex Dossier */}
              <div className="flex-1 flex flex-col justify-between font-mono">
                <div>
                  {/* Serial & Rarity */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-amber-400 text-xs font-black">
                      {selectedCardDef.cardNumber}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-bold">
                      {selectedCardDef.rarity}
                    </span>
                    {cardDex?.[selectedCardDef.id]?.discovered && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>DISCOVERED</span>
                      </span>
                    )}
                  </div>

                  {/* Character Name & Title */}
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    {selectedCardDef.name}
                  </h3>
                  <p className="text-xs text-amber-300 font-bold mt-0.5">
                    {selectedCardDef.title}
                  </p>

                  {/* Lore Quote */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 italic leading-relaxed">
                    "{selectedCardDef.loreQuote}"
                  </div>

                  {/* Discovery Dossier Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase block">
                        Highest Finish
                      </span>
                      <span className="font-bold text-cyan-300 capitalize mt-0.5 block">
                        {cardDex?.[selectedCardDef.id]?.highestFinish?.replace('_', ' ') ?? 'None'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase block">
                        Best BGS Grade
                      </span>
                      <span className="font-bold text-amber-300 mt-0.5 block">
                        {cardDex?.[selectedCardDef.id]?.bestGrade
                          ? cardDex[selectedCardDef.id].bestGrade?.isBlackLabel
                            ? 'BLACK LABEL (10.0)'
                            : `Grade ${cardDex[selectedCardDef.id].bestGrade?.numericGrade} (${cardDex[selectedCardDef.id].bestGrade?.tierLabel})`
                          : 'Ungraded'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase block">
                        First Discovered
                      </span>
                      <span className="font-bold text-zinc-300 mt-0.5 block">
                        {cardDex?.[selectedCardDef.id]?.discoveredAt
                          ? new Date(cardDex[selectedCardDef.id].discoveredAt!).toLocaleDateString()
                          : 'Undiscovered'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase block">
                        Currently in Vault
                      </span>
                      <span className="font-bold text-zinc-300 mt-0.5 block">
                        {inventoryCountMap[selectedCardDef.id] || 0} copies
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Hint */}
                <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>TQQ Master Catalog</span>
                  <span>{selectedCardDef.characterRole === 'sister' ? 'Nakano Quintuplet' : 'Support Character'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CardDex;
