const CACHE = "shelfside-v30";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  if (url.origin !== location.origin) {
    if (url.hostname.includes("gutendex.com") || url.hostname.includes("gutenberg.org")) return;
    if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")
      || url.hostname.includes("cdnjs.cloudflare.com") || url.hostname.includes("allorigins.win")
      || url.hostname.includes("corsproxy.io")) {
      e.respondWith(caches.open(CACHE).then(async c => {
        const cached = await c.match(e.request);
        const fresh = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => cached);
        return cached || fresh;
      }));
    }
    return;
  }

  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then(cached =>
        fetch(e.request).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("./index.html", copy));
          }
          return res;
        }).catch(() => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached ||
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => Response.error())
    )
  );
});
