/* My Music — shell cache only (v17). No local audio/; Drive media is never intercepted. */
const SHELL_CACHE = "my-music-shell-v17";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=17",
  "./app.js",
  "./app.js?v=17",
  "./drive.js",
  "./drive.js?v=17",
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
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never proxy/cache cross-origin (Drive usercontent, listing proxies, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first shell / JSON
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
