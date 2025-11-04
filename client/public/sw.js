// Service Worker for GameMatch PWA
// Handles offline caching and push notifications

const CACHE_NAME = 'gamematch-v2';
const RUNTIME_CACHE = 'gamematch-runtime-v2';

const urlsToCache = [
  '/',
  '/offline.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network with runtime caching
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  const { request } = event;
  const requestURL = new URL(request.url);

  // Skip API calls from caching
  if (requestURL.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    fetch(request.clone()).then((response) => {
      // Network-first strategy for better development experience
      if (response && response.status === 200) {
        // Cache static assets (JS, CSS, images, fonts)
        const shouldCache = /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/i.test(requestURL.pathname)
          || requestURL.pathname === '/'
          || requestURL.pathname === '/index.html';

        if (shouldCache) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
      }
      return response;
    }).catch(() => {
      // Fallback to cache if network fails
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        throw new Error('No cached content available');
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);

  let data = { title: 'GameMatch', message: 'New notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type,
      relatedUserId: data.relatedUserId,
      relatedMatchId: data.relatedMatchId,
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    tag: data.type || 'notification',
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Get the URL to navigate to
  const urlToOpen = event.notification.data?.url || '/';
  const notificationType = event.notification.data?.type;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and send navigation message
        if (clientList.length > 0) {
          const client = clientList[0];
          client.focus();
          // Send message to client to navigate
          client.postMessage({
            type: 'NAVIGATE',
            url: urlToOpen,
            notificationType: notificationType
          });
          return client;
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
