# Playhouse redesign V2: director brief

**Mode:** REDESIGN. **Priority:** P0. **Source:** current main branch and live Render app. **Owner-approved scope:** full visual and UX redesign using the two user-supplied design skills, black and white as the foundation, new typography, responsive components, SVGs, and scroll appearance.

## Objective and product fit

Playhouse turns genuine Chog Genesis NFTs into playable arcade bosses. A first-time visitor should understand that the NFT's real traits shape the encounter and should reach a playable fight quickly without a wallet. The audience is curious players and NFT holders. The magic moment is seeing the selected Chog's art and trait-derived signature move in a live arena. The product should feel playful, decisive, and collectible.

## Protected behavior

Keep the real Monad NFT data and ownership checks, featured roster and arbitrary token lookup, signed holder settings, 45-second game, ready-to-start safeguard, trait-driven attacks, sound settings, saved history, rematch, and accurate loading/error/result states. Do not change server authorization, database, NFT contract, or deploy configuration for visual reasons. The user performs final UAT and any hackathon submission.

## Journey and structure

Arrive -> grasp the NFT boss concept -> enter the arcade -> compare real Chogs -> inspect one token and its signature -> start the round when ready -> see saved result -> rematch or choose another. Keep a distinct landing and app workspace but make switching immediate, coherent, and shareable through a URL hash if feasible without sacrificing state. The first action must be prominent above the fold on desktop and mobile. The profile should appear promptly after selection, preserving keyboard focus.

## Visual direction

Replace the current blue stage with an ink-black and warm-white graphic system. Use sections that alternate light paper and deep black with purposeful, limited accent colors drawn from Chog's playful artwork: tangerine orange for primary actions and citrus yellow for game energy. Keep error crimson and success green semantic and visibly distinct from the orange action. Choose a new expressive display face paired with a clean interface face; numerals and token IDs should be easy to scan. Use bold rules, asymmetrical editorial composition, and actual NFT art rather than gradient orbs and generic feature cards. Make in-house inline SVG marks, arrows, rings, and attack diagrams that explain the gameplay, with accessible labels or decorative hiding. The visuals should unmistakably belong to an NFT boss arcade even without its logo.

## Interaction and motion

Use reactive components that respond to selected tokens, pointer/focus, and actual game state. Show selected Chog and signature visually before fighting. Use IntersectionObserver section reveals and a restrained scroll progress indicator; honor reduced motion and avoid delaying actions. Buttons need quick feedback and visible focus. No animation should make warnings or text harder to read.

## Acceptance

Inspect the running pages at desktop and narrow mobile widths, including landing, lineup, profile, ready state, fight, result, and owner controls. No horizontal overflow at 319 and 390 pixels, clipped headlines, unreadable labels, hidden primary actions, or stalled reveals. Verify the live journey and real NFT signatures for tokens 330, 1538, and 1053. Run the attached skill's UI text audit, typecheck, tests, and production build. Record exact evidence and gaps. Deploy through the existing repo/Render flow after review; preserve a rollback SHA.
