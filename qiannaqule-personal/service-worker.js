// Service Worker for 个人财富增长CT — AI财务体检
// Cache version: update this string to invalidate old caches
const CACHE_VERSION = 'wealth-ct-v5';
const CACHE_NAME = CACHE_VERSION;

// Resources to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-orange.png'
];

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
          .filter((name) => name.startsWith('wealth-ct-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, and update cache in background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, but we already have cache
        });

        return cachedResponse;
      }

      // No cache, try network
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline and no cache - return a simple offline page
        return new Response('离线模式：请检查网络连接后重试', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
