import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { profileOf } from '../../battle/deckProfile';
import { legalActions } from '../../battle/legal';
import { BENCH_SIZE, figureAt, retreatCost, topCard } from '../../battle/rules';
import type { BattleAction, BattleState, Figure, FigureRef, PlayerIndex } from '../../battle/types';
import { AFFINITY_INFO } from '../../cards/characters';
import { cardById } from '../../cards/catalog';
import { FINISH_IDS, type FinishId } from '../../cards/finish';
import type { OwnedCard } from '../../domain/ownership';
import { battleSession, useBattle, useSave } from '../../state/app';
import type { FlashState } from '../../state/battleSession';
import { Button } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { cx } from '../format';
import { text } from '../text';
import styles from './Board.module.css';
import { floatersFor, placeKey, type Floater } from './floaters';
import { CardBack, HandView } from './HandView';
import { EmptySlot, FigureView, type Highlight } from './FigureView';
import { HowToPlay } from './HowToPlay';
import { portraitOf } from './portraits';
import { PlayerBar } from './PlayerBar';
import { CardPrompt, FigurePrompt, YesNoPrompt } from './Prompts';
import { ResultDialog } from './ResultDialog';
import { SidePanel } from './SidePanel';
import { figureOptions, handOptions, heartsLeft, isPlayable, moodOf, moveViews, promptFor } from './viewModel';

type Selection = { readonly kind: 'hand'; readonly index: number } | { readonly kind: 'figure'; readonly ref: FigureRef } | null;

interface Placed {
  readonly id: number;
  readonly floater: Floater;
}

function sameRef(a: FigureRef, b: FigureRef): boolean {
  return a.zone === 'active' ? b.zone === 'active' : b.zone === 'bench' && a.index === b.index;
}

/** The fanciest finish the player owns of each card design, so their battle cards shine like the ones in the binder. */
function bestFinishes(collection: readonly OwnedCard[]): ReadonlyMap<string, FinishId> {
  const best = new Map<string, FinishId>();
  for (const copy of collection) {
    const have = best.get(copy.cardId);
    if (have === undefined || FINISH_IDS.indexOf(copy.finish) > FINISH_IDS.indexOf(have)) {
      best.set(copy.cardId, copy.finish);
    }
  }
  return best;
}

/** Keeps the floating texts of the last step on the board for a moment, and tells who lunges. */
function useFloaters(flash: FlashState): { readonly places: ReadonlyMap<string, readonly Placed[]>; readonly lunge: PlayerIndex | null } {
  const [items, setItems] = useState<readonly (Placed & { readonly key: string })[]>([]);
  const [lunge, setLunge] = useState<PlayerIndex | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (flash.tick === 0) {
      return undefined;
    }
    const added = floatersFor(flash.events).map((floater) => {
      counter.current += 1;
      return { id: counter.current, key: placeKey(floater.player, floater.ref), floater };
    });
    const timers: number[] = [];
    if (added.length > 0) {
      setItems((current) => [...current, ...added]);
      timers.push(window.setTimeout(() => setItems((current) => current.filter((item) => !added.some((done) => done.id === item.id))), 1900));
    }
    const attack = flash.events.find((event) => event.type === 'attack');
    if (attack?.type === 'attack') {
      setLunge(attack.player);
      timers.push(window.setTimeout(() => setLunge(null), 460));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [flash]);

  const places = useMemo(() => {
    const map = new Map<string, Placed[]>();
    for (const item of items) {
      map.set(item.key, [...(map.get(item.key) ?? []), { id: item.id, floater: item.floater }]);
    }
    return map;
  }, [items]);
  return { places, lunge };
}

interface BoardViewProps {
  readonly battle: BattleState;
  readonly rivalName: string;
  readonly rivalCharacter: Parameters<typeof portraitOf>[0];
  readonly rivalLevel: string;
  readonly deckName: string;
  readonly deckCards: readonly string[];
  readonly rivalCards: readonly string[];
  readonly loaner: boolean;
  readonly flash: FlashState;
  readonly waiting: boolean;
  readonly status: 'playing' | 'over';
  readonly log: Parameters<typeof SidePanel>[0]['log'];
}

function BoardView({ battle, rivalName, rivalCharacter, rivalLevel, deckName, deckCards, rivalCards, loaner, flash, waiting, status, log }: BoardViewProps) {
  const save = useSave();
  const legal = useMemo(() => legalActions(battle, 0), [battle]);
  const prompt = promptFor(battle, 0);
  const mood = moodOf(battle);
  const [picked, setPicked] = useState<{ readonly at: BattleState; readonly selection: Selection }>({ at: battle, selection: null });
  const selection = picked.at === battle ? picked.selection : null;
  const [inspected, setInspected] = useState<{ readonly cardId: string; readonly side: PlayerIndex } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [giveUpOpen, setGiveUpOpen] = useState(false);
  const { places, lunge } = useFloaters(flash);

  const mine = battle.players[0];
  const theirs = battle.players[1];
  const owned = useMemo(() => bestFinishes(save.collection), [save.collection]);
  const finishOfMine = (cardId: string): FinishId => (loaner ? 'standard' : (owned.get(cardId) ?? 'standard'));
  const finishOfTheirs = (): FinishId => 'standard';

  const rivalShort = rivalName.split(' ')[0] ?? rivalName;
  const myProfile = profileOf(deckCards);
  const myTint = myProfile.affinity === null ? 'var(--accent)' : AFFINITY_INFO[myProfile.affinity].color;
  const myPortrait = myProfile.lead === null ? undefined : portraitOf(myProfile.lead);
  const rivalProfile = profileOf(rivalCards);
  const rivalTint = rivalProfile.affinity === null ? 'var(--accent)' : AFFINITY_INFO[rivalProfile.affinity].color;

  const canAct = status === 'playing' && !waiting;
  const act = (action: BattleAction): void => battleSession.getState().act(action);

  // --- Clicks ---------------------------------------------------------------------------------------------------

  const select = (next: Selection): void => setPicked({ at: battle, selection: next });

  const clickHand = (index: number): void => {
    if (!canAct || prompt !== null) {
      return;
    }
    const options = handOptions(legal, index);
    if (options.place !== null && options.evolve.length === 0 && options.supporter === null) {
      act(options.place);
      return;
    }
    select(selection?.kind === 'hand' && selection.index === index ? null : { kind: 'hand', index });
  };

  const clickFigure = (side: PlayerIndex, ref: FigureRef): void => {
    if (prompt !== null && prompt.prompt.kind === 'figure') {
      if (prompt.prompt.owner === side) {
        const option = prompt.prompt.options.findIndex((candidate) => sameRef(candidate, ref));
        if (option >= 0) {
          act({ type: 'choose', option });
        }
      }
      return;
    }
    if (side !== 0 || !canAct) {
      return;
    }
    if (selection?.kind === 'hand') {
      const evolve = handOptions(legal, selection.index).evolve.find((action) => sameRef(action.target, ref));
      if (evolve !== undefined) {
        act(evolve);
        return;
      }
    }
    select(selection?.kind === 'figure' && sameRef(selection.ref, ref) ? null : { kind: 'figure', ref });
  };

  const highlightOf = (side: PlayerIndex, ref: FigureRef): Highlight => {
    if (prompt !== null && prompt.prompt.kind === 'figure' && prompt.prompt.owner === side && prompt.prompt.options.some((option) => sameRef(option, ref))) {
      return 'target';
    }
    if (side === 0 && selection?.kind === 'hand' && handOptions(legal, selection.index).evolve.some((action) => sameRef(action.target, ref))) {
      return 'target';
    }
    if (side === 0 && selection?.kind === 'figure' && sameRef(selection.ref, ref)) {
      return 'selected';
    }
    return 'none';
  };

  // --- Pieces of the table ------------------------------------------------------------------------------------------

  const point = (side: PlayerIndex) => (cardId: string | null) => setInspected(cardId === null ? null : { cardId, side });

  const figureCell = (side: PlayerIndex, ref: FigureRef, size: 'active' | 'bench'): ReactNode => {
    const owner = battle.players[side];
    const figure: Figure | undefined = figureAt(owner, ref);
    const label = size === 'active' ? text.battle.board.active : text.battle.board.bench;
    const clickable = highlightOf(side, ref) === 'target';
    if (figure === undefined) {
      return <EmptySlot key={`${side}-${placeKey(side, ref)}`} size={size} label={label} highlight={false} />;
    }
    const floaters = places.get(placeKey(side, ref)) ?? [];
    return (
      <FigureView
        key={`${side}-${placeKey(side, ref)}-${figure.uid}`}
        figure={figure}
        size={size}
        finish={side === 0 ? finishOfMine(topCard(figure).id) : finishOfTheirs()}
        highlight={highlightOf(side, ref)}
        stunned={ref.zone === 'active' && figure.stunTurn !== 0 && figure.stunTurn === battle.turn}
        shielded={ref.zone === 'active' && owner.shieldTurn !== 0 && owner.shieldTurn === battle.turn}
        floaters={floaters}
        lunge={lunge === side && ref.zone === 'active'}
        towards={side === 0 ? 'up' : 'down'}
        disabled={!clickable && (side === 1 || !canAct)}
        onClick={() => clickFigure(side, ref)}
        onPoint={point(side)}
      />
    );
  };

  const benchRow = (side: PlayerIndex): ReactNode => (
    <div className={styles.benchRow} aria-label={text.battle.board.bench}>
      {Array.from({ length: BENCH_SIZE }, (_, index) => (
        <div key={index} className={styles.benchCell}>
          {figureCell(side, { zone: 'bench', index }, 'bench')}
        </div>
      ))}
    </div>
  );

  const handOpts = useMemo(() => mine.hand.map((_, index) => handOptions(legal, index)), [mine.hand, legal]);
  const playable = handOpts.map(isPlayable);

  // --- The middle strip: what is going on and what can be done -----------------------------------------------------------

  const handSelected = selection?.kind === 'hand' ? handOptions(legal, selection.index) : null;
  const figureSelected = selection?.kind === 'figure' ? figureOptions(legal, selection.ref) : null;
  const selectedFigure = selection?.kind === 'figure' ? figureAt(mine, selection.ref) : undefined;
  const abilityName = selectedFigure === undefined ? '' : (topCard(selectedFigure).ability?.name ?? '');
  const handCardName = selection?.kind === 'hand' ? (cardById(mine.hand[selection.index] ?? '')?.name.en ?? '') : '';
  const supporterCard = handSelected?.supporter ?? null;
  const give = figureSelected?.giveHeart ?? null;
  const ability = figureSelected?.ability ?? null;
  const swap = figureSelected?.retreat ?? null;
  const setupDone = legal.find((action) => action.type === 'setup-done');
  const endTurn = legal.find((action) => action.type === 'end-turn');

  const strip = (): ReactNode => {
    if (status === 'over') {
      return null;
    }
    if (prompt !== null && prompt.prompt.kind === 'figure') {
      return <FigurePrompt view={prompt} onAnswer={(option) => act({ type: 'choose', option })} />;
    }
    if (mood === 'setup') {
      return (
        <div className={styles.prompt}>
          <strong>{text.battle.board.setupTitle}</strong>
          <span>{theirs.setupDone ? text.battle.board.waitingSetup(rivalShort) : text.battle.board.setupHelp}</span>
          {setupDone !== undefined && (
            <Button kind="primary" onClick={() => act(setupDone)}>
              {text.battle.board.ready}
            </Button>
          )}
        </div>
      );
    }
    if (mood === 'their-turn' || waiting) {
      return (
        <div className={cx(styles.prompt, styles.wait)} role="status">
          <strong>{text.battle.board.theirTurn(rivalShort)}</strong>
        </div>
      );
    }
    return (
      <div className={styles.prompt}>
        <strong>{text.battle.board.yourTurn}</strong>
        {supporterCard !== null && (
          <Button kind="primary" onClick={() => act(supporterCard)}>
            {text.battle.board.playSupporter}: {handCardName}
          </Button>
        )}
        {handSelected !== null && handSelected.evolve.length > 0 && <span>{`${text.battle.board.evolve}: ${text.battle.board.pickTarget}`}</span>}
        {give !== null && <Button onClick={() => act(give)}>{text.battle.board.giveHeart}</Button>}
        {ability !== null && <Button onClick={() => act(ability)}>{text.battle.board.useAbility(abilityName)}</Button>}
        {swap !== null && mine.active !== null && <Button onClick={() => act(swap)}>{text.battle.board.retreat(retreatCost(mine.active))}</Button>}
        {endTurn !== undefined && (
          <Button kind={selection === null ? 'primary' : 'default'} onClick={() => act(endTurn)}>
            {text.battle.board.endTurn}
          </Button>
        )}
      </div>
    );
  };

  // --- Moves of my Active Character --------------------------------------------------------------------------------------

  const moves = moveViews(battle, 0, legal);
  const activeNote =
    mine.active !== null && mine.active.stunTurn !== 0 && mine.active.stunTurn === battle.turn && mood === 'your-turn'
      ? text.battle.board.stunned
      : battle.first === 0 && mine.turnsTaken <= 1 && mood === 'your-turn'
        ? text.battle.board.cannotAttackFirst
        : null;

  const movesPanel = (
    <div className={styles.moves} aria-label={text.battle.board.moves}>
      {moves.map((move) => (
        <button
          key={move.index}
          type="button"
          className={styles.move}
          disabled={!move.usable || !canAct || prompt !== null}
          onClick={() => act({ type: 'attack', moveIndex: move.index })}
          onMouseEnter={() => mine.active !== null && point(0)(topCard(mine.active).id)}
        >
          <span className={styles.moveCost} aria-hidden="true">
            {move.cost.map((kind, index) => (
              <i key={index} style={{ background: AFFINITY_INFO[kind].color }} />
            ))}
          </span>
          <span className={styles.moveName}>{move.name}</span>
          <span className={styles.moveDamage}>
            {move.printed}
            {move.estimate !== null && String(move.estimate) !== move.printed && <small className={cx(move.doubled && styles.weak, move.resisted && styles.resist)}> → {move.estimate}</small>}
          </span>
          {move.text !== '' && <small className={styles.moveText}>{move.text}</small>}
        </button>
      ))}
      {moves.length === 0 && mine.active !== null && <span className={styles.hint}>{text.battle.board.noMoves}</span>}
      {activeNote !== null && <span className={styles.note}>{activeNote}</span>}
    </div>
  );

  const rivalPiles = (
    <div className={styles.piles}>
      <span className={styles.pile} title={text.battle.board.deck}>
        <CardBack />
        <b>{theirs.deck.length}</b>
      </span>
      <span className={styles.fan} title={text.battle.board.opponentHand(theirs.hand.length)} aria-label={text.battle.board.opponentHand(theirs.hand.length)}>
        {theirs.hand.slice(0, 7).map((_, index) => (
          <CardBack key={index} />
        ))}
      </span>
    </div>
  );

  const myPiles = (
    <div className={styles.piles}>
      <span className={styles.pile} title={text.battle.board.deck}>
        <CardBack />
        <b>{mine.deck.length}</b>
      </span>
    </div>
  );

  const inspectorFinish = (cardId: string): FinishId => (inspected?.side === 0 ? finishOfMine(cardId) : 'standard');

  return (
    <div className={styles.board}>
      <div className={styles.table}>
        <PlayerBar
          name={rivalName}
          subtitle={text.battle.board.level(rivalLevel)}
          portrait={portraitOf(rivalCharacter)}
          side={theirs}
          active={mood === 'their-turn'}
          handSize={theirs.hand.length}
          freeHearts={null}
          tint={rivalTint}
        />
        <section className={styles.row}>
          {benchRow(1)}
          <div className={styles.activeCell}>{figureCell(1, { zone: 'active' }, 'active')}</div>
          {rivalPiles}
        </section>

        <div className={styles.middle}>{strip()}</div>

        <section className={styles.row}>
          <div className={styles.activeCell}>{figureCell(0, { zone: 'active' }, 'active')}</div>
          {movesPanel}
          {benchRow(0)}
          {myPiles}
        </section>
        <PlayerBar
          name={text.battle.board.you}
          subtitle={`${deckName}${loaner ? ` · ${text.battle.loaner}` : ''}`}
          portrait={myPortrait}
          side={mine}
          active={mood === 'your-turn'}
          handSize={mine.hand.length}
          freeHearts={mood === 'your-turn' ? heartsLeft(battle, 0) : null}
          tint={myTint}
          actions={
            <>
              <Button kind="quiet" onClick={() => setHelpOpen(true)}>
                {text.battle.howTo}
              </Button>
              {status === 'playing' && (
                <Button kind="quiet" onClick={() => setGiveUpOpen(true)}>
                  {text.battle.giveUp}
                </Button>
              )}
            </>
          }
        />
        <HandView hand={mine.hand} finishOf={finishOfMine} selected={selection?.kind === 'hand' ? selection.index : null} playable={playable} onPick={clickHand} onPoint={point(0)} />
      </div>
      <SidePanel inspected={inspected?.cardId ?? null} finishOf={inspectorFinish} log={log} />

      {prompt !== null && prompt.prompt.kind === 'card' && <CardPrompt view={prompt} finishOf={finishOfMine} onAnswer={(option) => act({ type: 'choose', option })} />}
      {prompt !== null && prompt.prompt.kind === 'yes-no' && <YesNoPrompt view={prompt} finishOf={finishOfMine} onAnswer={(option) => act({ type: 'choose', option })} />}
      {status === 'over' && <ResultDialog />}
      {helpOpen && <HowToPlay onClose={() => setHelpOpen(false)} />}
      {giveUpOpen && (
        <Dialog title={text.battle.giveUp} onClose={() => setGiveUpOpen(false)}>
          <p className={styles.confirmText}>{text.battle.giveUpConfirm}</p>
          <div className={styles.resultActions}>
            <Button onClick={() => setGiveUpOpen(false)}>{text.battle.keepPlaying}</Button>
            <Button
              kind="danger"
              onClick={() => {
                setGiveUpOpen(false);
                battleSession.getState().giveUp();
              }}
            >
              {text.battle.giveUpYes}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** The table of a running battle. */
export function Board() {
  const battle = useBattle((state) => state.battle);
  const rival = useBattle((state) => state.rival);
  const deck = useBattle((state) => state.deck);
  const log = useBattle((state) => state.log);
  const flash = useBattle((state) => state.flash);
  const waiting = useBattle((state) => state.waiting);
  const status = useBattle((state) => state.status);
  if (battle === null || rival === null || deck === null || status === 'idle') {
    return null;
  }
  return (
    <BoardView
      battle={battle}
      rivalName={rival.name}
      rivalCharacter={rival.character}
      rivalLevel={text.battle.levels[rival.level]}
      deckName={deck.name}
      deckCards={deck.cards}
      rivalCards={rival.deck.cards}
      loaner={deck.loaner}
      flash={flash}
      waiting={waiting}
      status={status}
      log={log}
    />
  );
}
