import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'wouter';
import { CATALOG } from '../../cards/catalog';
import { FRAME_STYLE_IDS, type FrameStyle } from '../../cards/frameStyle';
import { SaveError, parseSave, serializeSave, type SaveGame } from '../../domain/save';
import { gameStore, KNOWN_CARD_IDS, preferencesStore, usePreferences, useSave } from '../../state/app';
import { grantRandomCards, grantWholeSet } from '../../state/devGrants';
import { GRAPHICS_LEVELS, type GraphicsLevel } from '../../state/preferences';
import { CardFace } from '../components/CardFace';
import { Button, Segmented, Toggle } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { PageHeader } from '../components/PageHeader';
import { downloadText, saveFileName } from '../download';
import { cx } from '../format';
import { text } from '../text';
import styles from './SettingsScreen.module.css';

/** A card that looks good in every frame, to show what each frame style is like. */
const SAMPLE_CARD = CATALOG.find((card) => card.rarity === 'SAR') ?? CATALOG[0];

type Confirm = { readonly kind: 'reset' } | { readonly kind: 'import'; readonly save: SaveGame } | null;

function FrameChoice({ style, chosen, onChoose }: { readonly style: FrameStyle; readonly chosen: boolean; readonly onChoose: () => void }) {
  return (
    <button type="button" className={cx(styles.frame, chosen && styles.chosen)} aria-pressed={chosen} onClick={onChoose}>
      <span className={styles.preview}>
        {SAMPLE_CARD !== undefined && <CardFace card={SAMPLE_CARD} finish="standard" interactive={false} frameStyle={style} />}
      </span>
      <span>{text.settings.frameNames[style]}</span>
    </button>
  );
}

export default function SettingsScreen() {
  const save = useSave();
  const preferences = usePreferences();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const graphicsOptions = GRAPHICS_LEVELS.map((value: GraphicsLevel) => ({ value, label: text.settings.graphicsNames[value] }));

  const exportSave = () => {
    downloadText(saveFileName(new Date()), serializeSave(save));
  };

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) {
      return;
    }
    setMessage(null);
    file.text().then(
      (content) => {
        try {
          setConfirm({ kind: 'import', save: parseSave(content, KNOWN_CARD_IDS) });
        } catch (error) {
          setMessage(`${text.settings.importFailed}: ${error instanceof SaveError ? error.message : String(error)}`);
        }
      },
      () => setMessage(text.settings.importFailed),
    );
  };

  const grant = (change: (current: SaveGame, now: number) => SaveGame, count: number) => {
    gameStore.getState().change((current) => change(current, Date.now()));
    setMessage(text.settings.granted(count));
  };

  return (
    <>
      <PageHeader title={text.settings.title} />
      <div className={styles.sections}>
        <section className={styles.section}>
          <h2>{text.settings.look}</h2>
          <div className={styles.block}>
            <h3>{text.settings.frame}</h3>
            <p className={styles.hint}>{text.settings.frameHint}</p>
            <div className={styles.frames}>
              {FRAME_STYLE_IDS.map((style) => (
                <FrameChoice key={style} style={style} chosen={preferences.frameStyle === style} onChoose={() => preferencesStore.getState().update({ frameStyle: style })} />
              ))}
            </div>
          </div>
          <div className={styles.block}>
            <h3>{text.settings.graphics}</h3>
            <p className={styles.hint}>{text.settings.graphicsHint}</p>
            <Segmented
              value={preferences.graphics}
              options={graphicsOptions}
              onChange={(graphics) => preferencesStore.getState().update({ graphics })}
              label={text.settings.graphics}
            />
          </div>
          <div className={styles.block}>
            <Toggle checked={preferences.idleMotion} onChange={(idleMotion) => preferencesStore.getState().update({ idleMotion })}>
              {text.settings.idleMotion}
            </Toggle>
          </div>
        </section>

        <section className={styles.section}>
          <h2>{text.settings.saveGame}</h2>
          <p className={styles.hint}>{text.settings.saveHint}</p>
          <div className={styles.row}>
            <Button onClick={exportSave}>{text.settings.export}</Button>
            <Button onClick={() => fileInput.current?.click()}>{text.settings.import}</Button>
            <Button kind="danger" onClick={() => setConfirm({ kind: 'reset' })}>
              {text.settings.reset}
            </Button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={readFile} />
          </div>
          {message !== null && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}
        </section>

        {import.meta.env.DEV && (
          <section className={styles.section}>
            <h2>{text.settings.developer}</h2>
            <p className={styles.hint}>{text.settings.developerHint}</p>
            <div className={styles.row}>
              <Button onClick={() => grant((current, now) => grantRandomCards(current, 12, now), 12)}>{text.settings.grantRandom}</Button>
              <Button onClick={() => grant(grantWholeSet, CATALOG.length)}>{text.settings.grantSet}</Button>
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2>{text.settings.about}</h2>
          <p className={styles.hint}>{text.settings.aboutBody}</p>
          <div className={styles.row}>
            <Link href="/lab" className={styles.link}>
              {text.settings.lab}
            </Link>
          </div>
        </section>
      </div>

      {confirm?.kind === 'reset' && (
        <Dialog title={text.settings.reset} onClose={() => setConfirm(null)}>
          <p className={styles.dialogText}>{text.settings.resetConfirm}</p>
          <div className={styles.dialogActions}>
            <Button kind="quiet" onClick={() => setConfirm(null)}>
              {text.settings.cancel}
            </Button>
            <Button
              kind="danger"
              onClick={() => {
                setConfirm(null);
                void gameStore.getState().startOver();
              }}
            >
              {text.settings.resetYes}
            </Button>
          </div>
        </Dialog>
      )}
      {confirm?.kind === 'import' && (
        <Dialog title={text.settings.import} onClose={() => setConfirm(null)}>
          <p className={styles.dialogText}>{text.settings.importConfirm(confirm.save.collection.length, confirm.save.player.yen)}</p>
          <div className={styles.dialogActions}>
            <Button kind="quiet" onClick={() => setConfirm(null)}>
              {text.settings.cancel}
            </Button>
            <Button
              kind="primary"
              onClick={() => {
                gameStore.getState().replace(confirm.save);
                setConfirm(null);
              }}
            >
              {text.settings.importYes}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
