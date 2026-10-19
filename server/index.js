import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChogMetadata, doctor } from './chain.js';
import { ready, health, statsFor, historyFor, settingsFor, saveSettings, startBattle, finishBattle } from './store.js';
import { makeBossProfile, validateResult } from './rules.js';
import { issueChallenge, verifyChallenge, requireOwner } from './auth.js';

const PORT = Number(process.env.PORT || 8787);
const FEATURED = ['330', '1538', '1053', '973', '846', '1552'];
const DIST = resolve('dist');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 10_000) throw new Error('Request too large');
  }
  try { return JSON.parse(data || '{}'); } catch { throw new Error('Invalid JSON'); }
}
function tokenId(value) {
  if (!/^\d{1,6}$/.test(value) || BigInt(value) < 1n) throw new Error('Invalid token ID');
  return String(BigInt(value));
}
async function chog(id) {
  const metadata = await getChogMetadata(id);
  const [stats, settings] = await Promise.all([statsFor(id), settingsFor(id)]);
  return { tokenId: id, name: metadata.name, imageUrl: metadata.imageUrl, traits: metadata.traits, owner: metadata.owner, bossProfile: makeBossProfile(metadata.traits, stats, settings), stats };
}

function staticResponse(pathname, res) {
  if (!existsSync(DIST)) return false;
  const file = resolve(DIST, `.${pathname === '/' ? '/index.html' : pathname}`);
  const target = file.startsWith(DIST + '\\') || file.startsWith(DIST + '/') ? file : join(DIST, 'index.html');
  const actual = existsSync(target) ? target : join(DIST, 'index.html');
  if (!existsSync(actual)) return false;
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }[extname(actual)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': actual.endsWith('index.html') ? 'no-store' : 'public, max-age=3600' });
  res.end(readFileSync(actual));
  return true;
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'POST' && process.env.PLAYHOUSE_APP_ORIGIN && req.headers.origin && req.headers.origin !== process.env.PLAYHOUSE_APP_ORIGIN) {
      return json(res, 403, { error: 'Request came from a different site.' });
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, database: await health() });
    if (req.method === 'GET' && url.pathname === '/api/doctor') {
      if (process.env.NODE_ENV === 'production') return json(res, 404, { error: 'Not found' });
      return json(res, 200, await doctor());
    }
    if (req.method === 'GET' && url.pathname === '/api/chogs') {
      const limit = Math.min(6, Math.max(1, Number(url.searchParams.get('limit') || 6)));
      const results = await Promise.allSettled(FEATURED.slice(0, limit).map(chog));
      const chogs = results.filter(x => x.status === 'fulfilled').map(x => x.value);
      if (!chogs.length) return json(res, 503, { error: 'Chog metadata is temporarily unavailable. Try again shortly.' });
      return json(res, 200, { chogs });
    }
    const match = url.pathname.match(/^\/api\/chogs\/(\d+)$/);
    if (req.method === 'GET' && match) {
      const id = tokenId(match[1]);
      return json(res, 200, { chog: await chog(id), history: await historyFor(id) });
    }
    if (req.method === 'POST' && url.pathname === '/api/battles') {
      const input = await body(req), result = validateResult(input);
      await getChogMetadata(result.tokenId); // Real contract and metadata required; never save a synthetic boss.
      const { battle, existing } = await finishBattle(String(input.battleSessionId || ''), result);
      return json(res, existing ? 200 : 201, { battle, chog: await chog(result.tokenId) });
    }
    if (req.method === 'POST' && url.pathname === '/api/battles/start') {
      const input = await body(req), id = tokenId(String(input.tokenId || ''));
      await getChogMetadata(id);
      const battleSessionId = randomUUID(), startedAt = Date.now();
      await startBattle(battleSessionId, id, startedAt);
      return json(res, 201, { battleSessionId, startedAt });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/challenge') {
      const input = await body(req), id = tokenId(String(input.tokenId || ''));
      await getChogMetadata(id);
      return json(res, 200, await issueChallenge(input.address, id));
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/verify') {
      const input = await body(req);
      return json(res, 200, await verifyChallenge(input.nonce, input.signature));
    }
    const settingsMatch = url.pathname.match(/^\/api\/chogs\/(\d+)\/settings$/);
    if (req.method === 'POST' && settingsMatch) {
      const id = tokenId(settingsMatch[1]), input = await body(req);
      await requireOwner(String(req.headers.authorization || '').replace(/^Bearer /i, ''), id);
      const profile = (await chog(id)).bossProfile;
      if (!profile.attackFamilies.includes(input.preferredAttack)) throw new Error('Attack is not available to this Chog');
      await saveSettings(id, input.preferredAttack);
      return json(res, 200, { chog: await chog(id) });
    }
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      if (staticResponse(url.pathname, res)) return;
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    const message = String(error?.message || 'Unexpected error');
    const status = /metadata unavailable|fetch failed|timeout/i.test(message) ? 503 : /ownership|own this Chog|session|signature|expired/.test(message) ? 403 : /Invalid|not available|too large/.test(message) ? 400 : 502;
    if (status === 502) console.error(error);
    return json(res, status, { error: status === 502 ? 'Unable to read Chog data right now. Please retry.' : message });
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await ready;
  server.listen(PORT, () => console.log(`Playhouse API listening on ${PORT}`));
}
