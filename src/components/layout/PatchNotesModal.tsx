'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle2, Wrench } from 'lucide-react';
import { APP_VERSION, CURRENT_PATCH_NOTE } from '../../config/version';
import { soundEngine } from '../../utils/audioEngine';

export interface PatchNotesModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Single-Version Dynamic Patch Notes Modal
 *
 * Displays ONLY the active latest patch release notes in friendly, plain language.
 * Automatically pops up on mount when localStorage('TQQ_LAST_SEEN_VERSION') !== APP_VERSION.
 * Updates localStorage on dismiss and can be reopened manually from the top navigation bar.
 */
export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  // Auto-popup check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastSeen = localStorage.getItem('TQQ_LAST_SEEN_VERSION');
      if (lastSeen !== APP_VERSION) {
        setInternalOpen(true);
      }
    }
  }, []);

  // Determine effective open state (controlled prop takes priority if provided)
  const isModalOpen = isOpen !== undefined ? isOpen : internalOpen;

  // Handle dismiss: update localStorage, play audio chime, invoke callback
  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('TQQ_LAST_SEEN_VERSION', APP_VERSION);
    }
    setInternalOpen(false);
    soundEngine.playCoinPulseSound();
    onClose?.();
  };

  // Keyboard shortcut: Escape to dismiss
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="patch-notes-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none"
        >
          {/* Glassmorphic dark backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Compact Glassmorphic Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg max-h-[85vh] bg-[#0c0d14]/95 border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] backdrop-blur-md flex flex-col overflow-hidden text-zinc-100 z-10"
          >
            {/* Ambient gold glow in header */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Version Pill, Title & Dismiss (X) */}
            <div className="relative shrink-0 px-6 pt-5 pb-3.5 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold tracking-wider uppercase shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>v{CURRENT_PATCH_NOTE.version}</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {CURRENT_PATCH_NOTE.date}
                  </span>
                </div>
                <h2
                  id="patch-notes-title"
                  className="text-base sm:text-lg font-black text-white tracking-wide font-mono uppercase"
                >
                  {CURRENT_PATCH_NOTE.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close patch notes"
                className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body: Highlights & Fixes */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 font-sans text-sm">
              {/* ✨ What's New Section */}
              {CURRENT_PATCH_NOTE.highlights.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-mono text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>✨ What&apos;s New</span>
                  </div>
                  <ul className="space-y-2 pt-0.5">
                    {CURRENT_PATCH_NOTE.highlights.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed font-sans"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 🐛 Bug Fixes Section */}
              {CURRENT_PATCH_NOTE.fixes.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-300 font-mono text-xs font-black uppercase tracking-wider">
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    <span>🐛 Bug Fixes</span>
                  </div>
                  <ul className="space-y-2 pt-0.5">
                    {CURRENT_PATCH_NOTE.fixes.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed font-sans"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="relative shrink-0 px-6 py-4 border-t border-white/10 bg-[#090a0f] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-zinc-950 font-black font-mono text-xs uppercase tracking-wider transition active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Got it! Enter Vault</span>
                <span>🌸</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PatchNotesModal;
