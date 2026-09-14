# Build brief — Blame Chain

**Slug:** `blame-chain`  
**Path:** `games/blame-chain/`  
**Status:** ready to implement  
**Players:** 3–8 · ~5–10 min  
**Hub card hook:** Someone did it. Blame a friend. Survive the reveal.  
**Hub meta:** `3–8 · ~8 min`

Does **not** clone Picture Telephone (no draw → describe → redraw). Text picks + alibis + scoreboard reveal.

---

## One-line pitch

Chaos prompt → each player secretly blames someone and writes a one-line alibi → reveal carousel → **who got blamed most** scoreboard.

---

## 3-step how-to (reuse hub pattern)

Copy for first-run modal + `?` reopen. Persist `localStorage` key: `howto:blame-chain:v1`.

1. **Add names** — who’s playing tonight  
2. **Blame + alibi** — pick who did it, write one excuse  
3. **Pass & reveal** — next player, then roast the scoreboard  

**Modal title:** How to play  
**Dismiss CTA:** Got it  

---

## Why it’s fun

- Instant roast energy; zero art skill  
- Alibis are the comedy (not the pick alone)  
- Scoreboard punchline (“Alex: blamed 4 times”) lands every round  
- Same-couch hotseat is the primary path; link-pass is optional v1.1  

---

## Turn loop (detailed)

### Setup (once per game)
1. Enter 3–8 player names (unique, trim, max ~16 chars).  
2. Optional: pick deck tone — **Chaotic** (default) / **Wholesome** / **Spicy** (18+ toggle, off by default, hidden until explicitly enabled in settings or long-press — ship Chaotic + Wholesome only in v1).  
3. Tap **Start round**.

### Round
1. System shows one prompt (e.g. “Who microwaved fish at 2am?”). Host/current phone sees it; everyone will answer the same prompt this round.  
2. For each player `i` in order:
   - **Pass curtain** — “Pass to {name}” + big **I’m {name}** (hides previous picks).  
   - **Blame screen** — prompt sticky at top; list of *other* players (no self-blame in v1); tap one.  
   - **Alibi screen** — single text field, placeholder “I have an alibi…”, max 80 chars; CTA **Done**.  
3. After last player → **Reveal**.

### Reveal
1. Carousel / stepped list: one card per player — “{from} blamed **{blamed}**” + alibi quote. Tap **Next**.  
2. Final screen: **Blame board** — names sorted by blame count descending; ties share rank. Crown / label on #1: **Main suspect**.  
3. CTAs: **Another round** (same names, new prompt) · **New game** (clear names).

---

## Screen map (one primary action each)

| # | Screen | Primary action | Notes |
|---|--------|----------------|-------|
| 1 | Game home | Start a round | Lede + how-to once; secondary: resume if draft |
| 2 | Setup names | Start | Name chips + add field; min 3 |
| 3 | Prompt | Continue | Big prompt; tiny “shuffle” if reshuffle allowed once |
| 4 | Pass curtain | I’m {name} | Privacy; no peek |
| 5 | Blame | Select player | Other players only; big tap targets |
| 6 | Alibi | Done | 80 char; cannot skip empty — require ≥1 char |
| 7 | Reveal step | Next | One accusation per beat |
| 8 | Blame board | Another round | Ranked list + counts |

Thin top bar (hub standard): `‹ Games` → `../../` | `Blame Chain` | `?`

---

## Sample microcopy

| Spot | Copy |
|------|------|
| Hub hook | Someone did it. Blame a friend. Survive the reveal. |
| Game home lede | Pass the phone. Accuse everyone. |
| Pass curtain | Pass to **Maya**. Don’t peek. |
| Blame empty | Tap who did it |
| Alibi placeholder | One-line alibi… |
| Reveal header | The accusations |
| Board title | Blame board |
| #1 label | Main suspect |
| Zero-blame | Somehow innocent |

**Tone:** dry, short, party — not corporate, not try-hard slang spam.

---

## Prompt packs (v1)

File: `games/blame-chain/js/prompts.json`

```json
{
  "chaotic": [
    "Who microwaved fish at 2am?",
    "Who started the group chat drama?",
    "Who ate the last slice and lied?",
    "Who would survive the longest in a horror movie? (jk — who dies first for being loud)",
    "Who replied ‘k’ and meant war?",
    "Who would accidentally reply-all?",
    "Who brought the aux and chose violence?",
    "Who is most likely to ‘forget’ Venmo?",
    "Who would join a cult for the aesthetics?",
    "Who left the party without saying bye?"
  ],
  "wholesome": [
    "Who gives the best pep talk?",
    "Who would plan the surprise party?",
    "Who always shares their fries?",
    "Who remembers everyone’s coffee order?"
  ]
}
```

Ship ≥24 chaotic prompts for replay. Pick with `Math.random` or seeded from round id; avoid immediate repeat within a session (`sessionStorage` recent ids).

**Note:** Wholesome prompts that are compliments still use the same “blame” UI (“who fits”) — framing stays playful, not mean, when that deck is on.

---

## Data shape

### In-memory / localStorage draft
```ts
type BlameGame = {
  v: 1;
  names: string[];
  deck: "chaotic" | "wholesome";
  promptId: string;
  promptText: string;
  turnIndex: number;           // whose curtain/blame/alibi
  entries: Array<{
    from: string;
    blamed: string;
    alibi: string;
  }>;
  phase: "setup" | "prompt" | "pass" | "blame" | "alibi" | "reveal" | "board";
  revealIndex: number;
};
```

**Draft key:** `blame-chain:draft:v1` (resume unfinished round on game home).

### Hash schema (optional v1.1 — hotseat is enough for v1)
`#bc1.` + compressed JSON or base64url of `{names, deck, promptId, entries}` for pass-the-link mid-round. Keep payloads tiny (text only). If over soft limit, offer **Download turn file** like Picture Telephone — but prefer finishing v1 hotseat-only.

### Scoring
```
count[name] = number of entries where blamed === name
sort desc; ties keep equal visual rank
```

No points economy in v1 — counts are the joke.

---

## Technical fit (static hub)

| Concern | Decision |
|---------|----------|
| Backend | None |
| State | `localStorage` draft + in-memory; hash later |
| Assets | No canvas; system fonts; hub tokens from `css/hub.css` pattern (copy tokens into game CSS like PT) |
| Folder | `games/blame-chain/{index.html,css/styles.css,js/app.js,js/prompts.json}` |
| Hub | Add card on `index.html` |
| How-to | Same modal pattern as PT (`howto:blame-chain:v1`) |
| Privacy | Pass curtain between every player; no “show all picks” until reveal |
| A11y | Buttons ≥44px; prompt readable; don’t rely on color alone for rank |

**Non-goals v1:** accounts, timers, self-blame, spicy deck, drawing, multi-prompt per round, networked sync.

---

## Hub integration checklist

1. Create `games/blame-chain/` with HTML/CSS/JS (no build step).  
2. Add game card on hub `index.html` (title, hook, meta, chevron).  
3. How-to: 3 steps, `localStorage` `howto:blame-chain:v1`, header `?`.  
4. Top bar: `‹ Games` | Blame Chain | `?`.  
5. Update README games table.  
6. Optional: one line in `docs/game-pipeline.md` marking Blame Chain as **in build**.

---

## Acceptance criteria

- [ ] 3–8 names; reject duplicates / blanks  
- [ ] Cannot blame yourself  
- [ ] Alibi required (1–80 chars)  
- [ ] Pass curtain before every turn  
- [ ] Reveal shows each accusation one-at-a-time  
- [ ] Blame board sorts by count; Main suspect labeled  
- [ ] Another round keeps names, new prompt  
- [ ] How-to shows once, reopen via `?`  
- [ ] Works on phone + laptop width; no CDN  
- [ ] Draft resumes if tab refreshed mid-round  

---

## Rough effort

~0.5–1 day for a clean hotseat v1 if reusing PT shell patterns (top bar, how-to modal, pass curtain energy). Hash pass-the-link = +0.5 day.

---

*Brief by Party Game Scout for cliren/picture-telephone.*
