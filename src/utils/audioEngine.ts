/**
 * TQQ Vault - Procedural Web Audio Engine
 * High-performance, zero-dependency sound synthesizer providing tactile audio cues
 * for foil rustles, tearing pops, spark bursts, anticipation rumbles, and victory reveals.
 */

import { GradeTier, Rarity } from '../types/card';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Foil rustle: soft filtered noise on hover/drag
   */
  public playFoilRustle(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
    } catch {
      // Audio fallback
    }
  }

  /**
   * Tear Rip: crisp, explosive tearing sound
   */
  public playTearSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const duration = 0.28;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Modulated noise with crackles
      for (let i = 0; i < bufferSize; i++) {
        const crackle = Math.random() > 0.85 ? 1.5 : 0.6;
        data[i] = (Math.random() * 2 - 1) * crackle;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();

      // Transient pop
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.09);

      oscGain.gain.setValueAtTime(0.35, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Slab Crack: mechanical snap and acrylic crunch fracture
   */
  public playSlabCrackSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.3 ? 1 : 0.2);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2400, now);
      bandpass.frequency.exponentialRampToValueAtTime(800, now + 0.14);
      bandpass.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Sparkle Burst: crystalline chime arpeggio
   */
  public playSparkleSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);

        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.3);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Anticipation Rumble: Deep sub-bass heartbeat pulse for high-rarity tells
   */
  public playAnticipationSound(rarity: Rarity): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const isUltra = rarity === 'UR' || rarity === 'SEC' || rarity === 'MR';
      const baseFreq = isUltra ? 45 : 65;
      const duration = isUltra ? 1.2 : 0.7;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);

      if (isUltra) {
        // Crackling lightning surge
        this.playLightningSound();
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Lightning crackle for UR+ anticipation
   */
  public playLightningSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.6 ? 1.2 : 0.2);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // Audio fallback
    }
  }

  /**
   * Reveal Fanfare: Dynamic victory chords depending on card rarity & God Pack
   */
  public playRevealSound(rarity: Rarity, isGodPack: boolean = false): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (isGodPack) {
        // Celestial God Pack Chime (D-Major chord with high shimmer)
        const chord = [293.66, 369.99, 440.0, 587.33, 880.0, 1174.66]; // D4, F#4, A4, D5, A5, D6
        chord.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.05);

          gain.gain.setValueAtTime(0.09, ctx.currentTime + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.05);
          osc.stop(ctx.currentTime + 2.0);
        });
        return;
      }

      // Rarity-based chord
      let notes: number[] = [523.25]; // C5
      if (rarity === 'UC') {
        notes = [523.25, 659.25]; // C5, E5
      } else if (rarity === 'R') {
        notes = [523.25, 659.25, 783.99]; // C Major
      } else if (rarity === 'SR') {
        notes = [523.25, 659.25, 783.99, 1046.5]; // C Major Octave
      } else if (rarity === 'UR' || rarity === 'SEC' || rarity === 'MR') {
        notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D Major Epic
      }

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = rarity === 'UR' || rarity === 'SEC' || rarity === 'MR' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04);

        const volume = 0.08;
        gain.gain.setValueAtTime(volume, ctx.currentTime + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.04);
        osc.stop(ctx.currentTime + i * 0.04 + 0.9);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Laser Scanner: Dual neon cyan sweep with frequency modulated sci-fi hum
   */
  public playLaserScanSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dual pass sweep (two passes, each ~0.8s)
      [0, 0.9].forEach((offset) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now + offset);
        osc.frequency.exponentialRampToValueAtTime(1400, now + offset + 0.4);
        osc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.8);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now + offset);
        filter.frequency.exponentialRampToValueAtTime(2800, now + offset + 0.4);
        filter.frequency.exponentialRampToValueAtTime(750, now + offset + 0.8);
        filter.Q.setValueAtTime(5, now + offset);

        gain.gain.setValueAtTime(0.01, now + offset);
        gain.gain.linearRampToValueAtTime(0.1, now + offset + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.9);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Hydraulic Clamp Stamp: Heavy pneumatic impact + sub-bass slam + pressure hiss
   */
  public playHydraulicStampSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy bass thud (low sine drop)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

      subGain.gain.setValueAtTime(0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.5);

      // 2. Mechanical metal slam transient
      const slamOsc = ctx.createOscillator();
      const slamGain = ctx.createGain();
      slamOsc.type = 'triangle';
      slamOsc.frequency.setValueAtTime(480, now);
      slamOsc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

      slamGain.gain.setValueAtTime(0.3, now);
      slamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      slamOsc.connect(slamGain);
      slamGain.connect(ctx.destination);
      slamOsc.start(now);
      slamOsc.stop(now + 0.2);

      // 3. High pressure steam hiss
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const hissFilter = ctx.createBiquadFilter();
      hissFilter.type = 'highpass';
      hissFilter.frequency.setValueAtTime(2200, now);

      const hissGain = ctx.createGain();
      hissGain.gain.setValueAtTime(0.18, now + 0.05);
      hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(ctx.destination);

      noise.start(now + 0.04);
      noise.stop(now + 0.45);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Grade Reveal Impact: Color-coded audio cues per grade tier
   */
  public playGradeReveal(tier: GradeTier): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (tier === 'POOR_1_3') {
        // Harsh dissonant descending buzzer & dull thud ("Schulhof-Müll")
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(160, now);
        osc1.frequency.linearRampToValueAtTime(80, now + 0.6);
        osc2.frequency.setValueAtTime(175, now); // Dissonant minor 2nd beat
        osc2.frequency.linearRampToValueAtTime(85, now + 0.6);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.7);
        osc2.stop(now + 0.7);
        return;
      }

      if (tier === 'USED_4_6') {
        // Double mechanical validation tap
        [0, 0.12].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now + offset);
          gain.gain.setValueAtTime(0.12, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.18);
        });
        return;
      }

      if (tier === 'CRISP_7_8') {
        // Bright metallic silver chime ("Crisp")
        const chimeNotes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
        chimeNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);

          gain.gain.setValueAtTime(0.14, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 1.3);
        });
        return;
      }

      if (tier === 'MINT_9') {
        // Platinum shimmer harmonic arpeggio
        const mintNotes = [523.25, 659.25, 783.99, 987.77, 1046.5]; // C5, E5, G5, B5, C6
        mintNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.04);

          gain.gain.setValueAtTime(0.15, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 1.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 1.5);
        });
        return;
      }

      if (tier === 'GEM_MINT_10') {
        // Golden Explosion & Fanfare ("PEAK FICTION")
        const fanfare = [587.33, 739.99, 880.0, 1174.66, 1760.0]; // D Major Epic
        fanfare.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3000, now);

          gain.gain.setValueAtTime(0.12, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 2.0);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 2.1);
        });

        // Add sub-boom
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(90, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + 0.8);
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.85);
        return;
      }

      if (tier === 'BLACK_LABEL') {
        // Obsidian Void flare & Dark Lightning ("THE CHOSEN ONE")
        // 1. Deep seismic rumble
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(45, now);
        sub.frequency.exponentialRampToValueAtTime(20, now + 1.8);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 2.0);

        // 2. Multi-strike lightning crackles
        this.playLightningSound();
        setTimeout(() => this.playLightningSound(), 120);
        setTimeout(() => this.playLightningSound(), 260);

        // 3. Dark cathedral choir resonance (G minor cosmic chords)
        const darkChord = [196.0, 233.08, 293.66, 392.0, 587.33, 783.99]; // G3, Bb3, D4, G4, D5, G5
        darkChord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 3.0);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 3.2);
        });
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Dusting / Recycler: Sci-Fi particle vaporization burn
   */
  public playDustVaporizeSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
      filter.Q.setValueAtTime(4, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.55);

      // Crystalline shimmer after-ring
      this.playSparkleSound();
    } catch {
      // Audio fallback
    }
  }

  /**
   * Tool purchase or equip chime
   */
  public playToolClickSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Metallic coin chime / synthesizer coin pulse for card liquidations
   */
  public playCoinPulseSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Dual tuned metallic chime tones (B6 & E7)
      const tones = [1975.53, 2637.02];
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.025);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + idx * 0.025 + 0.35);

        gain.gain.setValueAtTime(0.14, now + idx * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.025);
        osc.stop(now + idx * 0.025 + 0.4);
      });

      // Metallic high-frequency clink transient
      const transient = ctx.createOscillator();
      const transGain = ctx.createGain();
      transient.type = 'triangle';
      transient.frequency.setValueAtTime(4186.01, now); // C8
      transient.frequency.exponentialRampToValueAtTime(2093.0, now + 0.06);

      transGain.gain.setValueAtTime(0.18, now);
      transGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      transient.connect(transGain);
      transGain.connect(ctx.destination);
      transient.start(now);
      transient.stop(now + 0.09);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Cash register / Receipt print sound for Singles Kiosk transactions
   */
  public playReceiptSound(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Two rapid mechanical printer/shutter clicks
      [0, 0.07].forEach((delay) => {
        const bufferSize = Math.floor(ctx.sampleRate * 0.025);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const clickNoise = ctx.createBufferSource();
        clickNoise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3600, now + delay);
        filter.Q.setValueAtTime(4, now + delay);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.16, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03);

        clickNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        clickNoise.start(now + delay);
      });

      // Harmonic confirmation ping
      const pingNotes = [1046.5, 1567.98]; // C6 -> G6
      pingNotes.forEach((freq, idx) => {
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();

        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(freq, now + 0.14 + idx * 0.05);

        pingGain.gain.setValueAtTime(0.1, now + 0.14 + idx * 0.05);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14 + idx * 0.05 + 0.4);

        pingOsc.connect(pingGain);
        pingGain.connect(ctx.destination);
        pingOsc.start(now + 0.14 + idx * 0.05);
        pingOsc.stop(now + 0.14 + idx * 0.05 + 0.45);
      });
    } catch {
      // Audio fallback
    }
  }
}

export const soundEngine = new AudioEngine();
