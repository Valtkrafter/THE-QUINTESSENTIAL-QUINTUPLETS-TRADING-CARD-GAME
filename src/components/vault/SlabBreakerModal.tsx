'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileDrawer } from '../ui/MobileDrawer';
import { CardInstance } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { GradingSlab } from '../card/GradingSlab';
import { CardRenderer } from '../card/CardRenderer';
import { soundEngine } from '../../utils/audioEngine';
import { hapticLightTap, hapticSlabCrunch } from '../../utils/haptics';
import {
  Hammer,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

export interface SlabBreakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCard?: CardInstance | null;
  onCardUnslabbed?: (unslabbedCard: CardInstance) => void;
}

export const SlabBreakerModal: React.FC<SlabBreakerModalProps> = ({
  isOpen,
  onClose,
  preselectedCard,
  onCardUnslabbed,
}) => {
  const inventory = useGameStore((state) => state.inventory);
  const crackSlab = useGameStore((state) => state.crackSlab);

  // Filter for graded slabs in inventory
  const gradedCards = useMemo(() => {
    return inventory.filter((c) => Boolean(c.grade) && !c.isLocked);
  }, [inventory]);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    preselectedCard?.grade ? preselectedCard.id : null
  );

  const [isCracking, setIsCracking] = useState<boolean>(false);
  const [showCrackedFx, setShowCrackedFx] = useState<boolean>(false);
  const [unslabbedResult, setUnslabbedResult] = useState<CardInstance | null>(null);

  // Sync preselectedCard
  React.useEffect(() => {
    if (preselectedCard?.grade) {
      setSelectedCardId(preselectedCard.id);
    } else if (gradedCards.length > 0 && !selectedCardId) {
      setSelectedCardId(gradedCards[0].id);
    }
  }, [preselectedCard, gradedCards, selectedCardId]);

  const activeCard = useMemo(() => {
    if (unslabbedResult) return unslabbedResult;
    return gradedCards.find((c) => c.id === selectedCardId) ?? null;
  }, [gradedCards, selectedCardId, unslabbedResult]);

  const handleCrackSlab = async () => {
    if (!activeCard || !activeCard.grade || isCracking) return;

    setIsCracking(true);
    setShowCrackedFx(true);

    // Haptic & Sound profile
    hapticSlabCrunch();
    soundEngine.playSlabCrackSound();

    await new Promise((r) => setTimeout(r, 600));

    try {
      const updated = crackSlab(activeCard.id);
      setUnslabbedResult(updated);
      onCardUnslabbed?.(updated);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsCracking(false);
      setTimeout(() => setShowCrackedFx(false), 800);
    }
  };

  const handleReset = () => {
    setUnslabbedResult(null);
    setShowCrackedFx(false);
    if (gradedCards.length > 0) {
      setSelectedCardId(gradedCards[0].id);
    } else {
      setSelectedCardId(null);
    }
  };

  return (
    <MobileDrawer isOpen={isOpen} onClose={onClose} title="Slab Breaker & Extraction">
      <div className="space-y-4 pb-6 font-sans select-none">
        {/* Header Alert */}
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Permanent De-Certification Warning</span>
            <span className="text-[11px] text-amber-300/80 leading-relaxed">
              Cracking an acrylic slab permanently removes the BGS certified grade plate and restores the card to raw cardstock.
            </span>
          </div>
        </div>

        {/* Graded Card Selection Carousel (if multiple slabs owned) */}
        {!unslabbedResult && gradedCards.length > 1 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">
              Select Slab to Crack ({gradedCards.length} Slabs)
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {gradedCards.map((c) => {
                const isSelected = selectedCardId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      hapticLightTap();
                      setSelectedCardId(c.id);
                    }}
                    className={`w-20 shrink-0 aspect-[82/130] rounded-xl overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-amber-400 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <GradingSlab card={c} size="sm" interactive={false} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* The Cracking Stage */}
        <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-900/60 border border-white/10 min-h-[360px] overflow-hidden">
          {activeCard ? (
            <div className="relative flex flex-col items-center">
              {/* Glass Fracture Visual Effect */}
              {showCrackedFx && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
                >
                  <div className="w-64 h-96 border-4 border-white/80 rounded-2xl bg-white/20 backdrop-invert animate-ping" />
                </motion.div>
              )}

              {/* Card / Slab Container */}
              {unslabbedResult ? (
                <div className="flex flex-col items-center space-y-3 animate-fadeIn">
                  <div className="p-2 rounded-2xl bg-zinc-950/80 border border-emerald-500/40 shadow-2xl">
                    <CardRenderer card={unslabbedResult} size="md" interactive={true} />
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-xs font-black text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Slab Cracked! Restored to Raw Cardstock
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Card is now eligible for resubmission or trading.
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Crack Another Slab</span>
                  </button>
                </div>
              ) : (
                <div className="transition-transform duration-200">
                  <GradingSlab card={activeCard} size="md" interactive={!isCracking} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 text-zinc-500 text-xs font-mono">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <span>No certified slabs available to crack in inventory.</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!unslabbedResult && activeCard?.grade && (
          <button
            onClick={handleCrackSlab}
            disabled={isCracking}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:brightness-110 text-white font-mono text-xs font-black uppercase tracking-wider transition active:scale-98 shadow-xl shadow-red-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <Hammer className="w-4 h-4" />
            <span>{isCracking ? 'Hydraulic Vice Cracking Slab...' : 'Crack Acrylic Slab'}</span>
          </button>
        )}
      </div>
    </MobileDrawer>
  );
};

export default SlabBreakerModal;
