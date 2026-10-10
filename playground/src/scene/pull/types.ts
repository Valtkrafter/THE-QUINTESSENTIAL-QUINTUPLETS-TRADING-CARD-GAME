import type { FinishId } from '../../cards/finish';
import type { Card } from '../../cards/model';
import { revealOrder, type ShowPack } from './director';

/** What the final picture is put through after the glowing background is drawn: a blur towards the middle and colour fringes. */
export interface PostState {
  /** 0..1, how strongly the picture is blurred towards the middle. */
  blur: number;
  /** 0..1, how far the red and blue channels drift apart towards the edges. */
  aberration: number;
}

/** One card of a pack as the show needs it. */
export interface ScenePull {
  readonly card: Card;
  readonly finish: FinishId;
}

export interface ScenePack {
  /** In the order the cards came out of the pack. */
  readonly pulls: readonly ScenePull[];
}

/** What the director needs to know about the packs: only the rarities. */
export function showPacksOf(packs: readonly ScenePack[]): readonly ShowPack[] {
  return packs.map((pack) => ({ rarities: pack.pulls.map((pull) => pull.card.rarity) }));
}

/** The reveal order of every pack: indices into `pulls`, weaker cards first and the best last. */
export function ordersOf(packs: readonly ScenePack[]): readonly (readonly number[])[] {
  return showPacksOf(packs).map((pack) => revealOrder(pack));
}
