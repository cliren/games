# Bhakti Bhajans

A simple, **ad-free** static music playlist player for GitHub Pages. Plays MP3 files hosted in this folder — no YouTube, no Drive, no tracking.

**Live site:** https://cliren.github.io/games/bhakti-bhajans/

## Features

- Playlist list with current-track highlight
- Play / pause, next / previous
- Seek bar with current time and duration
- Auto-advance to the next track
- Volume control
- Mobile-friendly dark aesthetic for bhakti / bhajans
- Keyboard: `Space` play/pause, `←` / `→` previous/next

## How to add more songs

1. Drop your MP3 into the `audio/` folder. Prefer clean ASCII filenames, e.g. `rama-nama.mp3`.
2. Add an entry to `playlist.json`:

```json
{
  "title": "Rama Nama",
  "file": "audio/rama-nama.mp3",
  "artist": "Optional artist"
}
```

3. Commit and push to `main` on the parent `games` repo. GitHub Pages will update in a minute or two.

## Local preview

Serve this folder over HTTP (needed so `playlist.json` can be fetched):

```bash
cd bhakti-bhajans
python3 -m http.server 8080
```

Open http://localhost:8080

## Stack

Plain HTML, CSS, and vanilla JavaScript. No build step, no frameworks, no ads.

## License

Audio files remain the property of their respective owners. Code in this folder is free to use and adapt.
