'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CardInstance,
  ConsumableToolId,
  GradeTier,
  GradingResultInfo,
  Rarity,
} from '../../types/card';
import { CARD_MAP, getCardDef } from '../../config/cardsData';
import {
  calculateCardMarketValue,
  calculateRawCardValue,
  calculateDustYield,
  calculateCardSellValue,
  CONSUMABLE_TOOLS,
  GRADE_TIER_CONFIG,
} from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES, FINISH_LABELS } from '../card/CardRenderer';
import { GradingScannerFX, GradingPhase } from '../vault/GradingScannerFX';
import { soundEngine } from '../../utils/audioEngine';
import { hapticSlabCrunch } from '../../utils/haptics';
import {
  X,
  Award,
  Flame,
  Eye,
  BookOpen,
  Sparkles,
  Shield,
  Zap,
  Check,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Layers,
  Coins,
  CheckCircle2,
  Minimize2,
  Info,
  Hammer,
} from 'lucide-react';

export interface CardActionModalProps {
  card: CardInstance | null;
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated?: (updatedCard: CardInstance) => void;
  onCardDusted?: (cardId: string) => void;
  onCardSold?: (cardId: string, yenEarned: number) => void;
}

type ActiveActionTab = 'grade' | 'vaporize' | 'inspect' | 'dossier';

export const CardActionModal: React.FC<CardActionModalProps> = ({
  card: initialCard,
  isOpen,
  onClose,
  onCardUpdated,
  onCardDusted,
  onCardSold,
}) => {
  // Local active card state to immediately reflect mutations (e.g. grading)
  const [activeCard, setActiveCard] = useState<CardInstance | null>(initialCard);
  const [activeTab, setActiveTab] = useState<ActiveActionTab>('grade');
  const [isInspectMode, setIsInspectMode] = useState<boolean>(false);

  // Store bindings
  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const tools = useGameStore((state) => state.tools);
  const binder = useGameStore((state) => state.binder);
  const inventory = useGameStore((state) => state.inventory);
  const submitForGrading = useGameStore((state) => state.submitForGrading);
  const vaporizeCard = useGameStore((state) => state.vaporizeCard);
  const sellCard = useGameStore((state) => state.sellCard);
  const buyTool = useGameStore((state) => state.buyTool);
  const crackSlab = useGameStore((state) => state.crackSlab);

  // Consumables selected for grading
  const [selectedTools, setSelectedTools] = useState<Set<ConsumableToolId>>(new Set());

  // Grading animation routine states
  const [gradingPhase, setGradingPhase] = useState<GradingPhase>('idle');
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [lastGradeResult, setLastGradeResult] = useState<GradingResultInfo | null>(null);

  // Vaporization confirmation state
  const [confirmingVaporize, setConfirmingVaporize] = useState<boolean>(false);
  const [isVaporizing, setIsVaporizing] = useState<boolean>(false);

  // Direct Sell System states
  const [confirmingSell, setConfirmingSell] = useState<boolean>(false);
  const [isSelling, setIsSelling] = useState<boolean>(false);
  const [coinParticles, setCoinParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      scale: number;
      delay: number;
      rotation: number;
    }>
  >([]);

  // Synchronize when initialCard prop changes
  useEffect(() => {
    setActiveCard(initialCard);
    setSelectedTools(new Set());
    setGradingPhase('idle');
    setIsGrading(false);
    setLastGradeResult(null);
    setConfirmingVaporize(false);
    setConfirmingSell(false);
    setIsSelling(false);
    setCoinParticles([]);
    setIsInspectMode(false);
    setActiveTab('grade');
  }, [initialCard]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isInspectMode) {
          setIsInspectMode(false);
        } else if (confirmingSell) {
          setConfirmingSell(false);
        } else if (confirmingVaporize) {
          setConfirmingVaporize(false);
        } else if (!isGrading && !isSelling) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInspectMode, confirmingVaporize, confirmingSell, isGrading, isSelling, onClose]);

  if (!isOpen || !activeCard) return null;

  const cardDef = getCardDef(activeCard.cardDefId) ?? CARD_MAP['miku_c_01'];
  const charTheme = CHARACTER_THEMES[activeCard.characterId] ?? CHARACTER_THEMES.miku;
  const isSlabbed = !!activeCard.grade;
  const currentMarketValue = calculateCardMarketValue(activeCard);

  // Raiha support perk (-15% grading fee)
  const hasRaihaSupport = binder.slots[5]?.cardInstanceId
    ? inventory.find((c) => c.id === binder.slots[5].cardInstanceId)?.characterId === 'raiha'
    : false;

  // Maruo support perk (+20% bonus dust)
  const hasMaruoSupport = binder.slots[5]?.cardInstanceId
    ? inventory.find((c) => c.id === binder.slots[5].cardInstanceId)?.characterId === 'maruo'
    : false;

  // Action 1: Grading Fee Calculation: max(500, floor(marketValue * 0.50))
  const baseGradingFee = Math.max(500, Math.floor(currentMarketValue * 0.50));
  const finalGradingFee = hasRaihaSupport ? Math.round(baseGradingFee * 0.85) : baseGradingFee;
  const canAffordGrading = yen >= finalGradingFee;

  // Action 2: Stardust Yield Calculation: max(1, floor(marketValue * 0.20))
  const baseDustYield = Math.max(1, Math.floor(currentMarketValue * 0.20));
  const finalDustYield = hasMaruoSupport ? Math.floor(baseDustYield * 1.2) : baseDustYield;

  // Serial / Cert Number
  const certNumber = activeCard.grade
    ? `TQQ-${new Date(activeCard.grade.gradedAt).getFullYear()}-${activeCard.id.slice(0, 6).toUpperCase()}`
    : `${activeCard.cardNumber ?? cardDef.cardNumber} • RAW`;

  // Toggle consumable tool
  const toggleTool = (toolId: ConsumableToolId) => {
    if ((tools[toolId] ?? 0) <= 0) return;
    soundEngine.playToolClickSound();
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  // Quick buy tool
  const handleQuickBuyTool = (toolId: ConsumableToolId) => {
    try {
      buyTool(toolId, 1);
      soundEngine.playToolClickSound();
      setSelectedTools((prev) => new Set(prev).add(toolId));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Execute Grading Sequence
  const handleGradeInVault = async () => {
    if (isSlabbed || !canAffordGrading || isGrading) return;

    setIsGrading(true);
    let result: GradingResultInfo;

    try {
      result = submitForGrading(activeCard.id, Array.from(selectedTools));
    } catch (err) {
      alert((err as Error).message);
      setIsGrading(false);
      return;
    }

    // Sequence Animation
    setGradingPhase('sliding_in');
    soundEngine.playFoilRustle();
    await new Promise((r) => setTimeout(r, 850));

    setGradingPhase('laser_scanning');
    soundEngine.playLaserScanSound();
    await new Promise((r) => setTimeout(r, 2000));

    setGradingPhase('hydraulic_sealing');
    soundEngine.playHydraulicStampSound();
    await new Promise((r) => setTimeout(r, 1100));

    if (result.insuranceRerolled) {
      setGradingPhase('insurance_trigger');
      soundEngine.playAnticipationSound('SR');
      await new Promise((r) => setTimeout(r, 1500));

      setGradingPhase('laser_scanning');
      soundEngine.playLaserScanSound();
      await new Promise((r) => setTimeout(r, 1000));
    }

    setLastGradeResult(result);
    setGradingPhase('grade_slam');
    soundEngine.playGradeReveal(result.grade.tier);
    await new Promise((r) => setTimeout(r, 1600));

    // Update local card representation to instantly morph into acrylic slab
    setActiveCard(result.card);
    onCardUpdated?.(result.card);
    setGradingPhase('complete');
    setIsGrading(false);
    setSelectedTools(new Set());
  };

  // Execute Vaporization Routine
  const handleExecuteVaporize = async () => {
    if (isSlabbed || isVaporizing) return;

    setIsVaporizing(true);
    soundEngine.playDustVaporizeSound();

    await new Promise((r) => setTimeout(r, 450));

    try {
      vaporizeCard(activeCard.id);
      onCardDusted?.(activeCard.id);
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsVaporizing(false);
      setConfirmingVaporize(false);
    }
  };

  // Direct Sell System calculations & handlers
  const sellValue = calculateCardSellValue(activeCard);
  const isHighRarity =
    activeCard.rarity === 'UR' ||
    activeCard.rarity === 'SEC' ||
    activeCard.rarity === 'MR' ||
    (activeCard.grade !== undefined && activeCard.grade.numericGrade >= 9);

  const isLockedOrSlotted = Boolean(
    activeCard.isLocked ||
      activeCard.slottedBinder ||
      binder.slots.some((s) => s.cardInstanceId === activeCard.id)
  );

  const handleInitiateSell = () => {
    if (isLockedOrSlotted || isSelling || isGrading) return;
    if (isHighRarity) {
      setConfirmingSell(true);
      return;
    }
    handleExecuteSell();
  };

  const handleExecuteSell = async () => {
    if (isLockedOrSlotted || isSelling) return;

    setIsSelling(true);

    // Disperse 15-20 golden coin particles flying upwards toward the HUD currency tracker
    const particles = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 40,
      targetX: 180 + (Math.random() - 0.5) * 140,
      targetY: -350 - Math.random() * 160,
      scale: 0.8 + Math.random() * 0.4,
      delay: i * 0.02,
      rotation: Math.random() * 720 - 360,
    }));
    setCoinParticles(particles);

    // Procedural Web Audio metallic coin chime
    soundEngine.playCoinPulseSound();

    try {
      const earned = sellCard(activeCard.id);
      onCardSold?.(activeCard.id, earned);
      onCardDusted?.(activeCard.id);
    } catch (err) {
      alert((err as Error).message);
      setIsSelling(false);
      setConfirmingSell(false);
      setCoinParticles([]);
      return;
    }

    await new Promise((r) => setTimeout(r, 750));
    setIsSelling(false);
    setConfirmingSell(false);
    setCoinParticles([]);
    onClose();
  };

  // Slab Cracking Action
  const handleCrackCurrentSlab = () => {
    if (!activeCard?.grade || isGrading || isSelling) return;
    hapticSlabCrunch();
    soundEngine.playSlabCrackSound();
    const updated = crackSlab(activeCard.id);
    setActiveCard(updated);
    onCardUpdated?.(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-6 select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGrading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl lg:max-w-5xl max-h-[90dvh] sm:max-h-[92vh] bg-[#111116] border-t sm:border border-[#23232e] rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.85)] sm:shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
        {/* Mobile Pull Handle Bar */}
        <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-[#2a2a38] rounded-full" />
        </div>

        {/* Top Header Bar */}
        <div className="h-14 shrink-0 border-b border-white/10 px-6 flex items-center justify-between bg-zinc-950/60 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            <span className="text-lg">{charTheme.symbol}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm text-white tracking-wide">{activeCard.name ?? cardDef.name}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${RARITY_BADGES[activeCard.rarity]}`}>
                  {activeCard.rarity}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-mono">
                  {FINISH_LABELS[activeCard.finish]}
                </span>
                {isSlabbed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold font-mono">
                    SLABBED {activeCard.grade?.numericGrade}.0
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 truncate">{activeCard.title ?? cardDef.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs">
              <span className="text-zinc-500 text-[10px]">CERT:</span>
              <span className="text-amber-300 font-bold">{certNumber}</span>
            </div>

            <button
              onClick={onClose}
              disabled={isGrading}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-400 hover:text-white transition border border-white/10"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Responsive Layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          {/* ============================================================
              LEFT COLUMN: 3D INTERACTIVE STAGE
              ============================================================ */}
          <div
            className={`transition-all duration-300 relative flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-zinc-950/80 via-[#08080d] to-black min-w-0 overflow-visible ${
              isInspectMode
                ? 'w-full md:w-full h-full'
                : 'w-full md:w-[45%] lg:w-[42%] shrink-0 border-b md:border-b-0 md:border-r border-white/10'
            }`}
          >
            {/* Ambient Character Glow Backdrop */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none transition-colors duration-700"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${charTheme.accent} 0%, transparent 68%)`,
              }}
            />

            {/* Inspect Mode Exit Floating Button */}
            {isInspectMode && (
              <button
                onClick={() => setIsInspectMode(false)}
                className="absolute top-4 left-4 z-40 px-4 py-2 rounded-xl bg-zinc-900/90 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 hover:bg-zinc-800 transition shadow-xl backdrop-blur-md"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Inspection Mode</span>
              </button>
            )}

            {/* 3D Rendered Card / Slab Stage */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full">
              <div className="relative flex items-center justify-center w-full p-2 sm:p-4">
                <div
                  className={`w-full ${
                    isSlabbed
                      ? isInspectMode
                        ? 'max-w-[380px] aspect-[82/130]'
                        : 'max-w-[320px] aspect-[82/130]'
                      : isInspectMode
                      ? 'max-w-[320px] aspect-[63/88]'
                      : 'max-w-[260px] aspect-[63/88]'
                  } max-h-[64vh] flex items-center justify-center relative transition-all duration-300`}
                >
                  {isSlabbed ? (
                    <GradingSlab
                      card={activeCard}
                      size={isInspectMode ? 'lg' : 'md'}
                      interactive={true}
                      showMarketValue={true}
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <CardRenderer
                        card={activeCard}
                        size={isInspectMode ? 'lg' : 'md'}
                        interactive={true}
                        showMarketValue={true}
                      />
                    </div>
                  )}

                  {/* Laser Scanning FX Overlay */}
                  <GradingScannerFX
                    phase={gradingPhase}
                    tier={lastGradeResult?.grade.tier}
                    numericGrade={lastGradeResult?.grade.numericGrade}
                    isBlackLabel={lastGradeResult?.grade.isBlackLabel}
                    insuranceRerolled={lastGradeResult?.insuranceRerolled}
                    activeTool={Array.from(selectedTools)[0] ?? null}
                  />
                </div>
              </div>

              {/* Hover Tilt Hint */}
              <div className="mt-2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 border border-white/10 text-zinc-400 text-[11px] backdrop-blur shadow">
                <Eye className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Tilt mouse to admire 3D reflections & light specular vector</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              RIGHT COLUMN: CONTEXTUAL ACTION DASHBOARD
              ============================================================ */}
          {!isInspectMode && (
            <div className="w-full md:w-[55%] lg:w-[58%] flex-1 min-h-0 flex flex-col justify-between pl-0 min-w-0 bg-[#0c0d14] overflow-y-auto">
              {/* Value & Stats Banner */}
              <div className="p-5 border-b border-white/10 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Current Market Value</span>
                  <div className="text-2xl font-black text-amber-400 font-mono flex items-center gap-1.5">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span>{currentMarketValue.toLocaleString()} ¥</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Dust Value</span>
                    <div className="text-sm font-bold text-cyan-400 font-mono flex items-center justify-end gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{finalDustYield} Dust</span>
                    </div>
                  </div>
                  <div className="text-right pl-3 border-l border-white/10">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Grading Status</span>
                    <div className={`text-xs font-bold font-mono ${isSlabbed ? 'text-amber-300' : 'text-zinc-400'}`}>
                      {isSlabbed ? `Tier: ${activeCard.grade?.tierLabel}` : 'Raw Uncertified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contextual Action Bar: Violet Vaporize / Crack Slab & Emerald Green Sell for ¥ */}
              <div className="p-3.5 border-b border-white/10 bg-zinc-950/70 flex flex-wrap items-center gap-2.5">
                {isSlabbed ? (
                  /* Crack Slab Action for Graded Slabs */
                  <button
                    onClick={handleCrackCurrentSlab}
                    disabled={isLockedOrSlotted || isGrading || isSelling}
                    className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md bg-red-600 hover:bg-red-500 text-white shadow-red-600/25 cursor-pointer"
                    title="Crack acrylic slab back to raw card"
                  >
                    <Hammer className="w-4 h-4" />
                    <span>Crack Slab</span>
                  </button>
                ) : (
                  /* Violet Vaporize Button for Raw Cards */
                  <button
                    onClick={() => {
                      setActiveTab('vaporize');
                      setConfirmingVaporize(true);
                    }}
                    disabled={isGrading || isSelling}
                    className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[#8B5CF6]/25 cursor-pointer"
                    title="Convert into Stardust"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Vaporize ({finalDustYield} ★)</span>
                  </button>
                )}

                {/* Emerald Green Sell Button */}
                <button
                  onClick={handleInitiateSell}
                  disabled={isLockedOrSlotted || isGrading || isSelling}
                  className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md ${
                    isLockedOrSlotted
                      ? 'bg-zinc-900/60 border border-white/5 text-zinc-600 cursor-not-allowed'
                      : 'bg-[#10B981] hover:bg-[#059669] text-zinc-950 shadow-[#10B981]/25'
                  }`}
                  title={
                    isLockedOrSlotted
                      ? 'Unslot card from showcase binder before liquidating'
                      : `Liquidate card for ${sellValue.toLocaleString()} ¥`
                  }
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {isLockedOrSlotted ? 'Showcase Locked' : `Sell for ${sellValue.toLocaleString()} ¥`}
                  </span>
                </button>
              </div>

              {/* Action Tabs Header */}
              <div className="grid grid-cols-4 p-2 border-b border-white/10 bg-zinc-950/20 gap-1 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('grade')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'grade'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Grade</span>
                </button>

                <button
                  onClick={() => setActiveTab('vaporize')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'vaporize'
                      ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Vaporize</span>
                </button>

                <button
                  onClick={() => setIsInspectMode(true)}
                  className="py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect 3D</span>
                </button>

                <button
                  onClick={() => setActiveTab('dossier')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                    activeTab === 'dossier'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Dossier</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 flex-1 min-h-0 flex flex-col justify-between">
                {/* ============================================================
                    TAB 1: ACTION 1 - GRADE IN VAULT
                    ============================================================ */}
                {activeTab === 'grade' && (
                  <div className="space-y-4">
                    {isSlabbed ? (
                      /* Graded Card Subgrade Breakdown */
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                              OFFICIAL SLAB CERTIFICATE
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-300">
                              GRADE {activeCard.grade?.numericGrade}.0 / 10
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300">
                            This card is sonic-welded inside an airtight acrylic slab with UV barrier protection.
                            Graded cards cannot be graded again or vaporized.
                          </p>
                        </div>

                        {/* Subgrade Radar / Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
                          <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10">
                            <span className="text-[10px] text-zinc-400 uppercase">Centering</span>
                            <div className="text-base font-black text-amber-300">
                              {activeCard.grade?.subgrades.centering.toFixed(1)}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10">
                            <span className="text-[10px] text-zinc-400 uppercase">Surface</span>
                            <div className="text-base font-black text-amber-300">
                              {activeCard.grade?.subgrades.surface.toFixed(1)}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10">
                            <span className="text-[10px] text-zinc-400 uppercase">Corners</span>
                            <div className="text-base font-black text-amber-300">
                              {activeCard.grade?.subgrades.corners.toFixed(1)}
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10">
                            <span className="text-[10px] text-zinc-400 uppercase">Edges</span>
                            <div className="text-base font-black text-amber-300">
                              {activeCard.grade?.subgrades.edges.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/10 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">Valuation Multiplier:</span>
                          <span className="font-bold text-emerald-400">+{((activeCard.grade?.multiplier ?? 1) * 100 - 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ) : (
                      /* Raw Card Grading Controls */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900 border border-white/10">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-zinc-400">Grading Fee</span>
                            <div className="text-lg font-black text-amber-400 font-mono">
                              {finalGradingFee.toLocaleString()} ¥
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-mono text-zinc-400">Your Yen</span>
                            <div className="text-sm font-bold text-zinc-200 font-mono">
                              {yen.toLocaleString()} ¥
                            </div>
                          </div>
                        </div>

                        {/* Consumable Tools Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                              Consumable Lab Buffs
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Stardust balance: {stardust.toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {(['microfiber_cloth', 'centering_laser', 'vault_insurance'] as ConsumableToolId[]).map((toolId) => {
                              const toolDef = CONSUMABLE_TOOLS[toolId];
                              const count = tools[toolId] ?? 0;
                              const isSelected = selectedTools.has(toolId);
                              const canBuy = stardust >= toolDef.stardustCost;

                              return (
                                <div
                                  key={toolId}
                                  onClick={() => count > 0 && toggleTool(toolId)}
                                  className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/10'
                                      : count > 0
                                      ? 'bg-zinc-900/80 border-white/10 hover:border-white/20'
                                      : 'bg-zinc-950/40 border-white/5 opacity-60'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-xs text-zinc-200 truncate">
                                        {toolDef.name}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                                    </div>
                                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                                      {toolDef.description}
                                    </p>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                                    <span className={count > 0 ? 'text-amber-300 font-bold' : 'text-zinc-500'}>
                                      Owned: {count}
                                    </span>
                                    {count === 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickBuyTool(toolId);
                                        }}
                                        disabled={!canBuy}
                                        className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40 disabled:opacity-40"
                                      >
                                        Buy ({toolDef.stardustCost})
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Grading Action Trigger */}
                        <div className="pt-2">
                          <button
                            onClick={handleGradeInVault}
                            disabled={!canAffordGrading || isGrading}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-sm uppercase tracking-widest transition active:scale-[0.98] shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                          >
                            <Award className="w-5 h-5" />
                            <span>{isGrading ? 'Grading In Vault...' : 'GRADE IN VAULT'}</span>
                          </button>
                          {!canAffordGrading && (
                            <p className="text-[11px] text-red-400 text-center mt-2 font-mono">
                              Insufficient Yen. Need {(finalGradingFee - yen).toLocaleString()} ¥ more.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    TAB 2: ACTION 2 - VAPORIZE DUST
                    ============================================================ */}
                {activeTab === 'vaporize' && (
                  <div className="space-y-4">
                    {isSlabbed ? (
                      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                        <h4 className="font-bold text-sm text-white">Graded Cards Cannot Be Vaporized</h4>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                          Once encapsulated in an acrylic slab, cards are permanently certified and protected from recycling.
                        </p>
                      </div>
                    ) : confirmingVaporize ? (
                      <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 text-center space-y-4 animate-fadeIn">
                        <Flame className="w-10 h-10 text-red-400 mx-auto animate-pulse" />
                        <div>
                          <h4 className="font-black text-base text-red-300">CONFIRM CARD VAPORIZATION</h4>
                          <p className="text-xs text-zinc-300 mt-1 max-w-sm mx-auto">
                            Are you sure you want to permanently dissolve this card? You will receive{' '}
                            <span className="font-bold text-cyan-400 font-mono">{finalDustYield} Stardust</span>. This action cannot be undone.
                          </p>
                        </div>

                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => setConfirmingVaporize(false)}
                            disabled={isVaporizing}
                            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
                          >
                            Cancel
                          </button>

                          <button
                            onClick={handleExecuteVaporize}
                            disabled={isVaporizing}
                            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-600/30 flex items-center gap-2"
                          >
                            <Flame className="w-4 h-4" />
                            <span>{isVaporizing ? 'Dissolving...' : 'Confirm Vaporization'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-cyan-400">Recycle Value</span>
                            <div className="text-xl font-black text-cyan-300 font-mono flex items-center gap-1.5">
                              <Sparkles className="w-5 h-5 text-cyan-400" />
                              <span>{finalDustYield} Stardust</span>
                            </div>
                          </div>
                          {hasMaruoSupport && (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-bold font-mono">
                              +20% Maruo Bonus
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Vaporizing this raw card converts its physical cellulose and holographic foil into pure Stardust.
                          Stardust is used in the workshop to purchase consumable grading tools.
                        </p>

                        <button
                          onClick={() => setConfirmingVaporize(true)}
                          className="w-full py-3.5 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-black text-sm uppercase tracking-widest transition active:scale-[0.98] shadow-lg shadow-[#8B5CF6]/25 flex items-center justify-center gap-2"
                        >
                          <Flame className="w-5 h-5" />
                          <span>VAPORIZE DUST</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    TAB 3: ACTION 4 - DOSSIER
                    ============================================================ */}
                {activeTab === 'dossier' && (
                  <div className="space-y-4">
                    {/* Lore Quote */}
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 relative">
                      <span className="text-2xl text-amber-500/40 font-serif absolute top-2 left-3">“</span>
                      <p className="text-xs italic text-zinc-200 pl-4 pr-2 font-serif leading-relaxed">
                        {cardDef.loreQuote}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase">Character Role</span>
                        <div className="font-bold text-zinc-200 capitalize mt-0.5">{cardDef.characterRole}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase">Card Number</span>
                        <div className="font-bold text-zinc-200 mt-0.5">{cardDef.cardNumber}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase">Release Set</span>
                        <div className="font-bold text-zinc-200 mt-0.5">Vol. 1: Quintessential Vault</div>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase">Circulation Pop</span>
                        <div className="font-bold text-amber-300 mt-0.5">
                          {activeCard.grade?.isBlackLabel ? 'POP 1 OF 1' : activeCard.grade?.numericGrade === 10 ? 'POP 42' : 'POP 189'}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {cardDef.description}
                    </p>
                  </div>
                )}

                {/* Bottom Inspect Quick Button */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-mono">ID: {activeCard.id.slice(0, 12)}...</span>
                  <button
                    onClick={() => setIsInspectMode(true)}
                    className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Full 3D Inspector</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          HIGH-RARITY CAUTIONARY SHAKE DIALOG GUARDRAIL
          ============================================================ */}
      <AnimatePresence>
        {confirmingSell && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none"
            onClick={() => setConfirmingSell(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: [-10, 10, -8, 8, -4, 4, 0],
              }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#140e14] border-2 border-red-500/70 shadow-[0_0_60px_rgba(239,68,68,0.4)] text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-red-400 font-mono">
                  High-Rarity Guardrail
                </h3>
                <p className="text-xs text-zinc-200 mt-2 leading-relaxed">
                  Warning: This card is extremely rare. Confirm liquidation for{' '}
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {sellValue.toLocaleString()} ¥
                  </span>
                  ?
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2 font-mono">
                <button
                  onClick={() => setConfirmingSell(false)}
                  disabled={isSelling}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteSell}
                  disabled={isSelling}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-zinc-950 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/30 flex items-center gap-1.5"
                >
                  <Coins className="w-4 h-4" />
                  <span>{isSelling ? 'Selling...' : 'Confirm Liquidation'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          GOLDEN COIN PARTICLE BURST ANIMATION
          ============================================================ */}
      {coinParticles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
          {coinParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: p.x, y: p.y, scale: p.scale, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: p.targetX,
                y: p.targetY,
                scale: [p.scale, p.scale * 1.3, 0.4],
                rotate: p.rotation,
              }}
              transition={{ duration: 0.85, delay: p.delay, ease: 'easeOut' }}
              className="absolute flex items-center justify-center text-amber-950 font-black font-mono text-xs rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.9)] border border-yellow-200"
              style={{ width: 22, height: 22 }}
            >
              ¥
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardActionModal;
