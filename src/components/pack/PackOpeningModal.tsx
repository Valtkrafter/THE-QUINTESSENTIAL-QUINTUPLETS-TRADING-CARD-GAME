'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, PanInfo } from 'framer-motion';
import { CardInstance, PackId, Rarity } from '../../types/card';
import { PACKS_CONFIG, calculateCardMarketValue } from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { BoosterPack3D, PACK_THEMES } from './BoosterPack3D';
import { TearMechanism } from './TearMechanism';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Zap,
  ArrowRight,
} from 'lucide-react';

export interface PackOpeningModalProps {
  isOpen: boolean;
  packId: PackId;
  onClose: () => void;
  onOpenAnother?: (packId: PackId) => void;
}

type CeremonyStage = 'INSPECT' | 'ANTICIPATING' | 'PEELING' | 'SUMMARY';

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  isOpen,
  packId,
  onClose,
  onOpenAnother,
}) => {
  const [stage, setStage] = useState<CeremonyStage>('INSPECT');
  const [pulledCards, setPulledCards] = useState<CardInstance[]>([]);
  const [isGodPack, setIsGodPack] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [tearProgress, setTearProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [dustedCardIds, setDustedCardIds] = useState<string[]>([]);
  const [dustToast, setDustToast] = useState<number | null>(null);

  // Top card swipe state
  const [isDiscarding, setIsDiscarding] = useState(false);
  const topCardX = useMotionValue(0);
  const topCardRotate = useMotionValue(0);

  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const openPackStore = useGameStore((state) => state.openPack);
  const dustCardStore = useGameStore((state) => state.dustCard);

  const packConfig = PACKS_CONFIG[packId];
  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;

  // Initialize and reset ceremony state
  useEffect(() => {
    if (isOpen) {
      setStage('INSPECT');
      setPulledCards([]);
      setIsGodPack(false);
      setCurrentCardIndex(0);
      setTearProgress(0);
      setIsDragging(false);
      setIsShaking(false);
      setIsDiscarding(false);
      topCardX.set(0);
      topCardRotate.set(0);
      setDustedCardIds([]);
      setDustToast(null);
      setIsMuted(soundEngine.isMuted());
    }
  }, [isOpen, packId, topCardRotate, topCardX]);

  // Highest rarity in pulled cards to determine pack anticipation intensity
  const packPeakRarity = useMemo<Rarity>(() => {
    if (!pulledCards.length) return 'C';
    const hierarchy: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, UR: 5, SEC: 6, MR: 7 };
    let highest: Rarity = 'C';
    for (const c of pulledCards) {
      if (hierarchy[c.rarity] > hierarchy[highest]) {
        highest = c.rarity;
      }
    }
    return highest;
  }, [pulledCards]);

  // Handle Tear Complete: triggers atomic store pull and begins suspense sequence
  const handleTearComplete = useCallback(() => {
    setIsDragging(false);
    setIsShaking(true);
    setStage('ANTICIPATING');

    try {
      // Execute atomic pack opening in Zustand store
      const result = openPackStore(packId);
      setPulledCards(result.cards);
      setIsGodPack(result.isGodPack);

      // Determine highest rarity for anticipation sound
      const hierarchy: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, UR: 5, SEC: 6, MR: 7 };
      let highest: Rarity = 'C';
      for (const c of result.cards) {
        if (hierarchy[c.rarity] > hierarchy[highest]) {
          highest = c.rarity;
        }
      }

      // Play anticipation rumble based on rarity tier
      if (result.isGodPack) {
        soundEngine.playSparkleSound();
        soundEngine.playRevealSound('MR', true);
      } else if (highest === 'MR' || highest === 'SEC' || highest === 'UR') {
        soundEngine.playAnticipationSound(highest);
      } else if (highest === 'SR') {
        soundEngine.playAnticipationSound('SR');
      }

      // Shake settles after 450ms
      setTimeout(() => {
        setIsShaking(false);
      }, 450);

      // Transition into Peeling phase after suspense beat
      const anticipationDuration = result.isGodPack
        ? 1200
        : (highest === 'MR' || highest === 'SEC' || highest === 'UR')
        ? 950
        : 650;

      setTimeout(() => {
        setStage('PEELING');
        setCurrentCardIndex(0);
        topCardX.set(0);
        topCardRotate.set(0);
        setIsDiscarding(false);
      }, anticipationDuration);
    } catch (err) {
      console.error('Failed to open pack:', err);
      setIsShaking(false);
      onClose();
    }
  }, [openPackStore, packId, onClose, topCardRotate, topCardX]);

  // Fast-track instant open button
  const handleInstantOpen = useCallback(() => {
    setTearProgress(100);
    soundEngine.playTearSound();
    handleTearComplete();
  }, [handleTearComplete]);

  // Discard the active top card with horizontal swoosh to the right
  const discardTopCard = useCallback(() => {
    if (isDiscarding) return;
    setIsDiscarding(true);

    // Audio cue for card slide
    soundEngine.playFoilRustle();

    // Swoosh animation to the right: x -> 550, rotate -> 14
    animate(topCardX, 550, { duration: 0.22, ease: 'easeIn' });
    animate(topCardRotate, 14, { duration: 0.22, ease: 'easeIn' });

    setTimeout(() => {
      topCardX.set(0);
      topCardRotate.set(0);
      setIsDiscarding(false);

      const nextIndex = currentCardIndex + 1;
      if (nextIndex >= pulledCards.length) {
        setStage('SUMMARY');
        soundEngine.playSparkleSound();
      } else {
        setCurrentCardIndex(nextIndex);
        const nextCard = pulledCards[nextIndex];
        if (
          nextCard &&
          (nextCard.rarity === 'SR' ||
            nextCard.rarity === 'UR' ||
            nextCard.rarity === 'SEC' ||
            nextCard.rarity === 'MR')
        ) {
          soundEngine.playAnticipationSound(nextCard.rarity);
        }
      }
    }, 230);
  }, [currentCardIndex, isDiscarding, pulledCards, topCardRotate, topCardX]);

  // Handle right-swipe drag end on the top card
  const handleTopCardDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isDiscarding) return;

      // Discard threshold: dragged > 110px or velocity > 250px/s to the right
      if (info.offset.x > 110 || info.velocity.x > 250) {
        discardTopCard();
      } else {
        // Spring back to (0, 0)
        animate(topCardX, 0, {
          type: 'spring',
          stiffness: 200,
          damping: 20,
        });
        animate(topCardRotate, 0, {
          type: 'spring',
          stiffness: 200,
          damping: 20,
        });
      }
    },
    [discardTopCard, isDiscarding, topCardRotate, topCardX]
  );

  // Reveal all cards instantly (Skip to Summary)
  const handleRevealAll = useCallback(() => {
    setStage('SUMMARY');
    soundEngine.playSparkleSound();
  }, []);

  // Quick Dust non-rares (C & UC)
  const handleQuickDustNonRares = useCallback(() => {
    const nonRares = pulledCards.filter(
      (c) => (c.rarity === 'C' || c.rarity === 'UC') && !dustedCardIds.includes(c.id)
    );

    if (nonRares.length === 0) return;

    let totalDustGained = 0;
    const newDustedIds: string[] = [...dustedCardIds];

    for (const card of nonRares) {
      const gained = dustCardStore(card.id);
      totalDustGained += gained;
      newDustedIds.push(card.id);
    }

    setDustedCardIds(newDustedIds);
    setDustToast(totalDustGained);
    soundEngine.playSparkleSound();

    setTimeout(() => {
      setDustToast(null);
    }, 3000);
  }, [dustCardStore, dustedCardIds, pulledCards]);

  // Active top card
  const activeCard: CardInstance | undefined = pulledCards[currentCardIndex];

  // Card-specific anticipation tell for top card
  const cardAnticipationTell = useMemo(() => {
    if (!activeCard || stage !== 'PEELING') return null;
    if (isGodPack) return 'GOD_PACK';
    if (activeCard.rarity === 'MR' || activeCard.rarity === 'SEC' || activeCard.rarity === 'UR') {
      return 'ULTRA';
    }
    if (activeCard.rarity === 'SR') return 'SUPER';
    return null;
  }, [activeCard, isGodPack, stage]);

  const totalPackMarketValue = useMemo(() => {
    return pulledCards.reduce((acc, c) => acc + calculateCardMarketValue(c), 0);
  }, [pulledCards]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-2xl select-none overflow-hidden animate-fadeIn">
      {/* Dynamic Screen Shake on Tear / High Impact */}
      <div
        className={`w-full h-full flex flex-col items-center justify-between p-3 sm:p-5 transition-transform duration-100 ${
          isShaking ? 'translate-x-1.5 -translate-y-1 scale-[1.015]' : ''
        }`}
      >
        {/* ============================================================
            CEREMONY TOP BAR: Player Balances, Pack Stage & Controls
            ============================================================ */}
        <header className="w-full max-w-5xl flex items-center justify-between z-40">
          {/* Player Currency Counters */}
          <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-white/10 px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 font-mono">
              <span className="text-[10px] text-amber-500 font-bold">¥</span>
              <span>{yen.toLocaleString()}</span>
            </div>
            <div className="w-px h-3 bg-zinc-700" />
            <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400 font-mono">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{stardust.toLocaleString()}</span>
            </div>
          </div>

          {/* Pack Ceremonial Stage Title */}
          <div className="text-center hidden sm:flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{theme.motifIcon}</span>
              <h2 className="text-xs font-black tracking-widest uppercase text-zinc-200">
                {theme.name}
              </h2>
            </div>
            <span className="text-[10px] text-amber-400 font-mono tracking-wider font-semibold">
              {stage === 'INSPECT' && 'DRAG YELLOW NOTCH RIGHT TO TEAR'}
              {stage === 'ANTICIPATING' && (isGodPack ? '★ GOD PACK DESCENDING ★' : 'BREACHING FOIL SEAL...')}
              {stage === 'PEELING' && `CARD ${currentCardIndex + 1} OF ${pulledCards.length} • SWIPE RIGHT TO PEEL`}
              {stage === 'SUMMARY' && 'PACK OPENING COMPLETED'}
            </span>
          </div>

          {/* Controls: Audio Mute & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const muted = soundEngine.toggleMute();
                setIsMuted(muted);
              }}
              className="p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition shadow"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition shadow"
              title="Close Pack Ceremony"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ============================================================
            STAGE 1: INSPECT & ISOLATED TEAR NOTCH GESTURE
            ============================================================ */}
        {stage === 'INSPECT' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full relative z-20 my-auto">
            {/* 3D Floating Booster Pack with Mounted Tear Notch */}
            <div className="relative">
              <BoosterPack3D
                packId={packId}
                interactive={true}
                isFloating={!isDragging}
                tearProgress={tearProgress}
                disableTilt={false}
                isPaused={isDragging}
              >
                {/* Isolated Tear Mechanism mounted on upper perforation seam */}
                <TearMechanism
                  packWidth={320}
                  onTearProgress={(progress) => setTearProgress(progress)}
                  onTearComplete={handleTearComplete}
                  onDragStateChange={(dragging) => setIsDragging(dragging)}
                  accentColor={theme.primaryColor}
                />
              </BoosterPack3D>
            </div>

            {/* Gesture Instruction & Quick Rip Fallback */}
            <div className="mt-4 flex flex-col items-center gap-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono tracking-wide font-medium shadow-sm">
                <span>⚡ Drag the yellow TEAR ▶ notch right across the foil</span>
              </div>

              <button
                onClick={handleInstantOpen}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline font-mono transition"
              >
                Quick Rip / Instant Open
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 2: MULTI-TIER ANTICIPATION FX (TEAR BREACH)
            ============================================================ */}
        {stage === 'ANTICIPATING' && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto text-center">
            {/* God Pack Celestial Flare */}
            {isGodPack && (
              <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                <div className="w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.6)_0%,transparent_70%)] animate-spin" />
                <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-xs animate-pulse" />
              </div>
            )}

            {/* Ultra-Tier (MR / SEC / UR) Lightning Flash */}
            {(packPeakRarity === 'MR' || packPeakRarity === 'SEC' || packPeakRarity === 'UR') && !isGodPack && (
              <div className="fixed inset-0 pointer-events-none z-10 bg-black/80 flex items-center justify-center transition-all duration-300">
                <div className="w-[360px] h-[520px] rounded-3xl border-2 border-amber-400 animate-pulse shadow-[0_0_80px_rgba(245,158,11,0.8)]" />
              </div>
            )}

            {/* Super-Tier (SR) Violet Aura */}
            {packPeakRarity === 'SR' && !isGodPack && (
              <div className="fixed inset-0 pointer-events-none z-10 bg-purple-950/40 flex items-center justify-center transition-all duration-300">
                <div className="w-[340px] h-[500px] rounded-3xl border border-purple-400 shadow-[0_0_60px_rgba(168,85,247,0.75)] animate-pulse" />
              </div>
            )}

            {/* Center Foil Burst Core */}
            <div className="relative z-20 flex flex-col items-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border border-white/50 shadow-2xl relative"
                style={{
                  background: `radial-gradient(circle, ${theme.primaryColor} 0%, #0c0c14 75%)`,
                  boxShadow: `0 0 60px ${theme.accentGlow}`,
                }}
              >
                {isGodPack ? (
                  <Sparkles className="w-12 h-12 text-yellow-200 animate-spin" />
                ) : (
                  <Zap className="w-12 h-12 text-white animate-bounce" />
                )}
              </div>

              <h3 className="text-xl font-black text-amber-300 uppercase tracking-widest drop-shadow-lg">
                {isGodPack ? '★ CELESTIAL GOD PACK ★' : 'Tearing Open Foil...'}
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                {isGodPack
                  ? 'All Ultra, Secret & Master Rares Guaranteed!'
                  : 'Foil seal breached. Releasing cards into deck...'}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 3: TIGHT CARD-STACK & RIGHT-SWIPE PEEL CEREMONY
            ============================================================ */}
        {stage === 'PEELING' && activeCard && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto w-full max-w-md">
            
            {/* Card-Specific Anticipation Auras */}
            {cardAnticipationTell === 'ULTRA' && (
              <div className="fixed inset-0 pointer-events-none z-10 bg-black/75 flex items-center justify-center transition-all duration-300">
                <div
                  className="w-[330px] h-[480px] rounded-2xl border-2 animate-pulse"
                  style={{
                    borderColor: CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B',
                    boxShadow: `0 0 70px ${CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B'}`,
                  }}
                />
              </div>
            )}

            {cardAnticipationTell === 'SUPER' && (
              <div className="fixed inset-0 pointer-events-none z-10 bg-purple-950/30 flex items-center justify-center transition-all duration-300">
                <div className="w-[320px] h-[460px] rounded-2xl border border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.7)] animate-pulse" />
              </div>
            )}

            {cardAnticipationTell === 'GOD_PACK' && (
              <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.45)_0%,transparent_70%)] animate-spin" />
              </div>
            )}

            {/* TIGHT PHYSICAL DECK STACK CONTAINER */}
            <div className="relative z-20 flex flex-col items-center">
              
              {/* Deck Stack Anchor (Viewport Center) */}
              <div className="relative w-[280px] h-[392px] sm:w-[320px] sm:h-[448px]">
                {pulledCards.slice(currentCardIndex).map((card, offsetIdx) => {
                  const isTop = offsetIdx === 0;
                  // Card Stack Geometry:
                  // Vertical offset (Y): offsetIdx * 2px (strictly <= 2px per card)
                  // Horizontal offset (X): offsetIdx * 1px
                  // Scale factor: 1 - offsetIdx * 0.006
                  // Elevation (Z): totalCards - offsetIdx
                  // Edge shadow: shadow-[0_4px_10px_rgba(0,0,0,0.5)]
                  const yOffset = offsetIdx * 2;
                  const xOffset = offsetIdx * 1;
                  const scale = 1 - offsetIdx * 0.006;
                  const zElevation = (pulledCards.length - offsetIdx) * 10;

                  if (isTop) {
                    return (
                      <motion.div
                        key={card.id}
                        drag="x"
                        dragConstraints={{ left: 0, right: 800 }}
                        dragElastic={0.08}
                        style={{
                          x: topCardX,
                          rotate: topCardRotate,
                          zIndex: zElevation,
                        }}
                        onDragEnd={handleTopCardDragEnd}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing select-none rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.5)] touch-none"
                      >
                        <CardRenderer
                          card={card}
                          size="md"
                          interactive={false}
                          showMarketValue={true}
                        />
                      </motion.div>
                    );
                  }

                  // Non-top cards stacked directly underneath
                  return (
                    <div
                      key={card.id}
                      style={{
                        transform: `translate3d(${xOffset}px, ${yOffset}px, 0px) scale(${scale})`,
                        zIndex: zElevation,
                      }}
                      className="absolute inset-0 pointer-events-none rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-transform duration-200"
                    >
                      <CardRenderer
                        card={card}
                        size="md"
                        interactive={false}
                        showMarketValue={true}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Peel Gesture Hint & Action Buttons */}
              <div className="mt-6 flex flex-col items-center gap-3 z-30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={discardTopCard}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95"
                  >
                    <span>{currentCardIndex < pulledCards.length - 1 ? 'Peel Card' : 'View Summary'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleRevealAll}
                    className="px-4 py-2 rounded-full bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition"
                  >
                    Skip All
                  </button>
                </div>

                <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                  <span>👉 Swipe card to the right to peel and discard</span>
                </span>
              </div>

              {/* Deck Stack Progression Pips */}
              <div className="flex items-center gap-2 mt-3">
                {pulledCards.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentCardIndex
                        ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : idx < currentCardIndex
                        ? 'w-2 bg-zinc-600'
                        : 'w-2 bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 4: SUMMARY GRID & QUICK-ACTION DUSTING HUB
            ============================================================ */}
        {stage === 'SUMMARY' && (
          <div className="flex-1 flex flex-col items-center justify-between w-full max-w-5xl my-auto z-20 py-2">
            
            {/* Header Pull Summary Banner */}
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Opening Ceremony Complete</span>
                {isGodPack && <span className="text-amber-300 font-black">• GOD PACK!</span>}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                Pack Pull Summary
              </h2>

              <p className="text-xs text-zinc-400 font-mono mt-1">
                Highest Rarity: <span className="font-bold text-amber-400">{packPeakRarity}</span> • Total Market Value: <span className="font-bold text-amber-400">{totalPackMarketValue.toLocaleString()} ¥</span>
              </p>
            </div>

            {/* Stardust Toast Notification */}
            {dustToast !== null && (
              <div className="mb-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold font-mono animate-bounce flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dusted non-rares for +{dustToast} Stardust!</span>
              </div>
            )}

            {/* Responsive Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 my-auto w-full">
              {pulledCards.map((card, index) => {
                const isDusted = dustedCardIds.includes(card.id);
                const rarityStyle = RARITY_BADGES[card.rarity] ?? RARITY_BADGES.C;

                return (
                  <div
                    key={card.id}
                    className={`flex flex-col items-center p-2 rounded-2xl bg-zinc-900/60 border border-white/10 relative transition-all ${
                      isDusted ? 'opacity-40 grayscale' : 'hover:border-white/30'
                    }`}
                  >
                    {/* Slot Header */}
                    <div className="w-full flex items-center justify-between text-[10px] mb-1.5 font-mono">
                      <span className="text-zinc-500">#{index + 1}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-black border ${rarityStyle.bgClass} ${rarityStyle.textClass} ${rarityStyle.borderClass}`}
                      >
                        {card.rarity}
                      </span>
                    </div>

                    <CardRenderer
                      card={card}
                      size="sm"
                      interactive={!isDusted}
                      showMarketValue={true}
                    />

                    {isDusted && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl pointer-events-none">
                        <span className="px-2 py-1 rounded bg-zinc-900 text-cyan-400 font-mono text-xs font-black border border-cyan-500/50">
                          DUSTED
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Bar Footer */}
            <div className="w-full max-w-2xl mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
              {/* Quick Dust Non-Rares */}
              <button
                onClick={handleQuickDustNonRares}
                disabled={
                  pulledCards.every((c) => c.rarity !== 'C' && c.rarity !== 'UC') ||
                  dustedCardIds.length >= pulledCards.filter((c) => c.rarity === 'C' || c.rarity === 'UC').length
                }
                className="px-4 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Quick Dust Non-Rares (C/UC)</span>
              </button>

              {/* Open Another */}
              {onOpenAnother && (
                <button
                  onClick={() => onOpenAnother(packId)}
                  disabled={yen < (packConfig?.costYen ?? 0)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Open Another ({packConfig?.costYen.toLocaleString()} ¥)</span>
                </button>
              )}

              {/* Add All to Binder Confirmation Button */}
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add All to Binder</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info label */}
        <footer className="w-full max-w-5xl text-center text-[10px] text-zinc-600 font-mono">
          TQQ VAULT • BOOSTER PACK CEREMONY ENGINE • STAGE 3
        </footer>
      </div>
    </div>
  );
};

export default PackOpeningModal;
