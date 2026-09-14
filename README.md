# Picture Telephone

A **Telestrations-style** party game you can play in the browser: draw a prompt, pass it on, describe the drawing, draw the description, and laugh at the reveal.

Pure static HTML/CSS/JS — **no build step**, no accounts, no server. Game state rides in the URL hash (or a small turn file).

## How to play

### Pass-the-link (phones + laptops)

1. One person opens the game and taps **Start a game**.
2. Enter your name, pick player count (2–8), choose a random prompt or type your own.
3. **Draw** the prompt, then tap **Done drawing**.
4. On the pass screen, **Copy link** (or show the QR code) and send it to the next player.
5. They open the link, enter their name, and **describe** the drawing (or **draw** the description — turns alternate).
6. Keep passing until everyone has taken a turn, then step through the **Reveal**.

### Hotseat (one device)

On the pass screen, tap **I’m next on this device**, enter the next player’s name, and continue. No link needed.

### Long drawings

Stroke vectors keep most links short. If a drawing still makes the URL too long, **Download turn file** (`.pturn.json`) and share that file. The next player uses **Join with link or file** → import.

### Refresh mid-turn

A local draft is saved in `localStorage` while you draw or describe. Use **Resume unfinished turn** on the home screen if you reload by accident.

## Host on GitHub Pages

1. Create a new GitHub repository.
2. Upload this folder’s contents (`index.html`, `css/`, `js/`, `README.md`) to the repo root — or keep them in a `docs/` folder / `gh-pages` branch.
3. In the repo: **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose the branch (usually `main`) and folder (`/` or `/docs`), then **Save**.
6. After a minute, open `https://<user>.github.io/<repo>/` and play.

You can also drop the folder on any static host (Netlify, Cloudflare Pages, nginx, etc.) or open `index.html` via a local static server.

> **Note:** Opening `index.html` as a `file://` URL may block ES modules in some browsers. Prefer a tiny local server, e.g. `python -m http.server` from this directory.

## Technical notes

- **State schema** version `1` — compressed into `#pt1.…` hashes.
- Drawings are **stroke polylines** (normalized coordinates), not bitmaps, so links stay small.
- QR codes are generated **locally in JS** (no external API).
- System font stack only; no third-party CDNs.

## License

Do what you want — built for family game night.
