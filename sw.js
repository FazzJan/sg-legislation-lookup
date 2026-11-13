// Offline support. Bump VERSION whenever the app shell changes.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const DATA = 'data';
const SHELL_FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Data: network first so updates arrive, cached copy when offline.
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(DATA).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || new Response('', { status: 404 }))));
    return;
  }

  // App shell and fonts: cache first, refresh in the background.
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached || caches.match('index.html'));
      return cached || net;
    }));
  }
});
