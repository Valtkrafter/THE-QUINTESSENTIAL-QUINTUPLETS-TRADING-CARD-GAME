import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cardById, SET_CODE, SET_SIZE } from '../../cards/catalog';
import { AFFINITY_INFO, CHARACTERS } from '../../cards/characters';
import { RARITIES } from '../../cards/model';
import { sortCollection } from '../../domain/collection';
import { SHOWCASE_SLOTS, withShowcase } from '../../domain/save';
import { findFinish } from '../../holo/finishes';
import { DEFAULT_SETTINGS, type HoloSettings } from '../../holo/settings';
import { CardViewer } from '../../scene/CardViewer';
import { gameStore, usePreferences, useSave } from '../../state/app';
import { MAX_PIXEL_RATIO } from '../../state/preferences';
import { CardFace } from '../components/CardFace';
import { Button, Pill } from '../components/controls';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ArrowLeftIcon, FlipIcon, SparkleIcon } from '../components/icons';
import { EmptyState } from '../components/PageHeader';
import { FINISH_SWATCH } from '../finishStyle';
import { formatCardNumber, formatDate } from '../format';
import { text } from '../text';
import styles from './InspectScreen.module.css';

function goBack(navigate: (to: string) => void): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate('/');
  }
}

export default function InspectScreen({ uid }: { readonly uid: string }) {
  const save = useSave();
  const preferences = usePreferences();
  const [, navigate] = useLocation();
  const [flipRequest, setFlipRequest] = useState(0);
  const [ready, setReady] = useState(false);

  const copy = save.collection.find((owned) => owned.uid === uid);
  const card = copy === undefined ? undefined : cardById(copy.cardId);

  const order = useMemo(() => sortCollection(save.collection, 'number'), [save.collection]);
  const index = order.findIndex((owned) => owned.uid === uid);
  const previous = index > 0 ? order[index - 1] : undefined;
  const next = index >= 0 ? order[index + 1] : undefined;

  const settings = useMemo<HoloSettings>(
    () => ({ ...DEFAULT_SETTINGS, frameStyle: preferences.frameStyle, idleMotion: preferences.idleMotion }),
    [preferences.frameStyle, preferences.idleMotion],
  );

  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) {
        return;
      }
      if (event.key === 'ArrowLeft' && previous !== undefined) {
        navigate(`/card/${previous.uid}`, { replace: true });
      } else if (event.key === 'ArrowRight' && next !== undefined) {
        navigate(`/card/${next.uid}`, { replace: true });
      } else if (event.key === 'Escape') {
        goBack(navigate);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previous, next, navigate]);

  if (copy === undefined || card === undefined) {
    return (
      <EmptyState title={text.inspect.missing}>
        <Link href="/">{text.inspect.back}</Link>
      </EmptyState>
    );
  }

  const finish = findFinish(copy.finish);
  const rarity = RARITIES.find((entry) => entry.id === card.rarity);
  const character = CHARACTERS[card.character];
  const onShowcase = save.showcase.includes(copy.uid);
  const showcaseFull = !onShowcase && save.showcase.length >= SHOWCASE_SLOTS;

  const toggleShowcase = () => {
    gameStore.getState().change((current) =>
      withShowcase(current, onShowcase ? current.showcase.filter((entry) => entry !== copy.uid) : [...current.showcase, copy.uid], Date.now()),
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <button type="button" className={styles.back} onClick={() => goBack(navigate)}>
          <ArrowLeftIcon size={18} />
          {text.inspect.back}
        </button>
        <div className={styles.viewer}>
          <ErrorBoundary
            key={`${copy.uid}:${preferences.graphics}`}
            fallback={() => (
              <div className={styles.flat}>
                <div className={styles.flatCard}>
                  <CardFace card={card} finish={copy.finish} interactive={false} live={false} />
                </div>
                <p>{text.inspect.noWebgl}</p>
              </div>
            )}
          >
            <CardViewer
              card={card}
              finishId={copy.finish}
              settings={settings}
              maxPixelRatio={MAX_PIXEL_RATIO[preferences.graphics]}
              flipRequest={flipRequest}
              condition={copy.condition}
              wearKey={copy.uid}
              onReady={markReady}
            />
          </ErrorBoundary>
          {!ready && <p className={styles.preparing}>{text.inspect.preparing}</p>}
        </div>
        <p className={styles.hint}>{text.inspect.hint}</p>
        <div className={styles.steps}>
          {previous !== undefined ? <Link href={`/card/${previous.uid}`} replace aria-label="←" className={styles.step}>‹</Link> : <span />}
          {next !== undefined ? <Link href={`/card/${next.uid}`} replace aria-label="→" className={styles.step}>›</Link> : <span />}
        </div>
      </div>

      <aside className={styles.info}>
        <p className={styles.eyebrow}>
          {SET_CODE} · {formatCardNumber(card.number, SET_SIZE)}
        </p>
        <h1>{card.name.en}</h1>
        <p className={styles.ja}>{card.name.ja}</p>
        <p className={styles.title}>“{card.title}”</p>

        <div className={styles.pills}>
          <Pill>
            {card.rarity} · {rarity?.label ?? card.rarity}
          </Pill>
          <Pill>
            <i className={styles.swatch} style={{ background: FINISH_SWATCH[copy.finish] }} />
            {finish.label}
          </Pill>
          {card.kind === 'character' ? (
            <>
              <Pill>{text.inspect.stage[card.stage]}</Pill>
              {card.prime && <Pill>{text.inspect.prime}</Pill>}
              {card.limited !== undefined && <Pill>{text.inspect.limited}</Pill>}
            </>
          ) : (
            <Pill>{text.inspect.supporter}</Pill>
          )}
        </div>

        <dl className={styles.facts}>
          {card.kind === 'character' && (
            <div>
              <dt>{text.inspect.hp}</dt>
              <dd>
                {card.hp} · {AFFINITY_INFO[card.affinity].label}
              </dd>
            </div>
          )}
          <div>
            <dt>{text.inspect.character}</dt>
            <dd>{character.name.en}</dd>
          </div>
          <div>
            <dt>{text.inspect.copy}</dt>
            <dd>{text.inspect.copyValue(copy.serial)}</dd>
          </div>
          <div>
            <dt>{text.inspect.finish}</dt>
            <dd>{finish.description}</dd>
          </div>
          <div>
            <dt>{text.inspect.obtained}</dt>
            <dd>
              {formatDate(copy.obtained.at)} · {text.inspect.obtainedVia[copy.obtained.source]}
            </dd>
          </div>
          <div>
            <dt>{text.inspect.condition}</dt>
            <dd className={styles.muted}>{text.inspect.conditionUnknown}</dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <Button onClick={() => setFlipRequest((count) => count + 1)}>
            <FlipIcon size={16} />
            {text.inspect.flip}
          </Button>
          <Button kind={onShowcase ? 'default' : 'primary'} onClick={toggleShowcase} disabled={showcaseFull} title={showcaseFull ? text.inspect.showcaseFull : undefined}>
            <SparkleIcon size={16} />
            {onShowcase ? text.inspect.removeFromShowcase : text.inspect.addToShowcase}
          </Button>
        </div>
      </aside>
    </div>
  );
}
