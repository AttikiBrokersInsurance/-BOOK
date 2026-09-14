// Minimal service worker — only caches the static app shell so the
// browser considers the app installable. Firestore/auth network calls
// are left completely untouched (not intercepted below).
// NETWORK-FIRST for shell files: always tries to fetch the latest version
// first, and only falls back to the cached copy if the network is down.
// This avoids ever getting "stuck" on an old cached index.html.
const CACHE_NAME = 'sumvolaia-shell-v2';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellFile = url.origin === self.location.origin &&
    SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')) || (f === './' && url.pathname === '/'));

  if (isShellFile) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Everything else (Firebase/Firestore/auth/fonts) passes straight through.
});
