'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardInstance } from '../../../types/card';
import { CardRenderer } from '../../card/CardRenderer';
import { soundEngine } from '../../../utils/audioEngine';
import { Sparkles, RotateCw, Check, CheckCircle2, Search, Crosshair } from 'lucide-react';

interface MicroscopeStepProps {
  card: CardInstance;
  onComplete: () => void;
}

interface Speck {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  label: string;
  cleaned: boolean;
  progress: number; // 0 to 100
}

const INITIAL_FRONT_SPECKS: Speck[] = [
  { id: 'f1', x: 32, y: 28, label: 'Fingerprint Grease', cleaned: false, progress: 0 },
  { id: 'f2', x: 68, y: 35, label: 'Micro Adhesive', cleaned: false, progress: 0 },
  { id: 'f3', x: 45, y: 65, label: 'Dust Particle', cleaned: false, progress: 0 },
  { id: 'f4', x: 74, y: 78, label: 'Foil Smudge', cleaned: false, progress: 0 },
];

const INITIAL_BACK_SPECKS: Speck[] = [
  { id: 'b1', x: 40, y: 40, label: 'Border Grime', cleaned: false, progress: 0 },
  { id: 'b2', x: 62, y: 70, label: 'Paper Residue', cleaned: false, progress: 0 },
];

export const MicroscopeStep: React.FC<MicroscopeStepProps> = ({ card, onComplete }) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [frontSpecks, setFrontSpecks] = useState<Speck[]>(INITIAL_FRONT_SPECKS);
  const [backSpecks, setBackSpecks] = useState<Speck[]>(INITIAL_BACK_SPECKS);

  // Active speck currently being rubbed
  const [activeSpeckId, setActiveSpeckId] = useState<string | null>(null);

  // Cursor position inside the digital monitor
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const activeSpecks = isFlipped ? backSpecks : frontSpecks;
  const setSpecks = isFlipped ? setBackSpecks : setFrontSpecks;

  const frontCleanCount = frontSpecks.filter((s) => s.cleaned).length;
  const backCleanCount = backSpecks.filter((s) => s.cleaned).length;
  const isAllClean = frontCleanCount === 4 && backCleanCount === 2;

  const lastRubSoundTimeRef = useRef<number>(0);

  // Rubbing loop handler
  const handleSpeckRub = (speckId: string) => {
    setActiveSpeckId(speckId);

    const now = Date.now();
    if (now - lastRubSoundTimeRef.current > 120) {
      soundEngine.playSwabRub();
      lastRubSoundTimeRef.current = now;
    }

    setSpecks((prev) =>
      prev.map((s) => {
        if (s.id !== speckId || s.cleaned) return s;
        const newProgress = Math.min(100, s.progress + 4.5);
        if (newProgress >= 100 && !s.cleaned) {
          soundEngine.playCleanChime();
          return { ...s, progress: 100, cleaned: true };
        }
        return { ...s, progress: newProgress };
      })
    );
  };

  const handlePointerLeave = () => {
    setActiveSpeckId(null);
    setCursorPos(null);
  };

  const handleMonitorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorPos({ x, y });

    // Check proximity to any uncleaned speck (hit radius 10%)
    for (const speck of activeSpecks) {
      if (!speck.cleaned) {
        const dist = Math.hypot(speck.x - x, speck.y - y);
        if (dist <= 10) {
          handleSpeckRub(speck.id);
          return;
        }
      }
    }
    setActiveSpeckId(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden">
      {/* 1. TOP HEADER (Static & flex-shrink-0) */}
      <header className="flex-shrink-0 text-center z-10 pt-3 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-1">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>Stage 2: SVBONY LCD Digital Microscope 50X</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
          Swab Dirt &amp; Residues Under 50X Zoom
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-0.5">
          Hold and rub the cotton swab applicator over the marked red target rings until blemishes dissolve into sterile green rings.
        </p>
      </header>

      {/* 2. INTERACTIVE WORKBENCH AREA (Flexible & Scaled with min-h-0) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center p-2 sm:p-4 my-auto">
        <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center my-auto">
        {/* ============================================================
            LEFT / TOP: SVBONY DIGITAL LCD MONITOR
            ============================================================ */}
        <div className="flex flex-col items-center w-full">
          {/* Microscope Monitor Housing */}
          <div className="w-full max-w-[380px] bg-[#0c0e12] border-4 border-[#1c1f26] rounded-2xl p-2.5 shadow-2xl relative flex flex-col items-center">
            {/* Monitor Top Bezel & Power LED */}
            <div className="w-full flex items-center justify-between px-2 pb-1.5 border-b border-white/10 text-[10px] font-mono">
              <span className="font-bold tracking-widest text-zinc-400 uppercase">SVBONY SM50-PRO</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-emerald-400 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6]" title="Power On" />
              </div>
            </div>

            {/* LCD Screen Display Area */}
            <div
              onPointerMove={handleMonitorPointerMove}
              onPointerLeave={handlePointerLeave}
              className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden border border-white/10 cursor-none shadow-inner select-none mt-1.5"
            >
              {/* Magnified Card Artwork Background */}
              <div
                className="absolute inset-0 transition-transform duration-300 pointer-events-none"
                style={{
                  transform: 'scale(1.85)',
                  transformOrigin: `${cursorPos ? cursorPos.x : 50}% ${cursorPos ? cursorPos.y : 50}%`,
                }}
              >
                {!isFlipped ? (
                  <CardRenderer
                    card={card}
                    size="full"
                    interactive={false}
                    showMarketValue={false}
                    hideInternalFooter={true}
                    showcaseMode={true}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a1c24] via-[#0e1017] to-[#12151c] border-4 border-amber-500/30 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-24 h-24 rounded-full border-4 border-amber-500/40 flex items-center justify-center shadow-inner">
                      <span className="text-amber-400 font-black text-xs font-mono">TQQ CREST</span>
                    </div>
                    <span className="mt-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      AUTHENTIC CARD BACK
                    </span>
                  </div>
                )}
              </div>

              {/* Pixel Grid & Scanline FX Overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30 z-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px)',
                }}
              />

              {/* Digital OSD Overlay */}
              <div className="absolute inset-x-0 top-0 p-2 z-30 flex items-center justify-between text-[9px] font-mono text-cyan-300 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
                <span className="font-bold tracking-wider">CAM 1 [50X MAG]</span>
                <span className="text-zinc-400">SIDE: {isFlipped ? 'REVERSE' : 'OBVERSE'}</span>
                <span className="text-emerald-400">CLEANED: {isFlipped ? `${backCleanCount}/2` : `${frontCleanCount}/4`}</span>
              </div>

              {/* Central Crosshair Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 opacity-35 text-cyan-400">
                <Crosshair className="w-16 h-16 stroke-[1]" />
              </div>

              {/* Target Rings for Dirt Specks */}
              {activeSpecks.map((speck) => (
                <div
                  key={speck.id}
                  className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                  style={{ left: `${speck.x}%`, top: `${speck.y}%` }}
                >
                  {!speck.cleaned ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-9 h-9 rounded-full border-2 border-red-500 animate-pulse flex items-center justify-center bg-red-500/10">
                        {/* Dirt Blob Texture */}
                        <div
                          className="w-3 h-3 rounded-full bg-amber-900/90 shadow-md transition-opacity duration-300"
                          style={{ opacity: 1 - speck.progress / 100 }}
                        />
                        {/* Progress ring fill */}
                        {speck.progress > 0 && (
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              stroke="#10b981"
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray="94.2"
                              strokeDashoffset={94.2 - (94.2 * speck.progress) / 100}
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-[8px] font-mono font-bold text-red-300 bg-black/80 px-1 rounded mt-0.5 whitespace-nowrap">
                        {speck.label}
                      </span>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        <Check className="w-4 h-4 text-emerald-300" />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-emerald-300 bg-black/80 px-1 rounded mt-0.5">
                        CLEANED
                      </span>
                    </motion.div>
                  )}
                </div>
              ))}

              {/* Swab Cursor Graphic */}
              {cursorPos && (
                <div
                  className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                  style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Swab Tip */}
                    <div className="w-5 h-5 rounded-full bg-white/90 border-2 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                    {/* Swab Stick Stem */}
                    <div className="absolute top-4 left-4 w-12 h-1.5 bg-gradient-to-r from-amber-200 to-amber-400 rotate-45 rounded shadow" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT / BOTTOM: WORKBENCH MAT CARD POSITIONER & FLIP CONTROL
            ============================================================ */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="relative w-[210px] aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-zinc-900 flex items-center justify-center">
            {!isFlipped ? (
              <CardRenderer
                card={card}
                size="full"
                interactive={false}
                showMarketValue={false}
                hideInternalFooter={true}
                showcaseMode={true}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1a1c24] via-[#0e1017] to-[#12151c] flex flex-col items-center justify-center p-3 text-center border-2 border-white/10">
                <div className="w-16 h-16 rounded-full border-2 border-amber-400/40 flex items-center justify-center">
                  <span className="text-amber-300 font-bold text-[10px] font-mono">BACK</span>
                </div>
              </div>
            )}

            {/* Downward Microscope Light Cone Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Flip Card Action Button */}
          <button
            type="button"
            onClick={() => {
              setIsFlipped((prev) => !prev);
              soundEngine.playFoilRustle();
            }}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition shadow-md active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>FLIP TO {isFlipped ? 'FRONT (OBVERSE)' : 'BACK (REVERSE)'}</span>
          </button>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM ACTION BAR (Strictly Pinned & Protected) */}
      <footer className="w-full flex-shrink-0 p-4 pt-2 pb-6 border-t border-[#232730] bg-[#0f1115]/90 backdrop-blur-md flex flex-col items-center gap-2 z-20">
        <div className="w-full max-w-md flex items-center justify-between text-xs font-mono px-3 py-2 rounded-xl bg-zinc-950/80 border border-white/10">
          <div className="flex items-center gap-1.5">
            {frontCleanCount === 4 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <span className={frontCleanCount === 4 ? 'text-emerald-400' : 'text-zinc-300'}>
              Front Artwork: {frontCleanCount}/4
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {backCleanCount === 2 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <span className={backCleanCount === 2 ? 'text-emerald-400' : 'text-zinc-300'}>
              Card Back: {backCleanCount}/2
            </span>
          </div>
        </div>

        {isAllClean ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            type="button"
            onClick={onComplete}
            className="w-full max-w-md py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <span>PROCEED TO CLAMP PRESS (WARP REMOVAL) ▶</span>
            <Sparkles className="w-4 h-4" />
          </motion.button>
        ) : (
          <div className="text-[11px] font-mono text-zinc-500 text-center">
            {!isFlipped && frontCleanCount < 4
              ? 'Clean remaining blemishes on the front obverse.'
              : frontCleanCount === 4 && backCleanCount < 2
              ? 'Flip the card to inspect and clean the reverse side.'
              : 'Swab all marked spots to unlock the Hard Press Station.'}
          </div>
        )}
      </footer>
    </div>
  );
};

export default MicroscopeStep;
