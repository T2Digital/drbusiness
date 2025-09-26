const CACHE_NAME = 'dr-business-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Note: The main JS bundle path might need to be adjusted based on the build tool.
  // Assuming 'index.tsx' is the entry point, but the final file name may differ.
  // For this setup, we'll cache the main pages and let the browser cache the JS modules.
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
    // We will use a network-first strategy for most requests
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    // If not, try to get it from the cache
                    return caches.match(event.request).then(cacheResponse => cacheResponse || response);
                }

                // IMPORTANT: Clone the response. A response is a stream
                // and because we want the browser to consume the response
                // as well as the cache consuming the response, we need
                // to clone it so we have two streams.
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        // We don't cache everything, especially not large API responses unless specified
                        if (event.request.url.includes('aistudiocdn.com')) {
                           cache.put(event.request, responseToCache);
                        }
                    });

                return response;
            })
            .catch(() => {
                // If the network fails, try to get it from the cache
                return caches.match(event.request);
            })
    );
});


// Update a service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});