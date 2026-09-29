# My Music

Ad-free static music library for GitHub Pages. Apple Music–like **Library** home with a bottom mini-bar and Now Playing sheet. Plays MP3s hosted in this folder — no YouTube, no ads, no tracking. URL path stays `bhakti-bhajans/` for stability; the UI is branded **My Music**.

**Live:** https://cliren.github.io/games/bhakti-bhajans/

## Features

- **Library home** — destination rows: Playlists, Songs, Recently Played, then Categories (Bhakti / Folk / Other)
- **Bottom mini-bar** + tap → **Now Playing** sheet (seek, prev/next, shuffle, repeat)
- **Sort** Name | Date on list screens
- **Shuffle** on lists ≥2 and on Now Playing; **repeat** off / all / one
- **Custom playlists** — create, rename, delete; add/remove/reorder (`localStorage` `myMusic.v1`)
- **Recently played** (last 30)
- Media Session (lock screen / headset)
- Service worker caches shell + audio after play (`Ad-free · Remote`)
- Keyboard: `Space` play/pause, `←`/`→` seek 5s, `Shift+←`/`→` prev/next
- Discreet **Repair** control clears SW/caches and reloads

## Data

Tracks live in `library.json` (mirrored in `playlist.json` for fallback):

```json
{
  "tracks": [
    {
      "id": "rama-nama",
      "title": "Rama Nama",
      "artist": "Optional artist",
      "file": "audio/rama-nama.mp3",
      "category": "bhakti",
      "dateAdded": "2026-09-28"
    }
  ]
}
```

`category` must be `bhakti`, `folk`, or `other`.

## How to add songs

1. Drop an MP3 into `audio/` (ASCII filenames preferred).
2. Add a track object to `library.json` (and optionally `playlist.json`).
3. Commit and push to `main` on `cliren/games`. Pages updates in a minute or two.

## Local preview

```bash
cd bhakti-bhajans
python3 -m http.server 8080
```

Open http://localhost:8080 — HTTPS or localhost is needed for the service worker.

## Stack

Plain HTML, CSS, and vanilla JavaScript. No build step, no frameworks, no CDN fonts, no ads. Light Apple Music–inspired theme.

## License

Audio files remain the property of their respective owners. Code in this folder is free to use and adapt.
