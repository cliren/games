# Batch UX notes — 3 text games (Tesla)

**Scope:** Blame Chain · Wrong Answers Only · Most Likely Pass  
**Authority:** Locked Decision in `debate-picture-telephone.md` (Apple ✓ · Tesla ✓). Lime accent **out** for v1.  
**Bias:** Hotseat-first. Tiny state. No lobby. One primary CTA. If it’s chrome, kill it.

These notes override soft instincts in the briefs where they conflict. Engineers: ship the Decision tokens; use this for interaction sharpness.

---

## Global rules (all three)

### What you inherit from the lock
- Paper `#FAF8F5` / surface `#FFFFFF` / ink `#1C1917` / ink-soft `#78716C` / line `rgba(28,25,23,0.12)`
- CTA: fill `#111111`, label `#FFFFFF`; focus `2px #1C1917` offset 2px (dark flips to inverted B/W)
- Cards: **1.5px ink** border on light
- Type scale exactly as Decision (Display 34 → Micro 12). System stack only.
- How-to: **exactly 3** verb steps, `howto:{slug}:v1`, `?` reopen, Esc = Got it
- Motion ≤150ms enter / ≤180ms reveal step / ≤80ms press / reduced-motion = hard cut / **no confetti**
- JS ≤40KB gz · CSS ≤10KB gz · FCP ≤1.5s · 0 CDN / webfonts

### What changes vs Picture Telephone
| PT | Text batch |
|---|---|
| Pass = Copy link hero | Pass = **curtain** (“Pass to **{name}**. Don’t peek.” + `I’m {name}`) |
| Hash carries strokes | **localStorage draft only** for v1 — no hash unless state stays tiny |
| Join / turn-file | **Out of scope** for this batch |
| Canvas | **None** |

**Kill for all three:** lobby, ready checks, presence, timers-as-chrome, deck pickers on first paint, emoji brand marks, podium confetti, “vibes” copy, spicy decks in v1.

### Shared screen skeleton
```
home → names (3–8) → [prompt] → [pass → act]×N → reveal step-through → board → Another round | New game
```
- **home:** lede + Start. Resume draft if `localStorage` `{slug}:draft:v1` exists. No second CTA fighting Start.
- **names:** chips, max 16 chars, unique, sticky **Start** (≥3). No avatars.
- **pass:** full-bleed ink curtain. One job. No peek of prior answers in DOM (unmount previous turn UI).
- **reveal:** one beat at a time. **Next** sticky. Optional “Show all” only after first full step-through (Most Likely / Blame).
- **board:** ranked list, counts, one label on #1. CTA pair: Another round (keep names) / New game.

### Pass curtain copy (canonical)
- Title line: `Pass to **{name}**`
- Sub: `Don’t peek.`
- CTA: `I’m {name}`
- Never: “Hand the device carefully to the next participant”

### State discipline
- One object in memory + draft key. Cap strings (alibi 80, answer 100, etc.) — briefs already set limits; enforce in UI (`maxlength` + counter only if >60).
- No per-keystroke `localStorage` thrash — save on phase change / Done.
- Prompt decks: JSON static; avoid immediate repeat via `sessionStorage` recent ids.

---

## 1. Blame Chain (`blame-chain`)

**Product:** Accuse → alibi → roast board. Alibi is the joke; pick is the knife.

### Screen map (lock)
| # | Screen | Primary | Kill |
|---|---|---|---|
| 1 | home | Start a round | Extra mode chrome |
| 2 | names | Start | Avatars, pronouns UI |
| 3 | prompt | Continue | Dice emoji; keep text **Shuffle** once max |
| 4 | pass | I’m {name} | — |
| 5 | blame | (tap name = commit) | Separate “Confirm” after tap — tap *is* select; sticky Done only if you need undo |
| 6 | alibi | Done | Empty skip |
| 7 | reveal | Next | Autoplay slideshow |
| 8 | board | Another round | Badges spam |

**Pick UX:** Big name list, ≥44px rows. Selected = inverted ink fill. No self. Prefer **tap selects + sticky Done** so mis-taps aren’t fatal — still one mental primary.

### How-to (3)
1. Add who’s playing.  
2. Blame someone and write an alibi.  
3. Pass — then see who got roasted.

### Copy (dry)
| Spot | Use |
|---|---|
| Hub hook | `Someone did it. Blame a friend. Survive the reveal.` |
| Home lede | `Pass the phone. Accuse everyone.` |
| Blame empty | `Tap who did it` |
| Alibi | `One-line alibi…` |
| Reveal | `The accusations` |
| #1 | `Main suspect` |
| Zero | `Somehow innocent` |

### Tesla strikes on the brief
- **No deck tone UI on v1 home.** Ship chaotic prompts only. Wholesome = later toggle buried in `?` or settings — not a Setup step.
- Reveal captions stay minimal (`{from} → **{blamed}**` + alibi quote). No storybook narration frames.
- Board: count + sort. Crown/label on #1 only. Don’t animate rank changes.

---

## 2. Wrong Answers Only (`wrong-answers-only`)

**Product:** Wrong is the win condition. Voting is the sport. Correct answers get publicly dunked.

### Screen map
```
home → names → question → [pass → write]×N → [pass → vote]×N → podium
```

| Phase | Primary | Rules |
|---|---|---|
| write | Done | 1–100 chars; show question sticky |
| vote | Done | Pick **one other** answer; cannot self; curtain between voters |
| podium | Another round | Sort by votes; exact `correct` (casefold trim) → badge **Too right**, votes forced 0, cannot place 1st |

### How-to (3)
1. Read the question.  
2. Type a wrong answer.  
3. Vote the funniest.

### Copy
| Spot | Use |
|---|---|
| Hub hook | `Trivia where the right answer loses.` |
| Write placeholder | `Wrong on purpose…` |
| Vote header | `Funniest wrong answer` |
| Too right | `Too right` |
| Zero votes | `Nobody bought it` |

### Tesla strikes
- **Always curtain for vote** — “shared screen if group trusts” is a footgun. Privacy is the feature.
- Don’t show `correct` until podium (or never show the fact — only the **Too right** badge on matching answers). Teaching the answer is edu-creep; roasting is the product.
- Podium = list + counts. No medal SVGs, no confetti, no “Champion” thesaurus.

### Perf
Answers are tiny — still no hash v1. Draft resume yes.

---

## 3. Most Likely Pass (`most-likely-pass`)

**Product:** Social mirror. Pick graph reveal + Wrapped. Closest to smash-hit pass-the-phone DNA.

### Screen map
```
home → names → prompt → [pass → pick]×N → reveal chain → wrapped
```

| Phase | Primary | Rules |
|---|---|---|
| pick | Done | Other players only; same row UI as Blame |
| reveal | Next | One `{from} → {to}` per beat |
| wrapped | Another round | Three stats max (see below) |

### How-to (3)
1. Read the prompt.  
2. Pick who fits.  
3. Pass the phone.

### Wrapped — exactly three lines (no more)
1. **Phone Magnet** — most picked (tie: list ties, don’t invent a tiebreaker crown war)
2. **Under the Radar** — least picked (among players who appeared; ties OK)
3. **Mutuals** — A↔B pairs, or `None this round`

**Kill:** extra stats (“Chaos Agent”, “Sniper”, streak charts). Three is the joke. More is a dashboard.

### Copy
| Spot | Use |
|---|---|
| Hub hook | `Pass to who fits. Then see who everyone picked.` |
| Pick empty | `Who fits?` |
| Reveal header | `Who picked whom` |
| Wrapped title | `Wrapped` |

### Tesla strikes
- **No mode/deck picker on first run.** One chaotic deck. Chill pack later.
- “Pass to them” narrative in some pitches implies the *picked* person goes next — **do not do that** for v1 scoring clarity. Turn order stays fixed seat order; picks are votes, not the pass target. (If you want true pass-to-chosen later, it’s a different game.)
- Graph viz: **no force-directed spaghetti.** Stepped list first; optional simple tally bars on Wrapped. Fancy SVG graphs eat the CSS budget and confuse drunk uncles.

---

## Hub cards (wire exactly)

| Title | Hook | Meta |
|---|---|---|
| Blame Chain | Someone did it. Blame a friend. Survive the reveal. | 3–8 · ~8 min |
| Wrong Answers Only | Trivia where the right answer loses. | 3–8 · ~8 min |
| Most Likely Pass | Pass to who fits. Then see who everyone picked. | 3–8 · ~10 min |

Card = whole-row tap. No separate Play button. Chevron OK. Meta in caption size.

---

## Acceptance extras (Tesla)

- [ ] Mid-turn refresh resumes from draft without leaking the previous player’s private screen
- [ ] Pass curtain unmounts prior answers (View Source / accessibility tree must not expose them)
- [ ] One sticky primary per screen; ghost Back never matches primary weight
- [ ] Phone width 360px: no horizontal scroll; CTA reachable with thumb
- [ ] `prefers-color-scheme: dark` works without a settings toggle
- [ ] No network after first paint

---

## Priority order if time-boxed

1. Blame Chain (fastest laugh, Kit B)  
2. Wrong Answers Only (Kit A template for Soft Launch later)  
3. Most Likely Pass (Kit B + Wrapped)

Soft Launch / Sequel Pitch / One Clue Only wait — don’t dilute this batch.

---

*Tesla UX Chief — blunt notes for implementers. Apple may annotate; don’t reopen Decision tokens.*
