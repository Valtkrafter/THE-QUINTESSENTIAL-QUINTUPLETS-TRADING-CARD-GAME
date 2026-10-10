import type { CSSProperties } from 'react';
import { text } from '../text';
import styles from './PityMeter.module.css';

export interface PityMeterProps {
  readonly label: string;
  /** Packs opened since the last hit. */
  readonly count: number;
  /** The pack on which the hit is certain. */
  readonly guaranteeAt: number;
  /** From this pack on the chance rises (banner only). */
  readonly softFrom?: number;
}

/** A bar that fills as the guarantee comes closer, with the soft zone marked when there is one. */
export function PityMeter({ label, count, guaranteeAt, softFrom }: PityMeterProps) {
  const left = Math.max(0, guaranteeAt - count);
  const fill = Math.min(1, count / guaranteeAt);
  const style = { '--fill': `${fill * 100}%`, '--soft': softFrom === undefined ? '100%' : `${((softFrom - 1) / guaranteeAt) * 100}%` } as CSSProperties;
  const soft = softFrom !== undefined && count + 1 >= softFrom;
  return (
    <div className={styles.meter} style={style}>
      <div className={styles.row}>
        <span>{label}</span>
        <span className={styles.value}>{left <= 1 ? text.packs.pity.next : text.packs.pity.inPacks(left)}</span>
      </div>
      <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={guaranteeAt} aria-valuenow={count} aria-label={label}>
        {softFrom !== undefined && <span className={styles.zone} />}
        <span className={styles.fill} />
      </div>
      <p className={styles.note}>
        {text.packs.pity.count(count, guaranteeAt)}
        {soft && softFrom !== undefined ? ` · ${text.packs.pity.soft(softFrom)}` : ''}
      </p>
    </div>
  );
}
