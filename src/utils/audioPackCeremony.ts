/**
 * TQQ Vault - Zero-MP3 Procedural Web Audio API Sound Engine
 * High-performance, 100% synthesizer-driven procedural sound design.
 * Zero external .mp3/.wav dependencies for lightning-fast, zero-latency pack ceremonies.
 *
 * Sound Suite:
 * 1. playFoilCrease: Granular bandpass noise sweep (800Hz -> 2600Hz, Q=3.0, 90ms) on 3D rotation.
 * 2. playFoilTearRip: Sawtooth oscillator through amplitude crackle modulation with variable bandpass (1200Hz -> 3800Hz).
 * 3. playCardSlideDeck: Highpass-filtered white noise burst (3400Hz, 65ms, fast decay) simulating sleeve friction.
 * 4. startSuspenseHum: Dual sine oscillators (55Hz root + 110Hz overtone) through chorus filter with upward pitch slide.
 * 5. playSignedFanfare: Pristine 5-bell chime arpeggio (C6, E6, G6, B6, E7) with stereo panning and concert acoustics.
 */

import type { SuspenseTier } from '../types/packCeremony';

export interface SuspenseHumController {
  /** Updates the hum pitch as the card is dragged toward threshold (progress: 0.0 -> 1.0) */
  updatePitch: (progress: number) => void;
  /** Smoothly fades out and halts the oscillators and chorus nodes */
  stop: (fadeDurationMs?: number) => void;
}

// 5-Bell Chime Pitch Frequencies (Hz)
export const SIGNED_FANFARE_FREQUENCIES = [
  1046.5, // C6
  1318.5, // E6
  1567.9, // G6
  1975.5, // B6
  2637.0, // E7
] as const;

export class PackCeremonyAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private activeHumControllers: Set<SuspenseHumController> = new Set();

  /**
   * Resolves or initializes the browser AudioContext safely with autoplay recovery.
   */
  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Autoplay policy waiting for user interaction
      });
    }

    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * 1. playFoilCrease()
   * Granular bandpass noise sweep (800Hz -> 2600Hz, Q = 3.0, duration 90ms)
   * triggered on 3D rotation and handling of booster foil.
   */
  public playFoilCrease(volume = 0.5): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const duration = 0.09; // 90ms
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Granular metallic white noise
      for (let i = 0; i < bufferSize; i++) {
        const decay = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.pow(decay, 0.7);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Granular bandpass filter sweep 800Hz -> 2600Hz, Q = 3.0
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.0, ctx.currentTime);
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + duration);

      // Fast attack & decay envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(Math.min(1, volume * 0.45), ctx.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start(ctx.currentTime);
      noiseSource.stop(ctx.currentTime + duration + 0.01);
    } catch {
      // Audio fallback guard
    }
  }

  /**
   * 2. playFoilTearRip(progress, velocity)
   * Sawtooth oscillator through amplitude crackle modulation with variable
   * bandpass filter shifting from 1200Hz to 3800Hz proportional to tear velocity.
   */
  public playFoilTearRip(progress: number, velocity = 1.0, volume = 0.7): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const clampedProg = Math.max(0, Math.min(1, progress));
      const clampedVel = Math.max(0.2, Math.min(2.5, velocity));
      const duration = Math.max(0.07, Math.min(0.2, 0.14 / clampedVel));
      const now = ctx.currentTime;

      // Variable bandpass target frequency proportional to progress & velocity (1200Hz -> 3800Hz)
      const baseFreq = 1200 + clampedProg * 2600;
      const targetFreq = Math.min(3800, baseFreq * (0.9 + clampedVel * 0.15));

      // Sawtooth oscillator providing rich metallic tearing harmonics
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80 + clampedProg * 60, now);
      osc.frequency.linearRampToValueAtTime(45, now + duration);

      // Amplitude crackle noise modulation
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = crackleBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const isSpike = Math.random() > 0.65;
        data[i] = (Math.random() * 2 - 1) * (isSpike ? 1.5 : 0.4);
      }

      const crackleSource = ctx.createBufferSource();
      crackleSource.buffer = crackleBuffer;

      // Variable Bandpass Filter (1200Hz -> 3800Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(2.2, now);
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);

      // Combined gain envelope
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.001, now);
      mainGain.gain.linearRampToValueAtTime(volume * 0.75, now + 0.015);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Audio Graph routing
      osc.connect(filter);
      crackleSource.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(ctx.destination);

      osc.start(now);
      crackleSource.start(now);
      osc.stop(now + duration + 0.01);
      crackleSource.stop(now + duration + 0.01);
    } catch {
      // Audio fallback guard
    }
  }

  /**
   * 3. playCardSlideDeck()
   * Highpass-filtered white noise burst (3400Hz, duration 65ms, gain envelope fast decay)
   * simulating premium card sleeve & paper friction.
   */
  public playCardSlideDeck(volume = 0.7): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const duration = 0.065; // 65ms
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // White noise buffer
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Highpass filter at 3400Hz
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3400, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);

      // Fast decay gain envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume * 0.65, ctx.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start(ctx.currentTime);
      noiseSource.stop(ctx.currentTime + duration + 0.01);
    } catch {
      // Audio fallback guard
    }
  }

  /**
   * 4. startSuspenseHum(suspenseTier)
   * Dual sine oscillators (55Hz root + 110Hz overtone) run through a subtle chorus filter.
   * Frequency slides upward as the card is peeled toward the reveal threshold.
   * Returns a controller to update pitch and gracefully stop.
   */
  public startSuspenseHum(
    suspenseTier: SuspenseTier = 'standard',
    volume = 0.5
  ): SuspenseHumController {
    const noopController: SuspenseHumController = {
      updatePitch: () => {},
      stop: () => {},
    };

    if (this.isMuted) return noopController;
    const ctx = this.getContext();
    if (!ctx) return noopController;

    try {
      const now = ctx.currentTime;

      // Root (55Hz) and Overtone (110Hz)
      const baseRootFreq = 55.0;
      const baseOvertoneFreq = 110.0;

      const oscRoot = ctx.createOscillator();
      oscRoot.type = 'sine';
      oscRoot.frequency.setValueAtTime(baseRootFreq, now);

      const oscOvertone = ctx.createOscillator();
      oscOvertone.type = 'sine';
      oscOvertone.frequency.setValueAtTime(baseOvertoneFreq, now);

      // Optional higher harmonic for Ultra / God tiers
      let oscHarmonic: OscillatorNode | null = null;
      if (suspenseTier === 'ultra' || suspenseTier === 'god') {
        oscHarmonic = ctx.createOscillator();
        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(baseRootFreq * 3, now); // 165Hz
      }

      // Chorus effect: modulated delay line
      const delayNode = ctx.createDelay();
      delayNode.delayTime.setValueAtTime(0.018, now); // 18ms base delay

      const chorusLfo = ctx.createOscillator();
      chorusLfo.type = 'sine';
      chorusLfo.frequency.setValueAtTime(1.5, now); // 1.5Hz subtle breath

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.003, now); // 3ms depth
      chorusLfo.connect(lfoGain);
      lfoGain.connect(delayNode.delayTime);

      // Master Gain for the hum
      const masterGain = ctx.createGain();
      const tierGainBoost =
        suspenseTier === 'god' ? 1.3 : suspenseTier === 'ultra' ? 1.15 : 1.0;
      const targetGain = Math.min(0.6, volume * 0.38 * tierGainBoost);

      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.08);

      // Audio Graph Connection
      oscRoot.connect(delayNode);
      oscRoot.connect(masterGain);

      oscOvertone.connect(delayNode);
      oscOvertone.connect(masterGain);

      if (oscHarmonic) {
        const harmonicGain = ctx.createGain();
        harmonicGain.gain.setValueAtTime(0.2, now);
        oscHarmonic.connect(harmonicGain);
        harmonicGain.connect(masterGain);
      }

      delayNode.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Start oscillators
      oscRoot.start(now);
      oscOvertone.start(now);
      chorusLfo.start(now);
      if (oscHarmonic) oscHarmonic.start(now);

      let isStopped = false;

      const controller: SuspenseHumController = {
        updatePitch: (progress: number) => {
          if (isStopped || !this.ctx) return;
          const p = Math.max(0, Math.min(1.0, progress));
          const currentTime = this.ctx.currentTime;

          // Frequency slides upward toward reveal threshold (up to +1 octave at threshold)
          const pitchMultiplier = 1.0 + p * 0.95;
          const newRoot = baseRootFreq * pitchMultiplier;
          const newOvertone = baseOvertoneFreq * pitchMultiplier;

          oscRoot.frequency.setTargetAtTime(newRoot, currentTime, 0.035);
          oscOvertone.frequency.setTargetAtTime(newOvertone, currentTime, 0.035);

          if (oscHarmonic) {
            oscHarmonic.frequency.setTargetAtTime(newRoot * 3, currentTime, 0.035);
          }
        },

        stop: (fadeDurationMs = 80) => {
          if (isStopped || !this.ctx) return;
          isStopped = true;
          this.activeHumControllers.delete(controller);

          try {
            const stopTime = this.ctx.currentTime;
            const fadeSec = Math.max(0.02, fadeDurationMs / 1000);

            masterGain.gain.cancelScheduledValues(stopTime);
            masterGain.gain.setValueAtTime(masterGain.gain.value, stopTime);
            masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + fadeSec);

            setTimeout(() => {
              try {
                oscRoot.stop();
                oscOvertone.stop();
                chorusLfo.stop();
                if (oscHarmonic) oscHarmonic.stop();

                oscRoot.disconnect();
                oscOvertone.disconnect();
                chorusLfo.disconnect();
                lfoGain.disconnect();
                delayNode.disconnect();
                masterGain.disconnect();
              } catch {
                // Nodes may have already detached
              }
            }, fadeDurationMs + 20);
          } catch {
            // Stop fallback
          }
        },
      };

      this.activeHumControllers.add(controller);
      return controller;
    } catch {
      return noopController;
    }
  }

  /**
   * 5. playSignedFanfare()
   * Pristine 5-bell chime arpeggio:
   * (C6: 1046.5Hz, E6: 1318.5Hz, G6: 1567.9Hz, B6: 1975.5Hz, E7: 2637.0Hz).
   * Stereo panned with exponential gain decay simulating high-end concert acoustics.
   */
  public playSignedFanfare(volume = 0.85): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const noteDelay = 0.075; // 75ms arpeggio interval
      const decayDuration = 2.2; // Concert acoustic reverb decay (seconds)

      // Stereo pan distribution from Left (-0.6) to Right (+0.6)
      const panPositions = [-0.6, -0.3, 0.0, 0.3, 0.6];

      SIGNED_FANFARE_FREQUENCIES.forEach((freq, idx) => {
        const noteStart = now + idx * noteDelay;

        // Fundamental Bell Sine Oscillator
        const oscFund = ctx.createOscillator();
        oscFund.type = 'sine';
        oscFund.frequency.setValueAtTime(freq, noteStart);

        // Pristine crystalline bell overtone (2.76x ratio characteristic of concert chimes)
        const oscOvertone = ctx.createOscillator();
        oscOvertone.type = 'sine';
        oscOvertone.frequency.setValueAtTime(freq * 2.76, noteStart);

        // Note Gain Envelope with exponential concert decay
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.linearRampToValueAtTime(volume * 0.35, noteStart + 0.012);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + decayDuration);

        // Overtone Gain (subtler crystalline sheen)
        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.0001, noteStart);
        overtoneGain.gain.linearRampToValueAtTime(volume * 0.08, noteStart + 0.008);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + decayDuration * 0.6);

        // Stereo Panner (or standard fallback if StereoPannerNode unsupported)
        const panValue = panPositions[idx] ?? 0.0;
        let pannerNode: StereoPannerNode | null = null;
        if (typeof ctx.createStereoPanner === 'function') {
          pannerNode = ctx.createStereoPanner();
          pannerNode.pan.setValueAtTime(panValue, noteStart);
        }

        // Routing
        oscFund.connect(noteGain);
        oscOvertone.connect(overtoneGain);
        overtoneGain.connect(noteGain);

        if (pannerNode) {
          noteGain.connect(pannerNode);
          pannerNode.connect(ctx.destination);
        } else {
          noteGain.connect(ctx.destination);
        }

        oscFund.start(noteStart);
        oscOvertone.start(noteStart);

        oscFund.stop(noteStart + decayDuration + 0.05);
        oscOvertone.stop(noteStart + decayDuration + 0.05);
      });
    } catch {
      // Fanfare fallback
    }
  }

  /**
   * Immediately halts all running hums and scheduled ceremony audio nodes.
   */
  public stopAll(): void {
    for (const controller of this.activeHumControllers) {
      controller.stop(10);
    }
    this.activeHumControllers.clear();
  }
}

// Global Singleton Instance
export const audioPackCeremony = new PackCeremonyAudioEngine();

// Convenience Function Exports
export const playFoilCrease = (volume?: number) => audioPackCeremony.playFoilCrease(volume);
export const playFoilTearRip = (progress: number, velocity?: number, volume?: number) =>
  audioPackCeremony.playFoilTearRip(progress, velocity, volume);
export const playCardSlideDeck = (volume?: number) => audioPackCeremony.playCardSlideDeck(volume);
export const startSuspenseHum = (suspenseTier?: SuspenseTier, volume?: number) =>
  audioPackCeremony.startSuspenseHum(suspenseTier, volume);
export const playSignedFanfare = (volume?: number) => audioPackCeremony.playSignedFanfare(volume);
export const stopAllCeremonyAudio = () => audioPackCeremony.stopAll();
export const setAudioMuted = (muted: boolean) => audioPackCeremony.setMuted(muted);
export const isAudioMuted = () => audioPackCeremony.getMuted();
