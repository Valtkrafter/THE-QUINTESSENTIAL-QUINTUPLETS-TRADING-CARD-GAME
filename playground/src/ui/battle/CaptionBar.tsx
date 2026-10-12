// The line under the table: one sentence that says what to do now, the buttons that belong to it, and the menu.

import type { ReactNode } from 'react';
import { MenuIcon } from '../components/icons';
import { text } from '../text';
import type { Caption } from './coach';
import styles from './Table.module.css';

export interface CaptionBarProps {
  readonly caption: Caption;
  readonly actions: ReactNode;
  readonly onMenu: () => void;
}

export function CaptionBar({ caption, actions, onMenu }: CaptionBarProps) {
  return (
    <footer className={styles.caption}>
      <button type="button" className={styles.menuButton} onClick={onMenu}>
        <MenuIcon size={16} />
        {text.battle.table.menu}
      </button>
      <div className={styles.captionText} data-tone={caption.tone} aria-live="polite">
        <strong>{caption.title}</strong>
        {caption.text !== '' && <p>{caption.text}</p>}
      </div>
      <div className={styles.captionActions}>{actions}</div>
    </footer>
  );
}
