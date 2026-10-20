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
// Raise the music mix for phone speakers while retaining headroom for combat cues.
const MUSIC_BUS_GAIN = 2.2;

export function clampAudioVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
}

function readSavedSettings(): Pick<AudioSettings, 'muted' | 'volume' | 'ambientEnabled'> {
  const defaults = { muted: false, volume: DEFAULT_VOLUME, ambientEnabled: true };
  if (typeof window === 'undefined') return defaults;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      muted: typeof saved.muted === 'boolean' ? saved.muted : defaults.muted,
      volume: typeof saved.volume === 'number' ? clampAudioVolume(saved.volume) : defaults.volume,
      ambientEnabled: typeof saved.ambientEnabled === 'boolean' ? saved.ambientEnabled : defaults.ambientEnabled,
    };
  } catch { return defaults; }
}

export class PlayhouseAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicWanted = false;
  private nextMusicStep = 0;
  private nextMusicTime = 0;
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
    if (this.settings.unlocked) {
      // Mobile browsers can suspend a previously unlocked context in the background.
      if (this.context?.state === 'suspended') await this.context.resume();
      this.startSoundtrack();
      return this.context?.state === 'running';
    }
    if (typeof window === 'undefined') return false;
    const WebAudio = window.AudioContext;
    if (!WebAudio) return false;
    try {
      this.context = new WebAudio();
      this.master = this.context.createGain();
      this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
      this.master.connect(this.context.destination);
      this.musicBus = this.context.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      await this.context.resume();
      this.settings.unlocked = this.context.state === 'running';
      if (!this.settings.unlocked) return false;
      // The visible "Enable sound" gesture also enables music for older saved settings.
      this.settings.ambientEnabled = true;
      document.addEventListener('visibilitychange', this.handleVisibility);
      this.persist();
      this.startSoundtrack();
      return true;
    } catch { return false; }
  }

  private handleVisibility = (): void => {
    if (document.hidden) this.pauseSoundtrack();
    else if (this.musicWanted) this.startSoundtrack();
  };

  setMuted(muted: boolean): void {
    this.settings.muted = Boolean(muted);
    this.applyMaster();
    if (muted) this.pauseSoundtrack();
    else if (this.musicWanted) this.startSoundtrack();
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
    if (!enabled) this.pauseSoundtrack();
    else if (this.musicWanted) this.startSoundtrack();
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

  /** An original, eight-bar arcade loop. Audio begins only after unlock() is called from a gesture. */
  startSoundtrack(): void {
    this.musicWanted = true;
    if (!this.context || !this.musicBus || !this.settings.unlocked || this.settings.muted || !this.settings.ambientEnabled || this.musicTimer || (typeof document !== 'undefined' && document.hidden)) return;
    this.nextMusicStep = 0;
    this.nextMusicTime = this.context.currentTime + 0.05;
    this.musicBus.gain.setTargetAtTime(MUSIC_BUS_GAIN, this.context.currentTime, 0.07);
    this.scheduleMusic();
    this.musicTimer = setInterval(() => this.scheduleMusic(), 80);
  }

  private musicNote(frequency: number, time: number, duration: number, peak: number, type: OscillatorType = 'sine', endingFrequency?: number): void {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endingFrequency) oscillator.frequency.exponentialRampToValueAtTime(endingFrequency, time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + Math.min(0.012, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(this.musicBus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  private scheduleMusic(): void {
    if (!this.context || !this.musicTimer && !this.musicWanted) return;
    const eighth = 60 / 116 / 2;
    // F - Dm - Bb - C, two bars per chord; accents shift in the second half.
    const bass = [174.61, 146.83, 116.54, 130.81];
    const arpeggio = [
      [349.23, 440, 523.25, 440],
      [293.66, 349.23, 440, 349.23],
      [233.08, 293.66, 349.23, 293.66],
      [261.63, 329.63, 392, 329.63],
    ];
    const melody = [
      [698.46, 0, 783.99, 880, 0, 783.99, 698.46, 0],
      [659.25, 0, 698.46, 783.99, 0, 698.46, 587.33, 0],
      [587.33, 0, 698.46, 783.99, 0, 698.46, 587.33, 0],
      [659.25, 0, 783.99, 880, 0, 783.99, 1046.5, 0],
    ];
    while (this.nextMusicTime < this.context.currentTime + 0.32) {
      const step = this.nextMusicStep % 64;
      const chord = Math.floor(step / 16);
      const beat = step % 8;
      const time = this.nextMusicTime;
      if (beat % 2 === 0) {
        const arpeggioIndex = Math.floor(step / 2) % 4;
        this.musicNote(arpeggio[chord][arpeggioIndex], time, 0.18, 0.032, 'triangle');
      }
      const lead = melody[chord][beat];
      if (lead && (Math.floor(step / 8) % 2 === 0 || beat !== 6)) this.musicNote(lead, time, 0.13, 0.036, 'sine');
      if (beat === 0 || beat === 4) {
        this.musicNote(bass[chord], time, 0.3, 0.06, 'triangle');
        this.musicNote(105, time, 0.1, 0.065, 'sine', 50);
      }
      if (beat === 2 || beat === 6) this.musicNote(320, time, 0.04, 0.018, 'triangle', 190);
      if (step % 2 === 1) this.musicNote(1600, time, 0.022, 0.008, 'sine');
      this.nextMusicStep += 1;
      this.nextMusicTime += eighth;
    }
  }

  private pauseSoundtrack(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicBus?.gain.setTargetAtTime(0, this.context?.currentTime ?? 0, 0.04);
  }

  stopSoundtrack(): void { this.musicWanted = false; this.pauseSoundtrack(); }

  // Keep the older game call sites working while the soundtrack spans the whole visit.
  startAmbient(): void { this.startSoundtrack(); }
  stopAmbient(): void { /* The visit-level soundtrack continues through results and rematches. */ }

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
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => this.tone(frequency, 0.32, 0.13, 'triangle', index * 0.14));
  }

  lose(): void {
    [392, 293.66, 196].forEach((frequency, index) => this.tone(frequency, 0.34, 0.11, 'sine', index * 0.2));
  }

  result(): void {
    [880, 1174.66, 1567.98].forEach((frequency, index) => this.tone(frequency, 0.18, 0.08, 'sine', index * 0.08));
  }

  async dispose(): Promise<void> {
    this.stopSoundtrack();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.handleVisibility);
    await this.context?.close();
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.settings.unlocked = false;
    this.announce();
  }
}

export const playhouseAudio = new PlayhouseAudio();
