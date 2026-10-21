// Service Worker boséjour (PWA).
//
// Règle d'or : on ne met en cache QUE ce qui ne change jamais pour une adresse donnée (fichiers
// compilés /_next/static/ au nom haché, icônes, images du site). Les pages, les données internes de
// Next.js (requêtes RSC « ?_rsc= ») et l'API passent TOUJOURS par le réseau. Mettre ces données en
// cache servait, après un déploiement, des réponses de l'ancienne version mélangées au nouveau code :
// l'écran « Un problème est survenu » apparaissait au lancement d'une recherche (2026-10-21).
//
// La version vient de l'adresse d'enregistrement (/sw.js?v=<build>) : chaque déploiement installe
// un nouveau service worker, qui supprime les anciens caches à l'activation.

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const STATIC_CACHE = `bosejour-static-${VERSION}`;
const OFFLINE_URL = '/';

// Installation : prise en charge immédiate, sans attendre la fermeture des onglets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

// Activation : on supprime tous les caches des versions précédentes puis on prend le contrôle.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== STATIC_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Fichiers sûrs à garder en cache : au nom haché (immuables) ou rarement modifiés.
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Autres domaines (API, images distantes, OneSignal…) : on ne s'en mêle pas.
  if (url.origin !== self.location.origin) return;
  // Données Next.js et API : toujours le réseau, jamais de cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/') || url.searchParams.has('_rsc')) return;
  const accept = request.headers.get('accept') || '';
  if (request.headers.get('rsc') || accept.includes('text/x-component')) return;
  // Médias (film de présentation) : requêtes partielles, on laisse le navigateur faire.
  if (request.headers.has('range') || request.destination === 'audio' || request.destination === 'video') return;

  // Pages : réseau d'abord ; hors ligne seulement, on affiche la page d'accueil en cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
    return;
  }

  // Fichiers statiques : cache d'abord (ils ne changent pas), sinon réseau puis mise en cache.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
  // Tout le reste : comportement normal du navigateur.
});

// Permet à la page de demander une mise à jour immédiate.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Notifications push
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'boséjour';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/images/payment-methods/logo/logo.png',
    badge: '/images/payment-methods/logo/logo.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
