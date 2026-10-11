import { Button } from './components/controls';
import { text } from './text';
import styles from './StaleScreen.module.css';

/**
 * Shown when another window of the game on this device saved a game after this one was opened. This window holds an older
 * game, and saving it would throw the newer one away, so it stops and waits for a reload.
 */
export default function StaleScreen() {
  return (
    <main className={styles.page} tabIndex={-1}>
      <section className={styles.card} role="alert">
        <h1>{text.stale.title}</h1>
        <p>{text.stale.body}</p>
        <div className={styles.actions}>
          <Button kind="primary" onClick={() => window.location.reload()}>
            {text.stale.reload}
          </Button>
        </div>
      </section>
    </main>
  );
}
