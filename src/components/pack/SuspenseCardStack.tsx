'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../../types/card';
import type { SuspenseTier, EdgeGlowProfile } from '../../types/packCeremony';
import {
  resolveCardSuspenseProfile,
  resolveSuspenseTier,
} from '../../config/suspenseProfiles';
import {
  startSuspenseHum,
  playCardSlideDeck,
  playSignedFanfare,
  playFoilCrease,
  SuspenseHumController,
} from '../../utils/audioPackCeremony';
import { TqqCardBack } from '../card/TqqCardBack';
import { RealisticCardRenderer } from '../card/RealisticCardRenderer';
import { ArrowRight, Sparkles, Eye, RotateCw } from 'lucide-react';

export interface SuspenseCardStackProps {
  /** The 5 cards pulled from the opened booster pack */
  cards: CardInstance[];
  /** Optional initial card index (defaults to 0) */
  initialIndex?: number;
  /** Callback fired when a card begins peeling off the stack */
  onCardPeel?: (card: CardInstance, index: number) => void;
  /** Callback fired when a card has successfully flipped face-up and is revealed */
  onCardRevealed?: (card: CardInstance, index: number) => void;
  /** Callback fired after the last card is revealed or dismissed */
  onCeremonyComplete?: () => void;
  /** Callback fired when user opts to skip all remaining reveals */
  onSkipAll?: () => void;
  /** Mute audio flag */
  isMuted?: boolean;
  /** Additional container CSS class */
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

/**
 * SuspenseCardStack - Face-Down 3D Suspense Card Stack with Predictive Edge-Glow
 *
 * Replicates the authentic physical excitement of peeling cards face-down from a deck:
 * - Luxury dark velvet card mat (#08090d)
 * - Compact 5-card face-down stack with tight 2px vertical offsets
 * - Volumetric predictive edge-glow optics driven by suspenseProfiles.ts
 * - Framer Motion touch/pointer peel gestures with velocity detection (Δx > 120px or vx > 400px/s)
 * - Low-frequency procedural suspense hum rising in pitch during peel drag
 * - 3D card flip animation (rotateY: 180deg, 0.35s) on reveal threshold
 * - Cinematic slow-motion blur (0.3s) and pristine 5-bell chime fanfare on UR/SEC/SP cards
 */
export const SuspenseCardStack: React.FC<SuspenseCardStackProps> = ({
  cards,
  initialIndex = 0,
  onCardPeel,
  onCardRevealed,
  onCeremonyComplete,
  onSkipAll,
  isMuted = false,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSlowMoBlur, setIsSlowMoBlur] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);

  // Drag Motion Values
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const cardRotateZ = useTransform(cardX, [-50, 0, 300], [-3, 0, 18]);
  const dragProgress = useTransform(cardX, [0, 120], [0, 1]);

  // Audio Hum Reference
  const humControllerRef = useRef<SuspenseHumController | null>(null);
  const isDraggingRef = useRef(false);

  // Active top card
  const activeCard: CardInstance | undefined = cards[currentIndex];
  const isLastCard = currentIndex >= cards.length - 1;

  // Active Suspense Profile & Tier
  const { profile, tier } = useMemo<{
    profile: EdgeGlowProfile;
    tier: SuspenseTier;
  }>(() => {
    if (!activeCard) {
      return {
        profile: {
          colorHex: '#ffffff15',
          secondaryHex: '#94a3b8',
          blurRadiusPx: 12,
          spreadPx: 2,
          pulseDurationSec: 2.4,
          particleCount: 0,
          suspenseTier: 'standard',
        },
        tier: 'standard',
      };
    }
    return {
      profile: resolveCardSuspenseProfile(activeCard),
      tier: resolveSuspenseTier(activeCard.rarity, activeCard.finish),
    };
  }, [activeCard]);

  // Particle Sparks for High-Suspense Tiers
  const particles = useMemo<Particle[]>(() => {
    if (!profile.particleCount || profile.particleCount <= 0) return [];
    const count = Math.min(profile.particleCount, 32);
    const list: Particle[] = [];
    const colors = [profile.colorHex, profile.secondaryHex, '#ffffff'];

    for (let i = 0; i < count; i++) {
      // Positioned along card perimeter (normalized percentages)
      const side = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      if (side === 0) {
        // Top edge
        x = Math.random() * 100;
        y = Math.random() * 10;
      } else if (side === 1) {
        // Right edge
        x = 90 + Math.random() * 10;
        y = Math.random() * 100;
      } else if (side === 2) {
        // Bottom edge
        x = Math.random() * 100;
        y = 90 + Math.random() * 10;
      } else {
        // Left edge
        x = Math.random() * 10;
        y = Math.random() * 100;
      }

      list.push({
        id: i,
        x,
        y,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * profile.pulseDurationSec,
        duration: 0.8 + Math.random() * 1.2,
      });
    }
    return list;
  }, [profile]);

  // Cleanup hum on unmount
  useEffect(() => {
    return () => {
      humControllerRef.current?.stop(30);
      humControllerRef.current = null;
    };
  }, []);

  // Terminate audio if muted externally
  useEffect(() => {
    if (isMuted) {
      humControllerRef.current?.stop(10);
      humControllerRef.current = null;
    }
  }, [isMuted]);

  // --------------------------------------------------------------------------
  // Peel & Reveal Execution
  // --------------------------------------------------------------------------
  const executeFlipReveal = useCallback(() => {
    if (!activeCard || isFlipping || isFlipped) return;

    setIsFlipping(true);

    // Halt suspense hum immediately
    humControllerRef.current?.stop(50);
    humControllerRef.current = null;

    // Sleeve slide sound
    if (!isMuted) {
      playCardSlideDeck();
    }

    onCardPeel?.(activeCard, currentIndex);

    const isHighTier = tier === 'ultra' || tier === 'god';

    if (isHighTier) {
      setIsSlowMoBlur(true);
    }

    // Flip duration: 0.35s
    setTimeout(() => {
      setIsFlipped(true);
      setIsFlipping(false);
      setRevealedIndices((prev) =>
        prev.includes(currentIndex) ? prev : [...prev, currentIndex]
      );
      onCardRevealed?.(activeCard, currentIndex);

      if (isHighTier) {
        // Slow-motion blur resolves in 0.3s and triggers fanfare
        if (!isMuted) {
          playSignedFanfare();
        }
        setTimeout(() => {
          setIsSlowMoBlur(false);
        }, 300);
      }
    }, 350);
  }, [
    activeCard,
    currentIndex,
    isFlipped,
    isFlipping,
    isMuted,
    onCardPeel,
    onCardRevealed,
    tier,
  ]);

  // Advance to Next Card in Stack
  const handleNextCard = useCallback(() => {
    if (isFlipping) return;

    if (currentIndex >= cards.length - 1) {
      onCeremonyComplete?.();
      return;
    }

    if (!isMuted) {
      playFoilCrease(0.4);
    }

    // Reset transform coordinates
    cardX.set(0);
    cardY.set(0);
    setIsFlipped(false);
    setIsFlipping(false);
    setIsSlowMoBlur(false);
    setCurrentIndex((prev) => prev + 1);
  }, [cardX, cardY, cards.length, currentIndex, isFlipping, isMuted, onCeremonyComplete]);

  // Skip All
  const handleSkipAll = useCallback(() => {
    humControllerRef.current?.stop(10);
    humControllerRef.current = null;
    onSkipAll?.();
    onCeremonyComplete?.();
  }, [onCeremonyComplete, onSkipAll]);

  // --------------------------------------------------------------------------
  // Drag Handlers
  // --------------------------------------------------------------------------
  const handleDragStart = () => {
    if (isFlipped || isFlipping) return;
    isDraggingRef.current = true;

    if (!isMuted && !humControllerRef.current) {
      humControllerRef.current = startSuspenseHum(tier);
    }
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isFlipped || isFlipping) return;

    // Pitch rises as card approaches 120px threshold
    const progress = Math.min(1.0, Math.max(0, info.offset.x / 120));
    humControllerRef.current?.updatePitch(progress);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isFlipped || isFlipping) return;
    isDraggingRef.current = false;

    // Peel Trigger Condition: Δx > 120px OR vx > 400px/s
    if (info.offset.x > 120 || info.velocity.x > 400) {
      // Snap card back to center horizontally before 3D flip
      animate(cardX, 0, { duration: 0.12 });
      animate(cardY, 0, { duration: 0.12 });
      executeFlipReveal();
    } else {
      // Spring reset back to resting stack position
      animate(cardX, 0, { type: 'spring', stiffness: 400, damping: 28 });
      animate(cardY, 0, { type: 'spring', stiffness: 400, damping: 28 });
      humControllerRef.current?.stop(80);
      humControllerRef.current = null;
    }
  };

  if (!activeCard || cards.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between py-3 select-none ${className}`}
    >
      {/* ====================================================================
          1. LUXURY DARK VELVET CARD MAT (#08090d)
          ==================================================================== */}
      <div
        className="relative flex-1 w-full max-w-2xl rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center my-auto overflow-visible"
        style={{
          backgroundColor: '#08090d',
          backgroundImage: `
            radial-gradient(circle at 50% 40%, rgba(245, 158, 11, 0.05) 0%, transparent 65%),
            radial-gradient(circle at 50% 50%, #0d0f18 0%, #08090d 95%)
          `,
          boxShadow:
            'inset 0 0 60px rgba(0, 0, 0, 0.95), 0 25px 60px -15px rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
        }}
      >
        {/* Velvet Card Mat Edge Stitching */}
        <div className="absolute inset-2.5 rounded-2xl border border-amber-500/10 pointer-events-none" />
        <div className="absolute inset-3 rounded-2xl border border-white/5 pointer-events-none" />

        {/* Ambient Top Spotlight Beam */}
        <div
          className="absolute -top-12 inset-x-0 mx-auto w-72 h-36 rounded-full pointer-events-none opacity-20 blur-2xl"
          style={{
            background:
              tier === 'god'
                ? '#ffd700'
                : tier === 'ultra'
                ? '#f59e0b'
                : tier === 'rare'
                ? '#8b5cf6'
                : '#ffffff',
          }}
        />

        {/* ==================================================================
            2. STACKING GEOMETRY & CARD DECK (320px - 360px aspect-[63/88])
            ================================================================== */}
        <div
          className="relative w-[300px] sm:w-[340px] md:w-[360px] aspect-[63/88] flex items-center justify-center"
          style={{ perspective: 1200 }}
        >
          {/* A. Backing Cards (Face-Down tightly stacked underneath with 2px offsets) */}
          {!isFlipped &&
            cards.slice(currentIndex + 1).map((backingCard, offset) => {
              const depth = offset + 1;
              const yOffset = depth * 2;
              const xOffset = depth * 1;
              const scale = 1 - depth * 0.005;
              const zIndex = (cards.length - depth) * 5;

              return (
                <div
                  key={`backing-${backingCard.id}-${currentIndex + depth}`}
                  className="absolute inset-0 pointer-events-none rounded-2xl md:rounded-[18px] transition-transform duration-200"
                  style={{
                    transform: `translate3d(${xOffset}px, ${yOffset}px, 0px) scale(${scale})`,
                    zIndex,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
                  }}
                >
                  <TqqCardBack showSheen={false} />
                </div>
              );
            })}

          {/* B. Volumetric Edge-Glow Lighting System (Beneath Top Card) */}
          {!isFlipped && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              {/* Common/Uncommon: Thin faint white rim light */}
              {tier === 'standard' && (
                <div
                  className="absolute inset-0 rounded-2xl md:rounded-[18px] transition-all duration-300"
                  style={{
                    boxShadow: '0 0 14px 2px rgba(255, 255, 255, 0.1)',
                  }}
                />
              )}

              {/* Rare/Super Rare: Pulsing Violet Halo (#8b5cf6, 1.6s breath) */}
              {tier === 'rare' && (
                <motion.div
                  animate={{
                    opacity: [0.65, 1, 0.65],
                    scale: [0.99, 1.025, 0.99],
                  }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute -inset-1.5 rounded-3xl"
                  style={{
                    background: `radial-gradient(circle, #8b5cf6 0%, #3b82f6 50%, transparent 80%)`,
                    filter: 'blur(16px)',
                    opacity: 0.8,
                  }}
                />
              )}

              {/* Ultra/Secret: High-energy Amber Flare (#f59e0b, 0.9s pulse with particle sparks) */}
              {tier === 'ultra' && (
                <motion.div
                  animate={{
                    opacity: [0.75, 1, 0.75],
                    scale: [0.99, 1.04, 0.99],
                  }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute -inset-2.5 rounded-3xl"
                  style={{
                    background: `radial-gradient(circle, #f59e0b 0%, #ec4899 60%, transparent 85%)`,
                    filter: 'blur(22px)',
                    opacity: 0.9,
                  }}
                />
              )}

              {/* Master/Signed SP: Multi-spectral Chromatic Aurora with Spinning Radial Rays */}
              {tier === 'god' && (
                <div className="absolute -inset-6 flex items-center justify-center overflow-visible">
                  {/* Spinning Conic Aurora Rays */}
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
                    className="w-96 h-96 rounded-full opacity-70"
                    style={{
                      background: `conic-gradient(from 0deg, #ffd700 0%, #ec4899 25%, #06b6d4 50%, #10b981 75%, #ffd700 100%)`,
                      filter: 'blur(30px)',
                    }}
                  />
                  {/* High-intensity golden core pulse */}
                  <motion.div
                    animate={{ scale: [0.98, 1.05, 0.98], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      boxShadow: '0 0 55px 18px rgba(255, 215, 0, 0.85)',
                    }}
                  />
                </div>
              )}

              {/* Floating Edge Particle Sparks */}
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  animate={{
                    y: [0, -14, 0],
                    x: [0, (p.id % 2 === 0 ? 8 : -8), 0],
                    opacity: [0.2, 0.95, 0.2],
                    scale: [0.7, 1.3, 0.7],
                  }}
                  transition={{
                    duration: p.duration,
                    repeat: Infinity,
                    delay: p.delay,
                    ease: 'easeInOut',
                  }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    boxShadow: `0 0 8px ${p.color}`,
                  }}
                />
              ))}
            </div>
          )}

          {/* C. Top Active Card: 3D Flip & Touch/Pointer Peel Gesture */}
          <div
            className="relative w-full h-full z-20"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* FACE-DOWN STATE (Peel Gesture Active) */}
            {!isFlipped && (
              <motion.div
                drag={!isFlipping ? 'x' : false}
                dragConstraints={{ left: 0, right: 600 }}
                dragElastic={0.25}
                style={{
                  x: cardX,
                  y: cardY,
                  rotateZ: cardRotateZ,
                  transformStyle: 'preserve-3d',
                  boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85)',
                }}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={
                  isFlipping
                    ? {
                        rotateY: 180,
                        scale: 1.03,
                        transition: { duration: 0.35, ease: 'easeOut' },
                      }
                    : {}
                }
                className={`relative w-full h-full rounded-2xl md:rounded-[18px] touch-none select-none ${
                  isFlipping
                    ? 'pointer-events-none'
                    : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                {/* Face-Down Back Art */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <TqqCardBack showSheen={true} />
                </div>

                {/* Face-Up Front Art (Revealed during 3D Flip) */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <RealisticCardRenderer
                    card={activeCard}
                    interactive={false}
                    size="full"
                    showMarketValue={false}
                  />
                </div>
              </motion.div>
            )}

            {/* FACE-UP STATE (Card Revealed in Inspection Zone) */}
            {isFlipped && (
              <motion.div
                initial={{ rotateY: 180, scale: 0.96 }}
                animate={{
                  rotateY: 0,
                  scale: 1,
                  filter: isSlowMoBlur ? 'blur(12px)' : 'blur(0px)',
                }}
                transition={{
                  duration: 0.35,
                  ease: 'easeOut',
                  filter: { duration: 0.3 },
                }}
                className="relative w-full h-full rounded-2xl md:rounded-[18px] flex items-center justify-center"
              >
                {/* Full Realistic 5-Layer Composite Foil Renderer */}
                <RealisticCardRenderer
                  card={activeCard}
                  interactive={true}
                  size="full"
                  showMarketValue={true}
                  enableGyro={true}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* ==================================================================
            3. SUSPENSE HUD, PEEL HINTS & CONTROLS
            ================================================================== */}
        <div className="mt-6 flex flex-col items-center gap-3 z-30 text-center">
          {!isFlipped ? (
            <>
              {/* Suspense Tier Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono tracking-wider text-zinc-300 backdrop-blur-md">
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: profile.colorHex }}
                />
                <span className="font-bold uppercase text-amber-400">
                  {tier === 'god'
                    ? '★ CELESTIAL AURORA DETECTED ★'
                    : tier === 'ultra'
                    ? '⚡ HIGH-ENERGY VOLTAGE DETECTED'
                    : tier === 'rare'
                    ? '✨ MYSTIC HALO DETECTED'
                    : 'STANDARD PACK STACK'}
                </span>
              </div>

              {/* Action Buttons: Tap to Reveal or Skip */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={executeFlipReveal}
                  disabled={isFlipping}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>Reveal Card</span>
                </button>

                <button
                  onClick={handleSkipAll}
                  className="px-4 py-2 rounded-full bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition"
                >
                  Skip All
                </button>
              </div>

              <span className="text-[11px] text-zinc-400 font-mono tracking-wide mt-1">
                👉 Drag card right or swipe (&gt;120px) to peel face-up
              </span>
            </>
          ) : (
            <>
              {/* Post-Reveal Action Controls */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={handleNextCard}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95"
                >
                  <span>{isLastCard ? 'Complete Ceremony' : 'Next Card'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {!isLastCard && (
                  <button
                    onClick={handleSkipAll}
                    className="px-4 py-2 rounded-full bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition"
                  >
                    Skip All
                  </button>
                )}
              </div>

              <span className="text-[11px] text-emerald-400 font-mono tracking-wide mt-1 font-semibold">
                ✨ Card {currentIndex + 1} of {cards.length} Revealed! Move cursor to inspect foil.
              </span>
            </>
          )}

          {/* Stack Progression Pips */}
          <div className="flex items-center gap-2 mt-2">
            {cards.map((_, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = revealedIndices.includes(idx);
              return (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'w-7 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                      : isPast
                      ? 'w-2 bg-emerald-500'
                      : 'w-2 bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspenseCardStack;
