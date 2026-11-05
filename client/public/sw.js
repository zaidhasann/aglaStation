// Service Worker for NextStation PWA
// Caches the app shell and static assets only.
// NEVER caches or intercepts socket.io traffic or YouTube requests.

const CACHE_NAME = 'nextstation-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigations, bypass socket.io and YouTube entirely
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // BYPASS: Never intercept socket.io polling/websockets
  if (url.pathname.startsWith('/socket.io')) return;

  // BYPASS: Never intercept YouTube or Google Video requests
  if (
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('googlevideo.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  // Navigation requests: network-first, fall back to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
        );
      })
    );
    return;
  }
});
