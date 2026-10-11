import type { CSSProperties } from 'react';
import type { PackArtKind } from '../../packs/schema';
import styles from './PackArt.module.css';

export type { PackArtKind };

const LABELS: Readonly<Record<PackArtKind, { readonly top: string; readonly bottom: string }>> = {
  booster: { top: 'TQQ01', bottom: 'BOOSTER' },
  select: { top: 'TQQ01', bottom: 'SELECT' },
  premium: { top: 'TQQ01', bottom: 'PREMIUM' },
  halloween: { top: 'HALLOWEEN', bottom: 'WISH' },
};

const HEARTS = ['var(--affinity-heart)', 'var(--affinity-butterfly)', 'var(--affinity-melody)', 'var(--affinity-clover)', 'var(--affinity-star)'];

export interface PackArtProps {
  readonly kind: PackArtKind;
  /** Stands still: no sweeping shine, no twinkling, no tilt. */
  readonly still?: boolean;
}

/**
 * A foil pack drawn with CSS: crimped ends, a shine that sweeps over it, the five Heart colours as its emblem. Its size comes
 * from the width of its container (every length is in container units), so the same drawing works on a shelf and on the
 * opening screen. Each kind has its own colours and emblem, so the packs can be told apart at a glance.
 */
export function PackArt({ kind, still = false }: PackArtProps) {
  const label = LABELS[kind];
  const classes = [styles.pack, styles[kind], still ? styles.still : ''].filter(Boolean).join(' ');
  return (
    <div className={classes} aria-hidden="true">
      <span className={styles.crimpTop} />
      <div className={styles.body}>
        {kind === 'halloween' && <span className={styles.moon} />}
        {kind === 'premium' && <span className={styles.crown} />}
        {kind === 'select' && <span className={styles.ring} />}
        <div className={styles.hearts}>
          {HEARTS.map((color, index) => (
            <i key={color} style={{ '--heart': color, '--i': index } as CSSProperties} />
          ))}
        </div>
        <strong className={styles.top}>{label.top}</strong>
        <span className={styles.bottom}>{label.bottom}</span>
        <span className={styles.shine} />
      </div>
      <span className={styles.crimpBottom} />
    </div>
  );
}
