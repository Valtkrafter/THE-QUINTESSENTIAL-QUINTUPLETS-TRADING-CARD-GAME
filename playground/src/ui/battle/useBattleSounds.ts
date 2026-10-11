import { useEffect, useRef, useState } from 'react';
import type { BattleAudio } from '../../audio/battleAudio';
import { usePreferences } from '../../state/app';
import type { FlashState } from '../../state/battleSession';
import { cuesFor } from './sounds';

let pending: Promise<BattleAudio | null> | null = null;

/** Loads the battle sound (once). Tone.js comes in only now; a browser that refuses simply gives a silent battle. */
function startBattleAudio(): Promise<BattleAudio | null> {
  if (pending === null) {
    pending = import('../../audio/battleAudio')
      .then((module) => module.createBattleAudio())
      .catch((error: unknown) => {
        console.warn('The battle sound could not be started.', error);
        pending = null;
        return null;
      });
  }
  return pending;
}

/** The sound of the battle once it is ready, or null while it loads or when it is not available. Follows the volume setting. */
function useBattleAudio(): BattleAudio | null {
  const [audio, setAudio] = useState<BattleAudio | null>(null);
  const { volume, muted } = usePreferences();

  useEffect(() => {
    let alive = true;
    void startBattleAudio().then((started) => {
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

/** Plays the sounds of every step of the battle as it happens (the same steps that make the floating numbers). */
export function useBattleSounds(flash: FlashState): void {
  const audio = useBattleAudio();
  const played = useRef(0);

  useEffect(() => {
    // A sound that was not ready in time for its step is dropped: heard late, it would only confuse.
    if (audio === null || flash.tick === 0 || played.current === flash.tick) {
      return;
    }
    played.current = flash.tick;
    for (const { cue, delay } of cuesFor(flash.events)) {
      audio.play(cue, delay);
    }
  }, [audio, flash]);
}
