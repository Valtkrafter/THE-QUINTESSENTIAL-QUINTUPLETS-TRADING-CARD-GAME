// The table of a running battle: the rival's side above yours, the steps of the turn on the left, your hand and the free Heart on
// the right, and a line under it all that says what to do next. This file holds what the player has picked up (a card of the hand,
// the free Heart, a Character) and turns clicks into actions; the drawing is in the parts it uses. The player is always player 0.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { profileOf } from '../../battle/deckProfile';
import { legalActions } from '../../battle/legal';
import { BENCH_SIZE, figureAt, freeHearts, retreatCost, topCard } from '../../battle/rules';
import type { BattleAction, BattleState, Figure, FigureRef, PlayerIndex } from '../../battle/types';
import { AFFINITY_INFO } from '../../cards/characters';
import { cardById } from '../../cards/catalog';
import { FINISH_IDS, type FinishId } from '../../cards/finish';
import type { OwnedCard } from '../../domain/ownership';
import { battleSession, useBattle, useSave } from '../../state/app';
import type { FlashState, LogLine } from '../../state/battleSession';
import { CardFace } from '../components/CardFace';
import { Button } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { trapTab } from '../components/focusTrap';
import { useElementSize } from '../hooks/useElementSize';
import { text } from '../text';
import { CaptionBar } from './CaptionBar';
import { captionFor, setupGuide, turnGuide } from './coach';
import { floatersFor, placeKey, type Floater } from './floaters';
import { EmptySlot, FigureView, type Highlight } from './FigureView';
import { HandView } from './HandView';
import { Explainer } from './Explainer';
import { HowToPlay } from './HowToPlay';
import { fitScale, figurePoint, figureSize, layoutFor, type Layout } from './layout';
import { GiveUpDialog, LogDialog, MenuDialog } from './MenuDialogs';
import { HeartZone, MovesPanel, StepsPanel, type StepItem } from './panels';
import { portraitOf } from './portraits';
import { CardPrompt, YesNoPrompt } from './Prompts';
import { ResultDialog } from './ResultDialog';
import { DeckPile, DiscardPile, FoePanel, InfoPanel, Inspector, MemoryRow, Placed, type WhoProps } from './stageParts';
import styles from './Table.module.css';
import { useBattleSounds } from './useBattleSounds';
import { figureOptions, handOptions, heartsLeft, isPlayable, moodOf, moveViews, promptFor } from './viewModel';

/** What the player has picked up: a card of the hand, the free Heart or a Character in play. */
type Selection = { readonly kind: 'hand'; readonly index: number } | { readonly kind: 'figure'; readonly ref: FigureRef } | { readonly kind: 'heart' } | null;

interface Floating {
  readonly id: number;
  readonly floater: Floater;
}

interface Ghost {
  readonly id: number;
  readonly side: PlayerIndex;
  readonly cardId: string;
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

/**
 * Keeps the floating texts of the last step on the table for a moment, tells who lunges, and keeps a Character that was knocked
 * out on the table while it fades away towards the discard pile.
 */
function useFloaters(flash: FlashState): {
  readonly places: ReadonlyMap<string, readonly Floating[]>;
  readonly lunge: PlayerIndex | null;
  readonly ghosts: readonly Ghost[];
} {
  const [items, setItems] = useState<readonly (Floating & { readonly key: string })[]>([]);
  const [ghosts, setGhosts] = useState<readonly Ghost[]>([]);
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
    const fallen = flash.events.flatMap((event): Ghost[] => {
      if (event.type !== 'knock-out') {
        return [];
      }
      counter.current += 1;
      return [{ id: counter.current, side: event.player, cardId: event.cardId }];
    });
    const timers: number[] = [];
    if (added.length > 0) {
      setItems((current) => [...current, ...added]);
      timers.push(window.setTimeout(() => setItems((current) => current.filter((item) => !added.some((done) => done.id === item.id))), 1900));
    }
    if (fallen.length > 0) {
      setGhosts((current) => [...current, ...fallen]);
      timers.push(window.setTimeout(() => setGhosts((current) => current.filter((ghost) => !fallen.some((done) => done.id === ghost.id))), 1000));
    }
    const attack = flash.events.find((event) => event.type === 'attack');
    if (attack?.type === 'attack') {
      setLunge(attack.player);
      timers.push(window.setTimeout(() => setLunge(null), 520));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [flash]);

  const places = useMemo(() => {
    const map = new Map<string, Floating[]>();
    for (const item of items) {
      map.set(item.key, [...(map.get(item.key) ?? []), { id: item.id, floater: item.floater }]);
    }
    return map;
  }, [items]);
  return { places, lunge, ghosts };
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
  readonly log: readonly LogLine[];
}

function BoardView({ battle, rivalName, rivalCharacter, rivalLevel, deckName, deckCards, rivalCards, loaner, flash, waiting, status, log }: BoardViewProps) {
  const save = useSave();
  const [, navigate] = useLocation();
  const legal = useMemo(() => legalActions(battle, 0), [battle]);
  const prompt = promptFor(battle, 0);
  const mood = moodOf(battle);
  const [picked, setPicked] = useState<{ readonly at: BattleState; readonly selection: Selection }>({ at: battle, selection: null });
  const selection = picked.at === battle ? picked.selection : null;
  const [inspected, setInspected] = useState<{ readonly cardId: string; readonly side: PlayerIndex } | null>(null);
  // The card that was pressed and held with a finger, shown large (a phone cannot hover).
  const [zoomed, setZoomed] = useState<{ readonly cardId: string; readonly side: PlayerIndex } | null>(null);
  const [dialog, setDialog] = useState<'menu' | 'help' | 'watch' | 'log' | 'giveUp' | null>(null);
  const { places, lunge, ghosts } = useFloaters(flash);
  useBattleSounds(flash);
  const rootRef = useRef<HTMLDivElement>(null);
  const [spaceRef, space] = useElementSize<HTMLDivElement>();
  const [windowSize, setWindowSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    const onResize = (): void => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const layout: Layout = layoutFor(windowSize.width, windowSize.height);
  const scale = fitScale(layout, space.width, space.height);
  const touch = window.matchMedia('(hover: none)').matches;

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
  const you: WhoProps = { name: text.battle.board.you, portrait: myPortrait, tint: myTint };
  const rival: WhoProps = { name: rivalShort, portrait: portraitOf(rivalCharacter), tint: rivalTint };

  const canAct = status === 'playing' && !waiting;
  const act = (action: BattleAction): void => battleSession.getState().act(action);

  // --- What can be done ---------------------------------------------------------------------------------------------------------

  const heartTargets = useMemo(() => legal.flatMap((action) => (action.type === 'give-heart' ? [action.target] : [])), [legal]);
  const handOpts = useMemo(() => mine.hand.map((_, index) => handOptions(legal, index)), [mine.hand, legal]);
  const playable = handOpts.map(isPlayable);
  const moves = moveViews(battle, 0, legal);

  const select = (next: Selection): void => setPicked({ at: battle, selection: next });

  const pickHeart = (): void => {
    if (!canAct || prompt !== null) {
      return;
    }
    if (selection?.kind === 'heart') {
      select(null);
    } else if (heartTargets.length === 1 && heartTargets[0] !== undefined) {
      // Only one Character can take it: no need to ask which.
      act({ type: 'give-heart', target: heartTargets[0] });
    } else {
      select({ kind: 'heart' });
    }
  };

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
    if (selection?.kind === 'heart') {
      const give = legal.find((action) => action.type === 'give-heart' && sameRef(action.target, ref));
      if (give !== undefined) {
        act(give);
        return;
      }
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
    if (side === 0 && selection?.kind === 'heart' && heartTargets.some((target) => sameRef(target, ref))) {
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

  // --- What is told ---------------------------------------------------------------------------------------------------------------

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

  const guide = turnGuide(battle, legal, 0);
  const setup = setupGuide(battle, legal, 0);
  const lastLine = log.length === 0 ? null : (log[log.length - 1]?.text ?? null);
  const stunned = mine.active !== null && mine.active.stunTurn !== 0 && mine.active.stunTurn === battle.turn;
  const noAttackYet = battle.first === 0 && mine.turnsTaken <= 1;
  const caption = captionFor({
    mood,
    rival: rivalShort,
    promptTitle: prompt === null ? null : prompt.title,
    promptKind: prompt === null ? null : prompt.prompt.kind,
    guide,
    setup,
    heartsLeft: heartsLeft(battle, 0),
    heartPicked: selection?.kind === 'heart',
    handPick: handSelected === null ? null : handSelected.evolve.length > 0 ? 'evolve' : handSelected.supporter !== null ? 'supporter' : null,
    figurePicked: selection?.kind === 'figure',
    noAttackYet,
    stunned,
    lastLine: waiting || mood === 'their-turn' ? lastLine : null,
    rivalReady: theirs.setupDone,
    benchFree: BENCH_SIZE - mine.bench.length,
  });

  const stepTexts = text.battle.steps;
  const steps: StepItem[] =
    mood === 'setup'
      ? setup.steps.map((entry) => ({ id: entry.id, title: stepTexts.setupSteps[entry.id].title, hint: stepTexts.setupSteps[entry.id].hint, status: entry.status, current: setup.next === entry.id }))
      : guide.steps.map((entry) => ({ id: entry.id, title: stepTexts.turn[entry.id].title, hint: stepTexts.turn[entry.id].hint, status: entry.status, current: guide.next === entry.id }));
  const stepsTitle = mood === 'setup' ? stepTexts.setup : mood === 'their-turn' ? stepTexts.theirTurn(rivalShort) : stepTexts.yourTurn;

  const actions: ReactNode = (() => {
    if (status === 'over') {
      return null;
    }
    if (prompt !== null) {
      return prompt.prompt.kind === 'figure' && prompt.optional ? (
        <Button kind="quiet" onClick={() => act({ type: 'choose', option: -1 })}>
          {text.battle.board.skip}
        </Button>
      ) : null;
    }
    if (mood === 'setup') {
      return setupDone === undefined ? null : (
        <Button kind="primary" onClick={() => act(setupDone)} data-tutorial="battle-ready">
          {text.battle.board.ready}
        </Button>
      );
    }
    if (mood !== 'your-turn' || waiting) {
      return null;
    }
    return (
      <>
        {supporterCard !== null && (
          <Button kind="primary" onClick={() => act(supporterCard)}>
            {text.battle.board.playSupporter}: {handCardName}
          </Button>
        )}
        {give !== null && <Button onClick={() => act(give)}>{text.battle.board.giveHeart}</Button>}
        {ability !== null && <Button onClick={() => act(ability)}>{text.battle.board.useAbility(abilityName)}</Button>}
        {swap !== null && mine.active !== null && <Button onClick={() => act(swap)}>{text.battle.board.retreat(retreatCost(mine.active))}</Button>}
        {endTurn !== undefined && (
          <Button kind={guide.next === null && selection === null ? 'primary' : 'default'} onClick={() => act(endTurn)} data-tutorial="battle-end">
            {text.battle.board.endTurn}
          </Button>
        )}
      </>
    );
  })();

  // --- Drawing ------------------------------------------------------------------------------------------------------------------------

  const point = (side: PlayerIndex) => (cardId: string | null) => setInspected(cardId === null ? null : { cardId, side });
  const inspectorFinish = (cardId: string): FinishId => (inspected?.side === 0 ? finishOfMine(cardId) : 'standard');
  const zoomedCard = zoomed === null ? undefined : cardById(zoomed.cardId);

  const figureView = (side: PlayerIndex, figure: Figure, ref: FigureRef): ReactNode => {
    const place = figurePoint(layout, side, ref);
    const size = figureSize(layout, ref);
    const owner = battle.players[side];
    const clickable = highlightOf(side, ref) === 'target';
    return (
      <FigureView
        key={`${side}-${figure.uid}`}
        figure={figure}
        zone={ref.zone}
        point={place}
        size={size}
        strip={layout.strip}
        finish={side === 0 ? finishOfMine(topCard(figure).id) : finishOfTheirs()}
        highlight={highlightOf(side, ref)}
        stunned={ref.zone === 'active' && figure.stunTurn !== 0 && figure.stunTurn === battle.turn}
        shielded={ref.zone === 'active' && owner.shieldTurn !== 0 && owner.shieldTurn === battle.turn}
        floaters={places.get(placeKey(side, ref)) ?? []}
        lunge={lunge === side && ref.zone === 'active'}
        towards={side === 0 ? 'up' : 'down'}
        disabled={!clickable && (side === 1 || !canAct)}
        onClick={() => clickFigure(side, ref)}
        onPoint={point(side)}
        onHold={() => setZoomed({ cardId: topCard(figure).id, side })}
      />
    );
  };

  const sideFigures = (side: PlayerIndex): ReactNode => {
    const owner = battle.players[side];
    return (
      <>
        {owner.active !== null && figureView(side, owner.active, { zone: 'active' })}
        {owner.bench.map((figure, index) => figureView(side, figure, { zone: 'bench', index }))}
      </>
    );
  };

  const slots = (side: PlayerIndex): ReactNode => {
    const owner = battle.players[side];
    return (
      <>
        {owner.active === null && <EmptySlot point={figurePoint(layout, side, { zone: 'active' })} size={layout.active} strip={layout.strip} label={text.battle.board.active} active />}
        {Array.from({ length: BENCH_SIZE }, (_, index) =>
          owner.bench[index] === undefined ? <EmptySlot key={index} point={figurePoint(layout, side, { zone: 'bench', index })} size={layout.bench} strip={layout.strip} label={text.battle.board.bench} /> : null,
        )}
      </>
    );
  };

  const foeCard = theirs.active === null ? null : topCard(theirs.active);
  const myCard = mine.active === null ? null : topCard(mine.active);
  const compact = layout.name === 'tall';
  const movesNote = stunned && mood === 'your-turn' ? text.battle.board.stunned : noAttackYet && mood === 'your-turn' ? text.battle.board.cannotAttackFirst : null;

  // A keyboard stays inside the table while it is open (the menu of the page is hidden behind it).
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (rootRef.current !== null && dialog === null) {
      trapTab(event, rootRef.current);
    }
  };

  return (
    <div ref={rootRef} className={styles.screen} role="region" aria-label={text.battle.table.label} onKeyDown={onKeyDown}>
      <div ref={spaceRef} className={styles.space} data-layout={layout.name} data-tutorial="battle-table">
        <div className={styles.sizer} style={{ width: layout.width * scale, height: layout.height * scale }}>
          <div className={styles.stage} style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` } as CSSProperties}>
            {layout.steps.h > 0 && <StepsPanel box={layout.steps} title={stepsTitle} steps={steps} dim={mood === 'their-turn' || status === 'over' || prompt !== null} compact={compact} />}
            {layout.inspector !== null && <Inspector box={layout.inspector} cardId={inspected?.cardId ?? null} finish={inspected === null ? 'standard' : inspectorFinish(inspected.cardId)} touch={touch} />}

            {slots(1)}
            {slots(0)}
            <DeckPile point={layout.opp.deck} size={layout.pile} count={theirs.deck.length} label={text.battle.board.deck} />
            <DiscardPile point={layout.opp.discard} size={layout.pile} cards={theirs.discard} label={text.battle.board.discard} finishOf={finishOfTheirs} />
            <DeckPile point={layout.mine.deck} size={layout.pile} count={mine.deck.length} label={text.battle.board.deck} />
            <DiscardPile point={layout.mine.discard} size={layout.pile} cards={mine.discard} label={text.battle.board.discard} finishOf={finishOfMine} />

            {layout.opp.info !== null && <InfoPanel box={layout.opp.info} who={rival} subtitle={text.battle.board.level(rivalLevel)} active={mood === 'their-turn'} deck={theirs.deck.length} hand={theirs.hand.length} fan />}
            {layout.mine.info !== null && (
              <InfoPanel box={layout.mine.info} who={you} subtitle={`${deckName}${loaner ? ` · ${text.battle.loaner}` : ''}`} active={mood === 'your-turn'} deck={mine.deck.length} hand={mine.hand.length} fan={false} />
            )}
            <FoePanel box={layout.foe} foe={foeCard} mine={myCard} compact={compact} />
            <MovesPanel
              box={layout.moves}
              moves={moves}
              canAct={canAct && prompt === null && mood === 'your-turn'}
              hasActive={mine.active !== null}
              note={movesNote}
              compact={compact}
              onMove={(index) => act({ type: 'attack', moveIndex: index })}
              onPoint={() => mine.active !== null && point(0)(topCard(mine.active).id)}
            />

            {sideFigures(1)}
            {sideFigures(0)}
            {ghosts.map((ghost) => {
              const card = cardById(ghost.cardId);
              const at = figurePoint(layout, ghost.side, { zone: 'active' });
              const to = (ghost.side === 0 ? layout.mine : layout.opp).discard;
              return card === undefined ? null : (
                <span
                  key={ghost.id}
                  className={styles.ghost}
                  style={{ left: at.x, top: at.y, width: layout.active.w, '--to-x': `${to.x - at.x}px`, '--to-y': `${to.y - at.y}px` } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className={styles.face}>
                    <CardFace card={card} finish="standard" interactive={false} live={false} />
                  </span>
                </span>
              );
            })}

            <MemoryRow box={layout.memories.opp} who={rival} count={theirs.memories} turn={mood === 'their-turn'} />
            <MemoryRow box={layout.memories.mine} who={you} count={mine.memories} turn={mood === 'your-turn'} />
            <HeartZone box={layout.hearts} left={mood === 'your-turn' ? heartsLeft(battle, 0) : 0} total={freeHearts(battle, 0)} yourTurn={mood === 'your-turn'} enabled={canAct && prompt === null && mood === 'your-turn' && heartTargets.length > 0} picked={selection?.kind === 'heart'} row={compact} onPick={pickHeart} />
            <Placed box={layout.hand} label={text.battle.board.yourHand} anchor="hand">
              <p className={styles.handTitle}>
                <strong>{text.battle.table.handTitle(mine.hand.length)}</strong>
                <span>{text.battle.table.handHint}</span>
              </p>
              <HandView
                layout={layout}
                hand={mine.hand}
                finishOf={finishOfMine}
                selected={selection?.kind === 'hand' ? selection.index : null}
                playable={canAct && prompt === null ? playable : []}
                onPick={clickHand}
                onPoint={point(0)}
                onHold={(cardId) => setZoomed({ cardId, side: 0 })}
              />
            </Placed>
          </div>
        </div>
      </div>
      <CaptionBar caption={caption} actions={actions} onMenu={() => setDialog('menu')} />

      <div className={styles.srOnly} role="log" aria-label={text.battle.board.log}>
        {log.slice(-12).map((line) => (
          <p key={line.id}>{line.text}</p>
        ))}
      </div>

      {zoomed !== null && zoomedCard !== undefined && (
        <Dialog title={zoomedCard.name.en} onClose={() => setZoomed(null)}>
          <div className={styles.zoom}>
            <CardFace card={zoomedCard} finish={zoomed.side === 0 ? finishOfMine(zoomedCard.id) : finishOfTheirs()} interactive={false} />
          </div>
        </Dialog>
      )}
      {prompt !== null && prompt.prompt.kind === 'card' && <CardPrompt view={prompt} finishOf={finishOfMine} onAnswer={(option) => act({ type: 'choose', option })} />}
      {prompt !== null && prompt.prompt.kind === 'yes-no' && <YesNoPrompt view={prompt} finishOf={finishOfMine} onAnswer={(option) => act({ type: 'choose', option })} />}
      {status === 'over' && <ResultDialog />}
      {dialog === 'menu' && (
        <MenuDialog
          playing={status === 'playing'}
          onResume={() => setDialog(null)}
          onHowTo={() => setDialog('help')}
          onLog={() => setDialog('log')}
          onGiveUp={() => setDialog('giveUp')}
          onLeave={() => {
            setDialog(null);
            navigate('/packs');
          }}
        />
      )}
      {dialog === 'help' && <HowToPlay onClose={() => setDialog(null)} onWatch={() => setDialog('watch')} />}
      {dialog === 'watch' && <Explainer onClose={() => setDialog(null)} />}
      {dialog === 'log' && <LogDialog log={log} onClose={() => setDialog(null)} />}
      {dialog === 'giveUp' && (
        <GiveUpDialog
          onKeep={() => setDialog(null)}
          onGiveUp={() => {
            setDialog(null);
            battleSession.getState().giveUp();
          }}
        />
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
