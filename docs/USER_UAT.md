# Playhouse: personal acceptance test

**The project owner should perform these steps personally on the live site before deciding whether to submit.** Agent and team checks are useful evidence, but they do not record your acceptance. Live game: https://playhouse-chogathon.onrender.com/ . Record the date, device/browser, result, and any issue in the table below. A failed step is a fix to investigate; this checklist does not itself authorize submission.

## 1. Nonholder play on desktop

1. Open the live site in a fresh desktop browser tab. Do not connect a wallet. Confirm the landing explains real NFT bosses and has a working **Enter the arcade** button. Follow it to the lineup and confirm real Chog images and token IDs load.
2. Select token **330**, displayed as **CHOG #1791**. Check that traits, owner summary, **Coin Rain** signature from its actual **Dollar Cap** trait, and **Token ID 330** appear. The display name number and token ID differ by design.
3. Click **Fight this Chog**. Confirm the ready instructions appear and the timer stays at 45 seconds until you click **Start 45-second round**. Check that Home and Enter arcade work before starting, then start and move with WASD or arrow keys. Confirm the attack warnings are visible and that health, timer, and score change during a round.
4. Finish or lose the round. Confirm the result and saved status appear. Select **Rematch this Chog** and confirm it starts a fresh round.
5. Return to token 330, reload the page, select it again, and confirm your saved battle remains in Recent battles. Note the score and battle count before and after.
6. Select the **third featured Chog**, token **1053** (CHOG #545). During its fight, check that its full NFT art moves as an arena sprite, its Aura changes the glow, and the boss reacts when it attacks or takes a hit. The art is a flat NFT image animated as a sprite, so it is not a separately rigged character cutout.
7. Try to last past **15 seconds** and **30 seconds**. Note whether attack cadence and pattern density rise while warning paths remain readable. If you cannot reach those marks, record your longest run and whether the difficulty feels fair.
8. Compare token **330** (Coin Rain), **1538** (Cellblock Sweep), and **1053** (Rally Orbit). Confirm their preview descriptions name the real source traits and their fight patterns visibly differ. Enable sound on the landing page: the lively loop should begin only after your click. Confirm it stays quieter than attack cues, continues between fights, and stops while muted. Check attack, dodge, hit, and result cues too.

## 2. Arbitrary real token lookup

1. Use the custom token lookup for **331**. Confirm it loads as **CHOG #1792**, with its own image, traits, owner summary, and boss profile.
2. If you know another Genesis **onchain token ID**, try it too. Use the onchain ID, not the number in its display name. Confirm the page either loads a real token or gives a clear error; it should never invent a boss.

## 3. Owner path, only if you have access to a genuine Genesis NFT

1. In a wallet you control, select the onchain token ID that wallet currently owns. Confirm the site is on **Monad mainnet** and shows the expected owner.
2. Click **Verify owner wallet** and review the signing message. Sign only if it names Playhouse, your wallet, and the correct token ID. This is a signature, not a transaction or payment.
3. Choose one of the offered first-attack patterns and save. Start a fight and confirm that pattern leads. Reload and confirm the choice persists.
4. If you have a second wallet and intentionally transfer the NFT outside this test, confirm the old wallet loses controls and the new owner gains them while battle history remains. Do not transfer an NFT just to complete this checklist.

If you do not own or have authorized access to a Genesis NFT, mark this section **Not run**. The team has simulated owner/transfer tests and a local HTTP nonowner rejection, but has not completed a genuine holder journey.

## 4. Mobile and reliability

1. Open the live site on a phone or narrow browser viewport, including **319px and 390px** if using responsive tools. Confirm the landing, header sound toggle, roster, boss detail, owner controls, arena, buttons, and result are readable without horizontal scrolling or clipping.
2. Open a fight and confirm it waits at the ready screen until you click **Start 45-second round**. During a portrait round, the timer, health, and score should remain visible above a large arena, with four movement buttons below. Hold each button to move and release to stop. Drag on the arena too; your finger should not need to cover the player. Confirm attack warnings and movement stay responsive until the round reaches a result.
3. During a phone round, use the in-round sound control and confirm it mutes both music and effects. Rotate once and check that the arena keeps its proportions and remains playable. On the roster page, scroll downward and check that sections reveal without hiding controls or causing horizontal scrolling. If your device uses reduced-motion settings, confirm decorative art motion stops while the attacks remain playable.
4. Refresh after a saved round and check history. If the host takes time to wake, record how long it took and whether the retry UI worked.
5. Open the [repository](https://github.com/Techkeyy/playhouse) and confirm its instructions correspond to the live product. Check that the demo video, once made, shows the same build.
6. Metadata resilience: the authorized free OpenSea key expires **26 October 2026 at 09:32 UTC**, during judging. The current build loaded fresh tokens 343–347 through an IPFS gateway, but post-expiry behavior has not been observed. After expiry, try a real onchain token ID that has not already been loaded into Playhouse; direct `tokenURI` plus IPFS should load it without OpenSea. Reload a previously loaded token such as 330 and confirm its profile still loads. Check that its **current owner** is read from Monad. A never-loaded token may fail if all metadata sources are unavailable, and a cached image URL may stop displaying; record either result honestly.

## Results to fill in personally

| Check | Pass / Fail / Not run | Notes, score, device, or issue |
| --- | --- | --- |
| Desktop roster and token 330 details |  |  |
| Desktop round, result, and rematch |  |  |
| Saved history after refresh |  |  |
| Token 1053 animated boss sprite |  |  |
| Trait-specific signatures and visible attack differences |  |  |
| Soundtrack, cues, mute, and click-to-enable behavior |  |  |
| Difficulty progression and readable warnings |  |  |
| Custom lookup token 331 |  |  |
| Another arbitrary token ID |  |  |
| Genuine owner wallet settings |  |  |
| Mobile portrait arena, hold controls, and drag play |  |  |
| Landing to lineup to result transitions at 319px and 390px |  |  |
| Scroll reveal and reduced-motion behavior |  |  |
| Repository/video match live build |  |  |
| Cached token after OpenSea key expiry/unavailability |  |  |

**Tested by:** [your name]  
**Date and timezone:** [fill in]  
**Acceptance decision and remaining issues:** [fill in personally]
