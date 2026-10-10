import { useState } from 'react';
import { gameStore, useGame } from '../state/app';
import { Button } from './components/controls';
import { downloadText } from './download';
import { text } from './text';
import styles from './DamagedScreen.module.css';

/** Shown when a stored game exists but cannot be read. Nothing is overwritten until the player decides. */
export default function DamagedScreen() {
  const problem = useGame((state) => state.problem);
  const [confirming, setConfirming] = useState(false);

  const saveCopy = () => {
    void gameStore
      .getState()
      .damagedText()
      .then((content) => {
        if (content !== null) {
          downloadText('tqq-save-damaged.json', content);
        }
      });
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>{text.damaged.title}</h1>
        <p>{text.damaged.body}</p>
        {problem !== null && (
          <p className={styles.reason}>
            <strong>{text.damaged.reason}:</strong> {text.saveErrors[problem]}
          </p>
        )}
        <div className={styles.actions}>
          <Button onClick={saveCopy}>{text.damaged.download}</Button>
          {confirming ? (
            <>
              <Button kind="quiet" onClick={() => setConfirming(false)}>
                {text.damaged.cancel}
              </Button>
              <Button kind="danger" onClick={() => void gameStore.getState().startOver()}>
                {text.damaged.confirmYes}
              </Button>
            </>
          ) : (
            <Button kind="danger" onClick={() => setConfirming(true)}>
              {text.damaged.startOver}
            </Button>
          )}
        </div>
        {confirming && <p className={styles.warning}>{text.damaged.confirm}</p>}
      </section>
    </main>
  );
}
