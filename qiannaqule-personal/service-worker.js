// Service Worker for MiRun AI — 越用越懂你
// App version: update this to invalidate old caches and trigger fresh HTML loads
const APP_VERSION = 'v52.4.4';
const CACHE_NAME = 'mirunai-' + APP_VERSION;

// Resources to cache on install — ONLY static assets, NEVER HTML files
// HTML files (index.html, reset.html) use network-first strategy and are never precached
const PRECACHE_URLS = [
  './manifest.json',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/favicon.ico',
  './assets/mirun-ai-logo.png',
  './assets/mierke-logo.png'
];

// Static file extensions that use cache-first strategy
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.bmp'
];

// Determine if a request is for an HTML page (navigation or .html file)
function isHtmlRequest(request) {
  if (request.mode === 'navigate') return true;
  const url = new URL(request.url);
  const path = url.pathname;
  if (path.endsWith('.html')) return true;
  if (path.endsWith('/') || path === '') return true; // directory index = index.html
  return false;
}

// Determine if a request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();
  // manifest.json is a static resource too
  if (path.endsWith('/manifest.json')) return true;
  return STATIC_EXTENSIONS.some(function(ext) {
    return path.endsWith(ext);
  });
}

// Listen for skip waiting message from page
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: precache static resources only (no HTML!)
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    }).catch(function(err) {
      console.warn('SW precache failed (non-critical):', err);
      return self.skipWaiting();
    })
  );
});

// Activate: clean up all old caches from previous versions
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            // Delete any cache that isn't our current version
            return (name.startsWith('mirunai-') || name.startsWith('mijieai-') || name.startsWith('wealth-ct-')) && name !== CACHE_NAME;
          })
          .map(function(name) {
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch handler — strategy per content type:
//   HTML pages → network-first (always get fresh, fall back to cache if offline)
//   Static assets → cache-first (fast, version-change handles invalidation)
//   API / everything else → stale-while-revalidate
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER cache the service worker file itself — this is the #1 cause of deadlock.
  // If the SW is cached, browsers can never detect SW updates, trapping users on old versions forever.
  if (url.pathname.endsWith('/service-worker.js')) {
    return; // pass through to network directly, no caching at all
  }

  // reset.html always loads fresh from network (it's the emergency escape hatch)
  if (url.pathname.endsWith('/reset.html')) {
    return;
  }

  // ── Strategy 1: HTML pages → network-first ──
  // Always try the network first. Only fall back to cache if the user is offline.
  // This ensures every refresh gets the latest HTML from the server,
  // completely eliminating "stale HTML trapping users on old versions" deadlock.
  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(function(networkResponse) {
          // On success, update the cache for offline fallback
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(function() {
          // Network failed — try cache for offline support
          return caches.match(event.request).then(function(cachedResponse) {
            if (cachedResponse) return cachedResponse;
            // Last resort: for navigation requests, return cached index.html as SPA fallback
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return cachedResponse;
          });
        })
    );
    return;
  }

  // ── Strategy 2: Static assets → cache-first ──
  // Return cached version immediately for speed.
  // If not in cache, fetch from network and store for next time.
  // Version changes (APP_VERSION bump) will create a new cache, naturally invalidating old assets.
  if (isStaticAsset(event.request)) {
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse; // cache hit — return immediately
        }
        // Cache miss — fetch from network and cache for next time
        return fetch(event.request)
          .then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(function() {
            return cachedResponse; // will be undefined, browser shows its own error
          });
      })
    );
    return;
  }

  // ── Strategy 3: API / everything else → stale-while-revalidate ──
  // Return cached immediately if available, update in background.
  // Good for API responses, dynamic data — fast but eventually fresh.
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      const fetchPromise = fetch(event.request)
        .then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(function() {
          return cachedResponse;
        });

      if (cachedResponse) {
        return cachedResponse;
      }
      return fetchPromise;
    })
  );
});
