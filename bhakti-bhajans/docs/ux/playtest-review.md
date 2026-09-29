# Bhakti Bhajans — UX playtest review

**Live URL:** https://cliren.github.io/games/bhakti-bhajans/  
**Repo path:** `cliren/games` → `bhakti-bhajans/`  
**Local:** `/workspace/bhakti-player/`  
**Product brief:** Ad-free personal bhajan playlist. 2 MP3s hosted in-repo. Static GitHub Pages. Mobile-first. No YouTube, no ads, no accounts. Feel like Apple Music listening + SoundCloud play energy, not a games page.

## Accent map
- Primary: warm gold / saffron on near-black (`#e8b86d` on `#0c0a0f`)
- CTAs: large circular Play should dominate
- Avoid: violet/lime game-hub chrome, cluttered orbs competing with content

## Flow map
1. Land → see playlist title + now-playing + controls + track list
2. Tap Play (or a track) → audio starts; play button becomes pause; active track highlighted
3. Seek / volume / next / prev / auto-advance on end
4. (Missing) Hub entry from https://cliren.github.io/games/

## Playtest notes (Games / SongsJ)
- Works: play/pause, next/prev, seek, volume, highlight, auto-advance, responsive width ~520px
- Weak: ornamental orbs + serif header feel decorative vs. listening app; no waveform / progress personality; no shuffle/repeat; no media session / lock-screen metadata; no keyboard shortcuts documented; no link from hub; “Offline-ready” tagline is misleading (needs network for Pages+audio); track rows lack duration; art is a static glyph not album energy

## Findings

| ID | Severity | Issue | Evidence | Proposed fix |
|----|----------|-------|----------|--------------|
| F1 | P1 | Visual noise (orbs) fights focus on now-playing | styles.css `.bg-orbs` | Quiet background; one soft wash max |
| F2 | P1 | Play affordance not Apple-Music-scale | `.btn-play` competing with chrome | Larger primary play, tighter control cluster |
| F3 | P1 | No track durations in list | playlist render | Show duration once metadata known |
| F4 | P1 | Misleading “Offline-ready” | header tagline | Change to honest subtitle |
| F5 | P2 | No repeat / shuffle | controls | Add minimal repeat (off/all/one) |
| F6 | P2 | No Media Session API | app.js | Set metadata + play/pause/next/prev handlers |
| F7 | P1 | Missing hub link | games index | Add tile/link on hub + back link in player |
| F8 | P2 | No waveform / progress character (SoundCloud) | seek only | Subtle progress fill + optional CSS waveform vibe under now-playing |
| F9 | P2 | Keyboard: space/arrows not obvious | app.js | Add space, ←/→ seek, ↑/↓ volume |

## UX Chief · Apple

**Position:** This should feel like a private listening room, not a landing page with ornaments. Gold-on-near-black is the right emotional register for bhajans. Craft wins when now-playing + Play dominate; everything else gets quieter.

### Keep
- Dark elevated cards, gold `#e8b86d` language, 520px column — calm, phone-first.
- Core transport works: play/pause, prev/next, seek, volume, auto-advance, active row + mini EQ.
- `aria-label`s on controls; document title follows the track.
- One-screen flow (header → now-playing → controls → list) — don’t add a lobby.

### Kill
- **`.bg-orbs` (all three)** — especially the purple orb. Decorative fog fights the track. One soft radial wash behind art max, or none.
- **“Offline-ready”** — false on GitHub Pages + remote MP3s. Honesty is craft.
- **Art `pulse` while playing** — meditation listening doesn’t want a bouncing glyph. Prefer a still ring or soft glow.
- **Google Fonts CDN** (Cormorant + Inter) — optional beauty, mandatory weight/FOIT/third-party. Prefer system stack: `-apple-system, "Segoe UI", system-ui` body; `ui-serif, Georgia, "Times New Roman", serif` for the title only. Self-host later if taste demands.
- **Visible volume row as equal chrome on phones** — hardware volume owns this; demote to overflow / hide when `(pointer: coarse)`.

### Fix
| Priority | Item | Spec |
|---|---|---|
| **P1** | Quiet chrome | Remove orbs; single optional wash under `.art` only |
| **P1** | Honest tagline | `Sacred songs · Ad-free · No tracking` (or drop middle clause) |
| **P1** | Play hierarchy | `.btn-play` → **72–80px**; prev/next 44px; cluster centered in thumb zone; seek **above** transport (already), volume **below or gone** on mobile |
| **P1** | Now-playing presence | On ≤420px, stack art **above** title (art ≥120px). Listening apps lead with cover, not a side glyph |
| **P1** | List durations | Show `m:ss` once `loadedmetadata` known (cache per `file` in memory); right-align like Apple Music |
| **P1** | Media Session | `navigator.mediaSession` metadata + play/pause/next/prev — lock-screen / Control Center is half the product on phone |
| **P1** | Hub entry | Tile on `cliren.github.io/games/` + in-player `‹ Games` (or site root) — don’t orphan the player |
| **P2** | Scrubber fill | Accent fill left of thumb (`linear-gradient` on input) — progress personality without a SoundCloud waveform |
| **P2** | Repeat only | Cycle off → all → one. **No shuffle** until playlist ≫ 2 tracks (shuffle of 2 is a gimmick) |
| **P2** | Keyboard | Space = play/pause (exists). **←/→ = ±5s seek** (bhajans are long); **Shift+←/→ = prev/next**. Don’t make bare arrows skip whole tracks |
| **P2** | Seek hit target | Thumb ≥16px; track hit area ≥28px tall for fat-finger scrub |

### Hierarchy (target layout)
```
[ ‹ Games ]     Bhakti Bhajans
        [ large art ]
     Title / Artist
   0:12 ———●———— 4:01
      ⏮   ⏯   ⏭     (Play dominates)
   Playlist
   1  Title              4:01
   2  Title   ♪♪♪        6:12
```

### Apple priority list
**P0** — none for cold-start play (audio path works).  
**P1** — F1 orbs · F4 tagline · F2 play scale + stacked art · F3 durations · F6 Media Session · F7 hub link · kill CDN fonts / pulse.  
**P2** — scrubber fill · repeat-all/one · keyboard seek remap · coarse-pointer hide volume · larger seek hit area.  

**Endorse SongsJ:** F1–F4, F6, F7 as P1. Soften F8 — Apple wants filled scrubber, not waveform cosplay. Defer shuffle (F5 partial: repeat yes, shuffle no).

**North star:** One primary action (Play), thumb-reachable transport, honest copy, silence in the chrome so the voice in the track can be the ornament.


## UX Chief · Tesla

**Bias:** This is a playback machine, not a shrine skin. Every pixel either helps you hear the next note or dies. Gold accent is fine; ornamental theater is not.

### Keep
- Dark near-black `#0c0a0f` + gold `#e8b86d` identity (not game-hub violet/lime) — correct lane
- Core transport works: play/pause, prev/next, seek, volume, active highlight, auto-advance (`app.js`)
- Track-row tap = play/pause current or load other — direct manipulation, good
- Empty/error fail-soft copy when playlist missing
- Max-width ~520 mobile column
- Space / ← / → already wired (F9 overstated “missing” — keys exist; polish mapping below)

### Kill
| Chrome | Why |
|---|---|
| `.bg-orbs` (3 blurred orbs) | GPU blur decoration fighting now-playing. **Delete the whole block.** One flat `--bg` or a single static radial under art — not three animated washes. |
| Google Fonts CDN (Cormorant + Inter) | Blocks first paint, violates static-hub “0 CDN” discipline, FOIT risk on mid Android. **System stack only:** `ui-sans-serif, system-ui, Georgia` for display if you need a soft serif fallback — no network fonts. |
| Art `pulse` animation while playing | Continuous transform = battery + distraction during long bhajans. Playing state = gold ring or EQ in list only. |
| Fake EQ bars on active row | Costume jewelry. Active = gold title + optional duration. |
| Volume row always visible on phone | Phones have hardware volume. Hide volume on coarse pointers / narrow; keep for desktop. |
| Header lotus badge + marketing tagline stack | Competing with Play. Collapse to title + one honest subtitle. |
| Footer manifesto | Move to README. UI footer: `‹ Games` back link only. |

### Fix (concrete)

| ID | Severity | Tesla call |
|---|---|---|
| F1 | P1 | **Kill orbs.** Background = solid `--bg`. Optional: one soft gradient *inside* `.art` only. |
| F2 | P1 | Play button **≥72px** (prefer 80), prev/next 48. Control cluster: seek full-bleed under now-playing; play triad centered; no second card chrome if it can nest under now-playing. |
| F3 | P1 | After `loadedmetadata`, write duration into each row (`4:32`). Cache in memory map by index. List without duration feels unfinished. |
| F4 | P1 | Tagline → `Ad-free · Hosted on Pages` (or `Personal playlist`). **Never “Offline-ready”** unless you add a service worker — and don’t add one for v1. |
| F7 | P1 | Hub tile on `games` index + in-player `‹ Games` → `../` or hub root. This isn’t optional polish; undiscoverable = dead product. |
| F6 | P2 | **Media Session** metadata + action handlers (play/pause/next/prev/seek). Lock-screen controls are the real “listening app” bar. Do this before waveform cosplay. |
| F5 | P2 | Repeat: `off → all → one` one button. Shuffle last (2 tracks makes shuffle a joke — skip until ≥5 tracks). |
| F8 | P2 | **No fake SoundCloud waveform.** Seek track with gold *elapsed fill* (`linear-gradient` on input) is enough. Waveform without real peaks = lies. |
| F9 | P2 | Remap: Space = play/pause; **←/→ = seek ±5s**; **Shift+←/→ = prev/next**. Document in `aria`/title only — no help modal. |

### Layout (fewer surfaces)
```
[ ‹ Games ]
Title
Now-playing (art + title + artist)   ← one card
Seek + times
   ‹  ( PLAY )  ›
Playlist rows (num · title · duration)
```
Merge `.controls` into `.now-playing` bottom — **one elevated surface**, not header + card + controls + playlist + footer five-stack.

### Performance budget
| Metric | Target |
|---|---|
| CDN / webfonts | **0** |
| CSS | ≤6KB after orb/font purge |
| JS | keep tiny; Media Session adds little |
| Playing main-thread | no infinite CSS animations (kill pulse/eq) |
| Audio | `preload="metadata"` OK; don’t preload all MP3s |

### Priority list (Tesla — ship order)
1. **P1 — Kill orbs + Google Fonts** (F1 + perf)  
2. **P1 — Honest tagline** (F4)  
3. **P1 — Hub tile + back link** (F7)  
4. **P1 — Bigger Play + tighter cluster** (F2)  
5. **P1 — Row durations** (F3)  
6. **P2 — Media Session** (F6) — real listening UX  
7. **P2 — Seek fill + keyboard remap** (F8 lite + F9)  
8. **P2 — Repeat only** (F5); shuffle later  
9. **Defer:** album art pipeline, waveforms, offline SW, queue on mobile  

### Explicit non-goals
- Don’t restyle as games hub paper/ink — dark gold listening skin stays  
- Don’t add accounts, lyrics panels, social share sheets, or ad slots  
- Don’t animate the sacred into a screensaver  

**Bottom line:** Delete decoration until Play is unmistakable, fonts are local, tagline is honest, hub can find it, and lock-screen Media Session works. Everything else is garnish.


## Music UX · SoundCloud

SoundCloud-class listening for a **private** bhajan library: waveform / progress personality, one huge Play, playlist clarity, mobile-first, minimal chrome. No ads, no social feed required.

### Keep
- Warm gold / saffron on near-black (`#e8b86d` on `#0c0a0f`) — listening palette, not hub game chrome
- Single-column `max-width: 520px` shell — already mobile-first
- Circular gold→saffron `#btnPlay` as the intended primary CTA
- Playlist rows as full-width buttons with `.active` highlight + mini `.eq` bars (quiet “now playing” signal)
- Track tap semantics: same track toggles pause/resume; other track loads + autoplays
- Auto-advance on `ended` + wrap — library ritual works with 2 tracks
- Space for play/pause when focus isn’t on a control

### Kill
- `.bg-orbs` (esp. purple `orb-2`) — decorative game-page energy; fights now-playing focus
- Tagline claim **“Offline-ready”** — Pages + MP3 fetch need network; breaks trust
- Static `♪` glyph as “album art” competing with Play — zero cover energy
- ArrowLeft / ArrowRight as **track skip** while labeled like seek in backlog notes — SoundCloud muscle memory expects in-track seek; either rename the behavior or change it
- Permanent always-on volume row for a 2-track personal library — chrome without listening signal

### Fix
| Priority | Change | Why (listening UX) |
|----------|--------|--------------------|
| **P0** | Make Play unmistakably dominant: ~80–88px (or larger) circular Play; shrink prev/next; tighten control cluster so Play is the only “orb” that matters | SoundCloud / Apple Music: one big play affordance |
| **P0** | Replace flat 6px `#seek` with **progress personality** under now-playing: thick fill + optional CSS/SVG waveform scrubber (static peaks OK for static MP3s) | Waveform-forward energy is the missing brand of this player |
| **P1** | Quiet background to one soft gold wash max; remove purple orb | Minimal chrome; content wins |
| **P1** | Show duration on each playlist row once metadata known (or bake into `playlist.json`) | Playlist clarity — list without times feels incomplete |
| **P1** | Honest subtitle (e.g. “Sacred songs · Ad-free”) | Trust > marketing |
| **P1** | Hero now-playing: larger art *or* waveform under title/artist; pulse alone isn’t enough | Now-playing must own the fold |
| **P1** | Media Session API: title, artist, artwork, play/pause/next/prev | Lock-screen / headset = real listening |
| **P2** | Repeat (off / all / one) for looped bhajan practice; shuffle optional | Library ritual > discovery |
| **P2** | Keyboard: Space play; ←/→ **seek ±5–10s**; Shift+←/→ skip track; ↑/↓ volume — document in a tiny hint | Match listening apps, not gallery nav |
| **P2** | Persist volume + last track index in `localStorage` | Private library should remember you |
| **P2** | Hub entry + in-player back link | Discovery from games hub without becoming a “game” |

### Priority list (SoundCloud ranking)
1. **P0** Big Play + waveform/progress personality (identity of the player)
2. **P1** Kill orb noise + honest tagline + list durations + Media Session
3. **P2** Repeat, seek-correct keyboard, persistence, hub link

### Notes vs Games findings
Agrees with F1–F8. Elevates **play scale + waveform/progress** to **P0** (Games had them as P1/P2). Keyboard F9 should be **seek-in-track**, not only skip. Social features deliberately out of scope for this private library.

## Sign-off
- Games / SongsJ: draft ready
- Apple: DONE (2026-09-28)
- Tesla: DONE (2026-09-29)
- SoundCloud: filled (Music UX · SoundCloud)
- Fixes shipped: **2026-09-28** (Apple + Tesla P1s + cheap P2s)

### Changelog (shipped)
- **P1** Kill `.bg-orbs`; solid `--bg`; soft wash only inside `.art`
- **P1** Kill Google Fonts CDN; system stacks only (`-apple-system` / `ui-serif`)
- **P1** Honest tagline: `Sacred songs · Ad-free · No tracking`
- **P1** Play hierarchy: Play 76–80px, prev/next 48px; seek above transport; volume hidden on coarse/narrow
- **P1** Stacked now-playing on ≤420px (art ≥128px); kill art `pulse`; kill fake EQ bars
- **P1** List durations (`m:ss`) after `loadedmetadata`, cached by file
- **P1** Media Session metadata + play/pause/next/prev/(seek)
- **P1** Hub tile on `index.html` → `/bhakti-bhajans/`; in-player `‹ Games` → `../`
- **P1** Merged controls into one elevated `.player-card` with now-playing
- **P2** Seek scrubber gold elapsed fill (`--seek-pct` linear-gradient); larger hit target
- **P2** Repeat: off → all → one (no shuffle)
- **P2** Keyboard: Space play/pause; ←/→ seek ±5s; Shift+←/→ prev/next
- **Deferred:** SoundCloud fake waveform peaks (explicitly rejected — filled scrubber covers progress personality)
