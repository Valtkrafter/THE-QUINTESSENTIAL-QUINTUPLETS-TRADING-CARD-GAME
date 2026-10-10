import type { PullAudio } from '../../audio/pullAudio';

let pending: Promise<PullAudio | null> | null = null;

async function load(): Promise<PullAudio | null> {
  try {
    const module = await import('../../audio/pullAudio');
    return await module.createPullAudio();
  } catch (error) {
    console.warn('The pull sound could not be started.', error);
    return null;
  }
}

/**
 * Starts the sound (once). Call it straight from a click, because browsers only let a page make sound after the player
 * has touched it. Resolves to null when the sound is not available; the show then simply runs without it.
 */
export function startAudio(): Promise<PullAudio | null> {
  if (pending === null) {
    pending = load().then((audio) => {
      if (audio === null) {
        pending = null;
      }
      return audio;
    });
  }
  return pending;
}
