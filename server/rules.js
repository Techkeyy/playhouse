const ATTACKS = ['pulse', 'falling', 'sweep', 'orbit'];
const titled = value => value.replace(/\b\w/g, m => m.toUpperCase());
const familyFromEyes = value => value.includes('visor') ? 'sweep' : value.includes('round') ? 'falling' : 'pulse';
const familyFromAura = value => value.includes('purple') || value.includes('violet') ? 'orbit' : value.includes('yellow') ? 'falling' : value.includes('fire') ? 'pulse' : 'sweep';
const familyFromBackground = value => value.includes('green') ? 'falling' : value.includes('lavender') ? 'orbit' : value.includes('magenta') ? 'pulse' : 'sweep';

export function signatureFromTraits(byName) {
  const head = byName.head || '', body = byName.body || '', eyes = byName.eyes || '', aura = byName.aura || '';
  if (head.includes('dollar')) return { id: 'coin-rain', family: 'falling', name: 'Coin Rain', source: `Head: ${titled(head)}`, description: 'Staggered coin columns fall where you stand. Step out before the warning lines close.' };
  if (body.includes('inmate')) return { id: 'cell-bars', family: 'sweep', name: 'Cellblock Sweep', source: `Body: ${titled(body)}`, description: 'Bars sweep across the arena in alternating lanes. Find a gap and change lanes.' };
  if (head.includes('mmga')) return { id: 'rally-orbit', family: 'orbit', name: 'Rally Orbit', source: `Head: ${titled(head)}`, description: 'A rotating ring of stars pushes outward. Follow the spaces between them.' };
  if (head.includes('wizard')) return { id: 'spell-orbit', family: 'orbit', name: 'Spell Orbit', source: `Head: ${titled(head)}`, description: 'Arcane shots spiral outward from the boss. Slip between the rotating paths.' };
  if (head.includes('russian')) return { id: 'frost-sweep', family: 'sweep', name: 'Frost Sweep', source: `Head: ${titled(head)}`, description: 'Cold bars cross the arena in alternating lanes. Shift toward an open lane.' };
  if (head.includes('coin')) return { id: 'token-rain', family: 'falling', name: 'Token Rain', source: `Head: ${titled(head)}`, description: 'Token columns fall from above. Leave the marked columns before they land.' };
  if (aura.includes('fire')) return { id: 'ember-burst', family: 'pulse', name: 'Ember Burst', source: `Aura: ${titled(aura)}`, description: 'A fan of embers aims at your last position. Keep moving after the warning.' };
  if (eyes.includes('visor')) return { id: 'visor-scan', family: 'sweep', name: 'Visor Scan', source: `Eyes: ${titled(eyes)}`, description: 'Scanning lines cross the arena. Move into the open lane.' };
  if (eyes.includes('happy')) return { id: 'joy-pulse', family: 'pulse', name: 'Joy Pulse', source: `Eyes: ${titled(eyes)}`, description: 'A bright fan of shots locks on to your position. Dodge after the warning.' };
  if (body.includes('stripe')) return { id: 'stripe-sweep', family: 'sweep', name: 'Stripe Sweep', source: `Body: ${titled(body)}`, description: 'Striped bars sweep across the floor. Change lanes as their warning paths appear.' };
  if (eyes.includes('round')) return { id: 'round-gaze', family: 'orbit', name: 'Round Gaze', source: `Eyes: ${titled(eyes)}`, description: 'A ring of watchful shots spreads from the boss. Pass through the gaps.' };
  if (aura.includes('purple') || aura.includes('violet') || aura.includes('rose')) return { id: 'aura-spiral', family: 'orbit', name: 'Aura Spiral', source: `Aura: ${titled(aura)}`, description: 'Aura sparks spiral outward. Follow the moving gaps in the ring.' };
  if (aura.includes('yellow') || aura.includes('gold')) return { id: 'gold-rain', family: 'falling', name: 'Golden Rain', source: `Aura: ${titled(aura)}`, description: 'Bright columns drop through the arena. Step away from their warning lines.' };
  if (head) return { id: 'headwear-burst', family: 'pulse', name: 'Headwear Burst', source: `Head: ${titled(head)}`, description: 'A spreading fan tracks your last position. Move after it takes aim.' };
  if (body) return { id: 'body-sweep', family: 'sweep', name: 'Body Sweep', source: `Body: ${titled(body)}`, description: 'Alternating lanes sweep across the arena. Find the gap between paths.' };
  if (eyes) return { id: 'eye-orbit', family: 'orbit', name: 'Eye Orbit', source: `Eyes: ${titled(eyes)}`, description: 'A ring of shots expands from the boss. Move between its paths.' };
  const [sourceKey, sourceValue] = Object.entries(byName).find(([, value]) => value) || ['background', 'unknown'];
  return { id: 'trait-rain', family: 'falling', name: 'Trait Rain', source: `${titled(sourceKey)}: ${titled(sourceValue)}`, description: 'Marked columns fall from above. Step into an open lane.' };
}
export function makeBossProfile(traits, stats = {}, settings = {}) {
  const byName = Object.fromEntries(traits.map(t => [String(t.trait_type).toLowerCase(), String(t.value).toLowerCase()]));
  const head = byName.head || 'wild';
  const aura = byName.aura || 'plain';
  const eyes = byName.eyes || 'keen';
  const background = byName.background || 'void';
  const signature = signatureFromTraits(byName);
  const preferred = settings.preferredAttack;
  const attacks = [...new Set([signature.family, familyFromEyes(eyes), familyFromAura(aura), familyFromBackground(background)])].slice(0, 3);
  if (attacks.length < 2) attacks.push(ATTACKS.find(f => !attacks.includes(f)));
  if (preferred && attacks.includes(preferred)) attacks.unshift(preferred);
  return { title: `${titled(aura)} ${titled(head)}`, signature, attackFamilies: [...new Set(attacks)].slice(0, 3), arenaTheme: background, evolutionHint: Number(stats.level || 1) > 1 ? `Level ${stats.level}: faster patterns from its battle history` : 'Fight this Chog to shape its next level' };
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
