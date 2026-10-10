import { useEffect, useState } from 'react';
import type { PullAudio } from '../../audio/pullAudio';
import { usePreferences } from '../../state/app';
import { startAudio } from './audioSession';

/** The sound of the show once it is ready, or null while it loads or when it is not available. Follows the volume setting. */
export function usePullAudio(): PullAudio | null {
  const [audio, setAudio] = useState<PullAudio | null>(null);
  const { volume, muted } = usePreferences();

  useEffect(() => {
    let alive = true;
    void startAudio().then((started) => {
      if (alive) {
        setAudio(started);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    audio?.setVolume(volume, muted);
  }, [audio, volume, muted]);

  return audio;
}
