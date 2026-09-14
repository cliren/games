# Phone button text + win/Results audit

**Date:** 2026-09-14  
**Workspace:** `/workspace/picture-telephone/`  
**Scope:** All 9 hub games — blank/invisible button text on mobile; win/Results validation.  
**Status:** Audit + P0/P1 fixes applied (not pushed).

---

## Method

For each game: read `index.html`, `css/styles.css`, `js/app.js`. Checked every `button` / `.btn` for color=bg, opacity 0, font-size 0, overflow clipping, empty labels, `color: transparent`, white-on-white, icon-only, `-webkit-text-size-adjust`, line-height 0, `text-indent`, zero-width, `::before` content failures, missing text nodes, iOS `appearance` / `-webkit-text-fill-color`. Compared working vs broken curtain CTAs. Traced Results / podium / winner / tie / hit-miss paths.

---

## Cross-cutting findings

### P0 — Dark-mode curtain CTA text invisible

**Cause:** Several games set `.curtain .btn-primary { background: var(--paper); color: var(--ink) }` and then, in `@media (prefers-color-scheme: dark)`, overrode to `color: #0A0A0A` while keeping `background: var(--paper)`. In dark tokens `--paper` **is** `#0A0A0A` → **black text on black button**. The “I’m {name}” Pass curtain CTA disappears on phones with Dark Mode (common iOS default).

**Broken (before fix):** Blame Chain, Wrong Answers Only, Green Flash, Pass Bomb, Steady Hands.  
**Working (control):** Most Likely Pass kept `color: var(--ink)` (light text on dark paper in dark mode) — readable, which matched Suren’s “some games / some don’t.” Picture Telephone curtain is paper (not ink full-bleed). Corner Claim / Zone Whack have no Pass curtain.

**Fix applied (all curtain games):** lock curtain primary to explicit paper/ink that never flip with scheme:

```css
.curtain .btn-primary {
  background: #FAF8F5;
  color: #111111;
  -webkit-text-fill-color: #111111;
  border-color: #FAF8F5;
}
```

Removed the broken dark-mode `color: #0A0A0A` overrides.

### P1 — iOS Safari button text hardening (all 9)

**Risk:** `appearance: none` without `-webkit-appearance` / without `-webkit-text-fill-color` can let Safari system button styling swallow or ignore `color` on `<button>`.

**Fix applied everywhere:**

- `.btn`: `-webkit-appearance: none; appearance: none; -webkit-text-fill-color: currentColor;`
- `.btn-primary`: `-webkit-text-fill-color: var(--cta-label);`
- `.btn-ghost`: `-webkit-text-fill-color: currentColor;`
- `body`: `-webkit-text-size-adjust: 100%;`

No empty button labels found in HTML. No `font-size: 0` / `line-height: 0` / `text-indent` / `color: transparent` on `.btn`. Icon-only controls (`?`, `✕`) keep `aria-label`.

---

## Per-game findings

### 1. Steady Hands — `games/steady-hands/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| SH-BTN-01 | P0 | Dark curtain `I’m` CTA black-on-black | `css/styles.css` dark `.curtain .btn-primary { color: #0A0A0A }` + `--paper:#0A0A0A` | Locked `#FAF8F5` / `#111111` + webkit fill |
| SH-WIN-01 | P1 | Ties: multiple “Steadiest” tags, static “Least shake wins” sub | `js/app.js` `showResults` | Subtitle Tie / name; tag `Tie` vs `Steadiest`; `id="results-sub"` in `index.html` |

**Win path:** Ranked by shake (lowest wins). Results screen present. After fix ties are unambiguous.

### 2. Zone Whack — `games/zone-whack/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| ZW-BTN-01 | P1 | Missing webkit appearance / text-fill on `.btn` | `css/styles.css` `.btn` | Hardened (shared) |
| ZW-WIN-01 | — | Results OK | `js/app.js` `showResults` winner/tie/nobody | No change |

**Win path:** Scores per zone; Winner / Tie / “Nobody hit a mole”. Clear.

### 3. Pass Bomb — `games/pass-bomb/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| PB-BTN-01 | P0 | Dark curtain CTA invisible | same curtain override pattern | Locked paper/ink CTA |
| PB-WIN-01 | — | Results OK | `showResults` Last standing / Survivors / Out | No change |

**Win path:** Survivors + elim order. Clear.

### 4. Corner Claim — `games/corner-claim/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| CC-BTN-01 | P1 | webkit harden | `.btn` | Shared harden |
| CC-WIN-01 | — | Results OK | `renderResults` % + Tie copy | No change |

**Win path:** Reference Kit S results (winner % / Tie — A & B). Clear.

### 5. Green Flash — `games/green-flash/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| GF-BTN-01 | P0 | Dark curtain CTA invisible (hotseat Pass) | curtain dark override | Locked paper/ink CTA |
| GF-WIN-01 | P1 | Versus podium always tagged rank-0 “Winner” on tied scores | `showVersusResults` | Tie sub + Tie tags for all top scorers |
| GF-WIN-02 | P1 | Hotseat same — only rank 0 “Fastest” on equal best ms | `showHotseatResults` | Tie / Fastest + empty fail-soft |

**Win path:** Versus + hotseat Results screens exist; ties now unambiguous.

### 6. Most Likely Pass — `games/most-likely-pass/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| MLP-BTN-01 | P1 | Curtain CTA used flipping tokens (worked in dark, inconsistent) | `.curtain .btn-primary` | Locked `#FAF8F5` / `#111` for parity |
| MLP-BTN-02 | P0 | Dark-mode curtain wall flipped light (`background: var(--ink)` → `#FAFAFA`) so locked light CTA became light-on-light / blank “I’m {name}” on iPhone | `.curtain` + dark `--ink`/`--paper` flip | Curtain locked always-dark `#1C1917` / `#FAF8F5` (title + sub); CTA stays paper-on-ink |
| MLP-WIN-01 | P1 | Wrapped Magnet/Radar lines omitted pick counts; ties ambiguous on mobile | `renderWrapped` | Magnet/Radar now `Name · N picks` or `Tie · A, B · N each`; fail-soft when `max === 0` |

**Win path:** Reveal → auto Wrapped. Clear.

**Follow-up (dark curtain token flip):** Curtain used `var(--ink)` / `var(--paper)`, which invert under `prefers-color-scheme: dark`. With CTA already locked to `#FAF8F5` bg, dark mode made the pass wall light → blank-looking primary on iPhone. Same always-dark curtain lock applied for parity to blame-chain, wrong-answers-only, pass-bomb, steady-hands, green-flash (not Picture Telephone paper curtain).

### 7. Wrong Answers Only — `games/wrong-answers-only/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| WAO-BTN-01 | P0 | Dark curtain CTA invisible | curtain dark override | Locked paper/ink CTA |
| WAO-WIN-01 | — | Podium + Winner/Tie/Nobody survived | `showPodium` | Already fixed earlier |

**Win path:** Vote tallies → podium. Clear.

### 8. Blame Chain — `games/blame-chain/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| BL-BTN-01 | P0 | Dark curtain CTA invisible | curtain dark override | Locked paper/ink CTA |
| BL-WIN-01 | — | Board Main suspect + ties in sub | `showBoard` | No change |

**Win path:** Reveal → Board with Main suspect count. Clear (party roast, not a single “winner” fantasy — intentional).

### 9. Picture Telephone — `games/picture-telephone/`

| ID | Sev | Issue | Evidence | Fix |
|----|-----|-------|----------|-----|
| PT-BTN-01 | P1 | webkit harden; curtain is paper (not ink) so P0 N/A | `.btn` / `.curtain` | Shared harden + text-size-adjust |
| PT-WIN-01 | — | Results panel: Started / Ended / Validation (Nailed/Close/Sideways) | `renderResultsPanel` + `scorePromptMatch` | No change |

**Win path:** Chain reveal → Results with compare + verdict. Clear.

---

## Hub

| ID | Sev | Issue | Fix |
|----|-----|-------|-----|
| HUB-ORDER | P1 (request) | Newest-first IA | Reordered tiles: Steady Hands → Zone Whack → Pass Bomb → Corner Claim → Green Flash → MLP → WAO → Blame → PT |
| HUB-CACHE | — | Cache bust | `css/hub.css?v=8` |

---

## Working vs broken (buttons) — summary

| Game | Curtain CTA (before) | After |
|------|----------------------|-------|
| Steady Hands | Broken in dark | Locked #FAF8F5/#111 |
| Zone Whack | N/A (no curtain) | webkit harden only |
| Pass Bomb | Broken in dark | Locked |
| Corner Claim | N/A | webkit harden only |
| Green Flash | Broken in dark | Locked |
| Most Likely Pass | OK in dark (flipping tokens) | Locked for consistency |
| Wrong Answers Only | Broken in dark | Locked |
| Blame Chain | Broken in dark | Locked |
| Picture Telephone | Paper curtain / primary CTA OK | webkit harden |

---

## Files changed

- `docs/ux/phone-button-win-audit.md` (this file)
- `index.html` — tile order + `hub.css?v=8`
- `games/*/css/styles.css` (all 9) — btn webkit harden; curtain CTA lock where present
- `games/green-flash/js/app.js` — versus/hotseat Results ties
- `games/steady-hands/js/app.js` — Results ties + subtitle
- `games/steady-hands/index.html` — `id="results-sub"`

**Not pushed.**
