'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Coins,
  Store,
  BookOpen,
  Crown,
  Zap,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { soundEngine } from '../../utils/audioEngine';
import { CURRENT_PATCH_VERSION } from '../../store/useGameStore';

export interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PatchFeatureItem {
  icon: React.ReactNode;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  bullets: string[];
}

const PATCH_FEATURES: PatchFeatureItem[] = [
  {
    icon: <Crown className="w-5 h-5 text-amber-400" />,
    tag: 'NEW FEATURE',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    title: '5-Slot Acrylic Showcase (Vitrine)',
    description:
      'A curved 3D acrylic pedestal stage built against Obsidian dark (#08080a) with dynamic overhead character spotlights matched to each sister\'s signature aura.',
    bullets: [
      'Slot any 5 cards (raw or graded) from your collection to activate pedestals.',
      'Quintuplet Harmony (+50%): Slot all 5 sisters (Ichika, Nino, Miku, Yotsuba, Itsuki).',
      'Mono-Waifu Obsession (+30%): Slot 5 copies of your favorite sister.',
      'Vault Excellence (+100%): Slot 5 Grade ≥ 9 BGS Slabs (Mint 9, Gem Mint 10, Black Label).',
    ],
  },
  {
    icon: <Coins className="w-5 h-5 text-emerald-400" />,
    tag: 'ECONOMY REBALANCE',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    title: 'Showcase-Exclusive Idle Yield',
    description:
      'Passive income has been centralized exclusively into the 5-Slot Showcase. Legacy binder yield has been completely purged.',
    bullets: [
      'Guaranteed base floor of 60 ¥/min (1 ¥/sec) per slotted card + 0.02% card valuation bonus.',
      '12-hour offline accrual cap (720 minutes) accumulates earnings while you are away.',
      'Tab throttling safeguard uses real-time epoch timestamps to prevent background timer drops.',
    ],
  },
  {
    icon: <BookOpen className="w-5 h-5 text-blue-400" />,
    tag: 'COLLECTION EXPANSION',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    title: '42-Card Master Card-Dex',
    description:
      'The comprehensive master catalog now tracks exactly 42 unique cards: 35 Nakano Sisters (5 sisters × 7 rarities) + 7 authentic Support character cards.',
    bullets: [
      'Authentic Support card rarities: Fuutarou (C, R, UR), Raiha (UC, SR), Maruo (SEC), Yusuke Takeda (R).',
      'Mystery silhouette shaders with animated smokey particles for unobtained cards.',
      'Discovered cards retain your highest unlocked surface finish and best BGS grade forever.',
      'Attaining full 42/42 collection permanently unlocks the 100% Golden Holographic Shimmer Aura!',
    ],
  },
  {
    icon: <Shield className="w-5 h-5 text-purple-400" />,
    tag: 'VISUAL OVERHAUL',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    title: 'BGS-Style Grading Slabs 2.0',
    description:
      'Rebuilt with modern CSS container queries and authentic 82:130 BGS geometry for razor-sharp rendering at any resolution.',
    bullets: [
      'Inner card well maintains authentic uncompressed 63:88 proportions with zero artwork clipping.',
      'Fluid typography scales headers, titles, and subgrades proportionately in grids, drawers, and modal views.',
      'Heavy acrylic frosted casing with authentic subgrade score plates and Quad 10 Black Label styling.',
    ],
  },
  {
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    tag: 'PHYSICS & CONTROLS',
    tagColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    title: 'Deterministic Card Peel Engine',
    description:
      'Overhauled card gesture and drag unmounting in the pack opening ceremony for a seamless tactile reveal.',
    bullets: [
      'Eliminated stuck or orphaned cards: peeled cards smoothly fly off-screen and cleanly unmount.',
      'Summary view only renders once the 5th card finishes peeling.',
      'Instant pre-roll "Open Another" resets directly to Frame 0 with zero micro-stutters.',
    ],
  },
  {
    icon: <Store className="w-5 h-5 text-cyan-400" />,
    tag: 'MARKETPLACE',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    title: 'Daily Singles Kiosk & Bulk Liquidation',
    description:
      'New ways to acquire targeted cards and liquidate unwanted duplicates quickly and safely.',
    bullets: [
      'Singles Kiosk rotates 4 curated cards every 24 hours with manual Stardust (★) rerolls.',
      'Bulk Liquidation allows instant 1-click liquidation for unlocked raw Common (C) and Uncommon (UC) duplicates.',
      'Safety guardrail confirmation with countdown timer protects high-value (≥ UR or Grade ≥ 9) cards from accidental sales.',
    ],
  },
];

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundEngine.playFoilRustle();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleClose = () => {
    soundEngine.playCoinPulseSound();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="patch-notes-title"
          aria-describedby="patch-notes-subtitle"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden"
        >
          {/* Backdrop with frosted dark glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-2xl max-h-[88vh] bg-[#0c0d14] border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden text-zinc-100 z-10"
          >
            {/* Ambient gold glow in top header */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative shrink-0 px-6 pt-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold tracking-wider uppercase">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Patch Notes {CURRENT_PATCH_VERSION}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono text-[10px]">
                    Major Update
                  </span>
                </div>
                <h2
                  id="patch-notes-title"
                  className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2 font-mono uppercase"
                >
                  <span>Vitrine Showcase & Master Dex</span>
                  <span className="text-amber-400">🌸</span>
                </h2>
                <p
                  id="patch-notes-subtitle"
                  className="text-xs text-zinc-400 leading-relaxed font-sans"
                >
                  Welcome to the expanded TQQ Vault! Discover new systems, enhanced grading aesthetics, and showcase mechanics below:
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleClose}
                aria-label="Close patch notes"
                className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Features Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm font-sans scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {PATCH_FEATURES.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-amber-500/30 transition-colors space-y-2.5"
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                        {feat.icon}
                      </div>
                      <h3 className="font-bold text-white text-sm sm:text-base font-mono">
                        {feat.title}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${feat.tagColor}`}
                    >
                      {feat.tag}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {feat.description}
                  </p>

                  {/* Bullets */}
                  <ul className="space-y-1.5 pt-1">
                    {feat.bullets.map((bullet, bIdx) => (
                      <li
                        key={bIdx}
                        className="flex items-start gap-2 text-xs text-zinc-400 leading-normal"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Sticky Action Footer */}
            <div className="relative shrink-0 px-6 py-4 border-t border-white/10 bg-[#090a0f] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-zinc-500 font-mono text-center sm:text-left">
                Re-open notes anytime via the <span className="text-amber-400 font-bold">v0.2.0 Notes</span> button in the header.
              </span>

              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black font-mono text-xs uppercase tracking-wider transition active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
              >
                <span>Got It, Let&apos;s Collect!</span>
                <span>🌸</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
