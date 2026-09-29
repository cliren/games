/* My Music — shell + played-audio cache (static, no backend) */
const SHELL_CACHE = "my-music-shell-v7";
const AUDIO_CACHE = "my-music-audio-v7";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=7",
  "./app.js",
  "./app.js?v=7",
  "./library.json",
  "./playlist.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== AUDIO_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isAudio = /\.(mp3|m4a|ogg|wav|aac)(\?|$)/i.test(path) || path.includes("/audio/");

  if (isAudio) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          const fallback = await cache.match(req);
          if (fallback) return fallback;
          throw err;
        }
      })
    );
    return;
  }

  // Shell / JSON: network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_AUDIO" && event.data.url) {
    const url = event.data.url;
    caches.open(AUDIO_CACHE).then(async (cache) => {
      const hit = await cache.match(url);
      if (hit) return;
      try {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      } catch (_) { /* offline or blocked */ }
    });
  }
});
