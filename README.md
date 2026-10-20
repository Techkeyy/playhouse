# Playhouse

**Challenge a real Chog Genesis NFT as an arcade boss.** Anyone can choose a Chog, dodge its trait-shaped attacks for up to 45 seconds, and leave a battle record attached to that token.

**[Play the live game](https://playhouse-chogathon.onrender.com/)** · **[Source code](https://github.com/Techkeyy/playhouse)** · **[Personal UAT checklist](docs/USER_UAT.md)**

For anyone who wants to play with a Chog without owning one. A current holder can verify their wallet to choose the opening attack from that boss's permitted patterns.

> *What if an NFT were a public opponent whose history grew each time someone challenged it?*

Built for [Chogathon 2026](https://chogathon.chog.xyz/). The event requires Chog NFTs to be essential, and judges novelty (30%), fun (20%), retention (20%), clarity (15%), and execution (15%).

**Current verification status:** local type check, build, and **25 automated tests** pass (11 server, 11 game, 3 audio). The deployed browser loaded six real Chogs, played token **330** (CHOG #1791), saved a battle, and showed the result after reload. A custom lookup loaded token **331** (CHOG #1792). Production health reported PostgreSQL storage, and a saved battle survived a redeploy. After a metadata-gateway fix, five fresh production token lookups (**343–347**) each returned HTTP 200; local keyless token **342** also loaded with the OpenSea key removed. A signed nonowner was rejected by a local HTTP ownership check. Desktop and narrow-browser play were checked. **Personal acceptance on a physical phone and the complete production owner journey with a genuine Genesis holder remain untested.** A demo video is pending.

## Why this exists

NFT artwork and trait lists are usually things you view. Playhouse makes a Chog something you **face**. Its real token ID, traits, battle record, and current owner affect the experience. Visitors can play without owning an NFT. A genuine holder can use the owner controls if their wallet passes a current ownership check.

The [Chog site](https://www.chog.xyz/) already has a PFP maker, meme maker, snapshot tool, and messenger. [ChogHub](https://github.com/OluwapelumiAdebisi/ChogHub) explores an AI agent and quests tied to a Chog. Playhouse concentrates on a quick, replayable arcade fight against a token-specific boss.

## What it does

1. **Loads** featured Chog Genesis tokens from the Monad mainnet contract. The API reads `ownerOf` and `tokenURI`, then fetches NFT metadata and traits from IPFS gateways or an optional OpenSea API fallback. Production browser testing loaded token **330** as **CHOG #1791**, with 12 traits and an onchain owner, and also loaded nonfeatured token **331**.
2. **Builds** a boss profile from those traits using deterministic rules, including attack families, a title, and named signature attacks for qualifying real traits. The signature preview names the source trait; examples include token 330's Dollar Cap and Coin Rain.
3. **Runs** a 45-second canvas survival round with keyboard, pointer drag, or phone movement buttons, warning telegraphs, hit points, a score, sound effects, and an original looping soundtrack. The real NFT art becomes an animated arena sprite; attack pressure rises at 15 and 30 seconds. Sound starts only after a user action and can be muted.
4. **Records** the result in battle history keyed by the onchain token ID, using local SQLite or PostgreSQL when `DATABASE_URL` is set. The number of recorded battles raises the boss level, which changes attack speed.
5. **Checks** wallet signatures and current `ownerOf` before an owner-only attack preference change. This flow must be tested with a genuine Chog holder before claiming it has been exercised end to end on mainnet.

**Identity detail:** An NFT's displayed name number can differ from its onchain ID. For example, [CHOG #1853 is token ID 392](https://opensea.io/item/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/392). Playhouse keys records and authorization by the contract token ID.

## Run locally

Use Node.js **22 or newer** and npm. The app needs network access to Monad RPC and the NFT metadata host. An NFT, wallet, private key, or OpenSea key is not required to play. From this directory:

```powershell
npm ci
```

In one PowerShell terminal, start the API:

```powershell
npm run server
```

In another PowerShell terminal, start Vite and open the URL it prints (normally `http://localhost:5173`):

```powershell
npm run dev
```

Vite proxies `/api` to `http://localhost:8787`. After starting the API, run these read-only checks in another PowerShell terminal:

```powershell
Invoke-RestMethod http://localhost:8787/api/health
Invoke-RestMethod http://localhost:8787/api/doctor
```

The development-only `/api/doctor` endpoint checks the configured Monad network and sample Chog metadata. `/api/health` checks that the API and storage connection respond. For a keyless live metadata check, run `node server/doctor-keyless.js 342`; that check still needs working Monad RPC and an IPFS gateway.

### Configuration

The API reads a local `.env.local` file if present. It is ignored by Git. The following variables are optional for local use; set them in that file or the API process environment if needed:

| Variable | Default | Use |
| --- | --- | --- |
| `MONAD_RPC_URL` | `https://rpc.monad.xyz` | Monad mainnet JSON-RPC endpoint. |
| `IPFS_GATEWAY_URL` | unset | Optional HTTPS IPFS gateway URL ending in `/ipfs/`, tried before public gateways. |
| `OPENSEA_API_KEY` | unset | Optional server-side metadata fallback when IPFS gateways are unavailable. The free key used for this build expires **26 October 2026 at 09:32 UTC**. Direct onchain `tokenURI` and IPFS metadata loading do not require it. Do not expose it to Vite or commit it. |
| `PORT` | `8787` | API listen port. Vite's proxy is fixed to 8787 unless `vite.config.ts` is updated. |
| `PLAYHOUSE_DB_PATH` | `data/playhouse.sqlite` | Local SQLite file path when `DATABASE_URL` is unset. |
| `DATABASE_URL` | unset | PostgreSQL connection URL. When set, the API uses PostgreSQL instead of local SQLite; intended for durable Render storage. |
| `PLAYHOUSE_APP_ORIGIN` | `http://localhost:5173` | Expected frontend origin included in the signed owner challenge. Set it to the deployed app origin. |
| `NODE_ENV` | unset | Set to `production` to disable the development doctor endpoint. |

No private key or paid RPC credential is required for a visitor to play. A holder uses their own browser wallet to sign an authentication message; Playhouse does not need their private key. The deployment configuration in [`render.yaml`](render.yaml) wires the web service to PostgreSQL.

### Checks

```powershell
npm run check
npm test
npm run build
```

The last recorded run passed **25 tests** (11 server, 11 game, 3 audio); `npm run check` and `npm run build` also passed. The tests cover trait-specific attack paths, portrait playfield bounds, sound gesture gating and mute behavior, metadata validation and fallback including gateway timeouts and expired OpenSea responses, battle history/evolution, one-use battle sessions and idempotent retry, and wallet signature/ownership-transfer simulation. The deployed PostgreSQL health check and a saved battle surviving redeploy were verified; these checks are not a real Genesis holder test.

## Try the player flow

1. Open the landing page without connecting a wallet. Choose **Enter the arcade**, then select a featured boss and compare its traits and named signature attack.
2. Select **Fight this Chog**, read the controls, then choose **Start 45-second round** when the arena is visible. Move with **WASD**, **arrow keys**, pointer dragging, or the four phone movement buttons. Dodge telegraphed attacks for 45 seconds.
3. Review the score, duration, hits, and near dodges. Rematch, or choose another Chog. Reload the boss profile to check that saved history remains.

If the roster cannot load, inspect `/api/doctor`, RPC connectivity, and metadata gateway availability. The app should show a retry option rather than replacing real tokens with invented bosses.

Enable sound with a click or tap. Browsers do not allow autoplay before a user gesture. The soundtrack continues between rounds and pauses while muted or while the browser tab is hidden.

## Verify owner controls

The owner journey is separate from open play. For a real Genesis holder: connect the wallet that currently owns the selected token, request a challenge, sign the exact message, choose one of that boss's permitted attacks, and save it. A fresh `ownerOf` read at the protected write must reject a nonowner or a previous owner after transfer. We do not own or borrow a Genesis NFT; controlled NFT and local-chain tests can verify the logic, but cannot substitute for a real-holder mainnet UAT.

The API routes are `POST /api/auth/challenge`, `POST /api/auth/verify`, and `POST /api/chogs/:tokenId/settings`. The browser owner controls exist, and tests cover authentication and simulated ownership transfer. A real Genesis holder has not exercised the complete production flow.

## How we tried to break it

The **25 automated tests** exercise these cases. They establish specific behavior in code and controlled conditions; they do not substitute for a physical phone test or a genuine Genesis holder session.

| Input or condition | Verified result |
| --- | --- |
| Different real-shape and featured NFT traits | Deterministic signatures with different attack geometry, timing, and symbols. |
| Invalid or invented metadata | Rejected instead of becoming a playable fake Chog. |
| Metadata provider failure after a valid fetch | Validated metadata can be reused while current ownership is read again. |
| IPFS gateway rate limits and timeouts | A later gateway can return validated metadata; the OpenSea fallback can fail closed. |
| Duplicate battle save or retry | The one-use session returns the original record instead of adding another. |
| Wrong signer and simulated ownership transfer | Wrong signer is rejected; the previous owner loses control after transfer. |
| Locked audio, mute, and hidden tab | Audio waits for a user gesture, then pauses and resumes as expected. |
| Narrow portrait playfield | Player, warnings, and attacks stay inside the smaller arena. |

**Ownership is always checked live for protected writes; cached metadata never grants owner control.**

## Architecture

| Module | Job |
| --- | --- |
| `src/App.tsx` | Roster, boss details, round, results, and history UI. |
| `src/game.ts` | Canvas simulation, controls, attacks, collision, scoring, and drawing. |
| `src/audio.ts` | Synthesized soundtrack and effects gated by user interaction. |
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
- [OpenSea instant keys expire after seven days](https://docs.opensea.io/reference/api-keys); this build's key expires **26 October 2026 at 09:32 UTC**. Playhouse reads the contract's `tokenURI` and tries IPFS gateways before the optional OpenSea fallback. An earlier fresh production lookup returned HTTP 503 when gateways timed out; the gateway list and timeout were updated. Five subsequently uncached production tokens (**343–347**) loaded successfully with image URLs on `ipfs.filebase.io`, and local token **342** loaded with the OpenSea key removed. The database stores validated metadata for previously loaded tokens as an outage fallback. The production checks show that fresh loading now works, while the local check proves the direct keyless path; **post-expiry production behavior is not yet verified**. The app cannot discover an uncached token if every gateway fails, guarantee that a cached image URL still serves artwork, or replace the live Monad `ownerOf` check.
- The API uses local SQLite by default and PostgreSQL with `DATABASE_URL`. Production PostgreSQL health and a battle surviving redeploy were checked; long-term durability under load has not been tested.
- Deployed nonholder browser UAT passed for a round, save, history refresh, and custom token lookup. A narrow-browser round included movement and a saved result. Physical phone touch and listening checks remain for personal UAT. A real Genesis holder has not completed owner-control UAT.

## Sources and disclosure

- [Chogathon challenge, submission fields, and judging rubric](https://chogathon.chog.xyz/)
- [Chogathon dashboard](https://chogathon.chog.xyz/dashboard): submission closes **23 October 2026, 15:00 UTC**; its **How it works** panel specifies the banner, 8,000-character description, and video host/length limits.
- [Chog Genesis collection](https://opensea.io/collection/chog-genesis) and [MonadScan mint transaction](https://monadscan.com/tx/0x730195964d4ec7cfba5b460cad486b5c35356d0edabc3b88506c4547c64bc6d9) verifying contract `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`.
- [Monad mainnet documentation](https://docs.monad.xyz/developer-essentials/network-information).

The [submission draft](docs/SUBMISSION.md) is preparation only. The project owner must complete the pre-existing-work disclosure, personal UAT, and submission fields. A demo video is omitted until one exists and opens for a signed-out judge.

**License:** No license file is currently published. The project owner should choose one if public reuse is intended.
