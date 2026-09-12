'use client';

import React, { useMemo } from 'react';
import { MobileDrawer } from '../ui/MobileDrawer';
import { useGameStore } from '../../store/useGameStore';
import { resolveActiveSupportBuff } from '../../config/supportBuffs';
import { soundEngine } from '../../utils/audioEngine';
import { hapticLightTap, hapticJackpot } from '../../utils/haptics';
import {
  BookOpen,
  CheckCircle2,
  Sparkles,
  Coins,
  PackageOpen,
  Award,
  Layers,
  Zap,
} from 'lucide-react';

export interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  baseTarget: number;
  currentProgress: number;
  rewardYen: number;
  rewardDust: number;
}

export const QuestModal: React.FC<QuestModalProps> = ({ isOpen, onClose }) => {
  const stats = useGameStore((state) => state.stats);
  const inventory = useGameStore((state) => state.inventory);
  const showcaseSlots = useGameStore((state) => state.showcaseSlots);
  const cardDex = useGameStore((state) => state.cardDex);
  const supportSlot = useGameStore((state) => state.supportSlot);
  const claimedQuestIds = useGameStore((state) => state.claimedQuestIds ?? []);
  const claimQuest = useGameStore((state) => state.claimQuest);

  // Active Support Buff: Fuutarou R reduces quest targets by 20%
  const activeSupportBuff = useMemo(() => {
    return resolveActiveSupportBuff(supportSlot);
  }, [supportSlot]);

  const questReduction = activeSupportBuff?.effects.questThresholdReduction ?? 0;

  const dexDiscoveredCount = useMemo(() => {
    if (!cardDex) return 0;
    return Object.values(cardDex).filter((e) => e.discovered).length;
  }, [cardDex]);

  const slottedShowcaseCount = useMemo(() => {
    return (showcaseSlots ?? []).filter((s) => Boolean(s.cardInstanceId)).length;
  }, [showcaseSlots]);

  // Derive Daily Quests list
  const quests = useMemo<QuestDef[]>(() => {
    const scale = (target: number) => {
      if (questReduction <= 0) return target;
      return Math.max(1, Math.round(target * (1 - questReduction)));
    };

    return [
      {
        id: 'study_session',
        title: 'Study Session 101',
        description: 'Open at least 1 booster pack to discover new study material.',
        icon: <PackageOpen className="w-4 h-4 text-amber-400" />,
        baseTarget: scale(1),
        currentProgress: stats.totalPacksOpened ?? 0,
        rewardYen: 500,
        rewardDust: 20,
      },
      {
        id: 'vitrine_squad',
        title: 'Nakano Study Group',
        description: 'Mount 3 or more sister cards in your 5-slot Acrylic Vitrine.',
        icon: <Layers className="w-4 h-4 text-pink-400" />,
        baseTarget: scale(3),
        currentProgress: slottedShowcaseCount,
        rewardYen: 800,
        rewardDust: 30,
      },
      {
        id: 'grading_lab',
        title: 'Laboratory Certification',
        description: 'Submit a card for BGS grading certification in the Vault.',
        icon: <Award className="w-4 h-4 text-cyan-400" />,
        baseTarget: scale(1),
        currentProgress: stats.totalCardsGraded ?? 0,
        rewardYen: 1200,
        rewardDust: 50,
      },
      {
        id: 'stardust_dust',
        title: 'Stardust Synthesis',
        description: 'Accumulate at least 30 total Stardust from card vaporization.',
        icon: <Sparkles className="w-4 h-4 text-violet-400" />,
        baseTarget: scale(30),
        currentProgress: stats.totalStardustEarned ?? 0,
        rewardYen: 600,
        rewardDust: 25,
      },
      {
        id: 'dex_master',
        title: 'Master Catalog Expansion',
        description: 'Discover 8 or more unique card silhouettes in the Card-Dex.',
        icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
        baseTarget: scale(8),
        currentProgress: dexDiscoveredCount,
        rewardYen: 2000,
        rewardDust: 100,
      },
    ];
  }, [questReduction, stats, slottedShowcaseCount, dexDiscoveredCount]);

  const handleClaim = (q: QuestDef) => {
    hapticJackpot();
    soundEngine.playCoinPulseSound();
    claimQuest(q.id, q.rewardYen, q.rewardDust);
  };

  return (
    <MobileDrawer isOpen={isOpen} onClose={onClose} title="Fuutarou's Study Notebook">
      <div className="space-y-4 pb-6 font-sans">
        {/* Tutor Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 to-slate-900 border border-blue-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider block">
              Daily Study Curriculum
            </span>
            <h3 className="text-base font-black text-white">Academic Drills</h3>
            <p className="text-xs text-zinc-300 mt-0.5">
              Complete Fuutarou&apos;s daily exercises to earn Yen &amp; Stardust!
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Support Buff Badge */}
        {questReduction > 0 && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Fuutarou (R) Active: <strong>-{(questReduction * 100).toFixed(0)}%</strong> Target Easing
            </span>
          </div>
        )}

        {/* Quest List */}
        <div className="space-y-2.5">
          {quests.map((q) => {
            const isCompleted = q.currentProgress >= q.baseTarget;
            const isClaimed = claimedQuestIds.includes(q.id);
            const progressPct = Math.min(100, Math.round((q.currentProgress / q.baseTarget) * 100));

            return (
              <div
                key={q.id}
                className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-2 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {q.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{q.title}</h4>
                      <p className="text-[11px] text-zinc-400 leading-snug">{q.description}</p>
                    </div>
                  </div>

                  {/* Rewards preview badge */}
                  <div className="text-right font-mono text-[10px] shrink-0">
                    <span className="text-emerald-400 font-bold block">+{q.rewardYen} ¥</span>
                    <span className="text-violet-400 font-bold block">+{q.rewardDust} ★</span>
                  </div>
                </div>

                {/* Progress Bar & Claim Button */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                      <span>Progress</span>
                      <span>
                        {Math.min(q.currentProgress, q.baseTarget)} / {q.baseTarget}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Action button */}
                  {isClaimed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-500 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Claimed
                    </span>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaim(q)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-mono text-[11px] font-black uppercase tracking-wider transition active:scale-95 shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-500 font-mono text-[10px] font-medium shrink-0">
                      Incomplete
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileDrawer>
  );
};

export default QuestModal;
