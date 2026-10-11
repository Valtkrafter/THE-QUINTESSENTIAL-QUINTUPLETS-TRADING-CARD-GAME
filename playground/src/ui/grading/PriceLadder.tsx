import type { FinishId } from '../../cards/finish';
import type { Rarity } from '../../cards/model';
import { gradeBand, gradeLabel, gradeLadder } from '../../domain/grading';
import { sellPrice } from '../../domain/prices';
import { cx, formatYen } from '../format';
import { text } from '../text';
import { bandStyle } from './bandStyle';
import styles from './PriceLadder.module.css';

/** What a card is worth at every score, next to what it is worth loose. Shown before a card is sent in, so nobody pays blind. */
export function PriceLadder({ rarity, finish }: { readonly rarity: Rarity; readonly finish: FinishId }) {
  const loose = sellPrice(rarity, finish);
  return (
    <table className={styles.ladder}>
      <caption>{text.grading.send.ladderTitle}</caption>
      <tbody>
        <tr className={styles.loose}>
          <th scope="row">{text.grading.send.ladderLoose}</th>
          <td>{formatYen(loose)}</td>
        </tr>
        {gradeLadder(rarity, finish).map((row) => (
          <tr key={row.score} className={cx(row.yen < loose && styles.below)} style={bandStyle(gradeBand(row.score).id)}>
            <th scope="row">
              <i className={styles.dot} aria-hidden="true" />
              <strong>{text.grading.send.ladderScore(row.score)}</strong>
              <span>{gradeLabel(row.score)}</span>
            </th>
            <td>{formatYen(row.yen)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2}>{text.grading.send.ladderNote}</td>
        </tr>
      </tfoot>
    </table>
  );
}
