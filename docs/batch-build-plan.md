# Batch build plan — 5 games (+ Blame Chain already briefed)

**Repo:** `cliren/picture-telephone` (hub may also publish as `cliren/games`)  
**Audience:** coding agent — implement all five in one PR / one pass  
**Already briefed separately:** [Blame Chain](./blame-chain-brief.md) → `games/blame-chain/` (include in same batch if not built yet)  
**Constraint reminder:** static only; hotseat-first; no CDN; no PT draw-telephone clones; 3-step how-to each; hub tokens (paper/ink/CTA).

---

## The five (opinionated pick)

| # | Game | Slug | Players | Core loop | Why this batch |
|---|------|------|---------|-----------|----------------|
| 1 | **Wrong Answers Only** | `wrong-answers-only` | 3–8 · ~8 min | Write dumb answer → vote funniest | Shared write→vote shell |
| 2 | **Most Likely Pass** | `most-likely-pass` | 3–8 · ~10 min | Pick who fits → reveal graph + Wrapped | Shared pick-person shell w/ Blame Chain |
| 3 | **Soft Launch** | `soft-launch` | 3–8 · ~8 min | Pitch fake app → invest votes | Same write→vote as #1 |
| 4 | **Sequel Pitch** | `sequel-pitch` | 3–8 · ~8 min | Cursed sequel titles → greenlight | Write→rank; tiny state |
| 5 | **One Clue Only** | `one-clue-only` | 3–8 · ~10 min | Clues cancel duplicates → guess | Unique but still text/hotseat |

**Deferred (do not build in this batch):**
- **Spy Word** — needs careful private deal + talk timer UX; second batch  
- **Caption Crimes** — needs bundled image pack + asset pipeline; second batch  

**If Blame Chain is not in the repo yet:** build it in this same batch using `docs/blame-chain-brief.md` (6th title).

---

## Shared architecture (build once, reuse)

### Folder per game
```
games/<slug>/
  index.html
  css/styles.css      # copy hub tokens; game-specific layout
  js/app.js           # game state machine
  js/prompts.json     # or seeds.json / words.json
```

### Shared UX primitives (duplicate lightly per game — no bundler)

Implement the same patterns in each `app.js` / CSS (copy-paste OK for static hub):

1. **Top bar** — `‹ Games` (`href="../../"`) | title | `?` how-to  
2. **How-to modal** — 3 steps; `localStorage` key `howto:<slug>:v1`; show once  
3. **Name setup** — 3–8 unique names, max 16 chars, chip UI  
4. **Pass curtain** — “Pass to **{name}**. Don’t peek.” + primary `I’m {name}`  
5. **Sticky primary CTA** — bottom on small screens  
6. **Draft resume** — `localStorage` key `<slug>:draft:v1`; game home offers Resume if present  
7. **Tone** — short dry party copy; system font stack; `#FAF8F5` paper / `#1C1917` ink  

### Two reusable interaction kits

**Kit A — Write → Vote** (Wrong Answers Only, Soft Launch, Sequel Pitch greenlight)  
Phases: `prompt → [pass → write]×N → [pass → vote]×N or single shared vote screen with curtain → results`  
Vote: each player picks one *other* entry (or rank top). Tally → podium.

**Kit B — Pick person → Reveal** (Most Likely Pass; Blame Chain)  
Phases: `prompt → [pass → pick (+optional text)]×N → reveal steps → board/Wrapped`

**Kit C — Private word → Group guess** (One Clue Only only)  
Phases: `pick guesser → show word to writers (curtain) → [pass → clue]×writers → cancel dupes → guess → result`

### Hub integration (all games)

Update root `index.html` game list — one card each:

| Title | Hook | Meta |
|-------|------|------|
| Wrong Answers Only | Trivia where the right answer loses. | 3–8 · ~8 min |
| Most Likely Pass | Pass to who fits. Then see who everyone picked. | 3–8 · ~10 min |
| Soft Launch | Pitch a fake app. Fund the dumbest one. | 3–8 · ~8 min |
| Sequel Pitch | Greenlight the worst sequel. | 3–8 · ~8 min |
| One Clue Only | Duplicates cancel. Guess what’s left. | 3–8 · ~10 min |

Update `README.md` games table the same way.

### Out of scope for entire batch
- URL hash pass-the-link (hotseat + localStorage only)  
- Spicy/18+ decks  
- CDNs, webfonts, analytics, accounts  
- Drawing/canvas (PT owns that)  
- Simultaneous split-screen arcade  

---

## Game 1 — Wrong Answers Only

**Hook:** Trivia where the correct answer loses.  
**How-to:** 1) Read the question 2) Type a wrong answer 3) Vote the funniest  

### Loop
1. Setup names → Start  
2. Show question from `prompts.json` (`{ id, q, correct? }` — `correct` optional, used only to auto-zero exact matches)  
3. Each player (curtain): write answer, 1–100 chars  
4. Vote phase: each player (curtain) picks funniest *other* answer (or one shared screen if group trusts — prefer curtain)  
5. Podium: sort by votes; any answer equal to `correct` (casefold trim) gets badge **Too right** and cannot win (votes ignored or forced to 0)  
6. Another round / New game  

### Screens
home → names → question → pass → write → (repeat) → pass → vote → (repeat) → podium  

### Data
```ts
{
  v: 1,
  names: string[],
  promptId: string,
  question: string,
  correct?: string,
  answers: { from: string, text: string }[],
  votes: { from: string, forIndex: number }[],
  phase: string,
  turnIndex: number
}
```

### prompts.json
≥20 items. Example: `{ "id": "capital", "q": "Capital of France?", "correct": "Paris" }`  
Mix pop culture, obvious facts, absurd “questions.”

### Acceptance
- [ ] Exact correct answers cannot place 1st  
- [ ] Cannot vote for yourself  
- [ ] Curtain between write turns  
- [ ] Podium shows vote counts  

---

## Game 2 — Most Likely Pass

**Hook:** Pass to who fits. Then see who everyone picked.  
**How-to:** 1) Read the prompt 2) Pick who fits 3) Pass the phone  

### Loop
1. Names → Start  
2. Prompt from deck (`most likely to…`)  
3. Each player picks **another** player (no self)  
4. Reveal: step through “{from} → {to}” then **Wrapped**:  
   - Phone Magnet (most picked)  
   - Under the Radar (least picked, ties OK)  
   - Mutuals (A picked B and B picked A), if any  
5. Another round / New game  

### Screens
home → names → prompt → pass → pick → (repeat) → reveal chain → wrapped  

### Data
```ts
{
  v: 1,
  names: string[],
  promptId: string,
  promptText: string,
  picks: { from: string, to: string }[],
  phase: string,
  turnIndex: number,
  revealIndex: number
}
```

### prompts.json
≥24 chaotic “most likely…” lines. Wholesome pack optional second array.

### Acceptance
- [ ] No self-pick  
- [ ] Full pick chain revealed before Wrapped  
- [ ] Magnet / Radar / Mutuals computed correctly  

---

## Game 3 — Soft Launch

**Hook:** Pitch a fake app. Fund the dumbest one.  
**How-to:** 1) Read the niche 2) Name your fake app 3) Invest in the worst idea  

### Loop
1. Names → niche prompt (“for people who hate their group chat”)  
2. Each player: **app name** (max 40) + **one-feature pitch** (max 100)  
3. Invest: each player assigns 1 vote to someone else’s pitch (curtain)  
4. Funded board: rank by votes; #1 label **Funded**  

### Screens
home → names → niche → pass → pitch → (repeat) → pass → invest → (repeat) → funded board  

### Data
```ts
{
  v: 1,
  names: string[],
  nicheId: string,
  niche: string,
  pitches: { from: string, name: string, feature: string }[],
  votes: { from: string, forIndex: number }[],
  phase: string,
  turnIndex: number
}
```

### prompts.json
≥16 niches. No real trademarks as prompts.

### Acceptance
- [ ] Both name + feature required  
- [ ] Cannot invest in self  
- [ ] Funded board sorted by votes  

---

## Game 4 — Sequel Pitch

**Hook:** Greenlight the worst sequel.  
**How-to:** 1) See the original 2) Pitch a cursed sequel 3) Greenlight the worst  

### Loop
1. Names → seed title from list (movie/show — generic enough to avoid legal drama; use well-known public titles OK as text seeds)  
2. Each player: sequel title (max 60) + tagline (max 100)  
3. Greenlight: each player votes for one *other* pitch OR single “group greenlight” where players vote once each  
4. Ranking board; #1 **Greenlit**  

### Screens
home → names → seed → pass → write → (repeat) → vote → ranking  

### Data
Same shape as Soft Launch with `seed` instead of `niche`, fields `title` + `tagline`.

### seeds.json
≥20 seeds: e.g. “The Office”, “Inception”, “Mario Kart”, “Titanic”…

### Acceptance
- [ ] Seed visible during write  
- [ ] Vote ≠ self  
- [ ] Greenlit label on top pitch  

---

## Game 5 — One Clue Only

**Hook:** Duplicates cancel. Guess what’s left.  
**How-to:** 1) Writers see the word 2) Each types one clue 3) Guesser uses what’s left  

### Loop
1. Names → pick **guesser** (rotate: first round random or name[0]; next round next name)  
2. Draw secret word from `words.json`  
3. For each non-guesser (curtain): show word + enter one clue (max 30, single token preferred; allow short phrases)  
4. Normalize clues: trim, lower-case, collapse spaces → **duplicates cancel** (any clue appearing >1 time removed entirely)  
5. Guesser sees remaining clues only (not the word) → types guess  
6. Result: correct if casefold match to word; show cancelled clues for the laugh  

### Screens
home → names → role (you’re guesser / writer) → pass → word+clue (writers) → (repeat) → survivors → guess → result  

### Data
```ts
{
  v: 1,
  names: string[],
  guesser: string,
  word: string,
  clues: { from: string, text: string }[],
  survivors: string[],
  cancelled: string[],
  guess?: string,
  phase: string,
  turnIndex: number
}
```

### words.json
≥40 everyday nouns/phrases (party-safe). Avoid obscure trivia.

### Acceptance
- [ ] Guesser never sees the word  
- [ ] Exact duplicate clues (normalized) all cancel  
- [ ] Result shows hit/miss + cancelled list  
- [ ] Curtains between writers  

---

## Implementation order (for one coding agent)

Do in this order so shared kits land cleanly:

1. **Scaffold all five folders** + stub `index.html` shells (top bar, how-to placeholder)  
2. **Extract-by-copy** name setup + pass curtain + how-to from Picture Telephone / Blame Chain patterns  
3. Implement **Kit A** inside Wrong Answers Only → clone adapt Soft Launch → Sequel Pitch  
4. Implement **Kit B** Most Likely Pass (align with Blame Chain if building together)  
5. Implement **Kit C** One Clue Only  
6. Wire **hub cards** + README table  
7. Manual smoke: 3 fake names, one full round each game on phone width  

### Parallelization note
If multiple agents: Agent A = WAO + Soft Launch + Sequel Pitch; Agent B = Most Likely Pass (+ Blame Chain); Agent C = One Clue Only + hub cards. Merge hub `index.html` carefully.

---

## Definition of done (batch)

- [ ] Five games playable hotseat end-to-end  
- [ ] Each has 3-step how-to with `howto:<slug>:v1`  
- [ ] Each has draft resume key `<slug>:draft:v1`  
- [ ] Hub lists all five (+ PT, + Blame Chain if present)  
- [ ] README table updated  
- [ ] No network requests, no CDN, no console errors on happy path  
- [ ] Works at repo subpath (`../` / `../../` relative links)  

---

## File checklist for coding agent

```
docs/batch-build-plan.md          ← this file
docs/blame-chain-brief.md         ← existing
games/wrong-answers-only/…
games/most-likely-pass/…
games/soft-launch/…
games/sequel-pitch/…
games/one-clue-only/…
index.html                        ← +5 cards
README.md                         ← +5 rows
```

Optional follow-up commit: mark these five “in build / shipped” in `docs/game-pipeline.md`.
