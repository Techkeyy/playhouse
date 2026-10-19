import { randomBytes } from 'node:crypto';
import { isAddress, verifyMessage } from 'ethers';
import { putChallenge, consumeChallenge, putSession, getSession, deleteSession } from './store.js';
import { getOwner } from './chain.js';

export async function issueChallenge(address, tokenId) {
  if (!isAddress(address)) throw new Error('Invalid wallet address');
  const nonce = randomBytes(24).toString('hex');
  const normalized = address.toLowerCase();
  await putChallenge(nonce, normalized, tokenId, Date.now() + 5 * 60_000);
  return { nonce, message: messageFor(normalized, tokenId, nonce) };
}

function messageFor(address, tokenId, nonce) {
  return `Playhouse owner controls\nApp: ${process.env.PLAYHOUSE_APP_ORIGIN || 'http://localhost:5173'}\nChain ID: 143\nWallet: ${address}\nChog contract: 0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763\nChog token ID: ${tokenId}\nNonce: ${nonce}\nExpires in 5 minutes`;
}

export async function verifyChallenge(nonce, signature, ownerReader = getOwner) {
  const challenge = await consumeChallenge(nonce);
  if (!challenge || challenge.expires_at < Date.now()) throw new Error('Challenge expired');
  const message = messageFor(challenge.address, challenge.token_id, nonce);
  let signer;
  try { signer = verifyMessage(message, signature).toLowerCase(); } catch { throw new Error('Invalid wallet signature'); }
  if (signer !== challenge.address) throw new Error('Signature does not match wallet');
  if ((await ownerReader(challenge.token_id)) !== signer) throw new Error('Wallet does not currently own this Chog');
  const token = randomBytes(32).toString('hex');
  await putSession(token, signer, challenge.token_id, Date.now() + 60 * 60_000);
  return { token, address: signer, tokenId: challenge.token_id, expiresAt: Date.now() + 60 * 60_000 };
}

export async function requireOwner(sessionToken, tokenId, ownerReader = getOwner) {
  const session = await getSession(sessionToken);
  if (!session || session.expires_at < Date.now() || session.token_id !== tokenId) throw new Error('Owner session expired');
  if ((await ownerReader(tokenId)) !== session.address) {
    await deleteSession(sessionToken);
    throw new Error('Chog ownership has changed');
  }
  return session.address;
}
