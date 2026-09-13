'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SisterBattleCard } from '../../types/battle';
import { playSound } from '../../utils/audio';

interface MangaSkillCutinProps {
  sister: SisterBattleCard;
  imageUrl?: string;
  onComplete: () => void;
}

interface CharacterCutinConfig {
  kanjiName: string;
  skillName: string;
  jpQuote: string;
  enQuote: string;
  primaryColor: string;
  accentGlow: string;
  fallbackImage: string;
}

const CUTIN_CONFIGS: Record<SisterBattleCard['characterId'], CharacterCutinConfig> = {
  ichika: {
    kanjiName: '中野 一花',
    skillName: '女優のブラフ (Actress Bluff)',
    jpQuote: '「女優の嘘…見破れる？」',
    enQuote: 'Can you see through an actress\'s lies?',
    primaryColor: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.6)',
    fallbackImage: '/cards/TQQ/Ichika/Ichika Tier ONE.jpg',
  },
  nino: {
    kanjiName: '中野 二乃',
    skillName: '毒舌リバウンド (Sharp Tongue)',
    jpQuote: '「あんたなんかに負けないわよ！」',
    enQuote: 'I won\'t lose to someone like you!',
    primaryColor: '#EC4899',
    accentGlow: 'rgba(236, 72, 153, 0.6)',
    fallbackImage: '/cards/TQQ/Nino/Nino Tier ONE.jpg',
  },
  miku: {
    kanjiName: '中野 三玖',
    skillName: '戦国戦術 (Sengoku Tactics)',
    jpQuote: '「武将の誇りにかけて！」',
    enQuote: 'On my pride as a Sengoku warrior!',
    primaryColor: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.6)',
    fallbackImage: '/cards/TQQ/Miku/Miku Tier ONE.jpg',
  },
  yotsuba: {
    kanjiName: '中野 四葉',
    skillName: '全力全開 (Full Effort)',
    jpQuote: '「ぜんりょく全開でがんばります！」',
    enQuote: 'I\'ll give it everything I\'ve got with full effort!',
    primaryColor: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.6)',
    fallbackImage: '/cards/TQQ/Yotsuba/Yotsuba Tier ONE.jpg',
  },
  itsuki: {
    kanjiName: '中野 五月',
    skillName: '大食い知識欲 (Brain-Food Appetite)',
    jpQuote: '「食欲も知識も、満腹までいただきます！」',
    enQuote: 'Appetite and knowledge—I will feast until satisfied!',
    primaryColor: '#EF4444',
    accentGlow: 'rgba(239, 68, 68, 0.6)',
    fallbackImage: '/cards/TQQ/Itsuki/Itsuki Tier ONE.jpg',
  },
};

export const MangaSkillCutin: React.FC<MangaSkillCutinProps> = ({
  sister,
  imageUrl,
  onComplete,
}) => {
  const config = CUTIN_CONFIGS[sister.characterId];
  const cardImage = imageUrl || config.fallbackImage;

  useEffect(() => {
    // Play anime slash audio on mount
    playSound('manga_slash', 0.95);

    // Strict 800ms duration per specification
    const timer = setTimeout(() => {
      onComplete();
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden pointer-events-none select-none"
    >
      {/* Dynamic Background Speed Lines */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(255,255,255,0.3) 19px, rgba(255,255,255,0.7) 20px)',
          backgroundSize: '200% 100%',
        }}
      />

      {/* Screen Flash Impulse */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="absolute inset-0 bg-white"
      />

      {/* Diagonal Manga Slash Panel (15-degree angled polygon slicing across screen) */}
      <motion.div
        initial={{ x: '-120%', skewX: -15 }}
        animate={{ x: '0%', skewX: -15 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24, mass: 0.8 }}
        className="relative w-[115vw] h-72 md:h-96 flex items-center overflow-hidden border-y-4"
        style={{
          borderColor: config.primaryColor,
          boxShadow: `0 0 45px ${config.accentGlow}`,
          background: `linear-gradient(135deg, #09090b 0%, #18181b 60%, ${config.primaryColor}22 100%)`,
        }}
      >
        {/* Manga Tone Screentone Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #ffffff 1px, transparent 1.5px)',
            backgroundSize: '8px 8px',
          }}
        />

        {/* Character Illustration with Manga High-Contrast Vignette */}
        <div className="absolute left-8 md:left-24 h-full w-72 md:w-96 overflow-hidden flex items-center justify-center transform skew-x-[15deg]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardImage}
            alt={sister.name}
            className="w-full h-full object-cover object-top contrast-125 saturate-150 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]"
          />
          {/* Duotone Overlay */}
          <div
            className="absolute inset-0 mix-blend-color opacity-40"
            style={{ backgroundColor: config.primaryColor }}
          />
        </div>

        {/* Manga Sound Effect Graphic (ズバッ / SLASH) */}
        <motion.div
          initial={{ scale: 2, opacity: 0, rotate: -25 }}
          animate={{ scale: 1, opacity: 1, rotate: -10 }}
          transition={{ delay: 0.1, duration: 0.2, ease: 'backOut' }}
          className="absolute left-64 md:left-96 top-4 font-black text-6xl md:text-8xl tracking-widest text-white/90 drop-shadow-[0_0_12px_rgba(0,0,0,0.9)] select-none italic transform skew-x-[15deg]"
          style={{
            WebkitTextStroke: `3px ${config.primaryColor}`,
          }}
        >
          ドォォン!!
        </motion.div>

        {/* Opposite-Sliding Japanese Quote & Skill Banner */}
        <motion.div
          initial={{ x: '120%' }}
          animate={{ x: '0%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.08 }}
          className="absolute right-8 md:right-28 text-right transform skew-x-[15deg] max-w-xl"
        >
          {/* Character Japanese Kanji & Skill Title */}
          <div className="flex items-center justify-end gap-3 mb-1">
            <span
              className="px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider text-black"
              style={{ backgroundColor: config.primaryColor }}
            >
              {config.kanjiName}
            </span>
            <span className="text-zinc-300 font-bold text-sm tracking-wide">
              {config.skillName}
            </span>
          </div>

          {/* Authentic Japanese Calligraphic Quote */}
          <h2
            className="text-2xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            style={{
              fontFamily: 'serif',
              textShadow: `0 0 20px ${config.primaryColor}88`,
            }}
          >
            {config.jpQuote}
          </h2>

          {/* English Localized Subtitle */}
          <p className="mt-1 text-xs md:text-sm font-semibold tracking-wider text-zinc-300 italic">
            &ldquo;{config.enQuote}&rdquo;
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
