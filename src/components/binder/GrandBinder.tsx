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
} from '../../config/economy';
import { useGameStore, CURRENT_PATCH_VERSION } from '../../store/useGameStore';
import { BinderGrid } from './BinderGrid';
import { CardActionModal } from './CardActionModal';
import { PackOpeningModal } from '../pack/PackOpeningModal';
import { SelectBoosterModal } from '../pack/SelectBoosterModal';
import { Vitrine } from '../showcase/Vitrine';
import { CardDex } from '../catalog/CardDex';
import { PatchNotesModal } from '../common/PatchNotesModal';
import { soundEngine } from '../../utils/audioEngine';
import { AppViewport, useAppViewport } from '../layout/AppViewport';
import { MobileHeader } from '../layout/MobileHeader';
import { BottomNavigation, MobileNavTab } from '../layout/BottomNavigation';
import { ShowdownHub } from '../showdown/ShowdownHub';
import { VaultHub } from '../vault/VaultHub';
import { MobilePackKiosk } from '../pack/MobilePackKiosk';
import { QuestModal } from '../quest/QuestModal';
import {
  Sparkles,
  Coins,
  PackageOpen,
  RotateCcw,
  Search,
  Award,
  X,
  CheckCircle2,
  Store,
  ArrowUpDown,
} from 'lucide-react';

type FilterType = 'all' | 'raw' | 'graded' | 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki' | 'support';
type SortType = 'value_desc' | 'value_asc' | 'rarity_desc' | 'grade_desc' | 'recent';
type DesktopMainView = 'vitrine' | 'binder' | 'dex';

const GrandBinderInner: React.FC = () => {
  const { isMobileShell } = useAppViewport();

  // Desktop Main view switcher (Vitrine Showcase / Collection / Card-Dex)
  const [activeMainView, setActiveMainView] = useState<DesktopMainView>('vitrine');

  // Mobile 5-Tab Navigation State
  const [mobileTab, setMobileTab] = useState<MobileNavTab>('showcase');

  // Store bindings
  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const inventory = useGameStore((state) => state.inventory);
  const binder = useGameStore((state) => state.binder);
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const cardDex = useGameStore((state) => state.cardDex);
  const stats = useGameStore((state) => state.stats);
  const claimedQuestIds = useGameStore((state) => state.claimedQuestIds ?? []);
  const openPack = useGameStore((state) => state.openPack);
  const sellBulkCards = useGameStore((state) => state.sellBulkCards);
  const resetSave = useGameStore((state) => state.resetSave);
  const lastSeenPatchVersion = useGameStore((state) => state.lastSeenPatchVersion);
  const markPatchNotesSeen = useGameStore((state) => state.markPatchNotesSeen);

  // Patch Notes auto-show state (opens once on new version, can be re-opened manually)
  const [showPatchNotes, setShowPatchNotes] = useState<boolean>(false);

  // Fuutarou Quest Notebook Drawer state
  const [showQuestModal, setShowQuestModal] = useState<boolean>(false);

  useEffect(() => {
    if (lastSeenPatchVersion !== CURRENT_PATCH_VERSION) {
      setShowPatchNotes(true);
    }
  }, [lastSeenPatchVersion]);

  const dexDiscoveredCount = useMemo(() => {
    if (!cardDex) return 0;
    return Object.values(cardDex).filter((e) => e.discovered).length;
  }, [cardDex]);

  // Derive unread/ready-to-claim daily quests count for notification pip
  const unreadQuestsCount = useMemo(() => {
    let readyCount = 0;
    const slottedCount = (showcaseSlots ?? []).filter((s) => Boolean(s.cardInstanceId)).length;

    if ((stats.totalPacksOpened ?? 0) >= 1 && !claimedQuestIds.includes('study_session')) readyCount++;
    if (slottedCount >= 3 && !claimedQuestIds.includes('vitrine_squad')) readyCount++;
    if ((stats.totalCardsGraded ?? 0) >= 1 && !claimedQuestIds.includes('grading_lab')) readyCount++;
    if ((stats.totalStardustEarned ?? 0) >= 30 && !claimedQuestIds.includes('stardust_dust')) readyCount++;
    if (dexDiscoveredCount >= 8 && !claimedQuestIds.includes('dex_master')) readyCount++;

    return readyCount;
  }, [stats, showcaseSlots, claimedQuestIds, dexDiscoveredCount]);

  // Selected card for Card Action Modal
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Pack Opening Modal State & Store Tab
  const [activePackId, setActivePackId] = useState<PackId | null>(null);
  const [showPackSelector, setShowPackSelector] = useState<boolean>(false);
  const [storeInitialTab, setStoreInitialTab] = useState<'packs' | 'kiosk'>('packs');

  // Bulk Liquidation State
  const [showBulkSellModal, setShowBulkSellModal] = useState<boolean>(false);
  const [isBulkSelling, setIsBulkSelling] = useState<boolean>(false);
  const [bulkSellNotification, setBulkSellNotification] = useState<{ count: number; totalYen: number } | null>(null);

  // Filter and Sort states (for Desktop Binder Grid)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('value_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Eligible cards for bulk liquidation (unlocked raw Commons & Uncommons)
  const slottedCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of binder.slots) {
      if (s.cardInstanceId) ids.add(s.cardInstanceId);
    }
    for (const s of showcaseSlots ?? []) {
      if (s.cardInstanceId) ids.add(s.cardInstanceId);
    }
    return ids;
  }, [binder.slots, showcaseSlots]);

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

  // Filter and sort inventory for desktop collection
  const filteredCards = useMemo(() => {
    let result = [...inventory];

    if (activeFilter === 'raw') {
      result = result.filter((c) => !c.grade);
    } else if (activeFilter === 'graded') {
      result = result.filter((c) => !!c.grade);
    } else if (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(activeFilter)) {
      result = result.filter((c) => c.characterId === activeFilter);
    } else if (activeFilter === 'support') {
      result = result.filter((c) => !['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(c.characterId));
    }

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
        return (b.grade?.numericGrade ?? 0) - (a.grade?.numericGrade ?? 0);
      }
      if (activeSort === 'recent') {
        return b.obtainedAt - a.obtainedAt;
      }
      return 0;
    });

    return result;
  }, [inventory, activeFilter, activeSort, searchQuery]);

  const handleCardClick = (card: CardInstance) => {
    setSelectedCard(card);
    setIsModalOpen(true);
    soundEngine.playFoilRustle();
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#08080a] text-zinc-100 font-sans select-none relative">
      {/* ============================================================
          LAYOUT BRANCH 1: NATIVE PHONE SHELL (MOBILE VIEWPORT < 768px OR PHONE PREVIEW)
          ============================================================ */}
      {isMobileShell ? (
        <div className="w-full h-full flex flex-col overflow-hidden relative">
          {/* Top Micro-HUD */}
          <MobileHeader
            unreadQuestsCount={unreadQuestsCount}
            onOpenQuests={() => setShowQuestModal(true)}
          />

          {/* Mobile Main Tab Content Area */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {mobileTab === 'showcase' && <Vitrine />}
            {mobileTab === 'packs' && (
              <MobilePackKiosk
                onSelectPack={(pId) => setActivePackId(pId)}
                onViewOdds={(pId) => {
                  setStoreInitialTab('packs');
                  setShowPackSelector(true);
                }}
              />
            )}
            {mobileTab === 'showdown' && <ShowdownHub />}
            {mobileTab === 'dex' && <CardDex />}
            {mobileTab === 'vault' && (
              <VaultHub
                onCardClick={handleCardClick}
                onOpenPacks={() => setMobileTab('packs')}
                onOpenShop={() => {
                  setStoreInitialTab('kiosk');
                  setShowPackSelector(true);
                }}
                onOpenBulkSell={() => setShowBulkSellModal(true)}
              />
            )}
          </main>

          {/* Ergonomic Bottom Navigation Dock */}
          <BottomNavigation
            activeTab={mobileTab}
            onTabChange={(tab) => setMobileTab(tab)}
            inventoryCount={inventory.length}
            dexDiscoveredCount={dexDiscoveredCount}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col overflow-hidden">
          {/* DESKTOP RESPONSIVE CANVAS (WIDESCREEN) */}
          {/* DESKTOP HEADER */}
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

              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-zinc-300">
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
                title="View v0.2.0 Patch Notes"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>v0.2.0 Notes</span>
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

            {/* Right: Currencies & Store Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-zinc-900/90 border border-white/10 font-mono">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{yen.toLocaleString()} ¥</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>{stardust.toLocaleString()}</span>
                </div>
              </div>

              {/* Singles Kiosk Button */}
              <button
                onClick={() => {
                  setStoreInitialTab('kiosk');
                  setShowPackSelector(true);
                }}
                className="px-3.5 py-2 rounded-2xl bg-[#111116] hover:bg-zinc-800 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center gap-1.5"
                title="Open Daily Rotating Singles Kiosk"
              >
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Singles Kiosk</span>
              </button>

              {/* Reset Save Button */}
              <button
                onClick={resetSave}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition"
                title="Reset Save State"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Open Packs Button */}
              <button
                onClick={() => {
                  setStoreInitialTab('packs');
                  setShowPackSelector(true);
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-zinc-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <PackageOpen className="w-4 h-4" />
                <span>Open Packs</span>
              </button>
            </div>
          </header>

          {/* DESKTOP MAIN VIEW */}
          {activeMainView === 'vitrine' && (
            <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <Vitrine />
            </main>
          )}

          {activeMainView === 'dex' && (
            <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <CardDex />
            </main>
          )}

          {activeMainView === 'binder' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="h-14 shrink-0 border-b border-white/5 px-6 flex items-center justify-between gap-4 bg-zinc-950/40 text-xs">
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

                  <button
                    onClick={() => setShowBulkSellModal(true)}
                    disabled={bulkSellableCards.length === 0}
                    className="px-3 py-1.5 rounded-xl font-bold font-mono transition flex items-center gap-1.5 text-xs bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shadow-sm"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bulk Sell ({bulkSellableCards.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="relative">
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
                      <option value="value_desc" className="bg-zinc-900 text-white">Value (High → Low)</option>
                      <option value="value_asc" className="bg-zinc-900 text-white">Value (Low → High)</option>
                      <option value="rarity_desc" className="bg-zinc-900 text-white">Rarity (MR → C)</option>
                      <option value="grade_desc" className="bg-zinc-900 text-white">Grade (10 → Raw)</option>
                      <option value="recent" className="bg-zinc-900 text-white">Recently Pulled</option>
                    </select>
                  </div>
                </div>
              </div>

              <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
                <BinderGrid cards={filteredCards} onCardClick={handleCardClick} />
              </main>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SHARED MODALS & DIALOGS
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

      <SelectBoosterModal
        isOpen={showPackSelector}
        initialTab={storeInitialTab}
        onClose={() => setShowPackSelector(false)}
        onSelectPack={(pId) => {
          setShowPackSelector(false);
          setActivePackId(pId);
        }}
      />

      {/* Bulk Sell Confirmation Modal */}
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

      {/* 3D Booster Pack Opening Ceremony Modal */}
      {activePackId && (
        <PackOpeningModal
          isOpen={!!activePackId}
          packId={activePackId}
          onClose={() => setActivePackId(null)}
          onOpenAnother={(newPackId) => setActivePackId(newPackId)}
        />
      )}

      {/* Patch Notes Modal */}
      <PatchNotesModal
        isOpen={showPatchNotes}
        onClose={() => {
          markPatchNotesSeen(CURRENT_PATCH_VERSION);
          setShowPatchNotes(false);
        }}
      />

      {/* Fuutarou's Study Notebook Modal */}
      <QuestModal
        isOpen={showQuestModal}
        onClose={() => setShowQuestModal(false)}
      />
    </div>
  );
};

export const GrandBinder: React.FC = () => {
  return (
    <AppViewport>
      <GrandBinderInner />
    </AppViewport>
  );
};

export default GrandBinder;
