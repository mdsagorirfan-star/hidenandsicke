class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.45;
  private lastStepTime = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  private playTone(freq: number, endFreq: number, duration: number, type: OscillatorType, gainScale = 0.25) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainScale * this.volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playFootstep(sprinting: boolean) {
    const nowMs = performance.now();
    const interval = sprinting ? 230 : 350;
    if (nowMs - this.lastStepTime < interval) return;
    this.lastStepTime = nowMs;
    this.playTone(sprinting ? 140 : 110, 55, 0.06, 'triangle', 0.14);
  }

  public playJump() {
    this.playTone(220, 440, 0.14, 'sine', 0.22);
  }

  public playLand() {
    this.playTone(130, 50, 0.09, 'triangle', 0.18);
  }

  public playTag() {
    this.playTone(580, 180, 0.22, 'sawtooth', 0.32);
    setTimeout(() => this.playTone(760, 980, 0.18, 'triangle', 0.24), 70);
  }

  public playCountdownTick(urgent = false) {
    this.playTone(urgent ? 880 : 520, urgent ? 860 : 500, 0.08, 'sine', 0.2);
  }

  public playSeekerRelease() {
    this.playTone(300, 720, 0.28, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(440, 880, 0.35, 'triangle', 0.28), 120);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, n * 1.02, 0.24, 'triangle', 0.25), idx * 90);
    });
  }

  public playDefeat() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, n * 0.96, 0.25, 'sawtooth', 0.2), idx * 110);
    });
  }
}

export const gameAudio = new ProceduralAudioEngine();
