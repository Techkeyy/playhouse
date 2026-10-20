import { Contract, JsonRpcProvider } from 'ethers';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { getCachedMetadata, saveMetadata } from './store.js';

if (existsSync('.env.local')) loadEnvFile('.env.local');

export const CHOG_CONTRACT = '0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763';
export const CHAIN_ID = 143;
const ABI = ['function name() view returns (string)', 'function ownerOf(uint256) view returns (address)', 'function tokenURI(uint256) view returns (string)'];
const customGateway = process.env.IPFS_GATEWAY_URL;
if (customGateway && !/^https:\/\/[^\s/]+(?:\/[^\s]*)?\/ipfs\/$/.test(customGateway)) throw new Error('IPFS_GATEWAY_URL must be an HTTPS URL ending in /ipfs/');
const gateways = [...new Set([
  customGateway,
  'https://ipfs.filebase.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://ipfs.io/ipfs/'
].filter(Boolean))];

const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz', CHAIN_ID, { staticNetwork: true });
const contract = new Contract(CHOG_CONTRACT, ABI, provider);
const cache = new Map();

function gatewayUrls(uri) {
  if (uri.startsWith('ipfs://')) {
    const path = uri.slice(7).replace(/^ipfs\//, '');
    if (!/^[a-zA-Z0-9]+(?:\/[a-zA-Z0-9._~-]+)*$/.test(path)) throw new Error('Invalid tokenURI path');
    return gateways.map(g => g + path);
  }
  if (uri.startsWith('https://')) return [uri];
  throw new Error('Unsupported tokenURI scheme');
}

async function fetchJson(url) {
  const signal = AbortSignal.timeout(12_000);
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`metadata HTTP ${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > 100_000) throw new Error('Metadata too large');
  const text = await response.text();
  if (text.length > 100_000) throw new Error('Metadata too large');
  return JSON.parse(text);
}

async function fetchOpenSea(tokenId) {
  if (!process.env.OPENSEA_API_KEY) throw new Error('OpenSea key unavailable');
  const url = `https://api.opensea.io/api/v2/chain/monad/contract/${CHOG_CONTRACT}/nfts/${tokenId}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(6500), headers: { Accept: 'application/json', 'x-api-key': process.env.OPENSEA_API_KEY } });
  if (!response.ok) throw new Error(`OpenSea HTTP ${response.status}`);
  const raw = await response.json();
  if (!raw?.nft || typeof raw.nft !== 'object') throw new Error('OpenSea NFT response missing');
  return normalizeMetadata({ name: raw.nft.name, image: raw.nft.image_url, attributes: raw.nft.traits }, tokenId, gateways[0]);
}

function imageUrl(value, gateway = gateways[0]) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('ipfs://')) {
    const path = value.slice(7).replace(/^ipfs\//, '');
    return /^[a-zA-Z0-9]+(?:\/[a-zA-Z0-9._~-]+)*$/.test(path) ? `${gateway}${path}` : null;
  }
  return /^https:\/\//.test(value) ? value : null;
}

export function normalizeMetadata(raw, tokenId, gateway) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid NFT metadata');
  if (typeof raw.name !== 'string' || !raw.name.trim()) throw new Error('NFT metadata has no name');
  const image = imageUrl(raw.image || raw.image_url, gateway);
  if (!image) throw new Error('NFT metadata has no supported image');
  if (!Array.isArray(raw.attributes) || raw.attributes.length === 0) throw new Error('NFT metadata has no traits');
  const traits = raw.attributes.filter(a => a && typeof a.trait_type === 'string' && ['string', 'number'].includes(typeof a.value))
    .map(a => ({ trait_type: a.trait_type.slice(0, 80), value: String(a.value).slice(0, 120) }));
  if (traits.length === 0) throw new Error('NFT metadata has no valid traits');
  return { tokenId: String(tokenId), name: raw.name.slice(0, 120), imageUrl: image, traits };
}

export async function getOwner(tokenId) {
  return (await contract.ownerOf(BigInt(tokenId))).toLowerCase();
}

export async function fetchGatewayMetadata(uri, key, fetcher = fetchJson) {
  const attempts = gatewayUrls(uri).map(async url => {
    const gateway = url.includes('/ipfs/') ? url.slice(0, url.indexOf('/ipfs/') + 6) : gateways[0];
    return normalizeMetadata(await fetcher(url), key, gateway);
  });
  return Promise.any(attempts);
}

export async function fetchFreshMetadata(key, {
  readUri = id => contract.tokenURI(BigInt(id)),
  readGateways = fetchGatewayMetadata,
  readOpenSea = fetchOpenSea,
  hasOpenSeaKey = Boolean(process.env.OPENSEA_API_KEY)
} = {}) {
  const uri = await readUri(key);
  try {
    return { ...(await readGateways(uri, key)), tokenURI: uri };
  } catch (gatewayError) {
    if (!hasOpenSeaKey) throw gatewayError;
    return { ...(await readOpenSea(key)), tokenURI: uri };
  }
}

export async function resolveWithDurableFallback(tokenId, { readOwner, readFresh, readCached, writeCached, memory = new Map() }) {
  const key = String(tokenId);
  const owner = (await readOwner(key)).toLowerCase(); // Never cache ownership; transfer must take effect immediately.
  const existing = memory.get(key);
  if (existing && existing.expires > Date.now()) return { ...existing.data, owner };
  let data;
  try {
    data = await readFresh(key);
    const normalized = normalizeMetadata({ name: data.name, image: data.imageUrl, attributes: data.traits }, key);
    if (typeof data.tokenURI !== 'string' || !/^(ipfs:\/\/|https:\/\/)/.test(data.tokenURI)) throw new Error('Invalid tokenURI');
    data = { ...normalized, tokenURI: data.tokenURI };
    try { await writeCached(data); } catch (error) { console.error('Could not persist validated Chog metadata:', error.message); }
  } catch {
    const cached = await readCached(key);
    if (!cached || cached.tokenId !== key || typeof cached.tokenURI !== 'string' || !/^(ipfs:\/\/|https:\/\/)/.test(cached.tokenURI)) throw new Error(`Chog metadata unavailable for token ${key}`);
    const normalized = normalizeMetadata({ name: cached.name, image: cached.imageUrl, attributes: cached.traits }, key);
    data = { ...normalized, tokenURI: cached.tokenURI };
  }
  const result = { ...data, owner };
  memory.set(key, { data, expires: Date.now() + 15 * 60_000 });
  return result;
}

export async function getChogMetadata(tokenId) {
  return resolveWithDurableFallback(tokenId, { readOwner: getOwner, readFresh: fetchFreshMetadata, readCached: getCachedMetadata, writeCached: saveMetadata, memory: cache });
}

export async function doctor() {
  const [network, name, sampleOwner, uri] = await Promise.all([
    provider.getNetwork(), contract.name(), getOwner('330'), contract.tokenURI(330n)
  ]);
  if (Number(network.chainId) !== CHAIN_ID || name !== 'Chog Genesis' || !uri.startsWith('ipfs://')) {
    throw new Error('Monad or Chog contract verification failed');
  }
  const metadata = await getChogMetadata('330');
  return { chainId: Number(network.chainId), contract: CHOG_CONTRACT, name, tokenId: '330', sampleOwner, tokenURI: uri, metadata };
}
