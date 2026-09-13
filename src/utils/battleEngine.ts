/**
 * TQQ Vault - Academic Battle & Turn-Flow Engine
 * v2.4.0 Combat Engine & Sister Skill Roster
 *
 * Implements 3-Phase Round Flow:
 * - Step A: Examiner Pressure Phase (stress damage, debuff reduction, shield absorb)
 * - Step B: Player Action Phase (signature skills, passive assistance, Charm crits)
 * - Step C: Resolution Phase (Victory 100点 満点, Defeat F - Durchgefallen, round advancement)
 */

import {
  BattleDebuff,
  BattleState,
  Examiner,
  RoundExecutionResult,
  SisterBattleCard,
  SubjectType,
  SupportBattleCard,
} from '../types/battle';
import { ROUND_SUBJECTS } from '../config/battleCalculations';

export interface RngOverride {
  damageFactor?: number; // 0.0 to 1.0 (maps to stressVariance)
  charmRoll?: number;     // 0.0 to 1.0
}

/**
 * Step A: Computes incoming stress damage from examiner.
 * Formula: round(rand(stressVariance[0], stressVariance[1]) * DebuffMultiplier)
 * If shieldActive === true, damage is nullified (0) and shield breaks.
 */
export function calculateExaminerPressure(
  examiner: Examiner,
  activeDebuff: BattleDebuff | null,
  shieldActive: boolean,
  damageFactor?: number
): { incomingDamage: number; shieldBlocked: boolean; finalDamage: number; logMessage: string } {
  if (shieldActive) {
    return {
      incomingDamage: 0,
      shieldBlocked: true,
      finalDamage: 0,
      logMessage: `🛡️ Yotsuba's academic shield completely absorbed ${examiner.name}'s mental pressure! (0 Damage)`,
    };
  }

  const [minStress, maxStress] = examiner.stressVariance;
  const factor = damageFactor !== undefined ? Math.max(0, Math.min(1, damageFactor)) : Math.random();
  const rawStress = Math.round(minStress + factor * (maxStress - minStress));

  let debuffMultiplier = 1.0;
  let debuffLog = '';
  if (activeDebuff && activeDebuff.type === 'bluff') {
    debuffMultiplier = Math.max(0, 1.0 - activeDebuff.reduction);
    debuffLog = ` [Actress Bluff: -${Math.round(activeDebuff.reduction * 100)}% Stress]`;
  }

  const finalDamage = Math.round(rawStress * debuffMultiplier);

  return {
    incomingDamage: rawStress,
    shieldBlocked: false,
    finalDamage,
    logMessage: `💥 Examiner ${examiner.name} issued strict examination pressure! Inflicted ${finalDamage} stress${debuffLog}.`,
  };
}

/**
 * Calculates passive baseline assistance from the other 4 unpicked sisters.
 * Formula: 15% of their individual IQ (round(otherSister.stats.iq * 0.15))
 */
export function calculatePassiveAssistance(
  sisters: (SisterBattleCard | null)[],
  chosenSisterIndex: number
): { passivePoints: number; contributors: string[] } {
  let passivePoints = 0;
  const contributors: string[] = [];

  for (let i = 0; i < sisters.length; i++) {
    if (i === chosenSisterIndex) continue;
    const sister = sisters[i];
    if (sister) {
      const contribution = Math.round(sister.stats.iq * 0.15);
      passivePoints += contribution;
      contributors.push(`${sister.name} (+${contribution})`);
    }
  }

  return { passivePoints, contributors };
}

/**
 * Calculates effective Charm (Crit Chance) considering:
 * - Sister base Charm
 * - Cumulative team Charm bonus (e.g. +25% from Nino's Sharp Tongue)
 * - Examiner penalties (e.g. -15% from Maruo)
 * - Miku's guaranteed 100% crit if Fuutarou is support
 */
export function calculateEffectiveCharm(
  sister: SisterBattleCard,
  examiner: Examiner | null,
  supportCard: SupportBattleCard | null,
  currentSubject: SubjectType,
  teamCharmBonus: number
): { effectiveCharm: number; isGuaranteedCrit: boolean } {
  // Miku Sengoku Tactics with Fuutarou support guarantees 100% crit
  if (sister.characterId === 'miku' && supportCard?.characterId === 'fuutarou') {
    return { effectiveCharm: 1.0, isGuaranteedCrit: true };
  }

  let totalCharm = sister.stats.charm + teamCharmBonus;

  // Maruo Nakano penalty: Reduces team Charm by 15%
  if (examiner?.id === 'maruo') {
    totalCharm -= 0.15;
  }

  const effectiveCharm = Math.max(0.0, Math.min(1.0, totalCharm));
  return { effectiveCharm, isGuaranteedCrit: false };
}

/**
 * Step B: Executes the selected sister's signature skill.
 */
export function executeSisterSkill(
  sister: SisterBattleCard,
  incomingExaminerDamage: number,
  currentSubject: SubjectType,
  examiner: Examiner,
  supportCard: SupportBattleCard | null,
  teamResolveMax: number
): {
  points: number;
  isCharged: boolean;
  healsResolve: number;
  activatesShield: boolean;
  activatesDebuff: BattleDebuff | null;
  addedTeamCharm: number;
  reboundPoints: number;
  skillName: string;
  skillDescription: string;
} {
  let points = sister.stats.iq;
  let isCharged = sister.isCharged ?? false;
  let healsResolve = 0;
  let activatesShield = false;
  let activatesDebuff: BattleDebuff | null = null;
  let addedTeamCharm = 0;
  let reboundPoints = 0;
  let skillName = '';
  let skillDescription = '';

  switch (sister.characterId) {
    case 'ichika': {
      skillName = 'Actress Bluff';
      activatesDebuff = { type: 'bluff', roundsRemaining: 2, reduction: 0.40 };
      points = sister.stats.iq;
      skillDescription = `Ichika used Actress Bluff! Activated a 2-round debuff reducing examiner pressure by 40% and generated ${points} base IQ.`;
      break;
    }

    case 'nino': {
      skillName = 'Sharp Tongue';
      reboundPoints = Math.round(incomingExaminerDamage * 0.5);
      addedTeamCharm = 0.25;
      points = sister.stats.iq + reboundPoints;
      skillDescription = `Nino used Sharp Tongue! Rebounded ${reboundPoints} points (50% of examiner pressure) and raised team Charm by +25% for the rest of the battle!`;
      break;
    }

    case 'miku': {
      skillName = 'Sengoku Tactics';
      const isHistory = currentSubject === 'history';
      const multiplier = isHistory ? 3 : 2;
      points = sister.stats.iq * multiplier;
      const isFuutarouBuffed = supportCard?.characterId === 'fuutarou';
      skillDescription = `Miku used Sengoku Tactics! ${isHistory ? 'Tripled IQ (3x) on History exam!' : 'Doubled IQ (2x)!'} Scored ${points} base points${isFuutarouBuffed ? ' with Fuutarou guaranteed Critical Focus!' : '.'}`;
      break;
    }

    case 'yotsuba': {
      skillName = 'Full Effort';
      healsResolve = Math.round(teamResolveMax * 0.35);
      activatesShield = true;
      points = sister.stats.iq;
      skillDescription = `Yotsuba went Full Effort! Restored +${healsResolve} Resolve (35% max) and deployed an academic shield for the next round!`;
      break;
    }

    case 'itsuki': {
      if (!isCharged) {
        skillName = 'Brain-Food Appetite (Eating)';
        isCharged = true;
        points = 0;
        healsResolve = Math.round(teamResolveMax * 0.15);
        skillDescription = `Itsuki spent the round studying with Curry & Borgar! Restored +${healsResolve} Resolve (15% max) and charged her Borgar Strike for next turn!`;
      } else {
        skillName = 'Brain-Food Appetite (Borgar Strike)';
        isCharged = false;
        points = Math.round(sister.stats.iq * 3.5);
        skillDescription = `Itsuki unleashed Borgar Strike! Dealt massive 350% base IQ as ${points} test points!`;
      }
      break;
    }
  }

  // Examiner Weakness Bonus: If round subject matches examiner weakness, +25% output
  if (currentSubject === examiner.weaknessSubject) {
    points = Math.round(points * 1.25);
    skillDescription += ` [Weakness Exploit (${examiner.weaknessSubject.toUpperCase()}): +25% Bonus!]`;
  }

  return {
    points,
    isCharged,
    healsResolve,
    activatesShield,
    activatesDebuff,
    addedTeamCharm,
    reboundPoints,
    skillName,
    skillDescription,
  };
}

/**
 * Main Turn Execution Engine:
 * Coordinates Step A (Examiner Pressure) -> Step B (Player Action) -> Step C (Resolution)
 */
export function executeRoundTurn(
  state: BattleState,
  sisters: (SisterBattleCard | null)[],
  supportCard: SupportBattleCard | null,
  chosenSisterIndex: number,
  rngOverride?: RngOverride
): {
  nextState: BattleState;
  nextSisters: (SisterBattleCard | null)[];
  result: RoundExecutionResult;
} {
  const examiner = state.examiner;
  if (!examiner) {
    throw new Error('Cannot execute round: Examiner is null');
  }

  const sister = sisters[chosenSisterIndex];
  if (!sister) {
    throw new Error(`Invalid sister slot chosen: ${chosenSisterIndex}`);
  }

  const logMessages: string[] = [];
  const currentRound = state.currentRound;
  const currentSubject = state.subject;

  // ==========================================
  // STEP A: EXAMINER PRESSURE PHASE
  // ==========================================
  const pressureResult = calculateExaminerPressure(
    examiner,
    state.activeDebuff,
    state.shieldActive,
    rngOverride?.damageFactor
  );

  logMessages.push(pressureResult.logMessage);

  const teamResolveBefore = state.teamResolveCurrent;
  let teamResolveAfter = Math.max(0, teamResolveBefore - pressureResult.finalDamage);

  // Check Defeat in Step A
  if (teamResolveAfter <= 0) {
    logMessages.push(`💀 F - Durchgefallen! Team Resolve collapsed under ${examiner.name}'s scrutiny!`);

    const result: RoundExecutionResult = {
      roundNumber: currentRound,
      subject: currentSubject,
      chosenSisterIndex,
      chosenSisterName: sister.name,
      incomingDamage: pressureResult.incomingDamage,
      shieldBlocked: pressureResult.shieldBlocked,
      damageTaken: pressureResult.finalDamage,
      healedAmount: 0,
      sisterBasePoints: 0,
      passiveAssistancePoints: 0,
      reboundPoints: 0,
      isCritical: false,
      totalPointsEarned: 0,
      stolenPoints: 0,
      testProgressBefore: state.testProgress,
      testProgressAfter: state.testProgress,
      teamResolveBefore,
      teamResolveAfter: 0,
      isVictory: false,
      isDefeated: true,
      logMessages,
    };

    const nextState: BattleState = {
      ...state,
      teamResolveCurrent: 0,
      isActive: false,
      isDefeated: true,
      lastExaminerDamage: pressureResult.finalDamage,
      shieldActive: false,
      battleLog: [...state.battleLog, ...logMessages],
    };

    return { nextState, nextSisters: sisters, result };
  }

  // ==========================================
  // STEP B: PLAYER ACTION PHASE
  // ==========================================
  // 1. Signature Skill
  const skillResult = executeSisterSkill(
    sister,
    pressureResult.finalDamage,
    currentSubject,
    examiner,
    supportCard,
    state.teamResolveMax
  );

  logMessages.push(skillResult.skillDescription);

  // Apply Healing from skill if any
  if (skillResult.healsResolve > 0) {
    teamResolveAfter = Math.min(state.teamResolveMax, teamResolveAfter + skillResult.healsResolve);
  }

  // 2. Passive Baseline Assistance from other 4 sisters
  const passive = calculatePassiveAssistance(sisters, chosenSisterIndex);
  if (passive.passivePoints > 0) {
    logMessages.push(`🤝 Sisters' Study Group: Contributed +${passive.passivePoints} passive IQ (${passive.contributors.join(', ')}).`);
  }

  // 3. Roll Charm for Critical Strike
  const updatedTeamCharmBonus = state.teamCharmBonus + skillResult.addedTeamCharm;
  const charmInfo = calculateEffectiveCharm(
    sister,
    examiner,
    supportCard,
    currentSubject,
    updatedTeamCharmBonus
  );

  const charmRoll = rngOverride?.charmRoll !== undefined ? rngOverride.charmRoll : Math.random();
  const isCritical = charmInfo.isGuaranteedCrit || charmRoll < charmInfo.effectiveCharm;

  let totalPointsEarned = skillResult.points + passive.passivePoints;
  if (isCritical) {
    totalPointsEarned = Math.round(totalPointsEarned * 2.0);
    logMessages.push(`⚡ CRITICAL STRIKE! High-impact breakthrough! Points doubled to ${totalPointsEarned}!`);
  }

  // 4. Special Examiner Penalty Check
  let stolenPoints = 0;
  if (examiner.id === 'takeda' && totalPointsEarned < 20) {
    stolenPoints = 10;
    logMessages.push(`⚠️ Yusuke Takeda's Academic Rivalry stole 10 test points due to scoring under 20 this round!`);
  }

  const netPoints = Math.max(0, totalPointsEarned - stolenPoints);
  const testProgressBefore = state.testProgress;
  const testProgressAfter = Math.min(100, testProgressBefore + netPoints);

  logMessages.push(`📊 Round ${currentRound} Summary: Scored +${netPoints} Net Test Points. Total: ${testProgressAfter}/100.`);

  // Update Sister State
  const nextSisters = sisters.map((s, idx) => {
    if (idx === chosenSisterIndex && s) {
      return {
        ...s,
        isCharged: skillResult.isCharged,
        skillUsed: true,
      };
    }
    return s;
  });

  // ==========================================
  // STEP C: RESOLUTION PHASE
  // ==========================================
  let isVictory = false;
  let isDefeated = false;
  let isActive = true;
  let nextRound = currentRound;
  let nextSubject = currentSubject;
  let nextDebuff = skillResult.activatesDebuff || state.activeDebuff;

  // Victory Condition: 100 Test Points reached
  if (testProgressAfter >= 100) {
    isVictory = true;
    isActive = false;
    logMessages.push(`🎓 100点 満点 - BESTANDEN! The Nakano sisters conquered the exam with a perfect score!`);
  } else {
    // Check if 5 rounds completed
    if (currentRound >= 5) {
      isDefeated = true;
      isActive = false;
      logMessages.push(`⏰ F - Durchgefallen! Exam time concluded after 5 rounds with ${testProgressAfter}/100 points.`);
    } else {
      // Advance to next round
      nextRound = currentRound + 1;
      nextSubject = ROUND_SUBJECTS[nextRound] || 'english';
      logMessages.push(`🔔 Advancing to Round ${nextRound}: ${nextSubject.toUpperCase()}!`);

      // Decrement existing debuff if active from earlier rounds
      if (nextDebuff && !skillResult.activatesDebuff) {
        const remaining = nextDebuff.roundsRemaining - 1;
        if (remaining <= 0) {
          logMessages.push(`🎭 Examiner cleared their mind. Actress Bluff expired.`);
          nextDebuff = null;
        } else {
          nextDebuff = { ...nextDebuff, roundsRemaining: remaining };
        }
      }
    }
  }

  const result: RoundExecutionResult = {
    roundNumber: currentRound,
    subject: currentSubject,
    chosenSisterIndex,
    chosenSisterName: sister.name,
    incomingDamage: pressureResult.incomingDamage,
    shieldBlocked: pressureResult.shieldBlocked,
    damageTaken: pressureResult.finalDamage,
    healedAmount: skillResult.healsResolve,
    sisterBasePoints: skillResult.points,
    passiveAssistancePoints: passive.passivePoints,
    reboundPoints: skillResult.reboundPoints,
    isCritical,
    totalPointsEarned,
    stolenPoints,
    testProgressBefore,
    testProgressAfter,
    teamResolveBefore,
    teamResolveAfter,
    isVictory,
    isDefeated,
    logMessages,
  };

  const nextState: BattleState = {
    ...state,
    isActive,
    currentRound: nextRound,
    subject: nextSubject,
    testProgress: testProgressAfter,
    teamResolveCurrent: teamResolveAfter,
    activeDebuff: nextDebuff,
    shieldActive: skillResult.activatesShield,
    teamCharmBonus: updatedTeamCharmBonus,
    lastExaminerDamage: pressureResult.finalDamage,
    isVictory,
    isDefeated,
    screenShakeTrigger: isCritical ? state.screenShakeTrigger + 1 : state.screenShakeTrigger,
    battleLog: [...state.battleLog, ...logMessages],
  };

  return { nextState, nextSisters, result };
}
