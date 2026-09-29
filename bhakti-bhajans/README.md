# My Music

Ad-free static music library for GitHub Pages. Apple Music–like **Library** home with a bottom mini-bar and Now Playing sheet. Seed tracks can live in-repo; additional audio is **streamed from Google Drive** (nothing new pushed to GitHub). URL path stays `bhakti-bhajans/` for stability; the UI is branded **My Music**.

**Live:** https://cliren.github.io/games/bhakti-bhajans/

## Features

- **Library home** — Playlists, Songs, Recently Played, Categories (Bhakti / Folk / Other)
- **Google Drive folders** — paste shared folder URLs (Anyone with the link · Viewer), Refresh to rebuild the library
- **Bottom mini-bar** + tap → **Now Playing** sheet (seek, prev/next, shuffle, repeat)
- **Sort** Name | Date on list screens
- **Shuffle** / **repeat**; custom playlists and recently played (`localStorage` `myMusic.v1`)
- Media Session (lock screen / headset)
- Service worker caches **shell only** aggressively; same-origin audio after play; **does not** cache Drive media
- Keyboard: `Space` play/pause, `←`/`→` seek 5s, `Shift+←`/`→` prev/next
- Unlock gate: `Hyd` + PT year/month (`YYYYMM`); **Logout** / **Repair**

## Google Drive import

1. Share a Drive folder as **Anyone with the link → Viewer**.
2. In **Sources**, tap **Add Drive folder** and paste the URL  
   (e.g. `https://drive.google.com/drive/folders/1YT5oul30_jT5YoReVY9Snz9FS9KEhuAB`).
3. Optional but recommended for listing: create a free Google Cloud **API key**, enable **Google Drive API**, restrict by HTTP referrer to `cliren.github.io/*`, paste it under **Drive API key**, Save.
4. Tap **Refresh library**. Tracks appear in Songs / Categories / Search / playlists.

**How it works**

| Action | Needs API key? | Endpoint |
| --- | --- | --- |
| List folder files | **Yes** (reliable) | `GET https://www.googleapis.com/drive/v3/files?q='FOLDER_ID'+in+parents&key=…` |
| Play a public file | **No** | `https://drive.usercontent.google.com/download?id=FILE_ID&export=download` (or Drive `alt=media` when a key is set) |

Without an API key, Refresh will explain that listing is blocked (Google returns 403 for unregistered callers). Playback of already-known public file IDs still works without a key.

**Categories:** files in the root of a linked folder → `bhakti`. One-level subfolders named `Bhakti` / `Folk` / `Other` (any case) assign that category.

**Persistence**

- Folder list: `localStorage` `myMusic.drive.v1` → `[{ id, url, name?, addedAt }]`
- API key: `myMusic.driveApiKey`
- Cached Drive track metadata: `myMusic.driveCache.v1`
- In-repo seed tracks stay `source: "local"`; Drive tracks are `source: "drive"` and merge by `id`.

## Data (seed tracks)

Optional local seeds in `library.json`:

```json
{
  "tracks": [
    {
      "id": "rama-nama",
      "title": "Rama Nama",
      "artist": "Optional artist",
      "file": "audio/rama-nama.mp3",
      "category": "bhakti",
      "dateAdded": "2026-09-28",
      "source": "local"
    }
  ]
}
```

Prefer Drive for new audio so large files never land on GitHub.

## Local preview

```bash
cd bhakti-bhajans
python3 -m http.server 8080
```

Open http://localhost:8080 — HTTPS or localhost is needed for the service worker. For Drive listing from localhost, add `http://localhost:8080/*` to the API key referrer restrictions.

## Stack

Plain HTML, CSS, and vanilla JavaScript (`app.js` + `drive.js`). No build step, no frameworks, no CDN fonts, no ads.

## License

Audio files remain the property of their respective owners. Code in this folder is free to use and adapt.
