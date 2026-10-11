// Sending one card to Grading: first a question (what the card is worth at every score, what the fee is), then the reveal.
// Both the Grading screen and the inspect screen open it with the uid of a loose copy; it closes itself through `onClose`.

import { useState } from 'react';
import { cardById } from '../../cards/catalog';
import { GradingError, gradingFee, submitForGrading, type Graded } from '../../domain/grading';
import { findFinish } from '../../holo/finishes';
import { gameStore, useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { Button, LinkButton, Pill } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { text } from '../text';
import { Ceremony } from './Ceremony';
import { PriceLadder } from './PriceLadder';
import styles from './GradeFlow.module.css';

export interface GradeFlowProps {
  /** The loose copy to send in. */
  readonly uid: string;
  readonly onClose: () => void;
  /** Adds a link to the 3D view of the card, for a screen that does not show it already. */
  readonly lookHref?: string;
}

export function GradeFlow({ uid, onClose, lookHref }: GradeFlowProps) {
  const save = useSave();
  const [graded, setGraded] = useState<Graded | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (graded !== null) {
    return <Ceremony graded={graded} onClose={onClose} />;
  }

  const copy = save.collection.find((owned) => owned.uid === uid);
  const card = copy === undefined ? undefined : cardById(copy.cardId);
  if (copy === undefined || card === undefined || copy.grade !== null) {
    return null;
  }

  const fee = gradingFee(card.rarity);
  const missing = fee - save.player.yen;

  const send = (): void => {
    try {
      // The save is written first; the reveal only shows what already happened, so closing the page during it loses nothing.
      const result = gameStore.getState().transact((current) => {
        const sent = submitForGrading(current, uid, Date.now());
        return { save: sent.save, value: sent };
      });
      if (result !== undefined) {
        setGraded(result);
      }
    } catch (failure) {
      setError(failure instanceof GradingError ? text.grading.send.errors[failure.code] : null);
    }
  };

  return (
    <Dialog title={text.grading.send.confirmTitle} onClose={onClose}>
      <div className={styles.confirm}>
        <div className={styles.summary}>
          <span className={styles.face}>
            <CardFace card={card} finish={copy.finish} interactive={false} live={false} />
          </span>
          <div className={styles.about}>
            <strong>{card.name.en}</strong>
            <span className={styles.title}>{card.title}</span>
            <Pill>
              {findFinish(copy.finish).label} · {card.rarity}
            </Pill>
            <p>{text.grading.send.confirm(card.name.en, fee)}</p>
          </div>
        </div>
        <PriceLadder rarity={card.rarity} finish={copy.finish} />
        {error !== null && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          {lookHref !== undefined && (
            <span className={styles.look}>
              <LinkButton href={lookHref} kind="quiet">
                {text.grading.send.look}
              </LinkButton>
            </span>
          )}
          <Button onClick={onClose}>{text.grading.send.cancel}</Button>
          <Button kind="primary" disabled={missing > 0} onClick={send}>
            {missing > 0 ? text.grading.send.short(missing) : text.grading.send.confirmYes}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
