import { useMemo } from 'react';
import { cardById } from '../../cards/catalog';
import type { OwnedCard } from '../../domain/ownership';
import { CardFace } from '../components/CardFace';
import { bandStyle } from './bandStyle';
import { slabLabelInfo } from './slabInfo';
import { useSlabLabelUrl } from './useSlabLabelUrl';
import styles from './SlabFlat.module.css';

/** A graded copy as a flat picture of its slab: the paper label on top of the card, in a clear case. For screens without 3D. */
export function SlabFlat({ copy }: { readonly copy: OwnedCard }) {
  const info = useMemo(() => slabLabelInfo(copy), [copy]);
  const url = useSlabLabelUrl(info);
  const card = cardById(copy.cardId);
  if (card === undefined || info === null) {
    return null;
  }
  return (
    <div className={styles.slab} style={bandStyle(info.band)}>
      <div className={styles.case}>
        {url === null ? <span className={styles.wait} /> : <img className={styles.label} src={url} alt={`${info.name}, score ${info.score}, ${info.bandLabel}`} draggable={false} />}
        <div className={styles.window}>
          <CardFace card={card} finish={copy.finish} interactive={false} live={false} />
        </div>
        <span className={styles.shell} aria-hidden="true" />
      </div>
    </div>
  );
}
