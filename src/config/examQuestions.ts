/**
 * TQQ Vault - Exam Question Registry & Models
 * Authentic in-universe academic exam questions across all 5 subjects
 * for the Exam Showdown chalkboard arena.
 */

import { SubjectType } from '../types/battle';

export interface ExamQuestion {
  id: string;
  subject: SubjectType;
  questionNumber: number; // 1 to 5
  title: string;
  problemText: string;
  formulaOrExcerpt?: string;
  targetPoints: number; // e.g. 20 to 35 Points
  examinerTaunt: string;
  difficultyRating: 'Standard' | 'Challenging' | 'Patriarch Tier';
}

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 'exam_q1_math',
    subject: 'math',
    questionNumber: 1,
    title: 'Gaussian Integral & Polar Convergence',
    problemText:
      'Calculate the convergence of the Gaussian Integral across the exam interval (-∞, +∞) using double polar coordinate transformation.',
    formulaOrExcerpt: '∫_{-∞}^{∞} e^{-x²} dx = √π',
    targetPoints: 20,
    examinerTaunt:
      '„Wer diese Gleichung nicht im Kopf löst, hat an einer Universität nichts verloren.“',
    difficultyRating: 'Standard',
  },
  {
    id: 'exam_q2_science',
    subject: 'science',
    questionNumber: 2,
    title: 'Thermodynamic Equilibrium in Cellular Systems',
    problemText:
      'Evaluate Gibbs free energy dissipation and homeostatic entropy export in closed biological metabolic pathways under physiological temperature constraints.',
    formulaOrExcerpt: 'ΔG = ΔH - TΔS < 0  [Spontaneous Homeostasis]',
    targetPoints: 25,
    examinerTaunt:
      '„Biochemische Grundgesetze sind nicht verhandelbar. Keine Ausreden bei der Thermodynamik.“',
    difficultyRating: 'Challenging',
  },
  {
    id: 'exam_q3_history',
    subject: 'history',
    questionNumber: 3,
    title: 'Sengoku Battle Tactics: Battle of Nagashino (1575)',
    problemText:
      "Deconstruct Oda Nobunaga's tactical deployments at Nagashino and triple-rank arquebus volleys against the Takeda clan cavalry behind the Shitarabara wooden palisades.",
    formulaOrExcerpt: '「長篠の戦い」— 三段撃ち戦術と馬防柵の戦術的連携',
    targetPoints: 25,
    examinerTaunt:
      '„Feudale Taktik erfordert kühle Berechnung. Zeigt mir, ob ihr aus der Geschichte gelernt habt.“',
    difficultyRating: 'Challenging',
  },
  {
    id: 'exam_q4_literature',
    subject: 'literature',
    questionNumber: 4,
    title: 'Classical Heian Aesthetics & Mono no Aware',
    problemText:
      'Parse the rhythmic 5-7-5-7-7 Waka metrical cadence and underlying bittersweet aesthetic melancholy within classical Heian imperial court literature.',
    formulaOrExcerpt: 'もののあわれ (Mono no aware) — 5-7-5-7-7 Classical Waka Meter',
    targetPoints: 30,
    examinerTaunt:
      '„Literaturverständnis verlangt Feingefühl und sprachliche Präzision. Reines Auswendiglernen reicht hier nicht.“',
    difficultyRating: 'Patriarch Tier',
  },
  {
    id: 'exam_q5_english',
    subject: 'english',
    questionNumber: 5,
    title: 'Inverted Subjunctive & Conditional Syntax',
    problemText:
      'Syntactic parsing of conditional subjunctive inversion clauses under strict time constraints with modal auxiliary resolution and rhetorical cadence.',
    formulaOrExcerpt:
      'Had we mastered the fundamentals, our resolve would have stood unyielding.',
    targetPoints: 35,
    examinerTaunt:
      '„Die internationale Wissenschaftssprache verzeiht keine syntaktischen Schwächen. Bringt diese Prüfung zu Ende!“',
    difficultyRating: 'Patriarch Tier',
  },
];

/**
 * Retrieves the exam question associated with a specific round number (1-5) or subject.
 */
export function getExamQuestion(roundNumber: number, subject?: SubjectType): ExamQuestion {
  const normalizedRound = Math.max(1, Math.min(5, roundNumber));
  const foundByRound = EXAM_QUESTIONS.find((q) => q.questionNumber === normalizedRound);

  if (foundByRound) {
    if (subject && foundByRound.subject !== subject) {
      const foundBySubject = EXAM_QUESTIONS.find((q) => q.subject === subject);
      if (foundBySubject) return foundBySubject;
    }
    return foundByRound;
  }

  return EXAM_QUESTIONS[0];
}
