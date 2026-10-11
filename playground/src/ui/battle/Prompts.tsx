import { cardById } from '../../cards/catalog';
import type { FinishId } from '../../cards/finish';
import { Button } from '../components/controls';
import { CardFace } from '../components/CardFace';
import { text } from '../text';
import styles from './Board.module.css';
import type { PromptView } from './viewModel';

export interface PromptProps {
  readonly view: PromptView;
  readonly finishOf: (cardId: string) => FinishId;
  /** Answer with the number of an option; -1 skips an optional question. */
  readonly onAnswer: (option: number) => void;
}

/** A line above the table that says what the player has to choose; the choice itself is made by clicking on the table. */
export function FigurePrompt({ view, onAnswer }: Pick<PromptProps, 'view' | 'onAnswer'>) {
  return (
    <div className={styles.prompt} role="status">
      <strong>{view.title}</strong>
      <span>{text.battle.board.pickTarget}</span>
      {view.optional && (
        <Button kind="quiet" onClick={() => onAnswer(-1)}>
          {text.battle.board.skip}
        </Button>
      )}
    </div>
  );
}

/** Choosing a card from a short list (a search or the top of the deck): the cards are shown side by side. */
export function CardPrompt({ view, finishOf, onAnswer }: PromptProps) {
  if (view.prompt.kind !== 'card') {
    return null;
  }
  return (
    <div className={styles.sheetBackdrop}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={view.title}>
        <h2>{view.title}</h2>
        <ul className={styles.choices}>
          {view.prompt.options.map((option, index) => {
            const card = cardById(option.cardId);
            return (
              <li key={`${option.index}:${option.cardId}`}>
                <button type="button" className={styles.choice} onClick={() => onAnswer(index)} aria-label={card === undefined ? option.cardId : `${card.name.en}, ${card.title}`}>
                  {card !== undefined && <CardFace card={card} finish={finishOf(card.id)} interactive={false} live={false} />}
                </button>
              </li>
            );
          })}
        </ul>
        {view.optional && (
          <div className={styles.sheetActions}>
            <Button kind="quiet" onClick={() => onAnswer(-1)}>
              {text.battle.board.skip}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

/** The one yes-or-no question: keep the top card of the deck or send it to the bottom. */
export function YesNoPrompt({ view, finishOf, onAnswer }: PromptProps) {
  if (view.prompt.kind !== 'yes-no') {
    return null;
  }
  const card = cardById(view.prompt.cardId);
  return (
    <div className={styles.sheetBackdrop}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={view.title}>
        <h2>{view.title}</h2>
        <ul className={styles.choices}>
          <li>
            <span className={styles.choice}>{card !== undefined && <CardFace card={card} finish={finishOf(card.id)} interactive={false} live={false} />}</span>
          </li>
        </ul>
        <div className={styles.sheetActions}>
          <Button kind="primary" onClick={() => onAnswer(0)}>
            {text.battle.board.yes}
          </Button>
          <Button onClick={() => onAnswer(1)}>{text.battle.board.no}</Button>
        </div>
      </section>
    </div>
  );
}
