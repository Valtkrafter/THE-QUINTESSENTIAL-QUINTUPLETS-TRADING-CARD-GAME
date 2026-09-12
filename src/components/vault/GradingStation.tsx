'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CardInstance, ConsumableToolId, GradeTier, GradingResultInfo } from '../../types/card';
import { calculateGradingFee, calculateRawCardValue, CONSUMABLE_TOOLS } from '../../config/economy';
import { resolveActiveSupportBuff } from '../../config/supportBuffs';
import { useGameStore } from '../../store/useGameStore';
import { CardRenderer } from '../card/CardRenderer';
import { GradingSlab } from '../card/GradingSlab';
import { GradingScannerFX, GradingPhase } from './GradingScannerFX';
import { soundEngine } from '../../utils/audioEngine';
import {
  Award,
  Coins,
  Shield,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  PackageOpen,
  ShoppingBag,
} from 'lucide-react';

interface GradingStationProps {
  onOpenShop?: () => void;
  onOpenPacks?: () => void;
}

export const GradingStation: React.FC<GradingStationProps> = ({
  onOpenShop,
  onOpenPacks,
}) => {
  const yen = useGameStore((state) => state.yen);
  const inventory = useGameStore((state) => state.inventory);
  const binder = useGameStore((state) => state.binder);
  const supportSlot = useGameStore((state) => state.supportSlot);
  const tools = useGameStore((state) => state.tools);
  const gradeCard = useGameStore((state) => state.gradeCard);
  const openPack = useGameStore((state) => state.openPack);

  // Active Support Altar buff resolution
  const activeSupportBuff = useMemo(() => {
    return resolveActiveSupportBuff(supportSlot);
  }, [supportSlot]);

  // Filter for un-graded (raw) cards in player's inventory
  const rawCards = useMemo(() => {
    return inventory.filter((c) => !c.grade);
  }, [inventory]);

  // Selected card to be graded
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // 1-slot tool socket
  const [equippedTool, setEquippedTool] = useState<ConsumableToolId | null>(null);

  // Animation sequence states
  const [gradingPhase, setGradingPhase] = useState<GradingPhase>('idle');
  const [lastGradeResult, setLastGradeResult] = useState<GradingResultInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Auto-select first raw card if available and current selection is invalid
  useEffect(() => {
    if (rawCards.length > 0 && (!selectedCardId || !rawCards.some((c) => c.id === selectedCardId))) {
      setSelectedCardId(rawCards[0].id);
    } else if (rawCards.length === 0) {
      setSelectedCardId(null);
    }
  }, [rawCards, selectedCardId]);

  const selectedCard = useMemo(() => {
    return rawCards.find((c) => c.id === selectedCardId) ?? null;
  }, [rawCards, selectedCardId]);

  // Support character discount (from Support Altar or legacy binder slot 5)
  const gradingDiscount = useMemo(() => {
    if (activeSupportBuff && activeSupportBuff.effects.gradingFeeDiscount > 0) {
      return activeSupportBuff.effects.gradingFeeDiscount;
    }
    const legacySlot = binder.slots.find((s) => s.slotIndex === 5);
    if (!legacySlot?.cardInstanceId) return 0;
    const card = inventory.find((c) => c.id === legacySlot.cardInstanceId);
    return card?.characterId === 'raiha' ? 0.15 : 0;
  }, [activeSupportBuff, binder, inventory]);

  // Calculate grading fee
  const gradingFee = useMemo(() => {
    if (!selectedCard) return 0;
    return calculateGradingFee(selectedCard, gradingDiscount);
  }, [selectedCard, gradingDiscount]);

  const canAfford = yen >= gradingFee;
  const deficit = gradingFee - yen;

  // Calculate dynamic probabilities based on equipped tool and Support Altar buffs
  const dynamicProbabilities = useMemo(() => {
    let poor = 12.0;
    let used = 30.0;
    let crisp = 38.0;
    let mint = 15.0;
    let gem10 = 4.7;
    let blackLabel = 0.3;

    // 1. Microfiber cloth: 100% eliminates 1-3
    if (equippedTool === 'microfiber_cloth') {
      poor = 0;
      const sum = used + crisp + mint + gem10 + blackLabel;
      const factor = 100.0 / sum;
      used *= factor;
      crisp *= factor;
      mint *= factor;
      gem10 *= factor;
      blackLabel *= factor;
    }

    // 2. Centering laser: +5% flat to Grade 10
    if (equippedTool === 'centering_laser') {
      const boost = 5.0;
      gem10 += boost;
      const lowerSum = poor + used + crisp + mint;
      if (lowerSum > boost) {
        const ratio = (lowerSum - boost) / lowerSum;
        poor *= ratio;
        used *= ratio;
        crisp *= ratio;
        mint *= ratio;
      }
    }

    // 3. Support Altar: Grade 10 / Black Label bonus (Raiha SR: +3% or +3.6% if Grade 9/10)
    const extraGrade10 = activeSupportBuff?.effects.grade10BlackLabelBonus ?? 0;
    if (extraGrade10 > 0) {
      const bonusPct = extraGrade10 * 100;
      gem10 += Number((bonusPct * 0.9).toFixed(2));
      blackLabel += Number((bonusPct * 0.1).toFixed(2));
      const lowerSum = poor + used + crisp + mint;
      if (lowerSum > bonusPct) {
        const ratio = (lowerSum - bonusPct) / lowerSum;
        poor *= ratio;
        used *= ratio;
        crisp *= ratio;
        mint *= ratio;
      }
    }

    return {
      poor: Number(poor.toFixed(1)),
      used: Number(used.toFixed(1)),
      crisp: Number(crisp.toFixed(1)),
      mint: Number(mint.toFixed(1)),
      gem10: Number(gem10.toFixed(1)),
      blackLabel: Number(blackLabel.toFixed(1)),
    };
  }, [equippedTool, activeSupportBuff]);

  // Handle Tool Socketing Toggle
  const toggleTool = (toolId: ConsumableToolId) => {
    if (equippedTool === toolId) {
      setEquippedTool(null);
      soundEngine.playToolClickSound();
    } else {
      if ((tools[toolId] ?? 0) <= 0) return;
      setEquippedTool(toolId);
      soundEngine.playToolClickSound();
    }
  };

  // Submit to Vault Grading Routine
  const handleStartGrading = async () => {
    if (!selectedCard || !canAfford || isProcessing) return;

    setIsProcessing(true);
    setLastGradeResult(null);

    // Call store action immediately to compute result & deduct fee/tool
    let result: GradingResultInfo;
    try {
      result = gradeCard(selectedCard.id, equippedTool ? [equippedTool] : []);
    } catch (err) {
      alert((err as Error).message);
      setIsProcessing(false);
      return;
    }

    // Phase 1: Slide Card into open Acrylic Shell (0.85s)
    setGradingPhase('sliding_in');
    soundEngine.playFoilRustle();

    await new Promise((r) => setTimeout(r, 850));

    // Phase 2: Dual Neon Cyan Laser Scanner sweep (2.0s)
    setGradingPhase('laser_scanning');
    soundEngine.playLaserScanSound();

    await new Promise((r) => setTimeout(r, 2000));

    // Phase 3: Hydraulic Slab Sealer presses down with shockwave (1.1s)
    setGradingPhase('hydraulic_sealing');
    soundEngine.playHydraulicStampSound();

    await new Promise((r) => setTimeout(r, 1100));

    // Phase 4: Vault Insurance check (if initial roll was < 7)
    if (result.insuranceRerolled) {
      setGradingPhase('insurance_trigger');
      soundEngine.playAnticipationSound('SR');
      await new Promise((r) => setTimeout(r, 1500));

      // Quick re-scan pulse
      setGradingPhase('laser_scanning');
      soundEngine.playLaserScanSound();
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Phase 5: Grade Label slams on top with color-coded impact
    setLastGradeResult(result);
    setGradingPhase('grade_slam');
    soundEngine.playGradeReveal(result.grade.tier);

    await new Promise((r) => setTimeout(r, 1600));

    // Complete!
    setGradingPhase('complete');
    setIsProcessing(false);
    setEquippedTool(null); // Tool consumed
  };

  // Quick helper to draw a free starter pack if player has 0 cards
  const handleQuickPull = () => {
    try {
      openPack('kiosk');
      soundEngine.playTearSound();
    } catch {
      // If lack yen, use test sheet
      try {
        openPack('test_sheet');
        soundEngine.playTearSound();
      } catch {
        // Fallback: add 500 Yen
        useGameStore.setState((prev) => ({ yen: prev.yen + 1000 }));
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 select-none">
      {/* STATION HEADER & STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-md">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            TQQ Vault Automated Grading Laboratory
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            The Vault Workstation
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Submit raw pulled cards for high-precision sonic slab encapsulation. 50% raw value fee applies.
          </p>
        </div>

        {/* Live Balance & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-black/60 border border-zinc-700 flex items-center gap-2 font-mono">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-zinc-400 leading-none">Your Yen</span>
              <span className="text-sm font-black text-amber-300 leading-tight">
                {yen.toLocaleString()} ¥
              </span>
            </div>
          </div>

          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              <span>Tool Shop</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          MAIN WORKBENCH: DUAL COLUMN LAYOUT
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: THE PHYSICAL GRADING CHAMBER */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl relative overflow-hidden shadow-2xl min-h-[580px]">
          {/* Chamber Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-black to-zinc-950/80 pointer-events-none" />

          {/* Chamber Grid Backing */}
          <div className="absolute inset-0 scanner-grid-bg opacity-30 pointer-events-none" />

          {/* THE CHAMBER STAGE */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full">
            {selectedCard ? (
              <div className="relative">
                {/* Visual Scanning FX Overlay */}
                <GradingScannerFX
                  phase={gradingPhase}
                  tier={lastGradeResult?.grade.tier}
                  numericGrade={lastGradeResult?.grade.numericGrade}
                  isBlackLabel={lastGradeResult?.grade.isBlackLabel}
                  insuranceRerolled={lastGradeResult?.insuranceRerolled}
                  activeTool={equippedTool}
                />

                {/* The Physical Card / Slab Container */}
                <div
                  className={`transition-all duration-300 ${
                    gradingPhase === 'sliding_in' ? 'animate-slide-into-shell' : ''
                  } ${
                    gradingPhase === 'hydraulic_sealing' || gradingPhase === 'insurance_trigger'
                      ? 'animate-screen-shake'
                      : ''
                  }`}
                >
                  {lastGradeResult && (gradingPhase === 'grade_slam' || gradingPhase === 'complete') ? (
                    <GradingSlab
                      card={lastGradeResult.card}
                      size="md"
                      interactive={true}
                      showMarketValue={true}
                    />
                  ) : (
                    <div className="relative p-2 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl">
                      <CardRenderer
                        card={selectedCard}
                        size="md"
                        interactive={gradingPhase === 'idle'}
                        showMarketValue={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* EMPTY STATE: NO RAW CARDS */
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
                  <PackageOpen className="w-8 h-8 text-amber-400/80" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No Un-Graded Cards Available</h3>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  Your inventory contains no raw cards to submit for grading. Crack booster packs to pull new raw collectible cards!
                </p>

                <div className="flex items-center gap-3">
                  {onOpenPacks ? (
                    <button
                      onClick={onOpenPacks}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-1.5"
                    >
                      <PackageOpen className="w-4 h-4" />
                      <span>Open Booster Packs</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleQuickPull}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg"
                    >
                      Draw Starter Cards
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* GRADING RESULT SUCCESS BANNER */}
            {gradingPhase === 'complete' && lastGradeResult && (
              <div className="mt-6 w-full max-w-md p-4 rounded-2xl bg-zinc-950/90 border border-zinc-700 shadow-2xl flex flex-col items-center animate-fade-in">
                <div className="w-full flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">Grading Outcome</span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Value: {Math.round(calculateRawCardValue(lastGradeResult.card.rarity, lastGradeResult.card.finish) * lastGradeResult.grade.multiplier).toLocaleString()} ¥
                  </span>
                </div>

                <div className="w-full flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300">
                    Grade: <strong>{lastGradeResult.grade.numericGrade}.0</strong> ({lastGradeResult.grade.tierLabel})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold">
                    {lastGradeResult.grade.multiplier}x Multiplier
                  </span>
                </div>

                <button
                  onClick={() => {
                    setGradingPhase('idle');
                    setLastGradeResult(null);
                  }}
                  className="mt-4 w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 border border-zinc-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Grade Another Card</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CONTROLS & SUBMISSION TERMINAL */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 1. CARD SELECTOR (RAW CARDS CAROUSEL / GRID) */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>1. Select Un-Graded Card ({rawCards.length})</span>
              </h3>
              {rawCards.length > 0 && (
                <span className="text-[10px] text-zinc-500 font-mono">Scroll & Click</span>
              )}
            </div>

            {rawCards.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
                {rawCards.map((card) => {
                  const isSelected = selectedCardId === card.id;
                  const rawVal = calculateRawCardValue(card.rarity, card.finish);
                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        if (gradingPhase === 'idle' || gradingPhase === 'complete') {
                          setSelectedCardId(card.id);
                          setGradingPhase('idle');
                          setLastGradeResult(null);
                        }
                      }}
                      disabled={isProcessing}
                      className={`shrink-0 p-2 rounded-xl border text-left transition-all flex flex-col items-center w-24 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-105'
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="w-16 h-22 rounded-lg bg-black/60 overflow-hidden mb-1.5 border border-white/10 flex items-center justify-center pointer-events-none">
                        <CardRenderer card={card} size="sm" interactive={false} showMarketValue={false} />
                      </div>
                      <span className="text-[10px] font-bold text-white truncate w-full text-center">
                        {card.name ?? 'Card'}
                      </span>
                      <span className="text-[9px] text-amber-400 font-mono mt-0.5">
                        {rawVal.toLocaleString()} ¥
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                No raw cards in inventory. Open packs to collect raw cards!
              </div>
            )}
          </div>

          {/* 2. CONSUMABLE TOOL SOCKET (1 ACTIVE SLOT) */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>2. Socket Consumable Tool (Max 1)</span>
              </h3>
              {equippedTool && (
                <button
                  onClick={() => setEquippedTool(null)}
                  className="text-[10px] text-zinc-400 hover:text-white underline font-mono"
                >
                  Unequip
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Microfiber Cloth */}
              {(() => {
                const owned = tools.microfiber_cloth ?? 0;
                const isEquipped = equippedTool === 'microfiber_cloth';
                return (
                  <button
                    key="microfiber_cloth"
                    onClick={() => toggleTool('microfiber_cloth')}
                    disabled={owned <= 0 || isProcessing}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isEquipped
                        ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-md'
                        : owned > 0
                        ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                        : 'border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-extrabold text-[11px] leading-tight">Cloth</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 border border-white/10">
                        x{owned}
                      </span>
                    </div>
                    <p className="text-[9px] leading-snug opacity-80 mb-2">
                      Blocks Grades 1–3 (No Beaten cards)
                    </p>
                    <div className="w-full flex items-center justify-center py-1 rounded bg-black/30 text-[9px] font-bold uppercase">
                      {isEquipped ? 'Equipped' : owned > 0 ? 'Equip' : 'Need 50 Dust'}
                    </div>
                  </button>
                );
              })()}

              {/* Centering Laser */}
              {(() => {
                const owned = tools.centering_laser ?? 0;
                const isEquipped = equippedTool === 'centering_laser';
                return (
                  <button
                    key="centering_laser"
                    onClick={() => toggleTool('centering_laser')}
                    disabled={owned <= 0 || isProcessing}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isEquipped
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-md'
                        : owned > 0
                        ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                        : 'border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-extrabold text-[11px] leading-tight">Laser</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 border border-white/10">
                        x{owned}
                      </span>
                    </div>
                    <p className="text-[9px] leading-snug opacity-80 mb-2">
                      +5% Flat Chance for Grade 10
                    </p>
                    <div className="w-full flex items-center justify-center py-1 rounded bg-black/30 text-[9px] font-bold uppercase">
                      {isEquipped ? 'Equipped' : owned > 0 ? 'Equip' : 'Need 150 Dust'}
                    </div>
                  </button>
                );
              })()}

              {/* Vault Insurance */}
              {(() => {
                const owned = tools.vault_insurance ?? 0;
                const isEquipped = equippedTool === 'vault_insurance';
                return (
                  <button
                    key="vault_insurance"
                    onClick={() => toggleTool('vault_insurance')}
                    disabled={owned <= 0 || isProcessing}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isEquipped
                        ? 'border-amber-400 bg-amber-950/40 text-amber-200 shadow-md'
                        : owned > 0
                        ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                        : 'border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-extrabold text-[11px] leading-tight">Insurance</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 border border-white/10">
                        x{owned}
                      </span>
                    </div>
                    <p className="text-[9px] leading-snug opacity-80 mb-2">
                      Auto-Reroll if 1st Roll &lt; Grade 7
                    </p>
                    <div className="w-full flex items-center justify-center py-1 rounded bg-black/30 text-[9px] font-bold uppercase">
                      {isEquipped ? 'Equipped' : owned > 0 ? 'Equip' : 'Need 300 Dust'}
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* 3. DYNAMIC PROBABILITY METER */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>3. Dynamic Probability Meter</span>
              </span>
              {equippedTool && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Tool Active
                </span>
              )}
            </h3>

            <div className="flex flex-col gap-2 font-mono text-xs">
              {/* Poor 1-3 */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className={`text-zinc-300 ${equippedTool === 'microfiber_cloth' ? 'line-through opacity-50' : ''}`}>
                    Grades 1–3 (Schulhof-Müll)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {equippedTool === 'microfiber_cloth' && (
                    <span className="text-[9px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
                      PROTECTED
                    </span>
                  )}
                  <span className={`font-bold ${equippedTool === 'microfiber_cloth' ? 'text-zinc-600' : 'text-red-400'}`}>
                    {dynamicProbabilities.poor}%
                  </span>
                </div>
              </div>

              {/* Used 4-6 */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
                  <span className="text-zinc-300">Grades 4–6 (Gebraucht)</span>
                </div>
                <span className="font-bold text-zinc-300">{dynamicProbabilities.used}%</span>
              </div>

              {/* Crisp 7-8 */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
                  <span className="text-zinc-200">Grades 7–8 (Crisp)</span>
                </div>
                <span className="font-bold text-slate-200">{dynamicProbabilities.crisp}%</span>
              </div>

              {/* Mint 9 */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="text-cyan-200">Grade 9 (God-Tier)</span>
                </div>
                <span className="font-bold text-cyan-300">{dynamicProbabilities.mint}%</span>
              </div>

              {/* Gem Mint 10 */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/80 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                  <span className="text-yellow-200 font-bold">Grade 10 (PEAK FICTION)</span>
                </div>
                <div className="flex items-center gap-1">
                  {equippedTool === 'centering_laser' && (
                    <span className="text-[9px] font-bold text-cyan-300 px-1 rounded bg-cyan-950 border border-cyan-500/40">
                      +5%
                    </span>
                  )}
                  {activeSupportBuff?.effects.grade10BlackLabelBonus ? (
                    <span className="text-[9px] font-bold text-amber-300 px-1 rounded bg-amber-950 border border-amber-500/40 animate-pulse">
                      +{(activeSupportBuff.effects.grade10BlackLabelBonus * 100).toFixed(1)}% Altar
                    </span>
                  ) : null}
                  <span className="font-black text-yellow-300">{dynamicProbabilities.gem10}%</span>
                </div>
              </div>

              {/* Black Label */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-black border border-amber-400/50 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                  <span className="text-amber-300 font-extrabold">Black Label (THE CHOSEN ONE)</span>
                </div>
                <span className="font-black text-amber-300">{dynamicProbabilities.blackLabel}%</span>
              </div>
            </div>
          </div>

          {/* 4. COST DISPLAY & SUBMISSION ACTION */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
            {/* Active Tutor Altar Banner */}
            {activeSupportBuff && (activeSupportBuff.effects.gradingFeeDiscount > 0 || activeSupportBuff.effects.grade10BlackLabelBonus > 0) && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-mono text-amber-300">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{activeSupportBuff.badgeLabel}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase font-mono">Grading Fee (50% Raw)</span>
              <div className="flex items-center gap-1.5 font-mono">
                {gradingDiscount > 0 && (
                  <span className="text-[10px] text-pink-300 px-1.5 rounded bg-pink-950 border border-pink-500/40 font-bold animate-pulse">
                    -{(gradingDiscount * 100).toFixed(0)}% Tutor Buff
                  </span>
                )}
                <span className="text-base font-black text-amber-300">{gradingFee.toLocaleString()} ¥</span>
              </div>
            </div>

            {/* Deficit Warning if player cannot afford */}
            {!canAfford && selectedCard && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/60 text-red-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Insufficient Yen! Deficit: <strong>-{deficit.toLocaleString()} ¥</strong>
                </span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              onClick={handleStartGrading}
              disabled={!selectedCard || !canAfford || isProcessing}
              className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-98 ${
                canAfford && selectedCard && !isProcessing
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2 animate-pulse font-mono">
                  <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                  ANALYZING SPECIMEN...
                </span>
              ) : (
                <>
                  <span>SUBMIT TO VAULT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingStation;
