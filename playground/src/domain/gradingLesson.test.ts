import { describe, expect, it } from 'vitest';
import { CATALOG } from '../cards/catalog';
import { GRADING_FEE_YEN, cheapestToGrade, gradingFee } from './grading';
import { addOwnedCard, newSaveGame } from './save';

const NOW = 1_800_000_000_000;

function copiesOf(...cardIds: readonly string[]) {
  let save = newSaveGame('lesson', NOW);
  for (const cardId of cardIds) {
    save = addOwnedCard(save, cardId, 'standard', 'pack', NOW).save;
  }
  return save.collection;
}

describe('the card of the grading lesson', () => {
  it('is nothing when there is no loose card', () => {
    expect(cheapestToGrade([])).toBeUndefined();
  });

  it('is a card of the cheapest fee, never one of a dearer class', () => {
    const common = CATALOG.find((card) => card.rarity === 'C');
    const top = CATALOG.find((card) => card.rarity === 'UR');
    if (common === undefined || top === undefined) {
      throw new Error('the set has no Common or Ultra Rare');
    }
    const copies = copiesOf(top.id, common.id, top.id, common.id);
    const pick = cheapestToGrade(copies);
    expect(pick?.cardId).toBe(common.id);
    expect(pick && gradingFee(CATALOG.find((card) => card.id === pick.cardId)?.rarity ?? 'UR')).toBe(GRADING_FEE_YEN.C);
  });

  it('is the cleanest one among cards of the same fee', () => {
    const common = CATALOG.find((card) => card.rarity === 'C');
    if (common === undefined) {
      throw new Error('the set has no Common');
    }
    const copies = copiesOf(common.id, common.id, common.id, common.id);
    const look = (condition: { centering: number; corners: number; edges: number; surface: number }) => (condition.centering + condition.corners + condition.edges + condition.surface) / 4;
    const best = Math.max(...copies.map((copy) => look(copy.condition)));
    const pick = cheapestToGrade(copies);
    expect(pick && look(pick.condition)).toBe(best);
  });
});
