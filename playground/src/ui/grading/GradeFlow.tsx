// Sending one card to Grading: first a question, then the reveal. The question is either the whole desk (what the graders may say
// about this card, for a screen that does not show it already) or, where the desk is on the screen, just the last check before the
// fee is paid. Both the Grading screen and the inspect screen open it with the uid of a loose copy; it closes itself through `onClose`.

import { useState } from 'react';
import { cardById } from '../../cards/catalog';
import { GradingError, eyeCheck, gradeOutlook, gradingFee, submitForGrading, type Graded } from '../../domain/grading';
import { findFinish } from '../../holo/finishes';
import { gameStore, useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { Button, LinkButton, Pill } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { text } from '../text';
import { Ceremony } from './Ceremony';
import { eyeStyle } from './eye';
import { GradeDesk } from './GradeDesk';
import styles from './GradeFlow.module.css';

export interface GradeFlowProps {
  /** The loose copy to send in. */
  readonly uid: string;
  readonly onClose: () => void;
  /** Adds a link to the 3D view of the card, for a screen that does not show it already. */
  readonly lookHref?: string;
  /** The desk is on the screen already: ask only the last question. */
  readonly confirmOnly?: boolean;
}

export function GradeFlow({ uid, onClose, lookHref, confirmOnly = false }: GradeFlowProps) {
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

  const buttons = (
    <>
      {lookHref !== undefined && !confirmOnly && (
        <span className={styles.look}>
          <LinkButton href={lookHref} kind="quiet">
            {text.grading.send.look}
          </LinkButton>
        </span>
      )}
      <Button onClick={onClose}>{text.grading.send.cancel}</Button>
      <Button kind="primary" disabled={missing > 0} onClick={send} data-tutorial="grade-confirm-yes">
        {missing > 0 ? text.grading.send.short(missing) : text.grading.send.confirmYes}
      </Button>
    </>
  );
  const failure = error !== null && (
    <p className={styles.error} role="alert">
      {error}
    </p>
  );

  if (!confirmOnly) {
    return (
      <Dialog title={text.grading.send.confirmTitle} onClose={onClose}>
        <div className={styles.full} data-tutorial="grade-confirm">
          <GradeDesk copy={copy} compact>
            {buttons}
          </GradeDesk>
          {failure}
        </div>
      </Dialog>
    );
  }

  const outlook = gradeOutlook(copy.condition, card.rarity, copy.finish);
  const eye = eyeCheck(copy.condition);
  return (
    <Dialog title={text.grading.send.confirmTitle} onClose={onClose}>
      <div className={styles.confirm} data-tutorial="grade-confirm">
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
            <p className={styles.eye} style={eyeStyle(eye)}>
              <i aria-hidden="true" />
              {text.grading.eye[eye].label}
            </p>
          </div>
        </div>
        <p>{text.grading.send.confirm(card.name.en, fee)}</p>
        <p className={styles.verdict} data-verdict={outlook.verdict}>
          <strong>{text.grading.desk.verdict[outlook.verdict]}.</strong> {text.grading.desk.verdictLine[outlook.verdict](Math.round(Math.abs(outlook.edge)))}
        </p>
        {failure}
        <div className={styles.actions}>{buttons}</div>
      </div>
    </Dialog>
  );
}
