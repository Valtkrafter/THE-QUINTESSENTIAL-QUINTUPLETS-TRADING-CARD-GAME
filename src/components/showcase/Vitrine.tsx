'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, CharacterId, Rarity, SisterId } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { useIdleRevenue } from '../../hooks/useIdleRevenue';
import { calculateCardMarketValue, FINISH_MULTIPLIERS, GRADE_TIER_CONFIG } from '../../config/economy';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer, CHARACTER_THEMES } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  Coins,
  Sparkles,
  Award,
  TrendingUp,
  Plus,
  X,
  Search,
  Check,
  Zap,
  Shield,
  Layers,
  Flame,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  RotateCcw,
} from 'lucide-react';

// Signature spotlight colors per sister and support
export const SPOTLIGHT_COLORS: Record<string, { hex: string; rgb: string; glow: string }> = {
  ichika: { hex: '#F59E0B', rgb: '245, 158, 11', glow: 'rgba(245, 158, 11, 0.4)' },
  nino: { hex: '#EC4899', rgb: '236, 72, 153', glow: 'rgba(236, 72, 153, 0.4)' },
  miku: { hex: '#06B6D4', rgb: '6, 182, 212', glow: 'rgba(6, 182, 212, 0.4)' },
  yotsuba: { hex: '#10B981', rgb: '16, 185, 129', glow: 'rgba(16, 185, 129, 0.4)' },
  itsuki: { hex: '#EF4444', rgb: '239, 68, 68', glow: 'rgba(239, 68, 68, 0.4)' },
  support: { hex: '#8B5CF6', rgb: '139, 92, 246', glow: 'rgba(139, 92, 246, 0.4)' },
  empty: { hex: '#475569', rgb: '71, 85, 105', glow: 'rgba(71, 85, 105, 0.15)' },
};

// 3D semi-circle pedestal stage configurations (angles & depth, 1:1 native pixel rendering)
const PEDESTAL_CONFIGS = [
  { index: 0, rotateY: 20, translateZ: -30, translateX: -12 },
  { index: 1, rotateY: 10, translateZ: -10, translateX: -4 },
  { index: 2, rotateY: 0, translateZ: 20, translateX: 0 }, // Center Hero
  { index: 3, rotateY: -10, translateZ: -10, translateX: 4 },
  { index: 4, rotateY: -20, translateZ: -30, translateX: 12 },
];

export const Vitrine: React.FC = () => {
  const inventory = useGameStore((state) => state.inventory);
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const slotShowcaseCard = useGameStore((state) => state.slotShowcaseCard);

  // High-performance idle revenue hook with 12h offline protection
  const {
    accruedYen,
    yieldPerMinute,
    yieldPerSecond,
    synergyReport,
    isMaxOfflineReached,
    offlineHoursAccrued,
    claimRevenue,
  } = useIdleRevenue();

  // Socketing Drawer State
  const [selectedPedestalIndex, setSelectedPedestalIndex] = useState<number | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState<string>('');
  const [drawerTab, setDrawerTab] = useState<'all' | 'slabs' | 'raw' | 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki' | 'support'>('all');

  // Claim celebration particles
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimParticles, setClaimParticles] = useState<
    Array<{ id: number; x: number; y: number; scale: number }>
  >([]);

  // Map of slotted cards for fast resolution
  const inventoryMap = useMemo(() => {
    const map = new Map<string, CardInstance>();
    for (const card of inventory) {
      map.set(card.id, card);
    }
    return map;
  }, [inventory]);

  const slottedCards = useMemo(() => {
    return showcaseSlots.map((slot) => {
      return slot.cardInstanceId ? inventoryMap.get(slot.cardInstanceId) ?? null : null;
    });
  }, [showcaseSlots, inventoryMap]);

  // Set of card instance IDs already mounted in showcase
  const slottedCardIds = useMemo(() => {
    const set = new Set<string>();
    for (const slot of showcaseSlots) {
      if (slot.cardInstanceId) set.add(slot.cardInstanceId);
    }
    return set;
  }, [showcaseSlots]);

  // Candidate cards for the Socketing Drawer
  const drawerCandidateCards = useMemo(() => {
    let result = inventory.filter((card) => {
      // Allow cards that are already in the currently opened slot (so user can see current occupant)
      // but filter out cards socketed in OTHER showcase slots
      const currentSlotCardId = selectedPedestalIndex !== null ? showcaseSlots[selectedPedestalIndex]?.cardInstanceId : null;
      if (card.id !== currentSlotCardId && slottedCardIds.has(card.id)) {
        return false;
      }
      return true;
    });

    // Apply Filter Tabs
    if (drawerTab === 'slabs') {
      result = result.filter((c) => !!c.grade);
    } else if (drawerTab === 'raw') {
      result = result.filter((c) => !c.grade);
    } else if (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(drawerTab)) {
      result = result.filter((c) => c.characterId === drawerTab);
    } else if (drawerTab === 'support') {
      result = result.filter((c) => !['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'].includes(c.characterId));
    }

    // Apply Search
    if (drawerSearchQuery.trim()) {
      const q = drawerSearchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.cardNumber && c.cardNumber.toLowerCase().includes(q)) ||
          c.characterId.toLowerCase().includes(q) ||
          c.rarity.toLowerCase().includes(q)
      );
    }

    // Default sort: highest market value first
    result.sort((a, b) => calculateCardMarketValue(b) - calculateCardMarketValue(a));

    return result;
  }, [inventory, drawerTab, drawerSearchQuery, showcaseSlots, selectedPedestalIndex, slottedCardIds]);

  // Handle Mount Card
  const handleMountCard = (card: CardInstance) => {
    if (selectedPedestalIndex === null) return;
    try {
      slotShowcaseCard(selectedPedestalIndex, card.id);
      soundEngine.playFoilRustle();
      setSelectedPedestalIndex(null);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Handle Unmount Card
  const handleUnmountCard = (slotIndex: number) => {
    try {
      slotShowcaseCard(slotIndex, null);
      soundEngine.playFoilRustle();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Handle Claim Vault Revenue
  const handleClaimRevenue = () => {
    if (accruedYen <= 0 || isClaiming) return;
    setIsClaiming(true);

    // Generate celebratory golden particles
    const particles = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 260,
      y: (Math.random() - 0.5) * 160 - 40,
      scale: 0.6 + Math.random() * 0.8,
    }));
    setClaimParticles(particles);

    const claimed = claimRevenue();

    setTimeout(() => {
      setIsClaiming(false);
      setClaimParticles([]);
    }, 1800);
  };

  return (
    <div className="relative w-full h-full bg-[#08080a] text-zinc-100 flex flex-col select-none overflow-hidden font-sans">
      {/* ============================================================
          TOP NEON REVENUE TICKER & SYNERGY STATUS BAR
          ============================================================ */}
      <div className="shrink-0 w-full px-6 py-4 border-b border-white/10 relative z-20 shadow-xl overflow-hidden">
        {/* Isolated blurred background */}
        <div className="absolute inset-0 bg-[#0c0c12]/90 backdrop-blur-md pointer-events-none select-none" />
        <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Vault Stats & Live Revenue */}
        <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-zinc-950 font-black text-lg shadow-[0_0_20px_rgba(245,158,11,0.5)] crisp-render">
              5
            </div>
            <div className="crisp-render">
              <h2 className="text-sm font-black tracking-wider text-white uppercase font-mono flex items-center gap-2">
                <span>The Acrylic Showcase</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  VITRINE
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-0.5">
                <span>Vault Valuation:</span>
                <span className="font-bold text-amber-300">
                  ¥ {synergyReport.totalMarketValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          {/* Real-Time Idle Yield Stats */}
          <div className="flex flex-col font-mono">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Idle Yield Rate</span>
            </div>
            <div className="text-sm font-black text-emerald-400 flex items-center gap-1">
              <span>+{synergyReport.effectiveYieldPerMinute.toFixed(1)} ¥/min</span>
              <span className="text-[10px] text-zinc-500 font-normal">
                ({synergyReport.effectiveYieldPerSecond.toFixed(2)}/s)
              </span>
            </div>
          </div>
        </div>

        {/* Center: Active Synergy Badges */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* 1. Quintuplet Harmony Badge (+50%) */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap ${
              synergyReport.quintupletHarmony
                ? 'bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
            title="Socket all 5 sisters (Ichika, Nino, Miku, Yotsuba, Itsuki) for +50% Yield"
          >
            <span>🌸</span>
            <span>Quintuplet Harmony</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-black/40">
              +50%
            </span>
          </div>

          {/* 2. Mono-Waifu Obsession Badge (+30%) */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap ${
              synergyReport.monoWaifu
                ? 'bg-pink-500/20 border-pink-400/80 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
            title="Socket 5 copies of the same sister for +30% Yield"
          >
            <span>💖</span>
            <span>Mono-Waifu</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-black/40">
              +30%
            </span>
          </div>

          {/* 3. Vault Excellence Badge (+100%) */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap ${
              synergyReport.vaultExcellence
                ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
            title="Socket 5 certified acrylic Slabs with Grade >= 9 for +100% Yield"
          >
            <span>💎</span>
            <span>Vault Excellence</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-black/40">
              +100%
            </span>
          </div>
        </div>

        {/* Right: Pulsating Neon Revenue Counter & Claim Button */}
        <div className="relative flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex flex-col items-end font-mono">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Uncollected Vault Revenue</span>
              {isMaxOfflineReached && (
                <span className="text-[9px] text-amber-400 font-bold">(12h Cap)</span>
              )}
            </span>
            <span className="text-lg font-black text-amber-400 tracking-tight">
              {accruedYen.toLocaleString()} ¥
            </span>
          </div>

          <button
            onClick={handleClaimRevenue}
            disabled={accruedYen <= 0 || isClaiming}
            className={`relative px-5 py-2.5 rounded-2xl font-mono font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg flex items-center gap-2 overflow-hidden ${
              accruedYen > 0
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 hover:brightness-110 shadow-amber-500/30 active:scale-95 cursor-pointer animate-pulse'
                : 'bg-zinc-800/80 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <Coins className="w-4 h-4 text-zinc-950" />
            <span>Claim Revenue</span>

            {/* Golden sweep effect */}
            {accruedYen > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-shimmer pointer-events-none" />
            )}
          </button>

          {/* Floating Coin Particles FX on Claim */}
          {claimParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: p.scale }}
              animate={{
                opacity: 0,
                x: p.x,
                y: p.y - 60,
                scale: p.scale * 1.3,
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute right-12 top-2 pointer-events-none z-50 text-amber-300 font-black font-mono flex items-center gap-1 text-sm shadow-md"
            >
              <Coins className="w-4 h-4 text-yellow-300" />
              <span>+{Math.round(accruedYen / claimParticles.length || 10)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>

      {/* ============================================================
          MAIN 3D SEMI-CIRCULAR VITRINE STAGE
          ============================================================ */}
      <div className="relative flex-1 w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden pointer-events-none">
        {/* Atmospheric background spotlights & ceiling rig */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 via-zinc-950/40 to-transparent pointer-events-none select-none z-10" />

        {/* Vitrine Obsidian Floor Grid & Ambient Reflection */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black via-[#0c0c12] to-transparent pointer-events-none select-none" />
        <div className="absolute bottom-10 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none select-none" />

        {/* 3D Semi-Circular Container */}
        <div
          className="relative w-full max-w-7xl h-[560px] md:h-[600px] lg:h-[640px] flex items-center justify-center pointer-events-none select-none"
          style={{
            perspective: 1200,
            perspectiveOrigin: '50% 40%',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="grid grid-cols-5 gap-3 sm:gap-6 w-full h-full items-end justify-items-center pb-4 pointer-events-none select-none">
            {PEDESTAL_CONFIGS.map((config) => {
              const slot = showcaseSlots[config.index];
              const card = slottedCards[config.index];
              const characterId = card?.characterId || (config.index < 5 ? (['ichika', 'nino', 'miku', 'yotsuba', 'itsuki'][config.index] as CharacterId) : 'support');
              const themeColorKey = card ? (card.characterId in SPOTLIGHT_COLORS ? card.characterId : 'support') : 'empty';
              const spotlight = SPOTLIGHT_COLORS[themeColorKey] ?? SPOTLIGHT_COLORS.empty;

              return (
                <div
                  key={config.index}
                  className="relative flex flex-col items-center justify-end h-full w-[220px] max-w-full transition-transform duration-500 pointer-events-none select-none"
                  style={{
                    transform: `rotateY(${config.rotateY}deg) translateZ(${config.translateZ}px) translateX(${config.translateX}px)`,
                    transformStyle: 'flat',
                  }}
                >
                  {/* Dynamic Overhead Conical Spotlight */}
                  <div
                    className="absolute -top-20 inset-x-0 h-[480px] pointer-events-none select-none transition-all duration-700 opacity-60"
                    style={{
                      background: `conic-gradient(from 180deg at 50% 0%, transparent 65deg, ${spotlight.glow} 85deg, ${spotlight.glow} 95deg, transparent 115deg)`,
                      filter: 'blur(20px)',
                    }}
                  />

                  {/* Ceiling Lamp Fixture */}
                  <div
                    className="w-12 h-2.5 rounded-full border border-white/20 mb-3 z-10 transition-colors duration-700 shadow-lg pointer-events-none select-none"
                    style={{
                      backgroundColor: card ? spotlight.hex : '#27272a',
                      boxShadow: card ? `0 0 15px ${spotlight.hex}` : 'none',
                    }}
                  />

                  {/* Pedestal Card Mount Slot */}
                  <div
                    className="relative w-[220px] max-w-full flex items-center justify-center transition-all duration-300 z-20 pointer-events-auto"
                    style={{
                      transform: 'translateZ(20px)',
                    }}
                  >
                    {card ? (
                      /* Socketed Card View (GradingSlab or CardRenderer) */
                      <div className="relative group w-full rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center pointer-events-auto">
                        {card.grade ? (
                          <GradingSlab
                            card={card}
                            interactive={false}
                            size="full"
                            className="w-full pointer-events-none select-none !p-0 !m-0"
                            showMarketValue={false}
                            showcaseMode={true}
                          />
                        ) : (
                          <CardRenderer
                            card={card}
                            interactive={false}
                            disableTilt={true}
                            size="full"
                            className="w-full pointer-events-none select-none !p-0 !m-0"
                            showMarketValue={false}
                            hideInternalFooter={true}
                          />
                        )}

                        {/* Pedestal Glass Edge Glow */}
                        <div
                          className="absolute inset-0 rounded-2xl border-2 pointer-events-none select-none transition-colors duration-700 z-20"
                          style={{
                            borderColor: spotlight.hex,
                            boxShadow: `0 0 20px ${spotlight.glow}`,
                          }}
                        />

                        {/* Interactive Hover Overlay Anchor */}
                        <div className="absolute inset-0 z-30 pointer-events-auto w-full h-full rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 select-none overflow-hidden">
                          {/* Isolated backdrop blur layer */}
                          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-2xl pointer-events-none" />

                          <div className="relative z-10 flex flex-col items-center justify-center gap-2 w-full crisp-render">
                            <span className="text-amber-400 font-bold text-sm tracking-wide text-center leading-tight font-mono">
                              {card.name || 'Card'}
                            </span>
                            <span className="text-xs text-white/70 font-mono">
                              ¥ {calculateCardMarketValue(card).toLocaleString()}
                            </span>

                            <div className="flex gap-2 mt-1 z-40">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPedestalIndex(config.index);
                                }}
                                className="pointer-events-auto z-40 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-3 py-1.5 rounded-lg shadow-md font-mono transition-colors cursor-pointer"
                              >
                                Swap
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnmountCard(config.index);
                                }}
                                className="pointer-events-auto z-40 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3 py-1.5 rounded-lg border border-white/10 font-mono transition-colors cursor-pointer"
                              >
                                Unmount
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty Pedestal Slot Placeholder */
                      <div
                        onClick={() => setSelectedPedestalIndex(config.index)}
                        className="relative w-full aspect-[63/88] rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400/70 overflow-hidden flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] cursor-pointer pointer-events-auto group"
                      >
                        {/* Isolated backdrop blur layer */}
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 backdrop-blur-sm pointer-events-none transition-colors duration-300" />

                        <div className="relative z-10 flex flex-col items-center justify-center gap-3 crisp-render">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 group-hover:bg-amber-500/20 border border-white/20 group-hover:border-amber-400/50 flex items-center justify-center text-zinc-400 group-hover:text-amber-300 transition-colors pointer-events-none select-none">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div className="text-center pointer-events-none select-none">
                            <span className="text-xs font-mono font-bold text-zinc-300 group-hover:text-amber-200 block">
                              Mount Card
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              Slot 0{config.index + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acrylic Pedestal Base Block */}
                  <div className="relative w-[220px] max-w-full h-14 mt-3 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center justify-center z-10 overflow-hidden pointer-events-none select-none">
                    {/* Isolated backdrop blur layer */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/5 to-white/0 backdrop-blur-md pointer-events-none select-none" />

                    {/* Acrylic Top Rim Reflection */}
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none select-none" />

                    <div className="relative z-10 flex flex-col items-center justify-center crisp-render">
                      {/* Pedestal Label Badge */}
                      <div className="flex items-center gap-1.5 pointer-events-none select-none">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: card ? spotlight.hex : '#71717a' }}
                        />
                        <span className="text-[11px] font-mono font-black tracking-wider text-zinc-200 uppercase">
                          Pedestal 0{config.index + 1}
                        </span>
                      </div>

                      {/* Pedestal Sister Attribution or Value */}
                      <span className="text-[10px] font-mono text-zinc-400 mt-0.5 pointer-events-none select-none">
                        {card ? (
                          <span className="text-amber-300 font-semibold">
                            +{((60 + calculateCardMarketValue(card) * 0.0002) * synergyReport.synergyMultiplier).toFixed(1)} ¥/min
                          </span>
                        ) : (
                          <span className="text-zinc-500">Vacant</span>
                        )}
                      </span>
                    </div>

                    {/* Ground Pedestal Light Pool */}
                    <div
                      className="absolute -bottom-4 inset-x-0 h-8 blur-md pointer-events-none select-none transition-colors duration-700"
                      style={{ backgroundColor: spotlight.glow }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          SOCKETING DRAWER MODAL
          ============================================================ */}
      <AnimatePresence>
        {selectedPedestalIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedPedestalIndex(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-xl h-full bg-[#0e0e14] border-l border-white/10 shadow-2xl flex flex-col z-50 select-none overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/60 shrink-0">
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
                  onClick={() => setSelectedPedestalIndex(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Filter & Search Bar */}
              <div className="p-4 border-b border-white/5 bg-zinc-950/30 flex flex-col gap-3 shrink-0">
                {/* Search Input */}
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={drawerSearchQuery}
                    onChange={(e) => setDrawerSearchQuery(e.target.value)}
                    placeholder="Search collection by name, rarity, or sister..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 font-mono"
                  />
                  {drawerSearchQuery && (
                    <button
                      onClick={() => setDrawerSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {(['all', 'slabs', 'raw', 'ichika', 'nino', 'miku', 'yotsuba', 'itsuki', 'support'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDrawerTab(tab)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition capitalize whitespace-nowrap ${
                        drawerTab === tab
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
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {drawerCandidateCards.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <Layers className="w-12 h-12 text-zinc-600 mb-3" />
                    <h4 className="text-sm font-black text-white font-mono uppercase">
                      No Available Cards Found
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs font-mono">
                      Try changing your filter tabs or crack open booster packs to collect more cards.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-12">
                    {drawerCandidateCards.map((card) => {
                      const marketValue = calculateCardMarketValue(card);
                      const isAlreadyInThisSlot = showcaseSlots[selectedPedestalIndex]?.cardInstanceId === card.id;

                      return (
                        <div
                          key={card.id}
                          onClick={() => handleMountCard(card)}
                          className={`group relative flex flex-col rounded-2xl p-2.5 transition-all duration-200 cursor-pointer border ${
                            isAlreadyInThisSlot
                              ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                              : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/10 hover:border-amber-400/50 hover:scale-[1.02]'
                          }`}
                        >
                          {/* Card Preview Aspect Ratio */}
                          <div className={`w-full ${card.grade ? 'aspect-[82/130]' : 'aspect-[63/88]'} relative rounded-xl overflow-hidden mb-2 flex items-center justify-center`}>
                            {card.grade ? (
                              <GradingSlab
                                card={card}
                                interactive={false}
                                size="full"
                                className="w-full h-full pointer-events-none select-none !p-0 !m-0"
                                showMarketValue={false}
                              />
                            ) : (
                              <CardRenderer
                                card={card}
                                interactive={false}
                                disableTilt={true}
                                size="full"
                                className="w-full h-full pointer-events-none select-none !p-0 !m-0"
                                showMarketValue={false}
                                hideInternalFooter={true}
                              />
                            )}

                            {/* Active Slot Occupant Badge */}
                            {isAlreadyInThisSlot && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] font-mono z-30 shadow">
                                Current
                              </div>
                            )}
                          </div>

                          {/* Metadata Details */}
                          <div className="flex flex-col gap-1 font-mono text-xs">
                            <span className="font-bold text-white truncate text-[11px]">
                              {card.name || 'Card'}
                            </span>

                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-amber-300 font-bold">
                                ¥ {marketValue.toLocaleString()}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                                {card.grade ? `Grade ${card.grade.numericGrade}` : card.rarity}
                              </span>
                            </div>

                            {/* Mount Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMountCard(card);
                              }}
                              className={`mt-1.5 w-full py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition ${
                                isAlreadyInThisSlot
                                  ? 'bg-zinc-800 text-zinc-400 cursor-default'
                                  : 'bg-amber-500 group-hover:bg-amber-400 text-zinc-950 shadow-md'
                              }`}
                            >
                              {isAlreadyInThisSlot ? 'Socketed' : 'Mount to Vitrine'}
                            </button>
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
    </div>
  );
};

export default Vitrine;
