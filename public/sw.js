// Service Worker for Salon POS — App Shell Cache
// Bump CACHE_VERSION whenever you want all clients to get a fresh cache.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `salon-pos-${CACHE_VERSION}`;

// Assets to pre-cache on SW install.
// Only static, always-available files — NOT server-rendered HTML pages.
const PRECACHE_ASSETS = [
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // Activate immediately, don't wait for old SW
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our own origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept API routes — always go to network for fresh data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return;

  // ── Navigation requests (HTML page loads, e.g. tapping the home screen icon) ──
  // Strategy: Cache-first, then update cache in background.
  // This is what eliminates the black screen: the cached HTML is served in ~0ms.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Normalise to the root path so all navigations hit the same cached shell
        const cacheKey = new Request('/');
        const cached = await cache.match(cacheKey);

        // Fire a background update regardless
        const networkUpdate = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(cacheKey, response.clone());
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          // Serve stale immediately; update happens in background
          event.waitUntil(networkUpdate);
          return cached;
        }

        // First visit — wait for network
        return networkUpdate.then((r) => r || cached);
      })
    );
    return;
  }

  // ── Static assets (Next.js chunks, fonts, images) ──
  // Strategy: Cache-first, fallback to network and cache the result.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
