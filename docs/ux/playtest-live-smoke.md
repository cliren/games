# LIVE Games hub smoke playtest

- URL: https://cliren.github.io/games/
- Run: 2026-09-14 05:01–05:09 UTC, desktop Chromium viewport 1280x800.
- Scope ended early on parent-agent steering at 05:09 while fixed build was about to push; five of nine games were opened through meaningful play, Corner Claim reached setup, and Pass Bomb / Zone Whack / Steady Hands were not opened.

## Hub observations

The hub loaded successfully with a two-column card grid and all nine requested tiles visible after full-page capture: Picture Telephone, Blame Chain, Wrong Answers Only, Most Likely Pass, Zone Whack, Pass Bomb, Corner Claim, Green Flash, Steady Hands. Each card has a clear title, short lede, player count/time, and black Play CTA. Header copy is “Games / One phone. Pass in the app.” Footer says “No accounts · Runs in the link.” Card accent colors include coral, teal/lime, yellow, periwinkle, green, and blue; Play CTAs are consistently black rather than violet/lime. Hub screenshot:

- `/tmp/.sand-browser/shot-call_9RKAzYol7UvnLXNvWRJGWbljfc_09a6b9905c935030.png`

## Per-game findings

### 1. Picture Telephone
- **Load:** partial/failed UX. URL and shared header load, but body below the header is completely blank; only title, `?` How to play button, and `‹ Games` are present.
- **Reached:** no home CTA/setup; clicking How to play produced no visible modal or steps.
- **Issues:** hard dead end; no title/lede/primary CTA in content area despite the tile promising “Draw → write → draw.”
- Screenshot: `/tmp/.sand-browser/shot-call_90ZBbDP12U8zvKy2NpzkoOo2fc_09a6b9905c935030.png`

### 2. Blame Chain
- **Load:** OK.
- **Screens reached:** home (title “Blame Chain”, lede “Pass the phone. Accuse everyone.”, Start a round), 3-step How to play, player setup with two prefilled names, pass-to-player screen, and underlying alibi/accused-player form.
- **How-to:** 3 steps: add who’s playing; blame someone and write an alibi; pass then see who got roasted.
- **Issues:** after clicking “I’m Maya” twice, the dark pass overlay remained visibly unchanged; the underlying form was present with Done disabled, creating a possible pass/reveal dead end on desktop. Back to Games was consistently present.
- Screenshots: `/tmp/.sand-browser/shot-call_i8vGm0xAVMaoThmLNUPpXNzpfc_09a6b9905c935030.png`, `/tmp/.sand-browser/shot-call_EXoFCChvvfbUNx6q2QYs8aEXfc_09a6b9905c935030.png`

### 3. Wrong Answers Only
- **Load:** OK.
- **Screens reached:** home, 3-step how-to, player setup, prompt “Closest planet to the Sun?”, wrong-answer textarea, submission, and pass screen to second player.
- **How-to:** read question; type a wrong answer; vote the funniest.
- **Notes/issues:** desktop path works with two prefilled players and a typed answer. Full-page capture while scrolled shows the fixed header repeated across/over the content, which can obscure the play card visually. Back to Games present.
- Screenshot: `/tmp/.sand-browser/shot-call_RXv7GoSb0RwKYwSPp2DybY9sfc_09a6b9905c935030.png`

### 4. Most Likely Pass
- **Load:** OK.
- **Screens reached:** home, 3-step how-to, player setup, pass-to-player screen, player selection (“Who fits? Tap to pick.”), and second pass screen.
- **How-to:** read prompt; pick who fits; pass the phone.
- **Notes:** two prefilled players allow desktop progression; selecting the other player advanced to the next pass. The pass card is dark and the identity CTA is white; no violet/lime CTA problem observed. Back to Games present.
- Screenshots: `/tmp/.sand-browser/shot-call_g2hm6GsnQlNhO0mj3Em58V62fc_09a6b9905c935030.png`, `/tmp/.sand-browser/shot-call_bmelaBTodv6w0BNJZRm79ndofc_09a6b9905c935030.png`

### 5. Green Flash
- **Load:** OK.
- **Screens reached:** home, 3-step how-to, mode picker, Versus player count, two-player split screen, green state, and Round 1 result after a desktop tap.
- **How-to:** wait for green; tap fast; don’t false-start.
- **Split/orientation:** Versus picker explicitly says “2–4 on one screen · split zones”; 3–4-player setup says “3–4 need landscape.” With 2 players setup says “Split left / right.” The desktop split screen rendered two large tap zones and advanced to “P1 · 12356 ms” / “First to 3 · best of 5.” No separate portrait warning appeared for the 2-player path.
- Screenshot: `/tmp/.sand-browser/shot-call_uYciNiEX4dMmzRMIjjXWM0tdfc_09a6b9905c935030.png`

### 6. Corner Claim
- **Load:** OK.
- **Screens reached:** home, 3-step how-to, player-count setup; selected 2 players and reached enabled “Grab corners” CTA. Did not start the touch/multiplayer round before wrap-up.
- **How-to:** pick a corner; mash/hold to paint; most fill wins.
- **Split/orientation:** setup says “3–4 work best in landscape”; two-player selection says “Split left / right.” This is clear on the desktop setup screen. Back to Games present.
- Screenshot: `/tmp/.sand-browser/shot-call_YMhUIXkTkmBkNnsKD4GJLdGMfc_0f148855848b1e6c.png`

### 7. Pass Bomb
- **Not opened** due to wrap-up steering.

### 8. Zone Whack
- **Not opened** due to wrap-up steering.

### 9. Steady Hands
- **Not opened** due to wrap-up steering. Desktop empty-state / DeviceMotion messaging therefore not verified.

## Top phone-UX blockers desktop cannot fully prove

1. Real multi-touch, simultaneous corner/zone claims, and touch target separation cannot be validated with this desktop run.
2. Physical orientation behavior and landscape lock/rotation messaging cannot be fully proven; only the visible “need landscape” / “work best in landscape” copy was observed.
3. DeviceMotion permission, denied-motion fallback, sensor sampling, and Steady Hands desktop empty-state remain untested.
4. Timing/tap latency, false-start handling under real fingers, haptics, and keyboard/mobile viewport behavior remain unproven.
5. Picture Telephone is a concrete blocker now: its live page exposes only navigation/how-to chrome and no playable body or CTA.

## PT blank body follow-up

- **Root cause:** `games/picture-telephone/js/app.js` had a corrupted function declaration `function escapeHtmlfunction escapeHtml(s)` (duplicate identifier mash). The module failed to parse (`SyntaxError: Unexpected identifier 'escapeHtml'`), so `init()` never ran, no screen received `.active`, and CSS `.screen { display: none }` left the body blank. Header/`?` chrome stayed visible because they are outside `#app` screens; How-to did nothing because listeners were never bound.
- **Fix (workspace only, not pushed):** restored `function escapeHtml(s) { ... }`.
- **Verify:** `node --input-type=module -e 'import("./js/app.js")'` from `games/picture-telephone/js` should no longer SyntaxError (DOM `document` error in Node is expected). Or serve hub root and open `/games/picture-telephone/` — `#screen-home` should be `.active` with “Start a game”.
- **Live:** GH Pages still served the broken file at smoke time; redeploy needed for production.
