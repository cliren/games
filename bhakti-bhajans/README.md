# My Music

Ad-free static music player for GitHub Pages. Apple Music–like **Library** home with a bottom mini-bar and Now Playing sheet. Audio is **streamed from Google Drive** (nothing hosted in this repo). URL path stays `bhakti-bhajans/` for stability; the UI is branded **My Music**.

**Live:** https://cliren.github.io/games/bhakti-bhajans/

## Features

- **Library** home with Songs / Recently Played / Bhakti / Folk / Other
- **Google Drive folders** — paste shared folder URLs (Anyone with the link · Viewer), Refresh to rebuild the library — **no API key**
- **Paste file links** fallback when folder listing is blocked or rate-limited
- Drive playback via CORS `fetch` → `blob:` URL using a **Drive API key** or **media proxy** (direct usercontent is blocked cross-site by Google’s `Sec-Fetch-Site` policy; CORP also blocks raw `<audio src>`)
- Local search, shuffle / repeat, custom playlists, recently played (`localStorage` `myMusic.v1`)
- **Clear library** (Sources) wipes imported songs, recently played, playlist contents, and Drive track/blob cache after confirm — keeps folder URLs and unlock password; per-song **Clear** on Songs / Recently Played
- Whole-app unlock gate; service worker caches **shell only**; Drive media is never cached
- **Call interruption resume** — incoming / system audio interrupt auto-resumes; outgoing leave (hide-then-pause) does not (best-effort on iOS)
- **Add to Playlist** from Now Playing / mini-bar (local `myMusic.v1` playlists)
- **Lock-screen controls** via Media Session (play / pause / stop / previous / next / seek); position updates while playing
- **Lock-screen Stop** — Media Session `stop` (and unload `pagehide`) fully kills audio + clears the session so controls can dismiss

## Google Drive (keyless)

1. Share a Drive folder as **Anyone with the link → Viewer**.
2. In **Sources**, tap **Add Drive folder** and paste the URL  
   (e.g. `https://drive.google.com/drive/folders/1YT5oul30_jT5YoReVY9Snz9FS9KEhuAB`).
3. Tap **Refresh library**. Listing uses Google’s public `embeddedfolderview` page via a CORS-friendly reader proxy (jina.ai, with allorigins fallback). No Google Cloud project or API key.
4. If listing fails (proxy outage / rate limit), tap **Paste file links** and paste one `https://drive.google.com/file/d/…/view` URL per line (optional `Name.mp3 | url`).

| Action | Needs API key? | How |
| --- | --- | --- |
| List folder files | **Password preferred** | Drive `files.list` when unlocked (complete). Keyless: merge jina/allorigins of `embeddedfolderview` (jina alone often truncates) |
| Play | **API key or media proxy** | Browser → blob URL. Direct `drive.usercontent` is blocked cross-site (see below). |

**Why playback needs a password or proxy (v11–v23):** Google applies Fetch Metadata isolation on `drive.usercontent.google.com`: any browser request with `Sec-Fetch-Site: cross-site` (always true from github.io) receives **HTTP 403** with no CORS headers. Curl/Node without that header still get `audio/mpeg` + `ACAO:*`, which is why earlier “blob fetch” fixes looked fine outside a real browser. Same-site `CORP` also blocks raw `<audio src>`.

**Playback options (Sources):**
1. **Drive API key** — `googleapis.com/drive/v3/files/ID?alt=media&key=…` (CORS works). Restrict the key’s HTTP referrer to `https://cliren.github.io/*`. Paste into **Sources** only — stored in `localStorage` `myMusic.driveApiKey`. **Never commit API keys** (no embedded default in `drive.js`).
2. **Media proxy** — deploy `drive-proxy-worker.js` (Cloudflare Worker), then set proxy to `https://YOUR.workers.dev/?id={id}` (`myMusic.drive.mediaProxy`). The worker fetches Drive server-side and strips CORP.
3. Direct usercontent is still tried (with virus-scan `confirm=` token retry) for non-blocked environments.

**Categories:** files in the root of a linked folder are classified from their filename/title: `bhakti`, `bhajan`, `krishna`, `shiva`, `govind`, or `mantra` → `bhakti`; `folk` or `village` → `folk`; otherwise → `other`. One-level subfolders named `Bhakti` / `Folk` / `Other` (any case) override the filename/title classification.

An example folder (`Songs-Surender`) is auto-linked on first visit; you can Remove it anytime.

### Storage

- Folder list: `localStorage` `myMusic.drive.v1` → `[{ id, url, name?, addedAt }]`
- Cached Drive track metadata: `myMusic.driveCache.v1`
- Example seed flag: `myMusic.drive.seeded`
- Optional playback API key: `myMusic.driveApiKey`
- Optional media proxy template: `myMusic.drive.mediaProxy` (`{id}` / `{url}`)


## Security: API keys

- **Never commit** Google API keys (or any secrets) into this repo.
- Enter the key only on the unlock screen (`localStorage`). Rotate any key that was ever committed.
- `drive.js` `getApiKey()` reads `myMusic.driveApiKey` from localStorage only.

## Unlock

The unlock **password** is stored in this browser (`myMusic.driveApiKey`). Unlock validates it with Google Drive, then remembers it for later visits. **Lock** clears the password and returns to the lock screen. **Clear library** does **not** clear the password — only Lock does. Refresh uses the unlock password.


## Background / lock screen (mobile)

Media Session keeps play/pause/skip/stop on the lock screen while the `<audio>` element is the active media source. After an **incoming** call (or other system audio interrupt), the player marks a system interruption and calls `audio.play()` again when the page becomes visible/focused — unless you paused yourself. If you **left the page first** (visibility hidden while still playing) and audio paused later, that is treated as outgoing/leave and does **not** auto-resume.

**iOS Safari (v21–v23):** Do **not** register `seekbackward` / `seekforward` — those replace next/previous in Control Center / lock screen. Handlers are re-bound on every `loadTrack` / `play` / `playing`. Artwork uses real 96×128 PNG data URLs (first). `setPositionState` is throttled on `timeupdate`. Visibility-hidden does **not** pause user-intended playback. Track switches update metadata then assign `audio.src` (no empty-src clear) so the session stays continuous. Blob:` playback from a user gesture is fine on iOS.

**iOS Safari (v22–v23):** Prefetch + pin current/next/prev Drive `blob:` URLs so lock-screen / background track advance does not wait on network or hit a revoked object URL (silent next song). Media Session `play` rehydrates a dead blob and retries `play()`. Loudness: per-track gain from RMS decode applied via `audio.volume` (not Web Audio — `AudioContext` suspends when locked and would mute background audio). UI volume still works; boost is capped at 1.0.

**iOS Safari (v23):** Media Session `stop` fully pauses, clears `src`, and drops Media Session metadata/handlers so lock-screen controls can go away. `pagehide` (non-bfcache unload) also hard-stops. Lock-screen freeze / visibility-hidden alone does **not** stop — intentional background play continues. Swipe-to-dismiss is not always exposed to web apps the same as native; `stop` + unload are the reliable kill paths.

**iOS Safari limits:** Background/lock controls need a prior user-gesture start; artwork works best as PNG (SVG is often ignored). Distinguishing incoming vs outgoing call is imperfect (both may hide the page). Auto-resume after a call is best-effort — iOS may still require a tap if the tab was fully suspended. Add to Home Screen (standalone) improves reliability vs a background Safari tab. While fully suspended, JS/network may pause — next-track works best when the following song was prefetched before suspend. Overnight shuffle can still stall if iOS freezes the PWA entirely (platform limit).

## Develop

```bash
cd bhakti-bhajans
python3 -m http.server 8080
```

Open http://localhost:8080 — HTTPS or localhost is needed for the service worker.

## License

Audio files remain the property of their respective owners. Code in this folder is free to use and adapt.
