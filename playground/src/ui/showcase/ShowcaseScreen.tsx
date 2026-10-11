import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { cardById } from '../../cards/catalog';
import { sortCollection } from '../../domain/collection';
import type { OwnedCard } from '../../domain/ownership';
import { SHOWCASE_SLOTS, withShowcase } from '../../domain/save';
import { gameStore, useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { CardTile } from '../components/CardTile';
import { Dialog } from '../components/Dialog';
import { CloseIcon, PlusIcon } from '../components/icons';
import { PageHeader } from '../components/PageHeader';
import { GradeBadge } from '../grading/GradeBadge';
import { text } from '../text';
import styles from './ShowcaseScreen.module.css';

function changeShowcase(uids: readonly string[]): void {
  gameStore.getState().change((save) => withShowcase(save, uids, Date.now()));
}

function Picker({ onClose }: { readonly onClose: () => void }) {
  const save = useSave();
  const choices = useMemo(
    () => sortCollection(save.collection.filter((copy) => !save.showcase.includes(copy.uid)), 'rarity'),
    [save.collection, save.showcase],
  );
  const pick = (copy: OwnedCard) => {
    changeShowcase([...save.showcase, copy.uid]);
    onClose();
  };
  return (
    <Dialog title={text.showcase.pickerTitle} onClose={onClose} wide>
      {choices.length === 0 ? (
        <p>{save.collection.length === 0 ? text.showcase.pickerEmpty : text.showcase.pickerAllShown}</p>
      ) : (
        <ul className={styles.picker}>
          {choices.map((copy) => (
            <CardTile key={copy.uid} copy={copy} onSelect={() => pick(copy)} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

export default function ShowcaseScreen() {
  const save = useSave();
  const [picking, setPicking] = useState(false);
  const shown = save.showcase.flatMap((uid) => {
    const copy = save.collection.find((owned) => owned.uid === uid);
    const card = copy === undefined ? undefined : cardById(copy.cardId);
    return copy === undefined || card === undefined ? [] : [{ copy, card }];
  });
  const free = SHOWCASE_SLOTS - shown.length;

  return (
    <>
      <PageHeader title={text.showcase.title} subtitle={text.showcase.summary(shown.length, SHOWCASE_SLOTS)} />
      {save.collection.length === 0 && <p className={styles.note}>{text.showcase.nothingYet}</p>}
      <section className={styles.case} aria-label={text.showcase.title}>
        <ul className={styles.shelf}>
          {shown.map(({ copy, card }) => (
            <li key={copy.uid} className={styles.slot}>
              <div className={styles.cardBox}>
                <Link href={`/card/${copy.uid}`} className={styles.hit} aria-label={`${card.name.en} · ${card.title}`}>
                  <CardFace card={card} finish={copy.finish} />
                </Link>
                {copy.grade !== null && (
                  <span className={styles.grade}>
                    <GradeBadge grade={copy.grade} size="large" />
                  </span>
                )}
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`${text.showcase.remove}: ${card.name.en}`}
                  title={text.showcase.remove}
                  onClick={() => changeShowcase(save.showcase.filter((uid) => uid !== copy.uid))}
                >
                  <CloseIcon size={14} />
                </button>
              </div>
              <div className={styles.plinth} />
            </li>
          ))}
          {Array.from({ length: free }, (_, index) => (
            <li key={`free-${index}`} className={styles.slot}>
              <div className={styles.cardBox}>
                <button
                  type="button"
                  className={styles.empty}
                  onClick={() => setPicking(true)}
                  disabled={save.collection.length === 0}
                  aria-label={text.showcase.choose}
                >
                  <PlusIcon size={22} />
                  <span>{text.showcase.choose}</span>
                </button>
              </div>
              <div className={styles.plinth} />
            </li>
          ))}
        </ul>
      </section>
      {picking && <Picker onClose={() => setPicking(false)} />}
    </>
  );
}
