# Games hub

Static multi-game hub for pass-the-phone party games. No accounts, no server — state lives in the link (or a turn file).

**Live:** [https://cliren.github.io/games/](https://cliren.github.io/games/)

## Games

| Game | Path | Players |
|------|------|---------|
| **Picture Telephone** | [`games/picture-telephone/`](./games/picture-telephone/) | 2–8 · ~15 min |

Draw a prompt → pass the link → describe the drawing → draw the description → reveal the chain.

### How to play Picture Telephone

**Pass-the-link:** Start a game → draw → **Copy link** → next player opens it → describe or draw → keep passing → **Reveal**.

**Hotseat:** On the pass screen, **Same phone? Continue here** — no link needed.

**Long drawings:** Soft limit ~8KB / hard ~16KB of hash. If the link is too long, **Download turn file** and share that. Join via **Join with link or file**.

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
4. Keep deep links shareable; each game owns its URL hash schema.
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
