'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArtsCard, ArtsCardType } from '../../types/battle';
import { playSound } from '../../utils/audio';
import { Sword, Flame, Shield, Sparkles, Heart } from 'lucide-react';

export interface ArtsHandDockProps {
  hand: ArtsCard[];
  focusEnergy: number;
  onPlayCard: (card: ArtsCard) => void;
  disabled?: boolean;
}

const CARD_TYPE_CONFIG: Record<
  ArtsCardType,
  {
    borderColor: string;
    bgColor: string;
    glowColor: string;
    badgeLabel: string;
    defaultTitle: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    sound: 'arts_strike' | 'arts_blast' | 'arts_support' | 'arts_ultimate';
    orbColor: string;
  }
> = {
  strike: {
    borderColor: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    glowColor: '0 0 16px rgba(239, 68, 68, 0.45)',
    badgeLabel: 'STRIKE',
    defaultTitle: 'Quick Answer',
    icon: Sword,
    sound: 'arts_strike',
    orbColor: '#ef4444',
  },
  blast: {
    borderColor: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    glowColor: '0 0 16px rgba(245, 158, 11, 0.45)',
    badgeLabel: 'BLAST',
    defaultTitle: 'Theorem Proof',
    icon: Flame,
    sound: 'arts_blast',
    orbColor: '#f59e0b',
  },
  support: {
    borderColor: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    glowColor: '0 0 16px rgba(16, 185, 129, 0.45)',
    badgeLabel: 'SUPPORT',
    defaultTitle: 'Study Break / Note Pass',
    icon: Shield,
    sound: 'arts_support',
    orbColor: '#10b981',
  },
  ultimate: {
    borderColor: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    glowColor: '0 0 24px rgba(6, 182, 212, 0.65)',
    badgeLabel: 'ULTIMATE',
    defaultTitle: 'Awakened Genius',
    icon: Sparkles,
    sound: 'arts_ultimate',
    orbColor: '#06b6d4',
  },
};

const SISTER_NAMES: Record<string, { name: string; color: string }> = {
  ichika: { name: 'Ichika', color: '#F59E0B' },
  nino: { name: 'Nino', color: '#EC4899' },
  miku: { name: 'Miku', color: '#06B6D4' },
  yotsuba: { name: 'Yotsuba', color: '#10B981' },
  itsuki: { name: 'Itsuki', color: '#EF4444' },
};

export const ArtsHandDock: React.FC<ArtsHandDockProps> = ({
  hand,
  focusEnergy,
  onPlayCard,
  disabled = false,
}) => {
  const [launchingCardId, setLaunchingCardId] = useState<string | null>(null);

  const handleCardClick = (card: ArtsCard) => {
    if (disabled || focusEnergy < card.cost || launchingCardId) return;

    const config = CARD_TYPE_CONFIG[card.type];
    playSound(config.sound, 0.85);

    setLaunchingCardId(card.id);
    setTimeout(() => {
      onPlayCard(card);
      setLaunchingCardId(null);
    }, 220);
  };

  return (
    <div className="relative flex items-center justify-center gap-2 sm:gap-3 md:gap-4 p-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl overflow-visible">
      <AnimatePresence mode="popLayout">
        {hand.map((card, idx) => {
          const config = CARD_TYPE_CONFIG[card.type];
          const canPlay = !disabled && focusEnergy >= card.cost;
          const isLaunching = launchingCardId === card.id;
          const sisterInfo = SISTER_NAMES[card.sisterId] || { name: card.sisterId, color: '#a1a1aa' };
          const IconComponent = config.icon;

          return (
            <motion.div
              key={card.id}
              layout
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={
                isLaunching
                  ? { y: -140, scale: 1.15, opacity: 0, rotate: -4 }
                  : { y: 0, scale: 1, opacity: 1, rotate: 0 }
              }
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 26,
                delay: idx * 0.04,
              }}
              whileHover={canPlay && !isLaunching ? { y: -10, scale: 1.05 } : {}}
              whileTap={canPlay && !isLaunching ? { scale: 0.95 } : {}}
              onClick={() => handleCardClick(card)}
              className={`relative w-28 sm:w-32 md:w-36 aspect-[63/88] rounded-xl overflow-hidden cursor-pointer select-none transition-shadow duration-200 flex flex-col justify-between p-1.5 border-2 ${
                canPlay
                  ? 'hover:brightness-110 active:brightness-125 ring-1'
                  : 'opacity-40 grayscale-[50%] cursor-not-allowed border-zinc-700'
              }`}
              style={{
                borderColor: canPlay ? config.borderColor : '#3f3f46',
                boxShadow: canPlay ? config.glowColor : 'none',
                background: `linear-gradient(180deg, #18181b 0%, #09090b 100%)`,
              }}
            >
              {/* Top Row: Focus Cost Glowing Orb & Card Type Badge */}
              <div className="flex items-center justify-between z-10">
                {/* Glowing Top-Left Orb */}
                <div
                  className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-mono font-black text-xs shadow-md border transition-all ${
                    canPlay
                      ? 'border-white/80 text-black animate-pulse'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500 shadow-none'
                  }`}
                  style={{
                    backgroundColor: canPlay ? config.orbColor : undefined,
                    boxShadow: canPlay ? `0 0 12px ${config.orbColor}` : undefined,
                  }}
                  title={`Focus Cost: ${card.cost} Ki`}
                >
                  {card.cost}
                </div>

                {/* Card Type Tag */}
                <div
                  className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border"
                  style={{
                    backgroundColor: config.bgColor,
                    borderColor: `${config.borderColor}66`,
                    color: config.borderColor,
                  }}
                >
                  <IconComponent className="w-2.5 h-2.5" />
                  <span>{config.badgeLabel}</span>
                </div>
              </div>

              {/* Card Illustration Thumbnail in Center */}
              <div className="relative flex-1 my-1 rounded-lg overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
                {card.artThumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.artThumbnail}
                    alt={card.title}
                    className="w-full h-full object-cover object-center filter contrast-110 brightness-95"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900/80">
                    <IconComponent className="w-8 h-8 opacity-40" style={{ color: config.borderColor }} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Sister Owner Indicator */}
                <div
                  className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded text-[8px] font-bold text-white shadow-sm flex items-center gap-1"
                  style={{ backgroundColor: `${sisterInfo.color}cc` }}
                >
                  <span>{sisterInfo.name}</span>
                </div>

                {/* Base Value Pill */}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/80 border border-white/20 text-[9px] font-black font-mono text-cyan-300">
                  {card.type === 'support' && card.healResolve
                    ? `+${card.healResolve} HP`
                    : card.type === 'ultimate'
                    ? '50+ PTS'
                    : `+${card.basePoints} PTS`}
                </div>
              </div>

              {/* Bottom Card Title & Effect Snippet */}
              <div className="z-10 bg-zinc-900/90 rounded-md p-1 border border-white/10 text-left">
                <div className="font-extrabold text-[10px] sm:text-[11px] text-white truncate leading-tight">
                  {card.title || config.defaultTitle}
                </div>
                <div className="text-[8px] text-zinc-400 line-clamp-1 leading-snug mt-0.5">
                  {card.effectDescription}
                </div>
              </div>

              {/* Visual playable energy sheen */}
              {canPlay && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none rounded-xl" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Hand Empty / Drawing Placeholder */}
      {hand.length === 0 && (
        <div className="py-8 px-12 text-center text-zinc-500 font-mono text-xs">
          <Sparkles className="w-6 h-6 mx-auto mb-1 animate-spin text-amber-500/60" />
          <span>Channeling Arts Cards...</span>
        </div>
      )}
    </div>
  );
};
