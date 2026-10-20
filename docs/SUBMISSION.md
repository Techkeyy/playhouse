# Playhouse: Chogathon submission draft

Optional preparation for the project owner, based on the [official challenge, deliverables, and judging page](https://chogathon.chog.xyz/) and [dashboard](https://chogathon.chog.xyz/dashboard). Submission closes **23 October 2026 at 15:00 UTC**. Dashboard requirements: one project per team, banner, description up to **8,000 characters**, project links, and a demo video on **YouTube or Google Drive** of no more than **3 minutes**. **The user must personally test and accept the product, then submit it. This draft is not user acceptance, submission authorization, or a ready-to-submit verdict.** Use [USER_UAT.md](USER_UAT.md) to record that review.

## Project and links

- **Name:** Playhouse
- **Live game:** https://playhouse-chogathon.onrender.com/
- **Public repository:** https://github.com/Techkeyy/playhouse
- **Video:** [ADD PUBLIC YOUTUBE OR VIEWABLE GOOGLE DRIVE URL AFTER RECORDING]
- **Team members, Discord handles, X handles:** [USER TO FILL]
- **Banner:** [USER TO UPLOAD; CHECK IT MATCHES THE LIVE GAME]

## Paste-ready description (well under 8,000 characters)

**Playhouse turns real Chog Genesis NFTs into arcade bosses anyone can challenge.** Pick a Chog, read its traits, and try to survive its 45-second arena. Move with WASD, arrow keys, pointer dragging, or hold-to-move phone controls while dodging telegraphed attacks. An original soundtrack and combat cues start after a player enables sound or begins a round. You can play without owning a Chog or connecting a wallet.

The bosses are actual Genesis ERC-721 tokens on Monad mainnet. Playhouse reads `ownerOf` and `tokenURI` from the Genesis contract, fetches the NFT metadata, and generates attack families from its traits. Token identity, artwork, traits, and current owner are displayed together. The battle record belongs to the **onchain token ID**, not the wallet or the number in the artwork's display name. After every three recorded battles, that token's level rises and its attacks become faster. Its record remains attached to it when ownership changes.

This makes the NFT essential: removing it would remove the real boss identity and trait-derived move set, the persistent token-specific battle history, and the transferable owner controls. A holder can connect the wallet that owns that Chog, sign a one-use challenge, and choose which of its allowed attacks leads the next fight. The server checks current mainnet `ownerOf` again when the setting is saved; control moves to the new holder on transfer. The open player game works without a holder.

Playhouse focuses on a new role for a collectible: it becomes a public opponent with a record the community can shape through play. Visitors can rematch the same boss as it levels or look up another real token ID. The first screen explains the goal, the fight has visible warnings and four hearts, and results show score, time, hits, near dodges, and recent battles.

The live game has been browser-tested on Render: six genuine Chogs loaded; token 330 (display name CHOG #1791) played a round, saved a result, and showed it after refresh; lookup also loaded nonfeatured token 331 (CHOG #1792) with its image, traits, and owner. A narrow-browser portrait round showed the larger arena, visible HUD, working hold-to-move input, a saved result, and history. The production API reported PostgreSQL storage, and a saved battle survived a redeploy. Local type check, build, and **26 automated tests** passed (11 server, 12 game, 3 audio). The tests include trait rules, battle session retry, history and level behavior, soundtrack lifecycle, gateway failures, signature checks, and transfer revocation.

**Current limits:** Battle scores are reported by the client. Timing and one-use session checks reject some invalid submissions, but the server does not replay a round or provide cheat-resistant rankings. Owner controls are implemented and tested with a simulated transfer and a local HTTP nonowner rejection; no real Genesis holder has completed the production owner journey. The authorized free OpenSea metadata key expires **26 October 2026 at 09:32 UTC**, during judging. Direct onchain `tokenURI` and IPFS metadata loading work without that key; the production retest loaded fresh tokens 343–347 through an IPFS gateway after one earlier transient 503 exposed gateway reliability. The code also stores verified metadata for previously loaded tokens. Post-expiry behavior remains unobserved. An uncached token can fail when all fresh metadata sources fail, a cached image URL can stop serving artwork, and owner controls still require live Monad reads. Physical phone touch and listening checks remain for personal UAT. We have no public-user feedback to report yet; the usage above is team UAT. Future work is stronger score verification and holder-led balance testing.

**Tech stack:** React, TypeScript, Vite, Node.js, ethers, Monad mainnet reads, PostgreSQL in production and SQLite locally. The NFT metadata comes from the token URI through IPFS gateways, with a server-side OpenSea API fallback. Genesis contract: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`.

**Pre-existing work used:** [USER TO DISCLOSE ACCURATELY BEFORE SUBMISSION].

## Judge testing instructions

1. Open https://playhouse-chogathon.onrender.com/ in a desktop browser. No wallet is needed to play.
2. Choose **CHOG #1791 / onchain token 330** from the roster. Check its displayed traits and attack profile, then click **Fight this Chog**.
3. Click **Start 45-second round** and dodge using WASD, arrow keys, pointer drag, or phone movement buttons. Finish or lose a round; note the result screen and saved status. The timer is 45 seconds for a full survival.
4. Return to the boss and reload the page. Select token 330 again to see the saved battle in its history.
5. Use the custom token lookup for **331**. Its display name is CHOG #1792; compare the token ID, traits, image, and boss profile. Token display names are not the contract token IDs.
6. Optional holder path: if you own a Genesis NFT, select its onchain ID, connect your Monad mainnet wallet in **Verify owner wallet**, sign the Playhouse challenge, choose an available first attack, and save. A nonowner cannot complete the setting change. This live holder path has not yet been exercised by the team.

## Demo video shot plan (about 2 minutes 30 seconds)

| Time | Screen and narration |
| --- | --- |
| 0:00–0:15 | Homepage and roster. “Every real Chog NFT becomes a boss anyone can fight.” Show no wallet connection. |
| 0:15–0:35 | Select token 330. Show display name **CHOG #1791**, onchain ID **330**, traits, owner, attack profile, and contract link if visible. Explain the display-name/ID difference. |
| 0:35–1:25 | Start the fight. Show telegraphed attacks and movement. Use a genuine recorded attempt; edit the video for pace, but do not fake the result. |
| 1:25–1:45 | Result and saved status, then reload and show the same battle in history. Explain token-specific persistence and level progression. |
| 1:45–2:05 | Lookup token 331, show a different profile and attack family. Explain that traits are input to the deterministic boss rules. |
| 2:05–2:25 | Show owner-control UI and describe signature plus fresh `ownerOf` check. Label the live holder path **untested**, and mention simulated-transfer/nonowner proof. |
| 2:25–2:30 | Close on the playable URL and repository. |

Record the actual deployed site, keep the final video under three minutes, and verify that its URL opens for a signed-out judge.

## Final fields to complete before submission

- Team member names and each required Discord/X handle.
- Public video URL and access check; banner upload.
- Accurate pre-existing-work disclosure and any real external user feedback or usage if gathered before submission.
- Confirm the final live deployment still serves the tested build, the repository includes that build, and the signed-in dashboard shows the project as submitted.
