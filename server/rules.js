const ATTACKS = ['pulse', 'falling', 'sweep', 'orbit'];
export function makeBossProfile(traits, stats = {}, settings = {}) {
  const byName = Object.fromEntries(traits.map(t => [String(t.trait_type).toLowerCase(), String(t.value).toLowerCase()]));
  const head = byName.head || 'wild';
  const aura = byName.aura || 'plain';
  const eyes = byName.eyes || 'keen';
  const background = byName.background || 'void';
  const hash = str => [...str].reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 0);
  const first = ATTACKS[hash(head) % ATTACKS.length];
  const second = ATTACKS[(hash(aura + eyes) + 1) % ATTACKS.length];
  const preferred = settings.preferredAttack;
  const attacks = [...new Set([first, second, ATTACKS[(hash(background) + 2) % ATTACKS.length]])];
  if (preferred && attacks.includes(preferred)) attacks.unshift(preferred);
  return { title: `${aura.replace(/\b\w/g, m => m.toUpperCase())} ${head.replace(/\b\w/g, m => m.toUpperCase())}`, attackFamilies: [...new Set(attacks)].slice(0, 3), arenaTheme: background, evolutionHint: Number(stats.level || 1) > 1 ? `Level ${stats.level}: faster patterns from its battle history` : 'Fight this Chog to shape its next level' };
}
export function validateResult(input) {
  const tokenId = String(input.tokenId ?? '');
  if (!/^\d{1,6}$/.test(tokenId) || BigInt(tokenId) < 1n) throw new Error('Invalid token ID');
  const score = Number(input.score), durationMs = Number(input.durationMs), hits = Number(input.hits), dodges = Number(input.dodges);
  if (![score, durationMs, hits, dodges].every(Number.isInteger) || score < 0 || score > 100_000 || durationMs < 1000 || durationMs > 60_000 || hits < 0 || hits > 100 || dodges < 0 || dodges > 500) throw new Error('Invalid battle result');
  if (typeof input.survived !== 'boolean') throw new Error('Invalid survival result');
  if (input.survived && durationMs < 44_000) throw new Error('Survival requires a full round');
  return { tokenId, score, survived: input.survived, durationMs, hits, dodges };
}
