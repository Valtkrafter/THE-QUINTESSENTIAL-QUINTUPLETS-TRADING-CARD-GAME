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
  calculateBulkSellValue,
  PACKS_CONFIG,
  RARITY_BASE_VALUES,
} from '../../config/economy';
import { useGameStore, CURRENT_PATCH_VERSION } from '../../store/useGameStore';
import { APP_VERSION } from '../../config/version';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import { BinderGrid } from './BinderGrid';
import { CardActionModal } from './CardActionModal';
import { RestorationWorkbenchModal } from '../workshop/RestorationWorkbenchModal';
import { PackOpeningModal } from '../pack/PackOpeningModal';
import { SelectBoosterModal } from '../pack/SelectBoosterModal';
import { Vitrine } from '../showcase/Vitrine';
import { CardDex } from '../catalog/CardDex';
import { PatchNotesModal } from '../layout/PatchNotesModal';
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
  Award,
  Layers,
  ChevronDown,
  X,
  Flame,
  CheckCircle2,
  ExternalLink,
  Store,
  AlertTriangle,
} from 'lucide-react';

type FilterType = 'all' | 'raw' | 'graded' | 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki' | 'support';
type SortType = 'value_desc' | 'value_asc' | 'rarity_desc' | 'grade_desc' | 'recent';
type MainView = 'vitrine' | 'binder' | 'dex';

export const GrandBinder: React.FC = () => {
  // Main view switcher (Vitrine Showcase / Collection / Card-Dex)
  const [activeMainView, setActiveMainView] = useState<MainView>('vitrine');

  // Store bindings
  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const inventory = useGameStore((state) => state.inventory);
  const binder = useGameStore((state) => state.binder);
  const cardDex = useGameStore((state) => state.cardDex);
  const openPack = useGameStore((state) => state.openPack);
  const sellBulkCards = useGameStore((state) => state.sellBulkCards);
  const resetSave = useGameStore((state) => state.resetSave);
  const lastSeenPatchVersion = useGameStore((state) => state.lastSeenPatchVersion);
  const markPatchNotesSeen = useGameStore((state) => state.markPatchNotesSeen);

  // Patch Notes auto-show state (opens once on new version, can be re-opened manually)
  const [showPatchNotes, setShowPatchNotes] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastSeen = localStorage.getItem('TQQ_LAST_SEEN_VERSION');
      if (lastSeen !== APP_VERSION || lastSeenPatchVersion !== CURRENT_PATCH_VERSION) {
        setShowPatchNotes(true);
      }
    }
  }, [lastSeenPatchVersion]);

  const dexDiscoveredCount = useMemo(() => {
    if (!cardDex) return 0;
    return Object.values(cardDex).filter((e) => e.discovered).length;
  }, [cardDex]);

  // Selected card for Card Action Modal
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Pack Opening Modal State & Store Tab
  const [activePackId, setActivePackId] = useState<PackId | null>(null);
  const [showPackSelector, setShowPackSelector] = useState<boolean>(false);
  const [storeInitialTab, setStoreInitialTab] = useState<'packs' | 'kiosk'>('packs');
  const [restorationCard, setRestorationCard] = useState<CardInstance | null>(null);

  // Bulk Liquidation State
  const [showBulkSellModal, setShowBulkSellModal] = useState<boolean>(false);
  const [isBulkSelling, setIsBulkSelling] = useState<boolean>(false);
  const [bulkSellNotification, setBulkSellNotification] = useState<{ count: number; totalYen: number } | null>(null);

  // Filter and Sort states
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('value_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Eligible cards for bulk liquidation (unlocked raw Commons & Uncommons)
  const slottedCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of binder.slots) {
      if (s.cardInstanceId) ids.add(s.cardInstanceId);
    }
    return ids;
  }, [binder.slots]);

  const bulkSellableCards = useMemo(() => {
    return inventory.filter(
      (c) =>
        !c.isLocked &&
        !c.slottedBinder &&
        !slottedCardIds.has(c.id) &&
        !c.grade &&
        (c.rarity === 'C' || c.rarity === 'UC')
    );
  }, [inventory, slottedCardIds]);

  const bulkSellTotalYen = useMemo(() => {
    return calculateBulkSellValue(bulkSellableCards);
  }, [bulkSellableCards]);

  const handleExecuteBulkSell = () => {
    if (bulkSellableCards.length === 0 || isBulkSelling) return;
    setIsBulkSelling(true);

    try {
      const result = sellBulkCards({ rarities: ['C', 'UC'], uncertifiedOnly: true });
      soundEngine.playCoinPulseSound();
      setBulkSellNotification({ count: result.count, totalYen: result.totalYen });
      setShowBulkSellModal(false);

      setTimeout(() => {
        setBulkSellNotification(null);
      }, 4500);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsBulkSelling(false);
    }
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

          {/* Patch Notes Trigger Badge */}
          <button
            onClick={() => {
              soundEngine.playFoilRustle();
              setShowPatchNotes(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title={`View v${APP_VERSION} Patch Notes`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">v{APP_VERSION} Notes</span>
            <span className="sm:hidden">v{APP_VERSION}</span>
          </button>
        </div>

        {/* Center: Primary View Tabs (Vitrine Showcase / Collection / Card-Dex) */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 p-1 rounded-2xl font-mono text-xs shadow-inner">
          <button
            onClick={() => setActiveMainView('vitrine')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMainView === 'vitrine'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🏛️</span>
            <span>Showcase</span>
          </button>
          <button
            onClick={() => setActiveMainView('binder')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMainView === 'binder'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎴</span>
            <span>Collection ({inventory.length})</span>
          </button>
          <button
            onClick={() => setActiveMainView('dex')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMainView === 'dex'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📖</span>
            <span>Card-Dex ({dexDiscoveredCount}/42)</span>
          </button>
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

          {/* Singles Kiosk Modal Trigger */}
          <button
            onClick={() => {
              setStoreInitialTab('kiosk');
              setShowPackSelector(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-[#111116] hover:bg-zinc-800 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center gap-1.5"
            title="Open Daily Rotating Singles Kiosk"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Singles Kiosk</span>
          </button>

          {/* Reset Save State Button */}
          <button
            onClick={resetSave}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition"
            title="Reset Save State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Pack Opening Ceremony Trigger */}
          <button
            onClick={() => {
              setStoreInitialTab('packs');
              setShowPackSelector(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-zinc-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <PackageOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Open Packs</span>
          </button>
        </div>
      </header>

      {/* ============================================================
          VIEW 1: 5-SLOT ACRYLIC SHOWCASE (VITRINE)
          ============================================================ */}
      {activeMainView === 'vitrine' && (
        <main className="flex-1 min-h-0 h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden flex flex-col justify-between">
          <Vitrine />
        </main>
      )}

      {/* ============================================================
          VIEW 2: MASTER CARD-DEX (50-CARD CATALOG)
          ============================================================ */}
      {activeMainView === 'dex' && (
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CardDex />
        </main>
      )}

      {/* ============================================================
          VIEW 3: COLLECTION BINDER & INVENTORY GRID
          ============================================================ */}
      {activeMainView === 'binder' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* FILTER & SORT SUB-HEADER BAR */}
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

              {/* Bulk Sell Quick Action */}
              <button
                onClick={() => setShowBulkSellModal(true)}
                disabled={bulkSellableCards.length === 0}
                className="px-3 py-1.5 rounded-xl font-bold font-mono transition flex items-center gap-1.5 text-xs bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shadow-sm"
                title="Liquidate all unlocked raw Commons & Uncommons for Yen"
              >
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bulk Sell ({bulkSellableCards.length})</span>
                {bulkSellableCards.length > 0 && (
                  <span className="text-[10px] text-emerald-400/80 font-normal hidden sm:inline">
                    +{bulkSellTotalYen.toLocaleString()} ¥
                  </span>
                )}
              </button>
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

          {/* MAIN ZERO-SCROLLBAR GRID CONTAINER */}
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
          <BinderGrid cards={filteredCards} onCardClick={handleCardClick} />
        )}
          </main>
        </div>
      )}

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
        onOpenRestoration={(c) => {
          setIsModalOpen(false);
          setSelectedCard(null);
          setRestorationCard(c);
        }}
      />

      {/* ============================================================
          CARD PREP & RESTORATION WORKBENCH MODAL
          ============================================================ */}
      {restorationCard && (
        <RestorationWorkbenchModal
          card={restorationCard}
          isOpen={Boolean(restorationCard)}
          onClose={() => setRestorationCard(null)}
          onRestorationCompleted={() => {
            setRestorationCard(null);
          }}
        />
      )}

      {/* ============================================================
          BOOSTER PACK SELECTION MODAL & DROP RATES INSPECTOR
          ============================================================ */}
      <SelectBoosterModal
        isOpen={showPackSelector}
        initialTab={storeInitialTab}
        onClose={() => setShowPackSelector(false)}
        onSelectPack={(pId) => {
          setShowPackSelector(false);
          setActivePackId(pId);
        }}
      />

      {/* ============================================================
          BULK SELL CONFIRMATION MODAL & NOTIFICATION
          ============================================================ */}
      {showBulkSellModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none"
          onClick={() => setShowBulkSellModal(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-3xl bg-[#0e0e14] border border-emerald-500/40 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <Coins className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                Bulk Liquidation (C &amp; UC)
              </h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Liquidate all <span className="font-bold text-white">{bulkSellableCards.length} unlocked raw Commons and Uncommons</span> for an instant payout of:
              </p>
              <div className="text-2xl font-black text-amber-400 font-mono mt-2">
                +{bulkSellTotalYen.toLocaleString()} ¥
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Cards slotted in your binder or certified in acrylic slabs will not be affected.
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2 font-mono">
              <button
                onClick={() => setShowBulkSellModal(false)}
                disabled={isBulkSelling}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkSell}
                disabled={isBulkSelling}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-zinc-950 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/30 flex items-center gap-1.5"
              >
                <Coins className="w-4 h-4" />
                <span>{isBulkSelling ? 'Liquidating...' : 'Confirm Bulk Sale'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Sell Notification Toast */}
      {bulkSellNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 shadow-2xl flex items-center gap-3 text-white font-mono animate-fadeIn backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-emerald-300">BULK SALE COMPLETE</span>
            <span className="text-sm font-black text-white">
              Liquidated {bulkSellNotification.count} cards for +{bulkSellNotification.totalYen.toLocaleString()} ¥
            </span>
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

      {/* ============================================================
          PATCH NOTES MODAL (One-time auto-show, on-demand re-open)
          ============================================================ */}
      <PatchNotesModal
        isOpen={showPatchNotes}
        onClose={() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('TQQ_LAST_SEEN_VERSION', APP_VERSION);
          }
          markPatchNotesSeen(CURRENT_PATCH_VERSION);
          setShowPatchNotes(false);
        }}
      />
    </div>
  );
};

export default GrandBinder;
