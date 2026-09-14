# Most Likely Pass — mobile smoke test

- URL: https://cliren.github.io/games/games/most-likely-pass/
- Tested: 2026-09-14 08:31–08:34 UTC
- Viewport: 390×844, mobile emulation
- Cache: hard reload performed before testing (`ignoreCache: true`)

## Outcome

The core flow is usable end-to-end on the live build: Home → How to play → names (2 players) → Start → “I’m {name}” → pick who fits → next player → Results/“Who picked whom” → Show all.

## Repro / findings

1. Home rendered correctly. The `?` How to play control opened a bottom-sheet modal; `Got it` closed it. Screenshot: [how-to](screenshots/mlp-how-to-mobile.png).
2. Start a round opened the 2-player names screen. I changed the displayed names to **Alice** and **Bob** and tapped Start.
3. **Name mismatch bug:** the names screen showed Alice/Bob, but the first pass screen rendered **“Pass to Alex” / “I’m Alex”** while the footer identified the current player as **Alice (1 / 2)**. The other player was Bob. This is a concrete mobile/live-build repro of stale or incorrect first-player display data. After choosing Bob, the second pass correctly rendered Bob.
4. Tapping `I’m Alex` did not visibly change the viewport because the pick panel was below the fold; scrolling revealed the prompt and Bob choice. This was not a dead tap/stuck state, but the required next action is easy to miss on a phone.
5. Selecting Bob advanced to the second pass; selecting Alice advanced to `Who picked whom`. `Next` revealed the second result and `Show all` expanded both rows:
   - Alice → Bob
   - Bob → Alice
6. Results were present and readable; no separate Wrapped screen appeared after Show all. No blank buttons or dead taps were observed. The `Done` button was correctly disabled until a choice was made.
7. No JS errors were visible in the page UI; DevTools console was not open during this smoke run.

Final results screenshot: [results](screenshots/mlp-results-mobile.png).

## Verdict

**Partial pass:** the full interaction completes and Results works, but the first-player name mismatch (Alice displayed as Alex) is a concrete UX/data bug, and the “I’m …” action/prompt is below the fold after the first tap on a 390×844 viewport.
