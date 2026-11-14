// Offline support. Online: always fetch the latest files (revalidated with the
// server, so it's fast). Offline: fall back to the last saved copy.
// Bump VERSION whenever the app shell changes.
const VERSION = 'v7';
const CACHE = `hambalang-${VERSION}`;
const PRECACHE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/osint.js', 'js/osint-phone.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'fonts/fonts.css', 'data/vault.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) =>
    // cache: 'reload' skips the browser's HTTP cache so we never save a stale copy.
    fetch(new Request(u, { cache: 'reload' })).then((res) => (res.ok ? c.put(u, res) : null)).catch(() => null),
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // e.g. OneMap: straight to the network

  // Fonts and icons never change under the same name: cache first.
  if (/\/(fonts|icons)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Everything else: network first (revalidated), cached copy when offline.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : new Response('', { status: 504 })))));
});
