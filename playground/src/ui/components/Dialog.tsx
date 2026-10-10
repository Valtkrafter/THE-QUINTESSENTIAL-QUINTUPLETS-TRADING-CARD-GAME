import { useEffect, useId, useRef, type ReactNode } from 'react';
import { text } from '../text';
import { CloseIcon } from './icons';
import styles from './Dialog.module.css';

export interface DialogProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly wide?: boolean;
}

/**
 * A modal window on the browser's own `<dialog>`: it traps focus, closes on Escape and dims the page. It is open
 * while it is mounted, so the parent shows it with `{open && <Dialog …>}`.
 */
export function Dialog({ title, onClose, children, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={ref}
      className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={text.settings.cancel}>
            <CloseIcon size={18} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
