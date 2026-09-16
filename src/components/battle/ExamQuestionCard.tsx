'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExamQuestion } from '../../config/examQuestions';
import { SisterBattleCard, TurnPhase } from '../../types/battle';
import { Award, BookOpen, Flame, Sparkles } from 'lucide-react';

interface ExamQuestionCardProps {
  question: ExamQuestion;
  currentRound: number;
  turnPhase: TurnPhase;
  selectedSister: SisterBattleCard | null;
  estimatedPoints: number;
  examinerName?: string;
  isCutinPlaying?: boolean;
  onStartRound: () => void;
  onSolve: () => void;
}

const SUBJECT_BADGE_CONFIG: Record<
  string,
  { label: string; icon: string; border: string; text: string; bg: string }
> = {
  math: {
    label: 'ADVANCED MATHEMATICS',
    icon: '📐',
    border: 'border-blue-500/40',
    text: 'text-blue-300',
    bg: 'bg-blue-950/50',
  },
  science: {
    label: 'CELLULAR BIOPHYSICS',
    icon: '🧪',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/50',
  },
  history: {
    label: 'SENGOKU ERA HISTORY',
    icon: '📜',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    bg: 'bg-amber-950/50',
  },
  literature: {
    label: 'CLASSICAL HEIAN LITERATURE',
    icon: '🖋️',
    border: 'border-purple-500/40',
    text: 'text-purple-300',
    bg: 'bg-purple-950/50',
  },
  english: {
    label: 'ACADEMIC ENGLISH',
    icon: '🌐',
    border: 'border-cyan-500/40',
    text: 'text-cyan-300',
    bg: 'bg-cyan-950/50',
  },
};

const DIFFICULTY_STYLES: Record<string, string> = {
  Standard: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
  Challenging: 'bg-amber-950/60 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  'Patriarch Tier':
    'bg-red-950/70 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse',
};

export const ExamQuestionCard: React.FC<ExamQuestionCardProps> = ({
  question,
  currentRound,
  turnPhase,
  selectedSister,
  estimatedPoints,
  examinerName = 'Maruo Nakano',
  isCutinPlaying = false,
  onStartRound,
  onSolve,
}) => {
  const subjectBadge = SUBJECT_BADGE_CONFIG[question.subject] || SUBJECT_BADGE_CONFIG.math;
  const isAwaitingStart = turnPhase === 'awaiting_start';
  const isSisterSelected = turnPhase === 'sister_selected' && selectedSister !== null;
  const isQuestionRevealed = turnPhase === 'question_revealed';
  const isExecuting = turnPhase === 'executing_turn' || isCutinPlaying;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative bg-[#151b26]/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-2xl w-full mx-auto select-none overflow-visible"
      style={{
        boxShadow:
          '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 30px rgba(6, 182, 212, 0.1)',
      }}
    >
      {/* Subtle Amber Chalk Grid Vignette Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5 rounded-2xl overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ============================================================ */}
      {/* 1. TOP ROW: HANKO STAMP, SUBJECT BADGE, POINTS, DIFFICULTY   */}
      {/* ============================================================ */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        {/* Left: Japanese Hanko Stamp & Subject Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Top-Left Hanko Stamp Badge */}
          <div className="border-2 border-red-500/80 text-red-400 bg-red-950/40 rounded px-2 py-0.5 font-mono font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_0_8px_rgba(239,68,68,0.3)] rotate-[-2deg] flex items-center gap-1">
            <span>印</span>
            <span>PROBLEM [{currentRound}/5]</span>
          </div>

          {/* Subject Badge */}
          <div
            className={`px-2.5 py-0.5 rounded-md border text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${subjectBadge.bg} ${subjectBadge.border} ${subjectBadge.text}`}
          >
            <span>{subjectBadge.icon}</span>
            <span className="hidden sm:inline">{subjectBadge.label}</span>
            <span className="sm:hidden">{question.subject.toUpperCase()}</span>
          </div>
        </div>

        {/* Right: Target Yield & Difficulty Pill */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>+{question.targetPoints} PTS</span>
          </div>

          <div
            className={`px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
              DIFFICULTY_STYLES[question.difficultyRating] || DIFFICULTY_STYLES.Standard
            }`}
          >
            {question.difficultyRating}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CENTER: TITLE, PROBLEM TEXT & FORMULA CALLOUT              */}
      {/* ============================================================ */}
      <div className="relative z-10 py-3 sm:py-3.5 space-y-2.5">
        {/* Problem Title */}
        <h3 className="text-sm sm:text-base font-extrabold text-amber-300 tracking-wide flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{question.title}</span>
        </h3>

        {/* Question Text (Chalk-white serif) */}
        <div className="relative">
          {isAwaitingStart ? (
            <div className="py-2 px-3 rounded-lg bg-black/40 border border-dashed border-zinc-700 text-center">
              <p className="text-zinc-400 font-mono text-xs sm:text-sm">
                🔒 Official Examination Sheet Sealed. Click below to reveal the problem.
              </p>
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-zinc-100 text-xs sm:text-sm font-medium leading-relaxed font-serif"
            >
              {question.problemText}
            </motion.p>
          )}
        </div>

        {/* Dedicated Formula Callout Box */}
        {question.formulaOrExcerpt && !isAwaitingStart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="bg-[#0c1017]/90 border border-cyan-500/30 rounded-lg p-2.5 sm:p-3 font-mono text-cyan-300 text-center text-xs sm:text-sm tracking-wide shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)] overflow-x-auto"
          >
            {question.formulaOrExcerpt}
          </motion.div>
        )}

        {/* Examiner Commentary */}
        {!isAwaitingStart && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="text-[11px] sm:text-xs italic text-zinc-400 text-center leading-relaxed font-mono px-2"
          >
            {question.examinerTaunt}
            <span className="not-italic text-zinc-500 block text-[10px] mt-0.5 font-bold">
              — Examiner {examinerName}
            </span>
          </motion.p>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. BOTTOM: INTERACTIVE PLAY / ACTION BUTTON BAR               */}
      {/* ============================================================ */}
      <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STATE A: AWAITING START -> BEGIN ROUND BUTTON */}
          {isAwaitingStart && (
            <motion.button
              key="btn-awaiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartRound}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:brightness-110 text-black font-black px-8 py-3 rounded-xl shadow-lg shadow-amber-500/25 text-sm sm:text-base uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 border border-amber-300/40"
            >
              <span>▶</span>
              <span>
                BEGIN ROUND {currentRound}: {question.subject.toUpperCase()}
              </span>
            </motion.button>
          )}

          {/* STATE B: QUESTION REVEALED -> PULSING SELECT SISTER PROMPT */}
          {isQuestionRevealed && (
            <motion.div
              key="banner-select-sister"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="w-full py-2 px-4 rounded-xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs sm:text-sm font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40"
            >
              <motion.span
                animate={{ y: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="text-base"
              >
                👇
              </motion.span>
              <span className="animate-pulse">SELECT A SISTER TO SOLVE THIS PROBLEM</span>
              <motion.span
                animate={{ y: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="text-base"
              >
                👇
              </motion.span>
            </motion.div>
          )}

          {/* STATE C: SISTER SELECTED -> SOLVE WITH SISTER BUTTON */}
          {isSisterSelected && (
            <motion.button
              key="btn-solve"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.97 }}
              disabled={isExecuting}
              onClick={onSolve}
              className={`w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:brightness-110 text-black font-black px-8 py-3 rounded-xl shadow-xl shadow-cyan-500/30 text-sm sm:text-base uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 border border-white/20 ${
                isExecuting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isExecuting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>DISPATCHING SOLUTION...</span>
                </>
              ) : (
                <>
                  <span>⚔️</span>
                  <span>
                    SOLVE WITH {selectedSister.name.toUpperCase()} (EST. +{estimatedPoints} PTS)
                  </span>
                  <span>▶</span>
                </>
              )}
            </motion.button>
          )}

          {/* EXECUTING STATE (FALLBACK) */}
          {isExecuting && !isSisterSelected && (
            <motion.div
              key="state-executing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-cyan-400 font-mono text-xs sm:text-sm font-bold flex items-center gap-2 py-2"
            >
              <span className="animate-spin">⏳</span>
              <span>Processing academic turn...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
