import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { dirname, resolve } from 'node:path';

if (existsSync('.env.local')) loadEnvFile('.env.local');
const postgres = Boolean(process.env.DATABASE_URL);
let sqlite, pool;

export const ready = (async () => {
  if (postgres) {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
    pool.on('error', error => console.error('PostgreSQL connection error:', error.message));
    await pool.query(`CREATE TABLE IF NOT EXISTS battles(id BIGSERIAL PRIMARY KEY, token_id TEXT NOT NULL, score INTEGER NOT NULL, survived INTEGER NOT NULL, duration_ms INTEGER NOT NULL, hits INTEGER NOT NULL, dodges INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_battles_token ON battles(token_id, id DESC);
      CREATE TABLE IF NOT EXISTS owner_settings(token_id TEXT PRIMARY KEY, preferred_attack TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS auth_challenges(nonce TEXT PRIMARY KEY, address TEXT NOT NULL, token_id TEXT NOT NULL, expires_at BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, address TEXT NOT NULL, token_id TEXT NOT NULL, expires_at BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS battle_sessions(id TEXT PRIMARY KEY, token_id TEXT NOT NULL, started_at BIGINT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, battle_id BIGINT);`);
  } else {
    const path = resolve(process.env.PLAYHOUSE_DB_PATH || 'data/playhouse.sqlite');
    mkdirSync(dirname(path), { recursive: true });
    sqlite = new DatabaseSync(path);
    sqlite.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS battles(id INTEGER PRIMARY KEY AUTOINCREMENT, token_id TEXT NOT NULL, score INTEGER NOT NULL, survived INTEGER NOT NULL, duration_ms INTEGER NOT NULL, hits INTEGER NOT NULL, dodges INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_battles_token ON battles(token_id, id DESC);
      CREATE TABLE IF NOT EXISTS owner_settings(token_id TEXT PRIMARY KEY, preferred_attack TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS auth_challenges(nonce TEXT PRIMARY KEY, address TEXT NOT NULL, token_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, address TEXT NOT NULL, token_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS battle_sessions(id TEXT PRIMARY KEY, token_id TEXT NOT NULL, started_at INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0);`);
    try { sqlite.exec('ALTER TABLE battle_sessions ADD COLUMN battle_id INTEGER'); } catch (error) { if (!String(error.message).includes('duplicate column name')) throw error; }
  }
})();

function pgSql(sql) { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); }
async function rows(sql, params = [], client = pool) {
  await ready;
  if (postgres) return (await (client || pool).query(pgSql(sql), params)).rows;
  return sqlite.prepare(sql).all(...params);
}
async function exec(sql, params = [], client = pool) {
  await ready;
  if (postgres) return (client || pool).query(pgSql(sql), params);
  return sqlite.prepare(sql).run(...params);
}
const battleSql = 'SELECT id, token_id, score, survived, duration_ms, hits, dodges, created_at FROM battles WHERE id = ?';
function battleShape(x) { return x && { id: Number(x.id), tokenId: x.token_id, score: Number(x.score), survived: Boolean(x.survived), durationMs: Number(x.duration_ms), hits: Number(x.hits), dodges: Number(x.dodges), createdAt: x.created_at }; }

export async function health() { await rows('SELECT 1 AS one'); return true; }
export async function closeStore() { await ready; if (postgres) await pool.end(); else sqlite.close(); }
export async function statsFor(tokenId) {
  const [x] = await rows('SELECT COUNT(*) AS battles, SUM(survived) AS wins, MAX(score) AS best_score FROM battles WHERE token_id = ?', [tokenId]);
  const battles = Number(x.battles || 0), wins = Number(x.wins || 0);
  return { battles, wins, losses: battles - wins, bestScore: Number(x.best_score || 0), level: 1 + Math.floor(battles / 3) };
}
export async function historyFor(tokenId) { return (await rows('SELECT id, token_id, score, survived, duration_ms, hits, dodges, created_at FROM battles WHERE token_id = ? ORDER BY id DESC LIMIT 20', [tokenId])).map(battleShape); }
export async function battleById(id) { return battleShape((await rows(battleSql, [id]))[0]); }
export async function saveBattle(result, client = pool) {
  await ready;
  let id;
  if (postgres) {
    client ||= pool;
    const x = await client.query('INSERT INTO battles(token_id,score,survived,duration_ms,hits,dodges) VALUES($1,$2,$3,$4,$5,$6) RETURNING id', [result.tokenId, result.score, result.survived ? 1 : 0, result.durationMs, result.hits, result.dodges]);
    id = x.rows[0].id;
    return battleShape((await client.query(pgSql(battleSql), [id])).rows[0]);
  }
  id = sqlite.prepare('INSERT INTO battles(token_id,score,survived,duration_ms,hits,dodges) VALUES(?,?,?,?,?,?)').run(result.tokenId, result.score, result.survived ? 1 : 0, result.durationMs, result.hits, result.dodges).lastInsertRowid;
  return battleShape(sqlite.prepare(battleSql).get(id));
}
export async function settingsFor(tokenId) { const x = (await rows('SELECT preferred_attack FROM owner_settings WHERE token_id = ?', [tokenId]))[0]; return x ? { preferredAttack: x.preferred_attack } : {}; }
export async function saveSettings(tokenId, preferredAttack) { await exec('INSERT INTO owner_settings(token_id, preferred_attack) VALUES(?,?) ON CONFLICT(token_id) DO UPDATE SET preferred_attack=excluded.preferred_attack, updated_at=CURRENT_TIMESTAMP', [tokenId, preferredAttack]); }

export async function putChallenge(nonce, address, tokenId, expiresAt) { await exec('INSERT INTO auth_challenges(nonce,address,token_id,expires_at) VALUES(?,?,?,?)', [nonce, address, tokenId, expiresAt]); }
export async function consumeChallenge(nonce) {
  await ready;
  if (postgres) return (await pool.query('DELETE FROM auth_challenges WHERE nonce=$1 RETURNING *', [nonce])).rows[0];
  const x = sqlite.prepare('SELECT * FROM auth_challenges WHERE nonce = ?').get(nonce);
  sqlite.prepare('DELETE FROM auth_challenges WHERE nonce = ?').run(nonce);
  return x;
}
export async function putSession(token, address, tokenId, expiresAt) { await exec('INSERT INTO sessions(token,address,token_id,expires_at) VALUES(?,?,?,?)', [token, address, tokenId, expiresAt]); }
export async function getSession(token) { return (await rows('SELECT * FROM sessions WHERE token = ?', [token]))[0]; }
export async function deleteSession(token) { await exec('DELETE FROM sessions WHERE token = ?', [token]); }
export async function startBattle(id, tokenId, startedAt) { await exec('INSERT INTO battle_sessions(id,token_id,started_at) VALUES(?,?,?)', [id, tokenId, startedAt]); }

export async function finishBattle(sessionId, result) {
  await ready;
  if (postgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: found } = await client.query('SELECT * FROM battle_sessions WHERE id=$1 FOR UPDATE', [sessionId]);
      const x = found[0];
      if (!x || x.token_id !== result.tokenId) throw new Error('Battle session is missing or already used');
      if (x.completed) { const battle = battleShape((await client.query(pgSql(battleSql), [x.battle_id])).rows[0]); await client.query('COMMIT'); return { battle, existing: true }; }
      verifyTiming(x, result);
      const battle = await saveBattle(result, client);
      await client.query('UPDATE battle_sessions SET completed=1,battle_id=$1 WHERE id=$2', [battle.id, sessionId]);
      await client.query('COMMIT');
      return { battle, existing: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const x = sqlite.prepare('SELECT * FROM battle_sessions WHERE id = ?').get(sessionId);
    if (!x || x.token_id !== result.tokenId) throw new Error('Battle session is missing or already used');
    if (x.completed) { const battle = battleShape(sqlite.prepare(battleSql).get(x.battle_id)); sqlite.exec('COMMIT'); return { battle, existing: true }; }
    verifyTiming(x, result);
    const inserted = sqlite.prepare('INSERT INTO battles(token_id,score,survived,duration_ms,hits,dodges) VALUES(?,?,?,?,?,?)').run(result.tokenId, result.score, result.survived ? 1 : 0, result.durationMs, result.hits, result.dodges);
    const battle = battleShape(sqlite.prepare(battleSql).get(inserted.lastInsertRowid));
    sqlite.prepare('UPDATE battle_sessions SET completed=1,battle_id=? WHERE id=?').run(battle.id, sessionId);
    sqlite.exec('COMMIT');
    return { battle, existing: false };
  } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
}
function verifyTiming(x, result) {
  const elapsed = Date.now() - Number(x.started_at);
  if (elapsed < Math.max(1000, result.durationMs - 2500) || elapsed > 75_000) throw new Error('Battle timing does not match this round');
}
