import { Dialog } from '../components/Dialog';
import { text } from '../text';
import styles from './Lobby.module.css';

/**
 * The animated explanation of a turn, in a window. It is a small page of its own (`public/battle-demo.html`) that plays the
 * scenes one after the other, with buttons to pause, go back and skip. It runs in a frame that may only run its own script.
 */
export function Explainer({ onClose }: { readonly onClose: () => void }) {
  const words = text.battle.explainer;
  return (
    <Dialog title={words.title} onClose={onClose} wide>
      <div className={styles.explainer}>
        <iframe className={styles.explainerFrame} src={`${import.meta.env.BASE_URL}battle-demo.html`} title={words.frameTitle} sandbox="allow-scripts" />
        <p className={styles.explainerNote}>{words.note}</p>
      </div>
    </Dialog>
  );
}
