import { SET_CODE, SET_SIZE, cardById } from '../../cards/catalog';
import { gradeBand } from '../../domain/grading';
import type { OwnedCard } from '../../domain/ownership';
import { findFinish } from '../../holo/finishes';
import type { SlabLabelInfo } from '../../holo/slabLabel';
import { formatCardNumber, formatDate, formatGrade, formatSubGrade } from '../format';

/** The words on the label of a graded copy's slab, or null for a copy that has not been graded (or a card that does not exist). */
export function slabLabelInfo(copy: OwnedCard): SlabLabelInfo | null {
  const card = cardById(copy.cardId);
  if (card === undefined || copy.grade === null) {
    return null;
  }
  const { overall, sub, gradedAt } = copy.grade;
  const band = gradeBand(overall);
  return {
    name: card.name.en,
    title: card.title,
    detail: `${SET_CODE} · ${formatCardNumber(card.number, SET_SIZE)} · ${card.rarity} · ${findFinish(copy.finish).label}`,
    date: formatDate(gradedAt),
    score: formatGrade(overall),
    band: band.id,
    bandLabel: band.label,
    subs: [
      { short: 'CEN', value: formatSubGrade(sub.centering) },
      { short: 'COR', value: formatSubGrade(sub.corners) },
      { short: 'EDG', value: formatSubGrade(sub.edges) },
      { short: 'SUR', value: formatSubGrade(sub.surface) },
    ],
  };
}
