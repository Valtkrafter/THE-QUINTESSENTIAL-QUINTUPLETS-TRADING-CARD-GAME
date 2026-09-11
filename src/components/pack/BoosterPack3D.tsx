'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PackId } from '../../types/card';
import { PACKS_CONFIG } from '../../config/economy';
import { soundEngine } from '../../utils/audioEngine';
import { useSmoothTilt } from '../../hooks/useSmoothTilt';

export interface BoosterPack3DProps {
  packId: PackId;
  interactive?: boolean;
  isFloating?: boolean;
  className?: string;
  onClick?: () => void;
  isTorn?: boolean;
  tearProgress?: number; // 0 to 100
  disableTilt?: boolean;
  isPaused?: boolean;
  children?: React.ReactNode;
}

export interface PackThemeConfig {
  name: string;
  japaneseTitle: string;
  subtitle: string;
  badge: string;
  primaryColor: string;
  secondaryColor: string;
  fallbackGradient: string;
  foilGradient: string;
  accentGlow: string;
  borderClass: string;
  motifIcon: string;
  artFile: string;
}

export const PACK_THEMES: Record<PackId, PackThemeConfig> = {
  test_sheet: {
    name: 'Test-Sheet Pack',
    japaneseTitle: '中間試験 模擬テスト',
    subtitle: 'Free Starter Mock Exam Papers',
    badge: 'FREE • 4H REFRESH',
    primaryColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    fallbackGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    foilGradient: 'from-slate-900 via-sky-950 to-zinc-950',
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    borderClass: 'border-sky-400/60',
    motifIcon: '📝',
    artFile: '/packs/pack_test.jpg',
  },
  kiosk: {
    name: 'Kiosk-Pack',
    japaneseTitle: '購買部 スナックパック',
    subtitle: 'Corner Convenience Store Booster',
    badge: '100 ¥',
    primaryColor: '#10B981',
    secondaryColor: '#F59E0B',
    fallbackGradient: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
    foilGradient: 'from-emerald-950 via-teal-900 to-zinc-950',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    borderClass: 'border-emerald-400/60',
    motifIcon: '🏪',
    artFile: '/packs/pack_kiosk.jpg',
  },
  lernsession: {
    name: 'Lernsession-Pack',
    japaneseTitle: '放課後 勉強会パック',
    subtitle: 'After-School Study Booster (SR+)',
    badge: '500 ¥',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    fallbackGradient: 'linear-gradient(135deg, #451a03 0%, #1c0a00 100%)',
    foilGradient: 'from-amber-950 via-orange-950 to-zinc-950',
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    borderClass: 'border-amber-400/70',
    motifIcon: '📚',
    artFile: '/packs/pack_lernsession.jpg',
  },
  sommerfeuerwerk: {
    name: 'Sommerfeuerwerk',
    japaneseTitle: '夏祭り 花火大会パック',
    subtitle: 'Summer Fireworks Festival (UR+)',
    badge: '2,500 ¥',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    fallbackGradient: 'linear-gradient(135deg, #4c1d95 0%, #1e053a 100%)',
    foilGradient: 'from-pink-950 via-indigo-950 to-zinc-950',
    accentGlow: 'rgba(236, 72, 153, 0.5)',
    borderClass: 'border-pink-400/70',
    motifIcon: '🎆',
    artFile: '/packs/pack_sommerfeuerwerk.jpg',
  },
  schulfest: {
    name: 'Schulfest-Pack',
    japaneseTitle: '旭高校 文化祭パック',
    subtitle: 'Culture Festival Gala (SEC+)',
    badge: '12,000 ¥',
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    fallbackGradient: 'linear-gradient(135deg, #581c87 0%, #240738 100%)',
    foilGradient: 'from-purple-950 via-fuchsia-950 to-zinc-950',
    accentGlow: 'rgba(139, 92, 246, 0.55)',
    borderClass: 'border-purple-400/80',
    motifIcon: '🎭',
    artFile: '/packs/pack_schulfest.jpg',
  },
  klassenfahrt_kyoto: {
    name: 'Klassenfahrt-Kyoto',
    japaneseTitle: '修学旅行 京都伝説',
    subtitle: 'Kyoto Trip Imperial (MR+)',
    badge: '60,000 ¥',
    primaryColor: '#EF4444',
    secondaryColor: '#D97706',
    fallbackGradient: 'linear-gradient(135deg, #881337 0%, #350414 100%)',
    foilGradient: 'from-red-950 via-rose-950 to-black',
    accentGlow: 'rgba(239, 68, 68, 0.6)',
    borderClass: 'border-red-400/80',
    motifIcon: '⛩️',
    artFile: '/packs/pack_klassenfahrt.jpg',
  },
  braut_schicksal: {
    name: 'Braut-Schicksal',
    japaneseTitle: '五等分の花嫁 運命の誓い',
    subtitle: 'Pinnacle Bridal Destiny Pack',
    badge: '300,000 ¥',
    primaryColor: '#FDE047',
    secondaryColor: '#FFFFFF',
    fallbackGradient: 'linear-gradient(135deg, #78350f 0%, #291203 100%)',
    foilGradient: 'from-zinc-900 via-amber-950/80 to-black',
    accentGlow: 'rgba(253, 224, 71, 0.7)',
    borderClass: 'border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.5)]',
    motifIcon: '💍',
    artFile: '/packs/pack_braut.jpg',
  },
  god_pack: {
    name: 'God Pack',
    japaneseTitle: '神話降臨 ゴッドパック',
    subtitle: 'Hidden 0.05% Celestial Miracle',
    badge: '★ GOD PACK ★',
    primaryColor: '#FCD34D',
    secondaryColor: '#EC4899',
    fallbackGradient: 'linear-gradient(135deg, #b45309 0%, #451a03 100%)',
    foilGradient: 'from-amber-600 via-yellow-400 to-amber-600',
    accentGlow: 'rgba(252, 211, 77, 0.9)',
    borderClass: 'border-yellow-200 shadow-[0_0_30px_rgba(252,211,77,0.8)]',
    motifIcon: '👑',
    artFile: '/packs/pack_godpack.jpg',
  },
};

export const BoosterPack3D: React.FC<BoosterPack3DProps> = ({
  packId,
  interactive = true,
  isFloating = true,
  className = '',
  onClick,
  isTorn = false,
  tearProgress = 0,
  disableTilt = false,
  isPaused = false,
  children,
}) => {
  const [artLoaded, setArtLoaded] = useState(true);
  const theme = PACK_THEMES[packId] ?? PACK_THEMES.kiosk;
  const config = PACKS_CONFIG[packId];
  const isGodPack = packId === 'god_pack' || config?.isGodPack;

  // Universal smooth 3D tilt engine with pause support
  const {
    tiltStyle,
    glareStyle,
    isHovered,
    containerProps,
  } = useSmoothTilt({
    maxRotation: 8,
    perspective: 1000,
    disabled: !interactive || disableTilt,
    isPaused: isPaused,
    onHoverChange: (hovered) => {
      if (hovered && !disableTilt && !isPaused) soundEngine.playFoilRustle();
    },
  });

  // Clamped tear progress (0 to 100)
  const progressPct = Math.max(0, Math.min(100, tearProgress));

  // Heat-Sealed Metallic Crimped Teeth Strip (Strictly 26px height)
  const renderCrimpedSeal = (isTop: boolean) => (
    <div
      className={`h-[26px] w-full shrink-0 relative overflow-hidden flex items-center justify-center ${
        isTop ? 'border-b border-white/20' : 'border-t border-white/20'
      }`}
      style={{
        background: 'repeating-linear-gradient(90deg, #1e1e26 0px, #4b4b5e 2px, #121218 4px)',
      }}
    >
      {/* Embossed pressure ridges */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

      {/* Euro-Hole Punch Cutout (Centered punch on top crimp) */}
      {isTop && (
        <div className="w-9 h-2.5 rounded-full bg-black/90 border border-white/20 shadow-inner z-10 pointer-events-none" />
      )}
    </div>
  );

  return (
    <div
      className={`card-perspective-wrapper inline-block select-none relative before:absolute before:-inset-4 before:content-[''] cursor-pointer ${className}`}
      onClick={onClick}
      {...(disableTilt ? {} : containerProps)}
    >
      <motion.div
        style={{
          ...(disableTilt ? {} : tiltStyle),
          boxShadow: `
            inset 14px 0 20px -8px rgba(0, 0, 0, 0.65),
            inset -14px 0 20px -8px rgba(0, 0, 0, 0.65),
            0 25px 50px -12px rgba(0, 0, 0, 0.85)${
              isHovered ? `, 0 0 35px ${theme.accentGlow}` : `, 0 0 15px ${theme.accentGlow}66`
            }
          `,
        }}
        className={`card-3d-root relative w-[320px] h-[520px] aspect-[320/520] rounded-3xl overflow-hidden flex flex-col justify-between ${
          isFloating && !isHovered && !isTorn ? 'animate-bounce' : ''
        } ${isHovered && !disableTilt && !isPaused ? 'is-interacting' : ''} ${theme.borderClass} border bg-[#09090f]`}
      >
        {/* ============================================================
            1. TOP DETACHABLE SECTION (Top Crimp 26px + Perforation Line)
            Animates upward on tear breach (y: -80, rotate: -6, opacity: 0)
            ============================================================ */}
        <motion.div
          className="z-30 shrink-0 select-none"
          animate={
            isTorn
              ? { y: -80, rotate: -6, opacity: 0 }
              : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          {/* Top 26px Crimp */}
          <div className="bg-[#16161f] shadow-md">
            {renderCrimpedSeal(true)}
          </div>

          {/* Upper Perforation Seam (~14% from pack top) */}
          <div className="relative w-full">
            <div className="h-6 w-full px-3 flex items-center justify-between border-b border-dashed border-white/30 bg-black/50 backdrop-blur-xs relative overflow-hidden">
              {/* Dynamic Tear Beam Glow that widens as drag progresses */}
              {progressPct > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 shadow-[0_0_20px_#f59e0b] opacity-90 transition-all duration-75 pointer-events-none"
                  style={{ width: `${progressPct}%` }}
                />
              )}

              <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-zinc-300 uppercase z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${progressPct > 0 ? 'bg-amber-300 animate-ping' : 'bg-amber-400'}`} />
                <span>PERFORATION SEAM</span>
              </div>

              <span className="text-[10px] text-amber-300 font-bold tracking-widest font-mono z-10">
                {isTorn ? '★ OPENED' : progressPct > 0 ? `${Math.round(progressPct)}%` : 'PULL TO TEAR ▶'}
              </span>
            </div>

            {/* Direct Tear Tab Mount Location */}
            {children}
          </div>
        </motion.div>

        {/* ============================================================
            2. PACK BODY: FOIL GRAPHICS, ARTWORK & PROGRAMMATIC FALLBACK
            ============================================================ */}
        <div className="relative flex-1 p-5 flex flex-col justify-between overflow-hidden">
          {/* Cover Artwork (Full-Bleed Object-Cover) */}
          {artLoaded && (
            <img
              src={theme.artFile}
              alt={theme.name}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
              onError={() => setArtLoaded(false)}
            />
          )}

          {/* Programmatic Fallback Background (when artwork is missing/fails) */}
          {!artLoaded && (
            <div
              className="absolute inset-0 z-0"
              style={{ background: theme.fallbackGradient }}
            />
          )}

          {/* Darkening Scrim so typography & badges pop over artwork */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/80 pointer-events-none z-[1]" />

          {/* Cylindrical Pillow Depth Shading Highlight in Center */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-48 bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none z-[2]" />

          {/* Dynamic Specular Foil Reflection */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none mix-blend-color-dodge z-[3]"
            style={{
              background: `linear-gradient(135deg, transparent 15%, ${theme.primaryColor} 45%, #ffffff 50%, ${theme.secondaryColor} 55%, transparent 85%)`,
              backgroundSize: '250% 250%',
              backgroundPosition: 'calc(var(--glare-x, 50%) * 2) calc(var(--glare-y, 50%) * 2)',
            }}
          />

          {/* Micro-Holographic Foil Grid Pattern */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none z-[3]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 7px)',
            }}
          />

          {/* SET HEADER: Authentic Japanese Logo Typography & Foiled Set Badge */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] tracking-widest font-black uppercase text-amber-400 drop-shadow font-mono">
                TQQ VAULT EXPANSE SET 01
              </span>
              <div className="text-[13px] text-white font-serif tracking-wider font-bold drop-shadow">
                五等分の花嫁
              </div>
            </div>

            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md font-mono backdrop-blur-xs"
              style={{
                backgroundColor: `${theme.primaryColor}30`,
                borderColor: theme.primaryColor,
                color: theme.primaryColor,
              }}
            >
              {theme.badge}
            </span>
          </div>

          {/* CENTER ARTWORK / FALLBACK IDENTITY: Motif Emblem & Japanese Headers */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
            {/* If art file failed or not loaded, highlight the embossed emblem */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-2 shadow-2xl border border-white/40 backdrop-blur-sm"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${theme.primaryColor}99, #09090b)`,
                boxShadow: `0 0 35px ${theme.accentGlow}`,
              }}
            >
              <span className="text-4xl sm:text-5xl filter drop-shadow-xl select-none">
                {theme.motifIcon}
              </span>
            </div>

            <span className="text-xs font-serif tracking-widest text-zinc-200 mb-0.5 opacity-95 drop-shadow font-bold">
              {theme.japaneseTitle}
            </span>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
              {theme.name}
            </h2>

            <p className="text-[11px] text-zinc-300 mt-1 max-w-[220px] font-medium leading-tight drop-shadow">
              {theme.subtitle}
            </p>
          </div>

          {/* FOOTER: Nakano Sister Icons & Card Count */}
          <div className="relative z-10 pt-2 border-t border-white/25 flex items-center justify-between text-[10px] text-zinc-300">
            <div className="flex items-center gap-1.5 text-sm">
              <span title="Ichika">💛</span>
              <span title="Nino">🦋</span>
              <span title="Miku">🎧</span>
              <span title="Yotsuba">🍀</span>
              <span title="Itsuki">⭐</span>
            </div>

            <div className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-bold">
              {config?.slots ?? 5} CARDS PER PACK
            </div>
          </div>
        </div>

        {/* ============================================================
            3. BOTTOM HEAT-SEALED CRIMP (Strictly 26px)
            ============================================================ */}
        <div className="z-30 bg-[#16161f] shadow-md shrink-0">
          {renderCrimpedSeal(false)}
        </div>

        {/* Specular Laminate Reflection Overlay */}
        <motion.div className="card-specular-glare pointer-events-none z-20" style={glareStyle} />

        {/* God Pack Divine Volumetric Rays */}
        {isGodPack && (
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-55 bg-[radial-gradient(circle,rgba(255,215,0,0.85)_0%,transparent_70%)] animate-pulse z-20" />
        )}
      </motion.div>
    </div>
  );
};

export default BoosterPack3D;
