import { describe, expect, it } from 'vitest';
import { cardById } from '../../cards/catalog';
import { submitForGrading } from '../../domain/grading';
import { addOwnedCard, newSaveGame } from '../../domain/save';
import { formatGrade, formatSubGrade } from '../format';
import { slabLabelInfo } from './slabInfo';

const NOW = 1_760_000_000_000;

function gradedCopy(cardId: string) {
  const added = addOwnedCard(newSaveGame('slab-info', NOW), cardId, 'gold', 'pack', NOW);
  const rich = { ...added.save, player: { yen: 5000 } };
  const graded = submitForGrading(rich, added.owned.uid, NOW + 1);
  return { loose: added.owned, graded: graded.copy };
}

describe('the words on a slab label', () => {
  it('are missing for a copy that has not been graded', () => {
    expect(slabLabelInfo(gradedCopy('TQQ01-010').loose)).toBeNull();
  });

  it('carry the card, the score and the four marks in print order', () => {
    const { graded } = gradedCopy('TQQ01-010');
    const info = slabLabelInfo(graded);
    expect(info).not.toBeNull();
    if (info === null || graded.grade === null) {
      return;
    }
    expect(info.name).toBe(cardById('TQQ01-010')?.name.en);
    expect(info.detail).toContain('TQQ01');
    expect(info.detail).toContain('010/079');
    expect(info.detail).toContain('Gold Foil');
    expect(info.score).toBe(formatGrade(graded.grade.overall));
    expect(info.subs.map((sub) => sub.short)).toEqual(['CEN', 'COR', 'EDG', 'SUR']);
    expect(info.subs.map((sub) => sub.value)).toEqual([
      formatSubGrade(graded.grade.sub.centering),
      formatSubGrade(graded.grade.sub.corners),
      formatSubGrade(graded.grade.sub.edges),
      formatSubGrade(graded.grade.sub.surface),
    ]);
  });
});

describe('how a grade is printed', () => {
  it('shows whole scores without a decimal and halves with one, and a mark always with one', () => {
    expect(formatGrade(10)).toBe('10');
    expect(formatGrade(9)).toBe('9');
    expect(formatGrade(9.5)).toBe('9.5');
    expect(formatSubGrade(9)).toBe('9.0');
    expect(formatSubGrade(9.74)).toBe('9.7');
  });
});
