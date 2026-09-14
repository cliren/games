# Hub playtest review

**Status:** Fixes in progress / ready to push
**Date:** 2026-09-14
**Live:** https://cliren.github.io/games/
**Source:** `/workspace/picture-telephone/`

## Locked product rules (do not reopen)
- Static GitHub Pages only; no CDN/backends
- Light paper/ink `#FAF8F5` / `#1C1917`; primary CTAs black/white (no violet/lime CTAs)
- Accents match hub tiles only (decorative, not primary buttons)
- In-app hotseat: `Pass to {name}` → `I'm {name}` (no WhatsApp/Messages as main path)
- How-to: 3 verbs, `howto:<slug>:v1` once
- Auto fun names + Shuffle; min 2 players (Picture Telephone solo 1 OK)
- Clear Results/validation screens
- System fonts; Gen Z dry voice

## Accent map
| Game | Accent |
|------|--------|
| Picture Telephone | coral `#F97066` |
| Blame Chain | teal `#2DD4BF` |
| Wrong Answers Only | amber `#FBBF24` |
| Most Likely Pass | indigo `#818CF8` |
| Green Flash | green `#22C55E` |
| Corner Claim | teal `#2DD4BF` |
| Pass Bomb | amber `#FBBF24` |
| Zone Whack | indigo `#818CF8` |
| Steady Hands | sky `#38BDF8` |

## Method
For each game: read `index.html`, `css/styles.css`, `js/app.js`, `js/howto.js`, `js/data.json` if present. Trace happy path + edge cases in code. Note click-count from hub tile to first fun beat. Flag dead ends, unclear copy, broken Results, missing landscape gates, CTA color violations, missing hotseat, how-to gaps, performance smells (CDN, heavy DOM).

Code audit only (static read of source). No device multi-touch smoke in this pass.

---

### Hub (`index.html` + `css/hub.css`)
- **Flow map:** Hub home → tap tile → game folder
- **Playtest notes (Games):**
  - Works: paper/ink tokens, B/W tile Play chrome (`--cta: #111`), 4px left rails + punch panels per accent, footer `No accounts · Runs in the link`, 0 CDN/webfonts, all 9 games linked playable.
  - Meta description matches Decision (`Pass-the-phone games. No login.`) but visible lede drifted to `One phone. Pass in the app.`
  - 2-col grid from 340px+ (Decision preferred single vertical list on phone) — denser; chiefs should confirm.
  - Tile order is jumbled vs build waves (text pack → Zone Whack → Pass Bomb → Corner Claim → Green Flash → Steady Hands). Discoverability of “reflex pack” suffers.
  - Green Flash hub tile uses `--tile-green: #22C55E` while in-game `--accent` is rose `#F43F5E` (see Green Flash).
- **Severity:** P1 · P2
- **Findings table:**
| ID | Severity | Issue | Evidence (file:line or behavior) | Proposed fix |
|----|----------|-------|----------------------------------|--------------|
| HUB-01 | P1 | Green Flash hub tile green ≠ in-game accent rose | `css/hub.css:26` `--tile-green: #22C55E`; `games/green-flash/css/styles.css:12` `--accent: #F43F5E` | Pick one identity hue; sync hub class + in-game `--accent` (flash green `--flash` can stay) |
| HUB-02 | P2 | Hub lede ≠ locked Decision copy | `index.html:16` vs Decision hub line / `index.html:7` meta | Restore `Pass-the-phone games. No login.` or chiefs re-lock lede |
| HUB-03 | P2 | Tile order not grouped by play style | `index.html` list order | Reorder: PT → text pack → GF → CC → PB → ZW → SH (or chiefs’ IA) |
| HUB-04 | P2 | 2-col grid vs Decision phone list | `css/hub.css:111–118` | Keep if density wins; else 1-col until ≥480px |
- **UX Chief · Apple:**
  - **Keep:** Paper/ink + B/W Play chrome; per-tile accent rails; 0 CDN; footer honesty.
  - **Kill:** Lede drift (`One phone. Pass in the app.`) — restore Decision line `Pass-the-phone games. No login.` (HUB-02).
  - **Fix:** **HUB-01** sync Green Flash identity (hub green ↔ in-game `--accent`) before Suren plays. **HUB-03** reorder tiles: PT → Blame → WAO → MLP → Green Flash → Corner Claim → Pass Bomb → Zone Whack → Steady Hands (story then reflex).
  - **Call:** **HUB-04** — keep 2-col from ~400px if tiles stay ≥44px tap and one-line hooks don’t wrap into mush; else 1-col to 480. Density OK; clutter not.
  - **Endorse:** Games P1/P2 on hub. Accents already shipped differ from early color-and-clicks hexes — **lock shipped map** in this file; don’t repaint all tiles mid-playtest.
- **UX Chief · Tesla:**
  - **Keep:** B/W Play chrome, paper/ink shell, accent rails, 0 CDN. Identity color on rails only — correct.
  - **Kill:** Jumbled tile order (HUB-03). Reflex pack should read as a pack. Lede drift (HUB-02) — restore Decision: `Pass-the-phone games. No login.` Meta and visible line must match.
  - **Fix:** HUB-01 is real P1 — green tile vs rose in-game is a broken brand promise. Sync to **one** Green Flash hue (prefer hub green `#22C55E` as `--accent`; keep flash green). Don’t invent a third.
  - **HUB-04:** Keep **2-col from ~360px** — Decision’s 1-col was for early hub density; 9 games make a single column feel like a settings list. Endorse density; don’t reopen.
  - **Missed:** No empty state if a game 404s; fail-soft “Game missing” not needed if all ship. Fine.

---

### Picture Telephone (`games/picture-telephone/`)
- **Flow map:** home → setup → draw → curtain (Pass to / I’m) → describe|draw… → reveal → end
- **Playtest notes (Games):**
  - Solid: coral `#F97066` matches hub; B/W CTAs; solo 1 OK with turns picker; fun names + Shuffle; hotseat primary (`I’m {name}`) with Copy link secondary ghost; hash soft/hard → turn-file (`state.js`); how-to 3 verbs + `howto:picture-telephone:v1`; no WhatsApp/Messages path; Join screen reserved for link paste path.
  - Clicks hub→draw: tile → Start a game → Start drawing = **3** (then first stroke = fun).
  - Curtain prefills next roster seat → one-tap `I’m {name}` when names known (`app.js:378–414`).
- **Severity:** (none blocker) · polish only if chiefs want
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| PT-01 | P2 | Join-link path still labeled Continue | `index.html:121` `btn-join-go` | Rename to `Open turn` / `Continue turn` for clarity — not a Continue-only interstitial on hotseat |
| PT-02 | — | Happy path solid | accents, hotseat, how-to, Results/reveal | No change required |
- **UX Chief · Apple:**
  - **Keep:** Coral accent match; hotseat-primary; curtain prefill → one-tap `I’m {name}`; solo 1; how-to 3 verbs; Copy link secondary. Hub→draw in 3 clicks is the bar.
  - **Kill:** Nothing structural. Don’t reintroduce WhatsApp/share-sheet as primary.
  - **Fix:** **PT-01** rename Join CTA to `Open turn` (link path only — never looks like a hotseat Continue interstitial).
  - **Endorse:** PT-02 happy path — ship-quality for Suren after label polish.
- **UX Chief · Tesla:**
  - **Keep:** Hotseat-primary, Copy secondary, hash→turn-file, coral synced, how-to once, 3 taps to ink. This is the reference Kit H/P hybrid.
  - **Kill:** Nothing structural. Don’t add WhatsApp share sheets.
  - **Fix:** PT-01 rename Join Continue → `Open turn` (P2). Optional: ensure first stroke latency stays ≤16ms (code-audit can’t prove; smoke on mid Android before Suren).
  - **Landscape:** Drawing in landscape OK — no pause gate required (not simultaneous multi-touch arena).

---

### Blame Chain (`games/blame-chain/`)
- **Flow map:** home → names → turn (curtain state + blame+alibi) ×N → reveal → board
- **Playtest notes (Games):**
  - Solid: teal `#2DD4BF`; blame+alibi one screen; P1 skips curtain; `Pass to` / `I'm`; fun names + Shuffle; board with Main suspect accent bar; how-to matches batch notes.
  - Clicks hub→act: tile → Start → Start (names) = **3** (P1 lands on chips).
  - Last Done → reveal step-through (not auto-board). Tesla color-and-clicks preferred board immediately after last Done; current matches Apple reveal→board. Flag for chiefs, not a bug.
- **Severity:** P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| BL-01 | P2 | Post-round lands on Reveal before Board | `app.js:376–381` `phase = "reveal"` | Keep (Apple) or auto-board after last Done (Tesla) — chiefs pick |
| BL-02 | — | Turn merge + hotseat correct | `index.html:54–74`, `app.js:279–316` | — |
- **UX Chief · Apple:**
  - **Keep:** Blame+alibi one screen; P1 skips curtain; Main suspect accent bar; hub→act in 3.
  - **Kill:** Auto-jump to Board after last Done (**BL-01**). Reveal step-through *is* the roast — Board is the punchline after. Lock Apple path: Reveal → Board.
  - **Fix:** None beyond keeping BL-01 as intentional. Optional: first reveal card title `The accusations` if missing.
  - **Endorse:** Games “not a bug” framing — chiefs pick = **Apple keep reveal**.
- **UX Chief · Tesla:**
  - **Keep:** Merged blame+alibi, P1 skip curtain, curtain-as-state, Main suspect bar, 3 taps to act. Matches color-and-clicks.
  - **BL-01:** I previously wanted auto-board; **Apple reveal step-through wins for party** — keep Reveal→Board. Soften: after last Done land on reveal step 0 immediately (no “Ready?”). Current behavior OK — **do not auto-skip reveal**.
  - **Kill:** Any deck-tone picker if it crept in. Chaotic only.
  - **Fix:** None P1. Confirm pass curtain unmounts prior alibi from DOM (privacy) — Games didn’t flag; spot-check once.

---

### Wrong Answers Only (`games/wrong-answers-only/`)
- **Flow map:** home → names → write-turn (curtain+write) ×N → vote-turn (curtain+vote) ×N → podium
- **Playtest notes (Games):**
  - Solid: amber `#FBBF24`; P1 skips write + first vote curtain; tap-commit votes; prompt chip on act; Too-right name = ink strikethrough (not danger red); how-to 3 verbs.
  - Clicks hub→write: **3**.
  - CSS selector mismatch: JS emits `board-tag too-right-tag` but CSS styles `.board-tag.too-right` — tag weight/color may not apply (name strikethrough still works).
  - `btn-vote-done` forced `hidden` always — Tesla asked Done as a11y backup for tap-commit.
- **Severity:** P1 · P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| WAO-01 | P1 | “Too right” tag class never matches CSS | `app.js:471` `too-right-tag` vs `css/styles.css:629` `.board-tag.too-right` | Use `class="board-tag too-right"` (or add `.too-right-tag` rule) |
| WAO-02 | P2 | Vote Done backup always hidden | `app.js:415–416` | Show visually-hidden / sticky Done for keyboard/SR; keep tap-commit default |
| WAO-03 | — | Podium + Too-right name treatment OK | `css/styles.css:623–631` | — |
- **UX Chief · Apple:**
  - **Keep:** Amber tile accent; tap-commit vote; Too-right as ink strikethrough (not danger); P1 curtain skips; prompt on act screen.
  - **Kill:** Visible sticky Vote Done competing with tap-commit (visual chrome).
  - **Fix:** **WAO-01 P1** — class must be `board-tag too-right` so CSS hits; silent style bugs erode Results trust. **WAO-02** — keep Done as visually-hidden / SR-only backup, not a second visible primary.
  - **Endorse:** WAO-01 as real P1; podium structure is clear once tag styles apply.
- **UX Chief · Tesla:**
  - **Keep:** Tap-commit votes, P1 skip, prompt chip, Too-right as strikethrough not danger-red, amber accent.
  - **Fix P1:** WAO-01 — class mismatch is a real ship bug. Use `board-tag too-right`. Endorse Games severity.
  - **Fix P2:** WAO-02 — restore visually-hidden / sticky Done for SR/keyboard; tap-commit stays default. I asked for this backup; hiding forever fails a11y.
  - **Kill:** Any “Vote together” toggle if present — privacy stays.
  - **Missed:** Empty answers / all Too-right podium — need fail-soft line (`Nobody survived`) so Results never blank. Add if missing.

---

### Most Likely Pass (`games/most-likely-pass/`)
- **Flow map:** home → names → turn (curtain+pick) ×N → reveal → auto Wrapped
- **Playtest notes (Games):**
  - Solid: indigo `#818CF8`; tap-commit picks; P1 skip curtain; auto Wrapped after last reveal Next (`app.js:492–494`); fun names + Shuffle.
  - Clicks hub→pick: **3**.
  - How-to step 3 is `Pass the phone` — never teaches Reveal/Wrapped (the payoff).
  - Pass title uses plain textContent (no `<strong>` on name) — fine visually; inconsistent with other games’ markup.
- **Severity:** P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| MLP-01 | P2 | How-to misses reveal payoff | `index.html:129–133` | e.g. `1. Read the prompt. 2. Tap who fits. 3. Reveal who everyone picked.` |
| MLP-02 | — | Auto Wrapped + tap-commit OK | `app.js:2`, `492–494` | — |
- **UX Chief · Apple:**
  - **Keep:** Tap-commit picks; auto Wrapped after last Next; indigo as *tile* accent (not CTA) — acceptable under Decision (banned violet was `#5B4CDB` brand CTA, not soft indigo rail).
  - **Kill:** How-to that stops at “pass the phone” without the payoff.
  - **Fix:** **MLP-01** rewrite steps: `1. Read the prompt. 2. Tap who fits. 3. Reveal who everyone picked.` Pass curtain stays in UI; how-to teaches the joke.
  - **Endorse:** Flow is calm; how-to is the only clarity gap.
- **UX Chief · Tesla:**
  - **Keep:** Tap-commit, P1 skip, auto Wrapped, fixed seat order, indigo identity.
  - **Fix:** MLP-01 — how-to must teach the payoff. Adopt Games’ 3 lines (or: `1. Read the prompt. 2. Tap who fits. 3. See who everyone picked.`). P2 but high laugh-ROI.
  - **Kill:** Force-directed pick graphs if anyone adds them. Stepped reveal + Wrapped only.
  - **Missed:** Wrapped with zero Mutuals — show `None this round` explicitly (empty-state). Magnet ties: list ties, don’t invent a crown war.

---

### Green Flash (`games/green-flash/`)
- **Flow map:** home → mode (versus|hotseat) → versusCount|names → [rotate gate] → arena|pass+hotseat → round → results
- **Playtest notes (Games):**
  - Fun beat works: wait → `--flash: #22C55E` → first zone tap; false-start stun (`app.js:300+`); landscape gate for 3–4; hotseat `Pass to` / `I’m`; fun names + Shuffle; B/W primary CTAs.
  - **Accent identity break:** in-game chrome accent is rose `#F43F5E` while hub tile is green `#22C55E`. Flash color correctly green; identity rail is not.
  - Clicks hub→versus wait: tile → Play → Versus → count → Start = **5** (+ possible rotate). Hotseat adds names screen.
  - Hub meta `2–4` omits hotseat 2–8 capacity shown in-game.
- **Severity:** P1 · P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| GF-01 | P1 | Hub tile accent ≠ in-game `--accent` | Hub `tile--green` / `--tile-green`; `css/styles.css:12` `#F43F5E` | Set `--accent` to hub green (or retile hub to rose) — keep `--flash` green either way |
| GF-02 | P2 | Hub meta understates hotseat | `index.html:168` `2–4` vs `MIN_HOTSEAT/MAX_HOTSEAT` 2–8 | Meta `2–8 · ~5 min` or `2–4 together · hotseat 8` |
| GF-03 | P2 | Long path to first green | mode + count screens | Optional: default Versus+2 and skip mode for return players |
- **UX Chief · Apple:**
  - **Keep:** Flash green `#22C55E` as the fun beat; false-start stun; landscape gate; hotseat labels; B/W CTAs.
  - **Kill:** Rose `#F43F5E` as identity `--accent` while hub tile is green — reads like two different games (**GF-01 / HUB-01**).
  - **Fix:** Set in-game `--accent` to hub green (or shared `--tile-green`). Keep `--flash` green. Cut clicks where cheap: remember last mode (Versus/Hotseat) so return players skip mode pick (**GF-03** soft). **GF-02** hub meta must admit hotseat 2–8.
  - **Call:** 5 clicks to versus wait is heavy vs text games’ 3 — don’t add more gates; shorten, don’t decorate.
  - **Endorse:** GF-01 as P1 (identity), GF-02/03 as P2.
- **UX Chief · Tesla:**
  - **Keep:** Flash green, false-start stun, landscape gate 3–4, hotseat labels, B/W CTAs. Fun beat is clear.
  - **Fix P1:** GF-01 / HUB-01 — **in-game `--accent` must match hub tile.** Rose chrome on a “Green Flash” tile is incoherent. Set `--accent: #22C55E` (or hub’s `--tile-green`); keep `--flash` green. Kill rose identity.
  - **Fix P2:** GF-02 meta honesty. GF-03 — **default Versus + 2** and skip mode for return visits (`localStorage` last mode). 5 taps to first green is fat; cold start should be ≤3 (tile → Play → Start with remembered mode).
  - **Multi-touch / landscape:** Endorse pause-while-gated (verify GF pauses like Corner Claim — if not, copy CC). Latency: flash→input must feel instant; no 300ms tap delay hacks on arena.
  - **Kill:** Mode screen every session once user has a preference.

---

### Corner Claim (`games/corner-claim/`)
- **Flow map:** home → count → arena (countdown → paint) → results
- **Playtest notes (Games):**
  - Solid: teal accent; hold-to-paint rAF; multi-zone pointers; landscape gate for 3–4 **pauses** countdown/paint clock (`app.js:236–271`); Results with % + tie copy; how-to 3 verbs.
  - Clicks hub→countdown: tile → Play → Grab corners = **3**.
  - No name hotseat (simultaneous split) — correct for Kit S.
- **Severity:** (solid)
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| CC-01 | — | Landscape pause + results clear | `app.js:92–101`, `267–271`, `305–324` | Reference impl for Zone Whack |
- **UX Chief · Apple:**
  - **Keep:** As reference Kit S — 3 clicks to countdown, landscape pause that actually pauses, clear % Results, teal accent sync. This is the template Zone Whack should copy.
  - **Kill:** Nothing.
  - **Fix:** None. Use CC pause pattern for ZW-01.
  - **Endorse:** Solid — Suren-ready.
- **UX Chief · Tesla:**
  - **Keep:** This is the **reference Kit S** — 3 taps to countdown, hold-to-paint, multi-pointer, landscape pause that actually stops the clock, clear Results %. Ship pattern to Zone Whack unchanged.
  - **Kill:** Don’t add names/hotseat here. Simultaneous split is the product.
  - **Fix:** None. Optional: empty/tie Results copy already noted as clear — good.
  - **Perf:** rAF paint — watch long tasks; keep zone hit tests cheap.

---

### Pass Bomb (`games/pass-bomb/`)
- **Flow map:** home → names → play (curtain + category/fuse) → boom → … → results
- **Playtest notes (Games):**
  - Solid: amber accent; random fuse 5–12s; escalating beeps; curtain stops fuse; `I'm {name}`; P1 first life skips curtain; 54 categories in `data.json`; Results survivors; tab-hide pauses fuse.
  - Clicks hub→category: **3** (P1).
  - Batch plan said 3–8; hub + code allow 2 (locked min-2 rule wins). With 2 players game is short but valid.
- **Severity:** P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| PB-01 | P2 | 2-player bomb feels thin vs “last standing” fantasy | `app.js:6` `MIN_NAMES = 2`; hub meta `2–8` | Optional soft hint “Best with 3+” — do not raise hard min without chiefs |
| PB-02 | — | Fuse/curtain/hotseat correct | `app.js:373–393`, `425–477` | — |
- **UX Chief · Apple:**
  - **Keep:** Amber accent; fuse pauses on curtain + tab-hide; P1 skip; survivors Results; hotseat `I’m {name}`.
  - **Kill:** Raising hard min above 2 (locked min-2). Thin 2p is OK.
  - **Fix:** **PB-01** optional caption under names or on home: `Best with 3+` — soft, not blocking.
  - **Endorse:** Happy path clear; severity P2 only.
- **UX Chief · Tesla:**
  - **Keep:** Fuse pause on curtain + tab-hide, P1 skip, hotseat labels, Results survivors, amber accent. Correct Kit H timer game.
  - **PB-01:** Soft hint `Best with 3+` under names — **don’t raise hard min** (locked min-2). Endorse Games.
  - **Kill:** Extra “arm bomb” confirm screens if any.
  - **Missed:** Boom mid-type — category field should blur/disable cleanly; Results must always list who’s out vs last standing (never empty shell).

---

### Zone Whack (`games/zone-whack/`)
- **Flow map:** home → count → ready → play (countdown → moles) → results
- **Playtest notes (Games):**
  - Accent indigo matches hub; moles zone-scoped; Results with winner/tie; how-to present; landscape gate UI exists.
  - **P1:** Extra Continue screen (count → ready) vs Corner Claim’s count→arena. Extra click before fun.
  - **P1:** If user rotates to portrait mid-round (3–4), full-screen gate shows but `tick` keeps running — timer expires / moles spawn while input blocked (`app.js:91–93` comment; `tick` at `307–331` has no pause). Corner Claim pauses correctly.
  - How-to lines missing terminal periods (inconsistent).
  - Clicks hub→Go: tile → Play → pick count → Continue → Go = **4** (+ countdown).
- **Severity:** P1 · P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| ZW-01 | P1 | Landscape gate mid-play does not pause round | `app.js:91–93`, `307–331`; gate `css/styles.css:571–583` | Pause `roundStart` / spawn clock while gated (copy Corner Claim pattern) |
| ZW-02 | P1 | Extra Continue between count and ready | `index.html:48` `btn-count-next` Continue; ready is separate | Merge count→ready preview on one screen, or rename Continue→Next and cut ready if preview not needed |
| ZW-03 | P2 | How-to punctuation inconsistent | `index.html:109–111` | Add periods; keep 3 verbs |
- **UX Chief · Apple:**
  - **Keep:** Indigo accent match; zone-scoped moles; Results; how-to present.
  - **Kill:** The extra Continue between count and ready (**ZW-02**) — classic Continue-only interstitial we banned in color-and-clicks. Merge count + ready preview, primary `Go`.
  - **Fix:** **ZW-01 P1** — landscape gate mid-play *must* pause the round clock (copy Corner Claim). Playing under a blocker that still scores is broken fairness, not polish. **ZW-03** periods on how-to.
  - **Endorse:** ZW-01 and ZW-02 as top P1s — do these before Suren plays reflex pack.
- **UX Chief · Tesla:**
  - **Fix P1 (endorse + escalate):** ZW-01 — gate without pause is a **fairness bug**, not polish. Copy Corner Claim pause. Do this before Suren plays.
  - **Fix P1:** ZW-02 — **kill Continue**. Count + ready preview on one screen, primary `Go`. Target hub→moles = **3** taps like Corner Claim.
  - **Fix P2:** ZW-03 periods.
  - **Keep:** Indigo sync, zone-scoped moles, Results winner/tie.
  - **Missed:** Multi-touch — ensure two zones can score on the same frame (no shared debounce killing P2). Landscape rotate back to play should resume, not reset round.

---

### Steady Hands (`games/steady-hands/`)
- **Flow map:** home → names → turn (curtain → ready → measure|hold → score) ×N → results
- **Playtest notes (Games):**
  - Solid: sky `#38BDF8`; hotseat labels; P1 skip curtain; iOS permission path; desktop/`pointer: fine` → hold-button fallback (better than dead end); Results ranked by shake; how-to mentions motion permission.
  - Clicks hub→measure CTA: **3** (P1).
  - Batch plan said laptop empty-state “needs a phone”; hold fallback is a deliberate upgrade — call out as intentional, not a bug.
  - Hold control uses accent wash/fill (interaction surface, not primary nav CTA) — OK under accent rules.
- **Severity:** P2
- **Findings table:**
| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| SH-01 | P2 | No explicit “needs a phone” empty on home | `app.js:390–407` silent hold fallback | Optional one-line on home: `Phones best · laptop uses Hold` |
| SH-02 | — | Motion + hold + results solid | measure/hold paths, `showResults` | — |
- **UX Chief · Apple:**
  - **Keep:** Sky accent; hotseat; P1 skip curtain; hold fallback on `pointer: fine` (intentional upgrade over dead-end); Results by shake; how-to mentions permission.
  - **Kill:** Scaring laptop users with a hard empty state.
  - **Fix:** **SH-01** one quiet line on home: `Phones best · laptop uses Hold` — sets expectation without blocking.
  - **Endorse:** Solid; P2 only. Accent wash on hold control is OK (interaction surface ≠ nav CTA).
- **UX Chief · Tesla:**
  - **Keep:** Hold fallback on `pointer: fine` is the right fail-soft — better than a dead “needs a phone” brick. Hotseat, P1 skip, ranked Results, sky accent.
  - **SH-01:** One line on home: `Phones best · laptop uses Hold` — P2, ship it.
  - **Kill:** Don’t remove hold path to “force phones.”
  - **Missed:** iOS permission deny → land on hold with clear copy (`Motion blocked · use Hold`), not a silent broken measure. Permission prompt shouldn’t appear every turn — once per session.

---

### Priority backlog (Games)

**P0** — none found on cold-start happy paths (static audit). Ship blockers not observed for: CDN, violet/lime CTAs, missing how-to keys, missing Results shells, missing hotseat on Kit H games.

**P1**
1. **ZW-01** — Zone Whack: pause round clock while landscape gate covers play
2. **GF-01 / HUB-01** — Green Flash hub tile green vs in-game rose accent — sync identity
3. **WAO-01** — Wrong Answers Only: fix `too-right` tag class/CSS mismatch
4. **ZW-02** — Zone Whack: drop or merge Continue between count and ready

**P2**
5. **HUB-02** — Restore or re-lock hub lede copy
6. **HUB-03** — Reorder hub tiles by play style
7. **MLP-01** — How-to should mention reveal/Wrapped
8. **GF-02** — Hub meta for Green Flash hotseat range
9. **WAO-02** — Vote Done a11y backup
10. **HUB-04** — Confirm 2-col hub grid vs Decision list
11. **BL-01** — Reveal vs auto-board after last Blame Done (chiefs)
12. **PB-01** — Optional “best with 3+” for Pass Bomb
13. **SH-01** — Optional laptop hint on Steady Hands home
14. **ZW-03** — How-to punctuation
15. **GF-03** — Optional shorter path to versus flash
16. **PT-01** — Join Continue label polish


### Apple priority list (endorsement + adds)

**Endorse Games:** P0 = 0 is correct on cold-start happy paths. Their P1 quartet is the right ship gate.

**Do before Suren plays (P1 — same order as Games, Apple-weighted):**
1. **ZW-01** — Zone Whack pause under landscape gate (fairness bug)
2. **ZW-02** — Merge/drop Continue between count and ready (click-cut rule)
3. **GF-01 / HUB-01** — Green Flash accent identity sync (hub ↔ `--accent`)
4. **WAO-01** — Too-right CSS class match (Results trust)

**P2 before polish pass:** HUB-02 lede restore · HUB-03 tile reorder · MLP-01 how-to payoff · GF-02 meta · BL-01 keep Reveal→Board (no code if already reveal-first) · SH-01 laptop hint · PB-01 best-with-3+ · WAO-02 SR Done · PT-01 Open turn · ZW-03 how-to periods · GF-03 remember mode · HUB-04 2-col confirm

**Missed / add (Apple):**
- **ACCENT-LOCK** — Treat the Accent map in this file as source of truth going forward (shipped hexes beat earlier color-and-clicks proposals). Update `color-and-clicks.md` accents to match when convenient — don’t block ship.
- **No new P0.** Don’t invent blockers for Suren.

**Apple north star for fixes:** one primary action, curtain as state not route, accents on rails/selection only, B/W CTAs forever, Results readable without decoding.

### Process for new games
1. Build under `games/<slug>/` with shared tokens, 3-verb how-to (`howto:<slug>:v1`), B/W CTAs, hub tile accent synced to `--accent` (Accent map in this file is source of truth).
2. Games playtest: trace happy path + edges in code; append a section to this file (Flow map · notes · Severity · Findings table · empty Apple/Tesla headings).
3. UX Chief · Apple and UX Chief · Tesla comment in-place under each game.
4. Fix ranked P0→P2 backlog (Apple + Tesla ship lists); retest changed flows; append a **Games fix pass** note with file paths.
5. Only then push / tell Suren — never push mid-fix.


### Tesla priority list (actionable)

Endorse Games’ P0=0. Challenge nothing on P1 count — their five themes are real; I collapse GF/HUB accent into one item.

**Ship before Suren plays (P1):**
1. **ZW-01** — Zone Whack: pause clock under landscape gate (copy Corner Claim). Fairness bug.
2. **ZW-02** — Zone Whack: kill Continue; count+Go ≤3 taps hub→fun.
3. **GF-01 / HUB-01** — Green Flash `--accent` = hub green; kill rose identity chrome.
4. **WAO-01** — Fix `too-right` class/CSS mismatch.

**Ship same day if cheap (P2):**
5. **HUB-02** — Restore Decision hub lede.
6. **HUB-03** — Reorder tiles: PT → text pack (Blame, WAO, MLP) → reflex (GF, CC, PB, ZW, SH).
7. **MLP-01** — How-to teaches reveal/Wrapped.
8. **GF-03** — Remember last mode; skip mode screen on return (≤3 taps to flash).
9. **WAO-02** — Visually-hidden Vote Done for a11y.
10. **SH-01** — `Phones best · laptop uses Hold` one-liner.
11. **PB-01** — Soft `Best with 3+` only.
12. **HUB-04** — **Keep 2-col**; don’t revert to 1-col.

**Explicit non-fixes:**
- **BL-01** — Keep Reveal→Board (not auto-board).
- No `Vote together` mode.
- Don’t raise Pass Bomb min above 2.
- Don’t reopen violet/lime CTAs; accents stay rails/selection/#1 only.

**Missed by Games (add to backlog):**
- WAO/MLP empty Results fail-soft copy when ties/all-too-right/no mutuals.
- ZW multi-touch same-frame scoring + resume-on-unrotate (not just pause).
- GF verify landscape pause parity with Corner Claim.
- SH permission-deny → Hold with explicit copy.
- Spot-check Blame curtain DOM unmount (privacy).

### Sign-off
- Games playtest: DONE (2026-09-14)
- Apple: DONE (2026-09-14)
- Tesla: DONE (2026-09-14)
- Fixes shipped: P1 + Apple/Tesla ship list (2026-09-14) — ready to push (do not push until Suren word)

### Games fix pass (2026-09-14)
- **WAO-01** — `games/wrong-answers-only/js/app.js`: podium tag class `too-right-tag` → `board-tag too-right` (matches `.board-tag.too-right` in `css/styles.css`).
- **ZW-01** — `games/zone-whack/js/app.js`: landscape gate mid-play freezes `roundStart`, `nextSpawnAt`, and mole `expires` (Corner Claim-style pause); no CSS change needed.
- **GF-01 / HUB-01** — Hub tile stays green `#22C55E`. In-game `--accent` / `--accent-ink` set to `#22C55E` / `#14532D` (dark: `#16A34A` / `#DCFCE7`) in `games/green-flash/css/styles.css`; `--flash` unchanged. `css/hub.css` comment notes sync. Accent map row updated.

### Games fix pass 2 (2026-09-14)
- **ZW-02** — `games/zone-whack/index.html`, `games/zone-whack/js/app.js`, `games/zone-whack/css/styles.css`: merged count + ready preview; primary `Go`; hub→fun ≤3 taps. Resume-on-unrotate watch kept until landscape.
- **ZW-03** — `games/zone-whack/index.html`: how-to periods.
- **HUB-02** — `index.html`: lede restored to `Pass-the-phone games. No login.`
- **HUB-03** — `index.html`: tile order PT → Blame → WAO → MLP → Green Flash → Corner Claim → Pass Bomb → Zone Whack → Steady Hands.
- **HUB-04** — `css/hub.css`: kept 2-col from 340px+ (no change).
- **MLP-01** — `games/most-likely-pass/index.html`: how-to step 3 → Reveal payoff.
- **MLP fail-soft** — `games/most-likely-pass/js/app.js`: magnet ties / empty mutuals copy.
- **GF-03** — `games/green-flash/js/app.js`: `localStorage` last mode (+ versus count); skip mode screen on return.
- **GF landscape pause** — `games/green-flash/index.html`, `css/styles.css`, `js/app.js`: mid-versus play-rotate gate pauses wait/green (Corner Claim parity).
- **GF-02** — hub + in-game meta admit hotseat 2–8 (`index.html`, `games/green-flash/index.html`).
- **WAO-02** — `games/wrong-answers-only/index.html`, `css/styles.css`, `js/app.js`: visually-hidden Vote Done; tap-commit stays default.
- **WAO fail-soft** — podium sub: `Nobody survived` / `Nobody bought it` / tie line.
- **SH-01** — `games/steady-hands/index.html`: `Phones best · laptop uses Hold`.
- **SH permission** — verified `Motion blocked. Hold…` → Hold path already in `js/app.js`.
- **PB-01** — `games/pass-bomb/index.html`: soft `Best with 3+` (min stays 2).
- **PT-01** — `games/picture-telephone/index.html`: Join CTA → `Open turn`.
- **BL-01** — kept Reveal→Board (no auto-board); no code change.
