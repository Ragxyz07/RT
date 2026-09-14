/**
 * Audio feedback for AKRA Photobooth using Web Audio API.
 * Synthesizes a mechanical camera shutter sound and subtle countdown beeps.
 * Zero external audio assets required.
 */

class CameraAudioManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
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
    } catch {
      return null;
    }
  }

  /**
   * Play a clean, minimal countdown beep.
   * High pitch for the final '1' or 'GO', subtle mid pitch for preceding seconds.
   */
  playCountdownBeep(isFinal = false) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 587.33, now); // A5 or D5
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isFinal ? 0.22 : 0.1));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + (isFinal ? 0.24 : 0.12));
    } catch {
      // Audio playback fails gracefully if blocked
    }
  }

  /**
   * Play a realistic mechanical camera shutter click.
   * Emulates the quick dual-curtain movement of a high-end Leica / 35mm film camera.
   */
  playShutterSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. First curtain click (metallic burst)
      const bufferSize = ctx.sampleRate * 0.05; // 50ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.18));
      }

      const noise1 = ctx.createBufferSource();
      noise1.buffer = buffer;

      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(3200, now);
      filter1.Q.setValueAtTime(3.5, now);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(ctx.destination);
      noise1.start(now);

      // 2. Second curtain click (lower thud ~65ms later)
      const delay = 0.065;
      const noise2 = ctx.createBufferSource();
      noise2.buffer = buffer;

      const filter2 = ctx.createBiquadFilter();
      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(1600, now + delay);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.35, now + delay);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

      noise2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);
      noise2.start(now + delay);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

export const cameraAudio = new CameraAudioManager();
