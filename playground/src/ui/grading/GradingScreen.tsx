import { useMemo, useState } from 'react';
import { cardById } from '../../cards/catalog';
import { filterCollection, NO_FILTER, sortCollection, type SortKey } from '../../domain/collection';
import { gradeBand, gradeLabel, gradingFee, populationReport, rawCopies, slabValue, slabsOf } from '../../domain/grading';
import type { OwnedCard } from '../../domain/ownership';
import { findFinish } from '../../holo/finishes';
import { useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { CardTile } from '../components/CardTile';
import { Button, LinkButton, Pill, SearchField, SelectField, Segmented } from '../components/controls';
import { SearchIcon } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { formatGrade, formatYen } from '../format';
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { text } from '../text';
import { bandStyle } from './bandStyle';
import { GradeFlow } from './GradeFlow';
import { PriceLadder } from './PriceLadder';
import styles from './GradingScreen.module.css';

type Tab = 'send' | 'slabs';

const SEND_SORTS: readonly SortKey[] = ['rarity', 'finish', 'number', 'newest'];

/** The rules of Grading in a few lines. Open on a wide screen, folded on a phone where the room is needed for the cards. */
function HowItWorks() {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 700px)').matches);
  return (
    <details className={styles.how} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{text.grading.howTitle}</summary>
      <ul>
        {text.grading.how.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p>{text.grading.odds}</p>
    </details>
  );
}

/** The card chosen on a wide screen: what it costs to grade it, what it would be worth, and the way to send it in. */
function ChosenPanel({ copy, onSend }: { readonly copy: OwnedCard | undefined; readonly onSend: (uid: string) => void }) {
  const save = useSave();
  const card = copy === undefined ? undefined : cardById(copy.cardId);
  if (copy === undefined || card === undefined) {
    return <p className={styles.hint}>{text.grading.send.choose}</p>;
  }
  const fee = gradingFee(card.rarity);
  const missing = fee - save.player.yen;
  return (
    <>
      <div className={styles.chosen}>
        <span className={styles.chosenFace}>
          <CardFace card={card} finish={copy.finish} interactive={false} />
        </span>
        <div className={styles.chosenInfo}>
          <strong>{card.name.en}</strong>
          <span className={styles.title}>{card.title}</span>
          <Pill>
            {findFinish(copy.finish).label} · {card.rarity}
          </Pill>
        </div>
      </div>
      <div className={styles.fee}>
        <span>{text.grading.send.fee}</span>
        <strong>{formatYen(fee)}</strong>
      </div>
      <PriceLadder rarity={card.rarity} finish={copy.finish} />
      <div className={styles.panelActions}>
        <LinkButton href={`/card/${copy.uid}`} kind="quiet">
          {text.grading.send.look}
        </LinkButton>
        <Button kind="primary" disabled={missing > 0} onClick={() => onSend(copy.uid)}>
          {missing > 0 ? text.grading.send.short(missing) : text.grading.send.button(fee)}
        </Button>
      </div>
    </>
  );
}

function Send() {
  const save = useSave();
  // On a narrow screen there is no room for a side panel: a tap on a card opens the question (with the price ladder) at once.
  const narrow = useMediaQuery(NARROW_QUERY);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('rarity');
  const [pickedUid, setPickedUid] = useState<string | null>(null);
  const [flowUid, setFlowUid] = useState<string | null>(null);

  const loose = useMemo(() => rawCopies(save.collection), [save.collection]);
  const shown = useMemo(() => sortCollection(filterCollection(loose, { ...NO_FILTER, query }), sort), [loose, query, sort]);
  // A card that has been graded since drops out of the list, and with it out of the selection.
  const chosen = loose.find((copy) => copy.uid === pickedUid);

  return (
    <>
      <HowItWorks />
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
              options={SEND_SORTS.map((key) => ({ value: key, label: text.binder.sortOptions[key] }))}
            />
          </div>
          <div className={styles.layout}>
            <div className={styles.picker}>
              {shown.length === 0 ? (
                <p className={styles.empty}>{text.grading.send.noMatch}</p>
              ) : (
                <ul className={styles.grid}>
                  {shown.map((copy) => (
                    <CardTile
                      key={copy.uid}
                      copy={copy}
                      selected={!narrow && copy.uid === pickedUid}
                      onSelect={() => (narrow ? setFlowUid(copy.uid) : setPickedUid(copy.uid))}
                    />
                  ))}
                </ul>
              )}
            </div>
            {!narrow && (
              <aside className={styles.panel} aria-label={text.grading.send.chosen}>
                <ChosenPanel copy={chosen} onSend={setFlowUid} />
              </aside>
            )}
          </div>
        </>
      )}
      {flowUid !== null && <GradeFlow uid={flowUid} lookHref={`/card/${flowUid}`} onClose={() => setFlowUid(null)} />}
    </>
  );
}

function Slabs() {
  const save = useSave();
  const slabs = useMemo(() => slabsOf(save.collection), [save.collection]);
  const report = useMemo(() => populationReport(save.collection), [save.collection]);

  if (slabs.length === 0) {
    return <p className={styles.empty}>{text.grading.slabs.none}</p>;
  }
  const total = slabs.reduce((sum, copy) => sum + slabValue(copy), 0);
  const most = Math.max(...report.map((row) => row.count));

  return (
    <>
      <p className={styles.summary}>{text.grading.slabs.summary(slabs.length, total)}</p>
      <section className={styles.report} aria-label={text.grading.slabs.report}>
        <h2>{text.grading.slabs.report}</h2>
        <p>{text.grading.slabs.reportNote}</p>
        <ul>
          {report.map((row) => (
            <li key={row.overall} style={bandStyle(gradeBand(row.overall).id)}>
              <strong>{formatGrade(row.overall)}</strong>
              <span>{gradeLabel(row.overall)}</span>
              <i className={styles.bar} aria-hidden="true">
                <b style={{ width: `${(row.count / most) * 100}%` }} />
              </i>
              <output>{row.count}</output>
            </li>
          ))}
        </ul>
      </section>
      <ul className={styles.grid}>
        {slabs.map((copy) => (
          <CardTile key={copy.uid} copy={copy} href={`/card/${copy.uid}`} extra={text.grading.slabs.worth(slabValue(copy))} />
        ))}
      </ul>
    </>
  );
}

/** The Grading screen: send a loose card in, and look at the slabs you got back. */
export default function GradingScreen() {
  const save = useSave();
  const [tab, setTab] = useState<Tab>('send');
  return (
    <>
      <PageHeader
        title={text.grading.title}
        subtitle={text.grading.subtitle}
        actions={
          <div>
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
            { value: 'slabs', label: text.grading.tabs.slabs },
          ]}
        />
      </div>
      {tab === 'send' ? <Send /> : <Slabs />}
    </>
  );
}
