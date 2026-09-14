# UX Debate — Picture Telephone (+ multi-game hub)

**Status:** locked  
**Product:** Static GitHub Pages hub that will host multiple family games. First game: Picture Telephone (draw → describe → draw → reveal).  
**Players:** ~16–50, phones + laptops, same room or pass-the-link.  
**Constraints:** No third-party backends. Pure static. Must feel fast. Each game must explain how to play in simple instructions.

## Brief for the chiefs

Debate and decide:

1. **Hub IA** — how players land, pick a game, and never feel lost  
2. **Picture Telephone flow** — screens, what’s one primary action per screen  
3. **Color system** — light/dark, accent, accessibility  
4. **Typography & density** — Gen Z without trying too hard  
5. **Messaging / microcopy** — tone for instructions, empty states, reveal  
6. **Motion & feedback** — what earns animation; what must be instant  
7. **Performance budget** — paint, input latency on mid phones, URL-state size  
8. **How-to-play pattern** — reusable for every future game in this repo

### Rules for this file
- Each chief writes under their heading.
- Round 1: opening position (concrete: hex/roles, type scale, 5–7 screen map, sample copy).
- Round 2: rebuttal to the other (what you’d keep, kill, merge).
- Then a shared **Decision** section (one of you may draft; both initial).
- Be specific enough that an engineer can implement without guessing.

---

## UX Chief · Apple — Round 1

**Position:** This product wins on *calm party energy* — paper, ink, one accent, zero costume jewelry. The current build already has the right bones (stroke vectors, hash state, hotseat). The visual system is doing too much: four radial washes, emoji brand mark, mint/coral/gold/sky all competing with violet. Restraint is the upgrade.

### 1. Hub IA

**Structure (static, multi-page — not a SPA):**
- `/` — Hub home (Games)
- `/games/picture-telephone/` — Game shell (everything PT lives here)
- Future games get sibling folders. Deep links stay shareable; each game owns its hash schema.

**Hub home layout (phone-first, max-width 560):**
1. Quiet wordmark: hub name only (`Games` or a real product name later) — 13px caption, not a logo farm
2. One-line promise under it
3. Vertical list of **game cards** (not a 2-col grid on phone): title, one-line hook, soft meta (`2–8 · ~15 min`), chevron. Tap → game home
4. Footer: `No accounts · Runs in the link`

**Rules:**
- Hub never explains a game’s rules — that’s the game’s job
- One primary path: tap a game. No “Featured,” no tabs, no search until there are 8+ games
- Inside a game, a thin top bar: `‹ Games` | game title | `?` (how-to). Never bury Exit

### 2. Picture Telephone — screen map (7 screens, one job each)

| # | Screen | Primary action | Owns the viewport |
|---|---|---|---|
| 1 | **Game home** | Start a game | Two stacked CTAs + short lede |
| 2 | **Setup** | Draw the prompt | Name → count → prompt (in that order) |
| 3 | **Join** | Continue | Name only; role line above (“Describe what you see”) |
| 4 | **Draw** | Done drawing | Canvas full-bleed under a slim toolbar |
| 5 | **Describe** | Done | Text field + drawing above (drawing read-only, max 40vh) |
| 6 | **Pass** | Copy link | Link/QR as hero; Hotseat + File as secondary |
| 7 | **Reveal** | Next | One beat at a time; big Done on last |

**Kill / merge from current:**
- Merge “Join with link or file” into Game home as secondary CTA (keep paste + file on one screen)
- Kill emoji brand-mark row (`📞 ✎ 🎨`) — cute once, clutter forever
- Setup: drop the dice emoji on Random; label is enough
- Pass screen is the *product differentiator* — treat it like AirDrop: huge Copy, calm QR, Hotseat as equal peer for same-couch

**One primary per screen:** Primary button always bottom-sticky on small screens for Draw/Describe/Pass. Ghost Back never competes in weight.

### 3. Color system

**Light (default — family rooms are bright):**
| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FAF8F5` | Page bg |
| `--surface` | `#FFFFFF` | Cards |
| `--ink` | `#1C1917` | Text, borders on cards |
| `--ink-soft` | `#78716C` | Secondary / hints |
| `--line` | `rgba(28,25,23,0.12)` | Hairlines |
| `--accent` | `#5B4CDB` | Primary CTA only |
| `--accent-pressed` | `#4A3CC0` | Pressed |
| `--good` | `#0D9488` | Success / copied |
| `--warn` | `#C2410C` | Destructive rare |

**Dark (system preference):**
| Token | Hex |
|---|---|
| `--paper` | `#0C0A09` |
| `--surface` | `#1C1917` |
| `--ink` | `#FAF8F5` |
| `--ink-soft` | `#A8A29E` |
| `--accent` | `#8B7CF7` |
| `--good` | `#2DD4BF` |

**Rules:** One accent. No simultaneous mint/coral/gold/sky washes. Card border: 1.5px `--ink` at 100% on light (keep the paper-notebook feel) OR 1px `--line` — pick **1.5px ink** for PT identity, drop the colorful radial soup. AA body text on paper ≥ 4.5:1 (ink on paper clears easily). Focus rings: 2px accent, offset 2px.

### 4. Typography & density

**Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` — no webfonts.

| Role | Size / weight / tracking | Use |
|---|---|---|
| Display | 34 / 700 / -0.03em | Game title on home |
| Title | 22 / 600 / -0.02em | Screen titles |
| Body | 17 / 400 / 0 | Instructions, fields |
| Callout | 17 / 600 | Role lines (“Your job: draw”) |
| Caption | 13 / 500 / 0.01em | Meta, progress `Turn 2 of 5` |
| Micro | 12 / 500 | Footers |

**Density:** Card padding 20px. Vertical rhythm 8px base. Count picker: 44×44 min hit targets, 8px gap. Gen Z fit = *clear and quick*, not slang density or meme chrome. Letter-spacing shouty all-caps marks: **out**.

### 5. Microcopy samples

**Tone:** warm adult, short clauses, no hype adjectives. Sound like a sharp friend hosting game night.

| Spot | Copy |
|---|---|
| Hub lede | `Party games that live in a link. No apps.` |
| PT lede | `Draw. Pass. Describe. Watch it fall apart.` |
| How-to title | `How Picture Telephone works` |
| How-to steps | `1. Someone draws a prompt.` / `2. Pass the link — next person describes it (or draws the description).` / `3. Reveal the chain together.` |
| Empty canvas | `Draw the prompt. Stick figures win.` |
| Empty describe | `What do you see? One sentence is enough.` |
| Pass hero | `Hand this to the next player` |
| Copied | `Link copied` |
| Hotseat | `Same phone? Continue here` |
| File fallback | `Link too long? Send a turn file instead` |
| Reveal first | `Here’s how it started` |
| Reveal mid | `Then it became…` |
| Reveal last | `And this is where it landed` |
| End | `Play again` · `All games` |

**Banned:** “vibes,” “let’s gooo,” “chaos unlocked,” stacked emoji in chrome, exclamation marks on every CTA.

### 6. Motion & feedback

| Moment | Motion | Duration |
|---|---|---|
| Screen enter | Fade + 6px rise | 220ms `ease-out` |
| Button press | Scale 0.98 + opacity | 80ms |
| Ink stroke | **None** — paint immediately | 0 |
| Copy success | Caption swap + accent check | Instant text; optional 160ms fade |
| Reveal step | Crossfade content | 280ms |
| Confetti / bounce | **Default off** | — |

`prefers-reduced-motion: reduce` → opacity-only, 0 transform. Drawing input must never wait on animation frames beyond rAF paint. Feedback that matters: press states, “Copied,” disabled reasons — not decoration.

### 7. Performance budget

| Budget | Target |
|---|---|
| CSS + JS (transfer, gzip) | ≤ **45 KB** combined |
| Webfonts / CDNs | **0** |
| Images on critical path | **0** (QR is canvas-generated) |
| First contentful paint (mid phone, 4G) | ≤ **1.5 s** |
| Touch → ink visible | ≤ **1 frame** (~16ms) |
| Hash payload soft / hard | **8 KB / 16 KB** → then force turn-file path |
| Main-thread long tasks | < 50ms during draw |

**Impl notes:** keep stroke simplification; lazy-init QR only on Pass; no service worker unless install becomes a real ask; `content-visibility` unnecessary at this DOM size — just don’t bloat.

### 8. Reusable how-to-play pattern

**Component: `HowToSheet`** (same everywhere)

```
┌─────────────────────────────┐
│  How {GameName} works    ✕  │
│                             │
│  1. {verb phrase}           │
│  2. {verb phrase}           │
│  3. {verb phrase}           │
│                             │
│  [ Got it ]                 │
└─────────────────────────────┘
```

**Rules for every future game:**
- Exactly **3 steps**, each ≤ 12 words, start with a verb
- No GIFs required for v1; optional quiet 3-frame SVG strip later
- Auto-present **once** per game (`localStorage` key `howto:{gameId}:v1`)
- Always reachable via header `?`
- Primary dismiss: `Got it` — never “Don’t show again” jargon; quiet re-show via `?` is enough
- Lives in game shell, not hub

**PT steps (canonical):**
1. Someone draws a prompt.
2. Pass the link — next describes or draws.
3. Reveal the chain together.

---

**Round-1 thesis:** Ship the hub as a quiet list; let Picture Telephone keep its paper soul but lose the carnival palette; make Pass and Reveal feel ceremonial; make How-to a 3-step sheet every game reuses. If Tesla argues for denser chrome, darker-default, or heavier motion — I’ll want evidence it helps a 16-year-old *and* a parent on a mid Android, not just that it looks “premium” in a mock.

---

## UX Chief · Tesla — Round 1

**Bias:** Radical minimalism. Performance is a feature. Every pixel either moves the game forward or dies. No soft gradients-as-personality. No decorative empty states. Direct manipulation over chrome.

### 1. Hub IA

**Model:** One-screen hub. Not a marketing site. Not a “suite.”

```
Hub (/)
  ├─ title + one-line what this is
  ├─ game list (cards = name + 1-line + play)
  └─ footer: “static · pass the link · no accounts”
Picture Telephone (/picture-telephone/)
  └─ enter game shell (howto → create/join → play → reveal)
```

- Landing = game picker. Zero hero imagery. Zero “welcome to our hub.”
- Each game card: **name**, **one-line mechanic**, **Play** (primary). Optional: player count hint (`3–8`).
- Future games append as rows/cards. No categories until you have >6 games.
- Deep-link straight into a game URL. Hub is not a gate.
- Room/session lives in the **URL hash or query** (shareable link). No “create account.” Copy-link is the product.

**Kill:** splash screens, onboarding carousels, game “collections,” animated logos.

### 2. Picture Telephone — screen map (one primary action each)

| # | Screen | Primary action | Notes |
|---|---|---|---|
| 0 | How to play | **Got it** | First visit only; skippable forever via `localStorage` |
| 1 | Lobby | **Start** / **Join with link** | Name field + copy link. Host starts when ≥3 ready |
| 2 | Prompt (round 0) | **Lock in** | Text seed OR blank “draw anything” — pick one mode per room |
| 3 | Draw | **Done** | Full-bleed canvas. Tool strip: pen / undo / clear. Timer optional, not chrome-heavy |
| 4 | Describe | **Send** | Single text field. Previous drawing above, full width |
| 5 | Wait | *(none — system)* | “Waiting on Jordan…” + tiny progress `2/5`. No spinner theater |
| 6 | Reveal | **Next chain** / **Play again** | Vertical timeline: prompt → draw → text → draw… Instant scrub, not slideshow |

**One primary CTA per screen.** Secondary actions ghost or icon-only (undo, copy link, leave).

**Hotseat vs pass-the-link:** Same UI. Hotseat = “Hand phone to next player.” Pass-link = “Send this link.” Mode toggle once in lobby, not mid-round.

### 3. Color system

Dark-first (phones at night, living-room TVs, less eye fatigue). Light is a toggle, not the default personality.

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#0A0A0A` | `#F5F5F5` | App ground |
| `--surface` | `#141414` | `#FFFFFF` | Cards, canvas chrome |
| `--border` | `#2A2A2A` | `#E5E5E5` | Hairlines only |
| `--text` | `#FAFAFA` | `#0A0A0A` | Primary |
| `--text-muted` | `#A3A3A3` | `#525252` | Meta, hints |
| `--accent` | `#CCFF00` | `#84CC16` | Primary CTA, focus ring |
| `--danger` | `#FF3B30` | `#DC2626` | Destructive only |
| `--canvas-bg` | `#FFFFFF` | `#FFFFFF` | Drawing surface always light (readable photos later) |
| `--success` | `#22C55E` | `#16A34A` | Ready / sent |

**Contrast:** Accent on dark ≥ 7:1 for large CTA text. Never put `#CCFF00` body text on `#F5F5F5` at small sizes — use dark text on accent buttons (`#0A0A0A` on `#CCFF00`).

**Kill:** purple “fun” gradients, pastel Gen-Z candy palettes, glassmorphism.

### 4. Typography & density

System stack only. Zero webfonts on v1 (perf + GitHub Pages).

```
--font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--mono: ui-monospace, SFMono-Regular, Menlo, monospace; /* round counters only */
```

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display (hub title) | 28 / 34 | 600 | -0.02em |
| Screen title | 22 / 28 | 600 | -0.01em |
| Body | 16 / 24 | 400 | 0 |
| CTA | 16 / 24 | 600 | 0 |
| Meta / hint | 13 / 18 | 400 | 0.01em |
| Micro (timers, seats) | 12 / 16 | 500 | 0.02em |

**Density:** Comfortable tap targets ≥44px. Compact vertical rhythm (8px grid). No giant “breathing room” hero padding. Phone-first: content within safe area, CTA sticky bottom when keyboard closed.

### 5. Microcopy samples (Gen Z, not try-hard)

Tone: short, direct, slightly dry. No ✨. No “Oopsie!” No corporate warmth.

| Spot | Copy |
|---|---|
| Hub subtitle | `Pass-the-phone games. No login.` |
| Game card blurb | `Draw what they wrote. Write what they drew. Ruin it together.` |
| How-to title | `How it works` |
| How-to steps | `1. Someone starts a line.
2. Next person draws it.
3. Next person describes the drawing.
4. Repeat.
5. Reveal the chaos.` |
| How-to CTA | `Got it` |
| Lobby empty | `Share the link. Need 3+.` |
| Copy link | `Copy link` → toast `Link copied` |
| Hotseat handoff | `Pass to the next person` |
| Draw empty hint | `Draw what you read` |
| Describe placeholder | `What is this?` |
| Wait | `Waiting on {name} · {n}/{total}` |
| Reveal header | `The chain` |
| Reveal end | `Play again` / `Back to hub` |
| Leave confirm | `Leave this game?` |

**Kill:** “Let’s get creative!”, “Awesome job!”, confetti copy, forced slang.

### 6. Motion rules

| Earns motion | Must be instant (0ms chrome) |
|---|---|
| Reveal: each step fades/slides in ≤180ms, stagger 40ms | Pen strokes (raw pointer → canvas) |
| Toast in/out 120ms | Button press feedback = color/opacity only |
| Screen transition: crossfade ≤150ms or hard cut | Undo, clear, tool switch |
| Ready checkmark pop 100ms | Keyboard open/close layout |

- Prefer `transform` + `opacity` only. No layout-animating height.
- `prefers-reduced-motion: reduce` → hard cuts everywhere.
- **No** particle confetti, **no** logo spin, **no** skeleton shimmer on static pages.

### 7. Performance budget

| Metric | Budget |
|---|---|
| First contentful paint (mid Android, 4G) | ≤1.5s |
| Time to interactive (lobby) | ≤2.0s |
| JS shipped (gzipped, game page) | ≤40KB |
| CSS shipped | ≤8KB |
| Input → ink latency | ≤16ms (rAF batching OK; never wait on React re-render for strokes) |
| URL/state payload | ≤2KB compressed preference; hard fail/warn >8KB (canvas PNGs go to `sessionStorage` / IndexedDB, **not** the URL) |
| Images / fonts | 0 on critical path |
| Dependencies | None required. Vanilla or one tiny view layer. No analytics SDKs |

**Canvas:** devicePixelRatio-aware, cap DPR at 2. Export WebP/PNG only at reveal time, not every stroke.

**URL protocol:** room id + player id + round index in hash. Drawing blobs out of band. Pass-the-link must still work if someone opens mid-game (read-only wait state until it’s their turn).

### 8. Reusable how-to-play pattern

Every game in this hub uses the same shell:

```
<HowToPlay gameId="picture-telephone">
  title
  3–5 numbered steps (plain verbs)
  optional 10s mute GIF / static strip (not autoplay video)
  primary: Got it
  secondary: text link “Show again” in lobby ⋮ menu
</HowToPlay>
```

**Rules:**
1. Show once per `gameId` (`localStorage` key `howto:{gameId}=1`).
2. Max 5 steps. One line each. No paragraphs.
3. Steps answer: **what you do**, not lore.
4. Same component API for all future games — only content slots change.
5. Accessible: focus trap optional; Esc = Got it; screen-reader reads steps as ordered list.

**Template for next games:** swap title + steps; keep CTA, storage, layout.

---

**Bottom line for engineers:** Dark canvas chrome, acid accent, system type, sticky primary CTA, drawings never in the URL, how-to is a shared component with 5-step max. If it’s pretty but slow, cut the pretty.


---

## UX Chief · Apple — Round 2 (rebuttal)

Tesla’s Round 1 is sharp on performance discipline and “every pixel earns rent.” I’m keeping that pressure. Where we diverge is *personality default*, *session model*, and *how much ceremony Reveal deserves*. Concrete keep / kill / merge:

### Keep (from Tesla)

1. **Zero webfonts / zero CDN** — agreed, non-negotiable.
2. **Sticky primary CTA**, 44px targets, 8px grid — ship it.
3. **`prefers-reduced-motion` → hard cuts** — stronger than my opacity-only; adopt Tesla’s rule.
4. **Canvas always light (`#FFFFFF`)** — correct for drawing legibility in both themes. Lock it.
5. **How-to as one shared component** with `localStorage` `howto:{gameId}` — same pattern; we’re aligned on API shape.
6. **Perf ceilings in the same band** — merge to a single table in Decision (their JS ≤40KB + my combined ≤45KB → **JS ≤40KB gzip, CSS ≤10KB gzip**).
7. **Kill splash / carousels / confetti / logo spin** — full agreement.

### Kill (from Tesla)

1. **Acid accent `#CCFF00` as brand default** — reads esports HUD, not family game night for a 14-year-old *and* a parent. Lime on near-black is a taste flex; it fatigues in a bright kitchen. **Kill as default.** Keep as an optional “Pro” theme later if anyone asks — not v1.
2. **Dark-first as the product personality** — living-room daylight and school-lunch tables are the real context. **Light default + `prefers-color-scheme` dark.** Dark is supported, not the face on first paint.
3. **Lobby with “host starts when ≥3 ready”** — that assumes a live multiplayer room. Our constraint is **no backend**; state is pass-the-link / hotseat. A waiting lobby is fiction unless we fake it. **Kill Wait screen as a first-class mode.** Progress lives on Pass (`Turn 2 of 5`) and on Join.
4. **Drawings “never in the URL” → sessionStorage/IndexedDB only** — breaks the core fantasy: *the link is the turn*. Current stroke-polyline-in-hash is the product. **Kill “blobs out of band” as the primary path.** Keep turn-file fallback when hash > soft budget (align soft **8KB**, hard **16KB** — Tesla’s 2KB preference is too aggressive for vector strokes on a real doodle).
5. **How-to max 5 steps with a 5-step PT script** — five is a lecture. **Hard cap 3 for every game.** PT collapses to the three verbs I wrote; Tesla’s 1–5 is the same idea with padding.
6. **Reveal as “instant scrub vertical timeline”** — power-user correct, party-wrong. People want a beat together. **Kill scrub-first.** Timeline scrub can exist as a *secondary* control after step-through once.

### Merge (the actual product)

| Area | Merge |
|---|---|
| **Hub path** | Tesla’s flat energy + my folder: `/` hub list, `/games/picture-telephone/` (or `/picture-telephone/` — pick one; I prefer `/games/...` for hub clarity). Cards = name + one-line + meta. Play is the card tap (no separate Play button chrome). |
| **Screen map** | **Apple’s 7**: Game home → Setup → Join → Draw → Describe → Pass → Reveal. Fold Tesla’s Prompt into Setup. No Lobby/Wait. Hotseat vs link is a choice **on Pass**, not a lobby mode toggle (same UI either way — Tesla’s “same UI” point stands). |
| **Color** | Apple light paper tokens as default; Tesla dark tokens as `prefers-color-scheme: dark` mapping (swap acid → **`#8B7CF7`** accent in dark, `#5B4CDB` in light). Canvas surface always `#FFFFFF`. Borders: hairline in dark; **1.5px ink** on light cards for PT paper identity. |
| **Type** | Tesla sizes are nearly mine — lock **Display 34/700, Title 22/600, Body 17/400, Meta 13/400, Micro 12/500**. Body 17 over 16 for describe-field comfort on phone. |
| **Copy** | Keep Tesla’s dry edge where it’s sharper (`What is this?`, `Link copied`, `Pass to the next person`). Keep Apple’s reveal narration (`Here’s how it started` / `Then it became…` / `And this is where it landed`) — that’s the ceremonial beat. Hub line: Tesla’s `Pass-the-phone games. No login.` is better than mine — **adopt**. PT lede: merge → `Draw. Pass. Describe. Ruin it together.` |
| **Motion** | Tesla timings (≤150–180ms) over my 220–280. Reveal steps: **280ms crossfade step-through as primary**; optional “Show all” jumps to full timeline (Tesla scrub lives there). Stroke path: **0ms** forever. |
| **Perf** | JS ≤40KB gz · CSS ≤10KB gz · FCP ≤1.5s · ink ≤16ms · hash soft 8KB / hard 16KB then **Download turn file**. DPR cap 2 — adopt Tesla. Stroke vectors stay in hash; no PNG-per-stroke. |
| **How-to** | Shared sheet, **exactly 3 steps**, auto once, `?` to replay. Esc = Got it (Tesla a11y). No GIF required v1. |

### What I’m unwilling to “meet in the middle” on

- **Pass-the-link remains the atomic unit of play.** If we invent a lobby that needs presence, we’ve violated the static brief.
- **Light paper + one violet accent** is the v1 face. Acid dark can be a theme file later; it must not set first impressions for families.
- **Reveal is theater, then archive** — step-through first, scrub second.

### Offer for Decision table

If Tesla Round 2 lands in the same merge neighborhood, lock the table to the Merge column above. I’ll draft the Decision rows as soon as Tesla’s rebuttal is in (or draft now as a proposal and we both initial).

---

## UX Chief · Tesla — Round 2 (rebuttal)

Apple’s Round 1/2 correctly kill carnival chrome and fake multiplayer presence. I’ll meet on the static constraint. I will not meet on “calm paper” as an excuse for soft defaults that slow comprehension or hide the primary action.

### Keep (from Apple)

1. **No backend lobby / no Wait-as-mode** — I overfitted a live room. Kill my Lobby≥3 and Wait screen. Progress = `Turn n of m` on Pass + Join role line. Point conceded.
2. **Pass is the product** — Copy link as hero, Hotseat + turn-file as peers. Adopt. My “mode toggle in lobby” was wrong; choice lives on Pass.
3. **Stroke vectors in hash as primary** — you’re right that *the link is the turn*. My “never in URL / IndexedDB only” breaks pass-the-link. **Kill that.** Soft **8KB** / hard **16KB** → turn-file. My 2KB preference was aspirational, not playable.
4. **`/games/picture-telephone/` folder IA** + thin top bar `‹ Games | title | ?` — cleaner than my flat `/picture-telephone/` once hub has siblings. Adopt `/games/...`.
5. **Reveal step-through first** — party > power-user. Scrub/timeline = secondary “Show all”. Conceded.
6. **How-to hard cap 3** — five was a lecture. Adopt Apple’s 3-verb sheet. Keep Esc = Got it and `howto:{gameId}:v1`.
7. **Body 17 / Display 34** — slight bump from my 16/28 is fine for describe fields. Merge type table as Apple proposed.
8. **Paper card identity (1.5px ink on light)** — distinctive without radial soup. Keep for light theme.

### Kill (from Apple)

1. **Violet `#5B4CDB` / `#8B7CF7` as the only accent story** — “one accent” is correct; *which* accent is not sacred. Violet-on-cream is every 2023 fintech onboarding. For a draw-party game it reads polite, not sharp. **Kill violet as locked brand.**
2. **“Ceremonial” reveal copy as mandatory poetry** — `Here’s how it started` / `Then it became…` is fine *optional* narration, not a third of the UI chrome. Default reveal chrome stays minimal: step label `1/5`, content, **Next**. Poetry can sit as a one-line caption, not a storybook frame.
3. **QR as co-hero on Pass by default** — QR costs layout, attention, and lazy-init complexity. **Primary = Copy link.** QR behind `Show QR` disclosure. Same-couch uses Hotseat; QR is for TV-across-the-room edge case.
4. **Warm-adult tone softening CTAs** — Apple’s bans on hype are good. Don’t replace them with host-voice padding. Prefer Tesla dry: `What is this?`, `Pass to the next person`, `Link copied`.

### Merge (ship this)

| Area | Lock |
|---|---|
| **Hub** | `/` quiet list (name + one-line + meta). Card tap = enter game. Footer `No accounts · Runs in the link`. No Featured/tabs. Path prefix `/games/{slug}/`. |
| **Flow** | **Game home → Setup → Join → Draw → Describe → Pass → Reveal.** No Lobby. No Wait. Prompt lives in Setup. Pass chooses Copy / Hotseat / File. |
| **Color** | **Light default** (family rooms — Apple wins the default). Tokens: paper `#FAF8F5`, surface `#FFFFFF`, ink `#1C1917`, ink-soft `#78716C`, line `rgba(28,25,23,0.12)`. **Accent: `#111111` primary buttons (white label) + electric underline/focus `#CCFF00` at 2px** — high contrast CTAs without esports-full-bleed lime, without violet cliché. Dark via `prefers-color-scheme`: bg `#0A0A0A`, surface `#141414`, text `#FAFAFA`, accent CTA `#CCFF00` on `#0A0A0A` label `#0A0A0A`. Canvas always `#FFFFFF`. Success `#0D9488` / danger `#C2410C` (Apple’s semantic hues — fine). |
| **Type** | System stack, 0 webfonts. Display 34/700/−0.03 · Title 22/600 · Body 17/400 · Callout 17/600 · Caption 13/500 · Micro 12/500. |
| **Copy** | Hub: `Pass-the-phone games. No login.` PT lede: `Draw. Pass. Describe. Ruin it together.` How-to: Apple’s 3 steps. Describe placeholder: `What is this?` Pass hero: `Hand this to the next player`. Reveal: step-through with optional one-line captions; not mandatory storybook. |
| **Motion** | Enter ≤150ms fade; reveal step ≤180ms crossfade; press = opacity/scale 80ms; ink = 0ms; reduced-motion = hard cut. Confetti off. |
| **Perf** | JS ≤40KB gz · CSS ≤10KB gz · FCP ≤1.5s · ink ≤16ms · DPR cap 2 · hash soft 8 / hard 16 → turn file · 0 webfonts/CDN · QR lazy only if user opens it. |
| **How-to** | Shared `HowToSheet`, exactly 3 verb steps, once via `localStorage`, `?` to replay, Esc = Got it, no GIF v1. |

### Unwilling to fold

- **Accent must punch.** Flat violet-on-cream is how products apologize for existing. Black CTA + lime focus (light) / lime CTA (dark) stays. If Suren vetoes lime entirely, fall back to black/white only — still better than violet soup.
- **Pass hierarchy:** Copy > Hotseat > File > QR. QR is not AirDrop cosplay on a phone screen.
- **No decorative motion budget.** Apple’s 280ms reveal is soft; **180ms max**.

### Decision table

I’ll fill the locked table now to the Merge column above. Apple can initial or strike the accent row if they still want violet — everything else should be implementable without guessing.


---

## Decision (locked)

**Status:** locked for implementation (both chiefs).  
**Initials:** Tesla ✓ · Apple ✓  
**Apple accent strike:** Keep black/white CTAs; **remove `#CCFF00` from v1.** Focus rings use ink/paper, not lime. Rationale below in Color row.

| Area | Decision | Why |
|---|---|---|
| Hub | Static multi-page: `/` = quiet game list (title, one-line hook, meta `players · time`); card tap enters game. Footer: `No accounts · Runs in the link`. Games live under `/games/{slug}/`. Thin in-game bar: `‹ Games` \| title \| `?`. No Featured, tabs, splash, or hub-level rules. | Scales to N games; deep links stay shareable; hub never gatekeeps. |
| Game flow | Screens: **Game home → Setup → Join → Draw → Describe → Pass → Reveal**. One primary CTA each. No lobby, no wait room. Setup owns name + count + prompt. Pass owns Copy link (primary), Hotseat, turn-file; QR behind disclosure. Reveal = step-through primary, “Show all” timeline secondary. Hotseat vs link = same UI, chosen on Pass. | Honors no-backend constraint; link/hotseat *is* the session; Pass is the differentiator. |
| Color | **Light default** (paper `#FAF8F5`, surface `#FFFFFF`, ink `#1C1917`, ink-soft `#78716C`, line `rgba(28,25,23,0.12)`). Light CTA: fill `#111111`, label `#FFFFFF`; focus ring **`2px #1C1917`**, offset 2px. Dark via `prefers-color-scheme` (`#0A0A0A` / `#141414` / `#FAFAFA`); dark CTA fill `#FAFAFA`, label `#0A0A0A`; focus **`2px #FAFAFA`**. Canvas surface **always** `#FFFFFF`. Success `#0D9488`, danger `#C2410C`. Light cards: **1.5px ink** border. **No violet. No `#CCFF00` in v1.** Chromatic color = semantics only (success/danger). | Family-room readable; CTA punch from contrast not neon; drawing always legible; avoids fintech violet *and* esports lime. |
| Type | System UI stack only (0 webfonts). Display 34/700/−0.03em; Title 22/600; Body 17/400; Callout 17/600; Caption 13/500; Micro 12/500. 8px grid; ≥44px targets; sticky primary on Draw/Describe/Pass. | Fast, native, readable on mid Androids; no font FOIT. |
| Copy tone | Dry, short, no hype/emoji chrome. Hub: `Pass-the-phone games. No login.` PT: `Draw. Pass. Describe. Ruin it together.` Describe: `What is this?` Pass: `Hand this to the next player`. Toasts: `Link copied`. How-to title: `How Picture Telephone works` + 3 verb steps. Reveal captions optional, not mandatory storybook. | Gen Z–fit without try-hard; scannable under party noise. |
| Motion | Screen enter ≤150ms opacity; reveal step ≤180ms crossfade; button press ≤80ms; **ink 0ms**; `prefers-reduced-motion` → hard cuts. Confetti/bounce/logo motion **off**. | Feedback without lag; drawing never waits on choreography. |
| Performance | JS ≤40KB gz; CSS ≤10KB gz; FCP ≤1.5s (mid phone, 4G); touch→ink ≤16ms; DPR cap 2; hash soft **8KB** / hard **16KB** then force turn-file; 0 webfonts/CDN; critical-path images 0; QR canvas lazy only if opened; stroke vectors in hash (simplify); no PNG-per-stroke. | Static Pages reality; link stays the turn until size forces file. |
| How-to-play pattern | Shared `HowToSheet`: exactly **3** verb steps (≤12 words each), auto-once `localStorage` `howto:{gameId}:v1`, header `?` reopens, `Got it` + Esc dismiss, no GIF required v1. PT steps: (1) Someone draws a prompt. (2) Pass the link — next describes or draws. (3) Reveal the chain together. | Reusable for every future game; teaches in one breath. |

### Apple confirmation

Initialed. Accepted Tesla Merge on hub, flow, type, copy core, motion caps (≤180ms reveal), perf, how-to, Pass hierarchy (Copy > Hotseat > File > QR disclosure), and killing violet. **Struck lime accent:** v1 is black/white primary contrast only; lime may return as a named theme later if Suren wants it — not the family default.

