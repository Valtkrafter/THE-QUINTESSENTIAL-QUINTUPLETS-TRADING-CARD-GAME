import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { SET_CODE } from '../../cards/catalog';
import { CHARACTERS } from '../../cards/characters';
import { CHARACTER_IDS, type CharacterId } from '../../cards/model';
import { buildDex, dexProgress, dexProgressByCharacter, type DexEntry } from '../../domain/collection';
import { DEX_PACK_EVERY, claimDexRewards, pendingDexRewards } from '../../domain/dexRewards';
import { findFinish } from '../../holo/finishes';
import { gameStore, useSave } from '../../state/app';
import { CardFace } from '../components/CardFace';
import { Button, ProgressBar } from '../components/controls';
import { PageHeader } from '../components/PageHeader';
import { affinityColor } from '../finishStyle';
import { cx, formatCardNumber } from '../format';
import { text } from '../text';
import styles from './DexScreen.module.css';

function DexTile({ entry, total }: { readonly entry: DexEntry; readonly total: number }) {
  const { card, best, owned } = entry;
  const number = formatCardNumber(card.number, total);
  const face = <CardFace card={card} finish={best?.finish ?? 'standard'} locked={best === null} interactive={best !== null} />;
  return (
    <li className={cx(styles.tile, best === null && styles.locked)}>
      {best === null ? (
        <div className={styles.hit} aria-label={`${number} · ${text.dex.unknown}`}>
          {face}
        </div>
      ) : (
        <Link href={`/card/${best.uid}`} className={styles.hit} aria-label={`${number} · ${card.name.en} · ${card.title}`}>
          {face}
        </Link>
      )}
      <div className={styles.caption}>
        <span className={styles.number}>{number}</span>
        <span className={styles.title}>{best === null ? text.dex.unknown : card.title}</span>
        {best !== null && (
          <span className={styles.owned}>
            {findFinish(best.finish).label}
            {owned > 1 && <b>{text.dex.owned(owned)}</b>}
          </span>
        )}
      </div>
    </li>
  );
}

export default function DexScreen() {
  const save = useSave();
  const { collection } = save;
  const entries = useMemo(() => buildDex(collection), [collection]);
  const overall = useMemo(() => dexProgress(entries), [entries]);
  const perCharacter = useMemo(() => dexProgressByCharacter(entries), [entries]);
  const pending = pendingDexRewards(save);
  const waiting = pending.packs > 0 || pending.characters.length > 0;
  const [message, setMessage] = useState<string | null>(null);

  const claim = (): void => {
    const claimed = gameStore.getState().transact((current) => {
      const result = claimDexRewards(current, Date.now());
      return { save: result.save, value: result.claimed };
    });
    setMessage(claimed === undefined ? null : text.dex.rewards.got(claimed.packs, claimed.yen));
  };

  return (
    <>
      <PageHeader title={text.dex.title} subtitle={`${SET_CODE} · ${text.dex.summary(overall.found, overall.total)}`} />
      <div className={styles.overall} data-tutorial="dex-progress">
        <ProgressBar value={overall.found} max={overall.total} label={text.dex.title} />
      </div>
      <section className={styles.rewards} aria-label={text.dex.rewards.title} data-tutorial="dex-rewards">
        <div>
          <h2>{text.dex.rewards.title}</h2>
          <p>
            {waiting
              ? text.dex.rewards.waiting(pending.packs, pending.yen, pending.characters.length)
              : overall.found >= overall.total
                ? text.dex.rewards.complete
                : text.dex.rewards.next(DEX_PACK_EVERY - (overall.found % DEX_PACK_EVERY))}
          </p>
          <p className={styles.note}>{text.dex.rewards.rule}</p>
          {message !== null && <p className={styles.got}>{message}</p>}
        </div>
        {waiting && (
          <Button kind="primary" onClick={claim} data-tutorial="dex-claim">
            {text.dex.rewards.claim}
          </Button>
        )}
      </section>
      {CHARACTER_IDS.map((id: CharacterId, position) => {
        const info = CHARACTERS[id];
        const progress = perCharacter.get(id);
        const own = entries.filter((entry) => entry.card.character === id);
        if (own.length === 0) {
          return null;
        }
        const color = affinityColor(info.affinity);
        return (
          <section key={id} className={styles.section} aria-label={info.name.en} data-tutorial={position === 0 ? 'dex-sister' : undefined}>
            <header className={styles.sectionHeader}>
              <span className={styles.dot} style={{ background: color }} />
              <h2>{info.name.en}</h2>
              <span className={styles.ja}>{info.name.ja}</span>
              <span className={styles.count}>{text.dex.progress(progress?.found ?? 0, progress?.total ?? own.length)}</span>
              <div className={styles.bar}>
                <ProgressBar value={progress?.found ?? 0} max={progress?.total ?? own.length} from={color} to={color} label={info.name.en} />
              </div>
            </header>
            <ul className={styles.grid}>
              {own.map((entry) => (
                <DexTile key={entry.card.id} entry={entry} total={overall.total} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
