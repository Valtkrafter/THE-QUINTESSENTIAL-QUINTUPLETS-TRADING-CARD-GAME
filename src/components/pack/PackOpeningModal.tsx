'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, animate } from 'framer-motion';
import { CardInstance, PackId, Rarity } from '../../types/card';
import { PACKS_CONFIG, calculateCardMarketValue } from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { BoosterPack3D, PACK_THEMES } from './BoosterPack3D';
import { CardRenderer, CHARACTER_THEMES, RARITY_BADGES } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  Trash2,
  CheckCircle2,
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
  const [isTorn, setIsTorn] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [dustedCardIds, setDustedCardIds] = useState<string[]>([]);
  const [dustToast, setDustToast] = useState<number | null>(null);
  const [packKey, setPackKey] = useState(0);

  // Card peel gesture and exit state
  const [isPeeling, setIsPeeling] = useState(false);
  const isPeelingRef = useRef(false);
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const cardRotate = useMotionValue(0);
  const cardOpacity = useMotionValue(1);

  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const openPackStore = useGameStore((state) => state.openPack);
  const dustCardStore = useGameStore((state) => state.dustCard);
  const getCooldownRemaining = useGameStore((state) => state.getTestSheetCooldownRemaining);

  const packConfig = PACKS_CONFIG[packId];
  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;

  // Initialize and reset ceremony state; stop any running audio
  useEffect(() => {
    if (isOpen) {
      setStage('INSPECT');
      setPulledCards([]);
      setIsGodPack(false);
      setCurrentCardIndex(0);
      setTearProgress(0);
      setIsDragging(false);
      setIsTorn(false);
      setScreenShake(false);
      isPeelingRef.current = false;
      setIsPeeling(false);
      cardX.set(0);
      cardY.set(0);
      cardRotate.set(0);
      cardOpacity.set(1);
      setDustedCardIds([]);
      setDustToast(null);
      setPackKey((prev) => prev + 1);
    } else {
      soundEngine.stopAll();
      isPeelingRef.current = false;
      setIsPeeling(false);
      cardX.set(0);
      cardY.set(0);
      cardRotate.set(0);
      cardOpacity.set(1);
    }
  }, [isOpen, packId, cardOpacity, cardRotate, cardX, cardY]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      soundEngine.stopAll();
    };
  }, []);

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

  // Handle Tear Complete: triggers atomic store pull (if not pre-rolled), screen impact, and begins anticipation
  const handleTearComplete = useCallback(() => {
    setIsDragging(false);
    setIsTorn(true);

    // Screen impact shake for 160ms
    setScreenShake(true);
    setTimeout(() => {
      setScreenShake(false);
    }, 160);

    // Wait 350ms for the top crimp detachment animation ({ y: -90, rotate: -6, opacity: 0 })
    setTimeout(() => {
      setStage('ANTICIPATING');
    }, 350);

    try {
      // Option B: If cards were already pre-rolled, reuse them; otherwise execute openPackStore
      let cards = pulledCards;
      let godPack = isGodPack;

      if (cards.length === 0) {
        const result = openPackStore(packId);
        cards = result.cards;
        godPack = result.isGodPack;
        setPulledCards(cards);
        setIsGodPack(godPack);
      }

      // Determine highest rarity for anticipation sound
      const hierarchy: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, UR: 5, SEC: 6, MR: 7 };
      let highest: Rarity = 'C';
      for (const c of cards) {
        if (hierarchy[c.rarity] > hierarchy[highest]) {
          highest = c.rarity;
        }
      }

      // Play anticipation audio cue safely once transitioning to anticipation
      setTimeout(() => {
        if (godPack) {
          soundEngine.play('godpack_fanfare', 0.85);
        } else if (highest === 'MR' || highest === 'SEC' || highest === 'UR') {
          soundEngine.play('sub_bass_pulse', 0.8);
        } else if (highest === 'SR') {
          soundEngine.play('reveal_rare', 0.7);
        }
      }, 350);

      // Transition into Peeling phase after suspense beat
      const anticipationDuration = godPack
        ? 1300
        : (highest === 'MR' || highest === 'SEC' || highest === 'UR')
        ? 1000
        : 700;

      setTimeout(() => {
        setStage('PEELING');
        setCurrentCardIndex(0);
        cardX.set(0);
        cardRotate.set(0);
        cardOpacity.set(1);
        isPeelingRef.current = false;
        setIsPeeling(false);
      }, 350 + anticipationDuration);
    } catch (err) {
      console.error('Failed to open pack:', err);
      setScreenShake(false);
      onClose();
    }
  }, [cardOpacity, cardRotate, cardX, isGodPack, onClose, openPackStore, packId, pulledCards]);

  // Handle "Open Another": Option B ceremony reset engine with instant pre-roll
  const handleOpenAnother = useCallback(() => {
    const packCost = packConfig?.costYen ?? 0;
    const cooldownRemaining = packConfig?.cooldownSeconds ? getCooldownRemaining() : 0;

    // Guard: Currency & Cooldown validation
    if (cooldownRemaining > 0 || (packCost > 0 && yen < packCost)) {
      return;
    }

    try {
      // 1. Terminate running audio
      soundEngine.stopAll();

      // 2. Pre-roll new card batch from store (Option B)
      const result = openPackStore(packId);
      setPulledCards(result.cards);
      setIsGodPack(result.isGodPack);

      // 3. Reset ceremony state machine to Frame 0
      setIsTorn(false);
      setTearProgress(0);
      setIsDragging(false);
      setCurrentCardIndex(0);
      isPeelingRef.current = false;
      setIsPeeling(false);
      cardX.set(0);
      cardRotate.set(0);
      cardOpacity.set(1);
      setDustedCardIds([]);
      setDustToast(null);
      setScreenShake(false);
      setPackKey((prev) => prev + 1);
      setStage('INSPECT');

      // 4. Notify parent callback if provided
      onOpenAnother?.(packId);
    } catch (error) {
      console.error('Failed to open another pack:', error);
    }
  }, [
    cardOpacity,
    cardRotate,
    cardX,
    getCooldownRemaining,
    onOpenAnother,
    openPackStore,
    packConfig,
    packId,
    yen,
  ]);

  // Deterministic peel & discard executor (Stage 1 & Stage 2)
  const executePeel = useCallback((velY: number = 0) => {
    if (isPeelingRef.current || stage !== 'PEELING') return;
    if (currentCardIndex >= pulledCards.length) {
      setStage('SUMMARY');
      return;
    }

    isPeelingRef.current = true;
    setIsPeeling(true);

    // Play card slide sound & tactile haptic tap
    soundEngine.play('card_slide', 0.65);
    haptics.lightTap();

    // Calculate exit boundary: completely off-screen with velocity-based diagonal fling
    const exitX = typeof window !== 'undefined' ? Math.max(window.innerWidth + 200, 1000) : 1000;
    const exitY = Math.max(-400, Math.min(400, velY * 0.25));

    let hasFinalized = false;
    const finalize = () => {
      if (hasFinalized) return;
      hasFinalized = true;

      // Force reset transform and opacity for next card layer
      cardX.set(0);
      cardY.set(0);
      cardRotate.set(0);
      cardOpacity.set(1);
      isPeelingRef.current = false;
      setIsPeeling(false);

      const nextIndex = currentCardIndex + 1;
      if (nextIndex >= pulledCards.length) {
        // Final card completely peeled off-screen -> transition to Summary
        setCurrentCardIndex(nextIndex);
        setStage('SUMMARY');
        soundEngine.play('reveal_rare', 0.6);
        haptics.jackpot();
      } else {
        setCurrentCardIndex(nextIndex);
        const nextCard = pulledCards[nextIndex];
        if (nextCard) {
          if (
            nextCard.rarity === 'UR' ||
            nextCard.rarity === 'SEC' ||
            nextCard.rarity === 'MR'
          ) {
            soundEngine.play('sub_bass_pulse', 0.65);
            haptics.jackpot();
          } else if (nextCard.rarity === 'SR') {
            soundEngine.play('reveal_rare', 0.6);
            haptics.lightTap();
          } else {
            haptics.lightTap();
          }
        }
      }
    };

    // Animate smoothly to exit coordinates with diagonal trajectory
    const animX = animate(cardX, exitX, { duration: 0.28, ease: 'easeIn' });
    const animY = animate(cardY, exitY, { duration: 0.28, ease: 'easeIn' });
    const animRot = animate(cardRotate, 20, { duration: 0.28, ease: 'easeIn' });
    const animOp = animate(cardOpacity, 0, { duration: 0.28, ease: 'easeIn' });

    Promise.all([animX, animY, animRot, animOp]).then(finalize).catch(finalize);

    // Fail-safe timeout guard (ensures cleanup even if thread/visibility lags)
    setTimeout(finalize, 350);
  }, [cardOpacity, cardRotate, cardX, cardY, currentCardIndex, pulledCards, stage]);

  // Handle right/diagonal thumb flick drag end on the top card
  const handleTopCardDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isPeelingRef.current) return;

      const flickDistance = Math.hypot(info.offset.x, info.offset.y);
      const flickVelocity = Math.hypot(info.velocity.x, info.velocity.y);

      // Peel Trigger Condition: rightward/diagonal offset > 80px OR velocity > 300px/s
      if (
        info.offset.x > 80 ||
        (flickDistance > 80 && info.offset.x > 25) ||
        info.velocity.x > 300 ||
        (flickVelocity > 350 && info.offset.x > 20)
      ) {
        executePeel(info.velocity.y);
      } else {
        // Snap back to (0, 0)
        animate(cardX, 0, {
          type: 'spring',
          stiffness: 300,
          damping: 25,
        });
        animate(cardY, 0, {
          type: 'spring',
          stiffness: 300,
          damping: 25,
        });
        animate(cardRotate, 0, {
          type: 'spring',
          stiffness: 300,
          damping: 25,
        });
      }
    },
    [cardRotate, cardX, cardY, executePeel]
  );

  // Skip All directly to Summary (Stage 3 Programmatic Fallback)
  const handleRevealAll = useCallback(() => {
    isPeelingRef.current = false;
    setIsPeeling(false);
    cardX.set(0);
    cardRotate.set(0);
    cardOpacity.set(1);
    setCurrentCardIndex(pulledCards.length);
    setStage('SUMMARY');
    soundEngine.play('reveal_rare', 0.6);
  }, [cardOpacity, cardRotate, cardX, pulledCards.length]);

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
    soundEngine.play('reveal_rare', 0.5);

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

  const packCost = packConfig?.costYen ?? 0;
  const cooldownRemaining = packConfig?.cooldownSeconds ? getCooldownRemaining() : 0;
  const isCooldownActive = cooldownRemaining > 0;
  const isInsufficientFunds = packCost > 0 && yen < packCost;
  const canOpenAnother = !isCooldownActive && !isInsufficientFunds;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-2xl select-none overflow-hidden animate-fadeIn">
      {/* Dynamic Screen Impact Shake on Tear Breach */}
      <motion.div
        animate={
          screenShake
            ? { x: [-3, 3, -2, 2, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.16 }}
        className="w-full h-full flex flex-col items-center justify-between p-3 sm:p-5"
      >
        {/* ============================================================
            CEREMONY TOP BAR: Player Balances, Pack Stage & Controls
            STRICT ABSOLUTE SCREEN CENTERING OF TITLE GROUP
            ============================================================ */}
        <header className="relative flex h-16 w-full shrink-0 items-center justify-between px-4 sm:px-6 z-50">
          {/* Left: Balances (Statically aligned to left) */}
          <div className="flex items-center gap-3 sm:gap-4 z-10">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-mono text-amber-300 shadow-sm">
              <span className="text-amber-500 font-bold">¥</span>
              <span>{yen.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-mono text-cyan-300 shadow-sm">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{stardust.toLocaleString()}</span>
            </div>
          </div>

          {/* Center: Title Group - STRICT ABSOLUTE SCREEN CENTERING */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center max-w-[55vw]">
            <div className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-amber-400 drop-shadow">
              <span>★</span>
              <span>{(theme.name || packConfig?.name || packId).toUpperCase()}</span>
              <span>★</span>
            </div>

            {stage === 'SUMMARY' ? (
              <div className="mt-0.5 flex flex-col items-center">
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 uppercase">
                  Opening Ceremony Complete
                </span>
                <h2 className="mt-0.5 text-sm sm:text-base font-black tracking-wide text-white drop-shadow-md">
                  Pack Pull Summary
                </h2>
              </div>
            ) : (
              <span className="text-[10px] text-amber-400/90 font-mono tracking-wider font-semibold">
                {stage === 'INSPECT' && 'DRAG YELLOW NOTCH RIGHT TO TEAR'}
                {stage === 'ANTICIPATING' && (isGodPack ? '★ GOD PACK DESCENDING ★' : 'BREACHING FOIL SEAL...')}
                {stage === 'PEELING' && `CARD ${currentCardIndex + 1} OF ${pulledCards.length} • SWIPE RIGHT TO PEEL`}
              </span>
            )}
          </div>

          {/* Right: Controls (Statically aligned to right) */}
          <div className="flex items-center gap-2 z-10">
            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                } else {
                  soundEngine.stopAll();
                  setIsMuted(true);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zinc-300 hover:bg-white/10 hover:text-white transition shadow"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                soundEngine.stopAll();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zinc-300 hover:bg-white/10 hover:text-white transition shadow"
              title="Close Pack Ceremony"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* ============================================================
              STAGE 1: INSPECT & PINNED RELATIVE BOOSTER PACK
              Tear notch pinned inside BoosterPack3D's local coordinate space
              ============================================================ */}
          {stage === 'INSPECT' && (
            <motion.div
              key="stage-inspect"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center max-w-sm w-full relative z-20 my-auto"
            >
              {/* Pinned 3D Booster Pack with local TearMechanism */}
              <div className="relative">
                <BoosterPack3D
                  key={packKey}
                  packId={packId}
                  interactive={true}
                  isFloating={!isDragging}
                  tearProgress={tearProgress}
                  disableTilt={false}
                  isPaused={isDragging}
                  isTorn={isTorn}
                  onTearProgress={(progress) => setTearProgress(progress)}
                  onTearComplete={handleTearComplete}
                  onDragStateChange={(dragging) => setIsDragging(dragging)}
                />
              </div>

              {/* Manual Drag Instruction */}
              <div className="mt-4 flex flex-col items-center gap-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono tracking-wide font-medium shadow-sm">
                  <span>⚡ Drag the yellow TEAR ▶ notch right across the foil to rip</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================
              STAGE 2: MULTI-TIER ANTICIPATION FX (TEAR BREACH)
              ============================================================ */}
          {stage === 'ANTICIPATING' && (
            <motion.div
              key="stage-anticipating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto text-center"
            >
              {/* God Pack Celestial Flare & Golden Pulse */}
              {isGodPack && (
                <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                  <div className="w-[850px] h-[850px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.65)_0%,transparent_70%)] animate-spin" />
                  <div className="absolute inset-0 bg-amber-500/25 backdrop-blur-xs animate-pulse" />
                </div>
              )}

              {/* Ultra-Tier (MR / SEC / UR) Lightning Flash & Sub-Bass Pulse Dim */}
              {(packPeakRarity === 'MR' || packPeakRarity === 'SEC' || packPeakRarity === 'UR') && !isGodPack && (
                <div className="fixed inset-0 pointer-events-none z-10 bg-black/85 flex items-center justify-center transition-all duration-300">
                  <div className="w-[380px] h-[540px] rounded-3xl border-2 border-amber-400 animate-pulse shadow-[0_0_90px_rgba(245,158,11,0.85)]" />
                </div>
              )}

              {/* Super-Tier (SR) Violet Pulse Aura */}
              {packPeakRarity === 'SR' && !isGodPack && (
                <div className="fixed inset-0 pointer-events-none z-10 bg-purple-950/45 flex items-center justify-center transition-all duration-300">
                  <div className="w-[360px] h-[520px] rounded-3xl border border-purple-400 shadow-[0_0_70px_rgba(168,85,247,0.8)] animate-pulse" />
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
            </motion.div>
          )}

          {/* ============================================================
              STAGE 3: 360PX PRESENTATION CARD-STACK & RIGHT-SWIPE PEEL
              ============================================================ */}
          {stage === 'PEELING' && currentCardIndex < pulledCards.length && activeCard && (
            <motion.div
              key="stage-peeling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto w-full max-w-lg"
            >
              {/* Card-Specific Anticipation Auras */}
              {cardAnticipationTell === 'ULTRA' && (
                <div className="fixed inset-0 pointer-events-none z-10 bg-black/75 flex items-center justify-center transition-all duration-300">
                  <div
                    className="w-[370px] h-[516px] rounded-2xl border-2 animate-pulse"
                    style={{
                      borderColor: CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B',
                      boxShadow: `0 0 75px ${CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B'}`,
                    }}
                  />
                </div>
              )}

              {cardAnticipationTell === 'SUPER' && (
                <div className="fixed inset-0 pointer-events-none z-10 bg-purple-950/30 flex items-center justify-center transition-all duration-300">
                  <div className="w-[365px] h-[510px] rounded-2xl border border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.7)] animate-pulse" />
                </div>
              )}

              {cardAnticipationTell === 'GOD_PACK' && (
                <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <div className="w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.5)_0%,transparent_70%)] animate-spin" />
                </div>
              )}

              {/* PRESENTATION CARD STACK CONTAINER (360px x 502px, max-h 65vh) */}
              <div className="relative z-20 flex flex-col items-center">
                {/* Deck Stack Anchor (Presentation Aspect Ratio 63:88) */}
                <div className="relative w-[360px] max-w-[90vw] max-h-[65vh] aspect-[63/88]">
                  {currentCardIndex < pulledCards.length &&
                    pulledCards.slice(currentCardIndex).map((card, offsetIdx) => {
                      const isTop = offsetIdx === 0;
                      const yOffset = offsetIdx * 2;
                      const xOffset = offsetIdx * 1;
                      const scale = 1 - offsetIdx * 0.005;
                      const zElevation = (pulledCards.length - offsetIdx) * 10;

                      if (isTop) {
                        return (
                          <motion.div
                            key={`${card.id}-${currentCardIndex}`}
                            drag={!isPeeling ? true : false}
                            dragConstraints={{ left: 0, right: 600, top: -250, bottom: 250 }}
                            dragElastic={0.2}
                            style={{
                              x: cardX,
                              y: cardY,
                              rotate: cardRotate,
                              opacity: cardOpacity,
                              zIndex: zElevation,
                            }}
                            onDrag={(_, info) => {
                              if (isPeelingRef.current) return;
                              cardRotate.set(Math.min(Math.max(info.offset.x * 0.035, -8), 20));
                            }}
                            onDragEnd={handleTopCardDragEnd}
                            className={`absolute inset-0 select-none rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.7)] touch-none w-full h-full flex items-center justify-center ${
                              isPeeling ? 'pointer-events-none cursor-default' : 'cursor-grab active:cursor-grabbing'
                            }`}
                          >
                            <CardRenderer
                              card={card}
                              size="full"
                              interactive={false}
                              showMarketValue={true}
                            />
                          </motion.div>
                        );
                      }

                      // Backing cards stacked tightly underneath
                      return (
                        <div
                          key={`backing-${card.id}-${currentCardIndex + offsetIdx}`}
                          style={{
                            transform: `translate3d(${xOffset}px, ${yOffset}px, 0px) scale(${scale})`,
                            zIndex: zElevation,
                          }}
                          className="absolute inset-0 pointer-events-none rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.7)] transition-transform duration-200 w-full h-full flex items-center justify-center"
                        >
                          <CardRenderer
                            card={card}
                            size="full"
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
                      onClick={() => executePeel()}
                      disabled={isPeeling}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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
                    <span>👉 Drag top card to the right to peel & discard</span>
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
            </motion.div>
          )}

          {/* ============================================================
              STAGE 4: SUMMARY GRID & QUICK-ACTION DUSTING HUB
              ============================================================ */}
          {stage === 'SUMMARY' && (
            <motion.div
              key="stage-summary"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col items-center justify-between w-full max-w-5xl my-auto z-20 py-2"
            >
              {/* Header Pull Summary Metrics Subtitle */}
              <div className="text-center mb-3">
                <p className="text-xs text-zinc-400 font-mono">
                  Highest Rarity: <span className="font-bold text-amber-400">{packPeakRarity}</span> • Total Market Value:{' '}
                  <span className="font-bold text-amber-400">{totalPackMarketValue.toLocaleString()} ¥</span>
                  {isGodPack && <span className="ml-2 text-amber-300 font-black">• GOD PACK!</span>}
                </p>
              </div>

              {/* Stardust Toast Notification */}
              {dustToast !== null && (
                <div className="mb-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold font-mono animate-bounce flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
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
                  className="px-4 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Quick Dust Non-Rares (C/UC)</span>
                </button>

                {/* Open Another Button */}
                <button
                  onClick={handleOpenAnother}
                  disabled={!canOpenAnother}
                  title={
                    isCooldownActive
                      ? `On Cooldown (${cooldownRemaining}s remaining)`
                      : isInsufficientFunds
                      ? `Insufficient Funds (${packCost.toLocaleString()} ¥ required)`
                      : undefined
                  }
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-black transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.3)] text-xs uppercase tracking-wider"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    OPEN ANOTHER ({packCost === 0 ? 'FREE' : `${packCost.toLocaleString()} ¥`})
                  </span>
                </button>

                {/* Add All to Binder Confirmation Button */}
                <button
                  onClick={() => {
                    soundEngine.stopAll();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Add All to Binder</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info label */}
        <footer className="w-full max-w-5xl text-center text-[10px] text-zinc-600 font-mono">
          TQQ VAULT • BOOSTER PACK CEREMONY ENGINE • STAGE 3
        </footer>
      </motion.div>
    </div>
  );
};

export default PackOpeningModal;
