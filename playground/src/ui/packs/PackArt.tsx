import type { CSSProperties } from 'react';
import styles from './PackArt.module.css';

export type PackArtKind = 'booster' | 'halloween';

const LABELS: Readonly<Record<PackArtKind, { readonly top: string; readonly bottom: string }>> = {
  booster: { top: 'TQQ01', bottom: 'BOOSTER' },
  halloween: { top: 'HALLOWEEN', bottom: 'WISH' },
};

const HEARTS = ['var(--affinity-heart)', 'var(--affinity-butterfly)', 'var(--affinity-melody)', 'var(--affinity-clover)', 'var(--affinity-star)'];

/** A foil pack drawn with CSS: crimped ends, a shine that sweeps over it, the five Heart colours as its emblem. */
export function PackArt({ kind }: { readonly kind: PackArtKind }) {
  const label = LABELS[kind];
  return (
    <div className={kind === 'halloween' ? `${styles.pack} ${styles.halloween}` : styles.pack} aria-hidden="true">
      <span className={styles.crimpTop} />
      <div className={styles.body}>
        {kind === 'halloween' && <span className={styles.moon} />}
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
