'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance, RestorationProgress } from '../../types/card';
import { useGameStore } from '../../store/useGameStore';
import { CrackStep } from './steps/CrackStep';
import { MicroscopeStep } from './steps/MicroscopeStep';
import { ClampPressStep } from './steps/ClampPressStep';
import { PolishStep } from './steps/PolishStep';
import { SleeveStep } from './steps/SleeveStep';
import { soundEngine } from '../../utils/audioEngine';
import {
  X,
  Wrench,
  Search,
  Gauge,
  Sparkles,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';

export interface RestorationWorkbenchModalProps {
  card: CardInstance | null;
  isOpen: boolean;
  onClose: () => void;
  onRestorationCompleted?: (cardId: string) => void;
}

type StepType = 'crack' | 'microscope' | 'clamp' | 'polish' | 'sleeve';

const STEPS_CONFIG: Array<{
  id: StepType;
  number: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'crack', number: 1, label: 'Crack & Extract', icon: Wrench },
  { id: 'microscope', number: 2, label: '50X Microscope', icon: Search },
  { id: 'clamp', number: 3, label: '24h Press', icon: Gauge },
  { id: 'polish', number: 4, label: 'Wax Polish', icon: Sparkles },
  { id: 'sleeve', number: 5, label: 'Certified Sleeve', icon: ShieldCheck },
];

export const RestorationWorkbenchModal: React.FC<RestorationWorkbenchModalProps> = ({
  card,
  isOpen,
  onClose,
  onRestorationCompleted,
}) => {
  const inventory = useGameStore((state) => state.inventory);
  const startRestoration = useGameStore((state) => state.startRestoration);
  const advanceRestorationStep = useGameStore((state) => state.advanceRestorationStep);

  // Derive latest card instance from inventory store
  const activeCard = card ? inventory.find((c) => c.id === card.id) ?? card : null;

  // Active step state
  const [currentStep, setCurrentStep] = useState<StepType>('crack');

  // Initialize restoration on mount if not active
  useEffect(() => {
    if (isOpen && activeCard) {
      if (!activeCard.restoration) {
        try {
          startRestoration(activeCard.id);
          setCurrentStep('crack');
        } catch (err) {
          console.error(err);
        }
      } else {
        const step = activeCard.restoration.step;
        if (step === 'completed') {
          setCurrentStep('sleeve');
        } else {
          setCurrentStep(step);
        }
      }
    }
  }, [isOpen, activeCard?.id]);

  if (!isOpen || !activeCard) return null;

  const currentStepIndex = STEPS_CONFIG.findIndex((s) => s.id === currentStep);

  const handleStepComplete = (nextStep: StepType, partialProgress?: Partial<RestorationProgress>) => {
    soundEngine.playCleanChime();
    advanceRestorationStep(activeCard.id, {
      step: nextStep,
      ...partialProgress,
    });
    setCurrentStep(nextStep);
  };

  const handleFinalFinish = () => {
    onRestorationCompleted?.(activeCard.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg select-none p-2 sm:p-4 overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Outer Studio Housing with Dark Self-Healing Cutting Mat Aesthetic */}
      <div
        className="relative w-full max-w-5xl h-full max-h-[92vh] bg-[#16181d] border border-[#232730] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col"
        style={{
          backgroundImage: `
            linear-gradient(to right, #232730 1px, transparent 1px),
            linear-gradient(to bottom, #232730 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      >
        {/* Soft Dark Vignette (Nitrile Glove Vignette Aesthetic) */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, transparent 45%, rgba(8, 9, 12, 0.75) 85%, #050608 100%)',
          }}
        />

        {/* Top Header Bar & Progress Breadcrumbs (Static & flex-shrink-0) */}
        <header className="relative z-10 flex-shrink-0 border-b border-white/10 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#0d0e12]/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          {/* Left: Specimen Metadata */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white tracking-wide">
                  {activeCard.name ?? 'Specimen Card'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                  {activeCard.rarity}
                </span>
                {activeCard.grade && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    ORIGINAL: {activeCard.grade.numericGrade}.0
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Restoration Lab • S/N: {activeCard.cardNumber ?? activeCard.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Center: Breadcrumbs (Hidden on tiny screens) */}
          <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px]">
            {STEPS_CONFIG.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-white/5 border-white/5 text-zinc-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span>{step.label}</span>
                  </div>
                  {idx < STEPS_CONFIG.length - 1 && (
                    <span className="text-zinc-600 font-bold">&rarr;</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Safe Exit Button */}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition active:scale-95 shadow"
            title="Safe Return (Preserves step progress)"
          >
            <span>Exit Lab</span>
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Modal Main Stage Container (Flexible & min-h-0) */}
        <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden w-full">
          <AnimatePresence mode="wait">
            {currentStep === 'crack' && (
              <motion.div
                key="step-crack"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full min-h-0 flex flex-col"
              >
                <CrackStep
                  card={activeCard}
                  onComplete={() =>
                    handleStepComplete('microscope', { crackedCleanly: true })
                  }
                />
              </motion.div>
            )}

            {currentStep === 'microscope' && (
              <motion.div
                key="step-microscope"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full min-h-0 flex flex-col"
              >
                <MicroscopeStep
                  card={activeCard}
                  onComplete={() =>
                    handleStepComplete('clamp', {
                      dustSpotsRemoved: 4,
                      checklist: {
                        allClean: true,
                        polished: false,
                        waxed: false,
                        microScratchRemoval: false,
                        flattened: false,
                        gradePrepCertified: false,
                      },
                    })
                  }
                />
              </motion.div>
            )}

            {currentStep === 'clamp' && (
              <motion.div
                key="step-clamp"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full min-h-0 flex flex-col"
              >
                <ClampPressStep
                  card={activeCard}
                  onComplete={() =>
                    handleStepComplete('polish', {
                      clamped: true,
                      checklist: {
                        allClean: true,
                        polished: false,
                        waxed: false,
                        microScratchRemoval: false,
                        flattened: true,
                        gradePrepCertified: false,
                      },
                    })
                  }
                />
              </motion.div>
            )}

            {currentStep === 'polish' && (
              <motion.div
                key="step-polish"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full min-h-0 flex flex-col"
              >
                <PolishStep
                  card={activeCard}
                  onComplete={() =>
                    handleStepComplete('sleeve', {
                      waxBuffed: true,
                      checklist: {
                        allClean: true,
                        polished: true,
                        waxed: true,
                        microScratchRemoval: true,
                        flattened: true,
                        gradePrepCertified: false,
                      },
                    })
                  }
                />
              </motion.div>
            )}

            {currentStep === 'sleeve' && (
              <motion.div
                key="step-sleeve"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full min-h-0 flex flex-col"
              >
                <SleeveStep
                  card={activeCard}
                  onFinish={handleFinalFinish}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default RestorationWorkbenchModal;
