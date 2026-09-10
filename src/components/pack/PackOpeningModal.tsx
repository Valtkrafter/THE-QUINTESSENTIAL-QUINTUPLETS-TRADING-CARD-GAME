'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CardInstance, PackId, Rarity } from '../../types/card';
import { PACKS_CONFIG, calculateCardMarketValue, calculateDustYield } from '../../config/economy';
import { useGameStore } from '../../store/useGameStore';
import { BoosterPack3D, PACK_THEMES } from './BoosterPack3D';
import { TearMechanism } from './TearMechanism';
import { CardRenderer, CHARACTER_THEMES, FINISH_LABELS, RARITY_BADGES } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Flame,
  ChevronRight,
  Eye,
} from 'lucide-react';

export interface PackOpeningModalProps {
  isOpen: boolean;
  packId: PackId;
  onClose: () => void;
  onOpenAnother?: (packId: PackId) => void;
}

type CeremonyStage = 'INSPECT' | 'TEARING' | 'PEELING' | 'SUMMARY';

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  isOpen,
  packId,
  onClose,
  onOpenAnother,
}) => {
  const [stage, setStage] = useState<CeremonyStage>('INSPECT');
  const [pulledCards, setPulledCards] = useState<CardInstance[]>([]);
  const [isGodPack, setIsGodPack] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // 0 to 4
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false, false, false]);
  const [tearProgress, setTearProgress] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [dustedCardIds, setDustedCardIds] = useState<string[]>([]);
  const [dustToast, setDustToast] = useState<number | null>(null);

  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const openPackStore = useGameStore((state) => state.openPack);
  const dustCardStore = useGameStore((state) => state.dustCard);

  const packConfig = PACKS_CONFIG[packId];
  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;

  // Reset state whenever modal opens or pack changes
  useEffect(() => {
    if (isOpen) {
      setStage('INSPECT');
      setPulledCards([]);
      setIsGodPack(false);
      setCurrentCardIndex(0);
      setRevealedCards([false, false, false, false, false]);
      setTearProgress(0);
      setIsShaking(false);
      setDustedCardIds([]);
      setDustToast(null);
    }
  }, [isOpen, packId]);

  // Handle Tear Complete: executes the actual store pack opening
  const handleTearComplete = useCallback(() => {
    setIsShaking(true);
    setStage('TEARING');

    setTimeout(() => {
      setIsShaking(false);
    }, 600);

    try {
      // Execute atomic pack opening in Zustand store
      const result = openPackStore(packId);
      setPulledCards(result.cards);
      setIsGodPack(result.isGodPack);

      // Transition to Peeling phase after brief tear-off delay
      setTimeout(() => {
        setStage('PEELING');
        setCurrentCardIndex(0);

        // Check if first card has high rarity tell
        if (result.cards.length > 0) {
          const firstRarity = result.cards[0].rarity;
          if (firstRarity === 'SR' || firstRarity === 'UR' || firstRarity === 'SEC' || firstRarity === 'MR') {
            soundEngine.playAnticipationSound(firstRarity);
          }
        }
      }, 700);
    } catch (err) {
      console.error('Failed to open pack:', err);
      onClose();
    }
  }, [openPackStore, packId, onClose]);

  // Current card being peeled
  const activeCard: CardInstance | undefined = pulledCards[currentCardIndex];
  const isCardRevealed = revealedCards[currentCardIndex];

  // Reveal current card
  const handleRevealCurrentCard = useCallback(() => {
    if (!activeCard || isCardRevealed) return;

    soundEngine.playRevealSound(activeCard.rarity, isGodPack);

    const updated = [...revealedCards];
    updated[currentCardIndex] = true;
    setRevealedCards(updated);

    // If last card revealed, transition to summary after brief suspense
    if (currentCardIndex >= pulledCards.length - 1) {
      setTimeout(() => {
        setStage('SUMMARY');
        soundEngine.playSparkleSound();
      }, 1200);
    }
  }, [activeCard, currentCardIndex, isCardRevealed, isGodPack, pulledCards.length, revealedCards]);

  // Next card in peeling stack
  const handleNextCard = useCallback(() => {
    if (currentCardIndex < pulledCards.length - 1) {
      const nextIdx = currentCardIndex + 1;
      setCurrentCardIndex(nextIdx);

      const nextCard = pulledCards[nextIdx];
      if (nextCard && (nextCard.rarity === 'SR' || nextCard.rarity === 'UR' || nextCard.rarity === 'SEC' || nextCard.rarity === 'MR')) {
        soundEngine.playAnticipationSound(nextCard.rarity);
      }
    } else {
      setStage('SUMMARY');
    }
  }, [currentCardIndex, pulledCards]);

  // Reveal all cards instantly
  const handleRevealAll = useCallback(() => {
    setRevealedCards(pulledCards.map(() => true));
    setStage('SUMMARY');
    soundEngine.playSparkleSound();
  }, [pulledCards]);

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

  // Anticipation Tell Flags for currently active card
  const anticipationTell = useMemo(() => {
    if (!activeCard || isCardRevealed || stage !== 'PEELING') return null;
    if (isGodPack) return 'GOD_PACK';
    if (activeCard.rarity === 'MR' || activeCard.rarity === 'SEC' || activeCard.rarity === 'UR') {
      return 'ULTRA';
    }
    if (activeCard.rarity === 'SR') return 'SUPER';
    if (activeCard.rarity === 'R') return 'RARE';
    return null;
  }, [activeCard, isCardRevealed, isGodPack, stage]);

  // Highest rarity pulled for summary badge
  const highestRarityPulled = useMemo(() => {
    const hierarchy: Record<Rarity, number> = { C: 1, UC: 2, R: 3, SR: 4, UR: 5, SEC: 6, MR: 7 };
    let highest: Rarity = 'C';
    for (const c of pulledCards) {
      if (hierarchy[c.rarity] > hierarchy[highest]) {
        highest = c.rarity;
      }
    }
    return highest;
  }, [pulledCards]);

  const totalPackMarketValue = useMemo(() => {
    return pulledCards.reduce((acc, c) => acc + calculateCardMarketValue(c), 0);
  }, [pulledCards]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl select-none overflow-hidden animate-fadeIn">
      {/* Dynamic Screen Shake on Tear */}
      <div
        className={`w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 transition-transform duration-100 ${
          isShaking ? 'translate-x-1 -translate-y-1 scale-[1.01]' : ''
        }`}
      >
        {/* ============================================================
            CEREMONY HEADER: Balances, Title, Audio & Close
            ============================================================ */}
        <header className="w-full max-w-6xl flex items-center justify-between z-40">
          {/* Player Currency Hub */}
          <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full backdrop-blur">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 font-mono">
              <span>¥</span>
              <span>{yen.toLocaleString()}</span>
            </div>
            <div className="w-px h-3.5 bg-zinc-700" />
            <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 font-mono">
              <Sparkles className="w-3 h-3" />
              <span>{stardust.toLocaleString()}</span>
            </div>
          </div>

          {/* Pack Ceremonial Title */}
          <div className="text-center hidden sm:block">
            <h2 className="text-sm font-extrabold tracking-wider uppercase text-zinc-300">
              {theme.name}
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              {stage === 'INSPECT' && 'TEAR TO OPEN'}
              {stage === 'TEARING' && 'TEARING FOIL...'}
              {stage === 'PEELING' && `CARD ${currentCardIndex + 1} OF ${pulledCards.length}`}
              {stage === 'SUMMARY' && 'PACK OPENING COMPLETED'}
            </span>
          </div>

          {/* Controls: Mute & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const muted = soundEngine.toggleMute();
                setIsMuted(muted);
              }}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Close Pack Ceremony"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ============================================================
            CEREMONY STAGE 1: FLOATING PACK & SWIPE TO TEAR
            ============================================================ */}
        {stage === 'INSPECT' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full relative z-20 my-auto">
            {/* 3D Floating Booster Pack */}
            <div className="mb-4">
              <BoosterPack3D
                packId={packId}
                interactive={true}
                isFloating={true}
                tearProgress={tearProgress}
              />
            </div>

            {/* Swipe to Tear Mechanism */}
            <div className="w-full">
              <TearMechanism
                onTearProgress={(p) => setTearProgress(p)}
                onTearComplete={handleTearComplete}
                accentColor={theme.primaryColor}
              />
            </div>

            <p className="text-[11px] text-zinc-500 text-center mt-2 font-mono">
              Grab the cutter and slide firmly across the perforated strip
            </p>
          </div>
        )}

        {/* ============================================================
            CEREMONY STAGE 2: TEARING IN PROGRESS
            ============================================================ */}
        {stage === 'TEARING' && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto">
            <div className="animate-pulse flex flex-col items-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border border-white/40 shadow-2xl"
                style={{
                  background: `radial-gradient(circle, ${theme.primaryColor} 0%, transparent 70%)`,
                  boxShadow: `0 0 50px ${theme.accentGlow}`,
                }}
              >
                <Sparkles className="w-12 h-12 text-white animate-spin" />
              </div>
              <h3 className="text-xl font-black text-amber-300 uppercase tracking-widest">
                Opening Pack...
              </h3>
            </div>
          </div>
        )}

        {/* ============================================================
            CEREMONY STAGE 3: SLOW-ROLL CARD PEELING & ANTICIPATION FX
            ============================================================ */}
        {stage === 'PEELING' && activeCard && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-20 my-auto w-full max-w-md">
            
            {/* ANTICIPATION LIGHTNING / CORONA OVERLAYS */}
            {anticipationTell === 'ULTRA' && (
              <div className="fixed inset-0 pointer-events-none z-10 bg-black/85 flex items-center justify-center transition-all duration-500">
                {/* Arc lightning glow */}
                <div
                  className="w-[340px] h-[480px] rounded-2xl border-2 border-white animate-pulse"
                  style={{
                    boxShadow: `0 0 60px ${
                      CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B'
                    }`,
                    borderColor: CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B',
                  }}
                />
              </div>
            )}

            {anticipationTell === 'SUPER' && (
              <div className="fixed inset-0 pointer-events-none z-10 bg-black/50 flex items-center justify-center transition-all duration-300">
                <div className="w-[330px] h-[470px] rounded-2xl border border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.7)] animate-pulse" />
              </div>
            )}

            {anticipationTell === 'GOD_PACK' && (
              <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
                <div className="w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.5)_0%,transparent_70%)] animate-spin" />
              </div>
            )}

            {/* PEELING STAGE STACK */}
            <div className="relative z-20 flex flex-col items-center">
              
              {/* CARD DECK BACK OR REVEALED CARD */}
              {!isCardRevealed ? (
                <div
                  onClick={handleRevealCurrentCard}
                  className="card-perspective-wrapper cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {/* AUTHENTIC TQQ VAULT CARD BACK */}
                  <div
                    className="relative w-[280px] h-[391px] sm:w-[320px] sm:h-[447px] rounded-xl overflow-hidden border-2 border-amber-400/80 bg-zinc-950 shadow-2xl flex flex-col items-center justify-between p-4"
                    style={{
                      boxShadow:
                        anticipationTell === 'ULTRA'
                          ? `0 0 45px ${
                              CHARACTER_THEMES[activeCard.characterId]?.accent ?? '#F59E0B'
                            }`
                          : anticipationTell === 'SUPER'
                          ? '0 0 30px rgba(168,85,247,0.7)'
                          : '0 20px 40px -10px rgba(0,0,0,0.8)',
                    }}
                  >
                    {/* Dark Nebula Texture */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-zinc-950 to-slate-950 opacity-90" />

                    {/* Geometric Golden Lattice */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage:
                          'radial-gradient(#F59E0B 1px, transparent 1px)',
                        backgroundSize: '18px 18px',
                      }}
                    />

                    {/* Top Crest */}
                    <div className="relative z-10 text-center">
                      <span className="text-[10px] tracking-widest font-black uppercase text-amber-400">
                        TQQ VAULT
                      </span>
                      <div className="text-[8px] text-zinc-400 font-serif">
                        五等分の花嫁
                      </div>
                    </div>

                    {/* Central 5-Sister Golden Pentagram Crest */}
                    <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                      <div className="w-24 h-24 rounded-full border-2 border-amber-400/80 flex items-center justify-center bg-black/60 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                        <span className="text-4xl filter drop-shadow">🦋</span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-300 mt-2 tracking-wider">
                        TAP TO REVEAL
                      </span>
                    </div>

                    {/* Bottom Sister Icons */}
                    <div className="relative z-10 flex items-center gap-1.5 text-xs opacity-75">
                      <span>💛</span>
                      <span>🦋</span>
                      <span>🎧</span>
                      <span>🍀</span>
                      <span>⭐</span>
                    </div>

                    {/* Specular Laminate Reflection */}
                    <div className="card-specular-glare" />
                  </div>
                </div>
              ) : (
                /* REVEALED CARD (Face-Up) */
                <div className="flex flex-col items-center animate-flipIn">
                  <CardRenderer
                    card={activeCard}
                    size="md"
                    interactive={true}
                    showMarketValue={true}
                  />
                </div>
              )}

              {/* CARD PROGRESS INDICATOR & CONTROLS */}
              <div className="mt-6 flex items-center gap-4 z-30">
                {isCardRevealed ? (
                  <button
                    onClick={handleNextCard}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition active:scale-95"
                  >
                    <span>{currentCardIndex < pulledCards.length - 1 ? 'Next Card' : 'View Summary'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleRevealCurrentCard}
                    className="px-6 py-2.5 rounded-full bg-zinc-900 border border-amber-400/60 hover:bg-zinc-800 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Flip Card</span>
                  </button>
                )}

                <button
                  onClick={handleRevealAll}
                  className="px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold transition"
                >
                  Skip All
                </button>
              </div>

              {/* Card Pips */}
              <div className="flex items-center gap-2 mt-3">
                {pulledCards.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentCardIndex
                        ? 'w-6 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : revealedCards[idx]
                        ? 'bg-zinc-600'
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            CEREMONY STAGE 4: SUMMARY & QUICK-ACTION GRID
            ============================================================ */}
        {stage === 'SUMMARY' && (
          <div className="flex-1 flex flex-col items-center justify-between w-full max-w-6xl my-auto z-20 py-2">
            
            {/* Summary Banner */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Opening Completed</span>
                {isGodPack && <span className="text-amber-300 font-black">• GOD PACK!</span>}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Pack Pull Summary
              </h2>

              <p className="text-xs text-zinc-400 font-mono mt-1">
                Highest Rarity: <span className="font-bold text-amber-400">{highestRarityPulled}</span> • Total Market Value: <span className="font-bold text-amber-400">{totalPackMarketValue.toLocaleString()} ¥</span>
              </p>
            </div>

            {/* Dust Toast Notification */}
            {dustToast !== null && (
              <div className="mb-3 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold font-mono animate-bounce flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dusted Common & Uncommon cards for +{dustToast} Stardust!</span>
              </div>
            )}

            {/* 5-Card Grid in Full 3D Glory */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 my-auto w-full">
              {pulledCards.map((card, index) => {
                const isDusted = dustedCardIds.includes(card.id);
                const rarityStyle = RARITY_BADGES[card.rarity] ?? RARITY_BADGES.C;

                return (
                  <div
                    key={card.id}
                    className={`flex flex-col items-center p-2 rounded-2xl bg-zinc-900/50 border border-zinc-800 relative transition-all ${
                      isDusted ? 'opacity-35 grayscale' : 'hover:border-zinc-600'
                    }`}
                  >
                    {/* Header Tag */}
                    <div className="w-full flex items-center justify-between text-[10px] mb-1.5 font-mono">
                      <span className="text-zinc-500">#{index + 1}</span>
                      <span
                        className={`px-1 py-0.2 rounded font-black border ${rarityStyle.bgClass} ${rarityStyle.textClass} ${rarityStyle.borderClass}`}
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                        <span className="px-2 py-1 rounded bg-zinc-900 text-cyan-400 font-mono text-xs font-black border border-cyan-500/40">
                          DUSTED
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="w-full max-w-2xl mt-6 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-3">
              {/* Quick Dust Non-Rares */}
              <button
                onClick={handleQuickDustNonRares}
                disabled={pulledCards.every((c) => c.rarity !== 'C' && c.rarity !== 'UC') || dustedCardIds.length >= pulledCards.filter((c) => c.rarity === 'C' || c.rarity === 'UC').length}
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

              {/* Keep All / Done */}
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Keep All & Return</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info banner */}
        <footer className="w-full max-w-6xl text-center text-[10px] text-zinc-600 font-mono mt-2">
          TQQ VAULT • BOOSTER PACK CEREMONY ENGINE • STAGE 3
        </footer>
      </div>
    </div>
  );
};

export default PackOpeningModal;
