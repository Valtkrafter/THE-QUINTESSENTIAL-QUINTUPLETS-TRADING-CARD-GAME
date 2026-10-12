// The Grading screen: the graders' desk. On the left the loose cards (with how each one looks to the eye), on the right the desk
// with what the graders may say about the chosen card and the button to send it in; the second tab is the display case of the
// slabs that came back.

import { useMemo, useState } from 'react';
import { cardById } from '../../cards/catalog';
import { RARITIES } from '../../cards/model';
import { filterCollection, NO_FILTER, sortCollection, type SortKey } from '../../domain/collection';
import { cheapestToGrade, eyeCheck, gradeOutlook, gradingFee, rawCopies, slabsOf, type Outlook } from '../../domain/grading';
import type { OwnedCard } from '../../domain/ownership';
import { useSave } from '../../state/app';
import { CardTile } from '../components/CardTile';
import { Button, LinkButton, SearchField, SelectField, Segmented } from '../components/controls';
import { SearchIcon } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { formatYen } from '../format';
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { text } from '../text';
import { eyeStyle } from './eye';
import { GradeDesk } from './GradeDesk';
import { GradeFlow } from './GradeFlow';
import { Slabs } from './Slabs';
import styles from './GradingScreen.module.css';

type Tab = 'send' | 'slabs';

/**
 * The ways to order the loose cards. "bet" puts the cards first that are most worth grading (what the graders may say, the fee
 * counted); "looks" the cards with the least wear.
 */
type SendSort = Extract<SortKey, 'rarity' | 'finish' | 'number' | 'newest'> | 'bet' | 'looks';
const SEND_SORTS: readonly SendSort[] = ['bet', 'looks', 'rarity', 'finish', 'number', 'newest'];

const SORT_LABEL = { bet: text.grading.send.sortBet, looks: text.grading.send.sortLooks } as const;

type Show = 'all' | 'clean';

function wear(copy: OwnedCard): number {
  const { centering, corners, edges, surface } = copy.condition;
  return (centering + corners + edges + surface) / 4;
}

function orderedBy(copies: readonly OwnedCard[], sort: SendSort, outlooks: ReadonlyMap<string, Outlook>): OwnedCard[] {
  if (sort === 'bet') {
    // The best bet first; among equals the cleaner card.
    return [...copies].sort((a, b) => (outlooks.get(b.uid)?.edge ?? 0) - (outlooks.get(a.uid)?.edge ?? 0) || wear(b) - wear(a));
  }
  if (sort === 'looks') {
    // The cleanest first; among equals the rarer card first, because it is worth more.
    const rank = (copy: OwnedCard): number => RARITIES.findIndex((rarity) => rarity.id === cardById(copy.cardId)?.rarity);
    return [...copies].sort((a, b) => wear(b) - wear(a) || rank(b) - rank(a));
  }
  return sortCollection(copies, sort);
}

/** The three steps, as three small cards. */
function Steps() {
  const copy = text.grading.steps;
  return (
    <section className={styles.steps} aria-label={copy.title} data-tutorial="grading-steps">
      <ol>
        {copy.list.map((step, index) => (
          <li key={step.title}>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The chosen card on the wide screen: the desk, with the button that asks the final question. */
function Panel({ copy, onSend }: { readonly copy: OwnedCard | undefined; readonly onSend: (uid: string) => void }) {
  const save = useSave();
  const card = copy === undefined ? undefined : cardById(copy.cardId);
  if (copy === undefined || card === undefined) {
    return <p className={styles.hint}>{text.grading.desk.empty}</p>;
  }
  const fee = gradingFee(card.rarity);
  const missing = fee - save.player.yen;
  return (
    <GradeDesk copy={copy}>
      <LinkButton href={`/card/${copy.uid}`} kind="quiet">
        {text.grading.send.look}
      </LinkButton>
      <Button kind="primary" disabled={missing > 0} onClick={() => onSend(copy.uid)} data-tutorial="grading-send">
        {missing > 0 ? text.grading.send.short(missing) : text.grading.send.button(fee)}
      </Button>
    </GradeDesk>
  );
}

function Send() {
  const save = useSave();
  // On a narrow screen there is no room for a side panel: a tap on a card opens the desk in a window.
  const narrow = useMediaQuery(NARROW_QUERY);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SendSort>('bet');
  const [show, setShow] = useState<Show>('all');
  const [pickedUid, setPickedUid] = useState<string | null>(null);
  const [flow, setFlow] = useState<{ readonly uid: string; readonly confirmOnly: boolean } | null>(null);

  const loose = useMemo(() => rawCopies(save.collection), [save.collection]);
  // The card of the lesson in the introduction: the one that is cheapest to send in.
  const lesson = useMemo(() => cheapestToGrade(loose)?.uid, [loose]);
  // What the graders may say about every loose card: worked out once, it is what the order and the tags are made from.
  const outlooks = useMemo(
    () =>
      new Map(
        loose.flatMap((copy) => {
          const card = cardById(copy.cardId);
          return card === undefined ? [] : [[copy.uid, gradeOutlook(copy.condition, card.rarity, copy.finish)] as const];
        }),
      ),
    [loose],
  );
  const shown = useMemo(() => {
    const found = filterCollection(loose, { ...NO_FILTER, query });
    const clean = show === 'clean' ? found.filter((copy) => ['perfect', 'clean'].includes(eyeCheck(copy.condition))) : found;
    return orderedBy(clean, sort, outlooks);
  }, [loose, query, sort, show, outlooks]);
  // A card that has been graded since drops out of the list, and with it out of the selection.
  const chosen = loose.find((copy) => copy.uid === pickedUid);

  return (
    <>
      <Steps />
      {loose.length === 0 ? (
        <p className={styles.empty}>{save.collection.length === 0 ? text.grading.send.none : text.grading.send.allDone}</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <SearchField value={query} onChange={setQuery} placeholder={text.grading.send.search} label={text.grading.send.searchLabel} icon={<SearchIcon size={16} />} />
            <SelectField
              value={sort}
              onChange={setSort}
              label={text.grading.send.sort}
              options={SEND_SORTS.map((key) => ({ value: key, label: key === 'bet' || key === 'looks' ? SORT_LABEL[key] : text.binder.sortOptions[key] }))}
            />
            <Segmented
              value={show}
              onChange={setShow}
              label={text.grading.send.filters}
              options={[
                { value: 'all', label: text.grading.send.showAll },
                { value: 'clean', label: text.grading.send.showClean },
              ]}
            />
          </div>
          <div className={styles.layout}>
            <div className={styles.picker}>
              {shown.length === 0 ? (
                <p className={styles.empty}>{text.grading.send.noMatch}</p>
              ) : (
                <ul className={styles.grid}>
                  {shown.map((copy) => {
                    const eye = eyeCheck(copy.condition);
                    const verdict = outlooks.get(copy.uid)?.verdict;
                    return (
                      <CardTile
                        key={copy.uid}
                        copy={copy}
                        selected={!narrow && copy.uid === pickedUid}
                        anchor={copy.uid === lesson ? 'grading-card' : undefined}
                        onSelect={() => (narrow ? setFlow({ uid: copy.uid, confirmOnly: false }) : setPickedUid(copy.uid))}
                        extra={
                          <span className={styles.tileEye} style={eyeStyle(eye)}>
                            <i aria-hidden="true" />
                            {text.grading.eye[eye].label}
                            {(verdict === 'great' || verdict === 'good') && <b className={styles.betChip}>{text.grading.send.betChip[verdict]}</b>}
                          </span>
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </div>
            {!narrow && (
              <aside className={styles.panel} aria-label={text.grading.send.chosen}>
                <Panel copy={chosen} onSend={(uid) => setFlow({ uid, confirmOnly: true })} />
              </aside>
            )}
          </div>
        </>
      )}
      {flow !== null && <GradeFlow uid={flow.uid} confirmOnly={flow.confirmOnly} lookHref={`/card/${flow.uid}`} onClose={() => setFlow(null)} />}
    </>
  );
}

/** The Grading screen: send a loose card in, and look at the slabs you got back. */
export default function GradingScreen() {
  const save = useSave();
  const [tab, setTab] = useState<Tab>('send');
  const slabCount = useMemo(() => slabsOf(save.collection).length, [save.collection]);
  return (
    <>
      <PageHeader
        title={text.grading.title}
        subtitle={text.grading.subtitle}
        actions={
          <div className={styles.wallet}>
            <span>{text.grading.yen}</span> <strong>{formatYen(save.player.yen)}</strong>
          </div>
        }
      />
      <div className={styles.tabs}>
        <Segmented
          value={tab}
          onChange={setTab}
          label={text.grading.title}
          options={[
            { value: 'send', label: text.grading.tabs.send },
            { value: 'slabs', label: slabCount === 0 ? text.grading.tabs.slabs : `${text.grading.tabs.slabs} (${slabCount})`, anchor: 'grading-tab-slabs' },
          ]}
        />
      </div>
      {tab === 'send' ? <Send /> : <Slabs />}
    </>
  );
}
