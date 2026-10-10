import { RARITIES } from '../../cards/model';
import { CHARACTERS } from '../../cards/characters';
import { findFinish } from '../../holo/finishes';
import type { Pull } from '../../packs/openPack';
import { tierOf } from '../../scene/pull/palette';
import { FINISH_SWATCH } from '../finishStyle';
import { cx } from '../format';
import { text } from '../text';
import styles from './NamePlate.module.css';
import { tierStyleOf } from './tierStyle';

/** The name of the card that was just turned over, with its rarity, finish and why it is special. */
export function NamePlate({ pull }: { readonly pull: Pull }) {
  const { card } = pull;
  const rarity = RARITIES.find((entry) => entry.id === card.rarity);
  const finish = findFinish(pull.owned.finish);
  const character = CHARACTERS[card.character];
  const reason = text.pull.reason[pull.reason];
  const tier = tierOf(card.rarity);
  return (
    <div className={cx(styles.plate, tier === 'rainbow' && styles.rainbow)} style={tierStyleOf(card.rarity)} aria-live="polite">
      <span className={styles.streak} aria-hidden="true" />
      <p className={styles.mark}>
        <span>{rarity?.symbol ?? card.rarity}</span>
        <span className={styles.rarity}>{rarity?.label ?? card.rarity}</span>
      </p>
      <h2 className={styles.name}>{card.name.en}</h2>
      <p className={styles.ja}>{character.name.ja}</p>
      <p className={styles.title}>“{card.title}”</p>
      <div className={styles.chips}>
        <span className={cx(styles.chip, pull.isNew ? styles.fresh : styles.dupe)}>{pull.isNew ? text.pull.isNew : text.pull.duplicate}</span>
        <span className={styles.chip}>
          <i className={styles.swatch} style={{ background: FINISH_SWATCH[pull.owned.finish] }} />
          {finish.label}
        </span>
        {reason !== '' && <span className={cx(styles.chip, styles.reason)}>{reason}</span>}
      </div>
    </div>
  );
}
