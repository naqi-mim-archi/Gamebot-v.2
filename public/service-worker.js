const CACHE_NAME = 'gamebot-shell-v1';

// Only cache true static assets — never API calls or navigation
const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.svg', '.ico', '.woff', '.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/favicon.svg', '/manifest.json'])
    )
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
  const { request } = event;
  const url = new URL(request.url);

  // ── Never intercept API calls ────────────────────────────────────────────────
  // SSE streams (like /api/generate/stream) break if routed through a SW.
  // Let the browser handle all /api/* requests directly.
  if (url.pathname.startsWith('/api/')) return;

  // ── Never intercept navigation requests ─────────────────────────────────────
  // The SPA router handles these; let them reach the network unchanged.
  if (request.mode === 'navigate') return;

  // ── Cache-first only for known static asset types ────────────────────────────
  const isStatic = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
  if (!isStatic) return; // let the browser handle everything else natively

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached || new Response('', { status: 408 }));
    })
  );
});
