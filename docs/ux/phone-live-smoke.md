# Phone live smoke test

Date: 2026-09-14 (UTC)  
Viewport: 390 x 844 via browser device emulation. Hub was hard-refreshed first.

The live build was being superseded by a fixed build, so testing stopped after the steering update; entries below distinguish observed results from not reached.

## Steady Hands

- **Load OK?** Yes. Home loaded at phone width; first visit opened the “How to play” modal automatically. `?` opens the same help.
- **Blank buttons?** No. Home showed labeled `Play` and `Resume`; flow showed labeled player/measurement/results controls.
- **Win validation?** Reached Results. Both default players measured `0.0`, and both were labeled “Steadiest”; the UI does not resolve the tie to a single winner, so validation is unclear for equal scores. Subtitle says “Least shake wins.”
- **Screenshots:** `phone-live-smoke-steady-hands-home.png`, `phone-live-smoke-steady-hands-results.png`

## Zone Whack

- **Load OK?** Yes. Home loaded and the “How to play” modal appeared; `?`/help is present and labeled.
- **Blank buttons?** No visible blank buttons. Home had labeled `Play`; the next screen had `2`, `3`, `4`, `Go`, and `Back` (with `Go` disabled until a player count is selected).
- **Win validation?** Not reached. Primary action reached player-count setup only; stopped before selecting players/Results.
- **Screenshots:** `phone-live-smoke-zone-whack-home.png`

## Pass Bomb

- **Load OK?** Not reached before stopping.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.

## Corner Claim

- **Load OK?** Not reached before stopping.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.

## Green Flash

- **Load OK?** Not reached before stopping.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.

## Most Likely Pass

- **Load OK?** Not reached before stopping.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.

## Wrong Answers Only

- **Load OK?** Not reached before stopping.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.

## Blame Chain

- **Load OK?** Not reached before stopping.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.

## Picture Telephone

- **Load OK?** Not reached in this smoke pass.
- **Blank buttons?** Not checked.
- **Win validation?** Not checked.
- **Screenshots:** None.
