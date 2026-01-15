const CACHE_VERSION = 'v1';
const CACHE_NAME = `pizza-cat-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'game.js',
  'debug.js',
  'tricks.js',
  'gameObjects.js',
  'mediaPlayer.js',
  'songConfig.js',
  'assets/wave.gif',
  'assets/pizza-cat.png',
  'assets/icons/pizza-cat-192.png',
  'assets/icons/pizza-cat-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[PizzaCat][SW] Failed to precache core assets', err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('pizza-cat-') && key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then(cached => {
        if (cached) {
          return cached;
        }
        return fetch(request).catch(() => caches.match('index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        fetchAndUpdate(request);
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          const cloned = response.clone();
          if (shouldCache(request, response)) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          }
          return response;
        })
        .catch(err => {
          console.warn('[PizzaCat][SW] Network request failed', err);
          return cachedResponse;
        });
    })
  );
});

function fetchAndUpdate(request) {
  fetch(request)
    .then(response => {
      if (shouldCache(request, response)) {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
      }
    })
    .catch(err => {
      console.warn('[PizzaCat][SW] Background update failed', err);
    });
}

function shouldCache(request, response) {
  const isOk = response && response.status === 200 && response.type === 'basic';
  if (!isOk) {
    return false;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) {
    return false;
  }

  const cacheableExtensions = [
    '.html',
    '.css',
    '.js',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.webmanifest',
    '.mp3',
    '.wav'
  ];

  return cacheableExtensions.some(ext => url.pathname.endsWith(ext));
}
