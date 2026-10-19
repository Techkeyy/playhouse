# Playhouse

**Challenge a real Chog Genesis NFT as an arcade boss.** Anyone can choose a Chog and try to survive a 45-second dodge round. The boss draws its identity and traits from its Monad NFT; completed rounds contribute to a per-token battle record.

**[Play the live game](https://playhouse-chogathon.onrender.com/)** · **[Source code](https://github.com/Techkeyy/playhouse)**

Built for [Chogathon 2026](https://chogathon.chog.xyz/). The event requires Chog NFTs to be essential, and judges novelty (30%), fun (20%), retention (20%), clarity (15%), and execution (15%).

**Current verification status:** local type check, build, **8 game tests and 7 server tests** pass. The deployed browser loaded six real Chogs, played token **330** (CHOG #1791), saved a 636-point battle, and showed that result after reload. A custom lookup loaded token **331** (CHOG #1792). Production health reported PostgreSQL storage, and battle ID 4 survived a redeploy. A signed nonowner was rejected by a local HTTP ownership check. **A real Genesis holder has not tested owner controls.** A demo video is still pending.

## Why this exists

NFT artwork and trait lists are usually things you view. Playhouse makes a Chog something you **face**. Its real token ID, traits, battle record, and current owner affect the experience. Visitors can play without owning an NFT. A genuine holder can use the owner controls if their wallet passes a current ownership check.

The [Chog site](https://www.chog.xyz/) already has a PFP maker, meme maker, snapshot tool, and messenger. [ChogHub](https://github.com/OluwapelumiAdebisi/ChogHub) explores an AI agent and quests tied to a Chog. Playhouse concentrates on a quick, replayable arcade fight against a token-specific boss.

## What it does

1. **Loads** featured Chog Genesis tokens from the Monad mainnet contract. The API reads `ownerOf` and `tokenURI`, then fetches NFT metadata and traits from IPFS gateways or an optional OpenSea API fallback. Production browser testing loaded token **330** as **CHOG #1791**, with 12 traits and an onchain owner, and also loaded nonfeatured token **331**.
2. **Builds** a boss profile from those traits using deterministic rules, including attack families and a title.
3. **Runs** a 45-second canvas survival round with keyboard or pointer controls, warning telegraphs, hit points, and a score. The real NFT art becomes an animated arena sprite; attack pressure rises at 15 and 30 seconds.
4. **Records** the result in battle history keyed by the onchain token ID, using local SQLite or PostgreSQL when `DATABASE_URL` is set. The number of recorded battles raises the boss level, which changes attack speed.
5. **Checks** wallet signatures and current `ownerOf` before an owner-only attack preference change. This flow must be tested with a genuine Chog holder before claiming it has been exercised end to end on mainnet.

**Identity detail:** An NFT's displayed name number can differ from its onchain ID. For example, [CHOG #1853 is token ID 392](https://opensea.io/item/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/392). Playhouse keys records and authorization by the contract token ID.

## Run locally

Use Node.js 24 (the development machine was inspected with Node **v24.14.0**) and npm. The app needs network access to Monad RPC and the NFT metadata host. From this directory:

```powershell
npm install
```

In one PowerShell terminal, start the API:

```powershell
npm run server
```

In another PowerShell terminal, start Vite and open the URL it prints (normally `http://localhost:5173`):

```powershell
npm run dev
```

Vite proxies `/api` to `http://localhost:8787`. A development-only `http://localhost:8787/api/doctor` endpoint checks the configured Monad network and sample Chog metadata. `http://localhost:8787/api/health` checks that the API and storage connection respond.

### Configuration

The API reads a local `.env.local` file if present. It is ignored by Git. The following variables are optional for local use; set them in that file or the API process environment if needed:

| Variable | Default | Use |
| --- | --- | --- |
| `MONAD_RPC_URL` | `https://rpc.monad.xyz` | Monad mainnet JSON-RPC endpoint. |
| `IPFS_GATEWAY_URL` | unset | Optional HTTPS IPFS gateway URL ending in `/ipfs/`, tried before public gateways. |
| `OPENSEA_API_KEY` | unset | Optional server-side metadata fallback when IPFS gateways are unavailable. The authorized free key used for this build expires **26 October 2026 at 09:32 UTC**, during judging. Do not expose it to Vite or commit it. |
| `PORT` | `8787` | API listen port. Vite's proxy is fixed to 8787 unless `vite.config.ts` is updated. |
| `PLAYHOUSE_DB_PATH` | `data/playhouse.sqlite` | Local SQLite file path when `DATABASE_URL` is unset. |
| `DATABASE_URL` | unset | PostgreSQL connection URL. When set, the API uses PostgreSQL instead of local SQLite; intended for durable Render storage. |
| `PLAYHOUSE_APP_ORIGIN` | `http://localhost:5173` | Expected frontend origin included in the signed owner challenge. Set it to the deployed app origin. |
| `NODE_ENV` | unset | Set to `production` to disable the development doctor endpoint. |

No private key or paid RPC credential is required for a visitor to play. A holder uses their own browser wallet to sign an authentication message; Playhouse does not need their private key.

### Checks

```powershell
npm run check
npm test
node --test server/server.test.js
npm run build
```

The last recorded runs passed **8 game tests** and **7 server tests**; `npm run check` and `npm run build` also passed. Re-run these commands after any changes. The server tests cover rules, metadata validation and fallback, battle history/evolution, one-use battle sessions and idempotent retry, and wallet signature/ownership-transfer simulation. For a read-only live keyless metadata check, run `node server/doctor-keyless.js 335`. The deployed PostgreSQL health check and a saved battle surviving redeploy were verified; these checks are not a real Genesis holder test.

## Try the player flow

1. Open the app without connecting a wallet. Select a featured boss and compare its traits and attack description.
2. Select **Challenge this Chog**. Move with **WASD**, **arrow keys**, or pointer dragging in the arena. Dodge telegraphed attacks for 45 seconds.
3. Review the score, duration, hits, and near dodges. Rematch, or choose another Chog. Reload the boss profile to check that saved history remains.

If the roster cannot load, inspect `/api/doctor`, RPC connectivity, and metadata gateway availability. The app should show a retry option rather than replacing real tokens with invented bosses.

## Verify owner controls

The owner journey is separate from open play. For a real Genesis holder: connect the wallet that currently owns the selected token, request a challenge, sign the exact message, choose one of that boss's permitted attacks, and save it. A fresh `ownerOf` read at the protected write must reject a nonowner or a previous owner after transfer. We do not own or borrow a Genesis NFT; controlled NFT and local-chain tests can verify the logic, but cannot substitute for a real-holder mainnet UAT.

The API routes are `POST /api/auth/challenge`, `POST /api/auth/verify`, and `POST /api/chogs/:tokenId/settings`. The browser owner controls exist, and tests cover authentication and simulated ownership transfer. A real Genesis holder has not exercised the complete production flow.

## Architecture

| Module | Job |
| --- | --- |
| `src/App.tsx` | Roster, boss details, round, results, and history UI. |
| `src/game.ts` | Canvas simulation, controls, attacks, collision, scoring, and drawing. |
| `src/api.ts` | Typed browser calls to the Playhouse API. |
| `src/OwnerControls.tsx` | Browser-wallet challenge, signature, and attack-preference UI. |
| `server/index.js` | HTTP routes for NFTs, battles, health, and owner settings. |
| `server/chain.js` | Monad Genesis contract reads and metadata normalization. |
| `server/rules.js` | Trait mapping and battle-result validation. |
| `server/auth.js` | Wallet challenge verification and current-owner checks. |
| `server/store.js` | Storage interface choosing PostgreSQL or local SQLite. |
| `server/db.js` | Local SQLite battle records, settings, challenges, and sessions. |

## Known limits

- The API accepts client-reported battle scores and durations. Session timing and duplicate checks block some invalid submissions, but the server does not replay rounds or prevent a determined caller from forging a result. Treat public records as playful history, not cheat-resistant rankings.
- Owner authentication currently uses EOA `personal_sign`; smart contract wallets are not covered by the tested flow.
- Boss evolution currently means a level increase after every three recorded battles and a faster attack cadence. It is deterministic and is not machine learning.
- Mainnet owner controls are designed around the real Genesis contract, but the team has no Genesis NFT and cannot claim a completed real-holder production test unless a holder actually participates.
- [OpenSea instant keys expire after seven days](https://docs.opensea.io/reference/api-keys); this build's key expires **26 October 2026 at 09:32 UTC**. Playhouse reads the contract's `tokenURI` and fetches metadata directly from IPFS without that key. A keyless live check loaded previously uncached token 335 with 12 traits and its onchain owner. The database also stores validated metadata for previously loaded tokens as an outage fallback. It cannot discover an uncached token if all IPFS gateways and OpenSea fail, guarantee that a cached image URL still serves artwork, or replace the live Monad `ownerOf` check. Provider-outage and post-expiry behavior still need verification.
- The API uses local SQLite by default and PostgreSQL with `DATABASE_URL`. Production PostgreSQL health and a battle surviving redeploy were checked; long-term durability under load has not been tested.
- Deployed nonholder browser UAT passed for a round, save, history refresh, and custom token lookup. A real Genesis holder has not completed owner-control UAT.

## Sources and disclosure

- [Chogathon challenge, submission fields, and judging rubric](https://chogathon.chog.xyz/)
- [Chogathon dashboard](https://chogathon.chog.xyz/dashboard): submission closes **23 October 2026, 15:00 UTC**; its **How it works** panel specifies the banner, 8,000-character description, and video host/length limits.
- [Chog Genesis collection](https://opensea.io/collection/chog-genesis) and [MonadScan mint transaction](https://monadscan.com/tx/0x730195964d4ec7cfba5b460cad486b5c35356d0edabc3b88506c4547c64bc6d9) verifying contract `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`.
- [Monad mainnet documentation](https://docs.monad.xyz/developer-essentials/network-information).

Pre-existing work used: **to be completed by the project owner before submission**. Do not leave this line unresolved in the final submission.
