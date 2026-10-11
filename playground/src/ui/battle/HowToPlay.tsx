import { Button } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { text } from '../text';
import styles from './Lobby.module.css';

/** The rules of a battle in plain words, in a window that can be opened from the lobby and from the board. */
export function HowToPlay({ onClose }: { readonly onClose: () => void }) {
  const { title, sections, close } = text.battle.howToPlay;
  return (
    <Dialog title={title} onClose={onClose} wide>
      <div className={styles.howTo}>
        {sections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            {section.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        ))}
        <div>
          <Button kind="primary" onClick={onClose}>
            {close}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
