// The sound of the pull show, made in the browser with Tone.js (no sound files). Every cue is built from a few layers:
// a riser for the flight, a deep hit with a crash for the impact, a bell arpeggio that grows with the rarity for each
// reveal. Tone.js is loaded only when the first pack is opened, so the rest of the game does not carry it.

import type { Rarity } from '../cards/model';

/** The colour family of a rarity (the same five as the light show), as far as the sound is concerned. */
export type SoundTier = 'blue' | 'violet' | 'rose' | 'gold' | 'rainbow';

export interface FlightCue {
  readonly seconds: number;
  readonly tier: SoundTier;
  /** True when the five threads weave in: the star hangs in the air before it plunges. */
  readonly threads: boolean;
}

export interface PullAudio {
  flight(cue: FlightCue): void;
  impact(tier: SoundTier): void;
  /** A card starts to turn over. */
  flip(tier: SoundTier, flipSeconds: number): void;
  /** The card is face up: the chime that grows with the rarity. */
  reveal(rarity: Rarity, tier: SoundTier, isNew: boolean): void;
  tap(): void;
  summary(): void;
  /** Cuts the sound of the flight, for example when the player skips it. */
  stop(): void;
  /** Volume from 0 to 1 (a gentle curve is applied) and a mute switch. */
  setVolume(volume: number, muted: boolean): void;
  dispose(): void;
}

type ToneLib = typeof import('tone');
type ToneGain = InstanceType<ToneLib['Gain']>;
interface Disposable {
  dispose(): unknown;
}

const CHORD: Readonly<Record<SoundTier, readonly string[]>> = {
  blue: ['A3', 'E4', 'B4'],
  violet: ['C4', 'G4', 'D5'],
  rose: ['D4', 'A4', 'E5', 'F#5'],
  gold: ['E3', 'B3', 'E4', 'G#4', 'B4', 'F#5'],
  rainbow: ['G3', 'D4', 'G4', 'B4', 'D5', 'A5'],
};

const ARPEGGIO: Readonly<Record<SoundTier, readonly string[]>> = {
  blue: ['E5', 'A5', 'B5'],
  violet: ['G5', 'C6', 'D6', 'G6'],
  rose: ['A5', 'D6', 'E6', 'F#6', 'A6'],
  gold: ['B5', 'E6', 'G#6', 'B6', 'E7', 'G#7'],
  rainbow: ['D6', 'G6', 'B6', 'D7', 'G7', 'A7', 'B7', 'D8'],
};

const ROOT: Readonly<Record<SoundTier, string>> = { blue: 'A1', violet: 'C2', rose: 'D2', gold: 'E2', rainbow: 'G1' };

function tierRank(tier: SoundTier): number {
  return ['blue', 'violet', 'rose', 'gold', 'rainbow'].indexOf(tier);
}

interface ActiveFlight {
  readonly gains: ToneGain[];
  readonly timers: number[];
}

/** Creates the instrument. Needs a user gesture before the browser lets it make sound (a click on "open"). */
export async function createPullAudio(): Promise<PullAudio> {
  const Tone: ToneLib = await import('tone');
  await Tone.start();

  const master = new Tone.Gain(0.6);
  const limiter = new Tone.Limiter(-3);
  master.chain(limiter, Tone.getDestination());
  const reverb = new Tone.Reverb({ decay: 4.2, preDelay: 0.02 });
  reverb.wet.value = 1;
  const reverbSend = new Tone.Gain(0.34);
  reverbSend.chain(reverb, master);
  const bus = new Tone.Gain(0.9);
  bus.connect(master);
  bus.connect(reverbSend);
  await reverb.ready;

  const bell = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 12,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.002, decay: 1.1, sustain: 0, release: 1.6 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0, release: 0.6 },
  });
  bell.maxPolyphony = 24;
  bell.volume.value = -9;
  bell.connect(bus);

  const padFilter = new Tone.Filter(1600, 'lowpass');
  const chorus = new Tone.Chorus(3.2, 3, 0.45).start();
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 28 },
    envelope: { attack: 0.5, decay: 0.6, sustain: 0.7, release: 2.4 },
  });
  pad.maxPolyphony = 16;
  pad.volume.value = -19;
  pad.chain(padFilter, chorus, bus);

  const boom = new Tone.MembraneSynth({ pitchDecay: 0.12, octaves: 7, envelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.6 } });
  boom.volume.value = -3;
  boom.connect(master);

  const metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.4, release: 0.9 },
    harmonicity: 5.1,
    modulationIndex: 30,
    resonance: 4200,
    octaves: 1.6,
  });
  metal.frequency.value = 380;
  metal.volume.value = -26;
  metal.connect(bus);

  const sparkle = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.2 } });
  sparkle.volume.value = -20;
  sparkle.connect(bus);

  const tick = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 } });
  tick.volume.value = -22;
  tick.connect(master);

  const permanent: Disposable[] = [master, limiter, reverb, reverbSend, bus, bell, padFilter, chorus, pad, boom, metal, sparkle, tick];

  let active: ActiveFlight | null = null;

  /** Stops the sound of the flight: the rush fades out, planned heartbeats and bells are dropped. */
  function cutFlight(): void {
    if (active === null) {
      return;
    }
    for (const timer of active.timers) {
      window.clearTimeout(timer);
    }
    for (const gain of active.gains) {
      gain.gain.cancelScheduledValues(Tone.now());
      gain.gain.rampTo(0, 0.07);
    }
    pad.releaseAll();
    active = null;
  }

  /** Runs something a little later, as part of the running flight. */
  function inFlight(seconds: number, run: () => void): void {
    const flight = active;
    if (flight === null) {
      return;
    }
    flight.timers.push(window.setTimeout(run, seconds * 1000));
  }

  /** Builds nodes for one cue and frees them a little after it is over. */
  function oneShot(lifetime: number, build: (start: number) => readonly Disposable[]): void {
    const nodes = build(Tone.now() + 0.03);
    window.setTimeout(() => {
      for (const node of nodes) {
        node.dispose();
      }
    }, (lifetime + 1.5) * 1000);
  }

  /** A burst of filtered noise that sweeps from `from` to `to` Hz. */
  function noiseSweep(
    start: number,
    seconds: number,
    from: number,
    to: number,
    peak: number,
    kind: 'pink' | 'white' | 'brown' = 'pink',
    q = 1.2,
  ): { readonly nodes: readonly Disposable[]; readonly gain: ToneGain } {
    const noise = new Tone.Noise(kind);
    const filter = new Tone.Filter({ type: 'bandpass', frequency: from, Q: q });
    const gain = new Tone.Gain(0);
    noise.chain(filter, gain, bus);
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + seconds * 0.85);
    gain.gain.linearRampToValueAtTime(0, start + seconds);
    noise.start(start).stop(start + seconds + 0.05);
    return { nodes: [noise, filter, gain], gain };
  }

  function arpeggio(notes: readonly string[], start: number, step: number, velocity: number): void {
    notes.forEach((note, index) => {
      bell.triggerAttackRelease(note, 1.4, start + index * step, Math.min(1, velocity * (0.75 + index * 0.05)));
    });
  }

  const instrument: PullAudio = {
    flight({ seconds, tier, threads }) {
      cutFlight();
      active = { gains: [], timers: [] };
      const flight = active;
      oneShot(seconds, (start) => {
        const sweep = noiseSweep(start, seconds, 240, 7200, threads ? 0.42 : 0.3);
        flight.gains.push(sweep.gain);
        // A rising tone under the rush.
        const tone = new Tone.Oscillator({ type: 'sine', frequency: 110 });
        const toneGain = new Tone.Gain(0);
        tone.chain(toneGain, bus);
        tone.frequency.setValueAtTime(110, start);
        tone.frequency.exponentialRampToValueAtTime(880 * (1 + tierRank(tier) * 0.12), start + seconds);
        toneGain.gain.setValueAtTime(0, start);
        toneGain.gain.linearRampToValueAtTime(0.16, start + seconds * (threads ? 0.7 : 0.9));
        if (threads) {
          // The star hangs in the air: the sound ducks for a breath, then rushes in.
          toneGain.gain.linearRampToValueAtTime(0.03, start + seconds * 0.8);
          toneGain.gain.linearRampToValueAtTime(0.24, start + seconds);
        }
        toneGain.gain.linearRampToValueAtTime(0, start + seconds + 0.04);
        tone.start(start).stop(start + seconds + 0.1);
        flight.gains.push(toneGain);
        // A swell of chord under it.
        pad.triggerAttackRelease([...CHORD[tier]], seconds, start, 0.55);
        return [...sweep.nodes, tone, toneGain];
      });
      // A heartbeat that speeds up.
      let beat = 0.55;
      let gap = 0.5;
      while (beat < seconds - 0.1) {
        const strength = 0.28 + (beat / seconds) * 0.5;
        inFlight(beat, () => boom.triggerAttackRelease(ROOT[tier], 0.3, Tone.now(), strength));
        gap = Math.max(0.16, gap * 0.82);
        beat += gap;
      }
      if (threads) {
        // Five bell notes, one for each thread, rising as they tighten around the star.
        ARPEGGIO.gold.slice(0, 5).forEach((note, index) => {
          inFlight(seconds * 0.38 + index * seconds * 0.075, () => bell.triggerAttackRelease(note, 1.2, Tone.now(), 0.5 + index * 0.05));
        });
        inFlight(seconds * 0.9, () => sparkle.triggerAttackRelease('E7', 0.1, Tone.now(), 0.5));
      }
    },

    impact(tier) {
      cutFlight();
      const rank = tierRank(tier);
      oneShot(2.5, (start) => {
        boom.triggerAttackRelease(ROOT[tier], 0.9, start, 0.9);
        boom.triggerAttackRelease('A0', 1.2, start + 0.02, 0.5 + rank * 0.1);
        const sweep = noiseSweep(start, 1.1 + rank * 0.15, 7000, 160, 0.5 + rank * 0.06, 'white', 0.7);
        pad.triggerAttackRelease([...CHORD[tier]], 2.2, start, 0.7);
        if (rank >= 1) {
          metal.triggerAttackRelease(380 + rank * 60, '4n', start, 0.4 + rank * 0.1);
        }
        arpeggio(ARPEGGIO[tier], start + 0.05, 0.06, 0.6 + rank * 0.07);
        return sweep.nodes;
      });
    },

    flip(tier, flipSeconds) {
      oneShot(flipSeconds, (start) => {
        const sweep = noiseSweep(start, Math.min(0.45, flipSeconds * 0.5), 3200, 700, 0.22, 'pink', 0.9);
        sparkle.triggerAttackRelease(ARPEGGIO[tier][0] ?? 'E5', 0.08, start + 0.02, 0.4);
        return sweep.nodes;
      });
    },

    reveal(rarity, tier, isNew) {
      const rank = tierRank(tier);
      const start = Tone.now() + 0.02;
      const notes = ARPEGGIO[tier];
      const strong = rarity === 'SAR' || rarity === 'UR';
      const count = rarity === 'C' || rarity === 'U' ? 1 : rarity === 'R' ? 2 : notes.length;
      arpeggio(notes.slice(0, count), start, strong ? 0.075 : 0.09, 0.5 + rank * 0.1);
      if (rank >= 1) {
        pad.triggerAttackRelease([...CHORD[tier]], 1.8 + rank * 0.3, start, 0.5 + rank * 0.1);
      }
      if (strong) {
        boom.triggerAttackRelease(ROOT[tier], 1, start, rarity === 'UR' ? 1 : 0.8);
        metal.triggerAttackRelease(420, '2n', start, 0.7);
        oneShot(1.5, (t) => noiseSweep(t, 1.4, 6500, 500, rarity === 'UR' ? 0.5 : 0.35, 'white', 0.8).nodes);
        for (let i = 0; i < (rarity === 'UR' ? 14 : 8); i += 1) {
          sparkle.triggerAttackRelease(notes[(i * 3) % notes.length] ?? 'E6', 0.08, start + 0.35 + i * 0.07, 0.35);
        }
      }
      if (isNew) {
        sparkle.triggerAttackRelease('C7', 0.12, start + 0.45 + rank * 0.05, 0.5);
        sparkle.triggerAttackRelease('G7', 0.16, start + 0.52 + rank * 0.05, 0.5);
      }
    },

    tap() {
      tick.triggerAttackRelease('A5', 0.05, Tone.now() + 0.005, 0.6);
    },

    summary() {
      const start = Tone.now() + 0.05;
      pad.triggerAttackRelease(['A3', 'E4', 'B4', 'F#5'], 2.4, start, 0.5);
      arpeggio(['E5', 'A5', 'B5', 'E6'], start + 0.1, 0.12, 0.5);
    },

    stop() {
      cutFlight();
    },

    setVolume(volume, muted) {
      const level = muted ? 0 : Math.min(1, Math.max(0, volume)) ** 2 * 0.9;
      master.gain.rampTo(level, 0.08);
    },

    dispose() {
      cutFlight();
      for (const node of permanent) {
        node.dispose();
      }
    },
  };
  return instrument;
}
