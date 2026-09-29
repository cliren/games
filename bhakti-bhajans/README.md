# My Music

Ad-free static music player for GitHub Pages. Apple Music–like **Library** home with a bottom mini-bar and Now Playing sheet. Audio is **streamed from Google Drive** (nothing hosted in this repo). URL path stays `bhakti-bhajans/` for stability; the UI is branded **My Music**.

**Live:** https://cliren.github.io/games/bhakti-bhajans/

## Features

- **Library** home with Songs / Recently Played / Bhakti / Folk / Other
- **Google Drive folders** — paste shared folder URLs (Anyone with the link · Viewer), Refresh to rebuild the library — **no API key**
- **Paste file links** fallback when folder listing is blocked or rate-limited
- Drive playback via CORS `fetch` → `blob:` URL (raw `<audio src>` is blocked by Drive’s `Cross-Origin-Resource-Policy: same-site`)
- Local search, shuffle / repeat, custom playlists, recently played (`localStorage` `myMusic.v1`)
- Whole-app unlock gate; service worker caches **shell only**; Drive media is never cached

## Google Drive (keyless)

1. Share a Drive folder as **Anyone with the link → Viewer**.
2. In **Sources**, tap **Add Drive folder** and paste the URL  
   (e.g. `https://drive.google.com/drive/folders/1YT5oul30_jT5YoReVY9Snz9FS9KEhuAB`).
3. Tap **Refresh library**. Listing uses Google’s public `embeddedfolderview` page via a CORS-friendly reader proxy (jina.ai, with allorigins fallback). No Google Cloud project or API key.
4. If listing fails (proxy outage / rate limit), tap **Paste file links** and paste one `https://drive.google.com/file/d/…/view` URL per line (optional `Name.mp3 | url`).

| Action | Needs API key? | How |
| --- | --- | --- |
| List folder files | **No** | Proxy fetch of `embeddedfolderview?id=FOLDER` → parse entry ids/names |
| Play | **No** | `drive.usercontent.google.com/download?id=FILE&export=download&confirm=t` → CORS fetch → blob URL for `<audio>` |

**Why blob URLs?** Public Drive downloads return `audio/mpeg`, `Access-Control-Allow-Origin: *`, and `Accept-Ranges: bytes`, but also `Cross-Origin-Resource-Policy: same-site` and `Content-Disposition: attachment`. Media elements use no-cors mode, so the browser blocks the response from github.io. A `fetch(..., { mode: "cors" })` is allowed; we turn the body into a same-origin `blob:` URL.

**Categories:** files in the root of a linked folder → `bhakti`. One-level subfolders named `Bhakti` / `Folk` / `Other` (any case) assign that category.

An example folder (`Songs-Surender`) is auto-linked on first visit; you can Remove it anytime.

### Storage

- Folder list: `localStorage` `myMusic.drive.v1` → `[{ id, url, name?, addedAt }]`
- Cached Drive track metadata: `myMusic.driveCache.v1`
- Example seed flag: `myMusic.drive.seeded`

## Unlock

Year-based gate (Pacific Time). See app copy for the current prompt.

## Develop

```bash
cd bhakti-bhajans
python3 -m http.server 8080
```

Open http://localhost:8080 — HTTPS or localhost is needed for the service worker.

## License

Audio files remain the property of their respective owners. Code in this folder is free to use and adapt.
