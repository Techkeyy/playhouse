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
