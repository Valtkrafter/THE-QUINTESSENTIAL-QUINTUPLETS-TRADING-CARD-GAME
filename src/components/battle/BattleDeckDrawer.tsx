'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../types/card';
import { useBattleStore } from '../../store/useBattleStore';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import { playSound } from '../../utils/audio';
import {
  deriveBattleStats,
  createSupportBattleCard,
  calculateTeamResolveMax,
  createSisterBattleCard,
} from '../../config/battleCalculations';
import { X, Search, Sparkles, Layers, Shield, Heart, Zap, Award, ArrowRightLeft, Trash2 } from 'lucide-react';

interface BattleDeckDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BattleDeckDrawer: React.FC<BattleDeckDrawerProps> = ({ isOpen, onClose }) => {
  const inventory = useGameStore((state) => state.inventory);
  const battleDeck = useBattleStore((state) => state.battleDeck);
  const assignSisterToDeck = useBattleStore((state) => state.assignSisterToDeck);
  const assignSupportToDeck = useBattleStore((state) => state.assignSupportToDeck);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0); // 0..4 for sisters, 5 for support
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<string>('all');

  const isSupportSlot = selectedSlotIndex === 5;

  // Derive Team Summary Stats
  const teamStats = useMemo(() => {
    const supportBuffPercent = battleDeck.support
      ? createSupportBattleCard(battleDeck.support).iqBuffPercent
      : 0;

    const sisters = battleDeck.sisters.map((c) =>
      c ? createSisterBattleCard(c, supportBuffPercent) : null
    );

    const totalIq = sisters.reduce((sum, s) => sum + (s ? s.stats.iq : 0), 0);
    const totalResolve = calculateTeamResolveMax(sisters);
    const validCount = sisters.filter((s) => s !== null).length;
    const avgCharm =
      validCount > 0
        ? Math.round(
            (sisters.reduce((sum, s) => sum + (s ? s.stats.charm : 0), 0) / validCount) * 100
          )
        : 0;

    return { totalIq, totalResolve, avgCharm, validCount, supportBuffPercent };
  }, [battleDeck]);

  // Current Card occupying selected slot
  const currentSlotCard = isSupportSlot
    ? battleDeck.support
    : battleDeck.sisters[selectedSlotIndex];

  // Candidates list filtered by slot requirements
  const candidateCards = useMemo(() => {
    let list = [...inventory];

    if (isSupportSlot) {
      // Support characters only
      list = list.filter((c) =>
        ['fuutarou', 'raiha', 'maruo', 'takeda', 'isanari'].includes(c.characterId)
      );
    } else {
      // Sisters only
      list = list.filter((c) =>
        ['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(c.characterId)
      );

      if (filterTab !== 'all' && filterTab !== 'support') {
        list = list.filter((c) => c.characterId === filterTab);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          c.cardDefId.toLowerCase().includes(q) ||
          c.characterId.toLowerCase().includes(q)
      );
    }

    return list;
  }, [inventory, isSupportSlot, filterTab, searchQuery]);

  // Slot occupant lookup map
  const slotOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    battleDeck.sisters.forEach((c, idx) => {
      if (c) map.set(c.id, idx);
    });
    if (battleDeck.support) {
      map.set(battleDeck.support.id, 5);
    }
    return map;
  }, [battleDeck]);

  const handleAssign = (card: CardInstance) => {
    playSound('card_slide');
    if (isSupportSlot) {
      assignSupportToDeck(card);
    } else {
      assignSisterToDeck(selectedSlotIndex, card);
    }
  };

  const handleUnmount = () => {
    playSound('card_slide');
    if (isSupportSlot) {
      assignSupportToDeck(null);
    } else {
      assignSisterToDeck(selectedSlotIndex, null);
    }
  };

  const handleAutoFill = () => {
    playSound('clean_chime');
    const sistersOrder: Array<'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki'> = [
      'ichika',
      'nino',
      'miku',
      'yotsuba',
      'itsuki',
    ];

    sistersOrder.forEach((charId, idx) => {
      const bestCard = inventory.find((c) => c.characterId === charId);
      if (bestCard) {
        assignSisterToDeck(idx, bestCard);
      }
    });

    const bestTutor = inventory.find((c) =>
      ['fuutarou', 'raiha', 'maruo', 'takeda'].includes(c.characterId)
    );
    if (bestTutor) {
      assignSupportToDeck(bestTutor);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-2xl h-full bg-[#0d1017] border-l border-white/10 flex flex-col shadow-2xl text-zinc-100"
      >
        {/* ============================================================
            DRAWER HEADER
            ============================================================ */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              ⚔️
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Battle Deck Builder
              </h2>
              <span className="text-xs text-zinc-400">
                Assign 5 Nakano Sisters + 1 Support Tutor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoFill}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-Fill
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================
            TEAM SUMMARY HUD
            ============================================================ */}
        <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Team IQ: <strong>{teamStats.totalIq}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Heart className="w-3.5 h-3.5" />
              <span>Resolve: <strong>{teamStats.totalResolve} HP</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-pink-400">
              <Award className="w-3.5 h-3.5" />
              <span>Avg Charm: <strong>{teamStats.avgCharm}%</strong></span>
            </div>
          </div>
          <span className="text-zinc-400 text-[11px]">
            {teamStats.validCount}/5 Sisters Slotted
          </span>
        </div>

        {/* ============================================================
            DECK SLOTS SELECTOR TABS
            ============================================================ */}
        <div className="p-3 bg-zinc-950/40 border-b border-white/5 grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4].map((idx) => {
            const card = battleDeck.sisters[idx];
            const isSelected = selectedSlotIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedSlotIndex(idx)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800/60'
                }`}
              >
                <span className="text-[10px] font-black text-zinc-400 uppercase">
                  Slot {idx + 1}
                </span>
                <span className="text-xs font-bold text-white truncate max-w-full">
                  {card ? card.name?.split(' ')[0] || card.characterId : 'Empty'}
                </span>
              </button>
            );
          })}

          {/* Support Slot 6 */}
          <button
            onClick={() => setSelectedSlotIndex(5)}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              isSupportSlot
                ? 'border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/10'
                : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800/60'
            }`}
          >
            <span className="text-[10px] font-black text-purple-400 uppercase">
              Tutor
            </span>
            <span className="text-xs font-bold text-white truncate max-w-full">
              {battleDeck.support ? battleDeck.support.name?.split(' ')[0] || 'Tutor' : 'Empty'}
            </span>
          </button>
        </div>

        {/* ============================================================
            ACTIVE SLOT DETAIL & UNMOUNT ACTION
            ============================================================ */}
        <div className="p-3 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400">
              Editing: <strong className="text-white">{isSupportSlot ? 'Support Tutor Dais' : `Sister Slot ${selectedSlotIndex + 1}`}</strong>
            </span>
            {currentSlotCard && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                {currentSlotCard.name} ({currentSlotCard.rarity})
              </span>
            )}
          </div>

          {currentSlotCard && (
            <button
              onClick={handleUnmount}
              className="px-2.5 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Unmount
            </button>
          )}
        </div>

        {/* ============================================================
            FILTER TABS & SEARCH BAR
            ============================================================ */}
        <div className="p-3 border-b border-white/5 flex flex-col gap-2 bg-zinc-950/20">
          {!isSupportSlot && (
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {['all', 'ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                    filterTab === tab
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search collection for ${isSupportSlot ? 'Support Tutors' : 'Sisters'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ============================================================
            CANDIDATE CARDS GRID
            ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {candidateCards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 text-xs font-mono">
              No matching {isSupportSlot ? 'Support' : 'Sister'} cards found in inventory.
            </div>
          ) : (
            candidateCards.map((card) => {
              const occupiedSlot = slotOccupancy.get(card.id);
              const isCurrent = occupiedSlot === selectedSlotIndex;
              const stats = deriveBattleStats(card);

              return (
                <div
                  key={card.id}
                  className={`bg-zinc-900/80 border rounded-xl p-2 flex flex-col gap-2 transition hover:border-amber-500/50 ${
                    isCurrent ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-white/10'
                  }`}
                >
                  <div className="w-full aspect-[63/88] rounded-lg overflow-hidden bg-black/60 relative">
                    <CardRenderer
                      card={card}
                      interactive={false}
                      disableTilt={true}
                      thumbnail={true}
                      className="w-full h-full"
                    />
                    {occupiedSlot !== undefined && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase shadow">
                        {occupiedSlot === 5 ? 'Tutor' : `Slot ${occupiedSlot + 1}`}
                      </span>
                    )}
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-bold text-white truncate">{card.name}</div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-zinc-400 mt-1">
                      <div>IQ: <strong className="text-cyan-300">{stats.iq}</strong></div>
                      <div>Crit: <strong className="text-pink-300">{Math.round(stats.charm * 100)}%</strong></div>
                      <div>HP: <strong className="text-emerald-300">{stats.resolve}</strong></div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(card)}
                    disabled={isCurrent}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      isCurrent
                        ? 'bg-zinc-800 text-zinc-500 cursor-default'
                        : occupiedSlot !== undefined
                        ? 'bg-amber-600/30 text-amber-300 hover:bg-amber-600/40 border border-amber-500/40'
                        : 'bg-amber-500 hover:bg-amber-400 text-black font-black'
                    }`}
                  >
                    {isCurrent ? (
                      'Assigned'
                    ) : occupiedSlot !== undefined ? (
                      <>
                        <ArrowRightLeft className="w-3 h-3" /> Swap
                      </>
                    ) : (
                      'Assign ▶'
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
