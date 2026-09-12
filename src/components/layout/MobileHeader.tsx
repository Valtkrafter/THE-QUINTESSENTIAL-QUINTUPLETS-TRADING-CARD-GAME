'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BookOpen, Sparkles, Zap, Coins } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { soundEngine } from '../../utils/audioEngine';
import { hapticLightTap } from '../../utils/haptics';

export interface MobileHeaderProps {
  unreadQuestsCount?: number;
  onOpenQuests?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  unreadQuestsCount = 0,
  onOpenQuests,
}) => {
  const yen = useGameStore((state) => state.yen);
  const stardust = useGameStore((state) => state.stardust);
  const pityCounters = useGameStore((state) => state.pityCounters);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showPityPopover, setShowPityPopover] = useState<boolean>(false);

  useEffect(() => {
    setIsMuted(soundEngine.isMuted());
  }, []);

  const handleToggleMute = () => {
    hapticLightTap();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Pity calculation: SR out of 30, UR out of 100
  const srProgress = Math.min(100, Math.round((pityCounters.packsWithoutSR / 30) * 100));
  const urProgress = Math.min(100, Math.round((pityCounters.packsWithoutUR / 100) * 100));
  const maxPityProgress = Math.max(srProgress, urProgress);

  // SVG Radial circle math (radius = 9, circumference = 2 * PI * 9 ~= 56.54)
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (maxPityProgress / 100) * circumference;

  return (
    <header className="sticky top-0 left-0 right-0 z-30 w-full h-[52px] bg-[#0a0a0c]/85 backdrop-blur-lg border-b border-[#23232e]/50 px-3.5 flex items-center justify-between pt-[env(safe-area-inset-top)] select-none">
      {/* LEFT: SFX Toggle & Quest Notebook Icon */}
      <div className="flex items-center gap-2">
        {/* Sound SFX Toggle */}
        <button
          onClick={handleToggleMute}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 transition active:scale-95 cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          aria-label={isMuted ? 'Unmute procedural audio' : 'Mute procedural audio'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-zinc-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Fuutarou's Quest Notebook Trigger */}
        <button
          onClick={() => {
            hapticLightTap();
            onOpenQuests?.();
          }}
          className="relative w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 transition active:scale-95 cursor-pointer"
          title="Fuutarou's Study Notebook (Daily Quests)"
          aria-label="Open Daily Quests"
        >
          <BookOpen className="w-4 h-4 text-sky-400" />
          {unreadQuestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center animate-pulse border border-black shadow">
              {unreadQuestsCount}
            </span>
          )}
        </button>
      </div>

      {/* RIGHT: Compact Currency Badges & Pity Spark Radial Pip */}
      <div className="flex items-center gap-2">
        {/* Yen Balance (Emerald #10B981) */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shadow-sm">
          <span className="text-[#10B981] font-black text-xs">¥</span>
          <span>{yen.toLocaleString()}</span>
        </div>

        {/* Stardust Balance (Violet #8B5CF6) */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-950/40 border border-violet-500/30 text-violet-300 font-mono text-xs font-bold shadow-sm">
          <span className="text-[#8B5CF6] font-black text-xs">★</span>
          <span>{stardust.toLocaleString()}</span>
        </div>

        {/* Pity Spark Indicator with Radial Progress Pip */}
        <div className="relative">
          <button
            onClick={() => {
              hapticLightTap();
              setShowPityPopover(!showPityPopover);
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center relative transition active:scale-95 cursor-pointer"
            title="Gacha Pity Spark Meter"
            aria-label="View Pity Counter"
          >
            {/* Radial SVG Ring */}
            <svg className="w-6 h-6 -rotate-90">
              <circle
                cx="12"
                cy="12"
                r={radius}
                className="stroke-white/10 fill-none"
                strokeWidth="2"
              />
              <circle
                cx="12"
                cy="12"
                r={radius}
                className="stroke-amber-400 fill-none transition-all duration-300"
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <Zap className="w-3 h-3 text-amber-400 absolute center" />
          </button>

          {/* Pity Popover Dialog */}
          {showPityPopover && (
            <div
              className="absolute right-0 top-10 z-50 w-52 p-3 rounded-2xl bg-[#0e0e14] border border-amber-500/40 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-2 text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[11px] font-black text-amber-400 uppercase">
                <span>Pity Guarantee</span>
                <span>{maxPityProgress}%</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-zinc-300">
                  <span>SR Pity:</span>
                  <span className="text-purple-300 font-bold">
                    {pityCounters.packsWithoutSR} / 30 Packs
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full"
                    style={{ width: `${srProgress}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-zinc-300">
                  <span>UR Pity:</span>
                  <span className="text-amber-400 font-bold">
                    {pityCounters.packsWithoutUR} / 100 Packs
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${urProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 pt-1 leading-tight">
                Pity guarantees high-tier cards on unboxings. Resets on pull.
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
