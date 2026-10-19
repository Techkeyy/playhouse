import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Wallet } from 'ethers';
import { makeBossProfile, validateResult } from './rules.js';
import { normalizeMetadata } from './chain.js';

const directory = mkdtempSync(join(tmpdir(), 'playhouse-test-'));
delete process.env.DATABASE_URL;
process.env.PLAYHOUSE_DB_PATH = join(directory, 'test.sqlite');
const { closeStore, saveBattle, statsFor, historyFor, startBattle, finishBattle } = await import('./store.js');
const { issueChallenge, verifyChallenge, requireOwner } = await import('./auth.js');

test('real-shape traits produce deterministic distinct boss rules', () => {
  const traits = [{ trait_type: 'Head', value: 'Wizard Hat' }, { trait_type: 'Aura', value: 'Fire' }, { trait_type: 'Eyes', value: 'Happy' }, { trait_type: 'Background', value: 'Fresh Green' }];
  const a = makeBossProfile(traits), b = makeBossProfile(traits);
  assert.deepEqual(a, b);
  assert.ok(a.attackFamilies.length >= 2);
  assert.equal(a.arenaTheme, 'fresh green');
  assert.match(makeBossProfile(traits, { level: 2 }).evolutionHint, /Level 2/);
});

test('metadata validation rejects blank or invented NFT data', () => {
  const good = normalizeMetadata({ name: 'CHOG #1791', image: 'ipfs://bafytest/image.png', attributes: [{ trait_type: 'Head', value: 'Wizard Hat' }] }, '330', 'https://dweb.link/ipfs/');
  assert.equal(good.imageUrl, 'https://dweb.link/ipfs/bafytest/image.png');
  assert.equal(good.tokenId, '330');
  assert.throws(() => normalizeMetadata({ name: 'CHOG', image: 'x', attributes: [] }, '330'), /image/);
});

test('battle records persist and level derives from token history', async () => {
  const result = validateResult({ tokenId: '330', score: 42, survived: true, durationMs: 45000, hits: 1, dodges: 5 });
  for (let i = 0; i < 3; i++) await saveBattle(result);
  assert.deepEqual(await statsFor('330'), { battles: 3, wins: 3, losses: 0, bestScore: 42, level: 2 });
  assert.equal((await historyFor('330')).length, 3);
  assert.equal((await statsFor('331')).battles, 0);
});

test('battle session saves once and retry returns the original battle', async () => {
  const result = validateResult({ tokenId: '330', score: 55, survived: false, durationMs: 1000, hits: 2, dodges: 4 });
  await startBattle('test-session-1', '330', Date.now() - 2000);
  const first = await finishBattle('test-session-1', result);
  const retry = await finishBattle('test-session-1', result);
  assert.equal(first.existing, false);
  assert.equal(retry.existing, true);
  assert.equal(first.battle.id, retry.battle.id);
  assert.equal((await historyFor('330')).filter(x => x.id === first.battle.id).length, 1);
});

test('signed owner controls revoke immediately after simulated transfer', async () => {
  const owner = Wallet.createRandom(), nextOwner = Wallet.createRandom();
  const challenge = await issueChallenge(owner.address, '330');
  const signature = await owner.signMessage(challenge.message);
  let chainOwner = owner.address.toLowerCase();
  const auth = await verifyChallenge(challenge.nonce, signature, async () => chainOwner);
  assert.equal(await requireOwner(auth.token, '330', async () => chainOwner), chainOwner);
  chainOwner = nextOwner.address.toLowerCase();
  await assert.rejects(requireOwner(auth.token, '330', async () => chainOwner), /ownership has changed/);
  await assert.rejects(requireOwner(auth.token, '330', async () => chainOwner), /expired/);
});

test('challenge is one-use and rejects a wrong signer', async () => {
  const owner = Wallet.createRandom(), other = Wallet.createRandom();
  const challenge = await issueChallenge(owner.address, '330');
  const signature = await other.signMessage(challenge.message);
  await assert.rejects(verifyChallenge(challenge.nonce, signature, async () => owner.address.toLowerCase()), /does not match/);
  await assert.rejects(verifyChallenge(challenge.nonce, signature, async () => owner.address.toLowerCase()), /expired/);
});

test.after(async () => { await closeStore(); rmSync(directory, { recursive: true, force: true }); });
