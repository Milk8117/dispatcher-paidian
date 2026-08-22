// Service Worker for MiRun AI — 越用越懂你
// Cache version: update this string to invalidate old caches
const CACHE_VERSION = 'mirunai-v52.2';
const CACHE_NAME = CACHE_VERSION;

// Resources to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/favicon.ico',
  './assets/mirun-ai-logo.png',
  './assets/mierke-logo.png'
];

// Listen for skip waiting message from page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: precache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => (name.startsWith('mirunai-') || name.startsWith('mijieai-') || name.startsWith('wealth-ct-')) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: stale-while-revalidate for everything
// Always return cached immediately if available, and update cache in background
// This ensures fast load + always fresh on next visit
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Start network fetch in background to update cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse;
        });

      // Return cache immediately if available, otherwise wait for network
      if (cachedResponse) {
        // For HTML/JS, also notify page that update is available
        const url = new URL(event.request.url);
        if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
          // Return cached, but network still updating in background
          // Next navigation will get fresh content
        }
        return cachedResponse;
      }
      return fetchPromise;
    })
  );
});
