'use client';

import React, { useState, useMemo } from 'react';
import { CardInstance, CharacterId, Rarity } from '../../types/card';
import { calculateCardMarketValue, calculateBulkSellValue } from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { BinderGrid } from '../binder/BinderGrid';
import { GradingStation } from './GradingStation';
import { SlabBreakerModal } from './SlabBreakerModal';
import { hapticLightTap } from '../../utils/haptics';
import { soundEngine } from '../../utils/audioEngine';
import {
  Layers,
  Award,
  Hammer,
  Search,
  Coins,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export interface VaultHubProps {
  onCardClick: (card: CardInstance) => void;
  onOpenPacks?: () => void;
  onOpenShop?: () => void;
  onOpenBulkSell?: () => void;
}

type VaultTab = 'collection' | 'grading';

export const VaultHub: React.FC<VaultHubProps> = ({
  onCardClick,
  onOpenPacks,
  onOpenShop,
  onOpenBulkSell,
}) => {
  const [activeVaultTab, setActiveVaultTab] = useState<VaultTab>('collection');
  const [showSlabBreaker, setShowSlabBreaker] = useState<boolean>(false);

  const inventory = useGameStore((state) => state.inventory);
  const binder = useGameStore((state) => state.binder);

  // Filter and sort states for collection
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeSort, setActiveSort] = useState<string>('value_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const gradedCount = useMemo(() => inventory.filter((c) => Boolean(c.grade)).length, [inventory]);
  const rawCount = useMemo(() => inventory.filter((c) => !c.grade).length, [inventory]);

  // Filter inventory
  const filteredCards = useMemo(() => {
    let result = [...inventory];

    if (activeFilter === 'raw') {
      result = result.filter((c) => !c.grade);
    } else if (activeFilter === 'graded') {
      result = result.filter((c) => Boolean(c.grade));
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

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden select-none">
      {/* VAULT SUB-HEADER: TABS & ACTION SHORTCUTS */}
      <div className="h-13 shrink-0 border-b border-white/10 px-3 flex items-center justify-between gap-2 bg-[#0c0c12]/90 backdrop-blur-md">
        {/* Sub-tabs: Collection Binder vs Grading Lab */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 p-1 rounded-xl font-mono text-xs">
          <button
            onClick={() => {
              hapticLightTap();
              setActiveVaultTab('collection');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeVaultTab === 'collection'
                ? 'bg-amber-500 text-black font-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cards ({inventory.length})</span>
          </button>
          <button
            onClick={() => {
              hapticLightTap();
              setActiveVaultTab('grading');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeVaultTab === 'grading'
                ? 'bg-amber-500 text-black font-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Grading Lab</span>
          </button>
        </div>

        {/* Quick-action: Slab Breaker Trigger */}
        <button
          onClick={() => {
            hapticLightTap();
            setShowSlabBreaker(true);
          }}
          className="px-2.5 py-1 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 font-mono text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
          title="Open Slab Breaker station"
        >
          <Hammer className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Crack Slab</span>
        </button>
      </div>

      {/* VIEW CONTENT */}
      {activeVaultTab === 'collection' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden pb-20">
          {/* Quick Filter Pill Row */}
          <div className="h-11 shrink-0 border-b border-white/5 px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-black/40 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-black font-black'
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              All ({inventory.length})
            </button>
            <button
              onClick={() => setActiveFilter('graded')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeFilter === 'graded'
                  ? 'bg-amber-500 text-black font-black'
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              <Award className="w-3 h-3" />
              <span>Slabs ({gradedCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('raw')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition whitespace-nowrap ${
                activeFilter === 'raw'
                  ? 'bg-amber-500 text-black font-black'
                  : 'text-zinc-400 hover:text-white bg-white/5'
              }`}
            >
              Raw ({rawCount})
            </button>

            {/* Sisters */}
            {(['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'] as CharacterId[]).map((cId) => (
              <button
                key={cId}
                onClick={() => setActiveFilter(cId)}
                className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition whitespace-nowrap capitalize ${
                  activeFilter === cId
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-zinc-400 hover:text-white bg-white/5'
                }`}
              >
                {cId}
              </button>
            ))}

            {/* Bulk Sell Shortcut */}
            {onOpenBulkSell && (
              <button
                onClick={onOpenBulkSell}
                className="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 whitespace-nowrap flex items-center gap-1 shrink-0 ml-auto"
              >
                <Coins className="w-3 h-3 text-emerald-400" />
                <span>Bulk Sell</span>
              </button>
            )}
          </div>

          {/* Cards Grid Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 no-scrollbar">
            <BinderGrid cards={filteredCards} onCardClick={onCardClick} />
          </div>
        </div>
      )}

      {activeVaultTab === 'grading' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-24 no-scrollbar">
          <GradingStation onOpenShop={onOpenShop} onOpenPacks={onOpenPacks} />
        </div>
      )}

      {/* Slab Breaker Modal */}
      <SlabBreakerModal
        isOpen={showSlabBreaker}
        onClose={() => setShowSlabBreaker(false)}
      />
    </div>
  );
};

export default VaultHub;
