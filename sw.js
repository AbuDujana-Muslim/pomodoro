const CACHE_NAME = 'pomodoro-mr-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './logo.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap'
];
const CACHE_URLS = ASSETS_TO_CACHE.map(path => new URL(path, self.location).href);

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
        ))
        .then(() => self.clients.claim())
    );
});

async function staleWhileRevalidate(event) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    const networkPromise = fetch(event.request)
        .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => null);
    return cachedResponse || networkPromise;
}

async function networkFirst(event) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(event.request);
        if (response && response.ok) {
            cache.put(event.request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await cache.match(event.request);
        return cachedResponse || await cache.match('./index.html');
    }
}

self.addEventListener('fetch', event => {
    const request = event.request;
    const requestURL = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(event));
        return;
    }

    if (CACHE_URLS.includes(request.url) || ['style', 'script', 'image', 'font'].includes(request.destination)) {
        event.respondWith(staleWhileRevalidate(event));
        return;
    }

    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});
