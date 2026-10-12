import { Button } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { text } from '../text';
import styles from './Lobby.module.css';

/**
 * The rules of a battle in plain words, in a window that can be opened from the lobby and from the table. When the opener can
 * show the animated explanation, the window offers it first: watching one turn is quicker than reading the rules.
 */
export function HowToPlay({ onClose, onWatch }: { readonly onClose: () => void; readonly onWatch?: () => void }) {
  const { title, sections, close, watch } = text.battle.howToPlay;
  return (
    <Dialog title={title} onClose={onClose} wide>
      <div className={styles.howTo}>
        {onWatch !== undefined && (
          <div className={styles.watchRow}>
            <Button kind="primary" onClick={onWatch}>
              {watch}
            </Button>
            <span>{text.battle.explainer.newHereText}</span>
          </div>
        )}
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
