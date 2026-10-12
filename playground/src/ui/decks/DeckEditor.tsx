import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'wouter';
import { STARTER_DECKS } from '../../battle/roster';
import { AFFINITY_INFO } from '../../cards/characters';
import type { Card } from '../../cards/model';
import { nextDeckId, saveDeck } from '../../domain/deckList';
import { DECK_NAME_LENGTH, DECK_SIZE, checkDeck, ownedCounts, type Deck } from '../../domain/decks';
import type { SaveGame } from '../../domain/save';
import { gameStore, useSave } from '../../state/app';
import { describeProblem } from '../battle/choices';
import { CardFace } from '../components/CardFace';
import { Button, Segmented, SearchField } from '../components/controls';
import { ArrowLeftIcon, SearchIcon } from '../components/icons';
import { EmptyState } from '../components/PageHeader';
import { cx } from '../format';
import { text } from '../text';
import styles from './Decks.module.css';
import { addCopy, blockerFor, deckRows, designRows, removeCopy } from './editing';

export type EditorSource = { readonly kind: 'new' } | { readonly kind: 'edit'; readonly id: string } | { readonly kind: 'template'; readonly id: string };

type Filter = 'all' | 'characters' | 'supporters';

function initialDeck(save: SaveGame, source: EditorSource): Deck | null {
  if (source.kind === 'new') {
    return { id: nextDeckId(save.decks), name: text.decks.editor.newName, cards: [] };
  }
  if (source.kind === 'edit') {
    return save.decks.find((deck) => deck.id === source.id) ?? null;
  }
  const starter = STARTER_DECKS.find((deck) => deck.id === source.id);
  return starter === undefined ? null : { id: nextDeckId(save.decks), name: text.decks.copyName(starter.name).slice(0, DECK_NAME_LENGTH), cards: [...starter.cards] };
}

const KIND_LABEL = { basic: 'Basic', close: 'Close', bride: 'Bride', event: 'Event' } as const;

function kindOf(card: Card): string {
  return card.kind === 'supporter' ? 'Supporter' : KIND_LABEL[card.stage];
}

function Editor({ initial, adds }: { readonly initial: Deck; readonly adds: boolean }) {
  const save = useSave();
  const [, navigate] = useLocation();
  const [name, setName] = useState(initial.name);
  const [cards, setCards] = useState<readonly string[]>(initial.cards);
  const [baseline, setBaseline] = useState(() => JSON.stringify([initial.name, adds ? [] : initial.cards]));
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [preview, setPreview] = useState<string | null>(null);

  const owned = useMemo(() => ownedCounts(save.collection), [save.collection]);
  const rows = useMemo(() => designRows(owned, cards), [owned, cards]);
  const inDeck = useMemo(() => deckRows(cards), [cards]);
  const problems = checkDeck(cards, owned);
  const dirty = JSON.stringify([name, cards]) !== baseline;
  const previewCard = preview === null ? undefined : (rows.find((row) => row.card.id === preview)?.card ?? inDeck.find((row) => row.card.id === preview)?.card);

  const shown = rows.filter(({ card }) => {
    if (filter === 'characters' && card.kind !== 'character') {
      return false;
    }
    if (filter === 'supporters' && card.kind !== 'supporter') {
      return false;
    }
    const needle = query.trim().toLowerCase();
    return needle === '' || `${card.name.en} ${card.title} ${card.rarity}`.toLowerCase().includes(needle);
  });

  const submit = (): void => {
    const deck: Deck = { id: initial.id, name: name.trim(), cards: [...cards] };
    try {
      gameStore.getState().change((current: SaveGame) => saveDeck(current, deck, Date.now()));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    setBaseline(JSON.stringify([name, cards]));
    setMessage(text.decks.editor.saved);
    if (adds) {
      navigate(`/decks/${deck.id}`, { replace: true });
    }
  };

  return (
    <>
      <div className={styles.top}>
        <Link href="/decks" className={styles.state} data-tutorial="deck-back">
          <ArrowLeftIcon size={14} /> {text.decks.editor.back}
        </Link>
      </div>
      <div className={styles.top}>
        <input
          className={styles.nameField}
          value={name}
          maxLength={DECK_NAME_LENGTH}
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
          placeholder={text.decks.namePlaceholder}
          aria-label={text.decks.editor.nameLabel}
          data-tutorial="deck-name"
        />
        <Button kind="primary" disabled={name.trim() === '' || (!dirty && !adds)} onClick={submit} data-tutorial="deck-save">
          {text.decks.editor.save}
        </Button>
        <span className={cx(styles.state, message === text.decks.editor.saved && !dirty && styles.saved)} role="status">
          {dirty ? text.decks.editor.unsaved : (message ?? '')}
        </span>
      </div>

      <div className={styles.editor} data-tutorial="deck-editor">
        <section>
          <h2 className={styles.hint}>{text.decks.editor.collection}</h2>
          <div className={styles.toolbar}>
            <SearchField value={query} onChange={setQuery} placeholder={text.decks.searchCards} label={text.decks.searchLabel} icon={<SearchIcon size={16} />} />
            <Segmented
              value={filter}
              onChange={setFilter}
              label={text.decks.editor.collection}
              options={[
                { value: 'all', label: text.decks.editor.filterAll },
                { value: 'characters', label: text.decks.editor.filterCharacters },
                { value: 'supporters', label: text.decks.editor.filterSupporters },
              ]}
            />
          </div>
          {rows.length === 0 ? (
            <p className={styles.empty}>{text.decks.nothingOwned}</p>
          ) : (
            <ul className={styles.collection}>
              {shown.map(({ card, owned: have, inDeck: used }) => {
                const blocker = blockerFor(card, cards, have);
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      className={styles.pick}
                      disabled={blocker !== null}
                      title={blocker === null ? text.decks.editor.add(card.name.en) : text.decks.editor.blockers[blocker]}
                      aria-label={text.decks.editor.add(`${card.name.en}, ${card.title}`)}
                      onClick={() => setCards(addCopy(cards, card.id))}
                      onMouseEnter={() => setPreview(card.id)}
                      onMouseLeave={() => setPreview(null)}
                      onFocus={() => setPreview(card.id)}
                      onBlur={() => setPreview(null)}
                    >
                      <span className={styles.pickFace}>
                        <CardFace card={card} finish="standard" interactive={false} live={false} />
                      </span>
                      <span className={cx(styles.count, used > 0 && styles.used)}>
                        {used}/{have}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className={styles.panel}>
          <div className={styles.preview}>
            {previewCard === undefined ? (
              <span className={styles.hint}>{text.decks.editor.point}</span>
            ) : (
              <span>
                <CardFace card={previewCard} finish="standard" interactive={false} live={false} />
              </span>
            )}
          </div>

          <div className={styles.status}>
            <strong className={problems.length === 0 ? styles.ok : undefined}>
              {text.decks.cards(cards.length)}
              {cards.length === DECK_SIZE && problems.length === 0 ? ` · ${text.decks.editor.okTitle}` : ''}
            </strong>
            {problems.length > 0 && (
              <>
                {text.decks.editor.fixTitle}
                <ul>
                  {problems.map((problem) => (
                    <li key={describeProblem(problem)}>{describeProblem(problem)}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <ul className={styles.list} aria-label={text.decks.editor.thisDeck}>
            {inDeck.length === 0 && <li className={styles.empty}>{text.decks.emptyDeck}</li>}
            {inDeck.map(({ card, copies }) => {
              const have = owned.get(card.id) ?? 0;
              const tint = card.kind === 'character' ? AFFINITY_INFO[card.affinity].color : AFFINITY_INFO.study.color;
              return (
                <li
                  key={card.id}
                  className={cx(styles.row, copies > have && styles.lacking)}
                  style={{ '--tint': tint } as CSSProperties}
                  title={copies > have ? text.decks.editor.missing : undefined}
                  onMouseEnter={() => setPreview(card.id)}
                  onMouseLeave={() => setPreview(null)}
                >
                  <i className={styles.dot} />
                  <span>
                    <span className={styles.rowName}>{card.name.en}</span>
                    <small>
                      {card.title} · {kindOf(card)}
                      {card.kind === 'character' && card.prime && <span className={styles.prime}> · Prime</span>}
                    </small>
                  </span>
                  <span className={styles.stepper}>
                    <button type="button" onClick={() => setCards(removeCopy(cards, card.id))} aria-label={text.decks.editor.take(card.name.en)}>
                      −
                    </button>
                    <output>{copies}</output>
                    <button type="button" disabled={blockerFor(card, cards, have) !== null} onClick={() => setCards(addCopy(cards, card.id))} aria-label={text.decks.editor.add(card.name.en)}>
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
}

/** The deck builder: pick cards from the binder on the left, see the deck and what is wrong with it on the right. */
export default function DeckEditor({ source }: { readonly source: EditorSource }) {
  const save = useSave();
  // The deck is read once when the page opens; later changes are the player's own edits.
  const [initial] = useState(() => initialDeck(save, source));
  if (initial === null) {
    return (
      <EmptyState title={text.decks.editor.notFound}>
        <p>
          <Link href="/decks">{text.decks.editor.back}</Link>
        </p>
      </EmptyState>
    );
  }
  return <Editor initial={initial} adds={source.kind !== 'edit'} />;
}
