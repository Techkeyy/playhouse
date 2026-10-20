import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Wallet } from 'ethers';
import { makeBossProfile, validateResult } from './rules.js';

const directory = mkdtempSync(join(tmpdir(), 'playhouse-test-'));
delete process.env.DATABASE_URL;
process.env.PLAYHOUSE_DB_PATH = join(directory, 'test.sqlite');
const { closeStore, saveBattle, statsFor, historyFor, startBattle, finishBattle, saveMetadata, getCachedMetadata } = await import('./store.js');
const { normalizeMetadata, fetchGatewayMetadata, fetchFreshMetadata, resolveWithDurableFallback } = await import('./chain.js');
const { issueChallenge, verifyChallenge, requireOwner } = await import('./auth.js');

test('real-shape traits produce deterministic distinct boss rules', () => {
  const traits = [{ trait_type: 'Head', value: 'Wizard Hat' }, { trait_type: 'Aura', value: 'Fire' }, { trait_type: 'Eyes', value: 'Happy' }, { trait_type: 'Background', value: 'Fresh Green' }];
  const a = makeBossProfile(traits), b = makeBossProfile(traits);
  assert.deepEqual(a, b);
  assert.ok(a.attackFamilies.length >= 2);
  assert.equal(a.arenaTheme, 'fresh green');
  assert.match(makeBossProfile(traits, { level: 2 }).evolutionHint, /Level 2/);
});

test('observed featured NFT traits yield three different named signatures', () => {
  const observed = [
    { id: '330', traits: { Head: 'Dollar Cap', Aura: 'Yellow Aura', Eyes: 'Gradient visor', Background: 'Light Magenta' }, signature: 'coin-rain', family: 'falling' },
    { id: '1538', traits: { Head: 'Balls Cap', Body: 'Inmate', Eyes: 'Round Eye', Background: 'Soft Lavender' }, signature: 'cell-bars', family: 'sweep' },
    { id: '1053', traits: { Head: 'MMGA Cap', Aura: 'Light Purple', Eyes: 'Happy', Background: 'Fresh Green' }, signature: 'rally-orbit', family: 'orbit' }
  ];
  for (const sample of observed) {
    const traits = Object.entries(sample.traits).map(([trait_type, value]) => ({ trait_type, value }));
    const profile = makeBossProfile(traits);
    assert.equal(profile.signature.id, sample.signature, sample.id);
    assert.equal(profile.signature.family, sample.family, sample.id);
    assert.equal(profile.attackFamilies[0], sample.family, sample.id);
    assert.ok(profile.signature.source.includes(':'), sample.id);
    assert.ok(profile.signature.description.length > 30, sample.id);
    const alternate = profile.attackFamilies[1];
    const customized = makeBossProfile(traits, {}, { preferredAttack: alternate });
    assert.equal(customized.attackFamilies[0], alternate, sample.id);
    assert.ok(customized.attackFamilies.includes(profile.signature.family), sample.id);
  }
});

test('ordinary trait variants select inspectable motifs without token ID or random hash', () => {
  const cases = [
    [{ Head: 'Wizard Hat', Aura: 'Fire' }, 'spell-orbit', 'orbit', 'Head: Wizard Hat'],
    [{ Head: 'Russian Hat', Aura: 'Fire' }, 'frost-sweep', 'sweep', 'Head: Russian Hat'],
    [{ Head: 'Buttcoin Cap' }, 'token-rain', 'falling', 'Head: Buttcoin Cap'],
    [{ Head: 'Plain Cap', Eyes: 'Sleepy' }, 'headwear-burst', 'pulse', 'Head: Plain Cap'],
    [{ Body: 'Stripes' }, 'stripe-sweep', 'sweep', 'Body: Stripes'],
    [{ Eyes: 'Round Eye' }, 'round-gaze', 'orbit', 'Eyes: Round Eye']
  ];
  const signatures = cases.map(([values, id, family, source]) => {
    const traits = Object.entries(values).map(([trait_type, value]) => ({ trait_type, value }));
    const signature = makeBossProfile(traits).signature;
    assert.equal(signature.id, id);
    assert.equal(signature.family, family);
    assert.equal(signature.source, source);
    return signature;
  });
  assert.equal(new Set(signatures.map(s => s.family)).size, 4);
});

test('metadata validation rejects blank or invented NFT data', () => {
  const good = normalizeMetadata({ name: 'CHOG #1791', image: 'ipfs://bafytest/image.png', attributes: [{ trait_type: 'Head', value: 'Wizard Hat' }] }, '330', 'https://dweb.link/ipfs/');
  assert.equal(good.imageUrl, 'https://dweb.link/ipfs/bafytest/image.png');
  assert.equal(good.tokenId, '330');
  assert.throws(() => normalizeMetadata({ name: 'CHOG', image: 'x', attributes: [] }, '330'), /image/);
});

test('keyless gateway retrieval survives rate limits and timeouts', async () => {
  const attempted = [];
  const uri = 'ipfs://bafyverified/1797.json';
  const metadata = await fetchGatewayMetadata(uri, '336', async url => {
    attempted.push(url);
    if (url.includes('filebase.io')) return { name: 'CHOG #1797', image: 'ipfs://bafyverified/1797.png', attributes: [{ trait_type: 'Head', value: 'Dollar Cap' }] };
    if (url.includes('pinata.cloud')) throw new DOMException('Timed out', 'TimeoutError');
    throw new Error('metadata HTTP 429');
  });
  assert.equal(metadata.tokenId, '336');
  assert.equal(metadata.imageUrl, 'https://ipfs.filebase.io/ipfs/bafyverified/1797.png');
  assert.ok(attempted.some(url => url.includes('pinata.cloud')));
  assert.ok(attempted.some(url => url.includes('nftstorage.link')));
  assert.ok(attempted.some(url => url.includes('filebase.io')));
});

test('expired OpenSea fallback fails closed rather than producing NFT data', async () => {
  const deps = {
    readUri: async () => 'ipfs://bafyverified/1797.json',
    readGateways: async () => { throw new Error('all IPFS gateways unavailable'); },
    readOpenSea: async () => { throw new Error('OpenSea HTTP 401'); },
    hasOpenSeaKey: true
  };
  await assert.rejects(fetchFreshMetadata('336', deps), /OpenSea HTTP 401/);
  let openSeaCalled = false;
  await assert.rejects(fetchFreshMetadata('336', { ...deps, hasOpenSeaKey: false, readOpenSea: async () => { openSeaCalled = true; } }), /IPFS gateways unavailable/);
  assert.equal(openSeaCalled, false);
});

test('validated metadata survives provider failure while owner is refreshed', async () => {
  let currentOwner = '0x1111111111111111111111111111111111111111';
  const deps = { readOwner: async () => currentOwner, readFresh: async () => ({ tokenId: '330', name: 'CHOG #1791', imageUrl: 'https://example.com/chog.webp', traits: [{ trait_type: 'Head', value: 'Wizard Hat' }], tokenURI: 'ipfs://bafyverified/1791.json' }), readCached: getCachedMetadata, writeCached: saveMetadata, memory: new Map() };
  const first = await resolveWithDurableFallback('330', deps);
  assert.equal(first.owner, currentOwner);
  assert.equal((await getCachedMetadata('330')).name, 'CHOG #1791');
  currentOwner = '0x2222222222222222222222222222222222222222';
  const afterOutage = await resolveWithDurableFallback('330', { ...deps, readFresh: async () => { throw new Error('providers unavailable'); }, memory: new Map() });
  assert.equal(afterOutage.name, 'CHOG #1791');
  assert.equal(afterOutage.owner, currentOwner);
  await assert.rejects(resolveWithDurableFallback('330', { ...deps, readOwner: async () => { throw new Error('ownerOf failed'); }, readFresh: async () => { throw new Error('providers unavailable'); }, memory: new Map() }), /ownerOf failed/);
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
