'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { useGameStore } from '../../../store/useGameStore';
import { Award, Check, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

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
  const completeRestoration = useGameStore((state) => state.completeRestoration);

  // Animation phases: 'sliding_in' -> 'postit_slap' -> 'writing_checklist' -> 'ready'
  const [phase, setPhase] = useState<'sliding_in' | 'postit_slap' | 'writing' | 'ready'>('sliding_in');
  const [visibleLinesCount, setVisibleLinesCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Phase sequencing
  useEffect(() => {
    // 1. Sliding card into holder
    const timer1 = setTimeout(() => {
      soundEngine.playFoilRustle();
      setPhase('postit_slap');
    }, 700);

    return () => clearTimeout(timer1);
  }, []);

  useEffect(() => {
    if (phase === 'postit_slap') {
      const timer2 = setTimeout(() => {
        soundEngine.playFoilRustle();
        setPhase('writing');
      }, 500);
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
          }, 350);
        }
      }, 340);

      return () => clearInterval(interval);
    }
  }, [phase]);

  const handleSubmitReGrading = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      completeRestoration(card.id);
      soundEngine.playCleanChime();
      onFinish();
    } catch (err) {
      alert((err as Error).message);
      setIsSubmitting(false);
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
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center p-2 sm:p-4 my-auto">
        {/* Semi-Rigid Outer Holder Shell */}
        <div className="relative max-h-[340px] sm:max-h-[380px] md:max-h-[420px] aspect-[63/95] w-auto h-full rounded-xl border-2 border-cyan-400/40 bg-gradient-to-b from-cyan-950/20 via-white/5 to-black/40 shadow-2xl backdrop-blur-sm p-2.5 sm:p-3 pt-5 sm:pt-6 flex flex-col items-center justify-end overflow-hidden my-auto">
          {/* Card Saver Lip Flap */}
          <div className="absolute top-0 inset-x-0 h-5 border-b border-cyan-400/30 bg-white/10 flex items-center justify-center">
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
                card={card}
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
                className="absolute top-8 sm:top-10 left-3 sm:left-6 z-40 w-44 sm:w-52 p-3 sm:p-3.5 rounded-lg bg-[#fef08a] text-zinc-900 font-sans shadow-2xl border border-yellow-300"
                style={{
                  boxShadow: '0 15px 25px -5px rgba(0,0,0,0.5), 0 0 10px rgba(254,240,138,0.3)',
                }}
              >
                {/* Subtle Post-it Fold Corner */}
                <div className="absolute top-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-yellow-400/60 border-l border-b border-yellow-500/40 rounded-bl" />

                <div className="text-[9px] sm:text-[10px] font-mono font-black text-zinc-800 uppercase tracking-wider mb-1 sm:mb-1.5 pb-1 border-b border-zinc-800/20">
                  TQQ RESTORATION LOG
                </div>

                {/* Animated Checklist Items */}
                <div className="space-y-0.5 sm:space-y-1 font-mono text-[9px] sm:text-[10px]">
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
              <div className="w-full p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono text-center">
                ✨ Floor Locked: <strong>Min Grade 7.0</strong> • Subgrade Boosts Applied
              </div>

              <button
                type="button"
                onClick={handleSubmitReGrading}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Award className="w-5 h-5 text-black" />
                <span>SUBMIT FOR RE-GRADING (THE VAULT)</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
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
