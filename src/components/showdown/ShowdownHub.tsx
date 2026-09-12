'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, CharacterId, Rarity } from '../../types/card';
import { CARDS_CATALOG } from '../../config/cardsData';
import { calculateCardMarketValue, RARITY_BASE_VALUES } from '../../config/economy';
import { resolveActiveSupportBuff } from '../../config/supportBuffs';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer, CHARACTER_THEMES } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import { hapticLightTap, hapticJackpot, hapticTearCrimp } from '../../utils/haptics';
import {
  Swords,
  GraduationCap,
  Sparkles,
  ArrowRightLeft,
  RotateCw,
  Award,
  CheckCircle2,
  AlertCircle,
  Coins,
  BookOpen,
  Zap,
} from 'lucide-react';

type ShowdownTab = 'exam' | 'trade';

export const ShowdownHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ShowdownTab>('exam');

  // Store bindings
  const inventory = useGameStore((state) => state.inventory);
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const supportSlot = useGameStore((state) => state.supportSlot);
  const yen = useGameStore((state) => state.yen);

  // Active Support Buff (Takeda gives +15% Team IQ)
  const activeSupportBuff = useMemo(() => {
    return resolveActiveSupportBuff(supportSlot);
  }, [supportSlot]);

  const teamIqBonus = activeSupportBuff?.effects.teamIqBonus ?? 0;

  // ============================================================
  // EXAM BATTLE STATE & LOGIC
  // ============================================================
  const [isExamining, setIsExamining] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<{
    scores: Record<string, number>;
    totalScore: number;
    passed: boolean;
    rewardYen: number;
    rewardDust: number;
  } | null>(null);

  // Derive Team Power from Showcase or top 5 inventory cards
  const teamCards = useMemo(() => {
    const slotted = showcaseSlots
      .map((s) => inventory.find((c) => c.id === s.cardInstanceId))
      .filter((c): c is CardInstance => Boolean(c));

    if (slotted.length > 0) return slotted;

    // Fallback: top 5 cards by value
    return [...inventory]
      .sort((a, b) => calculateCardMarketValue(b) - calculateCardMarketValue(a))
      .slice(0, 5);
  }, [showcaseSlots, inventory]);

  const baseTeamPower = useMemo(() => {
    if (teamCards.length === 0) return 100;
    return teamCards.reduce((sum, c) => {
      const mult = c.grade ? c.grade.multiplier : 1.0;
      return sum + Math.round(calculateCardMarketValue(c) * 0.05 * mult);
    }, 150);
  }, [teamCards]);

  const finalTeamIQ = Math.round(baseTeamPower * (1.0 + teamIqBonus));

  const handleStartExam = async () => {
    if (isExamining) return;
    setIsExamining(true);
    setExamResult(null);
    hapticTearCrimp();
    soundEngine.playLaserScanSound();

    await new Promise((r) => setTimeout(r, 1200));

    // Subjects: Ichika (Math), Nino (English), Miku (History), Yotsuba (Japanese), Itsuki (Science)
    const subjects = [
      { name: 'Mathematics (Ichika)', base: 45 },
      { name: 'English Literature (Nino)', base: 48 },
      { name: 'Sengoku History (Miku)', base: 62 },
      { name: 'Modern Japanese (Yotsuba)', base: 50 },
      { name: 'General Science (Itsuki)', base: 54 },
    ];

    const iqFactor = Math.min(2.0, Math.max(0.5, finalTeamIQ / 300));
    const scores: Record<string, number> = {};
    let total = 0;

    for (const sub of subjects) {
      const variance = Math.floor(Math.random() * 25) - 10;
      const score = Math.min(100, Math.max(20, Math.round(sub.base * iqFactor + variance)));
      scores[sub.name] = score;
      total += score;
    }

    const passed = total >= 250;
    const rewardYen = passed ? 1500 + Math.round(total * 4) : 400;
    const rewardDust = passed ? 50 : 15;

    // Award reward to store
    useGameStore.setState((prev) => ({
      yen: prev.yen + rewardYen,
      stardust: prev.stardust + rewardDust,
    }));

    if (passed) {
      soundEngine.playRevealSound('SR');
      hapticJackpot();
    } else {
      soundEngine.playCoinPulseSound();
      hapticLightTap();
    }

    setExamResult({
      scores,
      totalScore: total,
      passed,
      rewardYen,
      rewardDust,
    });
    setIsExamining(false);
  };

  // ============================================================
  // WONDER TRADE STATE & LOGIC
  // ============================================================
  const [selectedTradeCardId, setSelectedTradeCardId] = useState<string | null>(null);
  const [isTrading, setIsTrading] = useState<boolean>(false);
  const [tradeReceivedCard, setTradeReceivedCard] = useState<CardInstance | null>(null);

  const tradeableCards = useMemo(() => {
    return inventory.filter((c) => !c.isLocked && !c.slottedBinder && !c.grade);
  }, [inventory]);

  const handleExecuteWonderTrade = async () => {
    if (!selectedTradeCardId || isTrading) return;
    const depositCard = inventory.find((c) => c.id === selectedTradeCardId);
    if (!depositCard) return;

    setIsTrading(true);
    setTradeReceivedCard(null);
    hapticTearCrimp();
    soundEngine.playReceiptSound();

    await new Promise((r) => setTimeout(r, 1400));

    // Remove deposited card and draw a random replacement from catalog
    const randomDef = CARDS_CATALOG[Math.floor(Math.random() * CARDS_CATALOG.length)];
    const newCard: CardInstance = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cardDefId: randomDef.id,
      characterId: randomDef.characterId,
      rarity: randomDef.rarity,
      finish: 'raw',
      obtainedAt: Date.now(),
      cardNumber: randomDef.cardNumber,
      name: randomDef.name,
      title: randomDef.title,
    };

    useGameStore.setState((prev) => ({
      inventory: [...prev.inventory.filter((c) => c.id !== depositCard.id), newCard],
    }));

    // Record discovery in dex
    useGameStore.getState().recordCardDiscovery(newCard);

    setTradeReceivedCard(newCard);
    setSelectedTradeCardId(null);
    setIsTrading(false);
    hapticJackpot();
    soundEngine.playRevealSound(newCard.rarity);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto px-4 py-4 space-y-4 font-sans select-none pb-24">
      {/* HEADER SWITCHER */}
      <div className="flex items-center justify-between bg-zinc-900/80 border border-white/10 p-1.5 rounded-2xl">
        <button
          onClick={() => {
            hapticLightTap();
            setActiveTab('exam');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-black transition ${
            activeTab === 'exam'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Exam Showdown</span>
        </button>
        <button
          onClick={() => {
            hapticLightTap();
            setActiveTab('trade');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-black transition ${
            activeTab === 'trade'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Wonder Trade</span>
        </button>
      </div>

      {/* ============================================================
          MODE 1: EXAM SHOWDOWN
          ============================================================ */}
      {activeTab === 'exam' && (
        <div className="space-y-4">
          {/* Rival Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-purple-950/60 border border-blue-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                Midterm Examination
              </div>
              <h3 className="text-base font-black text-white">Quintuplets vs. Takeda</h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                Surpass 250 total points to pass and earn Academic Honors!
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-zinc-400 block">Team IQ</span>
              <span className="text-lg font-black text-amber-400">{finalTeamIQ}</span>
              {teamIqBonus > 0 && (
                <span className="text-[9px] text-emerald-400 block font-bold">
                  +{(teamIqBonus * 100).toFixed(0)}% Takeda Buff
                </span>
              )}
            </div>
          </div>

          {/* Active Squad Preview */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">
              Participating Exam Squad ({teamCards.length} Cards)
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {teamCards.map((c) => (
                <div key={c.id} className="w-16 shrink-0 aspect-[63/88] rounded-lg overflow-hidden border border-white/20">
                  <CardRenderer card={c} size="sm" interactive={false} showMarketValue={false} />
                </div>
              ))}
            </div>
          </div>

          {/* Exam Result Display */}
          {examResult && (
            <div
              className={`p-4 rounded-2xl border font-mono space-y-3 animate-fadeIn ${
                examResult.passed
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-black text-sm">
                  {examResult.passed ? '★ EXAM PASSED: HONORS EARNED!' : 'STUDY REQUIRED: RETAKE EXAM'}
                </span>
                <span className="text-base font-black">
                  {examResult.totalScore} / 500 Pts
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {Object.entries(examResult.scores).map(([sub, score]) => (
                  <div key={sub} className="flex justify-between items-center text-zinc-300">
                    <span className="text-[11px] truncate max-w-[200px]">{sub}</span>
                    <span
                      className={`font-black ${
                        score >= 60 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}
                    >
                      {score} Pts
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-black">
                <span>Award Payout:</span>
                <span className="text-amber-300">
                  +{examResult.rewardYen} ¥ | +{examResult.rewardDust} ★
                </span>
              </div>
            </div>
          )}

          {/* Exam Action Button */}
          <button
            onClick={handleStartExam}
            disabled={isExamining || teamCards.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isExamining ? 'Scoring Examination Papers...' : 'Start Mock Exam'}</span>
          </button>
        </div>
      )}

      {/* ============================================================
          MODE 2: WONDER TRADE
          ============================================================ */}
      {activeTab === 'trade' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/30">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Nakano Study Circle
            </div>
            <h3 className="text-base font-black text-white">Wonder Trade Exchange</h3>
            <p className="text-xs text-zinc-300 mt-0.5">
              Deposit any raw duplicate card and receive a random mystery card in return!
            </p>
          </div>

          {/* Received Card Showcase */}
          {tradeReceivedCard && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-400/50 shadow-2xl flex flex-col items-center text-center space-y-3 animate-fadeIn">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                ★ Trade Complete: Received New Card! ★
              </span>
              <div className="w-44 aspect-[63/88] rounded-xl overflow-hidden shadow-2xl">
                <CardRenderer card={tradeReceivedCard} size="full" interactive={true} />
              </div>
              <div className="font-mono text-xs">
                <span className="text-white font-bold block">{tradeReceivedCard.name}</span>
                <span className="text-amber-400">{tradeReceivedCard.title}</span>
              </div>
            </div>
          )}

          {/* Trade Selection Carousel */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">
              1. Select Card to Deposit ({tradeableCards.length} Available)
            </span>

            {tradeableCards.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2">
                {tradeableCards.map((c) => {
                  const isSelected = selectedTradeCardId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        hapticLightTap();
                        setSelectedTradeCardId(c.id);
                      }}
                      className={`w-20 shrink-0 aspect-[63/88] rounded-xl overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-amber-400 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : 'border-white/15 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <CardRenderer card={c} size="sm" interactive={false} showMarketValue={false} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-zinc-500">
                No tradeable raw cards in inventory. Open booster packs first!
              </div>
            )}
          </div>

          {/* Trade Action Button */}
          <button
            onClick={handleExecuteWonderTrade}
            disabled={!selectedTradeCardId || isTrading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isTrading ? 'Exchanging with Collector...' : 'Deposit & Wonder Trade'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ShowdownHub;
