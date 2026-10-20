import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayhouseAudio, clampAudioVolume } from './audio.ts';

test('volume stays within a safe range', () => {
  assert.equal(clampAudioVolume(-2), 0);
  assert.equal(clampAudioVolume(2), 1);
  assert.equal(clampAudioVolume(Number.NaN), 0.55);
});

test('sound calls remain silent until a browser user gesture unlocks audio', async () => {
  const audio = new PlayhouseAudio();
  assert.equal(audio.getSettings().unlocked, false);
  assert.equal(await audio.unlock(), false);
  audio.startAmbient();
  audio.attack('falling');
  audio.dodge();
  audio.hit();
  audio.win();
  audio.lose();
  audio.result();
  assert.equal(audio.getSettings().unlocked, false);
  audio.setVolume(1.7);
  audio.setMuted(true);
  assert.equal(audio.getSettings().volume, 1);
  assert.equal(audio.getSettings().muted, true);
  await audio.dispose();
});

test('one unlocked soundtrack starts, pauses on mute and hidden tab, and resumes', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  let voices = 0;
  const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    state = 'running';
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
    createOscillator() {
      voices += 1;
      return { frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {}, onended: null };
    }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }
  const listeners = new Map();
  globalThis.window = {
    AudioContext: FakeAudioContext,
    localStorage: { getItem() { return null; }, setItem() {} },
  };
  globalThis.document = {
    hidden: false,
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const audio = new PlayhouseAudio();
  try {
    assert.equal(await audio.unlock(), true);
    assert.ok(voices > 0, 'music is scheduled after the gesture');
    const firstVoices = voices;
    audio.startAmbient();
    assert.equal(voices, firstVoices, 'rematch does not create a second loop');
    audio.setMuted(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(voices, firstVoices, 'mute stops scheduling music');
    audio.setMuted(false);
    assert.ok(voices > firstVoices, 'unmute resumes music');
    const resumedVoices = voices;
    globalThis.document.hidden = true;
    listeners.get('visibilitychange')();
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(voices, resumedVoices, 'hidden tab stops scheduling music');
  } finally {
    await audio.dispose();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
