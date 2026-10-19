export type AudioSettings = {
  muted: boolean;
  volume: number;
  unlocked: boolean;
  ambientEnabled: boolean;
};

type AttackFamily = 'pulse' | 'falling' | 'sweep' | 'orbit' | string;
type SettingsListener = (settings: AudioSettings) => void;

const STORAGE_KEY = 'playhouse.audio.v1';
const DEFAULT_VOLUME = 0.55;

export function clampAudioVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
}

function readSavedSettings(): Pick<AudioSettings, 'muted' | 'volume' | 'ambientEnabled'> {
  const defaults = { muted: false, volume: DEFAULT_VOLUME, ambientEnabled: true };
  if (typeof window === 'undefined') return defaults;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return {
      muted: typeof saved.muted === 'boolean' ? saved.muted : defaults.muted,
      volume: typeof saved.volume === 'number' ? clampAudioVolume(saved.volume) : defaults.volume,
      ambientEnabled: typeof saved.ambientEnabled === 'boolean' ? saved.ambientEnabled : !prefersReducedMotion,
    };
  } catch { return defaults; }
}

export class PlayhouseAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientTimer: ReturnType<typeof setInterval> | null = null;
  private ambientWanted = false;
  private lastAttackAt = Number.NEGATIVE_INFINITY;
  private listeners = new Set<SettingsListener>();
  private settings: AudioSettings = { ...readSavedSettings(), unlocked: false };

  getSettings(): AudioSettings { return { ...this.settings }; }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => this.listeners.delete(listener);
  }

  private announce(): void { for (const listener of this.listeners) listener(this.getSettings()); }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: this.settings.muted, volume: this.settings.volume, ambientEnabled: this.settings.ambientEnabled })); } catch { /* Storage may be unavailable in private mode. */ }
    this.announce();
  }

  /** Call within a Play/Enable sound button gesture. Nothing creates audio before this. */
  async unlock(): Promise<boolean> {
    if (this.settings.unlocked) return true;
    if (typeof window === 'undefined') return false;
    const WebAudio = window.AudioContext;
    if (!WebAudio) return false;
    try {
      this.context = new WebAudio();
      this.master = this.context.createGain();
      this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
      this.master.connect(this.context.destination);
      await this.context.resume();
      this.settings.unlocked = this.context.state === 'running';
      if (!this.settings.unlocked) return false;
      document.addEventListener('visibilitychange', this.handleVisibility);
      this.announce();
      if (this.ambientWanted) this.startAmbient();
      return true;
    } catch { return false; }
  }

  private handleVisibility = (): void => {
    if (document.hidden) this.clearAmbientTimer();
    else if (this.ambientWanted) this.startAmbient();
  };

  setMuted(muted: boolean): void {
    this.settings.muted = Boolean(muted);
    this.applyMaster();
    if (muted) this.clearAmbientTimer();
    else if (this.ambientWanted) this.startAmbient();
    this.persist();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  setVolume(volume: number): void {
    this.settings.volume = clampAudioVolume(volume);
    this.applyMaster();
    this.persist();
  }

  setAmbientEnabled(enabled: boolean): void {
    this.settings.ambientEnabled = Boolean(enabled);
    if (!enabled) this.clearAmbientTimer();
    else if (this.ambientWanted) this.startAmbient();
    this.persist();
  }

  private applyMaster(): void {
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.volume, this.context.currentTime, 0.015);
  }

  private tone(frequency: number, duration: number, peak: number, type: OscillatorType = 'sine', delay = 0, endingFrequency?: number): void {
    if (!this.context || !this.master || !this.settings.unlocked || this.settings.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endingFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endingFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.min(0.02, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  startAmbient(): void {
    this.ambientWanted = true;
    if (!this.settings.unlocked || this.settings.muted || !this.settings.ambientEnabled || this.ambientTimer || (typeof document !== 'undefined' && document.hidden)) return;
    this.ambientPhrase();
    this.ambientTimer = setInterval(() => this.ambientPhrase(), 4200);
  }

  private ambientPhrase(): void {
    // A sparse original three-note lullaby, deliberately below the combat cues.
    this.tone(174.61, 2.2, 0.018, 'sine');
    this.tone(261.63, 1.7, 0.011, 'sine', 0.34);
    this.tone(349.23, 1.9, 0.009, 'sine', 0.9);
  }

  private clearAmbientTimer(): void {
    if (this.ambientTimer) clearInterval(this.ambientTimer);
    this.ambientTimer = null;
  }

  stopAmbient(): void { this.ambientWanted = false; this.clearAmbientTimer(); }

  attack(family: AttackFamily): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastAttackAt < 110) return;
    this.lastAttackAt = now;
    switch (family) {
      case 'pulse':
        this.tone(220, 0.12, 0.11, 'square', 0, 160);
        this.tone(330, 0.1, 0.07, 'square', 0.12, 240);
        break;
      case 'falling':
        this.tone(680, 0.38, 0.13, 'sawtooth', 0, 120);
        break;
      case 'sweep':
        this.tone(170, 0.3, 0.12, 'triangle', 0, 670);
        break;
      case 'orbit':
        this.tone(320, 0.16, 0.085, 'sine', 0, 510);
        this.tone(510, 0.16, 0.065, 'sine', 0.17, 320);
        break;
      default:
        this.tone(280, 0.16, 0.09, 'triangle', 0, 180);
    }
  }

  dodge(): void {
    this.tone(350, 0.11, 0.1, 'triangle', 0, 900);
    this.tone(720, 0.09, 0.035, 'sine', 0.05, 1100);
  }

  hit(): void {
    this.tone(175, 0.23, 0.18, 'sawtooth', 0, 60);
    this.tone(80, 0.28, 0.1, 'sine');
  }

  win(): void {
    this.stopAmbient();
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => this.tone(frequency, 0.32, 0.13, 'triangle', index * 0.14));
  }

  lose(): void {
    this.stopAmbient();
    [392, 293.66, 196].forEach((frequency, index) => this.tone(frequency, 0.34, 0.11, 'sine', index * 0.2));
  }

  result(): void {
    [880, 1174.66, 1567.98].forEach((frequency, index) => this.tone(frequency, 0.18, 0.08, 'sine', index * 0.08));
  }

  async dispose(): Promise<void> {
    this.stopAmbient();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.handleVisibility);
    await this.context?.close();
    this.context = null;
    this.master = null;
    this.settings.unlocked = false;
    this.announce();
  }
}

export const playhouseAudio = new PlayhouseAudio();
