import { useEffect, useState } from 'react';
import { ensureCardFonts } from '../../cardface/fonts';
import { requestThumbnail } from '../../cardface/thumbnails';
import { loadImage } from '../../cardface/images';
import { artUrlFor } from '../../cards/characterArt';
import type { ScenePack } from '../../scene/pull/types';
import { usePreferences } from '../../state/app';

const GIVE_UP_AFTER_MS = 2500;

/**
 * Loads the pictures and fonts of every card of the show before it starts, so no card ever pops in late. Gives up waiting
 * after a couple of seconds and lets the show begin anyway.
 */
export function usePrepared(packs: readonly ScenePack[]): boolean {
  const [prepared, setPrepared] = useState(false);
  const { frameStyle } = usePreferences();

  // The small pictures for the tray and the summary are painted in the background while the cinematic plays.
  useEffect(() => {
    for (const pack of packs) {
      for (const pull of pack.pulls) {
        void requestThumbnail(pull.card, frameStyle).catch(() => null);
      }
    }
  }, [packs, frameStyle]);

  useEffect(() => {
    let alive = true;
    const jobs = packs.flatMap((pack) =>
      pack.pulls.map((pull) => {
        const url = artUrlFor(pull.card.art);
        return Promise.all([url === null ? Promise.resolve(null) : loadImage(url), ensureCardFonts(pull.card)]);
      }),
    );
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, GIVE_UP_AFTER_MS));
    void Promise.race([Promise.all(jobs).then(() => undefined), timeout]).then(() => {
      if (alive) {
        setPrepared(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [packs]);

  return prepared;
}
