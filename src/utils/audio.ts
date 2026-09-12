'use client';

export type SoundType =
  | 'tear_pack'
  | 'card_slide'
  | 'sub_bass_pulse'
  | 'reveal_rare'
  | 'godpack_fanfare'
  | 'plastic_snip'
  | 'plastic_crunch_shatter'
  | 'cotton_swab_rub'
  | 'clean_chime'
  | 'clamp_ratchet'
  | 'wax_buff_rub'
  | 'pen_scribble';

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

      case 'plastic_snip': {
        // Crisp, high-frequency plastic snip: bandpass noise burst 2400Hz -> 4800Hz, 45ms
        const dur = 0.045;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(3.5, now);
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(4800, now + dur);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume * 0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case 'plastic_crunch_shatter': {
        // Deep mechanical plastic fracture crunch + acrylic rattle
        const dur = 0.35;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const t = i / ctx.sampleRate;
          const crackle = Math.random() > 0.8 ? 1.8 : 0.4;
          data[i] = (Math.random() * 2 - 1) * crackle * Math.exp(-t * 12);
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(1400, now);
        lowpass.frequency.exponentialRampToValueAtTime(400, now + dur);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noiseSource.connect(lowpass);
        lowpass.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSource.start(now);

        // Low frequency transient snap
        const snapOsc = ctx.createOscillator();
        const snapGain = ctx.createGain();
        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(220, now);
        snapOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

        snapGain.gain.setValueAtTime(volume * 0.9, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        snapOsc.connect(snapGain);
        snapGain.connect(ctx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.13);

        // High acrylic clatter fragments
        [0.05, 0.1, 0.16, 0.22].forEach((offset, idx) => {
          const clink = ctx.createOscillator();
          const clinkGain = ctx.createGain();
          clink.type = 'sine';
          clink.frequency.setValueAtTime(2800 + idx * 600, now + offset);
          clinkGain.gain.setValueAtTime(volume * (0.3 - idx * 0.05), now + offset);
          clinkGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.035);
          clink.connect(clinkGain);
          clinkGain.connect(ctx.destination);
          clink.start(now + offset);
          clink.stop(now + offset + 0.04);
        });
        break;
      }

      case 'cotton_swab_rub': {
        // Soft rubbing friction sound (filtered white noise)
        const dur = 0.12;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.7;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(1.8, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case 'clean_chime': {
        // Emerald green chime (1760Hz -> 2093Hz)
        const freqs = [1760.0, 2093.0, 2637.0]; // A6, C7, E7
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.04;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, start);

          gain.gain.setValueAtTime(volume * 0.35, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.48);
        });
        break;
      }

      case 'clamp_ratchet': {
        // Heavy mechanical ratchet clicks (clack-clack-clack) + pneumatic pressure hiss
        [0, 0.07, 0.14].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(820, now + offset);
          osc.frequency.exponentialRampToValueAtTime(200, now + offset + 0.035);

          gain.gain.setValueAtTime(volume * 0.4, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.045);
        });

        // Pneumatic air hiss after clicks
        const hissStart = now + 0.22;
        const hissDur = 0.26;
        const bufferSize = Math.floor(ctx.sampleRate * hissDur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const hissSource = ctx.createBufferSource();
        hissSource.buffer = buffer;

        const hissFilter = ctx.createBiquadFilter();
        hissFilter.type = 'bandpass';
        hissFilter.frequency.setValueAtTime(3200, hissStart);
        hissFilter.Q.setValueAtTime(2.0, hissStart);

        const hissGain = ctx.createGain();
        hissGain.gain.setValueAtTime(0.001, hissStart);
        hissGain.gain.linearRampToValueAtTime(volume * 0.3, hissStart + 0.03);
        hissGain.gain.exponentialRampToValueAtTime(0.001, hissStart + hissDur);

        hissSource.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(ctx.destination);
        hissSource.start(hissStart);
        break;
      }

      case 'wax_buff_rub': {
        // Moist textured friction rubbing sound
        const dur = 0.16;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (0.8 + 0.2 * Math.sin(i * 0.1));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.Q.setValueAtTime(3.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.45, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case 'pen_scribble': {
        // Procedural paper scribble sound effects
        const dur = 0.1;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.3 ? 0.9 : 0.2);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800 + Math.random() * 1400, now);
        filter.Q.setValueAtTime(4.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
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
