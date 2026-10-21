# Playhouse: Chogathon submission draft

Optional preparation for the project owner, based on the [official challenge, deliverables, and judging page](https://chogathon.chog.xyz/) and [dashboard](https://chogathon.chog.xyz/dashboard). When checked on 19 October 2026, the dashboard listed a **23 October 2026, 15:00 UTC** submission deadline and required one project per team, a banner, a description up to **8,000 characters**, project links, and a demo video on **YouTube or Google Drive** of no more than **3 minutes**. Recheck the live dashboard before submitting. **The user must personally test and accept the product, then submit it. This draft is not user acceptance or submission authorization.** Use [USER_UAT.md](USER_UAT.md) to record that review.

## Project and links

- **Name:** Playhouse
- **Live game:** https://playhouse-chogathon.onrender.com/
- **Public repository:** https://github.com/Techkeyy/playhouse
- **Video:** A 106.5-second final cut exists locally as `Playhouse_Demo_Final.mp4`. [ADD PUBLIC YOUTUBE OR VIEWABLE GOOGLE DRIVE URL AFTER UPLOAD AND SIGNED-OUT ACCESS CHECK]
- **Team members, Discord handles, X handles:** [USER TO FILL]
- **Banner:** [Upload the finished 1672 × 941 PNG](assets/playhouse-chogathon-banner.png) and check its crop in the project preview. The characters are illustrative campaign art; the game displays genuine Chog NFT art.

## Paste-ready description (well under 8,000 characters)

**Playhouse turns real Chog Genesis NFTs into arcade bosses anyone can challenge.** Pick a Chog, read its traits, and try to survive its 45-second arena. Move with WASD, arrow keys, pointer dragging, or hold-to-move phone controls while dodging telegraphed attacks. An original soundtrack and combat cues start after a player enables sound or begins a round. You can play without owning a Chog or connecting a wallet.

The bosses are actual Genesis ERC-721 tokens on Monad mainnet. Playhouse reads `ownerOf` and `tokenURI` from the Genesis contract, fetches the NFT metadata, and generates attack families from its traits. Token identity, artwork, traits, and current owner are displayed together. The battle record belongs to the **onchain token ID**, not the wallet or the number in the artwork's display name. After every three recorded battles, that token's level rises and its attacks become faster. Its record remains attached to it when ownership changes.

This makes the NFT essential: removing it would remove the real boss identity and trait-derived move set, the persistent token-specific battle history, and the transferable owner controls. A holder can connect the wallet that owns that Chog, sign a one-use challenge, and choose which of its allowed attacks leads the next fight. The server checks current mainnet `ownerOf` again when the setting is saved; control moves to the new holder on transfer. The open player game works without a holder.

Playhouse focuses on a new role for a collectible: it becomes a public opponent with a record the community can shape through play. Visitors can rematch the same boss as it levels or look up another real token ID. The first screen explains the goal, the fight has visible warnings and four hearts, and results show score, time, hits, near dodges, and recent battles.

The live game has been browser-tested on Render: six genuine Chogs loaded; token 330 (display name CHOG #1791) played a round, saved a result, and showed it after refresh; lookup also loaded nonfeatured token 331 (CHOG #1792) with its image, traits, and owner. A narrow-browser portrait round showed the larger arena, visible HUD, working hold-to-move input, a saved result, and history. The production API reported PostgreSQL storage, and a saved battle survived a redeploy. Local type check, build, and **26 automated tests** passed (11 server, 12 game, 3 audio). The tests include trait rules, battle session retry, history and level behavior, soundtrack lifecycle, gateway failures, signature checks, and transfer revocation.

**Current limits:** Battle scores are reported by the client. Timing and one-use session checks reject some invalid submissions, but the server does not replay a round or provide cheat-resistant rankings. Owner controls are implemented and tested with a simulated transfer and a local HTTP nonowner rejection; no real Genesis holder has completed the production owner journey. OpenSea is an optional metadata fallback after direct onchain `tokenURI` and IPFS loading. Keyless local token **349** loaded with real traits and current ownership, while fresh production tokens **343–348** loaded through IPFS after a gateway timeout fix. We have not verified the current Render key or its expiry. An uncached token can fail if all metadata sources fail; a cached image URL can stop serving artwork; owner controls still need live Monad reads. Physical phone touch and listening checks remain for personal UAT. We have no public-user feedback to report yet; the usage above is team UAT. Future work is stronger score verification and holder-led balance testing.

**Tech stack:** React, TypeScript, Vite, Node.js, ethers, Monad mainnet reads, PostgreSQL in production and SQLite locally. The NFT metadata comes from the token URI through IPFS gateways, with a server-side OpenSea API fallback. Genesis contract: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`.

**Pre-existing work used:** [USER TO DISCLOSE ACCURATELY BEFORE SUBMISSION].

## Judge testing instructions

1. Open https://playhouse-chogathon.onrender.com/ in a desktop browser. No wallet is needed to play.
2. Choose **CHOG #1791 / onchain token 330** from the roster. Check its displayed traits and attack profile, then click **Fight this Chog**.
3. Click **Start 45-second round** and dodge using WASD, arrow keys, pointer drag, or phone movement buttons. Finish or lose a round; note the result screen and saved status. The timer is 45 seconds for a full survival.
4. Return to the boss and reload the page. Select token 330 again to see the saved battle in its history.
5. Use the custom token lookup for **331**. Its display name is CHOG #1792; compare the token ID, traits, image, and boss profile. Token display names are not the contract token IDs.
6. Optional holder path: if you own a Genesis NFT, select its onchain ID, connect your Monad mainnet wallet in **Verify owner wallet**, sign the Playhouse challenge, choose an available first attack, and save. A nonowner cannot complete the setting change. This live holder path has not yet been exercised by the team.

## Finished demo video

The final cut is **106.5 seconds**, 1920 × 1080 at 30 fps. It shows the live roster and trait-driven bosses, genuine token 331 and 330 fight footage, HEAT 2/3 proof, an authentic **1,830-point loss** and saved history, a second token comparison, the holder UI with the genuine-holder UAT caveat, mobile play, and the live URL. The soundtrack and sound accents are editorial audio because the browser captures did not record Web Audio. The final video was checked for full decode, black frames, loudness, and audio sync; the user still needs to listen and approve it. Upload it to YouTube or Google Drive and verify that the link opens for a signed-out judge before placing it in the form or README.

## Final fields to complete before submission

- Team member names and each required Discord/X handle.
- Public video URL and access check; banner upload.
- Accurate pre-existing-work disclosure and any real external user feedback or usage if gathered before submission.
- Confirm the final live deployment still serves the tested build, the repository includes that build, and the signed-in dashboard shows the project as submitted.
