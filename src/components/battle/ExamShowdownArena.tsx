'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBattleStore } from '../../store/useBattleStore';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import { MangaSkillCutin } from './MangaSkillCutin';
import { HankoVictoryModal } from './HankoVictoryModal';
import { BattleDeckDrawer } from './BattleDeckDrawer';
import { CardRenderer } from '../card/CardRenderer';
import { ExamQuestionCard } from './ExamQuestionCard';
import { FocusEnergyMeter } from './FocusEnergyMeter';
import { ArtsHandDock } from './ArtsHandDock';
import { EXAMINERS } from '../../config/examiners';
import { getExamQuestion } from '../../config/examQuestions';
import { ROUND_SUBJECTS } from '../../config/battleCalculations';
import { ArtsCard, SisterBattleCard } from '../../types/battle';
import { calculateComboMultiplier } from '../../utils/battleEngine';
import {
  Shield,
  Zap,
  Heart,
  BookOpen,
  RotateCcw,
  Sparkles,
  Flame,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Award,
  Layers,
  GraduationCap,
} from 'lucide-react';

const SISTER_PALETTE = {
  ichika: {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.6)',
    glow: '0 0 20px rgba(245, 158, 11, 0.4)',
    skillTitle: 'Actress Bluff',
    skillDesc: '-40% Examiner Pressure for 2 rounds + Base IQ',
  },
  nino: {
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.6)',
    glow: '0 0 20px rgba(236, 72, 153, 0.4)',
    skillTitle: 'Sharp Tongue',
    skillDesc: 'Rebounds 50% examiner pressure as pts + 25% team Charm',
  },
  miku: {
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.6)',
    glow: '0 0 20px rgba(6, 182, 212, 0.4)',
    skillTitle: 'Sengoku Tactics',
    skillDesc: '3x IQ on History (2x other) + 100% Crit with Fuutarou',
  },
  yotsuba: {
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.6)',
    glow: '0 0 20px rgba(16, 185, 129, 0.4)',
    skillTitle: 'Full Effort',
    skillDesc: 'Heals +35% max Resolve & activates 100% stress shield',
  },
  itsuki: {
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.6)',
    glow: '0 0 20px rgba(239, 68, 68, 0.4)',
    skillTitle: 'Brain-Food Appetite',
    skillDesc: 'Turn 1 eats (+15% HP & charges) -> Turn 2 hits 350% base IQ',
  },
};

interface ExamShowdownArenaProps {
  onExit?: () => void;
}

export const ExamShowdownArena: React.FC<ExamShowdownArenaProps> = ({ onExit }) => {
  // Store bindings
  const battleState = useBattleStore((state) => state.battleState);
  const sisterCards = useBattleStore((state) => state.sisterCards);
  const supportCard = useBattleStore((state) => state.supportCard);
  const battleDeck = useBattleStore((state) => state.battleDeck);
  const assignSisterToDeck = useBattleStore((state) => state.assignSisterToDeck);
  const assignSupportToDeck = useBattleStore((state) => state.assignSupportToDeck);
  const initBattle = useBattleStore((state) => state.initBattle);
  const startRound = useBattleStore((state) => state.startRound);
  const selectActiveSister = useBattleStore((state) => state.selectActiveSister);
  const setSelectedSisterSlot = useBattleStore((state) => state.setSelectedSisterSlot);
  const executeTurn = useBattleStore((state) => state.executeTurn);
  const resetBattle = useBattleStore((state) => state.resetBattle);
  const isCutinPlaying = useBattleStore((state) => state.battleState.isCutinPlaying);
  const setCutinPlaying = useBattleStore((state) => state.setCutinPlaying);

  // Stage 3 Arts-Card Store Bindings
  const combatState = useBattleStore((state) => state.combatState);
  const playArtsCard = useBattleStore((state) => state.playArtsCard);
  const chargeFocus = useBattleStore((state) => state.chargeFocus);
  const tickFocus = useBattleStore((state) => state.tickFocus);
  const setCombatState = useBattleStore((state) => state.setCombatState);
  const executeExaminerAttack = useBattleStore((state) => state.executeExaminerAttack);

  const inventory = useGameStore((state) => state.inventory);

  // Local interaction state
  const [activeCutinSister, setActiveCutinSister] = useState<{
    sister: SisterBattleCard;
    index: number;
    source?: 'turn' | 'arts_ultimate';
  } | null>(null);
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
  const [showDeckDrawer, setShowDeckDrawer] = useState<boolean>(false);
  const [selectedExaminerId, setSelectedExaminerId] = useState<string>('maruo');

  // Stage 3: Combat Engine Real-Time State
  const [isChargingFocus, setIsChargingFocus] = useState<boolean>(false);
  const [pressureCountdown, setPressureCountdown] = useState<number>(5.5);
  const [examinerAttackBanner, setExaminerAttackBanner] = useState<{ message: string; blocked: boolean } | null>(null);
  const [lastArtsImpact, setLastArtsImpact] = useState<{
    card: ArtsCard;
    points: number;
    heal: number;
    shield: boolean;
    combo: number;
    multiplier: number;
    timestamp: number;
  } | null>(null);
  const [comboTimeRemaining, setComboTimeRemaining] = useState<number>(0);

  // Auto-fill deck with inventory sisters if deck empty
  const isDeckEmpty = useMemo(() => {
    return battleDeck.sisters.every((s) => s === null);
  }, [battleDeck.sisters]);

  const handleAutoFillDeck = () => {
    playSound('card_slide');
    const sistersOrder: Array<'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki'> = [
      'ichika',
      'nino',
      'miku',
      'yotsuba',
      'itsuki',
    ];

    sistersOrder.forEach((charId, idx) => {
      const available = inventory.find((c) => c.characterId === charId);
      if (available) {
        assignSisterToDeck(idx, available);
      }
    });

    const tutor = inventory.find((c) =>
      ['fuutarou', 'raiha', 'maruo', 'takeda'].includes(c.characterId)
    );
    if (tutor) {
      assignSupportToDeck(tutor);
    }
  };

  // Start battle if not active
  useEffect(() => {
    if (!battleState.isActive && !battleState.isVictory && !battleState.isDefeated) {
      initBattle(selectedExaminerId);
    }
  }, [battleState.isActive, battleState.isVictory, battleState.isDefeated, selectedExaminerId, initBattle]);

  // Active exam question
  const currentQuestion = useMemo(() => {
    return getExamQuestion(battleState.currentRound, battleState.subject);
  }, [battleState.currentRound, battleState.subject]);

  // Active selected sister
  const selectedSister = useMemo(() => {
    if (battleState.selectedSisterSlot === null) return null;
    return sisterCards[battleState.selectedSisterSlot] || null;
  }, [battleState.selectedSisterSlot, sisterCards]);

  // Estimated points calculation for selected sister
  const estimatedPoints = useMemo(() => {
    const selectedIdx = battleState.selectedSisterSlot;
    if (selectedIdx === null) return 0;
    const sister = sisterCards[selectedIdx];
    if (!sister) return 0;

    const currentSubject = battleState.subject;
    const examiner = battleState.examiner;

    let points = sister.stats.iq;
    if (sister.characterId === 'miku') {
      points = points * (currentSubject === 'history' ? 3 : 2);
    } else if (sister.characterId === 'itsuki') {
      points = sister.isCharged ? Math.round(sister.stats.iq * 3.5) : 0;
    }

    // Examiner Weakness Bonus: +25%
    if (examiner && currentSubject === examiner.weaknessSubject) {
      points = Math.round(points * 1.25);
    }

    // Passive assistance from other sisters: 15% of individual IQ
    let passivePoints = 0;
    for (let i = 0; i < sisterCards.length; i++) {
      if (i === selectedIdx) continue;
      const other = sisterCards[i];
      if (other) {
        passivePoints += Math.round(other.stats.iq * 0.15);
      }
    }

    // If Miku + Fuutarou support, 100% crit chance doubles the points
    if (sister.characterId === 'miku' && supportCard?.characterId === 'fuutarou') {
      return (points + passivePoints) * 2;
    }

    return points + passivePoints;
  }, [battleState.selectedSisterSlot, battleState.subject, battleState.examiner, sisterCards, supportCard]);

  // Heartbeat pulse sound when resolve < 25%
  const resolveRatio = battleState.teamResolveMax > 0
    ? battleState.teamResolveCurrent / battleState.teamResolveMax
    : 1.0;

  useEffect(() => {
    if (battleState.isActive && resolveRatio > 0 && resolveRatio < 0.25) {
      const interval = setInterval(() => {
        playSound('heartbeat_pulse', 0.6);
      }, 1600);
      return () => clearInterval(interval);
    }
  }, [battleState.isActive, resolveRatio]);

  // Screen shake on trigger
  const [screenShake, setScreenShake] = useState<boolean>(false);
  useEffect(() => {
    if (battleState.screenShakeTrigger > 0) {
      setScreenShake(true);
      playSound('crit_flash', 0.85);
      const timer = setTimeout(() => setScreenShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [battleState.screenShakeTrigger]);

  // Continuous Focus Regen (+5/sec)
  useEffect(() => {
    if (!battleState.isActive || battleState.isVictory || battleState.isDefeated) return;
    const interval = setInterval(() => {
      tickFocus(200);
    }, 200);
    return () => clearInterval(interval);
  }, [battleState.isActive, battleState.isVictory, battleState.isDefeated, tickFocus]);

  const MAX_PRESSURE_TIME = 5.5;

  // Examiner Counter-Pressure Countdown Loop
  useEffect(() => {
    if (!battleState.isActive || battleState.isVictory || battleState.isDefeated || isCutinPlaying) return;

    const interval = setInterval(() => {
      // Pause countdown when player is holding Concentrate/Charge button
      if (isChargingFocus) return;

      setPressureCountdown((prev) => {
        if (prev <= 0.1) {
          const attackResult = executeExaminerAttack();
          if (attackResult) {
            if (attackResult.shieldBlocked) {
              playSound('clean_chime', 0.85);
              setExaminerAttackBanner({ message: '🛡️ Prüfungsfrage abgewehrt! (Shield Blocked)', blocked: true });
            } else {
              playSound('stress_impact', 0.9);
              setExaminerAttackBanner({ message: `💥 Prüfungsfrage trifft! -${attackResult.finalDamage} HP Stress!`, blocked: false });
            }
            setTimeout(() => setExaminerAttackBanner(null), 1600);
          }
          return MAX_PRESSURE_TIME;
        }
        return Math.max(0, Number((prev - 0.1).toFixed(1)));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [battleState.isActive, battleState.isVictory, battleState.isDefeated, isCutinPlaying, isChargingFocus, executeExaminerAttack]);

  // Real-time Combo Window Decay (2.0s timeout)
  useEffect(() => {
    if (combatState.comboCount <= 0 || !combatState.lastCardPlayedTimestamp) {
      setComboTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (combatState.lastCardPlayedTimestamp || 0);
      const remaining = Math.max(0, 2000 - elapsed);
      setComboTimeRemaining(remaining);

      if (remaining <= 0) {
        setCombatState({ comboCount: 0 });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [combatState.comboCount, combatState.lastCardPlayedTimestamp, setCombatState]);

  const currentMultiplier = useMemo(() => {
    return calculateComboMultiplier(combatState.comboCount);
  }, [combatState.comboCount]);

  // Turn Flow Handlers
  const handleStartRound = () => {
    playSound('chalk_scribble', 0.7);
    startRound();
  };

  const handleSisterClick = (sisterIndex: number) => {
    if (!battleState.isActive || isCutinPlaying || battleState.isVictory || battleState.isDefeated) return;
    const sister = sisterCards[sisterIndex];
    if (!sister || sister.skillUsed) return;

    if (battleState.turnPhase === 'awaiting_start') {
      playSound('chalk_scribble', 0.7);
      startRound();
    } else {
      playSound('card_slide', 0.6);
    }
    selectActiveSister(sisterIndex);
  };

  const handleSolveAction = () => {
    const selectedIdx = battleState.selectedSisterSlot;
    if (selectedIdx === null || isCutinPlaying || !battleState.isActive) return;
    const sister = sisterCards[selectedIdx];
    if (!sister || sister.skillUsed) return;

    playSound('manga_slash', 0.8);
    setActiveCutinSister({ sister, index: selectedIdx, source: 'turn' });
    setCutinPlaying(true);
  };

  const handlePlayArtsCard = (card: ArtsCard) => {
    if (!battleState.isActive || isCutinPlaying || battleState.isVictory || battleState.isDefeated) return;

    const result = playArtsCard(card.id);
    if (!result) return;

    // If Ultimate Card: trigger 800ms Manga Cut-in!
    if (card.type === 'ultimate') {
      const sisterIdx = sisterCards.findIndex((s) => s?.characterId === card.sisterId);
      const cutinSister = (sisterIdx >= 0 && sisterCards[sisterIdx])
        ? sisterCards[sisterIdx]!
        : sisterCards.find((s) => s !== null);

      if (cutinSister) {
        setActiveCutinSister({
          sister: cutinSister,
          index: sisterIdx >= 0 ? sisterIdx : 0,
          source: 'arts_ultimate',
        });
        setCutinPlaying(true);
      }
    }

    // Trigger visual impact flash on chalkboard
    setLastArtsImpact({
      card,
      points: result.pointsDealt,
      heal: result.healedAmount,
      shield: result.shieldActivated,
      combo: result.comboCount,
      multiplier: result.comboMultiplier,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      setLastArtsImpact(null);
    }, 900);
  };

  const handleCutinComplete = () => {
    if (activeCutinSister) {
      if (activeCutinSister.source !== 'arts_ultimate') {
        executeTurn(activeCutinSister.index);
        playSound('stress_impact', 0.7);
      }
    }
    setCutinPlaying(false);
    setActiveCutinSister(null);
  };

  // Dynamic examiner taunt resolution
  const examinerTaunt = useMemo(() => {
    const ex = battleState.examiner || EXAMINERS[0];
    if (battleState.isVictory) return '...Remarkable. You have exceeded my rigorous expectations.';
    if (battleState.isDefeated) return 'Incompetent! Report back for supplementary weekend lectures.';
    if (resolveRatio < 0.25) return 'Your mental stamina is near breaking point. Give up!';
    if (resolveRatio < 0.5) return 'Your concentration is faltering. Maintain discipline!';
    if (battleState.shieldActive) return 'An academic shield? Let us see how long you can sustain it.';
    if (battleState.activeDebuff) return 'Tch... Trying to bluff an examiner with cheap stage tricks?';
    if (battleState.testProgress > 70) return 'Impending pass? I will grade with double scrutiny!';
    if (battleState.currentRound === 1) return `Round 1: ${ROUND_SUBJECTS[1].toUpperCase()}. Let us begin the examination.`;
    return `Round ${battleState.currentRound}: Show me your mastery in ${battleState.subject.toUpperCase()}!`;
  }, [battleState, resolveRatio]);

  return (
    <div
      className={`relative w-full h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] flex flex-col justify-between overflow-hidden select-none bg-gradient-to-b from-[#181e29] via-[#10141d] to-[#0d1117] ${
        screenShake ? 'animate-bounce' : ''
      }`}
    >
      {/* ============================================================ */}
      {/* 1. FAINT CHALKBOARD MATHEMATICAL FORMULAS BACKGROUND         */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden font-serif">
        {/* Chalk Noise Texture */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1.5px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Floating Formulas */}
        <div className="absolute top-12 left-8 text-xl text-white/20 select-none">
          ∫₀^∞ e^(-x²) dx = √π / 2
        </div>
        <div className="absolute top-36 right-16 text-2xl text-white/20 select-none">
          E = mc²
        </div>
        <div className="absolute bottom-48 left-20 text-lg text-white/15 select-none">
          ∑ (1/n²) = π² / 6
        </div>
        <div className="absolute top-64 left-1/3 text-lg text-white/15 select-none">
          ∇ × B = μ₀J + μ₀ε₀(∂E/∂t)
        </div>
        <div className="absolute bottom-36 right-28 text-xl text-white/20 select-none">
          e^(iπ) + 1 = 0
        </div>
      </div>

      {/* Critical Health Screen Vignette Heartbeat */}
      {resolveRatio < 0.25 && battleState.isActive && (
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_90px_rgba(239,68,68,0.7)]"
        />
      )}

      {/* ============================================================ */}
      {/* 2. TOP ZONE: EXAMINER BOARD & DUAL GAUGES                    */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-3 flex flex-col gap-2">
        {/* Top Header Bar: Subject, Round, Examiner Switcher & Actions */}
        <div className="flex items-center justify-between bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2">
          {/* Round & Subject Badge */}
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Round {battleState.currentRound} / 5: {battleState.subject.toUpperCase()}
            </div>
            {battleState.examiner && (
              <span className="hidden sm:inline text-xs text-zinc-400 font-medium">
                Weakness: <strong className="text-cyan-300 uppercase">{battleState.examiner.weaknessSubject}</strong> (+25% Pts)
              </span>
            )}
          </div>

          {/* Active Buffs Indicators */}
          <div className="flex items-center gap-2">
            {battleState.shieldActive && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Shield Active
              </span>
            )}
            {battleState.activeDebuff && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Bluff (-40% Stress)
              </span>
            )}
            {battleState.teamCharmBonus > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3" /> +{Math.round(battleState.teamCharmBonus * 100)}% Charm
              </span>
            )}

            {/* Battle Log Toggle */}
            <button
              onClick={() => setShowLogDrawer(!showLogDrawer)}
              className="px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded border border-white/10 transition-colors"
            >
              Log ({battleState.battleLog.length})
            </button>

            {/* Deck Builder Drawer Toggle */}
            <button
              onClick={() => {
                playSound('card_slide');
                setShowDeckDrawer(true);
              }}
              className="px-2.5 py-1 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Open Tactical Deck Builder"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Deck Builder</span>
            </button>

            {/* Reset Battle */}
            <button
              onClick={() => {
                playSound('clean_chime');
                resetBattle();
                initBattle(selectedExaminerId);
              }}
              title="Restart Battle"
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {onExit && (
              <button
                onClick={onExit}
                className="px-2.5 py-1 text-xs font-bold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 rounded transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* Main Center Stage: Examiner Portrait & Dynamic Speech Taunt */}
        <div className="flex items-center justify-between gap-4 mt-1">
          {/* Left Status: Test Progress Gauge */}
          <div className="flex-1 bg-black/50 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 shadow-lg shadow-cyan-950/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Test Progress
              </span>
              <span className="text-sm font-black text-cyan-300">
                {battleState.testProgress} <span className="text-xs text-cyan-500">/ 100 Pkt.</span>
              </span>
            </div>

            {/* 5-Block Segmented Bar with Electric Glow */}
            <div className="relative h-4 bg-zinc-900/90 rounded-full overflow-hidden border border-cyan-500/40 p-0.5 flex gap-1">
              {[0, 1, 2, 3, 4].map((blockIdx) => {
                const blockMin = blockIdx * 20;
                const fillRatio = Math.max(0, Math.min(1, (battleState.testProgress - blockMin) / 20));
                return (
                  <div key={blockIdx} className="flex-1 h-full bg-zinc-800 rounded-sm overflow-hidden relative">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_12px_#06b6d4]"
                      initial={{ width: 0 }}
                      animate={{ width: `${fillRatio * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1 px-1">
              <span>0%</span>
              <span>40%</span>
              <span>60%</span>
              <span>80%</span>
              <span className="text-cyan-400 font-bold">100% (Pass)</span>
            </div>
          </div>

          {/* Center: Examiner Portrait with Counter-Pressure Bar & Taunt Bubble */}
          <div className="relative flex flex-col items-center flex-shrink-0">
            {/* Dynamic Taunt Speech Bubble */}
            <motion.div
              key={examinerTaunt}
              initial={{ scale: 0.9, opacity: 0, y: 5 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="absolute -top-10 max-w-xs text-center px-3 py-1.5 rounded-lg bg-zinc-900/95 border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-xl shadow-black/60 pointer-events-none z-20 whitespace-nowrap"
            >
              {examinerTaunt}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-amber-500/40 rotate-45" />
            </motion.div>

            {/* Examiner Counter-Pressure Bar */}
            <div className="w-full max-w-[120px] mb-1 flex flex-col items-center z-10">
              <div className="flex items-center justify-between w-full px-0.5 text-[9px] font-mono font-black">
                <span
                  className={`flex items-center gap-0.5 ${
                    pressureCountdown <= 1.5 ? 'text-red-400 animate-pulse' : 'text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {pressureCountdown <= 0.1 ? 'ANGRIFF!' : `Prüfung in ${pressureCountdown.toFixed(1)}s!`}
                </span>
                {isChargingFocus && (
                  <span className="text-[8px] text-cyan-300 font-bold bg-cyan-950/80 px-1 rounded border border-cyan-500/40 animate-pulse">
                    ⏸ CHARGE
                  </span>
                )}
              </div>
              {/* Countdown Gauge Fill */}
              <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/20 p-0.2 mt-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    pressureCountdown <= 1.5
                      ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (pressureCountdown / MAX_PRESSURE_TIME) * 100))}%` }}
                />
              </div>
            </div>

            {/* Examiner Frame */}
            <div
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 bg-zinc-950 flex items-center justify-center ${
                pressureCountdown <= 1.5
                  ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.7)] ring-2 ring-red-500/50'
                  : 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={battleState.examiner?.portraitPath || '/cards/TQQ/Maruo/maru 1.jpg'}
                alt={battleState.examiner?.name || 'Examiner'}
                className="w-full h-full object-cover object-top filter contrast-125 brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <span className="absolute bottom-1 font-black text-[10px] text-amber-300 uppercase tracking-tight text-center px-1">
                {battleState.examiner?.name.split(' ')[0]}
              </span>
            </div>

            {/* Attack Outcome Banner */}
            <AnimatePresence>
              {examinerAttackBanner && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1.05, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -10 }}
                  className={`absolute -bottom-8 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xl z-40 whitespace-nowrap border ${
                    examinerAttackBanner.blocked
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-emerald-950/80'
                      : 'bg-red-950 text-red-200 border-red-500/60 shadow-red-950/80 animate-bounce'
                  }`}
                >
                  {examinerAttackBanner.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Examiner Selector Pills */}
            <div className="flex gap-1 mt-1.5">
              {EXAMINERS.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExaminerId(ex.id);
                    initBattle(ex.id);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                    battleState.examiner?.id === ex.id
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  {ex.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Right Status: Team Resolve Gauge */}
          <div className="flex-1 bg-black/50 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 shadow-lg shadow-emerald-950/30">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  resolveRatio < 0.25
                    ? 'text-red-400 animate-pulse'
                    : resolveRatio < 0.5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" /> Team Resolve
              </span>
              <span
                className={`text-sm font-black ${
                  resolveRatio < 0.25
                    ? 'text-red-400'
                    : resolveRatio < 0.5
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {battleState.teamResolveCurrent}{' '}
                <span className="text-xs text-zinc-500">/ {battleState.teamResolveMax} HP</span>
              </span>
            </div>

            {/* Health Bar with Color Transitions */}
            <div className="relative h-4 bg-zinc-900/90 rounded-full overflow-hidden border border-white/10 p-0.5">
              <motion.div
                className={`h-full rounded-full ${
                  resolveRatio < 0.25
                    ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_15px_#ef4444]'
                    : resolveRatio < 0.5
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_15px_#f59e0b]'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_15px_#10b981]'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${Math.max(0, Math.min(100, resolveRatio * 100))}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1 px-1">
              <span className={resolveRatio < 0.25 ? 'text-red-400 font-bold' : ''}>Danger &lt;25%</span>
              <span className={resolveRatio < 0.5 && resolveRatio >= 0.25 ? 'text-amber-400 font-bold' : ''}>
                Caution &lt;50%
              </span>
              <span className="text-emerald-400 font-bold">Stable</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. LOG DRAWER & TAC TICKET OVERLAY                          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showLogDrawer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 right-4 z-40 w-96 max-h-80 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl p-4 overflow-y-auto font-mono text-xs text-zinc-300"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider">Exam Tactical Log</span>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {battleState.battleLog.map((entry, idx) => (
                <div key={idx} className="leading-snug py-0.5 border-b border-zinc-900/50">
                  {entry}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 3. CENTRAL EXAM QUESTION BOARD & CHALKBOARD ZONE            */}
      {/* ============================================================ */}
      <div className="relative z-10 overflow-visible flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
        {/* Floating Real-Time Combo Counter Arcade Banner */}
        <AnimatePresence>
          {combatState.comboCount > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              className="absolute top-2 z-30 px-3 py-1 rounded-full bg-black/85 border border-amber-400/60 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 font-mono"
            >
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-400">
                <span className="animate-bounce">🔥</span>
                <span>{combatState.comboCount} COMBO!</span>
              </div>
              <div className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                {currentMultiplier.toFixed(2)}x Yield
              </div>
              {/* Combo Window 2s Decay Bar */}
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, (comboTimeRemaining / 2000) * 100))}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Impact Flash on Chalkboard */}
        <AnimatePresence>
          {lastArtsImpact && (
            <motion.div
              key={lastArtsImpact.timestamp}
              initial={{ opacity: 0.95, scale: 0.7, y: 15 }}
              animate={{ opacity: 1, scale: 1.05, y: 0 }}
              exit={{ opacity: 0, scale: 1.3, y: -15 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute pointer-events-none z-30 flex flex-col items-center justify-center p-4 rounded-2xl bg-black/85 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.8)] backdrop-blur-md"
            >
              <div className="text-amber-300 font-mono font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2 drop-shadow-lg">
                <span>⚡</span>
                {lastArtsImpact.card.type === 'support'
                  ? `+${lastArtsImpact.heal} RESOLVE HP!`
                  : `+${lastArtsImpact.points} TEST POINTS!`}
              </div>
              {lastArtsImpact.multiplier > 1.0 && (
                <div className="text-cyan-300 font-black text-xs uppercase tracking-widest mt-1">
                  🔥 {lastArtsImpact.combo} HIT COMBO! ({lastArtsImpact.multiplier.toFixed(2)}x MULTIPLIER)
                </div>
              )}
              {lastArtsImpact.shield && (
                <div className="text-emerald-300 font-black text-xs uppercase tracking-wider mt-1">
                  🛡️ ACADEMIC SHIELD ACTIVATED!
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isDeckEmpty ? (
          <div className="max-w-lg w-full bg-amber-950/80 border border-amber-500/50 rounded-xl p-4 text-center shadow-xl">
            <p className="text-sm text-amber-200 font-bold mb-2">
              ⚠️ No Nakano Sisters currently assigned to the Exam Battle Deck!
            </p>
            <button
              onClick={handleAutoFillDeck}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-lg shadow-lg cursor-pointer transition-all"
            >
              Auto-Fill Deck From Collection ▶
            </button>
          </div>
        ) : (
          <ExamQuestionCard
            question={currentQuestion}
            currentRound={battleState.currentRound}
            turnPhase={battleState.turnPhase}
            selectedSister={selectedSister}
            estimatedPoints={estimatedPoints}
            examinerName={battleState.examiner?.name}
            isCutinPlaying={isCutinPlaying}
            onStartRound={handleStartRound}
            onSolve={handleSolveAction}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM ZONE: WOODEN SISTER EXAM DESK (Z-30 RELATIVE)      */}
      {/* ============================================================ */}
      <div
        className="relative z-30 w-full pt-2 pb-2 px-3 sm:px-4 bg-gradient-to-b from-[#2a1f18] via-[#221812] to-[#17100b] border-t-4 border-[#3e2c22] shadow-[0_-15px_40px_rgba(0,0,0,0.8)]"
        style={{
          boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.6), 0 -10px 30px rgba(0,0,0,0.8)',
        }}
      >
        {/* Tutor Mentor Dais Flank */}
        {supportCard && (
          <div className="max-w-7xl mx-auto mb-1.5 flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Active Support Tutor:
              </span>
              <span className="font-semibold text-white">{supportCard.name}</span>
              <span className="text-zinc-400">({supportCard.passiveDescription})</span>
            </div>
            <div className="text-amber-300 font-mono font-bold">
              +{Math.round(supportCard.iqBuffPercent * 100)}% Team IQ | {supportCard.rewardMultiplier}x Rewards
            </div>
          </div>
        )}

        {/* ACTIVE ARTS-CARD COMBAT DOCK & FOCUS ENERGY METER */}
        <div className="max-w-7xl mx-auto w-full px-2 mb-2 flex items-center justify-center gap-3 sm:gap-4 relative z-30 overflow-visible">
          {/* Left: Focus Energy Arc/Vertical Ki Meter */}
          <FocusEnergyMeter
            focusEnergy={combatState.focusEnergy}
            maxFocus={combatState.maxFocus}
            onCharge={(amount) => chargeFocus(amount || 40)}
            onChargingStateChange={setIsChargingFocus}
            disabled={!battleState.isActive || battleState.isVictory || battleState.isDefeated}
          />

          {/* Center: 4 Horizontal Arts Cards Hand Dock */}
          <ArtsHandDock
            hand={combatState.hand}
            focusEnergy={combatState.focusEnergy}
            onPlayCard={handlePlayArtsCard}
            disabled={!battleState.isActive || isCutinPlaying || battleState.isVictory || battleState.isDefeated}
          />
        </div>

        {/* DEDICATED NON-FLOATING BOTTOM COMMAND TRAY */}
        <div className="max-w-7xl mx-auto w-full px-2 mb-2 relative z-30">
          {selectedSister ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="w-full bg-zinc-950/95 border-2 rounded-xl p-2.5 sm:p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md"
              style={{
                borderColor: SISTER_PALETTE[selectedSister.characterId].color,
                boxShadow: `0 0 25px ${SISTER_PALETTE[selectedSister.characterId].color}33`,
              }}
            >
              {/* Left: Sister Info & Signature Skill */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm text-black flex-shrink-0 shadow-md"
                  style={{ backgroundColor: SISTER_PALETTE[selectedSister.characterId].color }}
                >
                  {selectedSister.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white uppercase tracking-wider">
                      {selectedSister.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{
                        backgroundColor: SISTER_PALETTE[selectedSister.characterId].bg,
                        color: SISTER_PALETTE[selectedSister.characterId].color,
                        border: `1px solid ${SISTER_PALETTE[selectedSister.characterId].border}`,
                      }}
                    >
                      {SISTER_PALETTE[selectedSister.characterId].skillTitle}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 line-clamp-1 mt-0.5">
                    {SISTER_PALETTE[selectedSister.characterId].skillDesc}
                  </p>
                </div>
              </div>

              {/* Center: Real-Time Combat Stats Cluster */}
              <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
                <div className="bg-zinc-900/90 border border-white/10 rounded-lg px-2.5 py-1 text-center">
                  <span className="text-[10px] text-zinc-500 block uppercase">Base IQ</span>
                  <span className="font-black text-white">{selectedSister.stats.iq}</span>
                </div>
                <div className="bg-zinc-900/90 border border-white/10 rounded-lg px-2.5 py-1 text-center">
                  <span className="text-[10px] text-zinc-500 block uppercase">Charm</span>
                  <span className="font-black text-pink-400">
                    {Math.round((selectedSister.stats.charm + battleState.teamCharmBonus) * 100)}%
                  </span>
                </div>
                <div className="bg-zinc-900/90 border border-white/10 rounded-lg px-2.5 py-1 text-center">
                  <span className="text-[10px] text-zinc-500 block uppercase">Resolve</span>
                  <span className="font-black text-emerald-400">+{selectedSister.stats.resolve} HP</span>
                </div>
                <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-lg px-3 py-1 text-center shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                  <span className="text-[10px] text-cyan-400 block uppercase font-bold">Est. Yield</span>
                  <span className="font-black text-cyan-300 text-sm">+{estimatedPoints} PTS</span>
                </div>
              </div>

              {/* Right: Action Buttons (Solve / Unlock) */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setSelectedSisterSlot(null)}
                  className="px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
                  title="Unlock Focus Stage"
                >
                  ✕ Unlock
                </button>

                <button
                  disabled={selectedSister.skillUsed || isCutinPlaying || !battleState.isActive}
                  onClick={handleSolveAction}
                  className={`px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedSister.skillUsed
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-black border border-amber-300/40 shadow-amber-500/30 active:scale-95'
                  }`}
                >
                  {selectedSister.skillUsed ? (
                    <span>✓ Already Dispatched</span>
                  ) : (
                    <>
                      <span>⚔️</span>
                      <span>Solve Problem ▶</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full bg-zinc-950/60 border border-white/10 rounded-xl py-2 px-4 flex items-center justify-between text-xs text-zinc-400 font-mono backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">👉</span>
                <span className="text-zinc-300 font-medium">Click a Sister Card below to lock into the Focus Stage and view tactical commands</span>
              </div>
              {battleState.examiner && (
                <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-[11px]">
                  <span>Examiner Weakness:</span>
                  <span className="text-amber-300 font-bold uppercase">{battleState.examiner.weaknessSubject}</span>
                  <span className="text-zinc-500">(+25% Pts)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ergonomic Arc Sister Docks (5 Sister Slots) (Z-30 RELATIVE) */}
        <div className="max-w-7xl mx-auto flex items-end justify-center gap-2 sm:gap-4 md:gap-6 pt-3 pb-2 relative z-30">
          {sisterCards.map((sister, slotIdx) => {
            const cardInstance = battleDeck.sisters[slotIdx];
            if (!sister || !cardInstance) {
              return (
                <div
                  key={slotIdx}
                  onClick={() => {
                    playSound('card_slide');
                    setShowDeckDrawer(true);
                  }}
                  className="w-24 sm:w-32 md:w-40 aspect-[63/88] rounded-xl border-2 border-dashed border-zinc-700 hover:border-amber-500/50 bg-black/40 flex flex-col items-center justify-center p-2 text-center text-zinc-500 cursor-pointer transition-all hover:scale-105 relative z-10"
                >
                  <span className="text-xl mb-1">➕</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Empty Slot {slotIdx + 1}</span>
                  <span className="text-[8px] text-amber-400/80 mt-0.5 font-mono font-semibold">Assign Sister Card</span>
                </div>
              );
            }

            const palette = SISTER_PALETTE[sister.characterId];
            const isActed = sister.skillUsed;
            const canAct = battleState.isActive && !isActed && !isCutinPlaying;
            const isSelected = battleState.selectedSisterSlot === slotIdx;
            const isPromptBouncing =
              battleState.turnPhase === 'question_revealed' &&
              battleState.selectedSisterSlot === null &&
              canAct;

            return (
              <div
                key={sister.cardId || slotIdx}
                className={`flex flex-col items-center transition-all ${
                  isSelected ? 'z-40 relative' : 'z-10 relative'
                }`}
              >
                {/* Card Dock Frame with Signature Readiness Ring */}
                <motion.div
                  animate={
                    isPromptBouncing
                      ? { y: [0, -8, 0] }
                      : isSelected
                      ? { y: -24, scale: 1.05 }
                      : { y: 0, scale: 1 }
                  }
                  transition={
                    isPromptBouncing
                      ? {
                          repeat: Infinity,
                          duration: 1.3,
                          delay: slotIdx * 0.12,
                          ease: 'easeInOut',
                        }
                      : { type: 'spring', stiffness: 350, damping: 22 }
                  }
                  onClick={() => {
                    if (isSelected) {
                      handleSolveAction();
                    } else {
                      handleSisterClick(slotIdx);
                    }
                  }}
                  className={`relative w-24 sm:w-32 md:w-40 aspect-[63/88] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'ring-4 ring-offset-2 ring-offset-zinc-950 shadow-2xl z-40'
                      : canAct
                      ? 'ring-2 shadow-xl hover:ring-white/40'
                      : isActed
                      ? 'opacity-40 grayscale filter cursor-not-allowed'
                      : 'opacity-80'
                  }`}
                  style={{
                    boxShadow: isSelected
                      ? `0 0 35px ${palette.color}, 0 0 15px ${palette.color}, 0 -12px 30px ${palette.color}80`
                      : canAct
                      ? palette.glow
                      : undefined,
                    borderColor: palette.color,
                  }}
                >
                  {/* Readiness Ring Border */}
                  <div
                    className="absolute inset-0 rounded-xl border-2 pointer-events-none z-10"
                    style={{
                      borderColor: isSelected
                        ? palette.color
                        : isActed
                        ? '#52525b'
                        : palette.color,
                    }}
                  />

                  {/* Selected Indicator Badge (Anchored on Active Card) */}
                  {isSelected && (
                    <div
                      className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-black z-30 shadow-md whitespace-nowrap animate-pulse"
                      style={{ backgroundColor: palette.color }}
                    >
                      ★ FOCUS STAGE
                    </div>
                  )}

                  {/* Anchored Bottom Quick Stats Bar when in Focus Stage */}
                  {isSelected && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/90 backdrop-blur-sm border-t border-white/20 p-1 text-[9px] font-mono text-center z-30">
                      <div className="font-bold text-white flex justify-around">
                        <span>IQ {sister.stats.iq}</span>
                        <span className="text-pink-400">
                          {Math.round((sister.stats.charm + battleState.teamCharmBonus) * 100)}%
                        </span>
                      </div>
                      <div className="text-cyan-300 font-black text-[8px] uppercase tracking-wider mt-0.5">
                        +{estimatedPoints} PTS • CLICK TO SOLVE
                      </div>
                    </div>
                  )}

                  {/* Render Slotted Card using CardRenderer */}
                  <CardRenderer
                    card={cardInstance}
                    interactive={false}
                    disableTilt={true}
                    thumbnail={true}
                    className="w-full h-full"
                  />

                  {/* Acted Stamp Overlay */}
                  {isActed && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                      <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-700 text-[10px] font-black uppercase tracking-wider rotate-[-12deg]">
                        Acted
                      </span>
                    </div>
                  )}

                  {/* Itsuki Charged Glow Indicator */}
                  {sister.characterId === 'itsuki' && sister.isCharged && (
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[9px] uppercase tracking-wider z-20 shadow-lg"
                    >
                      ⚡ Borgar Ready
                    </motion.div>
                  )}
                </motion.div>

                {/* Character Name & Slot Label */}
                <div className="mt-1.5 text-center">
                  <span
                    className="text-[11px] font-black uppercase tracking-wider block"
                    style={{ color: isActed ? '#71717a' : palette.color }}
                  >
                    {sister.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono block">
                    Slot {slotIdx + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. CINEMATIC MANGA CUT-IN SEQUENCE (800ms)                   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isCutinPlaying && activeCutinSister && (
          <MangaSkillCutin
            sister={activeCutinSister.sister}
            imageUrl={battleDeck.sisters[activeCutinSister.index]?.imageUrl}
            onComplete={handleCutinComplete}
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 6. HANKO VICTORY STAMP MODAL                                 */}
      {/* ============================================================ */}
      <AnimatePresence>
        {battleState.isVictory && battleState.examiner && (
          <HankoVictoryModal
            examiner={battleState.examiner}
            testScore={battleState.testProgress}
            tutorMultiplier={supportCard?.rewardMultiplier ?? 1.0}
            onCollect={() => {
              playSound('clean_chime');
              resetBattle();
              if (onExit) onExit();
            }}
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 7. DEFEAT SCREEN: F - DURCHGEFALLEN                          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {battleState.isDefeated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full bg-zinc-950 border-2 border-red-600 rounded-2xl p-6 text-center shadow-2xl shadow-red-950/60"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-red-500 tracking-tight mb-1 font-serif">
                F — DURCHGEFALLEN
              </h2>
              <p className="text-xs text-zinc-400 mb-4 font-mono">
                Team Resolve collapsed under {battleState.examiner?.name}&apos;s pressure. Score attained: {battleState.testProgress} / 100.
              </p>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 mb-5 text-left text-xs text-zinc-400">
                <div className="font-bold text-zinc-300 mb-1">Examiner Evaluation:</div>
                <div className="italic text-zinc-400">&ldquo;{battleState.examiner?.specialExamPenalty}&rdquo;</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    playSound('card_slide');
                    resetBattle();
                    initBattle(selectedExaminerId);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Retry Exam Session ↺
                </button>
                {onExit && (
                  <button
                    onClick={onExit}
                    className="py-3 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Return
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 8. TACTICAL BATTLE DECK BUILDER SLIDE-OVER DRAWER             */}
      {/* ============================================================ */}
      <BattleDeckDrawer
        isOpen={showDeckDrawer}
        onClose={() => setShowDeckDrawer(false)}
      />
    </div>
  );
};
