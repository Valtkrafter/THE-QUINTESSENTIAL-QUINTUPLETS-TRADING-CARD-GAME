// The sound of a battle, made in the browser with Tone.js (no sound files), like the pack show. Short cues for what happens on
// the table: a card is played, a Heart is given, an attack swishes and lands (heavier for more damage, bright for a weakness,
// dull for a resistance, a metal ping when it is blocked), a Character is knocked out, the turn changes, the battle ends.
// Tone.js is loaded only when the first battle starts, so the rest of the game does not carry it.

export type BattleCue =
  | { readonly kind: 'coin' }
  | { readonly kind: 'draw'; readonly count: number }
  | { readonly kind: 'place' }
  | { readonly kind: 'evolve' }
  | { readonly kind: 'heart' }
  | { readonly kind: 'supporter' }
  | { readonly kind: 'ability' }
  | { readonly kind: 'attack'; readonly damage: number; readonly doubled: boolean; readonly resisted: boolean; readonly blocked: boolean }
  | { readonly kind: 'heal' }
  | { readonly kind: 'swap' }
  | { readonly kind: 'stun' }
  | { readonly kind: 'shield' }
  | { readonly kind: 'knock-out'; readonly memories: number }
  | { readonly kind: 'your-turn' }
  | { readonly kind: 'over'; readonly result: 'win' | 'loss' | 'draw' };

export interface BattleAudio {
  /** Plays a cue, `delay` seconds from now (the events of one step are spread out so they do not pile up). */
  play(cue: BattleCue, delay?: number): void;
  /** Volume from 0 to 1 (a gentle curve is applied) and a mute switch. */
  setVolume(volume: number, muted: boolean): void;
  dispose(): void;
}

type ToneLib = typeof import('tone');
interface Disposable {
  dispose(): unknown;
}

/** Heavier damage lands lower and harder. */
function impactNote(damage: number): string {
  if (damage >= 100) {
    return 'C1';
  }
  return damage >= 50 ? 'E1' : 'A1';
}

/** Creates the instrument. Needs a user gesture before the browser lets it make sound (the click that starts the battle). */
export async function createBattleAudio(): Promise<BattleAudio> {
  const Tone: ToneLib = await import('tone');
  await Tone.start();

  const master = new Tone.Gain(0.55);
  const limiter = new Tone.Limiter(-3);
  master.chain(limiter, Tone.getDestination());
  const reverb = new Tone.Reverb({ decay: 1.8, preDelay: 0.01 });
  reverb.wet.value = 1;
  const reverbSend = new Tone.Gain(0.22);
  reverbSend.chain(reverb, master);
  const bus = new Tone.Gain(0.9);
  bus.connect(master);
  bus.connect(reverbSend);
  await reverb.ready;

  const bell = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 10,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.9 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.4 },
  });
  bell.maxPolyphony = 24;
  bell.volume.value = -11;
  bell.connect(bus);

  const pluck = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.12 } });
  pluck.maxPolyphony = 16;
  pluck.volume.value = -14;
  pluck.connect(bus);

  const thump = new Tone.PolySynth(Tone.MembraneSynth, { pitchDecay: 0.06, octaves: 6, envelope: { attack: 0.001, decay: 0.38, sustain: 0, release: 0.3 } });
  thump.maxPolyphony = 8;
  thump.volume.value = -8;
  thump.connect(master);

  const metal = new Tone.PolySynth(Tone.MetalSynth, {
    envelope: { attack: 0.001, decay: 0.5, release: 0.4 },
    harmonicity: 5.1,
    modulationIndex: 28,
    resonance: 4000,
    octaves: 1.4,
  });
  metal.maxPolyphony = 4;
  metal.volume.value = -26;
  metal.connect(bus);

  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 24 },
    envelope: { attack: 0.25, decay: 0.4, sustain: 0.6, release: 1.6 },
  });
  pad.maxPolyphony = 12;
  pad.volume.value = -22;
  const padFilter = new Tone.Filter(1400, 'lowpass');
  pad.chain(padFilter, bus);

  const fall = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.3 } });
  fall.volume.value = -12;
  fall.connect(bus);

  const permanent: Disposable[] = [master, limiter, reverb, reverbSend, bus, bell, pluck, thump, metal, pad, padFilter, fall];

  /** Builds nodes for one cue and frees them a little after it is over. */
  function oneShot(lifetime: number, build: () => readonly Disposable[]): void {
    const nodes = build();
    window.setTimeout(() => {
      for (const node of nodes) {
        node.dispose();
      }
    }, (lifetime + 1) * 1000);
  }

  /** A short burst of filtered noise that sweeps from `from` to `to` Hz: a flick, a swish, a crash. */
  function swish(start: number, seconds: number, from: number, to: number, peak: number, kind: 'pink' | 'white' = 'pink'): void {
    oneShot(seconds, () => {
      const noise = new Tone.Noise(kind);
      const filter = new Tone.Filter({ type: 'bandpass', frequency: from, Q: 0.9 });
      const gain = new Tone.Gain(0);
      noise.chain(filter, gain, bus);
      filter.frequency.setValueAtTime(from, start);
      filter.frequency.exponentialRampToValueAtTime(to, start + seconds);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + seconds * 0.35);
      gain.gain.linearRampToValueAtTime(0, start + seconds);
      noise.start(start).stop(start + seconds + 0.05);
      return [noise, filter, gain];
    });
  }

  function notes(list: readonly string[], start: number, step: number, length: number, velocity: number): void {
    list.forEach((note, index) => {
      bell.triggerAttackRelease(note, length, start + index * step, Math.min(1, velocity * (0.85 + index * 0.05)));
    });
  }

  const raw: BattleAudio = {
    play(cue, delay = 0) {
      const start = Tone.now() + 0.03 + delay;
      switch (cue.kind) {
        case 'coin':
          pluck.triggerAttackRelease('E7', 0.05, start, 0.5);
          pluck.triggerAttackRelease('B6', 0.08, start + 0.07, 0.4);
          break;
        case 'draw':
          for (let index = 0; index < Math.min(cue.count, 3); index += 1) {
            swish(start + index * 0.07, 0.08, 5200, 2400, 0.12);
          }
          break;
        case 'place':
          thump.triggerAttackRelease('G1', 0.12, start, 0.5);
          pluck.triggerAttackRelease('D5', 0.12, start + 0.02, 0.6);
          break;
        case 'evolve':
          notes(['C5', 'E5', 'G5', 'C6'], start, 0.07, 0.4, 0.5);
          swish(start, 0.4, 700, 4200, 0.16);
          bell.triggerAttackRelease('G6', 0.9, start + 0.3, 0.5);
          break;
        case 'heart':
          bell.triggerAttackRelease('E6', 0.5, start, 0.5);
          bell.triggerAttackRelease('B6', 0.4, start + 0.06, 0.4);
          break;
        case 'supporter':
          bell.triggerAttackRelease('A5', 0.5, start, 0.45);
          bell.triggerAttackRelease('E6', 0.6, start + 0.09, 0.5);
          break;
        case 'ability':
          swish(start, 0.28, 900, 3800, 0.14);
          bell.triggerAttackRelease('D6', 0.7, start + 0.12, 0.45);
          break;
        case 'attack': {
          swish(start, 0.16, 500, 3500, 0.26);
          const hit = start + 0.17;
          if (cue.blocked) {
            metal.triggerAttackRelease(900, 0.2, hit, 0.5);
            bell.triggerAttackRelease('B6', 0.3, hit, 0.35);
            break;
          }
          const strength = Math.min(1, 0.45 + cue.damage / 220);
          thump.triggerAttackRelease(impactNote(cue.damage), 0.3, hit, cue.resisted ? strength * 0.6 : strength);
          swish(hit, 0.14 + strength * 0.12, 4200, 600, 0.14 + strength * 0.2, 'white');
          if (cue.doubled) {
            metal.triggerAttackRelease(520, 0.3, hit, 0.6);
            bell.triggerAttackRelease('A6', 0.5, hit + 0.03, 0.5);
          }
          break;
        }
        case 'heal':
          notes(['C6', 'G6', 'E7'], start, 0.08, 0.6, 0.4);
          break;
        case 'swap':
          swish(start, 0.14, 1800, 900, 0.12);
          break;
        case 'stun':
          thump.triggerAttackRelease('F1', 0.3, start, 0.5);
          metal.triggerAttackRelease(300, 0.25, start, 0.5);
          break;
        case 'shield':
          metal.triggerAttackRelease(1200, 0.3, start, 0.5);
          bell.triggerAttackRelease('B6', 0.5, start + 0.02, 0.4);
          break;
        case 'knock-out': {
          thump.triggerAttackRelease('C1', 0.6, start, 0.9);
          swish(start, 1.1, 5000, 160, 0.3, 'white');
          fall.frequency.setValueAtTime(320, start);
          fall.frequency.exponentialRampToValueAtTime(60, start + 0.6);
          fall.triggerAttackRelease(320, 0.6, start, 0.6);
          if (cue.memories >= 2) {
            metal.triggerAttackRelease(420, 0.7, start + 0.05, 0.6);
            notes(['A4', 'F4', 'D4'], start + 0.2, 0.14, 0.9, 0.45);
          }
          break;
        }
        case 'your-turn':
          bell.triggerAttackRelease('E5', 0.5, start, 0.35);
          bell.triggerAttackRelease('A5', 0.7, start + 0.12, 0.4);
          break;
        case 'over':
          if (cue.result === 'win') {
            notes(['C5', 'E5', 'G5', 'C6', 'E6'], start, 0.11, 1.2, 0.55);
            pad.triggerAttackRelease(['C3', 'G3', 'C4', 'E4'], 2.6, start, 0.5);
          } else if (cue.result === 'loss') {
            notes(['A4', 'F4', 'D4', 'A3'], start, 0.2, 1.4, 0.45);
            pad.triggerAttackRelease(['D3', 'A3', 'F4'], 2.6, start, 0.4);
          } else {
            pad.triggerAttackRelease(['C3', 'G3', 'D4'], 2, start, 0.4);
            bell.triggerAttackRelease('G5', 1, start + 0.1, 0.4);
          }
          break;
      }
    },

    setVolume(volume, muted) {
      const level = muted ? 0 : Math.min(1, Math.max(0, volume)) ** 2 * 0.9;
      master.gain.rampTo(level, 0.08);
    },

    dispose() {
      for (const node of permanent) {
        node.dispose();
      }
    },
  };

  // A sound problem must never break a battle, so every cue is guarded.
  return {
    play: (cue, delay) => {
      try {
        raw.play(cue, delay);
      } catch (error) {
        console.warn('A battle sound failed.', error);
      }
    },
    setVolume: (volume, muted) => {
      try {
        raw.setVolume(volume, muted);
      } catch (error) {
        console.warn('The battle volume could not be set.', error);
      }
    },
    dispose: () => {
      try {
        raw.dispose();
      } catch (error) {
        console.warn('The battle sound could not be closed.', error);
      }
    },
  };
}
