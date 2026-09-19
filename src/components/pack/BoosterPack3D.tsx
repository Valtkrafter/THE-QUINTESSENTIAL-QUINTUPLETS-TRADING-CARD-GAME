'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { PackId } from '../../types/card';
import { PACKS_CONFIG } from '../../config/economy';
import { usePackCeremonyStore } from '../../store/usePackCeremonyStore';
import { calculateHolographicAngle, clamp } from '../../utils/shaderMath';
import { FoilTearCrimp } from './FoilTearCrimp';

export interface BoosterPack3DProps {
  packId?: PackId;
  tierId?: PackId;
  interactive?: boolean;
  isFloating?: boolean;
  className?: string;
  onClick?: () => void;
  isTorn?: boolean;
  tearProgress?: number; // 0 to 100 or 0 to 1
  disableTilt?: boolean;
  isPaused?: boolean;
  onTearProgress?: (progress: number) => void;
  onTearComplete?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onScreenShake?: (active: boolean) => void;
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
    badge: '5.000.000 ¥',
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
  tierId,
  interactive = true,
  isFloating = true,
  className = '',
  onClick,
  isTorn = false,
  tearProgress = 0,
  disableTilt = false,
  isPaused = false,
  onTearProgress,
  onTearComplete,
  onDragStateChange,
  onScreenShake,
  children,
}) => {
  const [artLoaded, setArtLoaded] = useState(true);
  const [localIsTorn, setLocalIsTorn] = useState(false);
  const [isRotatingPack, setIsRotatingPack] = useState(false);
  const [shakeDisplacement, setShakeDisplacement] = useState(0);

  const activePackId = packId ?? tierId ?? 'kiosk';
  const theme = PACK_THEMES[activePackId] ?? PACK_THEMES.kiosk;
  const config = PACKS_CONFIG[activePackId];
  const isGodPack = activePackId === 'god_pack' || config?.isGodPack;

  const storeBreached = usePackCeremonyStore((s) => s.isBreached);
  const effectiveIsTorn = isTorn || localIsTorn || storeBreached;

  // --------------------------------------------------------------------------
  // TIER 2: INERTIA ROTATION GIMBAL (Framer Motion Springs)
  // Dynamics: damping: 30, stiffness: 100, mass: 0.8
  // --------------------------------------------------------------------------
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);

  const springRotX = useSpring(rotX, { damping: 30, stiffness: 100, mass: 0.8 });
  const springRotY = useSpring(rotY, { damping: 30, stiffness: 100, mass: 0.8 });

  const dragStartRef = useRef<{ clientX: number; clientY: number; initRotX: number; initRotY: number } | null>(null);

  // Dynamic metallic foil reflection gradient overlay computed from 3D tilt vectors
  const foilGradientStyle = useTransform([springRotX, springRotY], ([rx, ry]: number[]) => {
    const normX = (ry ?? 0) / 180;
    const normY = -(rx ?? 0) / 15;
    const angle = calculateHolographicAngle(normX, normY);
    return `linear-gradient(${angle + 45}deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)`;
  });

  // Handle pack rotation gestures (outside tear zone)
  const handlePackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || disableTilt || isPaused) return;
    // Disregard if click occurred on tear notch or its children
    const target = e.target as HTMLElement | null;
    if (target?.closest('.pointer-events-auto')) return;

    e.preventDefault();
    setIsRotatingPack(true);
    onDragStateChange?.(true);

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initRotX: rotX.get(),
      initRotY: rotY.get(),
    };
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;

      // 360° horizontal rotation around Y-axis [-180°, 180°]
      const newRotY = clamp(dragStartRef.current.initRotY + deltaX * 0.75, -180, 180);
      // Slight vertical tilt [-15°, 15°]
      const newRotX = clamp(dragStartRef.current.initRotX - deltaY * 0.2, -15, 15);

      rotY.set(newRotY);
      rotX.set(newRotX);

      // Sync normalized tilt vectors with usePackCeremonyStore
      const normTiltX = clamp(newRotY / 180, -1.0, 1.0);
      const normTiltY = clamp(-newRotX / 15, -1.0, 1.0);
      usePackCeremonyStore.getState().setTilt(normTiltX, normTiltY);
    };

    const handleGlobalPointerUp = () => {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      setIsRotatingPack(false);
      onDragStateChange?.(false);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [interactive, disableTilt, isPaused, rotX, rotY, onDragStateChange]);

  // Screen shake triggered on breach (8px displacement, 140ms duration)
  const triggerScreenShake = useCallback(
    (active: boolean) => {
      onScreenShake?.(active);
      if (active) {
        setShakeDisplacement(8);
        const timer = setTimeout(() => {
          setShakeDisplacement(0);
        }, 140);
        return () => clearTimeout(timer);
      } else {
        setShakeDisplacement(0);
      }
    },
    [onScreenShake]
  );

  const handleTearCompleteInternal = useCallback(() => {
    setLocalIsTorn(true);
    onTearComplete?.();
  }, [onTearComplete]);

  // Reset local state if pack resets
  useEffect(() => {
    if (!isTorn && !storeBreached) {
      setLocalIsTorn(false);
      rotX.set(0);
      rotY.set(0);
    }
  }, [isTorn, storeBreached, rotX, rotY]);

  // Corrugated Top & Bottom Flaps (28px height with metallic crimp teeth)
  const renderCrimpedSeal = (isTop: boolean) => (
    <div
      className={`h-[28px] w-full shrink-0 relative overflow-hidden flex items-center justify-center pointer-events-none select-none ${
        isTop ? 'border-b border-white/20' : 'border-t border-white/20'
      }`}
      style={{
        background: 'repeating-linear-gradient(90deg, #1f242d 0px, #3a4252 2px, #0e1116 4px)',
      }}
    >
      {/* Embossed pressure ridges */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none select-none" />

      {/* Euro-Hole Punch Cutout (Centered on top crimp) */}
      {isTop && (
        <div className="w-9 h-2.5 rounded-full bg-black/90 border border-white/20 shadow-inner z-10 pointer-events-none select-none" />
      )}
    </div>
  );

  return (
    // ========================================================================
    // TIER 1: OUTER STATIC ANCHOR (Flat 2D Coordinate Plane, Perspective 1200px)
    // Container Dimensions: w-[320px] sm:w-[340px] h-[520px] sm:h-[550px]
    // ========================================================================
    <motion.div
      className={`relative w-[320px] sm:w-[340px] h-[520px] sm:h-[550px] select-none ${className}`}
      style={{
        perspective: 1200,
      }}
      animate={{
        x: shakeDisplacement > 0 ? [-shakeDisplacement, shakeDisplacement, -4, 4, 0] : 0,
      }}
      transition={{ duration: 0.14 }}
      onClick={onClick}
      onPointerDown={handlePackPointerDown}
    >
      {/* ====================================================================
          TIER 2: INERTIA ROTATION GIMBAL (transform-style: preserve-3d)
          ==================================================================== */}
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          rotateX: springRotX,
          rotateY: springRotY,
          cursor: interactive && !isPaused ? (isRotatingPack ? 'grabbing' : 'grab') : 'default',
        }}
        className={`w-full h-full relative rounded-3xl select-none ${
          isFloating && !effectiveIsTorn ? 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]' : ''
        }`}
      >
        {/* ==================================================================
            TIER 3: PHYSICAL FOIL VOLUMES (Front Shell & Back Shell)
            ================================================================== */}

        {/* ------------------------------------------------------------------
            A. FRONT SHELL (Pack Wrapper Art, Metallic Foil, Pillow Shading)
            ------------------------------------------------------------------ */}
        <div
          className={`absolute inset-0 w-full h-full rounded-3xl overflow-hidden flex flex-col justify-between select-none pointer-events-none ${theme.borderClass} border bg-[#09090f]`}
          style={{
            transform: 'translateZ(0px)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow:
              'inset 18px 0 25px -10px rgba(0,0,0,0.8), inset -18px 0 25px -10px rgba(0,0,0,0.8)',
          }}
        >
          {/* Top Corrugated Crimp (28px) - Attached if unsevered */}
          <div className="z-30 shrink-0 bg-[#16161f] shadow-md pointer-events-none select-none">
            {renderCrimpedSeal(true)}
          </div>

          {/* Foil Graphics & Artwork Container */}
          <div className="relative flex-1 p-5 flex flex-col justify-between overflow-hidden pointer-events-none select-none">
            {/* Base Art */}
            {artLoaded && (
              <img
                src={theme.artFile}
                alt={theme.name}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-10"
                onError={() => setArtLoaded(false)}
              />
            )}

            {/* Programmatic Fallback Background */}
            {!artLoaded && (
              <div
                className="absolute inset-0 select-none pointer-events-none z-10"
                style={{ background: theme.fallbackGradient }}
              />
            )}

            {/* Dark vignette layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 pointer-events-none select-none z-20" />

            {/* Dynamic Metallic Foil Gradient Overlay:
                linear-gradient(calc(var(--angle) + 45deg), transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%) */}
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-screen opacity-50 select-none z-20"
              style={{
                background: foilGradientStyle,
              }}
            />

            {/* Diagonal Foil Sheen Texture */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none select-none z-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 8px)',
              }}
            />

            {/* Cylindrical Pillow Shading Overlay */}
            <div
              className="pointer-events-none absolute inset-0 select-none z-30"
              style={{
                boxShadow:
                  'inset 18px 0 25px -10px rgba(0,0,0,0.8), inset -18px 0 25px -10px rgba(0,0,0,0.8)',
              }}
            />

            {/* Center Cylindrical Light Core */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-48 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none select-none z-30" />

            {/* Set Header Typography */}
            <div className="relative z-10 flex items-start justify-between pointer-events-none select-none mt-2">
              <div>
                <span className="text-[10px] tracking-widest font-black uppercase text-amber-400 drop-shadow font-mono">
                  TQQ VAULT EXPANSE SET 01
                </span>
                <div className="text-[13px] text-white font-serif tracking-wider font-bold drop-shadow">
                  五等分の花嫁
                </div>
              </div>

              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md font-mono backdrop-blur-xs select-none pointer-events-none"
                style={{
                  backgroundColor: `${theme.primaryColor}30`,
                  borderColor: theme.primaryColor,
                  color: theme.primaryColor,
                }}
              >
                {theme.badge}
              </span>
            </div>

            {/* Center Motif Emblem & Title */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto pointer-events-none select-none">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-2 shadow-2xl border border-white/40 backdrop-blur-sm pointer-events-none select-none"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${theme.primaryColor}99, #09090b)`,
                  boxShadow: `0 0 35px ${theme.accentGlow}`,
                }}
              >
                <span className="text-4xl sm:text-5xl filter drop-shadow-xl select-none">
                  {theme.motifIcon}
                </span>
              </div>

              <span className="text-xs font-serif tracking-widest text-zinc-200 mb-0.5 opacity-95 drop-shadow font-bold select-none">
                {theme.japaneseTitle}
              </span>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md select-none">
                {theme.name}
              </h2>

              <p className="text-[11px] text-zinc-300 mt-1 max-w-[220px] font-medium leading-tight drop-shadow select-none">
                {theme.subtitle}
              </p>
            </div>

            {/* Footer: Nakano Sister Emojis & Card Count */}
            <div className="relative z-10 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-zinc-300 pointer-events-none select-none">
              <div className="flex items-center gap-1.5 text-sm select-none">
                <span title="Ichika">💛</span>
                <span title="Nino">🦋</span>
                <span title="Miku">🎧</span>
                <span title="Yotsuba">🍀</span>
                <span title="Itsuki">⭐</span>
              </div>

              <div className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-bold select-none">
                {config?.slots ?? 5} CARDS PER PACK
              </div>
            </div>
          </div>

          {/* Bottom Corrugated Crimp (28px) */}
          <div className="z-30 shrink-0 bg-[#16161f] shadow-md pointer-events-none select-none">
            {renderCrimpedSeal(false)}
          </div>

          {/* God Pack Volumetric Rays */}
          {isGodPack && (
            <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-60 bg-[radial-gradient(circle,rgba(255,215,0,0.85)_0%,transparent_70%)] animate-pulse select-none z-30" />
          )}
        </div>

        {/* ------------------------------------------------------------------
            B. BACK SHELL (rotateY(180deg) translateZ(1px))
            Japanese TCG Back: Barcode, Kodansha copyright, drop rates, center seal
            ------------------------------------------------------------------ */}
        <div
          className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden flex flex-col justify-between select-none pointer-events-none border border-zinc-700/80 bg-[#0d0e15]"
          style={{
            transform: 'rotateY(180deg) translateZ(1px)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow:
              'inset 18px 0 25px -10px rgba(0,0,0,0.8), inset -18px 0 25px -10px rgba(0,0,0,0.8)',
          }}
        >
          {/* Top Corrugated Crimp (28px) */}
          <div className="z-30 shrink-0 bg-[#16161f] shadow-md pointer-events-none select-none">
            {renderCrimpedSeal(true)}
          </div>

          {/* Back Body Content */}
          <div className="relative flex-1 p-5 flex flex-col justify-between overflow-hidden pointer-events-none select-none">
            {/* Center Back-Seal Flap (w-6 h-full bg-[#181820] shadow-md) */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-[#181820] border-x border-white/10 shadow-[0_0_12px_rgba(0,0,0,0.6)] z-10 pointer-events-none select-none flex items-center justify-center">
              <div className="w-[1px] h-full bg-white/15" />
            </div>

            {/* Pillow shading on back shell */}
            <div
              className="pointer-events-none absolute inset-0 select-none z-20"
              style={{
                boxShadow:
                  'inset 18px 0 25px -10px rgba(0,0,0,0.8), inset -18px 0 25px -10px rgba(0,0,0,0.8)',
              }}
            />

            {/* Back Header: Title & Packaging Info */}
            <div className="relative z-20 flex flex-col items-center text-center mt-1">
              <div className="text-[11px] font-serif font-bold text-zinc-300 tracking-wider">
                五等分の花嫁 トレーディングカードゲーム
              </div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                BOOSTER PACK • 5 CARDS INCLUDED
              </div>
            </div>

            {/* Drop-Rate Distribution Summary Table */}
            <div className="relative z-20 mx-auto max-w-[260px] w-full rounded-lg border border-white/15 bg-black/60 p-2.5 text-[9px] font-mono backdrop-blur-xs shadow-inner">
              <div className="text-[10px] font-bold text-amber-400 border-b border-white/15 pb-1 mb-1.5 flex items-center justify-between">
                <span>【 封入率 / DROP RATES 】</span>
                <span className="text-[8px] text-zinc-400">1 PACK = 5 CARDS</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-zinc-300 text-[8.5px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">COMMON (C):</span>
                  <span className="font-bold">70.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">UNCOMMON (UC):</span>
                  <span className="font-bold">20.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">RARE (R):</span>
                  <span className="font-bold">7.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">SUPER RARE (SR):</span>
                  <span className="font-bold">2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">ULTRA RARE (UR):</span>
                  <span className="font-bold">0.45%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pink-400">SECRET RARE (SEC):</span>
                  <span className="font-bold">0.05%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">MASTER RARE (MR):</span>
                  <span className="font-bold">0.005%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-300">GOD PACK:</span>
                  <span className="font-bold">0.05%</span>
                </div>
              </div>
            </div>

            {/* Caution & Safety Notice */}
            <div className="relative z-20 text-[8px] text-zinc-400 text-center leading-tight max-w-[260px] mx-auto">
              <p className="font-serif">
                【注意】パックの端で手などを切らないようにご注意ください。開封後はすぐにお遊びください。対象年齢15才以上。
              </p>
            </div>

            {/* JAN Barcode & Official Kodansha Copyright */}
            <div className="relative z-20 flex flex-col items-center justify-center pt-2 border-t border-white/15">
              {/* Authentic JAN-13 Barcode: 4573414718820 */}
              <div className="bg-white px-3 py-1 rounded shadow-md flex flex-col items-center">
                <svg
                  className="w-40 h-7"
                  viewBox="0 0 160 28"
                  fill="black"
                  preserveAspectRatio="none"
                >
                  {/* Outer guards */}
                  <rect x="0" y="0" width="2" height="28" />
                  <rect x="4" y="0" width="2" height="28" />

                  {/* Encoded data bars */}
                  <rect x="10" y="0" width="3" height="24" />
                  <rect x="15" y="0" width="1" height="24" />
                  <rect x="18" y="0" width="4" height="24" />
                  <rect x="25" y="0" width="2" height="24" />
                  <rect x="30" y="0" width="3" height="24" />
                  <rect x="36" y="0" width="1" height="24" />
                  <rect x="40" y="0" width="4" height="24" />
                  <rect x="47" y="0" width="2" height="24" />
                  <rect x="52" y="0" width="1" height="24" />
                  <rect x="56" y="0" width="3" height="24" />
                  <rect x="62" y="0" width="2" height="24" />
                  <rect x="68" y="0" width="4" height="24" />
                  <rect x="74" y="0" width="1" height="24" />

                  {/* Center guard bars */}
                  <rect x="78" y="0" width="2" height="28" />
                  <rect x="82" y="0" width="2" height="28" />

                  {/* Right data bars */}
                  <rect x="88" y="0" width="3" height="24" />
                  <rect x="94" y="0" width="1" height="24" />
                  <rect x="98" y="0" width="4" height="24" />
                  <rect x="105" y="0" width="2" height="24" />
                  <rect x="110" y="0" width="3" height="24" />
                  <rect x="116" y="0" width="1" height="24" />
                  <rect x="120" y="0" width="4" height="24" />
                  <rect x="127" y="0" width="2" height="24" />
                  <rect x="132" y="0" width="1" height="24" />
                  <rect x="136" y="0" width="3" height="24" />
                  <rect x="142" y="0" width="2" height="24" />
                  <rect x="148" y="0" width="4" height="24" />

                  {/* End guard bars */}
                  <rect x="154" y="0" width="2" height="28" />
                  <rect x="158" y="0" width="2" height="28" />
                </svg>
                <span className="font-mono text-[9px] tracking-widest text-zinc-800 font-bold">
                  4 573414 718820
                </span>
              </div>

              {/* Kodansha Copyright Text */}
              <div className="mt-2 text-[7.5px] font-mono text-zinc-400 text-center leading-tight">
                <div>© 春場ねぎ・講談社／「五等分の花嫁」製作委員会</div>
                <div className="text-zinc-500">
                  © Negi Haruba, KODANSHA / TQQ Production Committee. MADE IN JAPAN.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Corrugated Crimp (28px) */}
          <div className="z-30 shrink-0 bg-[#16161f] shadow-md pointer-events-none select-none">
            {renderCrimpedSeal(false)}
          </div>
        </div>
      </motion.div>

      {/* ====================================================================
          VECTOR PERFORATION TEAR CRIMP (Anchored along top crimp boundary)
          Sits 44px below top edge in static coordinate plane.
          ==================================================================== */}
      {!effectiveIsTorn && interactive && (
        <FoilTearCrimp
          packWidth={320}
          onTearStart={() => onDragStateChange?.(true)}
          onTearProgress={onTearProgress}
          onTearEnd={() => onDragStateChange?.(false)}
          onTearComplete={handleTearCompleteInternal}
          onScreenShake={triggerScreenShake}
          isBreached={effectiveIsTorn}
          renderTopCrimpContent={() => (
            <div className="w-full h-full bg-[#16161f] rounded-t-3xl overflow-hidden shadow-md">
              {renderCrimpedSeal(true)}
            </div>
          )}
        />
      )}

      {/* Optional Children */}
      {children}
    </motion.div>
  );
};

export default BoosterPack3D;
