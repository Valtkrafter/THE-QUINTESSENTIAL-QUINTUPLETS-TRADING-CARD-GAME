import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        <h1>{title}</h1>
        {subtitle !== undefined && <p>{subtitle}</p>}
      </div>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

/** Centred message for a screen with nothing to show yet. */
export function EmptyState({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
