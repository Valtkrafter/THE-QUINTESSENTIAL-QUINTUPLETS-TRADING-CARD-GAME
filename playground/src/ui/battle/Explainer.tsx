import { useState, type SyntheticEvent } from 'react';
import { Dialog } from '../components/Dialog';
import { text } from '../text';
import styles from './Lobby.module.css';

const PAGE = `${import.meta.env.BASE_URL}battle-demo.html`;

/** Is the page of the animation really in the frame? A browser that blocks the frame shows its own error page there instead. */
function showsAnimation(event: SyntheticEvent<HTMLIFrameElement>): boolean {
  try {
    return event.currentTarget.contentDocument?.getElementById('stage') != null;
  } catch {
    return false;
  }
}

/**
 * The animated explanation of a turn, in a window. It is a small page of our own (`public/battle-demo.html`) that plays the
 * scenes one after the other, with buttons to pause, go back and skip. If a browser refuses to show the frame, the window says so
 * and offers the page in a tab of its own.
 */
export function Explainer({ onClose }: { readonly onClose: () => void }) {
  const words = text.battle.explainer;
  const [failed, setFailed] = useState(false);
  return (
    <Dialog title={words.title} onClose={onClose} wide>
      <div className={styles.explainer} data-tutorial="explainer">
        <iframe className={styles.explainerFrame} src={PAGE} title={words.frameTitle} onLoad={(event) => setFailed(!showsAnimation(event))} />
        {failed ? (
          <p className={styles.explainerNote} role="alert">
            {words.failed}{' '}
            <a href={PAGE} target="_blank" rel="noreferrer">
              {words.openInTab}
            </a>
          </p>
        ) : (
          <p className={styles.explainerNote}>{words.note}</p>
        )}
      </div>
    </Dialog>
  );
}
