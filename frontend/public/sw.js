// Service Worker pour boséjour PWA
const CACHE_NAME = 'bosejour-v1';
const RUNTIME_CACHE = 'bosejour-runtime-v1';

// Fichiers à mettre en cache lors de l'installation (uniquement des URLs qui existent)
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/images/payment-methods/logo/logo.png',
];

// Installer le Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[Service Worker] Precache failed (continuing):', err);
        return self.skipWaiting();
      })
  );
});

// Activer le Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Stratégie de cache : Network First, puis Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes API (toujours aller au réseau)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Stratégie Network First pour les pages HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache la réponse si valide
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si le réseau échoue, utiliser le cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si pas de cache, retourner la page d'accueil
            return caches.match('/');
          });
        })
    );
    return;
  }

  // Stratégie Cache First pour les assets statiques
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Ne mettre en cache que les réponses valides
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // En cas d'erreur, retourner une réponse par défaut si disponible
        if (request.destination === 'image') {
          return new Response('Image non disponible', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })
  );
});

// Gérer les messages depuis l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification push (pour futures fonctionnalités)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'boséjour';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/images/payment-methods/logo/logo.png',
    badge: '/images/payment-methods/logo/logo.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});



