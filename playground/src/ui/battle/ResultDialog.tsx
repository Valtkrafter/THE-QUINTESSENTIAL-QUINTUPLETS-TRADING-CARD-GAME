import { battleSession, useBattle } from '../../state/app';
import { Button } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { text } from '../text';
import styles from './Table.module.css';

/** What the battle was worth, shown when it is over. */
export function ResultDialog() {
  const result = useBattle((state) => state.result);
  const rival = useBattle((state) => state.rival);
  const deck = useBattle((state) => state.deck);
  if (result === null || rival === null) {
    return null;
  }
  const first = rival.name.split(' ')[0] ?? rival.name;
  const copy = text.battle.result;
  const rematch = () => {
    if (deck !== null) {
      battleSession.getState().start(rival, deck);
    }
  };
  return (
    <Dialog title={result.outcome === 'win' ? copy.win : result.outcome === 'loss' ? copy.loss : copy.draw} onClose={() => battleSession.getState().leave()}>
      <div className={styles.result}>
        <p>{copy.why(result.outcome, result.reason, first)}</p>
        <p className={styles.resultStats}>{copy.stats(result.turns, result.memories[0], result.memories[1])}</p>
        {result.payout.yen > 0 ? (
          <div className={styles.payout}>
            <strong>{copy.earned(result.payout.yen)}</strong>
            <span>{copy.breakdown(result.payout.base, result.payout.bonus)}</span>
          </div>
        ) : (
          result.gaveUp && <p className={styles.resultStats}>{copy.nothing}</p>
        )}
        <div className={styles.resultActions}>
          <Button kind="primary" onClick={rematch}>
            {copy.rematch}
          </Button>
          <Button onClick={() => battleSession.getState().leave()}>{copy.back}</Button>
        </div>
      </div>
    </Dialog>
  );
}
