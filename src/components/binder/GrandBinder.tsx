'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CardInstance,
  CharacterId,
  PackId,
  Rarity,
} from '../../types/card';
import {
  calculateCardMarketValue,
  calculateAccruedIdleEarnings,
  PACKS_CONFIG,
  RARITY_BASE_VALUES,
} from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import { CardActionModal } from './CardActionModal';
import { PackOpeningModal } from '../pack/PackOpeningModal';
import { PACK_THEMES } from '../pack/BoosterPack3D';
import { soundEngine } from '../../utils/audioEngine';
import Link from 'next/link';
import {
  Sparkles,
  Coins,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Award,
  Layers,
  ChevronDown,
  X,
  Flame,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

type FilterType = 'all' | 'raw' | 'graded' | 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki' | 'support';
type SortType = 'value_desc' | 'value_asc' | 'rarity_desc' | 'grade_desc' | 'recent';

export const GrandBinder: React.FC = () => {
  // Store bindings
  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const inventory = useGameStore((state) => state.inventory);
  const binder = useGameStore((state) => state.binder);
  const lastActive = useGameStore((state) => state.lastActiveTimestamp);
  const getBinderSynergyReport = useGameStore((state) => state.getBinderSynergyReport);
  const claimIdleRevenue = useGameStore((state) => state.claimIdleRevenue);
  const openPack = useGameStore((state) => state.openPack);
  const resetSave = useGameStore((state) => state.resetSave);

  // Selected card for Card Action Modal
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Pack Opening Modal State
  const [activePackId, setActivePackId] = useState<PackId | null>(null);
  const [showPackSelector, setShowPackSelector] = useState<boolean>(false);

  // Filter and Sort states
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('value_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Real-time idle accrued revenue ticker
  const synergyReport = useMemo(() => getBinderSynergyReport(), [getBinderSynergyReport, binder, inventory]);
  const [accruedYen, setAccruedYen] = useState<number>(0);

  useEffect(() => {
    const updateAccrued = () => {
      const elapsedMinutes = (Date.now() - lastActive) / 60000;
      const accrued = calculateAccruedIdleEarnings(synergyReport, elapsedMinutes, 24);
      setAccruedYen(accrued);
    };
    updateAccrued();
    const interval = setInterval(updateAccrued, 2000);
    return () => clearInterval(interval);
  }, [lastActive, synergyReport]);

  // Claim idle revenue
  const handleClaimIdle = () => {
    const claimed = claimIdleRevenue();
    setAccruedYen(0);
    soundEngine.playRevealSound('SR');
  };

  // Add test funds
  const handleAddFunds = (amount: number) => {
    useGameStore.setState((prev) => ({ yen: prev.yen + amount }));
    soundEngine.playToolClickSound();
  };

  // Pull starter pack if inventory is empty
  const handleQuickStarter = () => {
    try {
      openPack('kiosk');
      soundEngine.playTearSound();
    } catch {
      try {
        openPack('test_sheet');
        soundEngine.playTearSound();
      } catch {
        useGameStore.setState((prev) => ({ yen: prev.yen + 2000 }));
      }
    }
  };

  // Filter and sort inventory
  const filteredCards = useMemo(() => {
    let result = [...inventory];

    // Filter by character or type
    if (activeFilter === 'raw') {
      result = result.filter((c) => !c.grade);
    } else if (activeFilter === 'graded') {
      result = result.filter((c) => !!c.grade);
    } else if (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(activeFilter)) {
      result = result.filter((c) => c.characterId === activeFilter);
    } else if (activeFilter === 'support') {
      result = result.filter((c) => !['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(c.characterId));
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

    // Sort order
    const rarityRank: Record<Rarity, number> = {
      MR: 7,
      SEC: 6,
      UR: 5,
      SR: 4,
      R: 3,
      UC: 2,
      C: 1,
    };

    result.sort((a, b) => {
      if (activeSort === 'value_desc') {
        return calculateCardMarketValue(b) - calculateCardMarketValue(a);
      }
      if (activeSort === 'value_asc') {
        return calculateCardMarketValue(a) - calculateCardMarketValue(b);
      }
      if (activeSort === 'rarity_desc') {
        return (rarityRank[b.rarity] ?? 0) - (rarityRank[a.rarity] ?? 0);
      }
      if (activeSort === 'grade_desc') {
        const gradeA = a.grade?.numericGrade ?? 0;
        const gradeB = b.grade?.numericGrade ?? 0;
        return gradeB - gradeA;
      }
      if (activeSort === 'recent') {
        return b.obtainedAt - a.obtainedAt;
      }
      return 0;
    });

    return result;
  }, [inventory, activeFilter, activeSort, searchQuery]);

  // Open modal for card
  const handleCardClick = (card: CardInstance) => {
    setSelectedCard(card);
    setIsModalOpen(true);
    soundEngine.playFoilRustle();
  };

  const allPackIds: PackId[] = [
    'test_sheet',
    'kiosk',
    'lernsession',
    'sommerfeuerwerk',
    'schulfest',
    'klassenfahrt_kyoto',
    'braut_schicksal',
    'god_pack',
  ];

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#08080c] flex flex-col text-zinc-100 font-sans select-none">
      {/* ============================================================
          FIXED TOP HEADER (h-16 shrink-0 border-b border-white/10 px-6)
          ============================================================ */}
      <header className="h-16 shrink-0 border-b border-white/10 px-6 flex items-center justify-between bg-[#0b0c12]/95 backdrop-blur-md z-30 shadow-lg">
        {/* Left: Branding & Card Count */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-zinc-950 font-black text-base shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              5
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white flex items-center gap-1.5 uppercase font-mono">
                The Grand Binder
              </h1>
              <span className="text-[10px] text-zinc-400 font-mono tracking-tight">
                TQQ Master Collection
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-zinc-300">
            <span className="text-zinc-500 text-[10px] uppercase">Total Cards:</span>
            <span className="font-bold text-amber-300">{inventory.length}</span>
          </div>

          {/* Real-time Idle Revenue Display & Claim */}
          <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-white/10 font-mono">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 uppercase">Idle Revenue</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{synergyReport.effectiveYieldPerMinute.toFixed(1)} ¥/min
              </span>
            </div>

            {accruedYen > 0 && (
              <button
                onClick={handleClaimIdle}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 transition active:scale-95 animate-pulse"
                title="Claim accrued idle earnings"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Claim {accruedYen.toLocaleString()} ¥</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Currencies & Primary Pack Opener */}
        <div className="flex items-center gap-3">
          {/* Live Yen & Dust Counters */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-zinc-900/90 border border-white/10 font-mono">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-400">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{yen.toLocaleString()} ¥</span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-cyan-400">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{stardust.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Cheats (Add funds / Reset) */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => handleAddFunds(10000)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-bold font-mono border border-white/10 transition"
              title="Add 10,000 Yen for testing"
            >
              +10k ¥
            </button>
            <button
              onClick={resetSave}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition"
              title="Reset Save State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pack Opening Ceremony Trigger */}
          <button
            onClick={() => setShowPackSelector(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-zinc-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <PackageOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Open Packs</span>
          </button>
        </div>
      </header>

      {/* ============================================================
          FILTER & SORT SUB-HEADER BAR
          ============================================================ */}
      <div className="h-14 shrink-0 border-b border-white/5 px-6 flex items-center justify-between gap-4 bg-zinc-950/40 text-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            All ({inventory.length})
          </button>

          <button
            onClick={() => setActiveFilter('graded')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'graded'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Slabs ({inventory.filter((c) => !!c.grade).length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('raw')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
              activeFilter === 'raw'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            Raw ({inventory.filter((c) => !c.grade).length})
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Sisters Filters */}
          {(['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'] as CharacterId[]).map((cId) => {
            const theme = CHARACTER_THEMES[cId];
            const isCurrent = activeFilter === cId;
            return (
              <button
                key={cId}
                onClick={() => setActiveFilter(cId as FilterType)}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 whitespace-nowrap capitalize ${
                  isCurrent
                    ? 'bg-white/20 text-white border border-white/30 shadow'
                    : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
                }`}
              >
                <span>{theme.symbol}</span>
                <span>{cId}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/10 rounded-xl px-2.5 py-1 font-mono text-[11px]">
            <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            <select
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value as SortType)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="value_desc" className="bg-zinc-900 text-white">Value (High $\to$ Low)</option>
              <option value="value_asc" className="bg-zinc-900 text-white">Value (Low $\to$ High)</option>
              <option value="rarity_desc" className="bg-zinc-900 text-white">Rarity (MR $\to$ C)</option>
              <option value="grade_desc" className="bg-zinc-900 text-white">Grade (10 $\to$ Raw)</option>
              <option value="recent" className="bg-zinc-900 text-white">Recently Pulled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN ZERO-SCROLLBAR GRID CONTAINER
          flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6
          ============================================================ */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
        {filteredCards.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-white/10 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
              <PackageOpen className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {inventory.length === 0 ? 'Your Grand Binder is Empty' : 'No Matching Cards Found'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mt-2 leading-relaxed">
              {inventory.length === 0
                ? 'Crack open your first booster pack to reveal raw anime cards, holographic foils, and legendary bride secrets.'
                : 'Try adjusting your filters or search terms to display cards in your collection.'}
            </p>

            {inventory.length === 0 && (
              <button
                onClick={handleQuickStarter}
                className="mt-6 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Starter Pack (Free)</span>
              </button>
            )}
          </div>
        ) : (
          /* Fluid Auto-Fill Grid (CSS Grid) */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6 pb-24 w-full auto-rows-max">
            {filteredCards.map((card) => {
              const marketVal = calculateCardMarketValue(card);
              const isSlab = !!card.grade;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="aspect-[63/88] w-full h-full relative cursor-pointer group rounded-2xl transition-all duration-300 transform-gpu hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                >
                  {/* Card Artwork & Shader Container */}
                  <div className="w-full h-full rounded-2xl overflow-hidden relative border border-white/10 group-hover:border-amber-400/50 transition">
                    <CardRenderer
                      card={card}
                      interactive={false}
                      disableTilt={true}
                      showMarketValue={false}
                      size="sm"
                      className="w-full h-full !p-0 !m-0 !scale-100"
                    />

                    {/* Slab Top Badge Indicator if Graded */}
                    {isSlab && (
                      <div className="absolute top-2 left-2 right-2 z-30 px-2 py-1 rounded-lg bg-black/90 border border-amber-400/80 backdrop-blur shadow-lg flex items-center justify-between font-mono text-[10px]">
                        <span className="font-black text-amber-300 truncate">
                          {card.grade?.isBlackLabel ? '★ BLACK LABEL' : `GRADE ${card.grade?.numericGrade}.0`}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold">
                          {card.grade?.tierLabel.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    {/* Bottom Value & Status Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between z-30 font-mono text-[11px]">
                      <div className="flex items-center gap-1 font-black text-amber-300 truncate">
                        <span>{marketVal.toLocaleString()} ¥</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black border uppercase tracking-wider ${RARITY_BADGES[card.rarity]}`}>
                        {card.rarity}
                      </span>
                    </div>

                    {/* Hover Glow Rim */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/0 group-hover:border-amber-400/80 pointer-events-none transition duration-300 z-40" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================
          CONTEXTUAL CARD ACTION MODAL
          ============================================================ */}
      <CardActionModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        onCardUpdated={(updated) => setSelectedCard(updated)}
        onCardDusted={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
      />

      {/* ============================================================
          BOOSTER PACK SELECTION MODAL
          ============================================================ */}
      {showPackSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPackSelector(false);
          }}
        >
          <div className="w-full max-w-4xl bg-[#0c0d14] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <PackageOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Select Booster Pack
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Choose any of the 8 booster tiers to run the slow-peel opening ceremony.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPackSelector(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Packs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {allPackIds.map((pId) => {
                const config = PACKS_CONFIG[pId];
                const theme = PACK_THEMES[pId];
                const canAfford = yen >= config.costYen;

                return (
                  <div
                    key={pId}
                    className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-amber-400/50 transition flex flex-col justify-between"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/60 border border-white/10 text-2xl mb-2 shadow-inner">
                        {theme.motifIcon}
                      </div>
                      <h4 className="font-black text-xs text-white truncate w-full">
                        {config.name.split('-')[0]}
                      </h4>
                      <span className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">
                        {config.costYen > 0 ? `${config.costYen.toLocaleString()} ¥` : 'FREE REFRESH'}
                      </span>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">
                        {config.description}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowPackSelector(false);
                        setActivePackId(pId);
                      }}
                      disabled={!canAfford && config.costYen > 0}
                      className="mt-3 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-[11px] uppercase tracking-wider transition active:scale-95 shadow"
                    >
                      Open Pack
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PHYSICAL PACK OPENING CEREMONY MODAL
          ============================================================ */}
      {activePackId && (
        <PackOpeningModal
          isOpen={!!activePackId}
          packId={activePackId}
          onClose={() => setActivePackId(null)}
          onOpenAnother={(newPackId) => setActivePackId(newPackId)}
        />
      )}
    </div>
  );
};

export default GrandBinder;
