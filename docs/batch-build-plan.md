# Batch build plan — interactive 1234-style games (browser-only)

**Repo hub:** static GitHub Pages — **fully browser-based** (HTML/CSS/JS, no native app, no backend, no accounts).  
**Inspiration:** App Store “1 2 3 4 Player” + pass-the-phone party packs (reaction, split-screen, bomb, impostor) — **not** writing/pitch games.  
**Already shipping:** Picture Telephone (draw chain) · **Briefed (text):** Blame Chain — keep; this batch is the *interactive* wave.  
**Supersedes** the earlier write/vote batch (Wrong Answers / Soft Launch / Sequel Pitch / etc.).

---

## Yes — fully browser-based

| Need | Browser approach |
|------|------------------|
| Same phone, 2–4 players at once | CSS split zones + `pointerdown` / multi-touch (`touch-action: none`) |
| Pass-the-phone | Hotseat screens + pass curtain (like PT) |
| Timers / bomb | `performance.now()` + rAF; Web Audio beeps |
| Reaction | Full-viewport color flash + first tap wins |
| Hold still | `DeviceMotionEvent` / `DeviceOrientationEvent` (iOS: permission on user gesture; HTTPS OK on Pages) |
| Haptics | `navigator.vibrate` where available (enhance only) |
| State | In-memory + `localStorage` drafts; **no server** |

**Non-goals:** WebSockets, accounts, CDNs, app stores, mic-volume games in v1 (possible later via `getUserMedia`).

---

## Shortlist — 5 to build in one batch (ranked)

| Rank | Game | Slug | Players | Feel | Interaction |
|------|------|------|---------|------|-------------|
| **1** | **Green Flash** | `green-flash` | 2–4 simultaneous **or** hotseat 2–8 | Pure reflex | Tap when screen goes green |
| **2** | **Corner Claim** | `corner-claim` | 2–4 simultaneous | Classic 1234 split-screen | Paint your quadrant by holding/tapping |
| **3** | **Pass Bomb** | `pass-bomb` | 3–8 hotseat | Panic laughter | Name something in category; pass before boom |
| **4** | **Zone Whack** | `zone-whack` | 2–4 simultaneous | Arcade | Whack moles only in your zone |
| **5** | **Steady Hands** | `steady-hands` | 2–8 hotseat | Chill skill | Hold phone still; least shake wins |

**Bonus 6th if capacity:** **Imposter Peek** (`imposter-peek`) — deal secret word / impostor via curtains, talk timer, tap-to-vote. Viral 1234-party staple; still browser-only.

**Dropped from prior plan (too text/creative):** Soft Launch, Sequel Pitch, Wrong Answers Only, One Clue Only, Most Likely Pass — park in `docs/game-pipeline.md` as “wave B / text social,” not this interactive batch.

---

## Shared shell (all five)

```
games/<slug>/
  index.html
  css/styles.css    # hub paper/ink tokens; game layout
  js/app.js
  js/data.json      # prompts/categories/words as needed
```

**Every game:**
1. Top bar: `‹ Games` → `../../` | title | `?`  
2. How-to modal — **3 verb steps**; `localStorage` `howto:<slug>:v1`  
3. Game home: primary **Play**, short lede, meta line  
4. No CDN / no webfonts / relative links for subpath Pages  
5. Phone-first; landscape **required** for 3–4 player split games (show “rotate” gate)

**Two kits**

**Kit S — Split arena (2–4):** Green Flash (sim mode), Corner Claim, Zone Whack  
- Choose 2 / 3 / 4 players → screen divides into equal touch zones (colors per corner)  
- Each zone ignores touches outside it  
- Score HUD per corner; best-of-N rounds  

**Kit H — Hotseat pass (3–8):** Pass Bomb, Steady Hands, Green Flash (hotseat mode), Imposter Peek  
- Name chips → pass curtain → private or timed act → next  
- Draft key `<slug>:draft:v1` where a round can interrupt  

---

## 1. Green Flash ★ build first

**Hook:** Screen goes green — tap. Too early and you’re out.  
**How-to:** 1) Wait for green 2) Tap fast 3) Don’t false-start  

### Modes
- **Versus (2–4):** split zones; first legal tap in *their* zone scores; false-start (tap while red/black) = −1 or stun  
- **Hotseat:** one full screen; each player gets 3 trials; best ms wins  

### Loop (versus round)
1. Dark/red wait 800–3000ms random  
2. Flash green  
3. First valid zone tap wins round; show ms  
4. Best of 5 → podium  

### Tech
- `touch-action: none`; listen `pointerdown`  
- Record `performance.now()` delta from flash  
- Audio: short blip on flash / buzz on false-start  

### Screens
home → mode (versus/hotseat) → player count or names → arena → round result → match podium  

### Acceptance
- [ ] Random delay; no fixed pattern  
- [ ] False-start detected  
- [ ] Split zones only score their own touches  
- [ ] Works with 2–4 simultaneous fingers  

---

## 2. Corner Claim

**Hook:** Hold your corner. Paint the most before time’s up.  
**How-to:** 1) Pick a corner 2) Mash/hold to paint 3) Most fill wins  

### Loop
1. 2–4 players → colored quadrants (or thirds)  
2. 10s countdown on center  
3. While finger down in zone, fill % increases (or tap spam fills) — pick **hold-to-paint** for less spam fatigue  
4. Time up → percentages → winner  

### Tech
- rAF loop; each zone `pressure` from active pointers in bounds  
- Canvas or CSS conic/rect fill — canvas per zone is fine, keep DPR≤2  

### Screens
home → count → “grab your corner” countdown 3-2-1 → paint → results  

### Acceptance
- [ ] Multi-touch: 4 fingers paint 4 zones at once  
- [ ] Landscape gate for 3–4  
- [ ] Clear % and winner  

---

## 3. Pass Bomb

**Hook:** Name one in the category. Pass before it explodes.  
**How-to:** 1) Read the category 2) Say an answer out loud 3) Pass the phone — don’t boom  

### Loop
1. Names in circle order  
2. Category card (e.g. “pizza toppings”)  
3. Fuse UI 5–12s random (hidden exact length optional — show shrinking fuse)  
4. Player taps **Pass** after saying answer (honor system — no speech recognition in v1)  
5. If fuse hits 0 on your turn → **Boom** — you’re out; next category; last standing wins  
6. Optional: can’t repeat answers — group enforces; v1 no dictionary check  

### Tech
- Hotseat only; big Pass CTA; fuse via rAF  
- Escalating beep rate via Web Audio  
- `prompts.json` categories ≥40  

### Screens
home → names → category + fuse → boom/out → next → winner  

### Acceptance
- [ ] Random fuse length  
- [ ] Boom assigns out  
- [ ] Pass advances player  
- [ ] New category each life loss  

---

## 4. Zone Whack

**Hook:** Moles pop in your zone only. Whack yours — not theirs.  
**How-to:** 1) Claim a zone 2) Tap moles in your color 3) Highest score wins  

### Loop
1. 2–4 split zones  
2. 20–30s round; moles spawn in random zones  
3. Tap mole in your zone = +1; tap empty / other zone mole = miss (optional −1)  
4. Scoreboard  

### Tech
- Absolute positions inside zone rects; spawn timer  
- Simple CSS circles or canvas  

### Screens
home → count → ready → play → scores  

### Acceptance
- [ ] Moles only register in correct zone owner  
- [ ] Simultaneous play stable on mid phones  

---

## 5. Steady Hands

**Hook:** Phone on your palm. Don’t shake. Steadiest wins.  
**How-to:** 1) Rest phone on your palm 2) Hold still for 5s 3) Lowest shake score wins  

### Loop
1. Names → pass curtain  
2. Permission prompt for motion (iOS) on first **Start measuring** tap  
3. 5s sample of accel deviation from gravity baseline → score 0–100 (100 = still)  
4. Next player → leaderboard  

### Tech
- `DeviceMotionEvent.requestPermission?.()` then listen `devicemotion`  
- Fallback copy if denied: “Motion blocked — try Safari settings” + skip to manual “I was steady” joke mode? Prefer fail gracefully with message  
- Desktop/laptop: show “needs a phone” and disable Start  

### Screens
home → names → pass → calibrate/start → measuring → score → board  

### Acceptance
- [ ] Permission path documented in how-to  
- [ ] Stable score on real device  
- [ ] Laptop gets clear empty state  

---

## Bonus — Imposter Peek (if time)

**Hook:** Everyone gets the word. One doesn’t. Find them.  
**How-to:** 1) Peek your secret 2) Talk 3) Vote the impostor  

### Loop
Deal via curtains → 60–90s talk timer → tap vote → reveal  
Words in `words.json`. Browser-only; no online mode.

---

## Hub cards (copy)

| Title | Hook | Meta |
|-------|------|------|
| Green Flash | Tap on green. False-start and you’re toast. | 2–4 · ~5 min |
| Corner Claim | Hold your corner. Paint the phone. | 2–4 · ~3 min |
| Pass Bomb | Category + fuse. Pass or boom. | 3–8 · ~10 min |
| Zone Whack | Moles in your zone. Hands off theirs. | 2–4 · ~3 min |
| Steady Hands | Palm. Still. Lowest shake wins. | 2–8 · ~5 min |

Update `index.html` + README table.

---

## Implementation order (one coding agent)

1. Shared CSS tokens + landscape gate component (copy per game)  
2. **Green Flash** (proves multi-touch + rAF)  
3. **Corner Claim** + **Zone Whack** (reuse split layout)  
4. **Pass Bomb** (hotseat + audio fuse)  
5. **Steady Hands** (motion permission)  
6. Hub cards + README  
7. Device smoke: iPhone Safari 2–4 fingers; Android Chrome; desktop check for Steady Hands empty state  

### Parallel split
- Agent A: Green Flash + Corner Claim + Zone Whack  
- Agent B: Pass Bomb + Steady Hands + hub  

---

## Definition of done

- [ ] Five games playable in mobile Safari/Chrome without install  
- [ ] Split games support 2–4 simultaneous touches  
- [ ] Each has 3-step how-to + `howto:<slug>:v1`  
- [ ] No network calls, no CDN  
- [ ] Hub lists all five  
- [ ] Pass Bomb fuse + Green Flash false-start feel obvious in first 10 seconds  

---

## File checklist

```
docs/batch-build-plan.md     ← this file (interactive wave)
docs/blame-chain-brief.md    ← separate text game (optional same PR)
games/green-flash/
games/corner-claim/
games/pass-bomb/
games/zone-whack/
games/steady-hands/
index.html                   ← +5 cards
README.md
```
