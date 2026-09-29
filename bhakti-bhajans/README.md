# My Music

Ad-free static music library for GitHub Pages. Plays MP3s hosted in this folder — no YouTube, no ads, no tracking. URL path stays `bhakti-bhajans/` for stability; the UI is branded **My Music**.

**Live:** https://cliren.github.io/games/bhakti-bhajans/

## Features

- **Library** with category chips: All / Bhakti / Folk / Other
- **Sort** by name or date added
- **Shuffle** and **repeat** (off / all / one)
- **Custom playlists** — create, rename, delete; add/remove tracks; reorder with ↑↓ (stored in `localStorage`)
- **Recently played** (last 30, `localStorage`)
- Big Play control, filled scrubber, Media Session (lock screen / headset)
- **Offline-ready:** a service worker caches the app shell on first visit and each audio file the first time you play it
- Keyboard: `Space` play/pause, `←`/`→` seek 5s, `Shift+←`/`→` prev/next

## Data

Tracks live in `library.json` (also mirrored in `playlist.json` for compatibility):

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

User playlists, recently played, and prefs (sort, shuffle, repeat, last track, volume) stay in the browser — nothing is uploaded.

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

Plain HTML, CSS, and vanilla JavaScript. No build step, no frameworks, no CDN fonts, no ads.

## License

Audio files remain the property of their respective owners. Code in this folder is free to use and adapt.
