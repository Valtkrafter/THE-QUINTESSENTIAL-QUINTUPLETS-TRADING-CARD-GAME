import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'wouter';
import { profileOf } from '../../battle/deckProfile';
import { FIRST_WIN_BONUS_YEN, LOSS_YEN, WIN_YEN } from '../../battle/rewards';
import { OPPONENTS, type Opponent } from '../../battle/roster';
import { AFFINITY_INFO } from '../../cards/characters';
import type { Affinity } from '../../cards/model';
import { battleSession, useSave } from '../../state/app';
import { Button } from '../components/controls';
import { PageHeader } from '../components/PageHeader';
import { cx } from '../format';
import { text } from '../text';
import { deckChoices, describeProblem, type DeckChoice } from './choices';
import { Explainer } from './Explainer';
import { HowToPlay } from './HowToPlay';
import { portraitOf } from './portraits';
import styles from './Lobby.module.css';

function TypeLine({ affinity, weakTo }: { readonly affinity: Affinity | null; readonly weakTo: Affinity | null }) {
  if (affinity === null) {
    return null;
  }
  const info = AFFINITY_INFO[affinity];
  return (
    <span className={styles.type}>
      <i className={styles.dot} style={{ '--dot': info.color } as CSSProperties} />
      {text.battle.plays(info.label)}
      {weakTo !== null && ` · ${text.battle.weakTo(AFFINITY_INFO[weakTo].label)}`}
    </span>
  );
}

function RivalTile({ rival, selected, onPick, anchor }: { readonly rival: Opponent; readonly selected: boolean; readonly onPick: () => void; readonly anchor: boolean }) {
  const save = useSave();
  const profile = profileOf(rival.deck.cards);
  const record = save.battle.rivals[rival.id] ?? { wins: 0, losses: 0 };
  const tint = profile.affinity === null ? undefined : AFFINITY_INFO[profile.affinity].color;
  return (
    <button
      type="button"
      className={styles.rival}
      aria-pressed={selected}
      onClick={onPick}
      style={tint === undefined ? undefined : ({ '--tint': tint } as CSSProperties)}
      data-tutorial={anchor ? 'battle-rival' : undefined}
    >
      <img className={styles.portrait} src={portraitOf(rival.character)} alt="" draggable={false} />
      <span className={styles.rivalBody}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{rival.name}</span>
          <span className={cx(styles.level, styles[rival.level])}>{text.battle.levels[rival.level]}</span>
        </span>
        <span className={styles.blurb}>{rival.blurb}</span>
        <span className={styles.facts}>
          <TypeLine affinity={profile.affinity} weakTo={profile.weakTo} />
          <span>
            <strong>{text.battle.winPays(WIN_YEN[rival.level])}</strong> · {text.battle.lossPays(LOSS_YEN)}
          </span>
          <span>{text.battle.record(record.wins, record.losses)}</span>
        </span>
      </span>
    </button>
  );
}

function DeckTile({ choice, selected, onPick, anchor }: { readonly choice: DeckChoice; readonly selected: boolean; readonly onPick: () => void; readonly anchor: boolean }) {
  const profile = profileOf(choice.cards);
  const lead = profile.lead === null ? undefined : portraitOf(profile.lead);
  const tint = profile.affinity === null ? undefined : AFFINITY_INFO[profile.affinity].color;
  const problem = choice.problems[0];
  return (
    <button
      type="button"
      className={styles.deck}
      aria-pressed={selected}
      disabled={problem !== undefined}
      onClick={onPick}
      style={tint === undefined ? undefined : ({ '--tint': tint } as CSSProperties)}
      data-tutorial={anchor ? 'battle-deck' : undefined}
    >
      <img className={styles.deckArt} src={lead} alt="" draggable={false} />
      <span className={styles.deckBody}>
        <span className={styles.deckName}>{choice.name}</span>
        <span className={styles.deckMeta}>
          <TypeLine affinity={profile.affinity} weakTo={null} />
          {choice.loaner && <span>· {text.battle.loaner}</span>}
        </span>
        {problem === undefined ? (
          <span className={cx(styles.deckMeta, styles.ready)}>{text.battle.ready}</span>
        ) : (
          <span className={styles.problem}>{describeProblem(problem)}</span>
        )}
      </span>
    </button>
  );
}

/** Pick a rival and a deck, then start. */
export function Lobby() {
  const save = useSave();
  const choices = useMemo(() => deckChoices(save), [save]);
  const [rivalId, setRivalId] = useState<string>(OPPONENTS[0]?.id ?? '');
  const [deckKey, setDeckKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'help' | 'watch' | null>(null);

  const rival = OPPONENTS.find((candidate) => candidate.id === rivalId);
  const ready = choices.filter((choice) => choice.problems.length === 0);
  const chosen = choices.find((choice) => choice.key === deckKey && choice.problems.length === 0) ?? ready[0];
  const own = choices.filter((choice) => !choice.loaner);
  const loaners = choices.filter((choice) => choice.loaner);
  // Somebody who has never played a battle is shown the animated explanation first.
  const firstTime = save.battle.wins + save.battle.losses + save.battle.draws === 0;

  const start = () => {
    if (rival !== undefined && chosen !== undefined) {
      battleSession.getState().start(rival, { name: chosen.name, cards: chosen.cards, loaner: chosen.loaner });
    }
  };

  return (
    <>
      <PageHeader
        title={text.battle.title}
        subtitle={text.battle.subtitle}
        actions={
          <>
            {!firstTime && (
              <Button onClick={() => setDialog('watch')} data-tutorial="battle-watch">
                {text.battle.howToPlay.watch}
              </Button>
            )}
            <Button onClick={() => setDialog('help')}>{text.battle.howTo}</Button>
          </>
        }
      />
      <div className={styles.layout}>
        {firstTime && (
          <aside className={styles.newHere}>
            <div>
              <h2>{text.battle.explainer.newHere}</h2>
              <p>{text.battle.explainer.newHereText}</p>
            </div>
            <Button kind="primary" onClick={() => setDialog('watch')} data-tutorial="battle-watch">
              {text.battle.howToPlay.watch}
            </Button>
          </aside>
        )}
        <section className={styles.section}>
          <h2>{text.battle.chooseRival}</h2>
          <div className={styles.rivals}>
            {OPPONENTS.map((candidate, index) => (
              <RivalTile key={candidate.id} rival={candidate} selected={candidate.id === rivalId} onPick={() => setRivalId(candidate.id)} anchor={index === 0} />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>{text.battle.chooseDeck}</h2>
          <div className={styles.deckGroups}>
            <div>
              <h3 className={styles.groupTitle}>{text.decks.mine}</h3>
              {own.length === 0 ? (
                <p className={styles.empty}>
                  {text.battle.noOwnDecks} <Link href="/decks">{text.battle.goToDecks}</Link>
                </p>
              ) : (
                <div className={styles.decks}>
                  {own.map((choice) => (
                    <DeckTile key={choice.key} choice={choice} selected={choice.key === chosen?.key} onPick={() => setDeckKey(choice.key)} anchor={choice.key === chosen?.key} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className={styles.groupTitle}>{text.decks.loaners}</h3>
              <div className={styles.decks}>
                {loaners.map((choice) => (
                  <DeckTile key={choice.key} choice={choice} selected={choice.key === chosen?.key} onPick={() => setDeckKey(choice.key)} anchor={choice.key === chosen?.key} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className={styles.startBar}>
          <div className={styles.versus}>
            {rival !== undefined && chosen !== undefined ? (
              <>
                {chosen.name}
                <span>vs</span>
                {rival.name}
                <span>
                  {text.battle.levels[rival.level]} · {text.battle.firstWin(FIRST_WIN_BONUS_YEN)}
                </span>
              </>
            ) : (
              <span>{text.battle.pick}</span>
            )}
          </div>
          <Button kind="primary" disabled={rival === undefined || chosen === undefined} onClick={start} data-tutorial="battle-start">
            {text.battle.start}
          </Button>
        </div>
      </div>
      {dialog === 'help' && <HowToPlay onClose={() => setDialog(null)} onWatch={() => setDialog('watch')} />}
      {dialog === 'watch' && <Explainer onClose={() => setDialog(null)} />}
    </>
  );
}
