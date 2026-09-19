'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, PackId, Rarity } from '../../types/card';
import { PACKS_CONFIG, calculateCardMarketValue } from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { usePackCeremonyStore } from '../../store/usePackCeremonyStore';
import { BoosterPack3D, PACK_THEMES } from './BoosterPack3D';
import { SuspenseCardStack } from './SuspenseCardStack';
import { PackSummaryGrid } from './PackSummaryGrid';
import { TqqCardBack } from '../card/TqqCardBack';
import { soundEngine } from '../../utils/audio';
import {
  audioPackCeremony,
  playCardSlideDeck,
  stopAllCeremonyAudio,
} from '../../utils/audioPackCeremony';
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

export interface PackOpeningModalProps {
  isOpen: boolean;
  packId: PackId;
  onClose: () => void;
  onOpenAnother?: (packId: PackId) => void;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  isOpen,
  packId,
  onClose,
  onOpenAnother,
}) => {
  // Store subscriptions
  const phase = usePackCeremonyStore((state) => state.phase);
  const currentSession = usePackCeremonyStore((state) => state.currentSession);
  const tearProgress = usePackCeremonyStore((state) => state.tearProgress);
  const isBreached = usePackCeremonyStore((state) => state.isBreached);
  const initCeremony = usePackCeremonyStore((state) => state.initCeremony);
  const breachCrimp = usePackCeremonyStore((state) => state.breachCrimp);
  const extractCardsComplete = usePackCeremonyStore((state) => state.extractCardsComplete);
  const skipCeremony = usePackCeremonyStore((state) => state.skipCeremony);
  const setPhase = usePackCeremonyStore((state) => state.setPhase);
  const resetCeremony = usePackCeremonyStore((state) => state.resetCeremony);

  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const openPackStore = useGameStore((state) => state.openPack);
  const getCooldownRemaining = useGameStore((state) => state.getTestSheetCooldownRemaining);

  // Local UI State
  const [screenShake, setScreenShake] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [packKey, setPackKey] = useState(0);

  // Snapshot of cards discovered in Card-Dex prior to this unboxing
  const previouslyDiscoveredRef = useRef<Set<string>>(new Set());
  const initializedSessionIdRef = useRef<string | null>(null);

  const packConfig = PACKS_CONFIG[packId];
  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;

  // Initialize unboxing session upon opening modal
  useEffect(() => {
    if (!isOpen) {
      soundEngine.stopAll();
      stopAllCeremonyAudio();
      resetCeremony();
      initializedSessionIdRef.current = null;
      return;
    }

    // Snapshot previously discovered card definitions from master dex
    const currentDex = useGameStore.getState().cardDex;
    const discoveredSet = new Set<string>();
    if (currentDex) {
      for (const entry of Object.values(currentDex)) {
        if (entry.discovered) {
          discoveredSet.add(entry.cardDefId);
        }
      }
    }
    previouslyDiscoveredRef.current = discoveredSet;

    try {
      // Roll cards and deduct cost immediately via game store
      const rollResult = openPackStore(packId);
      initCeremony(packId, rollResult.cards, undefined, rollResult.isGodPack);
      initializedSessionIdRef.current = `${packId}_${Date.now()}`;
      setPackKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to initialize pack opening ceremony:', err);
      onClose();
    }
  }, [isOpen, packId, initCeremony, openPackStore, onClose, resetCeremony]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      soundEngine.stopAll();
      stopAllCeremonyAudio();
      usePackCeremonyStore.getState().resetCeremony();
    };
  }, []);

  // Card Extraction Animation trigger: when transitioning into EXTRACTING_CARDS
  useEffect(() => {
    if (phase === 'EXTRACTING_CARDS') {
      // Play card slide friction acoustic
      playCardSlideDeck(0.85);

      // Play anticipation sound based on rarity
      const isGod = currentSession?.isGodPack ?? false;
      const highestRarity = currentSession?.highestRarityFound ?? 'C';

      if (isGod) {
        soundEngine.play('godpack_fanfare', 0.9);
      } else if (highestRarity === 'MR' || highestRarity === 'SEC' || highestRarity === 'UR') {
        soundEngine.play('sub_bass_pulse', 0.8);
      } else if (highestRarity === 'SR') {
        soundEngine.play('reveal_rare', 0.7);
      }

      // Smoothly advance to PEELING_REVEAL after extraction animation completes
      const timer = setTimeout(() => {
        extractCardsComplete();
      }, 1250);

      return () => clearTimeout(timer);
    }
  }, [phase, currentSession, extractCardsComplete]);

  // Handle Tear Complete from BoosterPack3D / FoilTearCrimp
  const handleTearComplete = useCallback(() => {
    setIsDragging(false);

    // Screen impact shake for 160ms
    setScreenShake(true);
    setTimeout(() => {
      setScreenShake(false);
    }, 160);

    // Trigger atomic breach in ceremony store (transitions phase to EXTRACTING_CARDS)
    breachCrimp();
  }, [breachCrimp]);

  // Handle "Open Another" re-roll: resets state to Frame 0 without modal unmount
  const handleOpenAnother = useCallback(() => {
    const packCost = packConfig?.costYen ?? 0;
    const cooldownRemaining = packConfig?.cooldownSeconds ? getCooldownRemaining() : 0;

    if (cooldownRemaining > 0 || (packCost > 0 && yen < packCost)) {
      return;
    }

    try {
      soundEngine.stopAll();
      stopAllCeremonyAudio();

      // Snapshot updated dex state before opening subsequent pack
      const currentDex = useGameStore.getState().cardDex;
      const discoveredSet = new Set<string>();
      if (currentDex) {
        for (const entry of Object.values(currentDex)) {
          if (entry.discovered) {
            discoveredSet.add(entry.cardDefId);
          }
        }
      }
      previouslyDiscoveredRef.current = discoveredSet;

      // Roll new batch and re-initialize ceremony to Frame 0
      const rollResult = openPackStore(packId);
      initCeremony(packId, rollResult.cards, undefined, rollResult.isGodPack);
      setPackKey((k) => k + 1);
      setScreenShake(false);
      setIsDragging(false);

      onOpenAnother?.(packId);
    } catch (err) {
      console.error('Failed to open another pack:', err);
    }
  }, [
    getCooldownRemaining,
    initCeremony,
    onOpenAnother,
    openPackStore,
    packConfig,
    packId,
    yen,
  ]);

  // Handle modal close
  const handleClose = useCallback(() => {
    soundEngine.stopAll();
    stopAllCeremonyAudio();
    resetCeremony();
    onClose();
  }, [onClose, resetCeremony]);

  // Cost and cooldown calculations for Open Another action
  const packCost = packConfig?.costYen ?? 0;
  const cooldownRemaining = packConfig?.cooldownSeconds ? getCooldownRemaining() : 0;
  const isCooldownActive = cooldownRemaining > 0;
  const isInsufficientFunds = packCost > 0 && yen < packCost;
  const canOpenAnother = !isCooldownActive && !isInsufficientFunds;

  const cards = currentSession?.cards ?? [];
  const isGodPack = currentSession?.isGodPack ?? false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#06070a]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none animate-fadeIn">
      {/* Dynamic Screen Impact Shake on Tear Breach */}
      <motion.div
        animate={
          screenShake
            ? { x: [-4, 4, -3, 3, -1, 1, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.16 }}
        className="w-full h-full flex flex-col items-center justify-between p-3 sm:p-5"
      >
        {/* ============================================================
            CEREMONY TOP BAR: Player Balances, Pack Title & Audio Controls
            STRICT ABSOLUTE SCREEN CENTERING OF TITLE GROUP
            ============================================================ */}
        <header className="relative flex h-14 sm:h-16 w-full shrink-0 items-center justify-between px-3 sm:px-6 z-50">
          {/* Left: Balances */}
          <div className="flex items-center gap-2.5 sm:gap-4 z-10">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-mono text-amber-300 shadow-sm">
              <span className="text-amber-500 font-bold">¥</span>
              <span>{yen.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-mono text-cyan-300 shadow-sm">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{stardust.toLocaleString()}</span>
            </div>
          </div>

          {/* Center: Title Group - Strict Absolute Centering */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center max-w-[55vw]">
            <div className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-amber-400 drop-shadow">
              <span>★</span>
              <span>{(theme.name || packConfig?.name || packId).toUpperCase()}</span>
              <span>★</span>
            </div>

            <div className="mt-0.5 flex flex-col items-center">
              {phase === 'CEREMONY_SUMMARY' ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-300 uppercase">
                  Opening Complete • 5 Cards Revealed
                </span>
              ) : (
                <span className="text-[10px] text-amber-300/90 font-mono tracking-wider font-semibold">
                  {(phase === 'INSPECTING_PACK' || phase === 'TEARING_CRIMP') &&
                    'DRAG TEAR ▶ NOTCH RIGHT TO RIP FOIL'}
                  {phase === 'EXTRACTING_CARDS' &&
                    (isGodPack ? '★ CELESTIAL GOD PACK DESCENDING ★' : 'BREACHING FOIL SEAL...')}
                  {phase === 'PEELING_REVEAL' &&
                    `CARD ${(currentSession?.currentCardIndex ?? 0) + 1} OF ${cards.length} • SWIPE TO REVEAL`}
                </span>
              )}
            </div>
          </div>

          {/* Right: Audio Mute & Close Controls */}
          <div className="flex items-center gap-2 z-10">
            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  audioPackCeremony.setMuted(false);
                } else {
                  soundEngine.stopAll();
                  stopAllCeremonyAudio();
                  setIsMuted(true);
                  audioPackCeremony.setMuted(true);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-300 hover:bg-white/10 hover:text-white transition shadow"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-300 hover:bg-white/10 hover:text-white transition shadow"
              title="Close Pack Ceremony"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ============================================================
            CEREMONY STAGE RENDERING (Governed strictly by usePackCeremonyStore):
            1. INSPECTING_PACK / TEARING_CRIMP => BoosterPack3D & FoilTearCrimp
            2. EXTRACTING_CARDS => Foil detachment animation & rising card stack
            3. PEELING_REVEAL => SuspenseCardStack with predictive edge-glow
            4. CEREMONY_SUMMARY => PackSummaryGrid (5-card arc/fan presentation)
            ============================================================ */}
        <AnimatePresence mode="wait">
          {/* PHASE 1 & 2: 3D PACK INSPECTION & FOIL TEAR */}
          {(phase === 'INSPECTING_PACK' || phase === 'TEARING_CRIMP') && (
            <motion.div
              key="phase-inspect-tear"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center max-w-sm w-full relative z-20 my-auto"
            >
              <div className="relative">
                <BoosterPack3D
                  key={packKey}
                  packId={packId}
                  interactive={true}
                  isFloating={!isDragging}
                  tearProgress={tearProgress}
                  disableTilt={false}
                  isPaused={isDragging}
                  isTorn={isBreached}
                  onTearComplete={handleTearComplete}
                  onDragStateChange={(dragging) => setIsDragging(dragging)}
                />
              </div>

              {/* Interaction Callout */}
              <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono tracking-wide font-medium shadow-sm">
                  <span>⚡ Drag the yellow TEAR ▶ notch right across the foil to rip</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* PHASE 3: EXTRACTING CARDS (Severed pouch with rising card stack) */}
          {phase === 'EXTRACTING_CARDS' && (
            <motion.div
              key="phase-extracting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto w-full max-w-sm text-center"
            >
              {/* God Pack Celestial Flare Aura */}
              {isGodPack && (
                <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                  <div className="w-[850px] h-[850px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.65)_0%,transparent_70%)] animate-spin" />
                  <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-xs animate-pulse" />
                </div>
              )}

              {/* Severed Pouch & Rising Stack Container */}
              <div className="relative w-[320px] h-[480px] flex items-center justify-center">
                {/* Severed Top Crimp Flap Detaching Upwards */}
                <motion.div
                  initial={{ y: 0, rotateZ: 0, opacity: 1 }}
                  animate={{ y: -160, rotateZ: -12, opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                  className="absolute top-0 w-full h-[44px] bg-[#16161f] border-x border-t border-zinc-600 rounded-t-3xl shadow-2xl z-30"
                />

                {/* 5-Card Stack Rising from Severed Pouch Opening */}
                <motion.div
                  initial={{ y: 120, scale: 0.88, opacity: 0.5 }}
                  animate={{ y: -30, scale: 1, opacity: 1 }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-20 flex flex-col items-center"
                >
                  {/* Layered Card Stack Cascade (2px vertical offsets) */}
                  <div className="relative w-[280px] h-[390px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
                    {[4, 3, 2, 1, 0].map((stackIdx) => (
                      <div
                        key={stackIdx}
                        style={{
                          transform: `translate3d(${stackIdx * 1}px, ${stackIdx * 2}px, 0) scale(${
                            1 - stackIdx * 0.005
                          })`,
                          zIndex: 10 - stackIdx,
                        }}
                        className="absolute inset-0 rounded-2xl overflow-hidden shadow-md"
                      >
                        <TqqCardBack />
                      </div>
                    ))}
                  </div>

                  {/* Extraction Glow Ray */}
                  <div
                    className="absolute -inset-4 rounded-3xl opacity-60 blur-xl pointer-events-none -z-10 animate-pulse"
                    style={{
                      background: `radial-gradient(circle, ${theme.primaryColor} 0%, transparent 70%)`,
                    }}
                  />
                </motion.div>

                {/* Severed Bottom Pouch Base */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0.7 }}
                  className="absolute bottom-0 w-full h-[280px] rounded-b-3xl bg-gradient-to-b from-[#12131a] to-[#08090e] border-x border-b border-zinc-700/80 shadow-2xl z-10 flex flex-col justify-end p-4 text-center overflow-hidden"
                >
                  <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
                    {theme.japaneseTitle}
                  </div>
                  <div className="w-24 h-1 bg-amber-400/40 rounded-full mx-auto" />
                </motion.div>
              </div>

              {/* Status Banner */}
              <div className="mt-4 flex flex-col items-center gap-1 z-30">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>
                    {isGodPack ? '★ CELESTIAL GOD PACK DETECTED ★' : 'Cards Emerging from Foil...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* PHASE 4: PEELING REVEAL (Face-Down Suspense Stack & 3D Flip) */}
          {phase === 'PEELING_REVEAL' && cards.length > 0 && (
            <motion.div
              key="phase-peeling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto w-full max-w-2xl"
            >
              <SuspenseCardStack
                cards={cards}
                initialIndex={currentSession?.currentCardIndex ?? 0}
                isMuted={isMuted}
                onCardPeel={(_card, idx) => {
                  // Optionally sync peeled indices
                }}
                onCardRevealed={(_card, idx) => {
                  // Card revealed face-up
                }}
                onCeremonyComplete={() => {
                  setPhase('CEREMONY_SUMMARY');
                  soundEngine.play('reveal_rare', 0.65);
                }}
                onSkipAll={() => {
                  skipCeremony();
                  soundEngine.play('reveal_rare', 0.65);
                }}
              />
            </motion.div>
          )}

          {/* PHASE 5: CEREMONY SUMMARY (5-Card Arc/Fan Grid & Quick Actions) */}
          {phase === 'CEREMONY_SUMMARY' && (
            <motion.div
              key="phase-summary"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col items-center justify-between w-full max-w-6xl my-auto z-20"
            >
              <PackSummaryGrid
                cards={cards}
                isGodPack={isGodPack}
                packId={packId}
                previouslyDiscoveredCardDefIds={previouslyDiscoveredRef.current}
                onOpenAnother={handleOpenAnother}
                onClose={handleClose}
                canOpenAnother={canOpenAnother}
                packCost={packCost}
                isCooldownActive={isCooldownActive}
                cooldownRemaining={cooldownRemaining}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info branding */}
        <footer className="w-full max-w-5xl text-center text-[10px] text-zinc-600 font-mono pt-1">
          TQQ VAULT • AAA 3D BOOSTER CEREMONY ENGINE • v3.0.0
        </footer>
      </motion.div>
    </div>
  );
};

export default PackOpeningModal;
