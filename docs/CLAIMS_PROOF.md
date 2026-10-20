# Playhouse: claims-to-proof ledger

This is a review checklist. The `perfect-readme`, `project-edge`, and `project-audit` skills require the README and submission to match the running product. Current checks: **10 game tests, 9 backend tests, 2 audio tests**, local type check and build, production PostgreSQL health, and deployed browser UAT passed. A real Genesis holder test remains outstanding.

## Core user journey to prove

1. A visitor opens the deployed Playhouse URL without a wallet and selects a Chog Genesis token backed by live Monad metadata.
2. The visitor sees the NFT image, correct **onchain token ID**, traits, readable attack explanation, and an arena shaped by those traits.
3. The visitor plays a complete 45-second survival round, dodges distinct attacks, sees a result and score, then rematches.
4. The boss profile shows a persistent battle history and bounded, understandable evolution triggered by actual round outcomes. Reloading does not erase it.
5. A connected wallet that owns the selected Genesis token can change a permitted boss setting. A nonowner cannot. After a simulated transfer, the new owner gains control and the former owner loses it while history stays with `(chain, contract, tokenId)`.

## Claim → mechanism → proof

| Intended claim | Mechanism that must exist | Proof required before claiming shipped | State |
| --- | --- | --- | --- |
| “Real Chog NFTs power the bosses.” | Read Genesis `tokenURI` and metadata/traits from mainnet contract `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`; use contract token ID as identity. | Deployed browser loaded six real Chogs, including token 330 (CHOG #1791, 12 traits), and custom lookup loaded token 331 (CHOG #1792). | Deployed verified |
| “Each Chog fights differently because of its NFT traits.” | Documented deterministic trait-to-attack/arena mapping, applied during gameplay. | Compare two actual mainnet token IDs with different traits; record visible behavior difference and mapping test. | Pending |
| “Anyone can play for free without a Chog.” | Visitor launch path requires no wallet, NFT, or payment. | Deployed browser played token 330 without a wallet, saved a 636-point battle, and showed the result after refresh. | Deployed verified |
| “Bosses evolve based on challengers.” | Battle history keyed by real token ID; level increases after every three battles, accelerating attack cadence. | Backend tests cover history/evolution and one-use sessions/idempotent retry; deployed browser history survived refresh and battle ID 4 survived redeploy. | Deployed persistence verified; long-term load untested |
| “Battle history stays with the NFT.” | Record keyed by the verified Genesis token ID, independent of owner wallet. | Tests cover transfer simulation and retained history; deployed history persisted through reload and redeploy. | Deployed persistence verified; real transfer untested |
| “Only the current holder can customize their boss.” | Wallet challenge/signature, server-side mainnet `ownerOf` check on every privileged write, allowed-setting validator. | Signed live-chain nonowner rejected with 403; controlled tests cover owner acceptance and transfer revocation. Real Genesis holder UAT remains. | Authorization verified; live holder pending |
| “Production supports real Chog holders.” | Mainnet wallet connection, chain guard, exact Genesis address, fresh ownership read, owner settings endpoint. | Deployment configuration and read-only production path verified; real-holder UAT needed to claim full live owner-flow verification. | Pending |
| “Playable and polished.” | Clear controls, legible attack telegraphs, accessible start/restart, responsive arena. | Deployed browser completed token 330 battle/history refresh and token 331 lookup. Mobile UAT remains. | Deployed desktop verified; mobile pending |

## Honesty rules

- The **$CHOG token** and **Chog Genesis NFT** are different assets. The NFT is required by the event; `$CHOG` integration is optional bonus. Do not imply Playhouse uses `$CHOG` unless a meaningful flow ships.
- A local/mock NFT authorization test proves the logic under simulated state. It does **not** prove a real Genesis holder completed the production owner journey.
- A cached metadata fixture helps offline development but cannot substantiate “reads real NFTs live” if production never contacts an authoritative mainnet source.
- A counter increment is battle history, not “learning.” Describe exact evolution rules and caps; do not call them AI unless an AI mechanism ships.
- Scores in local storage are not a public leaderboard. State storage scope accurately.
- Storage is SQLite locally or PostgreSQL when `DATABASE_URL` is set. Production PostgreSQL health and a battle surviving redeploy were checked; long-term durability and load remain untested.
- Record test count, deployment URL, repository URL, video URL, and feedback only after they exist and have been checked.
