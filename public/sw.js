/* ==========================================================
   ZNN – Service Worker  |  PWA Support v3
   ✅ Fixed: Supabase requests are now excluded from caching
   ========================================================== */

const CACHE_NAME = 'znn-v4';
const PRECACHE = [
  '/',
  '/style.css',
  '/script.js',
  '/supabase-config.js',
  '/logo.png',
  '/manifest.json'
];

// Install – precache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate – cleanup old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch – network-first for API & Supabase, cache-first for assets
self.addEventListener('fetch', (e) => {
  // Only handle GET requests (Cache API doesn't support POST/PUT/DELETE)
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ✅ CRITICAL: Never cache or intercept Supabase requests
  // These must always go to the network for fresh data
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    // Network only — do not cache, do not intercept
    return;
  }

  // API calls: network only (legacy — no longer used, but kept as safety net)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // CDN scripts (jsdelivr, googleapis, etc.): network first, cache fallback
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      });
    })
  );
});
