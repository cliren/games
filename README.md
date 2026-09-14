# Games hub

Static multi-game hub for same-phone party games. One phone. Pass in the app. No accounts, no server.

**Live:** [https://cliren.github.io/games/](https://cliren.github.io/games/)

## Games

| Game | Path | Players |
|------|------|---------|
| **Arrow Shot** | [`games/arrow-shot/`](./games/arrow-shot/) | 1 · ~3 min |
| **Picture Telephone** | [`games/picture-telephone/`](./games/picture-telephone/) | 1–8 · ~15 min |
| **Most Likely Pass** | [`games/most-likely-pass/`](./games/most-likely-pass/) | 2–8 · ~10 min |
| **Blame Chain** | [`games/blame-chain/`](./games/blame-chain/) | 2–8 · ~8 min |
| **Green Flash** | [`games/green-flash/`](./games/green-flash/) | 2–4 · ~5 min |
| **Corner Claim** | [`games/corner-claim/`](./games/corner-claim/) | 2–4 · ~3 min |
| **Pass Bomb** | [`games/pass-bomb/`](./games/pass-bomb/) | 2–8 · ~10 min |
| **Zone Whack** | [`games/zone-whack/`](./games/zone-whack/) | 2–4 · ~3 min |
| **Steady Hands** | [`games/steady-hands/`](./games/steady-hands/) | 2–8 · ~5 min |
| **Wrong Answers Only** | [`games/wrong-answers-only/`](./games/wrong-answers-only/) | 2–8 · ~8 min |

**Picture Telephone:** Draw a prompt → pass the phone → describe the drawing → draw the description → reveal the chain.

**Most Likely Pass** — Prompt → pick who fits (not self) → pass phone → reveal who picked whom + Wrapped (Phone Magnet, Under the Radar, Mutuals). Hotseat only.

**Blame Chain:** Chaos prompt → hotseat blame + alibi → reveal carousel → blame board.

**Green Flash:** Wait for green → tap first (versus split or hotseat). False-start hurts. Best of 5 podium.

**Corner Claim:** Split-screen hold-to-paint. Claim a corner, fill the most in 10 seconds.

**Pass Bomb:** Category card + ticking fuse. Say one out loud, tap **Pass**, don’t boom. Last standing wins.

**Zone Whack:** Split the screen. Moles spawn in colored zones — whack only yours. Highest score wins.

**Steady Hands:** Rest the phone on your palm. Hold still 5s. Lowest DeviceMotion shake wins. Motion permission on Start; hold-still tap timer if denied.

**Arrow Shot:** Pull back to aim, release to shoot. Matter.js physics — hit targets in 5 arrows.

### How to play Picture Telephone

**Same phone:** Start → draw/describe → **Done** → privacy curtain → **Pass to {name}** / **I’m {name}**. Handoff stays in the app.

**Solo:** Pick **1** player (default 4 turns). Same person every turn; curtain says look away, then **Next** (auto role flip).

**Advanced details (rare):** Copy link, turn file, or QR live under **Advanced details** on the curtain. Soft ~8KB / hard ~16KB hash. Same-phone play never needs a download. Join via **Join with link or file**.

**Refresh mid-turn:** Drafts save in `localStorage`. Use **Resume unfinished turn** on the game home.

## Enable GitHub Pages

1. Push this repo to GitHub (`cliren/games` or your fork).
2. **Settings → Pages**.
3. **Build and deployment → Source:** Deploy from a branch.
4. Branch: `main`, folder: `/` (root). **Save**.
5. Open `https://<user>.github.io/<repo>/` — hub at `/`, Picture Telephone at `/games/picture-telephone/`.

Relative links are used throughout so the site works at a repo subpath (e.g. `/picture-telephone/`).

> Prefer a local static server for testing (`python -m http.server` from the repo root). `file://` may block ES modules.

## Add a future game

Folder pattern:

```
games/
  your-game-slug/
    index.html
    css/styles.css
    js/…          # game logic
```

1. Create `games/<slug>/` with its own HTML/CSS/JS (no build step required).
2. Add a card on the hub (`index.html`) pointing to `./games/<slug>/`.
3. Reuse the how-to pattern: 3 verb steps, `localStorage` key `howto:<slug>:v1`, header `?` to reopen.
4. Handoff is in-app curtains (`Pass to {name}` / `I’m {name}`). Deep links are optional/advanced.
5. Thin top bar: `‹ Games` → `../../` | title | `?`.

Hub tokens live in `css/hub.css` (paper / ink / CTA). Games may copy the same tokens locally.

## UX

Locked decisions: [`docs/ux/debate-picture-telephone.md`](./docs/ux/debate-picture-telephone.md) (Decision section).

## Tech notes

- Schema `v1` → `#pt1.…` compressed hashes; stroke polylines (not bitmaps).
- QR generated in-browser (lazy, behind **Show QR**).
- System font stack only; zero CDNs / webfonts.
- Canvas surface always `#FFFFFF`; DPR capped at 2.

## License

Do what you want — built for family game night.
