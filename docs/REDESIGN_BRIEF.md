# Playhouse redesign brief

**Mode:** REDESIGN  
**Priority:** P0  
**Approved scope:** Full UX and UI restructure, sound, and visibly trait-driven fights.  
**Reference:** https://ballroom-eight.vercel.app/ (structure and cinematic tone, not its product claims or identity).

## Objective

Make the journey legible from first visit to saved result: understand Playhouse, enter the arcade without a wallet, choose a real Chog, recognize its unique traits and attacks, learn how to dodge, fight, and review the record. A holder can still prove ownership and tune a permitted attack.

## Existing behavior to preserve

- Playhouse name, Chog Genesis on Monad, real token metadata and live ownership.
- Free nonholder play, arbitrary token lookup, 45-second fight, persistent per-token history, rematch.
- Signed holder controls and fresh owner checks; no fabricated NFT, score, loot, or reward claims.
- Existing Render service, PostgreSQL storage, and user-owned submission/UAT decision.

## In-scope corrections

| Surface | Deficiency | Required result |
| --- | --- | --- |
| Entry | Hero and roster run together | Distinct cinematic landing, one main Enter Playhouse action, concise explanation, then app entry. |
| Boss selection | Trait impact is obscure | Show each real token's distinctive traits and plain-language attack preview. |
| Fight | Attack families look too similar | Distinct trait-linked motifs, motion, color, geometry, and readable telegraphs. |
| Sound | Silent play | User-controlled background loop and attack, dodge, hit, result cues. No automatic sound before interaction. |
| Guidance | Users must infer controls | Explain movement, warning paths, 45-second goal, result/history at the point of use. |
| Responsive | Narrow layouts and arena need care | No horizontal overflow at 319/390px; touch controls, keyboard focus, reduced motion, and sound control remain usable. |

## Product fit

The primary audience is a visitor curious about Chog NFTs who may not own one. The first impression should be: real Chog NFTs become bosses whose traits change the encounter, and anyone can play. The main action is **Enter Playhouse** leading to the playable lineup. Proof comes from live token art, traits, ownership, and persistent battle history. The site must say the artwork is animated as a sprite and avoid implying independent character rigging or rewards that do not exist.

## Visual direction

Use a theatrical dark stage with one real Chog as a strong focal point. Keep Playhouse's warm yellow and cool blue accents while increasing hierarchy and whitespace. Give the landing a bold, compact headline, short copy, and one unmistakable entry button. Use editorial rhythm for the explanation and clearly separate it from the functional arcade. Make the boss profile feel like a character introduction, with traits connected to attack previews. Use motion to indicate entry, attacks, and section reveals, and respect reduced-motion settings. Keep text and controls readable on small phones; do not reproduce Ballroom's imagery, wording, or disabled account controls.

## Acceptance

Verify the real browser path landing → lineup → selected token → fight → saved result → rematch. Inspect desktop and narrow mobile screenshots, keyboard focus, pointer play, sound on/off, reduced motion, and true trait differences across at least tokens 330, 1538, and 1053. Run tests, type check, and build. Distinguish genuine holder UAT and human judgment of difficulty from automated evidence. The user performs the final acceptance test and any Chogathon submission.
