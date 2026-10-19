# Playhouse: claims-to-proof ledger

This is a review checklist. **Local verified** means tested against the local API or rendered local browser; it does not imply a production deployment. The `perfect-readme`, `project-edge`, and `project-audit` skills require the README and submission to match the running product. Current checks: **3 game tests, 6 backend tests**, local type check and build passed.

## Core user journey to prove

1. A visitor opens the deployed Playhouse URL without a wallet and selects a Chog Genesis token backed by live Monad metadata.
2. The visitor sees the NFT image, correct **onchain token ID**, traits, readable attack explanation, and an arena shaped by those traits.
3. The visitor plays a complete 45-second survival round, dodges distinct attacks, sees a result and score, then rematches.
4. The boss profile shows a persistent battle history and bounded, understandable evolution triggered by actual round outcomes. Reloading does not erase it.
5. A connected wallet that owns the selected Genesis token can change a permitted boss setting. A nonowner cannot. After a simulated transfer, the new owner gains control and the former owner loses it while history stays with `(chain, contract, tokenId)`.

## Claim → mechanism → proof

| Intended claim | Mechanism that must exist | Proof required before claiming shipped | State |
| --- | --- | --- | --- |
| “Real Chog NFTs power the bosses.” | Read Genesis `tokenURI` and metadata/traits from mainnet contract `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`; use contract token ID as identity. | Live API and local browser loaded real token 330 (CHOG #1791, 12 traits), and local browser looked up nonfeatured token 331. Deployed check remains. | Local verified; deployment pending |
| “Each Chog fights differently because of its NFT traits.” | Documented deterministic trait-to-attack/arena mapping, applied during gameplay. | Compare two actual mainnet token IDs with different traits; record visible behavior difference and mapping test. | Pending |
| “Anyone can play for free without a Chog.” | Visitor launch path requires no wallet, NFT, or payment. | Local rendered browser played token 330 without a wallet, saved a battle, and showed history after refresh. Repeat on deployed site. | Local verified; deployment pending |
| “Bosses evolve based on challengers.” | Battle history keyed by real token ID; level increases after every three battles, accelerating attack cadence. | Backend tests cover history/evolution and one-use sessions/idempotent retry; local browser history survived refresh. Hosted PostgreSQL persistence remains untested. | Local verified; hosted storage pending |
| “Battle history stays with the NFT.” | Record keyed by the verified Genesis token ID, independent of owner wallet. | Local tests cover transfer simulation and retained history; deployed persistence check remains. | Local verified; deployment pending |
| “Only the current holder can customize their boss.” | Wallet challenge/signature, server-side mainnet `ownerOf` check on every privileged write, allowed-setting validator. | Signed live-chain nonowner rejected with 403; controlled tests cover owner acceptance and transfer revocation. Real Genesis holder UAT remains. | Authorization verified; live holder pending |
| “Production supports real Chog holders.” | Mainnet wallet connection, chain guard, exact Genesis address, fresh ownership read, owner settings endpoint. | Deployment configuration and read-only production path verified; real-holder UAT needed to claim full live owner-flow verification. | Pending |
| “Playable and polished.” | Clear controls, legible attack telegraphs, accessible start/restart, responsive arena. | Local rendered browser completed token 330 battle/history refresh and token 331 lookup. Deployed desktop/mobile UAT remains. | Local browser verified; deployment pending |

## Honesty rules

- The **$CHOG token** and **Chog Genesis NFT** are different assets. The NFT is required by the event; `$CHOG` integration is optional bonus. Do not imply Playhouse uses `$CHOG` unless a meaningful flow ships.
- A local/mock NFT authorization test proves the logic under simulated state. It does **not** prove a real Genesis holder completed the production owner journey.
- A cached metadata fixture helps offline development but cannot substantiate “reads real NFTs live” if production never contacts an authoritative mainnet source.
- A counter increment is battle history, not “learning.” Describe exact evolution rules and caps; do not call them AI unless an AI mechanism ships.
- Scores in local storage are not a public leaderboard. State storage scope accurately.
- Storage is SQLite locally or PostgreSQL when `DATABASE_URL` is set. The PostgreSQL branch requires a real hosted database test before claiming durable deployed history.
- Record test count, deployment URL, repository URL, video URL, and feedback only after they exist and have been checked.
