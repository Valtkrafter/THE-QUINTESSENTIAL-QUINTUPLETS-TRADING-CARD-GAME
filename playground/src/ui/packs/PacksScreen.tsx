import { lazy, Suspense, useRef, useState } from 'react';
import { cardById } from '../../cards/catalog';
import { RARITIES } from '../../cards/model';
import { claimDailyBonus, dailyBonusWaiting, daysWaiting } from '../../domain/daily';
import { PackError, openPack, type PackOpening } from '../../packs/openPack';
import { PACKS, packById } from '../../packs/catalog';
import { isAvailable } from '../../packs/rollPack';
import { gameStore, useSave } from '../../state/app';
import { Button } from '../components/controls';
import { PageHeader } from '../components/PageHeader';
import { FINISH_SWATCH } from '../finishStyle';
import { formatYen } from '../format';
import { useToday } from '../hooks/useToday';
import { startAudio } from '../pull/audioSession';
import { text } from '../text';
import { PackCard } from './PackCard';
import styles from './PacksScreen.module.css';

// The pack opening brings three.js and the sound library with it, so it loads when the first pack is opened.
const PullOverlay = lazy(() => import('../pull/PullOverlay'));

interface Session {
  readonly id: number;
  readonly openings: readonly PackOpening[];
}

const TIME = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function History() {
  const save = useSave();
  const entries = [...save.packHistory].reverse().slice(0, 8);
  return (
    <section className={styles.history} aria-label={text.packs.history}>
      <h2>{text.packs.history}</h2>
      {entries.length === 0 ? (
        <p className={styles.empty}>{text.packs.historyEmpty}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={`${entry.at}-${entry.pack}`}>
              <span className={styles.when}>{TIME.format(entry.at)}</span>
              <span className={styles.packName}>{packById(entry.pack)?.name ?? entry.pack}</span>
              <span className={styles.cards}>
                {entry.cards.map((item, index) => {
                  const card = cardById(item.cardId);
                  const rarity = RARITIES.find((candidate) => candidate.id === card?.rarity);
                  return (
                    <span key={`${item.cardId}-${index}`} className={styles.dot} title={card === undefined ? item.cardId : `${card.name.en} · ${card.title}`}>
                      <i style={{ background: FINISH_SWATCH[item.finish] }} />
                      {rarity?.id ?? '?'}
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PacksScreen() {
  const save = useSave();
  const today = useToday();
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const counter = useRef(0);

  const available = PACKS.filter((pack) => isAvailable(pack, today));
  const waiting = dailyBonusWaiting(save, today);
  const waitingDays = daysWaiting(save, today);

  const claim = () => {
    const amount = gameStore.getState().transact((current) => {
      const result = claimDailyBonus(current, today, Date.now());
      return { save: result.save, value: result.amount };
    });
    setMessage(amount === undefined || amount === 0 ? null : text.packs.daily.got(amount));
  };

  const open = (packId: string, count: number) => {
    // Asking for sound inside the click lets the browser play it later in the show.
    void startAudio();
    setMessage(null);
    const openings: PackOpening[] = [];
    try {
      for (let i = 0; i < count; i += 1) {
        const opening = gameStore.getState().transact((current) => {
          const result = openPack(current, packId, today, Date.now());
          return { save: result.save, value: result };
        });
        if (opening === undefined) {
          break;
        }
        openings.push(opening);
      }
    } catch (error) {
      if (error instanceof PackError) {
        setMessage(text.packs.errors[error.code]);
      } else {
        throw error;
      }
    }
    if (openings.length > 0) {
      counter.current += 1;
      setSession({ id: counter.current, openings });
    }
  };

  return (
    <>
      <PageHeader
        title={text.packs.title}
        subtitle={text.packs.subtitle}
        actions={
          <div className={styles.wallet}>
            <span>{text.packs.yen}</span>
            <strong>{formatYen(save.player.yen)}</strong>
          </div>
        }
      />

      <section className={styles.daily} aria-label={text.packs.daily.title}>
        <div>
          <h2>{text.packs.daily.title}</h2>
          <p>{waiting > 0 ? text.packs.daily.waiting(waitingDays) : text.packs.daily.done}</p>
          <p className={styles.note}>{text.packs.daily.note}</p>
        </div>
        <Button kind="primary" onClick={claim} disabled={waiting === 0}>
          {waiting > 0 ? text.packs.daily.claim(waiting) : text.packs.daily.title}
        </Button>
      </section>
      {message !== null && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      <div className={styles.packs}>
        {[...available].sort((a, b) => Number(b.banner !== undefined) - Number(a.banner !== undefined)).map((pack) => (
          <PackCard key={pack.id} pack={pack} save={save} today={today} onOpen={(count) => open(pack.id, count)} />
        ))}
      </div>

      <History />

      {session !== null && (
        <Suspense fallback={<div className={styles.loading}>{text.pull.preparing}</div>}>
          <PullOverlay
            key={session.id}
            openings={session.openings}
            onClose={() => setSession(null)}
            onAgain={(packId, count) => {
              setSession(null);
              open(packId, count);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
