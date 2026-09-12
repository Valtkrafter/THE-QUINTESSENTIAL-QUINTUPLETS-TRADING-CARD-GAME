'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { useGameStore } from '../../../store/useGameStore';
import {
  RARITY_BASE_VALUES,
  FINISH_MULTIPLIERS,
  calculateRegradeFee,
} from '../../../config/economy';
import { Award, ShieldCheck, ArrowRight, AlertTriangle, Save } from 'lucide-react';

interface SleeveStepProps {
  card: CardInstance;
  onFinish: () => void;
}

const CHECKLIST_ITEMS = [
  'All clean.',
  'Polish',
  'Waxed',
  'Micro scratch removal',
  'Flattened',
  'Grade Prep Certified',
];

export const SleeveStep: React.FC<SleeveStepProps> = ({ card, onFinish }) => {
  const yen = useGameStore((state) => state.yen);
  const inventory = useGameStore((state) => state.inventory);
  const submitForReGrading = useGameStore((state) => state.submitForReGrading);
  const completeRestoration = useGameStore((state) => state.completeRestoration);

  // Derive latest card instance
  const activeCard = inventory.find((c) => c.id === card.id) ?? card;

  // Valuation and Fee calculations
  const baseValue = RARITY_BASE_VALUES[activeCard.rarity] ?? 15;
  const finishMultiplier = FINISH_MULTIPLIERS[activeCard.finish] ?? 1.0;
  const regradeFee = calculateRegradeFee(activeCard);
  const canAfford = yen >= regradeFee;
  const deficit = Math.max(0, regradeFee - yen);

  // Animation phases: 'sliding_in' -> 'postit_slap' -> 'writing' -> 'ready'
  const [phase, setPhase] = useState<'sliding_in' | 'postit_slap' | 'writing' | 'ready'>('sliding_in');
  const [visibleLinesCount, setVisibleLinesCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Phase sequencing
  useEffect(() => {
    // 1. Sliding card into holder
    const timer1 = setTimeout(() => {
      soundEngine.playFoilRustle();
      setPhase('postit_slap');
    }, 600);

    return () => clearTimeout(timer1);
  }, []);

  useEffect(() => {
    if (phase === 'postit_slap') {
      const timer2 = setTimeout(() => {
        soundEngine.playFoilRustle();
        setPhase('writing');
      }, 450);
      return () => clearTimeout(timer2);
    }
  }, [phase]);

  // Sequential scribble writing
  useEffect(() => {
    if (phase === 'writing') {
      let currentLine = 0;
      const interval = setInterval(() => {
        currentLine += 1;
        setVisibleLinesCount(currentLine);
        soundEngine.playPenScribble();

        if (currentLine >= CHECKLIST_ITEMS.length) {
          clearInterval(interval);
          setTimeout(() => {
            soundEngine.playCleanChime();
            setPhase('ready');
          }, 300);
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Submit for paid re-grading with guaranteed Grade >= 7.0 and amber badge
  const handleSubmitReGrading = () => {
    if (isSubmitting || !canAfford) return;
    setIsSubmitting(true);

    try {
      submitForReGrading(activeCard.id);
      soundEngine.playCleanChime();
      onFinish();
    } catch (err) {
      alert((err as Error).message);
      setIsSubmitting(false);
    }
  };

  // Secondary option: Save to inventory as Grade Prep Certified without immediate re-grade
  const handleSaveAndReturn = () => {
    try {
      completeRestoration(activeCard.id);
      soundEngine.playFoilRustle();
      onFinish();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 1. TOP HEADER (Static & flex-shrink-0) */}
      <header className="flex-shrink-0 text-center z-10 pt-3 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Stage 5: Semi-Rigid Card Saver &amp; Post-It Checklist</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
          Sealed in Semi-Rigid Holder with Verified Checklist
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5">
          Card encapsulated into an archival Card Saver 1 holder with verified restoration checklist ready for Vault subgrade certification.
        </p>
      </header>

      {/* 2. INTERACTIVE WORKBENCH AREA (Flexible & Scaled with min-h-0) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center justify-center p-2 sm:p-4 my-auto gap-3">
        {/* Semi-Rigid Outer Holder Shell */}
        <div className="relative max-h-[280px] sm:max-h-[320px] md:max-h-[360px] aspect-[63/95] w-auto h-full rounded-xl border-2 border-cyan-400/40 bg-gradient-to-b from-cyan-950/20 via-white/5 to-black/40 shadow-2xl backdrop-blur-sm p-2 sm:p-3 pt-5 sm:pt-6 flex flex-col items-center justify-end overflow-hidden flex-shrink-0">
          {/* Card Saver Lip Flap */}
          <div className="absolute top-0 inset-x-0 h-5 border-b border-cyan-400/30 bg-white/10 flex items-center justify-center pointer-events-none">
            <span className="text-[8px] font-mono text-cyan-300/80 font-bold uppercase tracking-widest">
              CARD SAVER 1 • ARCHIVAL GRADE
            </span>
          </div>

          {/* Card Sliding Animation inside Holder */}
          <div className="relative w-full aspect-[63/88] rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            <motion.div
              initial={{ y: -80, opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full h-full"
            >
              <CardRenderer
                card={activeCard}
                size="full"
                interactive={false}
                showMarketValue={false}
                hideInternalFooter={true}
                showcaseMode={true}
              />
            </motion.div>
          </div>

          {/* Yellow Post-it Note Slapped onto Holder */}
          <AnimatePresence>
            {phase !== 'sliding_in' && (
              <motion.div
                initial={{ scale: 1.4, rotate: -15, opacity: 0 }}
                animate={{ scale: 1, rotate: -4, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="absolute top-8 sm:top-10 left-2 sm:left-4 z-40 w-44 sm:w-48 p-2.5 sm:p-3 rounded-lg bg-[#fef08a] text-zinc-900 font-sans shadow-2xl border border-yellow-300 pointer-events-none"
                style={{
                  boxShadow: '0 15px 25px -5px rgba(0,0,0,0.5), 0 0 10px rgba(254,240,138,0.3)',
                }}
              >
                {/* Post-it Fold Corner */}
                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-yellow-400/60 border-l border-b border-yellow-500/40 rounded-bl" />

                <div className="text-[9px] font-mono font-black text-zinc-800 uppercase tracking-wider mb-1 pb-1 border-b border-zinc-800/20">
                  TQQ RESTORATION LOG
                </div>

                {/* Animated Checklist Items */}
                <div className="space-y-0.5 font-mono text-[9px]">
                  {CHECKLIST_ITEMS.map((item, idx) => {
                    const isVisible = idx < visibleLinesCount;
                    return (
                      <div
                        key={item}
                        className={`flex items-center gap-1.5 transition-opacity duration-200 ${
                          isVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <span className="text-zinc-700 font-bold">✍️ [✓]</span>
                        <span className="font-bold text-zinc-900 leading-tight">
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Cost Breakdown Card */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-zinc-950/90 border border-white/10 rounded-2xl p-3 font-mono text-xs shadow-xl flex-shrink-0"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Restoration Cost Breakdown</span>
              <span className="text-amber-400 font-bold text-[10px]">Floor: Min Grade 7.0 (Crisp)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-zinc-400 block">Base Value</span>
                <span className="font-bold text-white">¥ {baseValue.toLocaleString()}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-zinc-400 block">Finish Multiplier</span>
                <span className="font-bold text-amber-300">x{finishMultiplier.toFixed(1)}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[9px] text-amber-300 block">Re-Cert Fee (50%)</span>
                <span className="font-bold text-amber-400">¥ {regradeFee.toLocaleString()}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] text-zinc-400 block">Your Balance</span>
                <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                  ¥ {yen.toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* 3. BOTTOM ACTION BAR (Strictly Pinned & Protected) */}
      <footer className="w-full flex-shrink-0 p-4 pt-2 pb-6 border-t border-[#232730] bg-[#0f1115]/90 backdrop-blur-md flex flex-col items-center gap-2 z-20">
        <div className="w-full max-w-md flex flex-col items-center gap-2">
          {phase === 'ready' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center gap-2"
            >
              {/* Primary Paid Re-Grading Button */}
              <button
                type="button"
                onClick={handleSubmitReGrading}
                disabled={!canAfford || isSubmitting}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition active:scale-98 flex items-center justify-center gap-2 shadow-lg ${
                  canAfford
                    ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:brightness-110 text-black shadow-amber-500/25 cursor-pointer font-black'
                    : 'bg-[#1c1e24] text-zinc-500 cursor-not-allowed border border-red-500/30'
                }`}
              >
                <Award className={`w-4 h-4 ${canAfford ? 'text-black' : 'text-zinc-500'}`} />
                <span>
                  {isSubmitting
                    ? 'CERTIFYING IN VAULT...'
                    : `SUBMIT FOR RE-GRADING (THE VAULT) • ¥ ${regradeFee.toLocaleString()}`}
                </span>
                {canAfford && <ArrowRight className="w-4 h-4 text-black" />}
              </button>

              {/* Insufficient Funds Warning & Deficit */}
              {!canAfford && (
                <div className="w-full flex flex-col gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-[10px]">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>
                      ⚠️ Insufficient Yen to certify. Deficit: <strong>-¥ {deficit.toLocaleString()}</strong>. The restored card will remain stored safely in its Semi-Rigid sleeve in your inventory until you can afford re-certification.
                    </span>
                  </div>

                  {/* Secondary Button: Save & Return to Vault */}
                  <button
                    type="button"
                    onClick={handleSaveAndReturn}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save &amp; Return to Vault</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2 py-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Signing verified inspection Post-it note...</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default SleeveStep;
