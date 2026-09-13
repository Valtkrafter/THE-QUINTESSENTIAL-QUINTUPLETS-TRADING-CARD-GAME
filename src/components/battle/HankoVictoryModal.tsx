'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Examiner } from '../../types/battle';
import { playSound } from '../../utils/audio';
import { Sparkles, Award, Coins, CheckCircle2 } from 'lucide-react';

interface HankoVictoryModalProps {
  examiner: Examiner;
  testScore: number;
  tutorMultiplier?: number;
  onCollect: () => void;
}

export const HankoVictoryModal: React.FC<HankoVictoryModalProps> = ({
  examiner,
  testScore,
  tutorMultiplier = 1.0,
  onCollect,
}) => {
  const [stampLanded, setStampLanded] = useState(false);

  const baseReward = examiner.reward || { yen: 3000, stardust: 80 };
  const finalYen = Math.round(baseReward.yen * tutorMultiplier);
  const finalStardust = Math.round(baseReward.stardust * tutorMultiplier);
  const bonusItem = baseReward.item;

  useEffect(() => {
    // 150ms after modal opens, slam the Hanko stamp with audio thump
    const timer = setTimeout(() => {
      setStampLanded(true);
      playSound('hanko_slam', 1.0);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      {/* Physical Screen Shake Container */}
      <motion.div
        animate={stampLanded ? { x: [0, -6, 6, -3, 3, 0], y: [0, 4, -4, 2, -2, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-lg"
      >
        {/* Japanese Test Paper Sheet */}
        <motion.div
          initial={{ scale: 1.5, y: -60, opacity: 0, rotate: -3 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative bg-[#faf7f2] text-zinc-900 rounded-lg p-6 sm:p-8 shadow-2xl border border-amber-900/20 overflow-hidden"
          style={{
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7), inset 0 0 40px rgba(217, 180, 130, 0.25)',
          }}
        >
          {/* Lined Test Paper Texture & Header Margin */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(transparent, transparent 27px, #e2d9cc 28px)',
            }}
          />
          {/* Red Left Margin Line */}
          <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-red-400/40 pointer-events-none" />

          {/* Test Paper Header */}
          <div className="relative border-b-2 border-zinc-800 pb-4 mb-5 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-zinc-600 uppercase">
                旭高校 3年1組 • 総合学力テスト (ASAHI HIGH)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 mt-0.5">
                EXAMINATION EVALUATION
              </h1>
              <p className="text-xs text-zinc-600 font-medium mt-0.5">
                Examiner: <span className="font-bold text-zinc-800">{examiner.name}</span> ({examiner.title})
              </p>
            </div>

            {/* Score Box */}
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Total Score
              </span>
              <span className="text-3xl sm:text-4xl font-black text-red-600 tracking-tight">
                {testScore}
              </span>
              <span className="text-sm font-bold text-zinc-700"> / 100</span>
            </div>
          </div>

          {/* Hanko Flower Stamp (花丸 - 100点 満点 合格) */}
          <AnimatePresence>
            {stampLanded && (
              <motion.div
                initial={{ scale: 3, opacity: 0, rotate: -35 }}
                animate={{ scale: 1, opacity: 0.92, rotate: -14 }}
                transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                className="absolute top-14 right-6 sm:right-10 pointer-events-none select-none z-10"
              >
                {/* Hanko Stamp SVG */}
                <svg
                  className="w-28 h-28 sm:w-32 sm:h-32 text-red-600 drop-shadow-[0_2px_8px_rgba(220,38,38,0.4)]"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  {/* Outer Flower Petals */}
                  <circle cx="50" cy="50" r="44" strokeDasharray="5 2" strokeWidth="2" />
                  <path
                    d="M50 4 C58 4, 60 14, 68 12 C76 10, 78 20, 84 25 C90 30, 88 40, 93 48 C98 56, 92 64, 91 72 C90 80, 80 84, 76 90 C72 96, 62 94, 54 96 C46 98, 40 92, 32 91 C24 90, 20 98, 14 92 C8 86, 12 78, 9 70 C6 62, 2 54, 4 46 C6 38, 14 36, 15 28 C16 20, 24 16, 30 11 C36 6, 42 4, 50 4 Z"
                    strokeWidth="2"
                    fill="rgba(239, 68, 68, 0.08)"
                  />
                  {/* Inner Stamp Circle */}
                  <circle cx="50" cy="50" r="32" strokeWidth="2.2" />

                  {/* Japanese Stamp Typography */}
                  <text
                    x="50"
                    y="38"
                    textAnchor="middle"
                    fill="#dc2626"
                    fontSize="10"
                    fontWeight="900"
                    stroke="none"
                    fontFamily="serif"
                  >
                    100点 満点
                  </text>
                  <text
                    x="50"
                    y="55"
                    textAnchor="middle"
                    fill="#dc2626"
                    fontSize="14"
                    fontWeight="900"
                    stroke="none"
                    fontFamily="serif"
                  >
                    合 格
                  </text>
                  <text
                    x="50"
                    y="68"
                    textAnchor="middle"
                    fill="#dc2626"
                    fontSize="8"
                    fontWeight="bold"
                    stroke="none"
                    letterSpacing="1px"
                  >
                    BESTANDEN
                  </text>
                </svg>

                {/* Ink Splatter Micro-Dots */}
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600/70" />
                <div className="absolute bottom-2 -left-2 w-1.5 h-1.5 rounded-full bg-red-600/80" />
                <div className="absolute -bottom-1 right-4 w-1 h-1 rounded-full bg-red-600/60" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evaluation Remarks */}
          <div className="relative z-0 text-sm text-zinc-700 leading-relaxed mb-6 font-mono">
            <p className="font-semibold text-zinc-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Official Academic Clearance Certified:
            </p>
            <p className="text-xs text-zinc-600">
              The 5 Nakano sisters demonstrated exceptional academic resolve, exceeding all standard grade thresholds against {examiner.name}.
            </p>
          </div>

          {/* Reward Shimmer Tiles */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="mb-6 bg-zinc-900 text-zinc-100 rounded-xl p-4 shadow-inner border border-amber-500/30"
          >
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Academic Grant & Disbursed Rewards
              </span>
              {tutorMultiplier > 1.0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {tutorMultiplier}x Tutor Bonus Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Yen Grant */}
              <div className="bg-zinc-800/80 border border-white/10 rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Grant</div>
                  <div className="text-sm font-black text-amber-300">+{finalYen.toLocaleString()} ¥</div>
                </div>
              </div>

              {/* Stardust Grant */}
              <div className="bg-zinc-800/80 border border-white/10 rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                  ★
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Stardust</div>
                  <div className="text-sm font-black text-purple-300">+{finalStardust} ★</div>
                </div>
              </div>

              {/* Bonus Voucher (if present) */}
              {bonusItem && (
                <div className="col-span-2 sm:col-span-1 bg-zinc-800/80 border border-white/10 rounded-lg p-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Special</div>
                    <div className="text-xs font-bold text-emerald-300 truncate">{bonusItem}</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Button: Collect Academic Rewards */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCollect}
            className="w-full py-3.5 px-6 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Collect Academic Rewards ▶</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};
