// The small parts of the battle table that are only drawn: a box on the stage, the piles, who is who, the memories, what the rival's
// Active Character is weak to, and the big picture of the card under the pointer. They show what they are given and do nothing else.

import type { CSSProperties, ReactNode } from 'react';
import { cardById } from '../../cards/catalog';
import { AFFINITY_INFO } from '../../cards/characters';
import type { FinishId } from '../../cards/finish';
import type { Affinity, CharacterCard } from '../../cards/model';
import { MEMORIES_TO_WIN } from '../../battle/rules';
import { CardFace } from '../components/CardFace';
import { cx } from '../format';
import { text } from '../text';
import type { Box, Point, Size } from './layout';
import styles from './Table.module.css';

/** A box on the stage. */
export function Placed({
  box,
  className,
  label,
  anchor,
  children,
}: {
  readonly box: Box;
  readonly className?: string;
  readonly label?: string;
  /** Where the introduction can point at it (`data-tutorial`). */
  readonly anchor?: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      className={cx(styles.placed, className)}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      role={label === undefined ? undefined : 'group'}
      aria-label={label}
      data-tutorial={anchor}
    >
      {children}
    </div>
  );
}

// --- Piles ---------------------------------------------------------------------------------------------------------------------

/** A deck: a few card backs, with the number of cards on it. */
export function DeckPile({ point, size, count, label }: { readonly point: Point; readonly size: Size; readonly count: number; readonly label: string }) {
  return (
    <div className={styles.pile} style={{ left: point.x, top: point.y, width: size.w, height: size.h }} role="img" aria-label={`${label}: ${text.battle.board.cardsInDeck(count)}`}>
      {count > 0 ? (
        <>
          <i className={styles.back} />
          {count > 1 && <i className={styles.back} />}
          {count > 2 && <i className={styles.back} />}
        </>
      ) : (
        <i className={styles.emptyPile} />
      )}
      <b className={styles.count}>{count}</b>
      <span className={styles.pileLabel} style={{ top: size.h + 7 }}>
        {label}
      </span>
    </div>
  );
}

/** A discard pile: the card that was put on it last, with the number of cards. */
export function DiscardPile({ point, size, cards, label, finishOf }: { readonly point: Point; readonly size: Size; readonly cards: readonly string[]; readonly label: string; readonly finishOf: (cardId: string) => FinishId }) {
  const topId = cards[cards.length - 1];
  const top = topId === undefined ? undefined : cardById(topId);
  return (
    <div className={styles.pile} style={{ left: point.x, top: point.y, width: size.w, height: size.h }} role="img" aria-label={`${label}: ${text.battle.board.cardsInDeck(cards.length)}`}>
      {top === undefined ? (
        <i className={styles.emptyPile} />
      ) : (
        <span className={styles.discardTop}>
          <CardFace card={top} finish={finishOf(top.id)} interactive={false} live={false} />
        </span>
      )}
      <b className={styles.count}>{cards.length}</b>
      <span className={styles.pileLabel} style={{ top: size.h + 7 }}>
        {label}
      </span>
    </div>
  );
}

// --- Who is who ------------------------------------------------------------------------------------------------------------------

export interface WhoProps {
  readonly name: string;
  readonly portrait: string | undefined;
  readonly tint: string;
}

/** Memories of one player: the face, the name and six dots that fill up. */
export function MemoryRow({ box, who, count, turn }: { readonly box: Box; readonly who: WhoProps; readonly count: number; readonly turn: boolean }) {
  return (
    <Placed box={box} className={styles.memories} label={text.battle.table.memoriesOf(who.name, count, MEMORIES_TO_WIN)}>
      <div className={styles.memoryHead} data-turn={turn} style={{ '--tint': who.tint } as CSSProperties}>
        <img src={who.portrait} alt="" draggable={false} />
        <strong>{who.name}</strong>
        <span>
          {count}/{MEMORIES_TO_WIN}
        </span>
      </div>
      <div className={styles.dots} aria-hidden="true">
        {Array.from({ length: MEMORIES_TO_WIN }, (_, index) => (
          // A new key when a dot fills up starts its little pop again.
          <i key={`${index}-${index < count ? 'full' : 'empty'}`} className={cx(styles.dot, index < count && styles.dotFull)} />
        ))}
      </div>
    </Placed>
  );
}

/** The panel beside a Character in front: who plays it, how many cards are left, the rival's hand as a fan of card backs. */
export function InfoPanel({
  box,
  who,
  subtitle,
  active,
  deck,
  hand,
  fan,
}: {
  readonly box: Box;
  readonly who: WhoProps;
  readonly subtitle: string;
  readonly active: boolean;
  readonly deck: number;
  readonly hand: number;
  readonly fan: boolean;
}) {
  return (
    <Placed box={box}>
      <div className={cx(styles.who, active && styles.whoActive)} style={{ '--tint': who.tint } as CSSProperties}>
        <img className={styles.avatar} src={who.portrait} alt="" draggable={false} />
        <div className={styles.whoText}>
          <strong>{who.name}</strong>
          <span>{subtitle}</span>
          <span>
            {text.battle.board.deck} {deck} · {text.battle.table.handCount(hand)}
          </span>
          {fan && (
            <span className={styles.fan} aria-hidden="true">
              {Array.from({ length: Math.min(hand, 8) }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          )}
        </div>
      </div>
    </Placed>
  );
}

// --- The matchup ---------------------------------------------------------------------------------------------------------------

function TypeChip({ affinity, children }: { readonly affinity: Affinity; readonly children: ReactNode }) {
  return (
    <span className={styles.chip}>
      <i style={{ background: AFFINITY_INFO[affinity].color }} />
      {children}
    </span>
  );
}

/** The rival's Active Character: what it is weak to and resists, and what that means for your Active Character. */
export function FoePanel({ box, foe, mine, compact }: { readonly box: Box; readonly foe: CharacterCard | null; readonly mine: CharacterCard | null; readonly compact: boolean }) {
  const words = text.battle.table.foe;
  const kind = foe === null || mine === null ? 'none' : foe.weakness === mine.affinity ? 'hits' : foe.resistance === mine.affinity ? 'resisted' : 'neutral';
  return (
    <Placed box={box} className={cx(styles.panel, compact && styles.compactPanel)} label={words.title}>
      <div className={styles.foe}>
        {!compact && <h2>{words.title}</h2>}
        {foe === null ? (
          <p className={styles.matchup}>{words.none}</p>
        ) : (
          <>
            <p className={styles.foeName}>
              {foe.name.en}
              <small>{foe.title}</small>
            </p>
            <div className={styles.chips}>
              {foe.weakness !== null && <TypeChip affinity={foe.weakness}>{words.weak(AFFINITY_INFO[foe.weakness].label)}</TypeChip>}
              {foe.resistance !== null && <TypeChip affinity={foe.resistance}>{words.resists(AFFINITY_INFO[foe.resistance].label)}</TypeChip>}
            </div>
            {mine !== null && (
              <p className={styles.matchup} data-kind={kind}>
                {kind === 'hits' ? words.hits : kind === 'resisted' ? words.resisted : words.neutral}
              </p>
            )}
          </>
        )}
      </div>
    </Placed>
  );
}

/** The card under the pointer, big enough to read. */
export function Inspector({ box, cardId, finish, touch }: { readonly box: Box; readonly cardId: string | null; readonly finish: FinishId; readonly touch: boolean }) {
  const card = cardId === null ? undefined : cardById(cardId);
  return (
    <Placed box={box} className={cx(styles.panel, styles.inspector)}>
      <div aria-live="polite" className={styles.inspectorCard}>
        {card === undefined ? <p>{touch ? text.battle.table.pressHold : text.battle.table.pointAt}</p> : <CardFace card={card} finish={finish} interactive={false} />}
      </div>
    </Placed>
  );
}
