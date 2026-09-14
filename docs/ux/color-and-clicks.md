# Color + click reduction

**Ask:** (1) a little tasteful color on every game — not carnival; Decision still bans violet *brand* CTAs and lime CTAs. Tile / semantic / identity accents OK. (2) fewer clicks and screens. Hotseat stays in-app: `Pass to {name}` → `I’m {name}`.

---

## UX Chief · Apple

**Thesis:** Color is *identity per game*, not decoration on every chrome. One hue per title (hub tile + in-game accent line / selected chip / progress). CTAs stay black/white. Kill screens that only exist to say “Continue.”

### Shared shell (all games + hub)

| Token | Hex | Use |
|---|---|---|
| `--paper` / `--ink` / CTA | keep Decision | Primary buttons stay `#111` / white label |
| `--hub-tile-*` | per game below | Left rail 4px on card **or** 12×12 swatch before title — pick **4px left border** (quieter) |
| Semantic | success `#0D9488`, danger `#C2410C` | Copied / errors only |
| Selection | game accent at 12% fill + 100% ink text | Selected name chip / vote card — never accent-filled full bleed CTA |

**Global click cuts (apply everywhere):**
1. **Merge Pass curtain + first action of the turn onto one screen** when the action is a single tap (Blame pick, MLP pick, WAO vote). Pattern: top = `Pass to **Maya**` + `I’m Maya` once; after confirm, *same screen* reveals the prompt + choices (curtain is a state, not a route). **Keep** separate curtain→write when the next step is typing (privacy + keyboard). Exception: first player of a round can skip curtain (they’re already holding the phone).
2. **Kill dedicated Prompt/Question “Continue” screens.** Show prompt sticky on the first turn screen; round starts on `Start` from Setup.
3. **Blame: merge Blame + Alibi** into one screen — selected name chip + alibi field + one `Done`.
4. **Setup: Start is the only CTA** — no “Continue” after names.
5. **Reveal:** keep step-through; add `Show all` as text button (not a new screen). Don’t add intro “Here’s the reveal” screens.

---

### Hub `/`

| Accent | Use |
|---|---|
| No global brand hue | Hub stays paper/ink |
| Per-card 4px left border | PT coral, Blame amber, WAO teal, MLP sky (hex below) |

**Clicks:** Card tap = enter game (already). No Featured, no second Play button.

---

### Picture Telephone · accent `#E11D48` (rose)

**Where color shows:** hub tile border; draw toolbar active tool; progress `Turn n of m` dot; reveal step tick. Canvas stays white. CTAs stay black.

**Click / screen cuts:**

| Kill / merge | Do instead |
|---|---|
| Separate Join-name screen when hotseat | On curtain, name is known → `I’m {name}` goes straight to Draw/Describe |
| Pass screen QR / file as peers | Primary: `I’m next` (hotseat) + `Copy link` as secondary text. File only if hash over budget (inline error → offer file) |
| Setup “Draw the prompt” as long label | CTA `Start drawing` |
| Resume as third stacked button when empty | Show Resume only when draft exists (already) |

**Target path (hotseat):** Home → Setup → Draw → (curtain+describe) → … → Reveal. Aim **≤1 tap between turns** after first player (`I’m {name}` → act).

---

### Blame Chain · accent `#D97706` (amber)

**Where color shows:** hub tile; selected blame chip 12% amber wash; Main suspect row amber left bar; prompt punctuation.

**Click / screen cuts:**

| Was (8) | Now (5–6) |
|---|---|
| Home → Setup → Prompt → Pass → Blame → Alibi → Reveal → Board | Home → Setup → **Pass+Blame+Alibi (one screen)** ×N → Reveal → Board |
| Prompt `Continue` | Prompt sticky on first player’s turn after Setup `Start` |
| Pass then Blame then Alibi (3) | Curtain confirm → same view: chips + alibi + `Done` |

**Primary CTAs:** Setup `Start` · turn `Done` · reveal `Next` · board `Another round`.

---

### Wrong Answers Only · accent `#0F766E` (teal)

**Where color shows:** hub tile; vote-selected card teal wash; podium #1 teal left bar; “Too right” badge uses ink + strikethrough (not red alarm).

**Click / screen cuts:**

| Was | Now |
|---|---|
| Question `Continue` | Question sticky on first write turn |
| Pass → Write (ok, keep — typing) | Keep curtain before write |
| Pass → Vote as full route | Curtain → **same screen** answer list + `Lock vote` |
| Separate “voting starts” interstitial | Kill |

**Primary CTAs:** `Start` · write `Done` · `Lock vote` · podium `Another round`.  
**Stretch cut:** If group trusts one screen, optional `Vote together` mode (no per-voter curtain) behind a Setup toggle default **off** — don’t ship if it costs a day.

---

### Most Likely Pass · accent `#0284C7` (sky)

**Where color shows:** hub tile; selected person chip sky wash; Magnet crown sky; Mutuals pair linked with sky underline.

**Click / screen cuts:**

| Was | Now |
|---|---|
| Prompt `Continue` | Prompt sticky on pick screen |
| Pass → Pick (2) | Curtain → **same screen** name list + `Done` (or tap-name commits) |
| Reveal then Wrapped as mental break | After last `Next` on chain, auto-land Wrapped (no extra `See Wrapped` tap) |

**Primary CTAs:** `Start` · pick `Done` (or tap-commits) · reveal `Next` · Wrapped `Another round`.

---

### Accent lock table (implement)

| Surface | Accent | Hex | Applied to |
|---|---|---|---|
| Picture Telephone | Rose | `#E11D48` | Hub tile, tool active, turn dots |
| Blame Chain | Amber | `#D97706` | Hub tile, selected chip, Main suspect |
| Wrong Answers Only | Teal | `#0F766E` | Hub tile, vote select, podium #1 |
| Most Likely Pass | Sky | `#0284C7` | Hub tile, pick select, Magnet |
| All CTAs | Ink | `#111111` | Primary buttons — **unchanged** |
| Banned | Violet / lime | — | No `#5B4CDB`, no `#CCFF00` on CTAs/focus |

**Focus rings:** stay ink/paper per Decision (not accent neon).

### Definition of done

- [ ] Each hub card shows its accent (4px border or swatch)
- [ ] In-game selection / rank #1 uses that accent at low saturation
- [ ] Primary CTAs still black/white
- [ ] No Prompt-only Continue screens in the three text games
- [ ] Blame is one turn screen (pick + alibi)
- [ ] MLP/Blame pick: curtain is state-on-screen, not an extra route after first confirm
- [ ] Hotseat labels unchanged: `Pass to {name}` / `I’m {name}`

---

*Apple section. Tesla may amend accents or cut further; don’t reintroduce carnival multi-wash backgrounds.*

---

## UX Chief · Tesla

Apple’s cut list is 80% right. I’m not re-debating black CTAs or per-game identity hues. I’m tightening where Apple stayed polite.

### Color — ship Apple’s table, with three strikes

**Keep:** per-game accent on hub 4px rail + selection wash at ~12% + #1 left bar. CTAs `#111` / white. Focus = ink, not accent neon. No violet, no lime.

**Strike / amend:**

| Apple | Tesla |
|---|---|
| PT rose `#E11D48` | **OK** — reads as ink/stamp, not alarm if used only on chrome (toolbar, dots), never full-bleed banners |
| Blame amber `#D97706` | **OK** |
| WAO teal `#0F766E` | **OK** — but podium #1 and “Too right” must not both scream; **Too right** = ink + strikethrough only (Apple already said this — lock it, no danger-red badge) |
| MLP sky `#0284C7` | **OK** |
| Selection = accent wash + ink text | **OK** — never accent-filled CTA |
| Optional `Vote together` (no curtains) | **Kill for v1.** Privacy regression dressed as a click win. Don’t even put the toggle in Setup. |

**Extra color that earns rent (Apple under-specified):**
- Warm prompt chip behind question/prompt text: paper stay, chip `#FEF3C7` / text `#92400E` (dark: `#422006` / `#FCD34D`). Same chip all games — not a fourth brand. Makes “what am I answering?” scannable at arms length.
- Progress `n/m` active step = game accent dot; inactive = `--line`. That’s it.

**Still banned:** pastel page fills, gradient hubs, rainbow vote bars, emoji as color system, accent-colored primary buttons.

### Clicks — cut harder than Apple

Apple merges curtain→act as *state on one route*. Good. Enforce these numbers:

#### Global
1. **First player of every round: zero curtain.** They’re holding the phone. Start on the act screen with prompt sticky. (−1 × rounds)
2. **Curtain is not a route.** `I’m {name}` reveals act on the **same view** (Apple). If your router still pushes `/pass` → `/act`, fix the router.
3. **Kill every Continue-only screen.** Prompt/Question sticky on first act. (−1 cold start)
4. **No confirm modals for taps.** Select row → sticky `Done` (or tap-commits for picks). Never tap → “Are you sure?” → Done.
5. **Toast, don’t dialog:** `Link copied`, validation errors. Auto-dismiss ≤1.5s.
6. **Leave / New game:** confirm **only** if draft has ≥1 entry. Empty draft = instant.

#### Per game (delta on Apple)

| Game | Apple said | Tesla adds |
|---|---|---|
| **Blame** | Merge blame+alibi; curtain→same screen | **Tap name selects; one `Done` submits both** (require alibi ≥1 char). No second confirm. Board lands immediately after last `Done` — no “Ready to reveal?” |
| **WAO** | Keep curtain before write; curtain→vote same screen | Write: Return key = Done. Vote: **tap-commits** (one tap per voter) — sticky Done is backup for a11y, not a required second tap. Kill “voting starts” and any podium interstitial. |
| **MLP** | Curtain→pick same screen; auto Wrapped | **Tap-commits pick** (no Done required). After last reveal `Next`, land Wrapped populated — Apple’s auto-land is mandatory, not optional. Fixed seat order (from batch notes) stays. |
| **PT** | Hotseat `I’m next` primary on Pass | Don’t merge away Copy link for pass-the-link users — keep as secondary. Hotseat path: `I’m {name}` → act, **no re-enter name**. Kill any “Handoff tips” screens. |

#### Curtain policy (non-negotiable)

```
Curtain BEFORE: private write, private vote, blame/alibi, secret word, clues.
NO curtain BEFORE: shared prompt (already visible), reveal, board, podium, Wrapped.
NO curtain BETWEEN: blame↔alibi on same player (one screen).
NO curtain FOR: player 1 of a round.
```

Removing a privacy curtain to hit a click budget is a product bug. Removing a Continue screen is craft.

### Target budgets (4 players, hotseat, after names exist)

| Game | Taps to finish a round (approx) | Rule of thumb |
|---|---|---|
| Blame | 1 act/player + (n−1) `I’m {name}` + (n) reveal `Next` + 0 board gate | ≤ 2n + (n−1) before board |
| WAO | same shape write + vote | writes need Done; votes prefer tap-commit |
| MLP | tap-commit picks + reveal Next + auto Wrapped | fewest of the three |
| PT | unchanged Decision; don’t strip for vanity metrics | link path keeps Copy |

### Fight list (Tesla vs soft Apple)

- **No `Vote together` mode** in v1 — Apple floated it; I kill it.
- **Tap-commit on picks/votes** — Apple allowed Done; I want one tap as default, Done only as fallback.
- **Prompt chip** — small shared warmth; don’t invent a fifth game accent for prompts.
- **Don’t reintroduce lime/violet** under “Suren asked for color.” Identity rails are the answer.

### Implement checklist (Tesla)

- [ ] Hub cards: 4px left border in Apple’s hex table
- [ ] In-game: accent only on select wash, #1 bar, progress dots, active tool (PT)
- [ ] Prompt/question sits on warm chip; no Continue
- [ ] Blame = one turn screen; MLP/WAO vote = curtain state not extra route
- [ ] Player 1 skips curtain each round
- [ ] Tap-commit picks/votes; no confirm modals
- [ ] Auto-land board/Wrapped; no interstitial
- [ ] CTAs still B/W; focus still ink; no violet/lime

**Bottom line:** Color = identity rail + selection wash + one warm chip. Clicks = delete Continue, merge turn steps, curtain as state, tap-commit picks. Privacy curtains stay. Brand neon stays dead.
