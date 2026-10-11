import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { profileOf } from '../../battle/deckProfile';
import { AFFINITY_INFO } from '../../cards/characters';
import { deleteDeck, nextDeckId, saveDeck } from '../../domain/deckList';
import { DECK_NAME_LENGTH, DECK_SIZE, MAX_DECKS } from '../../domain/decks';
import { gameStore, useSave } from '../../state/app';
import { portraitOf } from '../battle/portraits';
import { deckChoices, describeProblem, type DeckChoice } from '../battle/choices';
import { Button, LinkButton } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { PageHeader } from '../components/PageHeader';
import { cx } from '../format';
import { text } from '../text';
import styles from './Decks.module.css';

function DeckTile({ choice, children }: { readonly choice: DeckChoice; readonly children: ReactNode }) {
  const profile = profileOf(choice.cards);
  const tint = profile.affinity === null ? 'var(--accent)' : AFFINITY_INFO[profile.affinity].color;
  const problem = choice.problems[0];
  return (
    <li className={styles.deck} style={{ '--tint': tint } as CSSProperties}>
      <img className={styles.art} src={profile.lead === null ? undefined : portraitOf(profile.lead)} alt="" draggable={false} />
      <div className={styles.body}>
        <span className={styles.name}>{choice.name}</span>
        <span className={styles.meta}>
          <i className={styles.dot} />
          {profile.affinity === null ? '' : AFFINITY_INFO[profile.affinity].label}
          <span>· {text.decks.cards(choice.cards.length)}</span>
        </span>
        {choice.loaner || problem === undefined ? (
          <span className={cx(styles.meta, styles.ok)}>{text.decks.ready}</span>
        ) : (
          <span className={cx(styles.meta, styles.warn)}>{describeProblem(problem)}</span>
        )}
        <div className={styles.actions}>{children}</div>
      </div>
    </li>
  );
}

/** The player's decks and the loaner decks, with what can be done with each. */
export default function DecksScreen() {
  const save = useSave();
  const choices = useMemo(() => deckChoices(save), [save]);
  const own = choices.filter((choice) => !choice.loaner);
  const loaners = choices.filter((choice) => choice.loaner);
  const [removing, setRemoving] = useState<string | null>(null);
  const full = save.decks.length >= MAX_DECKS;

  const copy = (choice: DeckChoice): void => {
    gameStore.getState().change((current) =>
      saveDeck(current, { id: nextDeckId(current.decks), name: text.decks.copyName(choice.name).slice(0, DECK_NAME_LENGTH), cards: [...choice.cards].slice(0, DECK_SIZE) }, Date.now()),
    );
  };

  const removingDeck = save.decks.find((deck) => `own:${deck.id}` === removing);

  return (
    <>
      <PageHeader
        title={text.decks.title}
        subtitle={text.decks.subtitle}
        actions={full ? <span className={styles.hint}>{text.decks.full}</span> : <LinkButton href="/decks/new" kind="primary">{text.decks.newDeck}</LinkButton>}
      />

      <section className={styles.section}>
        <h2>{text.decks.mine}</h2>
        {own.length === 0 ? (
          <p className={styles.empty}>{text.decks.noneYet}</p>
        ) : (
          <ul className={styles.grid}>
            {own.map((choice) => (
              <DeckTile key={choice.key} choice={choice}>
                <LinkButton href={`/decks/${choice.key.slice('own:'.length)}`}>{text.decks.edit}</LinkButton>
                <Button disabled={full} onClick={() => copy(choice)}>
                  {text.decks.copy}
                </Button>
                <Button kind="quiet" onClick={() => setRemoving(choice.key)}>
                  {text.decks.remove}
                </Button>
              </DeckTile>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>{text.decks.loaners}</h2>
        <p className={styles.hint}>{text.decks.loanersHint}</p>
        <ul className={styles.grid}>
          {loaners.map((choice) => (
            <DeckTile key={choice.key} choice={choice}>
              <LinkButton href={`/decks/template/${choice.key.slice('starter:'.length)}`}>{text.decks.template}</LinkButton>
            </DeckTile>
          ))}
        </ul>
      </section>

      {removingDeck !== undefined && (
        <Dialog title={text.decks.remove} onClose={() => setRemoving(null)}>
          <p>{text.decks.removeConfirm(removingDeck.name)}</p>
          <div className={styles.actions}>
            <Button onClick={() => setRemoving(null)}>{text.decks.cancel}</Button>
            <Button
              kind="danger"
              onClick={() => {
                gameStore.getState().change((current) => deleteDeck(current, removingDeck.id, Date.now()));
                setRemoving(null);
              }}
            >
              {text.decks.removeYes}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
