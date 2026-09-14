# Game pipeline — next titles for the hub

**Hub:** [cliren/games](https://cliren.github.io/games/)  
**Already shipping:** Picture Telephone (draw → describe → draw → reveal)  
**Constraints (always):** no third-party backends; pass-the-link **or** hotseat; ages ~16–50; Gen Z voice; 3-step how-to; not an obvious edu product; static GitHub Pages (hash / localStorage / optional turn file).

---

## What “1234 Games”–style means here

On the App Store, “1234” is a **genre label**, not one app:

| Cluster | Examples | Fit for this hub? |
|--------|----------|-------------------|
| **Pass-the-phone social** | *Pass the Phone*, *PartyPass*, *Party Night* | **Yes** — one device, short rounds, loud reveals, offline, no accounts |
| **Split-screen arcade** | *1 2 3 4 Player Games*, *2 3 4 Player Games*, *Party Game Hub 3D* | **Weak** — simultaneous multi-touch / reflex; poor pass-the-link story |

**Patterns worth stealing (social cluster):**

1. **Read → act → pass** in under 15 seconds per turn  
2. **The reveal is the product** (who picked whom, impostor vote, funny ranking)  
3. **Zero setup** — names in, play; no lobby, no Wi‑Fi, no accounts  
4. **Modes / decks** change vibe without new rules (Party / Friends / Spicy)  
5. **End-of-game “Wrapped”** stats (most blamed, phone magnet, mutual picks)

**Do not clone Picture Telephone:** no draw→describe→redraw telephone chain. Prefer text picks, votes, bluffs, and one-line creativity.

---

## Shortlist — top 3 to build next (ranked)

| Rank | Game | Why first |
|------|------|-----------|
| **1** | **Blame Chain** | Highest laugh-per-minute; clearest hotseat loop; tiny state (names + picks); ships fast |
| **2** | **Wrong Answers Only** | Instant Gen Z meme energy; JSON prompt deck; no drawing; great second title |
| **3** | **Most Likely Pass** | Closest to smash-hit *Pass the Phone* feel; reveal chain is the hook; reusable for more “pick a person” decks later |

**Next wave (4–8):** Soft Launch → Sequel Pitch → One Clue Only → Spy Word → Caption Crimes.

---

## Fuller pitches (8)

### 1. Blame Chain ★ build #1

- **Hook:** Someone did it. The group invents who — then finds out who they actually blamed.  
- **Turn loop:** Host picks / rolls a chaos prompt (“Who microwaved fish at 2am?”). Phone passes. Each player secretly picks a player name + a one-line alibi. After everyone: reveal carousel of accusations → **blame scoreboard** (who got blamed most).  
- **Why fun:** Pure group-roast energy without complex lying rules. The scoreboard punchline lands every time.  
- **vs Picture Telephone:** Text picks + alibis, not drawing.  
- **Technical fit:** Hotseat-first (`sessionStorage` / `localStorage`). Player list + array of `{from, blamed, alibi}`. Optional `#bc1.…` hash for pass-the-link. Tiny payloads.  
- **Screens:** Setup (names) → Prompt → Pass curtain → Pick + alibi → (repeat) → Reveal carousel → Blame board → Play again.  
- **3-step how-to:** 1) Add names 2) Blame someone + write an alibi 3) Pass — then roast the reveal  

---

### 2. Wrong Answers Only ★ build #2

- **Hook:** Trivia where the correct answer loses.  
- **Turn loop:** Show a question. Each player writes the dumbest wrong answer. Hotseat vote for funniest. Correct / boring answers get zero (and roasted). Optional “fact bomb” after voting.  
- **Why fun:** Zero knowledge pressure; everyone can win by being unhinged.  
- **vs Picture Telephone:** Typing + voting, no canvas.  
- **Technical fit:** Static JSON prompt packs; answers in memory; votes by index. Shareable results hash optional.  
- **Screens:** Deck pick → Question → Write → Pass-to-vote → Podium → Next.  
- **3-step how-to:** 1) Read the question 2) Type a wrong answer 3) Vote the funniest  

---

### 3. Most Likely Pass ★ build #3

- **Hook:** Pass the phone to whoever fits the prompt — then see who everyone really chose.  
- **Turn loop:** Prompt like “most likely to start a group chat at 3am.” Current player picks someone (not self). Phone passes to them. After a full round: **reveal who picked whom** + Wrapped stats (Phone Magnet, Under the Radar, Mutuals).  
- **Why fun:** The social mirror is the joke; identical DNA to hit pass-the-phone apps, adapted to our hub.  
- **vs Picture Telephone:** Person-pick chain, not art telephone.  
- **Technical fit:** Names + pick graph; hash `#mlp1.…` or hotseat only. Deck JSON with tone tags (chill / chaotic / spicy — keep spicy off by default for 16+).  
- **Screens:** Names → Mode/deck → Prompt + pick → Pass → … → Reveal graph → Wrapped.  
- **3-step how-to:** 1) Read the prompt 2) Pick who fits 3) Pass the phone  

---

### 4. Soft Launch

- **Hook:** Pitch a fake app. The group funds the dumbest one.  
- **Turn loop:** Niche prompt (“for people who hate their group chat”). Each player writes app name + one-feature pitch. Reveal → “invest” votes → funded board.  
- **Why fun:** Startup satire; creative without art skill.  
- **Technical fit:** Same hotseat write→vote pattern as Wrong Answers Only; reuse voting UI.  
- **Screens:** Prompt → Pitch → Invest → Funded board.  
- **3-step how-to:** 1) Read the niche 2) Name your fake app 3) Invest in the worst idea  

---

### 5. Sequel Pitch

- **Hook:** Hollywood greenlights the worst follow-up.  
- **Turn loop:** Seed = real movie/show. Each player adds a worse sequel title + tagline. Last player (or group) greenlights a favorite; optional ranking.  
- **Why fun:** Creative one-upmanship; reveals are comedy gold.  
- **Technical fit:** Seed list in JSON; text-only chain in hash or localStorage.  
- **Screens:** Seed → Write → Greenlight → Ranking.  
- **3-step how-to:** 1) See the original 2) Pitch a cursed sequel 3) Greenlight the worst  

---

### 6. One Clue Only

- **Hook:** Everyone writes one clue. Duplicates cancel. The guesser gets whatever survives.  
- **Turn loop:** Secret word shown to all but the guesser. Each writer submits one clue. Matching clues cancel. Guesser sees the survivors and guesses. Score by hit / miss + funny fail.  
- **Why fun:** Coordination chaos; “we all wrote the same dumb clue” moments.  
- **vs Picture Telephone:** Word clues, not drawings; shorter rounds.  
- **Technical fit:** Hotseat with privacy curtains (hide screen between players). Word packs JSON. No need for big hashes if hotseat-only v1.  
- **Screens:** Roles → Word (writers) → Clue entry → Cancel duplicates → Guess → Result.  
- **3-step how-to:** 1) Writers see the word 2) Each types one clue 3) Guesser uses what’s left  

---

### 7. Spy Word

- **Hook:** One player has a different word. Talk, then vote the spy.  
- **Turn loop:** Most players see Word A; one sees Word B (or “???”). Free talk timer (or structured one-word each). Vote. Spy wins if undetected or if they guess the majority word.  
- **Why fun:** Classic social deduction, phone-as-oracle; PartyPass/Party Night DNA.  
- **Technical fit:** Deal roles via hotseat private screens; no backend. Keep talk offline (timer only).  
- **Screens:** Names → Deal (private) → Talk timer → Vote → Reveal.  
- **3-step how-to:** 1) Peek your secret word 2) Talk without outing yourself 3) Vote the spy  

---

### 8. Caption Crimes

- **Hook:** The photo is innocent. Your caption is not.  
- **Turn loop:** Show a stock/emoji/simple scene card (or player-uploaded optional later). Everyone writes a caption. Vote funniest. Optional “most cursed” second vote.  
- **Why fun:** Meme caption energy; works on phones and laptops.  
- **vs Picture Telephone:** React to a fixed image; don’t redraw a chain.  
- **Technical fit:** Image pack as static assets in `games/caption-crimes/`; captions text-only. Prefer bundled scenes for v1 (no uploads = simpler + privacy).  
- **Screens:** Scene → Caption → Vote → Winner wall.  
- **3-step how-to:** 1) Look at the scene 2) Write a caption 3) Vote the crime  

---

## Build notes (shared)

- Reuse hub patterns from README: 3-step how-to, `localStorage` key `howto:<slug>:v1`, thin top bar `‹ Games` | title | `?`.  
- Prefer **hotseat-first** for text games; add pass-the-link when state is small enough for the hash.  
- Ship **Blame Chain** with one prompt deck; expand packs later without code changes.  
- Keep UX voice: short labels, big tap targets, pass curtains so the next player doesn’t peek.  
- Spicy/adult decks: off by default or behind an explicit 18+ toggle if ever added.

## Explicit non-goals (for now)

- Simultaneous split-screen arcade (true “1 2 3 4 Player” mini-games)  
- Anything needing a realtime server, accounts, or push  
- Drawing-telephone variants that overlap Picture Telephone  

---

*Scouted for Suren / hub pipeline. Update this file when a title ships or a pitch dies.*
