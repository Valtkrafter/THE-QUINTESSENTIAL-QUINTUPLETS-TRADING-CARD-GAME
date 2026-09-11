'use client';

export type SoundType =
  | 'tear_pack'
  | 'card_slide'
  | 'sub_bass_pulse'
  | 'reveal_rare'
  | 'godpack_fanfare';

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public play(sound: SoundType, volume = 0.8) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (sound) {
      case 'tear_pack': {
        const bufferSize = Math.floor(ctx.sampleRate * 0.25);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.4 ? 1 : 0.2);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(2.5, now);
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(3600, now + 0.22);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * 0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);

        // Terminal snap pop
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.frequency.setValueAtTime(85, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
        oscGain.gain.setValueAtTime(volume * 0.8, now + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now + 0.15);
        osc.stop(now + 0.24);
        break;
      }

      case 'card_slide': {
        const dur = 0.08;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2800, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.65, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case 'sub_bass_pulse': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(72, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.38);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'reveal_rare': {
        const freqs = [1318.5, 1661.2, 1975.5, 2637.0];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteStart = now + idx * 0.025;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, noteStart);

          gain.gain.setValueAtTime(volume * 0.4, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteStart);
          osc.stop(noteStart + 0.52);
        });
        break;
      }

      case 'godpack_fanfare': {
        const freqs = [220, 277.18, 329.63, 440];
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, now);
          filter.frequency.exponentialRampToValueAtTime(2800, now + 0.6);

          gain.gain.setValueAtTime(volume * 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.25);
        });
        break;
      }
    }
  }

  public stopAll() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.suspend();
    }
  }
}

export const soundEngine = new ProceduralSoundEngine();
export const playSound = (sound: SoundType, volume?: number) => soundEngine.play(sound, volume);
export default soundEngine;
