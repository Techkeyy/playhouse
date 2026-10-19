// Read-only integration check. Run from the project root with:
//   node server/doctor-keyless.js
// This deliberately disables the optional OpenSea API path in this process.
const { fetchFreshMetadata, getOwner } = await import('./chain.js');
delete process.env.OPENSEA_API_KEY;
const id = process.argv[2] || '334';
const [data, owner] = await Promise.all([fetchFreshMetadata(id), getOwner(id)]);
if (!data.tokenURI.startsWith('ipfs://') || !data.traits.length || !/^0x[0-9a-f]{40}$/.test(owner)) {
  throw new Error('Keyless Chog metadata self-check failed');
}
console.log(JSON.stringify({ tokenId: data.tokenId, name: data.name, traitCount: data.traits.length, owner, tokenURI: data.tokenURI, openSeaKeyUsed: false }));
