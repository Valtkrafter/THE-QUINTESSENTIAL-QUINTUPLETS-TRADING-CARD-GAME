// A development tool: plays the pack show with made-up cards, so each rarity's show can be watched without waiting for
// luck. Nothing is bought and nothing is saved. Only the development build shows it.

import { lazy, Suspense, useRef, useState } from 'react';
import type { Rarity } from '../../cards/model';
import { RARITIES } from '../../cards/model';
import { createRng } from '../../domain/random';
import { useSave } from '../../state/app';
import { packById } from '../../packs/catalog';
import { pickFinish } from '../../packs/finishWeights';
import type { PackOpening, Pull } from '../../packs/openPack';
import { normalPool } from '../../packs/rollPack';
import { Button } from '../components/controls';
import { text } from '../text';
import styles from './SimulatorPanel.module.css';

const PullOverlay = lazy(() => import('../pull/PullOverlay'));

/** Five cards, four ordinary ones and the best card the show should celebrate. */
function previewPulls(best: Rarity, seed: string): readonly Pull[] {
  const rng = createRng(seed);
  const filler: Rarity[] = best === 'C' ? ['C', 'C', 'U', 'C'] : best === 'U' ? ['C', 'U', 'C', 'U'] : ['C', 'U', 'C', 'R'];
  return [...filler, best].map((rarity, slot) => {
    const card = rng.pick(normalPool(rarity));
    const finish = pickFinish(rarity, () => rng.next());
    return {
      slot,
      card,
      isNew: slot % 2 === 0,
      reason: 'normal',
      owned: {
        uid: `preview-${slot}`,
        cardId: card.id,
        finish,
        condition: { centering: 9, corners: 9, edges: 9, surface: 9 },
        serial: 1,
        obtained: { source: 'pack', at: 0 },
        grade: null,
      },
    } satisfies Pull;
  });
}

export function ShowPreview() {
  const save = useSave();
  const pack = packById('booster');
  const [opening, setOpening] = useState<PackOpening | null>(null);
  const runs = useRef(0);

  if (pack === undefined) {
    return null;
  }
  const play = (best: Rarity) => {
    runs.current += 1;
    setOpening({ save, pack, pulls: previewPulls(best, `preview-${best}-${runs.current}`) });
  };

  return (
    <div className={styles.panel}>
      <h3>{text.settings.showPreview}</h3>
      <p className={styles.hint}>{text.settings.showPreviewHint}</p>
      <div className={styles.buttons}>
        {RARITIES.map((rarity) => (
          <Button key={rarity.id} onClick={() => play(rarity.id)}>
            {rarity.id}
          </Button>
        ))}
      </div>
      {opening !== null && (
        <Suspense fallback={null}>
          <PullOverlay openings={[opening]} preview onClose={() => setOpening(null)} onAgain={() => setOpening(null)} />
        </Suspense>
      )}
    </div>
  );
}
