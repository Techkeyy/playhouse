# Playhouse: verified Chogathon requirements and integration facts

Checked 19 October 2026 against the live [Chogathon home page](https://chogathon.chog.xyz/) and its [dashboard](https://chogathon.chog.xyz/dashboard) (the dashboard's **How it works** panel). This sheet records event rules, not implementation promises. The local `hackathon-onboarding` skill supplied the confirmed/inferred/unknown format; the event site is the authority.

## Gates and scoring

| Status | Item | Evidence / consequence |
| --- | --- | --- |
| Confirmed | The Chog NFT must be essential. The homepage asks whether the experience would work the same way if the NFT were removed. | [Official challenge and judging sections](https://chogathon.chog.xyz/#challenge). Playhouse must make a specific real NFT's identity, traits, and ownership consequential to the playable loop. |
| Confirmed | Novelty **30%**, Fun **20%**, Retention **20%**, Clarity **15%**, Execution **15%**. | [Official judging section](https://chogathon.chog.xyz/#judging). These are the published weights; do not replace them with generic hackathon criteria. |
| Confirmed | Meaningful use of the **$CHOG fungible token** is optional and can earn bonus points. | [Official judging section](https://chogathon.chog.xyz/#judging). This is distinct from the required Chog NFT. Do not force a token payment into core play just to claim the bonus. |
| Confirmed | Solo or team; any category; vibecoding allowed. | [Official homepage](https://chogathon.chog.xyz/). |
| Confirmed | Submissions close **23 October 2026, 15:00 UTC** (16:00 Africa/Lagos). Registrations closed 11 October. | [Official dashboard](https://chogathon.chog.xyz/dashboard) → **How it works**, inspected live. The countdown is secondary; use the explicit UTC deadline. |
| Confirmed | One project per team. | Dashboard → **How it works**. It also says one application per person for registration. |
| Confirmed | Prize pool is planned at $15,000, with 50 qualifying winners; organizer may reduce to $10,000 if quality threshold is not met. | [Official prizes section](https://chogathon.chog.xyz/#prizes), including fine print. |

## Submission package

The [official homepage's submission section](https://chogathon.chog.xyz/#submit) asks for: project name, team members, Discord and X handles; what the experience does and what is new; why the Chog NFT is essential; a **working demo**, video **up to three minutes**, and simple testing instructions; repository, tech stack, and disclosure of pre-existing work; user feedback or usage gathered and next steps.

The dashboard's **How it works** panel adds the form constraints: **banner**, description of up to **8,000 characters**, demo video hosted on **YouTube or Google Drive** and kept to three minutes, and project links. Judges review the description, video, and links. The signed-out public Projects tab showed zero apps when checked; this is a point-in-time observation, not evidence that nobody else is building.

The homepage asks teams to **disclose any pre-existing work used**; the visible rules do not ban its use. The signed-out dashboard labels **Submit Project** with “Sign in to submit your project,” and its help panel says to register and sign in before submitting. Registrations closed 11 October. A registered account is therefore a practical submission dependency; no account access has been assumed or tested here.

## Chog and Monad facts relevant to Playhouse

| Status | Fact | Evidence / implementation implication |
| --- | --- | --- |
| Confirmed | **Chog Genesis** is an ERC-721 collection on **Monad mainnet**, with 1,969 items listed. | [Collection](https://opensea.io/collection/chog-genesis) and [example token](https://opensea.io/item/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/392). Read real tokens without owning them. |
| Confirmed | Genesis contract: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`. | The [example OpenSea item](https://opensea.io/item/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/392) embeds it; a [MonadScan mint transaction](https://monadscan.com/tx/0x730195964d4ec7cfba5b460cad486b5c35356d0edabc3b88506c4547c64bc6d9) identifies the same ERC-721 in logs. |
| Confirmed | Token display name and contract token ID can differ: the example item is named **CHOG #1853** while its onchain ID is **392**. | [Example token](https://opensea.io/item/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/392). Persist and authorize by `(chain, contract, tokenId)`, not by the image/name number. |
| Confirmed | OpenSea currently exposes trait categories Accessory, Aura, Background, Base, Body, Eyes, Form, Head, Mouth, Naked, Side, Skin, Tier. | [Collection trait sidebar](https://opensea.io/collection/chog-genesis). Read actual per-token metadata before writing ability mappings; do not infer specific values from category names. |
| Confirmed | [Monad](https://docs.monad.xyz/) is an EVM-compatible Layer 1; its [mainnet network page](https://docs.monad.xyz/developer-essentials/network-information) lists public RPC providers and rate limits. | Use an EVM `ownerOf(tokenId)` read for current ownership and `tokenURI(tokenId)` for metadata, subject to validating the live contract responses. |
| Unknown | Chogathon explicitly mandates mainnet versus testnet, a new smart contract, a particular wallet, or onchain battle-history storage. | The official home/dashboard inspected do not state these. Real Genesis is on mainnet, so production holder controls must verify **mainnet Genesis ownership** even if local/test NFTs cover automated tests. |
| Unknown | Official Chog Genesis metadata URI reliability, CORS/image hotlink behavior, and exact owner enumeration path. | Verify through real mainnet calls and rendered UI; OpenSea listing alone is insufficient proof of an app integration. |

## Existing products and positioning

- [Chog's own site](https://www.chog.xyz/) already offers a PFP maker, meme maker, NFT snapshot tool, and NFT messenger. Playhouse should foreground **playable combat with token-specific evolving bosses**, rather than a generic NFT profile page.
- [ChogHub](https://github.com/OluwapelumiAdebisi/ChogHub) is a public Chogathon project claiming NFT-keyed identity, agent, quests, and transferable reputation. Its public README describes a Monad **testnet** demo with mock Chogs. Playhouse's distinctive proof is a responsive arcade round against **real mainnet Genesis identities**, not the broad claim that history follows a token, which ChogHub also makes. Its shipped behavior was not independently tested here.
- No exhaustive competitor audit has been completed. The dashboard's public Projects tab showed zero submitted apps at inspection, but repository/social projects can exist outside it.

## Build review gates derived from the rules

1. **NFT essentiality:** Two genuine token IDs must produce visibly different boss behavior from real traits, and the boss record must remain keyed to the real token ID. A static image swap is inadequate evidence.
2. **Owner authorization:** An owner-only change needs a wallet proof and a fresh server-side `ownerOf` check at write time. A nonowner and a former owner after transfer must be rejected in controlled tests. Without a real holder test, call the production holder journey **implemented and simulated/tested**, not live-holder-verified.
3. **Fun and execution:** A judge should launch a complete round, understand controls and attacks, receive a score/result, and rematch. Check on the deployed site, not just localhost.
4. **Retention:** The per-token battle record and visible deterministic evolution must survive reloads; avoid claiming adaptive evolution if only difficulty scales with round number.
5. **Submission:** All live links resolve, a hosted ≤3-minute video shows the actual product, and testing instructions let a nonholder play at once. Include pre-existing work disclosure and any genuine feedback rather than inventing traction.
